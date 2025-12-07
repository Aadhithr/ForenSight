import express from "express";
import { v4 as uuidv4 } from "uuid";
import { dbRun, dbGet, dbAll } from "../db/database";
import { Case } from "../models/schemas";

const router = express.Router();

// Create case
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Case name is required" });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO cases (id, name, description, createdAt, updatedAt, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, description || "", now, now, "pending"]
    );

    const case_: Case = {
      id,
      name,
      description: description || undefined,
      createdAt: now,
      updatedAt: now,
      status: "pending",
    };

    res.status(201).json(case_);
  } catch (error) {
    console.error("Error creating case:", error);
    res.status(500).json({ error: "Failed to create case" });
  }
});

// List all cases
router.get("/", async (req, res) => {
  try {
    const rows: any[] = await dbAll(`SELECT * FROM cases ORDER BY updatedAt DESC`);
    const cases: Case[] = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status: row.status,
    }));

    res.json(cases);
  } catch (error) {
    console.error("Error listing cases:", error);
    res.status(500).json({ error: "Failed to list cases" });
  }
});

// Get case by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const row = await dbGet(`SELECT * FROM cases WHERE id = ?`, [id]);

    if (!row) {
      return res.status(404).json({ error: "Case not found" });
    }

    const case_: Case = {
      id: (row as any).id,
      name: (row as any).name,
      description: (row as any).description || undefined,
      createdAt: (row as any).createdAt,
      updatedAt: (row as any).updatedAt,
      status: (row as any).status,
    };

    res.json(case_);
  } catch (error) {
    console.error("Error getting case:", error);
    res.status(500).json({ error: "Failed to get case" });
  }
});

export default router;

