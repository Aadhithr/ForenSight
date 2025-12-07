// Backend type definitions (mirrors shared/types.ts)
// Import types directly to avoid path issues
export type EvidenceType = "image" | "video" | "audio" | "text" | "document";
export type CaseStatus = "pending" | "running" | "completed" | "error";

export interface EvidenceItem {
  id: string;
  caseId: string;
  type: EvidenceType;
  originalFilename: string;
  storageUrl: string;
  uploadedAt: string;
  meta?: {
    timestampHint?: string;
    locationHint?: string;
    witnessId?: string;
  };
  derived?: {
    transcript?: string;
    ocrText?: string;
    frameIds?: string[];
    summary?: string;
    tags?: string[];
  };
}

export interface FrameEvidence {
  id: string;
  parentEvidenceId: string;
  timeSeconds: number;
  storageUrl: string;
  derived?: {
    summary?: string;
    tags?: string[];
    shadowReflectionNotes?: string;
  };
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  label: string;
  description: string;
  startTime?: number;
  endTime?: number;
  supportingEvidenceIds: string[];
  confidence: number;
}

export interface Contradiction {
  id: string;
  caseId: string;
  description: string;
  involvedEvidenceIds: string[];
  involvedWitnesses: string[];
  severity: "low" | "medium" | "high";
}

export interface Scenario {
  id: string;
  caseId: string;
  name: string;
  likelihood: number;
  narrative: string;
  supportingEvidenceIds: string[];
  conflictingEvidenceIds: string[];
  reconstructionImageIds: string[];
  reasoning?: string;
  keyFindings?: string[];
  supportingEvidence?: string[];
  conflictingEvidence?: string[];
}

export interface ReconstructionImage {
  id: string;
  caseId: string;
  scenarioId?: string;
  viewpoint: string;
  type: "most_likely" | "alternative" | "before" | "after";
  storageUrl: string;
  description: string;
}

export interface CaseAnalysis {
  caseId: string;
  status: CaseStatus;
  timeline: TimelineEvent[];
  contradictions: Contradiction[];
  scenarios: Scenario[];
  missingEvidenceSuggestions: string[];
  globalSummary: string;
  heatmap: {
    segments: {
      startTime: number;
      endTime: number;
      confidence: number;
      contradictionScore: number;
    }[];
  };
  reconstructions?: ReconstructionImage[];
  reasoning?: {
    fusion?: string;
    contradictions?: string;
    scenarios?: string;
  };
  evidenceSummaries?: Array<{
    evidenceId: string;
    summary: string;
    tags: string[];
    processed: boolean;
  }>;
}

export interface Case {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
}

export interface ClarificationQuestion {
  id: string;
  caseId: string;
  text: string;
  relatedEvidenceIds: string[];
}

export interface AnalysisProgress {
  step: string;
  progress: number;
  reasoning?: string;
  currentItem?: string;
  status: "running" | "completed" | "error";
  stepNumber?: number;
  totalSteps?: number;
}

// ============================================
// Witness Portrait Types
// ============================================

export interface WitnessPortraitParams {
  // Basic Info
  name?: string;
  description?: string;
  
  // Face Structure
  faceShape: "oval" | "round" | "square" | "heart" | "oblong" | "diamond";
  
  // Skin
  skinTone: "very_light" | "light" | "medium_light" | "medium" | "medium_dark" | "dark" | "very_dark";
  skinUndertone?: "warm" | "cool" | "neutral";
  
  // Eyes
  eyeShape: "almond" | "round" | "hooded" | "monolid" | "upturned" | "downturned";
  eyeColor: "brown" | "blue" | "green" | "hazel" | "gray" | "amber" | "black";
  eyeSize: "small" | "medium" | "large";
  eyeSpacing?: "close" | "average" | "wide";
  eyebrowShape?: "straight" | "arched" | "curved" | "flat" | "thick" | "thin";
  eyebrowColor?: string;
  
  // Nose
  noseShape: "straight" | "roman" | "button" | "upturned" | "wide" | "narrow" | "aquiline";
  noseSize?: "small" | "medium" | "large";
  
  // Lips/Mouth
  lipShape: "thin" | "full" | "heart" | "wide" | "bow" | "downturned";
  lipColor?: "natural" | "pink" | "red" | "brown";
  
  // Hair
  hairColor: "black" | "dark_brown" | "brown" | "light_brown" | "blonde" | "red" | "auburn" | "gray" | "white" | "bald";
  hairStyle: "short" | "medium" | "long" | "buzz" | "bald" | "receding";
  hairTexture: "straight" | "wavy" | "curly" | "coily";
  
  // Demographics
  ageRange: "18-25" | "26-35" | "36-45" | "46-55" | "56-65" | "65+";
  gender: "male" | "female";
  ethnicity?: "caucasian" | "african" | "asian" | "hispanic" | "middle_eastern" | "south_asian" | "mixed";
  
  // Facial Hair (for males)
  facialHair?: "none" | "stubble" | "short_beard" | "full_beard" | "mustache" | "goatee";
  facialHairColor?: string;
  
  // Distinguishing Features
  distinguishingFeatures?: {
    scars?: { location: string; type: string }[];
    moles?: { location: string }[];
    freckles?: boolean;
    glasses?: { type: "none" | "reading" | "sunglasses" | "round" | "rectangular" };
    tattoos?: { location: string; description: string }[];
    wrinkles?: "none" | "light" | "moderate" | "heavy";
    dimples?: boolean;
  };
  
  // Build/Expression
  faceWidth?: "narrow" | "average" | "wide";
  jawline?: "soft" | "defined" | "angular";
  cheekbones?: "flat" | "average" | "prominent";
  expression?: "neutral" | "slight_smile" | "serious";
}

export interface WitnessPortrait {
  id: string;
  caseId: string;
  params: WitnessPortraitParams;
  storageUrl: string;
  createdAt: string;
  description: string;
}
