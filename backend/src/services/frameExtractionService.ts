import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { FrameEvidence } from "../models/schemas";
import { getStoragePath, ensureDirectoryExists } from "../utils/fileStorage";

export interface FrameExtractionResult {
  frames: FrameEvidence[];
  totalFrames: number;
}

/**
 * Extract frames from video at 1-second intervals
 */
export async function extractFrames(
  videoPath: string,
  caseId: string,
  evidenceId: string,
  intervalSeconds: number = 1
): Promise<FrameExtractionResult> {
  return new Promise((resolve, reject) => {
    const framesDir = path.join(process.env.UPLOADS_DIR || "./uploads", caseId, "frames");
    ensureDirectoryExists(framesDir);

    const frames: FrameEvidence[] = [];

    // Get video duration first
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata.format.duration || 0;
      if (duration === 0) {
        reject(new Error("Could not determine video duration"));
        return;
      }

      // Extract frames at specified intervals
      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=1/${intervalSeconds}`, // 1 frame per intervalSeconds
          "-q:v 2", // High quality
        ])
        .output(path.join(framesDir, `frame_%04d.jpg`))
        .on("end", () => {
          try {
            // Read all extracted frames
            const frameFiles = fs.readdirSync(framesDir)
              .filter(f => f.startsWith("frame_") && f.endsWith(".jpg"))
              .sort();

            frameFiles.forEach((frameFile, index) => {
              const framePath = path.join(framesDir, frameFile);
              const frameId = uuidv4();
              const timeSeconds = index * intervalSeconds;

              // Move to proper location with unique name
              const finalPath = path.join(framesDir, `${frameId}.jpg`);
              if (fs.existsSync(framePath)) {
                fs.renameSync(framePath, finalPath);
              }

              frames.push({
                id: frameId,
                parentEvidenceId: evidenceId,
                timeSeconds,
                storageUrl: `/uploads/${caseId}/frames/${frameId}.jpg`,
              });
            });

            resolve({ frames, totalFrames: frames.length });
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (err) => {
          reject(err);
        })
        .run();
    });
  });
}

