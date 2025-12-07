# Project: ForenSight AI

> Multimodal AI “detective” that ingests photos, videos, audio, and witness statements to reconstruct scenes, surface contradictions, and propose plausible scenarios – with 4K visual reconstructions powered by Nano Banana Pro and reasoning powered by Gemini 3.

---

## 1. Problem & Vision

### 1.1 Problem

Investigators, law enforcement, and analysts often face:

- Fragmented evidence: scattered across photos, videos, audio, text notes.
- Conflicting testimonies and incomplete stories.
- Low-quality or partial imagery (shadows, reflections, occlusions).
- Lack of tools that can **reason** across all modalities and show **visual reconstructions**.

### 1.2 Vision

ForenSight AI is a web application where an investigator can:

1. Create a **case** and upload:
   - Scene photos
   - Short videos
   - Audio clips (e.g., 911 calls, bodycam audio)
   - Witness statements / reports (text or PDF)
   - A free-form description of “the problem” or question

2. The system runs an **agentic multi-step Gemini 3 workflow** that:

   - Normalizes & summarizes each evidence item.
   - Extracts video frames every _X_ seconds.
   - Fuses all evidence into a **single world model**.
   - Builds a **timeline** of events (with confidence scores).
   - Detects **contradictions** between testimonies and physical evidence.
   - Highlights **missing or ambiguous evidence**.
   - Generates **multiple possible scenarios** (“most likely”, “alternatives”).
   - Performs **shadow/reflection reasoning** to infer off-camera activity when possible.

3. In parallel, it calls **Nano Banana Pro** to:

   - Generate **4K scene reconstructions** (“most likely state at t = X”).
   - Produce **multiple viewpoints** of the reconstructed scene.
   - Show **before/after** versions (e.g., room before vs after incident).
   - Optionally overlay annotations (arrows, labels) or paired “Scenario A / Scenario B” images.

4. The UI shows:

   - **Evidence panel**: all uploaded items with AI-generated summaries.
   - **Timeline visualization**: events ordered in time with confidence.
   - **Confidence / contradiction heatmap**.
   - **Scenario cards**: each scenario with descriptions and supporting evidence.
   - **4K reconstruction gallery**.
   - **Interactive chat**: ask questions like:
     - “Why do you think the chair was moved?”
     - “Which witness is least consistent with the video?”
     - “What evidence supports Scenario 2?”

The system **explains its reasoning** but does not act as a teacher; it is a **forensic reasoning assistant**.

> ⚠️ Legal note for demo: “ForenSight AI is for research and educational purposes only and must not be used as sole evidence in actual legal proceedings.”

---

## 2. Core Use Cases

1. **Scene Reconstruction (Crime / Incident Scene)**
   - Input: Room photos, short videos, audio, and witness narratives.
   - Output: Plausible reconstruction of how the scene looked and evolved over time.

2. **TruthLens (Testimony Consistency Analysis)**
   - Input: Multiple witness statements + physical evidence.
   - Output:
     - Contradiction report (who disagrees with what).
     - Statements that don’t match physical layout / video frames.
     - Suggestions of what else to ask.

3. **Evidence Fusion**
   - Input: Mixed bag of images, videos, audio, text, and investigator notes.
   - Output:
     - Unified “case graph” (events, entities, locations).
     - Fused timeline and scenario hypotheses.

4. **Shadow & Reflection Forensics**
   - Input: Images where shadows/reflections are prominent.
   - Output:
     - Inferences about off-camera objects or people.
     - Indications of direction of light, approximate position and pose of subjects.

---

## 3. Non-Goals

- Not a real legal/forensic product (for hackathon/demo only).
- No real-world identity recognition (no face recognition / matching to identities).
- No automatic “guilt” determination – only **scene and scenario reasoning**.
- No storage of sensitive real cases (demo with synthetic or publicly available-style stuff).

---

## 4. Tech Stack

### 4.1 Frontend

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Pages / main views**:
  - `/` – Case list / create case
  - `/cases/[id]` – Main case dashboard:
    - Evidence upload & list
    - Timeline & heatmap
    - Scenario cards & reconstructions
    - Chat panel

### 4.2 Backend

- **Runtime**: Node.js + TypeScript
- **Framework**: Express (or Fastify)
- **Services**:
  - `evidenceService` – handle uploads, metadata, ASR, frame extraction
  - `analysisOrchestrator` – multi-step Gemini 3 agent workflow
  - `geminiClient` – wrapper around Gemini 3 models (text + multimodal)
  - `nanoBananaService` – calls Nano Banana Pro for 4K generation
  - `reportService` – assembles final forensic report + artifacts
  - `chatService` – case-aware Q&A over the analysis

### 4.3 External APIs / Models

