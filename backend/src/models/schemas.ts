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
