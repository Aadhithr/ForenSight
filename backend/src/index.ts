import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { initializeDatabase } from "./db/database";
import casesRouter from "./routes/cases";
import evidenceRouter from "./routes/evidence";
import analysisRouter from "./routes/analysis";
import chatRouter from "./routes/chat";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
app.use("/uploads", express.static(uploadsDir));

// Routes
app.use("/cases", casesRouter);
app.use("/cases", evidenceRouter);
app.use("/cases", analysisRouter);
app.use("/cases", chatRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase();
    console.log("Database initialized");

    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

