import { geminiClient } from "./geminiClient";
import { evidenceService } from "./evidenceService";
import { dbGet } from "../db/database";
import { CaseAnalysis } from "../models/schemas";

export class ChatService {
  async chat(caseId: string, question: string): Promise<{ answer: string; reasoning: string }> {
    // Get case analysis
    const analysisRow = await dbGet(`SELECT analysis FROM case_analysis WHERE caseId = ?`, [caseId]);
    if (!analysisRow) {
      throw new Error("Case analysis not found");
    }

    const caseAnalysis: CaseAnalysis = JSON.parse((analysisRow as any).analysis);

    // Get evidence summaries
    const evidence = await evidenceService.getEvidenceByCase(caseId);
    const evidenceSummaries = evidence.map(e => ({
      evidence: e,
      summary: e.derived?.summary || "No summary available",
    }));

    // Call Gemini for chat
    const result = await geminiClient.chat(question, caseAnalysis, evidenceSummaries);

    return result;
  }
}

export const chatService = new ChatService();

