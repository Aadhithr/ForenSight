import { EventEmitter } from "events";
import { CaseAnalysis, EvidenceItem, TimelineEvent, Contradiction, Scenario } from "../models/schemas";
import { evidenceService } from "./evidenceService";
import { geminiClient } from "./geminiClient";
import { nanoBananaService } from "./nanoBananaService";
import { dbRun, dbGet } from "../db/database";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { AnalysisProgress } from "../../../shared/types";

export class AnalysisOrchestrator extends EventEmitter {
  private caseId: string;

  constructor(caseId: string) {
    super();
    this.caseId = caseId;
  }

  private emitProgress(progress: AnalysisProgress) {
    this.emit("progress", progress);
  }

  async run(): Promise<CaseAnalysis> {
    try {
      // Step 0: Prepare evidence
      this.emitProgress({
        step: "Preparing evidence",
        progress: 0,
        reasoning: "Collecting and processing uploaded evidence files...",
        status: "running",
        stepNumber: 0,
        totalSteps: 7,
      });

      const evidence = await evidenceService.getEvidenceByCase(this.caseId);
      if (evidence.length === 0) {
        throw new Error("No evidence found for case");
      }

      // Process each evidence item ONE BY ONE (extract frames, transcribe, summarize)
      // This ensures each file is fully analyzed before moving to the next
      for (let i = 0; i < evidence.length; i++) {
        const item = evidence[i];
        const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
        // Storage URL might start with /, so handle both cases
        const storageUrlPath = item.storageUrl.startsWith("/") 
          ? item.storageUrl.slice(1) 
          : item.storageUrl;
        const filePath = path.join(uploadsDir, storageUrlPath);
        
        this.emitProgress({
          step: "Processing evidence",
          progress: Math.floor((i / evidence.length) * 15),
          reasoning: `Starting analysis of ${item.type}: ${item.originalFilename} (${i + 1}/${evidence.length})...`,
          currentItem: item.originalFilename,
          status: "running",
          stepNumber: 0,
          totalSteps: 7,
        });
        
        if (!fs.existsSync(filePath)) {
          console.error(`❌ File not found: ${filePath} for evidence ${item.id}`);
          this.emitProgress({
            step: "Processing evidence",
            progress: Math.floor((i / evidence.length) * 15),
            reasoning: `⚠️ Warning: File not found for ${item.originalFilename}. Skipping...`,
            currentItem: item.originalFilename,
            status: "running",
            stepNumber: 0,
            totalSteps: 7,
          });
          continue;
        }

        try {
          console.log(`\n🔍 Processing evidence ${i + 1}/${evidence.length}: ${item.type} - ${item.originalFilename}`);
          console.log(`   File path: ${filePath}`);
          
          // Process this evidence item (this includes reading file content, extracting frames, etc.)
          const processResult = await evidenceService.processEvidence(item, filePath);
          
          // Reload the item to get updated summary from database
          const updatedItem = await evidenceService.getEvidenceByCase(this.caseId);
          const currentItem = updatedItem.find(e => e.id === item.id);
          
          if (currentItem?.derived?.summary) {
            const summaryPreview = currentItem.derived.summary.substring(0, 150);
            console.log(`   ✅ Generated summary: ${summaryPreview}...`);
            
            this.emitProgress({
              step: "Processing evidence",
              progress: Math.floor(((i + 1) / evidence.length) * 15),
              reasoning: `✅ Completed ${item.type}: ${item.originalFilename}\nSummary: ${summaryPreview}...`,
              currentItem: item.originalFilename,
              status: "running",
              stepNumber: 0,
              totalSteps: 7,
            });
          } else {
            console.log(`   ⚠️ No summary generated for ${item.originalFilename}`);
            this.emitProgress({
              step: "Processing evidence",
              progress: Math.floor(((i + 1) / evidence.length) * 15),
              reasoning: `⚠️ Processed ${item.type}: ${item.originalFilename} but summary not available`,
              currentItem: item.originalFilename,
              status: "running",
              stepNumber: 0,
              totalSteps: 7,
            });
          }
          
          // If video, report frame extraction
          if (item.type === "video" && processResult.frames) {
            const frameCount = processResult.frames.length;
            console.log(`   🎬 Extracted ${frameCount} frames from video`);
            this.emitProgress({
              step: "Processing evidence",
              progress: Math.floor(((i + 1) / evidence.length) * 15),
              reasoning: `🎬 Extracted ${frameCount} frames from video. Analyzing key frames...`,
              currentItem: item.originalFilename,
              status: "running",
              stepNumber: 0,
              totalSteps: 7,
            });
          }
          
          // If audio, report transcription
          if (item.type === "audio" && processResult.transcript) {
            const transcriptLength = processResult.transcript.length;
            console.log(`   🎤 Transcribed audio (${transcriptLength} characters)`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing evidence ${item.id}:`, error);
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          this.emitProgress({
            step: "Processing evidence",
            progress: Math.floor(((i + 1) / evidence.length) * 15),
            reasoning: `❌ Error processing ${item.originalFilename}: ${errorMsg}`,
            currentItem: item.originalFilename,
            status: "running",
            stepNumber: 0,
            totalSteps: 7,
          });
          // Continue processing other evidence, but log the error
        }
        
        // Small delay between items to ensure database writes complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\n✅ Completed processing all ${evidence.length} evidence items\n`);

      // Step 1: Collect all evidence summaries (they should already be processed above)
      this.emitProgress({
        step: "Collecting summaries",
        progress: 16,
        reasoning: "Collecting all individual evidence summaries for fusion...",
        status: "running",
        stepNumber: 1,
        totalSteps: 7,
      });

      // Reload evidence to get all the summaries we just generated
      const updatedEvidence = await evidenceService.getEvidenceByCase(this.caseId);
      
      // Build evidence summaries from the processed data
      const evidenceSummaries: Array<{ evidence: EvidenceItem; summary: string; tags: string[] }> = [];
      
      console.log(`\n📋 Collecting summaries for ${updatedEvidence.length} evidence items:`);
      
      for (const e of updatedEvidence) {
        let summary = e.derived?.summary;
        let tags = e.derived?.tags || [];
        
        // Verify we have a proper summary (not just a fallback)
        if (!summary || summary.includes("Error") || summary.includes("Error during analysis") || summary.includes("Evidence file:")) {
          console.warn(`⚠️ Evidence ${e.originalFilename} does not have a proper summary. Checking file content...`);
          
          // Try to reprocess if summary is missing
          const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
          const storageUrlPath = e.storageUrl.startsWith("/") ? e.storageUrl.slice(1) : e.storageUrl;
          const filePath = path.join(uploadsDir, storageUrlPath);
          
          if (fs.existsSync(filePath)) {
            console.log(`   Retrying processing for ${e.originalFilename}...`);
            try {
              await evidenceService.processEvidence(e, filePath);
              // Reload to get new summary
              const reloaded = await evidenceService.getEvidenceByCase(this.caseId);
              const reloadedItem = reloaded.find(item => item.id === e.id);
              if (reloadedItem?.derived?.summary && !reloadedItem.derived.summary.includes("Evidence file:")) {
                summary = reloadedItem.derived.summary;
                tags = reloadedItem.derived.tags || [];
                console.log(`   ✅ Retry successful - got summary for ${e.originalFilename}`);
              }
            } catch (retryError) {
              console.error(`   ❌ Retry failed for ${e.originalFilename}:`, retryError);
            }
          }
        }
        
        // If still no proper summary, use fallback
        if (!summary || summary.includes("Evidence file:") || summary.includes("Error")) {
          if (e.type === "video") {
            summary = `Video file: ${e.originalFilename} - processing may have failed.`;
          } else if (e.type === "audio") {
            summary = e.derived?.transcript 
              ? `Audio transcript: ${e.derived.transcript.substring(0, 300)}...`
              : `Audio file: ${e.originalFilename} - transcription may have failed.`;
          } else if (e.type === "text" || e.type === "document") {
            summary = `Text document: ${e.originalFilename} - content analysis may have failed.`;
          } else {
            summary = `${e.type} file: ${e.originalFilename} - analysis incomplete.`;
          }
          console.warn(`   ⚠️ Using fallback summary for ${e.originalFilename}`);
        }
        
        // For videos, include frame information
        if (e.type === "video") {
          try {
            const frames = await evidenceService.getFramesByEvidence(e.id);
            if (frames.length > 0) {
              summary += ` [${frames.length} frames extracted and analyzed]`;
              tags.push(`${frames.length} video frames`);
            }
          } catch (frameError) {
            console.warn(`Could not load frames for video ${e.id}:`, frameError);
          }
        }
        
        // For audio, include transcript info
        if (e.type === "audio" && e.derived?.transcript) {
          tags.push("transcribed");
        }
        
        console.log(`   ${evidenceSummaries.length + 1}. ${e.type}: ${e.originalFilename}`);
        console.log(`      Summary: ${summary.substring(0, 100)}...`);
        
        evidenceSummaries.push({
          evidence: e,
          summary: summary || `Evidence: ${e.originalFilename}`,
          tags: tags.length > 0 ? tags : [e.type],
        });
      }

      if (evidenceSummaries.length === 0) {
        throw new Error("No evidence items found for analysis");
      }
      
      console.log(`\n✅ Collected ${evidenceSummaries.length} evidence summaries. Ready for fusion.\n`);

      // Step 2: Evidence fusion
      this.emitProgress({
        step: "Fusing evidence",
        progress: 30,
        reasoning: `Combining ${evidenceSummaries.length} evidence items into a unified world model...`,
        status: "running",
        stepNumber: 2,
        totalSteps: 7,
      });

      let fusionResult;
      try {
        fusionResult = await geminiClient.fuseEvidence(evidenceSummaries);
      } catch (error) {
        console.error("Evidence fusion error:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fuse evidence: ${errorMsg}`);
      }
      
      this.emitProgress({
        step: "Fusing evidence",
        progress: 40,
        reasoning: fusionResult.reasoning || `Built timeline with ${fusionResult.timeline.length} events.`,
        status: "running",
        stepNumber: 2,
        totalSteps: 7,
      });

      const timeline: TimelineEvent[] = fusionResult.timeline.map((t, idx) => ({
        id: uuidv4(),
        caseId: this.caseId,
        label: t.label,
        description: t.description,
        startTime: t.startTime,
        endTime: t.endTime,
        confidence: t.confidence,
        supportingEvidenceIds: t.supportingEvidenceIds,
      }));

      // Step 3: Contradiction detection
      this.emitProgress({
        step: "Detecting contradictions",
        progress: 50,
        reasoning: "Analyzing testimonies and evidence for inconsistencies...",
        status: "running",
        stepNumber: 3,
        totalSteps: 7,
      });

      const witnessStatements = evidence
        .filter(e => e.type === "text" && e.derived?.summary)
        .map(e => e.derived!.summary!);

      const contradictionResult = await geminiClient.detectContradictions(
        timeline,
        evidenceSummaries,
        witnessStatements
      );

      this.emitProgress({
        step: "Detecting contradictions",
        progress: 60,
        reasoning: contradictionResult.reasoning || "Identified contradictions in testimonies.",
        status: "running",
        stepNumber: 3,
        totalSteps: 7,
      });

      const contradictions: Contradiction[] = contradictionResult.contradictions.map(c => ({
        id: uuidv4(),
        caseId: this.caseId,
        description: c.description,
        involvedEvidenceIds: c.involvedEvidenceIds,
        involvedWitnesses: c.involvedWitnesses,
        severity: c.severity,
      }));

      // Step 4: Shadow/reflection reasoning (optional, can be deferred)
      this.emitProgress({
        step: "Analyzing shadows and reflections",
        progress: 65,
        reasoning: "Examining visual evidence for off-camera inference...",
        status: "running",
        stepNumber: 4,
        totalSteps: 7,
      });

      // TODO: Implement shadow/reflection analysis for frames
      // For MVP, we can skip this or do basic analysis

      // Step 5: Scenario generation
      this.emitProgress({
        step: "Generating scenarios",
        progress: 70,
        reasoning: "Creating multiple plausible explanations...",
        status: "running",
        stepNumber: 5,
        totalSteps: 7,
      });

      const scenarioResult = await geminiClient.generateScenarios(
        fusionResult.worldModel,
        timeline,
        contradictions
      );

      this.emitProgress({
        step: "Generating scenarios",
        progress: 80,
        reasoning: scenarioResult.reasoning || "Generated plausible scenarios.",
        status: "running",
        stepNumber: 5,
        totalSteps: 7,
      });

      const scenarios: Scenario[] = scenarioResult.scenarios.map(s => ({
        id: uuidv4(),
        caseId: this.caseId,
        name: s.name,
        likelihood: s.likelihood,
        narrative: s.narrative,
        supportingEvidenceIds: s.supportingEvidenceIds,
        conflictingEvidenceIds: s.conflictingEvidenceIds,
        reconstructionImageIds: [],
        reasoning: s.scenarioReasoning || "Scenario derived from evidence analysis.",
        keyFindings: s.keyFindings || [],
        supportingEvidence: s.supportingEvidence || [],
        conflictingEvidence: s.conflictingEvidence || [],
      }));

      // Step 6: Visual reconstruction
      this.emitProgress({
        step: "Rendering reconstructions",
        progress: 85,
        reasoning: "Generating 4K scene reconstructions...",
        status: "running",
        stepNumber: 6,
        totalSteps: 7,
      });

      // Generate reconstructions for top 2 scenarios
      const topScenarios = scenarios
        .sort((a, b) => b.likelihood - a.likelihood)
        .slice(0, 2);

      const allReconstructions: any[] = [];

      for (const scenario of topScenarios) {
        const recon = await nanoBananaService.generateReconstruction(
          this.caseId,
          scenario,
          "from doorway",
          "most_likely",
          scenario.narrative
        );
        scenario.reconstructionImageIds.push(recon.id);
        allReconstructions.push(recon);
      }

      this.emitProgress({
        step: "Rendering reconstructions",
        progress: 95,
        reasoning: "Completed scene reconstructions.",
        status: "running",
        stepNumber: 6,
        totalSteps: 7,
      });

      // Step 7: Finalize
      this.emitProgress({
        step: "Finalizing analysis",
        progress: 98,
        reasoning: "Assembling final case analysis...",
        status: "running",
        stepNumber: 7,
        totalSteps: 7,
      });

      // Build heatmap segments
      const maxTime = Math.max(...timeline.map(t => t.endTime || t.startTime || 0));
      const segmentCount = 10;
      const segmentDuration = maxTime / segmentCount;

      const heatmapSegments = Array.from({ length: segmentCount }, (_, i) => {
        const startTime = i * segmentDuration;
        const endTime = (i + 1) * segmentDuration;
        const eventsInSegment = timeline.filter(
          t => (t.startTime || 0) >= startTime && (t.startTime || 0) < endTime
        );
        const contradictionsInSegment = contradictions.filter(c => {
          // Simple heuristic: check if contradiction involves evidence from this time segment
          return true; // Simplified for MVP
        });

        return {
          startTime,
          endTime,
          confidence: eventsInSegment.length > 0
            ? eventsInSegment.reduce((sum, e) => sum + e.confidence, 0) / eventsInSegment.length
            : 0.5,
          contradictionScore: contradictionsInSegment.length * 0.2,
        };
      });

      // Build evidence summaries for frontend
      const evidenceSummaryList = evidenceSummaries.map(es => ({
        evidenceId: es.evidence.id,
        summary: es.summary,
        tags: es.tags,
        processed: true,
      }));

      const caseAnalysis: CaseAnalysis = {
        caseId: this.caseId,
        status: "completed",
        timeline,
        contradictions,
        scenarios,
        missingEvidenceSuggestions: [],
        globalSummary: fusionResult.worldModel,
        heatmap: {
          segments: heatmapSegments,
        },
        reasoning: {
          fusion: fusionResult.reasoning || "Fused evidence into unified world model.",
          contradictions: contradictionResult.reasoning || "Analyzed for inconsistencies.",
          scenarios: scenarioResult.reasoning || "Generated plausible scenarios.",
        },
        evidenceSummaries: evidenceSummaryList,
        reconstructions: allReconstructions,
      };

      // Store analysis in database
      await dbRun(
        `INSERT OR REPLACE INTO case_analysis (caseId, analysis, updatedAt)
         VALUES (?, ?, ?)`,
        [this.caseId, JSON.stringify(caseAnalysis), new Date().toISOString()]
      );

      console.log(`Analysis stored for case ${this.caseId}:`, {
        timeline: caseAnalysis.timeline.length,
        scenarios: caseAnalysis.scenarios.length,
        contradictions: caseAnalysis.contradictions.length,
      });

      // Update case status
      await dbRun(
        `UPDATE cases SET status = 'completed', updatedAt = ? WHERE id = ?`,
        [new Date().toISOString(), this.caseId]
      );

      // Small delay to ensure DB write completes
      await new Promise(resolve => setTimeout(resolve, 500));

      this.emitProgress({
        step: "Analysis complete",
        progress: 100,
        reasoning: "Case analysis completed successfully.",
        status: "completed",
        stepNumber: 7,
        totalSteps: 7,
      });

      return caseAnalysis;
    } catch (error) {
      this.emitProgress({
        step: "Error",
        progress: 0,
        reasoning: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        status: "error",
      });

      await dbRun(
        `UPDATE cases SET status = 'error', updatedAt = ? WHERE id = ?`,
        [new Date().toISOString(), this.caseId]
      );

      throw error;
    }
  }
}

