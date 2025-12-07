import { GoogleGenerativeAI } from "@google/generative-ai";
import { EvidenceItem, FrameEvidence } from "../models/schemas";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

// Helper function to generate content with Gemini 3 Pro Preview
async function generateContentWithFallback(input: any): Promise<any> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-3-pro-preview" });
  return await model.generateContent(input);
}

export interface GeminiSummary {
  summary: string;
  tags: string[];
  timeHint?: string;
  reasoning?: string;
}

export interface GeminiFusionResult {
  timeline: Array<{
    label: string;
    description: string;
    startTime?: number;
    endTime?: number;
    confidence: number;
    supportingEvidenceIds: string[];
  }>;
  worldModel: string;
  reasoning?: string;
}

export interface GeminiContradictionResult {
  contradictions: Array<{
    description: string;
    involvedEvidenceIds: string[];
    involvedWitnesses: string[];
    severity: "low" | "medium" | "high";
  }>;
  reasoning?: string;
}

export interface GeminiScenarioResult {
  scenarios: Array<{
    name: string;
    likelihood: number;
    narrative: string;
    supportingEvidenceIds: string[];
    conflictingEvidenceIds: string[];
    keyFindings?: string[];
    supportingEvidence?: string[];
    conflictingEvidence?: string[];
    scenarioReasoning?: string;
  }>;
  reasoning?: string;
}