- **Gemini 3** (via Google AI Studio / SDK)
  - Text + multimodal reasoning model
  - Use for:
    - Evidence summarization
    - Timeline building
    - Scenario generation
    - Contradiction detection
    - Shadow/reflection reasoning
    - Clarification questions

- **Nano Banana Pro**
  - High-resolution (2K–4K) image generation & editing
  - Use for:
    - Scene reconstructions (most likely configuration)
    - Alternate scenario renderings
    - Before/after comparisons
    - Annotated scene diagrams

- **Speech-to-text** (optionally Gemini / other ASR)
  - Transcribe audio evidence into text.

- **Storage** (for hackathon: simple)
  - In-memory or lightweight DB (e.g., SQLite / Supabase / Mongo) just to store:
    - Cases
    - Evidence metadata
    - Generated analysis artifacts
    - Nano Banana image URLs

---

## 5. Data Model (Conceptual)

> Types can be mirrored in `frontend/lib/types.ts` and `backend/src/models/schemas.ts`.

```ts
type EvidenceType = "image" | "video" | "audio" | "text" | "document";

type EvidenceItem = {
  id: string;
  caseId: string;
  type: EvidenceType;
  originalFilename: string;
  storageUrl: string;          // where the raw file lives
  uploadedAt: string;
  meta?: {
    timestampHint?: string;    // user-supplied or EXIF
    locationHint?: string;
    witnessId?: string;
  };
  derived?: {
    transcript?: string;       // for audio/video
    ocrText?: string;          // for images/docs
    frameIds?: string[];       // extracted frames from video
    summary?: string;          // Gemini single-evidence summary
    tags?: string[];           // objects, people, locations, actions
  };
};

type FrameEvidence = {
  id: string;
  parentEvidenceId: string;    // video evidence
  timeSeconds: number;
  storageUrl: string;          // frame image
  derived?: {
    summary?: string;
    tags?: string[];
    shadowReflectionNotes?: string;
  };
};

type TimelineEvent = {
  id: string;
  caseId: string;
  label: string;               // "Person enters room", "Object falls"
  description: string;
  startTime?: number;          // relative timeline
  endTime?: number;
  supportingEvidenceIds: string[];
  confidence: number;          // 0–1
};

type Contradiction = {
  id: string;
  caseId: string;
  description: string;
  involvedEvidenceIds: string[];
  involvedWitnesses: string[];
  severity: "low" | "medium" | "high";
};

type Scenario = {
  id: string;
  caseId: string;
  name: string;                // "Scenario A: Accidental fall"
  likelihood: number;          // 0–1
  narrative: string;
  supportingEvidenceIds: string[];
  conflictingEvidenceIds: string[];
  reconstructionImageIds: string[]; // Nano Banana images
};

type ReconstructionImage = {
  id: string;
  caseId: string;
  scenarioId?: string;
  viewpoint: string;           // "top-down", "from door", etc.
  type: "most_likely" | "alternative" | "before" | "after";
  storageUrl: string;
  description: string;
};

type CaseAnalysis = {
  caseId: string;
  status: "pending" | "running" | "completed" | "error";
  timeline: TimelineEvent[];
  contradictions: Contradiction[];
  scenarios: Scenario[];
  missingEvidenceSuggestions: string[];
  globalSummary: string;
  heatmap: {
    // For UI: time segments with confidence / contradiction density
    segments: {
      startTime: number;
      endTime: number;
      confidence: number;
      contradictionScore: number;
    }[];
  };
};
6. Agentic Workflow (Backend Orchestrator)
Endpoint: POST /cases/:id/analyze

Step 0 – Case Preparation
Collect all EvidenceItems for the case.

For each:

Audio → transcribe to text.

Video → extract frames every N seconds (configurable, e.g., 2–5s).

Images/docs → OCR as needed.

Store derived text and frame metadata.

Step 1 – Single-Evidence Understanding (Gemini 3)
For each evidence item (and key frames):

Call Gemini 3 to get:

A short summary of what it shows.

Objects, actions, and locations.

Time hints (“likely earlier/later relative to others”).

For frames with prominent shadows/reflections:

Basic shadow/reflection notes (light direction, possible off-camera subject).

Store these in EvidenceItem.derived and FrameEvidence.derived.

Step 2 – Evidence Fusion & World Model
Feed Gemini 3 a bundle:

All per-evidence summaries

Key frames (selected subset)

Witness statements

Problem statement (“what we are trying to determine”)

Ask it to:

Build a unified description of the environment:

Locations, objects, main actors, key time buckets.

Identify coarse-grained sequence of events.

Output: initial TimelineEvent[].

Step 3 – TruthLens: Contradiction & Consistency Analysis
Provide Gemini 3 with:

Witness statements (tagged per witness).

Timeline events & key visual evidence.

Ask it to:

Identify statements that are inconsistent with:

The timeline

Other testimonies

Visual/audio evidence

Grade contradictions by severity.

Suggest clarifying questions to ask the user.

Output: Contradiction[] + list of clarificationQuestions.

Step 4 – Shadow/Reflection Reasoning
Select frames that:

Contain strong shadows or reflections.

Prompt Gemini 3 specifically for:

Direction and approximate location of light sources.

Possible off-camera actors or objects.

How this affects the timeline or supports/refutes testimonies.

Incorporate these into:

TimelineEvent updates.

Additional notes on scenarios.

Step 5 – Scenario Generation (Multiple Possibilities)
Prompt Gemini 3 with the fused world model, contradictions, and shadow reasoning.

Ask it to produce:

2–3 plausible scenarios:

Each with narrative, likelihood, supporting & conflicting evidence.

Output: Scenario[].

Step 6 – Visual Reconstruction (Nano Banana Pro)
For each scenario (and sometimes for the “global” case):

Call Nano Banana Pro with:

Scenario narrative

Room/object description

Key positions & events

Generate:

4K reconstruction images (most likely scene at key time points).

Alternative viewpoints:

E.g., “from doorway”, “overhead”, “from camera position”

Before/after images when applicable.

Store as ReconstructionImage[] and link to Scenario + CaseAnalysis.

Step 7 – CaseAnalysis Assembly
Combine all artifacts into CaseAnalysis:

timeline

contradictions

scenarios

heatmap (time vs confidence/contradiction density)

missingEvidenceSuggestions

globalSummary

Mark status as "completed" and return to frontend.

7. Clarifying Questions & Chat
7.1 Clarifying Questions
When Gemini flags ambiguous or missing info, store:

ts
Copy code
type ClarificationQuestion = {
  id: string;
  caseId: string;
  text: string;
  relatedEvidenceIds: string[];
};
Frontend shows these to the user with buttons or inputs for answers.

Answers are fed back into the orchestrator to refine scenarios (optional v2).

7.2 Chatbot
Endpoint: POST /cases/:id/chat

Context for chat:

CaseAnalysis

All evidence summaries

User’s question

Persona:

Calm, neutral forensic reasoning assistant.

Explains “why” and “what evidence supports this”.

Can regenerate scenarios with updated assumptions.

8. Frontend UX
8.1 Pages
Case List / Create Case (/)

List existing cases with status badges (Pending, Running, Completed).

“New Case” button → name, description.

Case Dashboard (/cases/[id])

Layout idea:

Left: Evidence panel

Upload area (drag & drop)

List of evidence grouped by type

Icons for “has transcript/frames/summary”

Center: Analysis & visualizations

Timeline view (scrollable, with confidence overlay)

Heatmap strip (time vs contradiction/confidence)

Scenario cards (tabs for Scenario A/B/C)

4K reconstruction image gallery with full-screen view

Right: Chat & clarifications

ChatPanel for questions to the forensic AI

Clarification questions list (if any)

Top bar:

Case name

“Run Analysis” button

Status indicator + step-by-step progress (“Summarizing evidence → Building timeline → Generating scenarios → Rendering images”)

8.2 Visualization Details
Timeline: Each event card:

Label + description

Confidence bar

Chips for related evidence

Heatmap:

Horizontal bar segmented by time.

Color intensity for:

Confidence (green)

Contradictions (red)

Scenario cards:

Name, likelihood, short narrative.

List of supporting vs conflicting evidence.

Linked recon images.

9. APIs (High-Level)
POST /cases

GET /cases

GET /cases/:id

POST /cases/:id/evidence (multipart upload)

GET /cases/:id/evidence

POST /cases/:id/analyze

GET /cases/:id/analysis

GET /cases/:id/reconstructions

POST /cases/:id/chat

10. Hackathon Scope & Priorities
Must-have for MVP:

Multi-evidence upload (image, video, text; audio if possible).

Frame extraction from video every N seconds.

Single-run analysis orchestrator with:

Evidence summaries

Timeline

2–3 scenarios

Basic contradiction detection

At least 1–2 Nano Banana Pro 4K reconstructions for demo case.

Timeline + scenario cards in UI.

Chat that explains reasoning for current case.

Nice-to-have:

Shadow/reflection special reasoning path.

Clarification questions loop.

Heatmap visualization.

Alternate scenario visualizations (Scenario A vs Scenario B images).

11. Model Config (Conceptual)
Gemini 3:

System prompt: “You are a neutral forensic reasoning assistant. You combine visual, audio, and text evidence to propose plausible scenarios, timelines, and contradictions. You must never assign guilt; focus only on scene events.”

Use structured JSON schemas for:

Evidence summaries

Timeline events

Contradictions

Scenarios

Nano Banana Pro:

Prompts describe:

Room layout

Objects and positions

Viewpoint

Time (before/after)

Style: “photo-realistic forensic reconstruction, 4K, neutral lighting.”