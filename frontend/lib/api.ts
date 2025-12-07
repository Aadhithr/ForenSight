import { Case, EvidenceItem, CaseAnalysis, AnalysisProgress } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  // Cases
  async createCase(name: string, description?: string): Promise<Case> {
    const res = await fetch(`${this.baseUrl}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error("Failed to create case");
    return res.json();
  }

  async getCases(): Promise<Case[]> {
    const res = await fetch(`${this.baseUrl}/cases`);
    if (!res.ok) throw new Error("Failed to fetch cases");
    return res.json();
  }

  async getCase(id: string): Promise<Case> {
    const res = await fetch(`${this.baseUrl}/cases/${id}`);
    if (!res.ok) throw new Error("Failed to fetch case");
    return res.json();
  }

  // Evidence
  async uploadEvidence(caseId: string, file: File): Promise<EvidenceItem> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${this.baseUrl}/cases/${caseId}/evidence`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Failed to upload evidence: ${res.statusText}`);
    }
    return res.json();
  }

  async getEvidence(caseId: string): Promise<EvidenceItem[]> {
    const res = await fetch(`${this.baseUrl}/cases/${caseId}/evidence`);
    if (!res.ok) throw new Error("Failed to fetch evidence");
    return res.json();
  }

  // Analysis
  async startAnalysis(caseId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/cases/${caseId}/analyze`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to start analysis");
  }

  async getAnalysis(caseId: string): Promise<CaseAnalysis> {
    const res = await fetch(`${this.baseUrl}/cases/${caseId}/analysis`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Failed to fetch analysis: ${res.statusText}`);
    }
    return res.json();
  }

  // SSE stream for analysis progress
  subscribeToAnalysisProgress(
    caseId: string,
    onProgress: (progress: AnalysisProgress) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(
      `${this.baseUrl}/cases/${caseId}/analyze/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Ignore heartbeat and connection messages
        if (data.type === "heartbeat" || data.type === "connected") {
          return;
        }
        
        if (data.type === "complete") {
          onComplete();
          eventSource.close();
        } else if (data.type === "error") {
          onError(new Error(data.error || "Analysis error"));
          eventSource.close();
        } else {
          // Regular progress update
          onProgress(data as AnalysisProgress);
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
        console.error("Raw event data:", event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
      // Don't immediately close on error - might be transient
      // Only close if the readyState indicates the connection is closed
      if (eventSource.readyState === EventSource.CLOSED) {
        onError(new Error("SSE connection closed"));
        eventSource.close();
      }
    };

    return () => eventSource.close();
  }

  // Chat
  async chat(caseId: string, question: string): Promise<{ answer: string; reasoning: string }> {
    const res = await fetch(`${this.baseUrl}/cases/${caseId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error("Failed to send chat message");
    return res.json();
  }
}

export const apiClient = new ApiClient();

