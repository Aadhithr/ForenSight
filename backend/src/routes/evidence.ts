import express from "express";
import multer from "multer";
import { evidenceService } from "../services/evidenceService";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const caseId = req.params.id;
    const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
    const caseDir = path.join(uploadsDir, caseId);
    // Ensure directory exists
    if (!fs.existsSync(caseDir)) {
      fs.mkdirSync(caseDir, { recursive: true });
    }
    cb(null, caseDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Upload evidence
router.post("/:id/evidence", upload.single("file"), async (req, res) => {
  try {
    const { id: caseId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Determine evidence type from MIME type
    let type: "image" | "video" | "audio" | "text" | "document" = "text";
    if (file.mimetype.startsWith("image/")) type = "image";
    else if (file.mimetype.startsWith("video/")) type = "video";
    else if (file.mimetype.startsWith("audio/")) type = "audio";
    else if (file.mimetype === "application/pdf" || file.mimetype.includes("text")) type = "document";

    // Use the actual file path from multer, convert to storage URL
    const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
    let storageUrl = file.path.replace(uploadsDir, "").replace(/\\/g, "/");
    // Ensure it starts with /
    if (!storageUrl.startsWith("/")) {
      storageUrl = "/" + storageUrl;
    }
    
    const evidence = await evidenceService.createEvidence(
      caseId,
      type,
      file.originalname,
      storageUrl
    );

    // Process evidence asynchronously (don't wait)
    evidenceService.processEvidence(evidence, file.path).catch((err) => {
      console.error("Error processing evidence:", err);
    });

    res.status(201).json(evidence);
  } catch (error) {
    console.error("Error uploading evidence:", error);
    res.status(500).json({ error: "Failed to upload evidence", details: error instanceof Error ? error.message : String(error) });
  }
});

// Get evidence for case
router.get("/:id/evidence", async (req, res) => {
  try {
    const { id: caseId } = req.params;
    const evidence = await evidenceService.getEvidenceByCase(caseId);
    res.json(evidence);
  } catch (error) {
    console.error("Error getting evidence:", error);
    res.status(500).json({ error: "Failed to get evidence" });
  }
});

export default router;

