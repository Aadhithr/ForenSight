import express from "express";
import { witnessPortraitService } from "../services/witnessPortraitService";
import { WitnessPortraitParams } from "../models/schemas";

const router = express.Router();

// Generate a new witness portrait
router.post("/:id/portraits", async (req, res) => {
  try {
    const { id: caseId } = req.params;
    const params: WitnessPortraitParams = req.body;

    // Validate required fields
    if (!params.faceShape || !params.skinTone || !params.eyeShape || !params.gender || !params.ageRange) {
      return res.status(400).json({ 
        error: "Missing required fields: faceShape, skinTone, eyeShape, gender, ageRange" 
      });
    }

    console.log(`\n📸 Portrait generation request for case ${caseId}`);
    console.log(`   Params: ${params.gender}, ${params.ageRange}, ${params.skinTone}`);
    
    const portrait = await witnessPortraitService.generatePortrait(caseId, params);
    res.json(portrait);
    
  } catch (error) {
    console.error("Error generating portrait:", error);
    res.status(500).json({ 
      error: "Failed to generate portrait", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get all portraits for a case
router.get("/:id/portraits", async (req, res) => {
  try {
    const { id: caseId } = req.params;
    const portraits = await witnessPortraitService.getPortraitsByCase(caseId);
    res.json(portraits);
  } catch (error) {
    console.error("Error getting portraits:", error);
    res.status(500).json({ error: "Failed to get portraits" });
  }
});

// Get a single portrait by ID
router.get("/:id/portraits/:portraitId", async (req, res) => {
  try {
    const { portraitId } = req.params;
    const portrait = await witnessPortraitService.getPortraitById(portraitId);
    
    if (!portrait) {
      return res.status(404).json({ error: "Portrait not found" });
    }
    
    res.json(portrait);
  } catch (error) {
    console.error("Error getting portrait:", error);
    res.status(500).json({ error: "Failed to get portrait" });
  }
});

// Delete a portrait
router.delete("/:id/portraits/:portraitId", async (req, res) => {
  try {
    const { portraitId } = req.params;
    await witnessPortraitService.deletePortrait(portraitId);
    res.json({ success: true, message: "Portrait deleted" });
  } catch (error) {
    console.error("Error deleting portrait:", error);
    res.status(500).json({ error: "Failed to delete portrait" });
  }
});

export default router;

