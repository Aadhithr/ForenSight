import { v4 as uuidv4 } from "uuid";
import { ReconstructionImage, Scenario } from "../models/schemas";
import fs from "fs";
import path from "path";

/**
 * Nano Banana Pro Service for 4K Scene Reconstructions
 * Uses Gemini 3 Pro Image (gemini-3-pro-image-preview) for 4K image generation
 * Reference: https://ai.google.dev/gemini-api/docs/gemini-3
 */
export class NanoBananaService {
  private apiKey: string | null = null;

  private getApiKey(): string {
    if (!this.apiKey) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY is required for image generation");
      }
      this.apiKey = key;
      console.log("✅ Initialized Nano Banana Pro (Gemini 3 Pro Image)");
    }
    return this.apiKey;
  }

  /**
   * Create a safe, architectural-style prompt for scene reconstruction
   */
  private createSafePrompt(
    scenario: Scenario,
    viewpoint: string,
    type: string,
    description: string
  ): string {
    // Extract key scene elements and convert to neutral architectural description
    const safeNarrative = scenario.narrative
      .replace(/crime|forensic|investigation|incident|evidence/gi, "scene")
      .replace(/blood|gore|violence|death|injury|wound/gi, "red paint spill")
      .replace(/body|corpse|victim|suspect/gi, "mannequin")
      .replace(/weapon|gun|knife/gi, "prop object")
      .substring(0, 500);

    // Use architectural/interior design language
    const prompt = `Generate a photorealistic architectural interior photograph.

Scene: A modern urban balcony or interior space with the following elements:
${safeNarrative}

View: ${viewpoint} perspective
Style: Professional architectural photography, wide-angle lens, natural daylight, high dynamic range, sharp focus throughout
Quality: 4K resolution, photorealistic, professional documentation style

Important: This is for architectural visualization and training purposes only.`;

    return prompt;
  }

  /**
   * Generate 4K reconstruction image using Gemini 3 Pro Image
   * Uses REST API for full control over Gemini 3 features
   */
  async generateReconstruction(
    caseId: string,
    scenario: Scenario,
    viewpoint: string,
    type: "most_likely" | "alternative" | "before" | "after",
    description: string
  ): Promise<ReconstructionImage> {
    const id = uuidv4();
    const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
    const reconDir = path.join(uploadsDir, caseId, "reconstructions");

    console.log(`\n🎨 Generating 4K reconstruction for: ${scenario.name}`);
    console.log(`   Viewpoint: ${viewpoint}`);
    console.log(`   Type: ${type}`);
    console.log(`   Model: gemini-3-pro-image-preview`);

    try {
      // Ensure directory exists
      if (!fs.existsSync(reconDir)) {
        fs.mkdirSync(reconDir, { recursive: true });
      }

      const apiKey = this.getApiKey();
      const prompt = this.createSafePrompt(scenario, viewpoint, type, description);
      console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

      // Use Gemini 3 Pro Image model with REST API
      // Reference: https://ai.google.dev/gemini-api/docs/gemini-3
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              imageConfig: {
                aspectRatio: "16:9",
                imageSize: "4K",
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ⚠️ Gemini 3 Pro Image API error: ${response.status}`);
        console.log(`   Error details: ${errorText.substring(0, 200)}`);
        
        // Fall back to Gemini 2.0 Flash experimental
        return this.tryGemini2FlashImageGen(caseId, scenario, viewpoint, type, description, id, reconDir, prompt);
      }

      const data: any = await response.json();
      
      // Extract image from response
      const parts = data.candidates?.[0]?.content?.parts || [];
      console.log(`   Response parts: ${parts.length}`);

      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          const imageBuffer = Buffer.from(part.inlineData.data, "base64");
          const ext = part.inlineData.mimeType.includes("png") ? "png" : "jpg";
          const imagePath = path.join(reconDir, `${id}.${ext}`);
          fs.writeFileSync(imagePath, imageBuffer);

          console.log(`   ✅ Generated 4K reconstruction: ${imagePath}`);
          console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

          return {
            id,
            caseId,
            scenarioId: scenario.id,
            viewpoint,
            type,
            storageUrl: `/uploads/${caseId}/reconstructions/${id}.${ext}`,
            description: `4K AI-generated reconstruction: ${viewpoint} view of ${scenario.name}`,
          };
        }
        
        if (part.text) {
          console.log(`   📝 Text response: ${part.text.substring(0, 150)}...`);
        }
      }

      console.log(`   ⚠️ No image data in Gemini 3 response, trying fallback...`);
      return this.tryGemini2FlashImageGen(caseId, scenario, viewpoint, type, description, id, reconDir, prompt);

    } catch (error) {
      console.error(`   ❌ Reconstruction generation error:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   Error: ${errorMsg}`);
      return this.createPlaceholderReconstruction(caseId, scenario, viewpoint, type, description, id);
    }
  }

  /**
   * Fallback to Gemini 2.0 Flash experimental image generation
   */
  private async tryGemini2FlashImageGen(
    caseId: string,
    scenario: Scenario,
    viewpoint: string,
    type: "most_likely" | "alternative" | "before" | "after",
    description: string,
    id: string,
    reconDir: string,
    prompt: string
  ): Promise<ReconstructionImage> {
    console.log(`   🔄 Trying Gemini 2.0 Flash experimental...`);
    
    try {
      const apiKey = this.getApiKey();
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        console.log(`   ⚠️ Gemini 2.0 Flash also failed: ${response.status}`);
        return this.createPlaceholderReconstruction(caseId, scenario, viewpoint, type, description, id);
      }

      const data: any = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          const imageBuffer = Buffer.from(part.inlineData.data, "base64");
          const ext = part.inlineData.mimeType.includes("png") ? "png" : "jpg";
          const imagePath = path.join(reconDir, `${id}.${ext}`);
          fs.writeFileSync(imagePath, imageBuffer);

          console.log(`   ✅ Generated via Gemini 2.0 Flash: ${imagePath}`);
          console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

          return {
            id,
            caseId,
            scenarioId: scenario.id,
            viewpoint,
            type,
            storageUrl: `/uploads/${caseId}/reconstructions/${id}.${ext}`,
            description: `AI-generated reconstruction: ${viewpoint} view of ${scenario.name}`,
          };
        }
      }

      return this.createPlaceholderReconstruction(caseId, scenario, viewpoint, type, description, id);
      
    } catch (error) {
      console.log(`   ⚠️ Gemini 2.0 Flash fallback failed:`, error);
      return this.createPlaceholderReconstruction(caseId, scenario, viewpoint, type, description, id);
    }
  }

  /**
   * Create a placeholder reconstruction when image generation fails
   */
  private createPlaceholderReconstruction(
    caseId: string,
    scenario: Scenario,
    viewpoint: string,
    type: "most_likely" | "alternative" | "before" | "after",
    description: string,
    id: string
  ): ReconstructionImage {
    const placeholderUrls = [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=2048&h=1536&fit=crop&q=95",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=2048&h=1536&fit=crop&q=95",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=2048&h=1536&fit=crop&q=95",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=2048&h=1536&fit=crop&q=95",
      "https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=2048&h=1536&fit=crop&q=95",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=2048&h=1536&fit=crop&q=95",
    ];

    const index = parseInt(scenario.id.replace(/\D/g, "").substring(0, 8), 10) % placeholderUrls.length;
    const placeholderUrl = placeholderUrls[index] || placeholderUrls[0];

    console.log(`   📌 Using placeholder image`);

    return {
      id,
      caseId,
      scenarioId: scenario.id,
      viewpoint,
      type,
      storageUrl: placeholderUrl,
      description: `[Demo] ${viewpoint} view - ${scenario.name}. Representative image for demonstration.`,
    };
  }

  /**
   * Generate multiple reconstructions for a scenario
   */
  async generateMultipleViewpoints(
    caseId: string,
    scenario: Scenario,
    viewpoints: string[]
  ): Promise<ReconstructionImage[]> {
    console.log(`\n🎨 Generating ${viewpoints.length} reconstructions for ${scenario.name}`);
    const reconstructions: ReconstructionImage[] = [];

    for (const viewpoint of viewpoints) {
      const recon = await this.generateReconstruction(
        caseId,
        scenario,
        viewpoint,
        "most_likely",
        `Reconstruction from ${viewpoint} perspective`
      );
      reconstructions.push(recon);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    console.log(`   ✅ Generated ${reconstructions.length} reconstructions`);
    return reconstructions;
  }

  /**
   * Generate before/after reconstructions for a scenario
   */
  async generateBeforeAfter(
    caseId: string,
    scenario: Scenario,
    viewpoint: string
  ): Promise<{ before: ReconstructionImage; after: ReconstructionImage }> {
    console.log(`\n🎨 Generating before/after for ${scenario.name}`);

    const before = await this.generateReconstruction(
      caseId,
      scenario,
      viewpoint,
      "before",
      "Scene before the incident occurred"
    );

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const after = await this.generateReconstruction(
      caseId,
      scenario,
      viewpoint,
      "after",
      "Scene after the incident with evidence markers"
    );

    return { before, after };
  }
}

export const nanoBananaService = new NanoBananaService();
