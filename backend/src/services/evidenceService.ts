import { v4 as uuidv4 } from "uuid";
import { EvidenceItem, FrameEvidence } from "../models/schemas";
import { dbRun, dbGet, dbAll } from "../db/database";
import { extractFrames } from "./frameExtractionService";
import { geminiClient } from "./geminiClient";
import fs from "fs";
import path from "path";

export class EvidenceService {
  async createEvidence(
    caseId: string,
    type: EvidenceItem["type"],
    filename: string,
    storagePath: string
  ): Promise<EvidenceItem> {
    const id = uuidv4();
    const evidence: EvidenceItem = {
      id,
      caseId,
      type,
      originalFilename: filename,
      storageUrl: storagePath.replace(/\\/g, "/"),
      uploadedAt: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO evidence_items (id, caseId, type, originalFilename, storageUrl, uploadedAt, meta, derived)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        caseId,
        type,
        filename,
        evidence.storageUrl,
        evidence.uploadedAt,
        JSON.stringify(evidence.meta || {}),
        JSON.stringify(evidence.derived || {}),
      ]
    );

    return evidence;
  }

  async getEvidenceByCase(caseId: string): Promise<EvidenceItem[]> {
    const rows: any[] = await dbAll(
      `SELECT * FROM evidence_items WHERE caseId = ? ORDER BY uploadedAt DESC`,
      [caseId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      caseId: row.caseId,
      type: row.type,
      originalFilename: row.originalFilename,
      storageUrl: row.storageUrl,
      uploadedAt: row.uploadedAt,
      meta: row.meta ? JSON.parse(row.meta) : undefined,
      derived: row.derived ? JSON.parse(row.derived) : undefined,
    }));
  }

  async getEvidenceById(id: string): Promise<EvidenceItem | null> {
    const row = await dbGet(`SELECT * FROM evidence_items WHERE id = ?`, [id]);
    if (!row) return null;

    return {
      id: (row as any).id,
      caseId: (row as any).caseId,
      type: (row as any).type,
      originalFilename: (row as any).originalFilename,
      storageUrl: (row as any).storageUrl,
      uploadedAt: (row as any).uploadedAt,
      meta: (row as any).meta ? JSON.parse((row as any).meta) : undefined,
      derived: (row as any).derived ? JSON.parse((row as any).derived) : undefined,
    };
  }

  /**
   * Analyze a single video frame and return its description
   */
  private async analyzeVideoFrame(
    frame: FrameEvidence,
    evidence: EvidenceItem,
    uploadsDir: string
  ): Promise<{ description: string; tags: string[] }> {
    const framePath = path.join(
      uploadsDir,
      evidence.caseId,
      "frames",
      `${frame.id}.jpg`
    );

    if (!fs.existsSync(framePath)) {
      console.warn(`Frame not found: ${framePath}`);
      return { description: `Frame at ${frame.timeSeconds}s: [not found]`, tags: [] };
    }

    try {
      const imageData = fs.readFileSync(framePath);
      console.log(`  📸 Analyzing frame at ${frame.timeSeconds}s (${imageData.length} bytes)`);

      // Create a temporary evidence object for the frame
      const frameEvidence: EvidenceItem = {
        ...evidence,
        type: "image",
        originalFilename: `frame_${frame.timeSeconds}s.jpg`,
      };

      const result = await geminiClient.summarizeEvidence(frameEvidence, imageData);
      
      // Update frame with its analysis
      const frameDerived = {
        summary: result.summary,
        tags: result.tags,
      };
      await dbRun(
        `UPDATE frame_evidence SET derived = ? WHERE id = ?`,
        [JSON.stringify(frameDerived), frame.id]
      );

      return { description: `[${frame.timeSeconds}s] ${result.summary}`, tags: result.tags };
    } catch (error) {
      console.error(`Error analyzing frame at ${frame.timeSeconds}s:`, error);
      return { description: `Frame at ${frame.timeSeconds}s: [analysis failed]`, tags: [] };
    }
  }

  async processEvidence(
    evidence: EvidenceItem,
    filePath: string
  ): Promise<{ frames?: FrameEvidence[]; transcript?: string; summary?: string }> {
    const results: { frames?: FrameEvidence[]; transcript?: string; summary?: string } = {};
    const uploadsDir = process.env.UPLOADS_DIR || "./uploads";

    console.log(`\n========================================`);
    console.log(`📂 Processing evidence: ${evidence.originalFilename}`);
    console.log(`   Type: ${evidence.type}`);
    console.log(`   Path: ${filePath}`);
    console.log(`   ID: ${evidence.id}`);
    console.log(`========================================\n`);

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ FILE NOT FOUND: ${filePath}`);
      const errorDerived = {
        ...evidence.derived,
        summary: `Error: File not found at ${filePath}`,
        tags: ["error", "file-not-found"],
      };
      await dbRun(
        `UPDATE evidence_items SET derived = ? WHERE id = ?`,
        [JSON.stringify(errorDerived), evidence.id]
      );
      return results;
    }

    const fileStats = fs.statSync(filePath);
    console.log(`   File size: ${fileStats.size} bytes`);

    // =====================================================
    // PROCESS VIDEO: Extract frames and analyze EACH one
    // =====================================================
    if (evidence.type === "video") {
      console.log(`\n🎬 PROCESSING VIDEO: ${evidence.originalFilename}`);
      
      try {
        // Step 1: Extract frames at 1 frame per second
        console.log(`   Step 1: Extracting frames at 1fps...`);
        const frameResult = await extractFrames(filePath, evidence.caseId, evidence.id, 1);
        results.frames = frameResult.frames;
        console.log(`   ✅ Extracted ${frameResult.frames.length} frames`);

        // Store frames in database
        for (const frame of frameResult.frames) {
          await dbRun(
            `INSERT INTO frame_evidence (id, parentEvidenceId, timeSeconds, storageUrl, derived)
             VALUES (?, ?, ?, ?, ?)`,
            [
              frame.id,
              frame.parentEvidenceId,
              frame.timeSeconds,
              frame.storageUrl,
              JSON.stringify(frame.derived || {}),
            ]
          );
        }

        // Step 2: Analyze EACH frame individually
        console.log(`\n   Step 2: Analyzing each frame with Gemini...`);
        const frameDescriptions: string[] = [];
        const allTags: Set<string> = new Set();

        // Analyze all frames (or limit to key frames for very long videos)
        const framesToAnalyze = frameResult.frames.length > 30 
          ? this.selectKeyFrames(frameResult.frames, 15) // Max 15 frames for long videos
          : frameResult.frames;

        console.log(`   Analyzing ${framesToAnalyze.length} of ${frameResult.frames.length} frames...`);

        for (let i = 0; i < framesToAnalyze.length; i++) {
          const frame = framesToAnalyze[i];
          console.log(`   Frame ${i + 1}/${framesToAnalyze.length} (at ${frame.timeSeconds}s)`);
          
          const analysis = await this.analyzeVideoFrame(frame, evidence, uploadsDir);
          frameDescriptions.push(analysis.description);
          analysis.tags.forEach(tag => allTags.add(tag));

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Step 3: Combine all frame descriptions into one comprehensive summary
        console.log(`\n   Step 3: Combining frame descriptions...`);
        const combinedDescription = `VIDEO ANALYSIS: ${evidence.originalFilename}\n` +
          `Duration: ${frameResult.frames.length} seconds (${frameResult.frames.length} frames analyzed)\n\n` +
          `FRAME-BY-FRAME ANALYSIS:\n${frameDescriptions.join("\n\n")}`;

        results.summary = combinedDescription;
        
        // Update evidence with combined summary
        const updatedDerived = {
          ...evidence.derived,
          summary: combinedDescription,
          tags: Array.from(allTags),
          frameIds: frameResult.frames.map(f => f.id),
          frameCount: frameResult.frames.length,
          analyzedFrameCount: framesToAnalyze.length,
        };
        await dbRun(
          `UPDATE evidence_items SET derived = ? WHERE id = ?`,
          [JSON.stringify(updatedDerived), evidence.id]
        );

        console.log(`   ✅ Video analysis complete!`);
        console.log(`   Total frames: ${frameResult.frames.length}`);
        console.log(`   Frames analyzed: ${framesToAnalyze.length}`);
        console.log(`   Tags found: ${Array.from(allTags).join(", ")}`);

      } catch (error) {
        console.error(`❌ Video processing error:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorDerived = {
          ...evidence.derived,
          summary: `Video processing failed: ${errorMsg}`,
          tags: ["video", "processing-error"],
          error: errorMsg,
        };
        await dbRun(
          `UPDATE evidence_items SET derived = ? WHERE id = ?`,
          [JSON.stringify(errorDerived), evidence.id]
        );
      }
    }

    // =====================================================
    // PROCESS AUDIO: Transcribe
    // =====================================================
    if (evidence.type === "audio") {
      console.log(`\n🎤 PROCESSING AUDIO: ${evidence.originalFilename}`);
      
      try {
        const audioData = fs.readFileSync(filePath);
        const ext = path.extname(evidence.originalFilename).toLowerCase();
        let mimeType = "audio/wav";
        if (ext === ".mp3") mimeType = "audio/mpeg";
        else if (ext === ".m4a") mimeType = "audio/mp4";
        else if (ext === ".ogg") mimeType = "audio/ogg";
        
        console.log(`   Transcribing audio (${audioData.length} bytes, ${mimeType})...`);
        const transcript = await geminiClient.transcribeAudio(audioData, mimeType);
        results.transcript = transcript;
        results.summary = `AUDIO TRANSCRIPT: ${evidence.originalFilename}\n\n${transcript}`;
        
        console.log(`   ✅ Transcription complete (${transcript.length} characters)`);

        const updatedDerived = {
          ...evidence.derived,
          transcript,
          summary: results.summary,
          tags: ["audio", "transcript"],
        };
        await dbRun(
          `UPDATE evidence_items SET derived = ? WHERE id = ?`,
          [JSON.stringify(updatedDerived), evidence.id]
        );
      } catch (error) {
        console.error(`❌ Audio processing error:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorDerived = {
          ...evidence.derived,
          summary: `Audio transcription failed: ${errorMsg}`,
          tags: ["audio", "transcription-error"],
          error: errorMsg,
        };
        await dbRun(
          `UPDATE evidence_items SET derived = ? WHERE id = ?`,
          [JSON.stringify(errorDerived), evidence.id]
        );
      }
    }

    // =====================================================
    // PROCESS TEXT/DOCUMENT: Read and analyze content
    // =====================================================
    if (evidence.type === "text" || evidence.type === "document") {
      console.log(`\n📄 PROCESSING TEXT: ${evidence.originalFilename}`);
      
      try {
        // Read the file content
        let textContent: string;
        try {
          textContent = fs.readFileSync(filePath, "utf-8");
        } catch (utf8Error) {
          console.warn(`   UTF-8 read failed, trying latin1...`);
          textContent = fs.readFileSync(filePath, "latin1");
        }

        console.log(`   ✅ Read ${textContent.length} characters from file`);
        console.log(`   Preview: ${textContent.substring(0, 200)}...`);

        if (!textContent || textContent.trim().length === 0) {
          throw new Error("File is empty or unreadable");
        }

        // Limit to prevent token overflow
        const maxChars = 50000;
        const truncated = textContent.length > maxChars;
        if (truncated) {
          textContent = textContent.substring(0, maxChars) + 
            `\n\n[... truncated from ${textContent.length} to ${maxChars} characters ...]`;
          console.log(`   Truncated to ${maxChars} characters`);
        }

        // Analyze with Gemini
        console.log(`   Analyzing text content with Gemini...`);
        const summaryResult = await geminiClient.summarizeEvidence(evidence, undefined, textContent);
        
        results.summary = `TEXT DOCUMENT: ${evidence.originalFilename}\n\n` +
          `CONTENT SUMMARY:\n${summaryResult.summary}\n\n` +
          `FULL TEXT:\n${textContent}`;

        console.log(`   ✅ Text analysis complete`);
        console.log(`   Summary: ${summaryResult.summary.substring(0, 150)}...`);

        const updatedDerived = {
          ...evidence.derived,
          summary: summaryResult.summary,
          tags: summaryResult.tags,
          fullText: textContent,
          charCount: textContent.length,
          truncated,
        };
        await dbRun(
          `UPDATE evidence_items SET derived = ? WHERE id = ?`,
          [JSON.stringify(updatedDerived), evidence.id]
        );

      } catch (error) {
        console.error(`❌ Text processing error:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorDerived = {
          ...evidence.derived,
          summary: `Text file processing failed: ${errorMsg}`,
          tags: ["text", "processing-error"],
          error: errorMsg,
        };
        await dbRun(
          `UPDATE evidence_items SET derived = ? WHERE id = ?`,
          [JSON.stringify(errorDerived), evidence.id]
        );
      }
    }

    // =====================================================
    // PROCESS IMAGE: Analyze visual content
    // =====================================================
    if (evidence.type === "image") {
      console.log(`\n🖼️  PROCESSING IMAGE: ${evidence.originalFilename}`);
      
      try {
        const imageData = fs.readFileSync(filePath);
        console.log(`   Read image: ${imageData.length} bytes`);

        // Analyze with Gemini
        console.log(`   Analyzing image content with Gemini...`);
        const summaryResult = await geminiClient.summarizeEvidence(evidence, imageData);
        
        results.summary = `IMAGE: ${evidence.originalFilename}\n\n${summaryResult.summary}`;

        console.log(`   ✅ Image analysis complete`);
        console.log(`   Summary: ${summaryResult.summary.substring(0, 150)}...`);
        console.log(`   Tags: ${summaryResult.tags.join(", ")}`);

        const updatedDerived = {
          ...evidence.derived,
          summary: summaryResult.summary,
          tags: summaryResult.tags,
        };
        await dbRun(
          `UPDATE evidence_items SET derived = ? WHERE id = ?`,
          [JSON.stringify(updatedDerived), evidence.id]
        );

      } catch (error) {
        console.error(`❌ Image processing error:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorDerived = {
          ...evidence.derived,
          summary: `Image analysis failed: ${errorMsg}`,
          tags: ["image", "analysis-error"],
          error: errorMsg,
        };
        await dbRun(
          `UPDATE evidence_items SET derived = ? WHERE id = ?`,
          [JSON.stringify(errorDerived), evidence.id]
        );
      }
    }

    console.log(`\n========================================`);
    console.log(`✅ Finished processing: ${evidence.originalFilename}`);
    console.log(`========================================\n`);

    return results;
  }

  /**
   * Select key frames from a video for analysis (evenly distributed)
   */
  private selectKeyFrames(frames: FrameEvidence[], maxFrames: number): FrameEvidence[] {
    if (frames.length <= maxFrames) return frames;

    const result: FrameEvidence[] = [];
    const step = Math.floor(frames.length / maxFrames);
    
    // Always include first and last frames
    result.push(frames[0]);
    
    for (let i = step; i < frames.length - 1; i += step) {
      if (result.length < maxFrames - 1) {
        result.push(frames[i]);
      }
    }
    
    // Always include last frame
    if (frames.length > 1) {
      result.push(frames[frames.length - 1]);
    }
    
    return result;
  }

  async getFramesByEvidence(evidenceId: string): Promise<FrameEvidence[]> {
    const rows: any[] = await dbAll(
      `SELECT * FROM frame_evidence WHERE parentEvidenceId = ? ORDER BY timeSeconds ASC`,
      [evidenceId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      parentEvidenceId: row.parentEvidenceId,
      timeSeconds: row.timeSeconds,
      storageUrl: row.storageUrl,
      derived: row.derived ? JSON.parse(row.derived) : undefined,
    }));
  }
}

export const evidenceService = new EvidenceService();
