import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function getStoragePath(filename: string, caseId: string): string {
  const caseDir = path.join(UPLOADS_DIR, caseId);
  if (!fs.existsSync(caseDir)) {
    fs.mkdirSync(caseDir, { recursive: true });
  }
  const ext = path.extname(filename);
  const uniqueName = `${uuidv4()}${ext}`;
  return path.join(caseDir, uniqueName);
}

export function getStorageUrl(storagePath: string): string {
  // Return relative path that can be served via static route
  return storagePath.replace(UPLOADS_DIR, "").replace(/\\/g, "/");
}

export function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

