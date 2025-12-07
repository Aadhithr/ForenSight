import sqlite3 from "sqlite3";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || "./data.db";

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Promisify database methods with proper parameter handling
export const dbRun = (sql: string, params?: any[]): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    if (params) {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    } else {
      db.run(sql, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    }
  });
};

export const dbGet = (sql: string, params?: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (params) {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    } else {
      db.get(sql, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }
  });
};

export const dbAll = (sql: string, params?: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (params) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    } else {
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    }
  });
};

export { db };

// Initialize database schema
export async function initializeDatabase() {
  // Cases table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `);

  // Evidence items table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS evidence_items (
      id TEXT PRIMARY KEY,
      caseId TEXT NOT NULL,
      type TEXT NOT NULL,
      originalFilename TEXT NOT NULL,
      storageUrl TEXT NOT NULL,
      uploadedAt TEXT NOT NULL,
      meta TEXT,
      derived TEXT,
      FOREIGN KEY (caseId) REFERENCES cases(id) ON DELETE CASCADE
    )
  `);

  // Frame evidence table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS frame_evidence (
      id TEXT PRIMARY KEY,
      parentEvidenceId TEXT NOT NULL,
      timeSeconds REAL NOT NULL,
      storageUrl TEXT NOT NULL,
      derived TEXT,
      FOREIGN KEY (parentEvidenceId) REFERENCES evidence_items(id) ON DELETE CASCADE
    )
  `);

  // Case analysis table (stores JSON blob)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS case_analysis (
      caseId TEXT PRIMARY KEY,
      analysis TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (caseId) REFERENCES cases(id) ON DELETE CASCADE
    )
  `);

  // Witness portraits table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS witness_portraits (
      id TEXT PRIMARY KEY,
      caseId TEXT NOT NULL,
      params TEXT NOT NULL,
      storageUrl TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (caseId) REFERENCES cases(id) ON DELETE CASCADE
    )
  `);

  console.log("Database initialized successfully");
}