export class GeminiClient {
  /**
   * Summarize a single evidence item
   */
  async summarizeEvidence(
    evidence: EvidenceItem,
    imageData?: Buffer,
    textContent?: string
  ): Promise<GeminiSummary> {
    let prompt = `You are a forensic analysis assistant. Analyze this evidence item carefully and provide a detailed analysis.

Evidence type: ${evidence.type}
Filename: ${evidence.originalFilename}`;

    if (imageData) {
      prompt += `\n\n[VISUAL ANALYSIS REQUIRED]\nImage/video frame data is provided for visual analysis. You MUST analyze the actual visual content, not just the filename.`;
    } else if (textContent) {
      const textPreview = textContent.length > 500 ? textContent.substring(0, 500) + "..." : textContent;
      prompt += `\n\n[TEXT CONTENT ANALYSIS REQUIRED]\n\n=== TEXT CONTENT FROM FILE (${textContent.length} characters) ===\n${textContent}\n=== END OF TEXT CONTENT ===\n\nYou MUST analyze the actual text content above, not just the filename. Extract key information, facts, statements, people mentioned, locations, times, and events from the actual text content.`;
    } else {
      prompt += `\n[WARNING: No file content available - only filename metadata]\nFile: ${evidence.originalFilename}\nThis may indicate a processing error. Provide analysis based on filename and type only.`;
    }

    prompt += `\n\nPlease provide:
1. A detailed summary (3-4 sentences) describing what you observe, including:
   - For images/videos: Key objects, people, or scenes visible, actions or events, spatial relationships, notable details
   - For text/audio: Key information, statements, claims, important facts, people mentioned, locations, times
   - For any type: Any notable details or anomalies
2. Key tags as an array (objects, people, locations, actions, themes, etc.)
3. Time hint if temporal information is apparent
4. Brief reasoning explaining your analysis

CRITICAL: You MUST analyze the actual file content provided above, NOT just the filename. If visual/image data is provided, describe what you actually see. If text content is provided, extract and summarize the actual information from that text. Do NOT base your analysis solely on the filename.

Respond ONLY in valid JSON format (no markdown, no code blocks):
{
  "summary": "Detailed description here...",
  "tags": ["tag1", "tag2", "tag3"],
  "timeHint": "optional time information",
  "reasoning": "Brief explanation of your analysis"
}`;

      try {
        let result;
        
        if (imageData && (evidence.type === "image" || evidence.type === "video")) {
          // For images/videos, use multimodal input
          const imagePart = {
            inlineData: {
              data: imageData.toString("base64"),
              mimeType: "image/jpeg",
            },
          };
          if (evidence.type === "video") {
            console.log(`🎬 Sending VIDEO FRAME with visual data to Gemini (${imageData.length} bytes)`);
            console.log(`   Analyzing actual video frame content, not just filename`);
          } else {
            console.log(`🖼️  Sending IMAGE with visual data to Gemini (${imageData.length} bytes)`);
            console.log(`   Analyzing actual image content, not just filename`);
          }
          result = await generateContentWithFallback([prompt, imagePart]);
        } else {
          if (textContent) {
            console.log(`📄 Sending TEXT/DOCUMENT with ${textContent.length} characters of content to Gemini`);
            console.log(`   Analyzing actual text content, not just filename`);
            console.log(`   Text preview: ${textContent.substring(0, 150)}...`);
          } else {
            console.log(`⚠️  Sending ${evidence.type} analysis to Gemini WITHOUT file content (filename only)`);
            console.log(`   This may indicate a processing error`);
          }
          result = await generateContentWithFallback(prompt);
        }

      const response = result.response;
      const text = response.text();
      console.log(`Gemini response preview: ${text.substring(0, 200)}...`);
      
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      
      // If wrapped in markdown code block, extract it
      if (!jsonMatch) {
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonMatch = [codeBlockMatch[1]];
        }
      }
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            summary: parsed.summary || text.substring(0, 300),
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            timeHint: parsed.timeHint,
            reasoning: parsed.reasoning || "Analyzed evidence item for key details.",
          };
        } catch (parseError) {
          console.error("JSON parse error in summarizeEvidence:", parseError);
          console.error("Response text:", text.substring(0, 500));
        }
      }

      // Fallback: use text as summary
      return {
        summary: text.substring(0, 300),
        tags: [],
        reasoning: "Processed evidence item (text-only response).",
      };
    } catch (error) {
      console.error("Gemini API error in summarizeEvidence:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to summarize evidence: ${errorMsg}`);
    }
  }

  /**
   * Transcribe audio using Gemini
   */
  async transcribeAudio(audioData: Buffer, mimeType: string): Promise<string> {
    const prompt = `Transcribe this audio recording. Provide a complete, accurate transcript of all spoken words, including:
- All dialogue and speech
- Speaker identification if possible (e.g., "Speaker 1:", "Speaker 2:")
- Important sounds or background audio
- Any pauses or notable audio events

Provide the transcript in plain text format, one line per speaker or segment.`;

    try {
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: mimeType,
        },
      };
      console.log(`Sending audio to Gemini for transcription (${audioData.length} bytes, ${mimeType})`);
      const result = await generateContentWithFallback([prompt, audioPart]);
      const transcript = result.response.text();
      console.log(`Transcription received (${transcript.length} characters)`);
      return transcript;
    } catch (error) {
      console.error("Audio transcription error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to transcribe audio: ${errorMsg}`);
    }
  }

  /**
   * Fuse evidence into world model and build timeline
   */
  async fuseEvidence(
    evidenceSummaries: Array<{ evidence: EvidenceItem; summary: string; tags: string[] }>,
    problemStatement?: string
  ): Promise<GeminiFusionResult> {
    if (evidenceSummaries.length === 0) {
      throw new Error("No evidence summaries provided for fusion");
    }

    const summariesText = evidenceSummaries
      .map(
        (e, i) =>
          `Evidence ${i + 1} (${e.evidence.type}, filename: ${e.evidence.originalFilename}): ${e.summary || "No summary available"}\nTags: ${e.tags.length > 0 ? e.tags.join(", ") : "None"}`
      )
      .join("\n\n");

    const prompt = `You are a forensic analysis assistant. Analyze and fuse this evidence into a unified world model and build a timeline of events.

Evidence summaries:
${summariesText}

${problemStatement ? `Problem statement: ${problemStatement}` : "Analyze the scene and events based on the evidence."}

IMPORTANT: Create a timeline of events based on what you can infer from the evidence. Even if information is limited, provide at least 2-3 timeline events based on what is available.

For each timeline event, provide:
- Label (short event name, e.g., "Person enters room")
- Description (detailed description of what happened, 2-3 sentences)
- Start/end time (relative timeline in seconds, use numbers like 0, 5, 10, etc.)
- Confidence (0-1, how confident you are in this event)
- Supporting evidence IDs (use "Evidence 1", "Evidence 2", etc. to reference which evidence supports this event)

Also provide a unified world model description (2-3 paragraphs describing the scene, key objects, people, and overall situation).

Respond ONLY in valid JSON format (no markdown, no code blocks):
{
  "timeline": [
    {
      "label": "Event name here",
      "description": "Detailed description",
      "startTime": 0,
      "endTime": 5,
      "confidence": 0.8,
      "supportingEvidenceIds": ["Evidence 1"]
    }
  ],
  "worldModel": "Detailed description of the scene and situation...",
  "reasoning": "Brief explanation of how you fused the evidence (1-2 sentences)"
}`;

    try {
      const result = await generateContentWithFallback(prompt);
      const text = result.response.text();
      
      console.log("Gemini fusion response:", text.substring(0, 500));
      
      // Try to extract JSON from response (handle code blocks)
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      
      // If wrapped in markdown code block, extract it
      if (!jsonMatch) {
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonMatch = codeBlockMatch;
        }
      }
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Ensure timeline is an array with at least some data
          if (!parsed.timeline || !Array.isArray(parsed.timeline)) {
            console.warn("Timeline is not an array, creating default");
            parsed.timeline = [];
          }
          
          return {
            timeline: parsed.timeline || [],
            worldModel: parsed.worldModel || "Analysis complete but world model description unavailable.",
            reasoning: parsed.reasoning || "Fused evidence into unified timeline.",
          };
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Failed to parse:", jsonMatch[0].substring(0, 500));
          throw parseError;
        }
      }

      // Fallback: create a basic timeline from the response
      console.warn("Could not parse JSON, creating fallback timeline");
      return {
        timeline: [
          {
            label: "Evidence Collected",
            description: text.substring(0, 200),
            startTime: 0,
            endTime: 10,
            confidence: 0.7,
            supportingEvidenceIds: evidenceSummaries.map((_, i) => `Evidence ${i + 1}`),
          }
        ],
        worldModel: text.substring(0, 500),
        reasoning: "Processed evidence fusion (fallback mode).",
      };
    } catch (error) {
      console.error("Gemini fusion error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fuse evidence: ${errorMessage}`);
    }
  }

  /**
   * Detect contradictions
   */
  async detectContradictions(
    timeline: any[],
    evidenceSummaries: Array<{ evidence: EvidenceItem; summary: string }>,
    witnessStatements: string[]
  ): Promise<GeminiContradictionResult> {
    const prompt = `Analyze these testimonies and evidence for contradictions.

Timeline:
${JSON.stringify(timeline, null, 2)}

Evidence:
${evidenceSummaries.map((e, i) => `${i + 1}. ${e.summary}`).join("\n")}

Witness statements:
${witnessStatements.map((s, i) => `Witness ${i + 1}: ${s}`).join("\n")}

Identify contradictions between:
- Testimonies and timeline
- Testimonies and physical evidence
- Different testimonies

For each contradiction, provide:
- Description
- Involved evidence IDs
- Involved witnesses
- Severity (low/medium/high)

Respond in JSON:
{
  "contradictions": [
    {
      "description": "...",
      "involvedEvidenceIds": ["Evidence 1"],
      "involvedWitnesses": ["Witness 1"],
      "severity": "medium"
    }
  ],
  "reasoning": "Brief explanation (1-2 sentences)"
}`;

    try {
      const result = await generateContentWithFallback(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          contradictions: parsed.contradictions || [],
          reasoning: parsed.reasoning || "Analyzed for contradictions.",
        };
      }

      return {
        contradictions: [],
        reasoning: "Processed contradiction analysis.",
      };
    } catch (error) {
      console.error("Gemini contradiction error:", error);
      return {
        contradictions: [],
        reasoning: "Failed to analyze contradictions.",
      };
    }
  }

  /**
   * Generate scenarios with detailed reasoning
   */
  async generateScenarios(
    worldModel: string,
    timeline: any[],
    contradictions: any[]
  ): Promise<GeminiScenarioResult> {
    const prompt = `Generate 2-3 plausible scenarios based on this evidence. You are a forensic analyst.

World Model:
${worldModel}

Timeline:
${JSON.stringify(timeline, null, 2)}

Contradictions:
${JSON.stringify(contradictions, null, 2)}

For each scenario, provide DETAILED analysis:
- Name (e.g., "Scenario A: Accidental Fall" or "Scenario B: Staged Scene")
- Likelihood (0-1, must sum close to 1)
- Narrative (2-3 detailed paragraphs explaining what happened step by step)
- scenarioReasoning (1-2 sentences explaining WHY this scenario is plausible given the evidence)
- keyFindings (3-5 bullet points of specific findings that support this scenario)
- supportingEvidence (3-5 human-readable points of supporting evidence, e.g., "Security footage shows deliberate movement patterns")
- conflictingEvidence (2-3 human-readable points of conflicting evidence, e.g., "Witness timing discrepancy of 2 minutes")
- supportingEvidenceIds (which evidence items support this)
- conflictingEvidenceIds (which evidence items conflict)

Respond in JSON:
{
  "scenarios": [
    {
      "name": "Scenario A: Primary Theory",
      "likelihood": 0.7,
      "narrative": "Detailed narrative here...",
      "scenarioReasoning": "This scenario is most likely because...",
      "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
      "supportingEvidence": ["Evidence point 1", "Evidence point 2"],
      "conflictingEvidence": ["Conflicting point 1"],
      "supportingEvidenceIds": ["Evidence 1"],
      "conflictingEvidenceIds": ["Evidence 2"]
    }
  ],
  "reasoning": "Overall analysis reasoning explaining how scenarios were derived from evidence (2-3 sentences)"
}`;

    try {
      const result = await generateContentWithFallback(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          scenarios: parsed.scenarios || [],
          reasoning: parsed.reasoning || "Generated scenarios.",
        };
      }

      return {
        scenarios: [],
        reasoning: "Processed scenario generation.",
      };
    } catch (error) {
      console.error("Gemini scenario error:", error);
      return {
        scenarios: [],
        reasoning: "Failed to generate scenarios.",
      };
    }
  }

  /**
   * Analyze shadows/reflections in frames
   */
  async analyzeShadowsReflections(
    frame: FrameEvidence,
    frameImageData: Buffer
  ): Promise<{ notes: string; reasoning: string }> {
    const prompt = `Analyze this image for shadows and reflections. Infer:
- Light source direction
- Possible off-camera objects or people
- How this affects the timeline

Provide brief notes and reasoning (1-2 sentences each).`;

    try {
      const imagePart = {
        inlineData: {
          data: frameImageData.toString("base64"),
          mimeType: "image/jpeg",
        },
      };
      const result = await generateContentWithFallback([prompt, imagePart]);
      const text = result.response.text();
      
      return {
        notes: text.substring(0, 200),
        reasoning: "Analyzed shadows and reflections for off-camera inference.",
      };
    } catch (error) {
      console.error("Shadow/reflection analysis error:", error);
      return {
        notes: "Error analyzing shadows/reflections",
        reasoning: "Failed to analyze shadows/reflections.",
      };
    }
  }

  /**
   * Chat with case context
   */
  async chat(
    question: string,
    caseAnalysis: any,
    evidenceSummaries: Array<{ evidence: EvidenceItem; summary: string }>
  ): Promise<{ answer: string; reasoning: string }> {
    const context = `Case Analysis:
${JSON.stringify(caseAnalysis, null, 2)}

Evidence:
${evidenceSummaries.map((e, i) => `${i + 1}. ${e.summary}`).join("\n")}

User question: ${question}

Respond as a forensic reasoning assistant. Provide:
1. A clear answer
2. Brief reasoning (1-2 sentences) explaining your thinking
3. Reference specific evidence when relevant

Format:
{
  "answer": "...",
  "reasoning": "..."
}`;

    try {
      const result = await generateContentWithFallback(context);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          answer: parsed.answer || text,
          reasoning: parsed.reasoning || "Processed question.",
        };
      }

      return {
        answer: text,
        reasoning: "Analyzed question based on case evidence.",
      };
    } catch (error) {
      console.error("Chat error:", error);
      return {
        answer: "Error processing question",
        reasoning: "Failed to process chat request.",
      };
    }
  }
}

export const geminiClient = new GeminiClient();

