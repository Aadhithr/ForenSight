import { v4 as uuidv4 } from "uuid";
import { WitnessPortrait, WitnessPortraitParams } from "../models/schemas";
import { dbRun, dbAll, dbGet } from "../db/database";
import fs from "fs";
import path from "path";

/**
 * Witness Portrait Service
 * Generates photorealistic witness portraits using Gemini 3 Pro Image
 */
export class WitnessPortraitService {
  private apiKey: string | null = null;

  private getApiKey(): string {
    if (!this.apiKey) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY is required for portrait generation");
      }
      this.apiKey = key;
    }
    return this.apiKey;
  }

  /**
   * Convert skin tone to detailed description
   */
  private getSkinToneDescription(tone: string, undertone?: string): string {
    const toneMap: Record<string, string> = {
      very_light: "very fair, porcelain complexion with pink undertones",
      light: "light, fair skin with natural flush",
      medium_light: "light olive or peachy skin tone",
      medium: "medium, warm olive or tan skin tone",
      medium_dark: "medium-dark, caramel or bronze skin tone",
      dark: "dark, rich brown skin tone",
      very_dark: "deep, dark brown to ebony skin tone",
    };
    
    let desc = toneMap[tone] || "natural skin tone";
    if (undertone) {
      desc += ` with ${undertone} undertones`;
    }
    return desc;
  }

  /**
   * Convert ethnicity to detailed description
   */
  private getEthnicityDescription(ethnicity?: string): string {
    if (!ethnicity) return "";
    
    const ethnicityMap: Record<string, string> = {
      caucasian: "Caucasian/European ancestry",
      african: "African/Black ancestry",
      asian: "East Asian ancestry",
      south_asian: "South Asian ancestry (Indian subcontinent)",
      hispanic: "Hispanic/Latino ancestry",
      middle_eastern: "Middle Eastern ancestry",
      mixed: "mixed/multiracial heritage",
    };
    
    return ethnicityMap[ethnicity] || "";
  }

  /**
   * Build detailed prompt for photorealistic portrait generation
   */
  private buildPortraitPrompt(params: WitnessPortraitParams): string {
    const skinDesc = this.getSkinToneDescription(params.skinTone, params.skinUndertone);
    const ethnicityDesc = this.getEthnicityDescription(params.ethnicity);
    
    // Age description
    const ageDesc = params.ageRange.replace("-", " to ");
    
    // Build facial features description
    const features: string[] = [];
    
    // Face shape
    features.push(`${params.faceShape}-shaped face`);
    if (params.faceWidth) features.push(`${params.faceWidth} face width`);
    if (params.jawline) features.push(`${params.jawline} jawline`);
    if (params.cheekbones) features.push(`${params.cheekbones} cheekbones`);
    
    // Eyes
    features.push(`${params.eyeSize} ${params.eyeShape} ${params.eyeColor} eyes`);
    if (params.eyeSpacing && params.eyeSpacing !== "average") features.push(`${params.eyeSpacing}-set eyes`);
    if (params.eyebrowShape) features.push(`${params.eyebrowShape} eyebrows`);
    
    // Nose
    const noseSize = params.noseSize || "medium";
    features.push(`${noseSize} ${params.noseShape} nose`);
    
    // Lips
    features.push(`${params.lipShape} lips`);
    
    // Hair
    if (params.hairColor !== "bald" && params.hairStyle !== "bald") {
      features.push(`${params.hairTexture} ${params.hairStyle} ${params.hairColor.replace(/_/g, " ")} hair`);
    } else {
      features.push("bald head");
    }
    
    // Facial hair for males
    if (params.gender === "male" && params.facialHair && params.facialHair !== "none") {
      const facialHairDesc = params.facialHair.replace(/_/g, " ");
      features.push(`${facialHairDesc}${params.facialHairColor ? ` (${params.facialHairColor})` : ""}`);
    }
    
    // Distinguishing features
    if (params.distinguishingFeatures) {
      const df = params.distinguishingFeatures;
      if (df.freckles) features.push("freckles across the face");
      if (df.dimples) features.push("dimples when smiling");
      if (df.wrinkles && df.wrinkles !== "none") features.push(`${df.wrinkles} wrinkles`);
      if (df.glasses && df.glasses.type !== "none") features.push(`wearing ${df.glasses.type} glasses`);
      if (df.scars?.length) {
        df.scars.forEach(s => features.push(`${s.type} scar on ${s.location}`));
      }
      if (df.moles?.length) {
        df.moles.forEach(m => features.push(`mole on ${m.location}`));
      }
    }
    
    // Expression
    const expression = params.expression || "neutral";
    const expressionDesc = expression === "neutral" ? "neutral, calm expression" :
                          expression === "slight_smile" ? "slight, natural smile" :
                          "serious, focused expression";
    
    const ethnicityLine = ethnicityDesc ? `\n- Ethnicity/Ancestry: ${ethnicityDesc}` : "";
    const customDetails = params.description ? `\n- Additional details: ${params.description}` : "";
    
    const prompt = `Generate a photorealistic portrait photograph of a ${params.gender} person, aged ${ageDesc} years old.

PHYSICAL APPEARANCE:
- Skin: ${skinDesc}${ethnicityLine}
- Facial features: ${features.join(", ")}
- Expression: ${expressionDesc}${customDetails}

PHOTOGRAPHY STYLE:
- Professional headshot/portrait photography
- Studio lighting with soft key light and subtle fill
- Sharp focus on the face with slight background blur
- High resolution, 4K quality
- Neutral gray or softly lit background
- Natural, lifelike appearance (NOT a sketch, NOT stylized, NOT cartoon)
- Realistic skin texture with pores and natural imperfections
- Realistic hair strands and texture
- Natural eye reflections and catchlights

IMPORTANT:
- This is for law enforcement training and educational purposes
- Generate a photorealistic human portrait, like a passport photo
- The person should look like a real human being photographed in a studio
- Maintain anatomical accuracy and realistic proportions
- Natural skin with subtle variations in tone
- Realistic lighting on the face showing depth and dimension`;

    return prompt;
  }

  /**
   * Generate a photorealistic witness portrait
   */
  async generatePortrait(
    caseId: string,
    params: WitnessPortraitParams
  ): Promise<WitnessPortrait> {
    const id = uuidv4();
    const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
    const portraitsDir = path.join(uploadsDir, caseId, "portraits");

    console.log(`\n👤 Generating witness portrait...`);
    console.log(`   Case ID: ${caseId}`);
    console.log(`   Gender: ${params.gender}, Age: ${params.ageRange}`);
    console.log(`   Face: ${params.faceShape}, Skin: ${params.skinTone}`);

    try {
      // Ensure directory exists
      if (!fs.existsSync(portraitsDir)) {
        fs.mkdirSync(portraitsDir, { recursive: true });
      }

      const apiKey = this.getApiKey();
      const prompt = this.buildPortraitPrompt(params);
      
      console.log(`   Prompt length: ${prompt.length} characters`);

      // Use Gemini 3 Pro Image for photorealistic generation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              imageConfig: {
                aspectRatio: "1:1",  // Square for portrait
                imageSize: "4K",
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ⚠️ Gemini 3 API error: ${response.status}`);
        console.log(`   Error: ${errorText.substring(0, 200)}`);
        console.log(`   Trying fallback...`);
        return this.tryFallbackGeneration(caseId, params, id, portraitsDir, prompt);
      }

      const data: any = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          const imageBuffer = Buffer.from(part.inlineData.data, "base64");
          const ext = part.inlineData.mimeType.includes("png") ? "png" : "jpg";
          const imagePath = path.join(portraitsDir, `${id}.${ext}`);
          fs.writeFileSync(imagePath, imageBuffer);

          console.log(`   ✅ Generated portrait: ${imagePath}`);
          console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

          const portrait: WitnessPortrait = {
            id,
            caseId,
            params,
            storageUrl: `/uploads/${caseId}/portraits/${id}.${ext}`,
            createdAt: new Date().toISOString(),
            description: this.generateDescription(params),
          };

          // Store in database
          await this.storePortrait(portrait);

          return portrait;
        }
        
        if (part.text) {
          console.log(`   📝 Text response received, trying fallback...`);
        }
      }

      return this.tryFallbackGeneration(caseId, params, id, portraitsDir, prompt);

    } catch (error) {
      console.error(`   ❌ Portrait generation error:`, error);
      throw error;
    }
  }

  /**
   * Fallback to Gemini 2.0 Flash experimental
   */
  private async tryFallbackGeneration(
    caseId: string,
    params: WitnessPortraitParams,
    id: string,
    portraitsDir: string,
    prompt: string
  ): Promise<WitnessPortrait> {
    console.log(`   🔄 Trying Gemini 2.0 Flash experimental...`);

    try {
      const apiKey = this.getApiKey();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Fallback failed: ${response.status}`);
      }

      const data: any = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          const imageBuffer = Buffer.from(part.inlineData.data, "base64");
          const ext = part.inlineData.mimeType.includes("png") ? "png" : "jpg";
          const imagePath = path.join(portraitsDir, `${id}.${ext}`);
          fs.writeFileSync(imagePath, imageBuffer);

          console.log(`   ✅ Generated via fallback: ${imagePath}`);

          const portrait: WitnessPortrait = {
            id,
            caseId,
            params,
            storageUrl: `/uploads/${caseId}/portraits/${id}.${ext}`,
            createdAt: new Date().toISOString(),
            description: this.generateDescription(params),
          };

          await this.storePortrait(portrait);
          return portrait;
        }
      }

      throw new Error("No image generated from fallback");

    } catch (error) {
      console.error(`   ❌ Fallback generation failed:`, error);
      throw error;
    }
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(params: WitnessPortraitParams): string {
    const gender = params.gender === "male" ? "Male" : "Female";
    const age = params.ageRange;
    const skin = params.skinTone.replace(/_/g, " ");
    const hair = params.hairColor === "bald" ? "Bald" : 
                 `${params.hairColor.replace(/_/g, " ")} ${params.hairTexture} ${params.hairStyle} hair`;
    const eyes = `${params.eyeColor} ${params.eyeShape} eyes`;
    const ethnicity = params.ethnicity ? ` ${params.ethnicity.replace(/_/g, " ")} ethnicity.` : "";
    const customDesc = params.description ? ` Additional: ${params.description}` : "";
    
    return `${gender}, ${age} years old.${ethnicity} ${skin} skin tone. ${hair}. ${eyes}. ${params.faceShape} face shape.${customDesc}`;
  }

  /**
   * Store portrait in database
   */
  private async storePortrait(portrait: WitnessPortrait): Promise<void> {
    await dbRun(
      `INSERT INTO witness_portraits (id, caseId, params, storageUrl, createdAt, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        portrait.id,
        portrait.caseId,
        JSON.stringify(portrait.params),
        portrait.storageUrl,
        portrait.createdAt,
        portrait.description,
      ]
    );
  }

  /**
   * Get all portraits for a case
   */
  async getPortraitsByCase(caseId: string): Promise<WitnessPortrait[]> {
    const rows: any[] = await dbAll(
      `SELECT * FROM witness_portraits WHERE caseId = ? ORDER BY createdAt DESC`,
      [caseId]
    );

    return rows.map((row) => ({
      id: row.id,
      caseId: row.caseId,
      params: JSON.parse(row.params),
      storageUrl: row.storageUrl,
      createdAt: row.createdAt,
      description: row.description,
    }));
  }

  /**
   * Get a single portrait by ID
   */
  async getPortraitById(id: string): Promise<WitnessPortrait | null> {
    const row = await dbGet(`SELECT * FROM witness_portraits WHERE id = ?`, [id]);
    if (!row) return null;

    return {
      id: (row as any).id,
      caseId: (row as any).caseId,
      params: JSON.parse((row as any).params),
      storageUrl: (row as any).storageUrl,
      createdAt: (row as any).createdAt,
      description: (row as any).description,
    };
  }

  /**
   * Delete a portrait
   */
  async deletePortrait(id: string): Promise<void> {
    const portrait = await dbGet(`SELECT * FROM witness_portraits WHERE id = ?`, [id]);
    if (portrait) {
      const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
      const storageUrl = (portrait as any).storageUrl;
      const filePath = path.join(uploadsDir, storageUrl.replace("/uploads/", ""));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`   🗑️ Deleted portrait file: ${filePath}`);
      }
      await dbRun(`DELETE FROM witness_portraits WHERE id = ?`, [id]);
      console.log(`   🗑️ Deleted portrait record: ${id}`);
    }
  }
}

export const witnessPortraitService = new WitnessPortraitService();

