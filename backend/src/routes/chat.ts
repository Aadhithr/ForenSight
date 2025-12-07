import express from "express";
import { chatService } from "../services/chatService";

const router = express.Router();

// Chat with case context
router.post("/:id/chat", async (req, res) => {
  try {
    const { id: caseId } = req.params;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const result = await chatService.chat(caseId, question);
    res.json(result);
  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

export default router;

