import express from "express";
import { AnalysisOrchestrator } from "../services/analysisOrchestrator";
import { dbGet, dbRun } from "../db/database";
import { CaseAnalysis } from "../models/schemas";

const router = express.Router();

// Start analysis (triggers long-running job)
router.post("/:id/analyze", async (req, res) => {
  try {
    const { id: caseId } = req.params;

    // Update case status to running
    await dbRun(`UPDATE cases SET status = 'running', updatedAt = ? WHERE id = ?`, [new Date().toISOString(), caseId]);

    // Start analysis in background
    const orchestrator = new AnalysisOrchestrator(caseId);
    
    // Run analysis (this will emit progress events)
    orchestrator.run().catch(error => {
      console.error("Analysis error:", error);
    });

    res.json({ message: "Analysis started", caseId });
  } catch (error) {
    console.error("Error starting analysis:", error);
    res.status(500).json({ error: "Failed to start analysis" });
  }
});

// Stream analysis progress (SSE)
router.get("/:id/analyze/stream", (req, res) => {
  const { id: caseId } = req.params;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Accel-Buffering", "no"); // Disable buffering in nginx if used

  let isClosed = false;

  // Helper to safely write to SSE stream
  const safeWrite = (data: any) => {
    if (isClosed) return;
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      res.write(message);
    } catch (error) {
      console.error("Error writing to SSE stream:", error);
      isClosed = true;
    }
  };

  // Send initial connection message
  safeWrite({ type: "connected", message: "Analysis stream connected" });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    if (!isClosed) {
      safeWrite({ type: "heartbeat" });
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // Every 30 seconds

  const orchestrator = new AnalysisOrchestrator(caseId);

  orchestrator.on("progress", (progress) => {
    safeWrite(progress);
  });

  // Handle client disconnect
  req.on("close", () => {
    console.log("SSE client disconnected");
    isClosed = true;
    clearInterval(heartbeat);
    orchestrator.removeAllListeners();
    if (!res.headersSent) {
      res.end();
    }
  });

  req.on("aborted", () => {
    console.log("SSE client aborted");
    isClosed = true;
    clearInterval(heartbeat);
    orchestrator.removeAllListeners();
  });

  // Start analysis
  orchestrator.run()
    .then(() => {
      if (!isClosed) {
        safeWrite({ type: "complete", message: "Analysis completed successfully" });
        clearInterval(heartbeat);
        res.end();
        isClosed = true;
      }
    })
    .catch((error) => {
      console.error("Analysis error in SSE stream:", error);
      if (!isClosed) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        safeWrite({ 
          type: "error", 
          error: errorMessage,
          step: "Analysis failed",
          status: "error"
        });
        clearInterval(heartbeat);
        res.end();
        isClosed = true;
      }
    });
});

// Get analysis results
router.get("/:id/analysis", async (req, res) => {
  try {
    const { id: caseId } = req.params;
    const row = await dbGet(`SELECT analysis FROM case_analysis WHERE caseId = ?`, [caseId]);

    if (!row) {
      return res.status(404).json({ error: "Analysis not found. Run analysis first." });
    }

    const caseAnalysis: CaseAnalysis = JSON.parse((row as any).analysis);
    res.json(caseAnalysis);
  } catch (error) {
    console.error("Error getting analysis:", error);
    res.status(500).json({ 
      error: "Failed to get analysis", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;

