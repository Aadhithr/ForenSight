"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Case, EvidenceItem, CaseAnalysis, AnalysisProgress, WitnessPortrait, WitnessPortraitParams } from "@/lib/types";
import { apiClient } from "@/lib/api";
import { EvidencePanel } from "@/components/EvidencePanel";
import { TimelineView } from "@/components/TimelineView";
import { ScenarioCards } from "@/components/ScenarioCards";
import { ChatPanel } from "@/components/ChatPanel";
import { AnalysisProgress as AnalysisProgressComponent } from "@/components/AnalysisProgress";
import { Heatmap } from "@/components/Heatmap";
import { Contradictions } from "@/components/Contradictions";
import { ReconstructionGallery } from "@/components/ReconstructionGallery";
import { MediaReview } from "@/components/MediaReview";
import { WitnessPortraitGenerator } from "@/components/WitnessPortraitGenerator";
import { EvidenceGraph } from "@/components/EvidenceGraph";
import { Button } from "@/components/ui/button";
import {
  Play,
  Loader2,
  ArrowLeft,
  CheckCircle,
  FileText,
  Clock,
  Image as ImageIcon,
  BarChart3,
  Eye,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

type TabId = "timeline" | "scenarios" | "reconstructions" | "media" | "portraits";

export default function CaseDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [case_, setCase] = useState<Case | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [analysis, setAnalysis] = useState<CaseAnalysis | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("timeline");
  const [portraits, setPortraits] = useState<WitnessPortrait[]>([]);

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    try {
      const [caseData, evidenceData, portraitsData] = await Promise.all([
        apiClient.getCase(caseId),
        apiClient.getEvidence(caseId),
        apiClient.getWitnessPortraits(caseId).catch(() => []),
      ]);
      setCase(caseData);
      setEvidence(evidenceData);
      setPortraits(portraitsData);

      // Try to load analysis if it exists
      try {
        const analysisData = await apiClient.getAnalysis(caseId);
        setAnalysis(analysisData);
      } catch {
        // Analysis not ready yet
      }
    } catch (error) {
      console.error("Failed to load case data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePortrait = async (params: WitnessPortraitParams) => {
    const newPortrait = await apiClient.generateWitnessPortrait(caseId, params);
    setPortraits((prev) => [newPortrait, ...prev]);
  };

  const handleDeletePortrait = async (id: string) => {
    await apiClient.deleteWitnessPortrait(caseId, id);
    setPortraits((prev) => prev.filter((p) => p.id !== id));
  };

  const startAnalysis = async () => {
    if (evidence.length === 0) {
      alert("Please upload evidence before running analysis");
      return;
    }

    setAnalyzing(true);
    setProgress(null);

    try {
      await apiClient.startAnalysis(caseId);

      // Subscribe to progress updates
      const unsubscribe = apiClient.subscribeToAnalysisProgress(
        caseId,
        (progressUpdate) => {
          setProgress(progressUpdate);
        },
        async () => {
          // Analysis complete, wait a bit then reload analysis data
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Reload case data first to get updated status
          try {
            const updatedCase = await apiClient.getCase(caseId);
            setCase(updatedCase);
          } catch (error) {
            console.error("Failed to reload case:", error);
          }

          // Try multiple times in case the analysis is still being written
          let retries = 5;
          while (retries > 0) {
            try {
              const analysisData = await apiClient.getAnalysis(caseId);
              console.log("Analysis loaded successfully:", {
                timeline: analysisData.timeline?.length || 0,
                scenarios: analysisData.scenarios?.length || 0,
                contradictions: analysisData.contradictions?.length || 0,
              });
              setAnalysis(analysisData);
              break;
            } catch (error) {
              console.error(
                `Failed to load analysis (${retries} retries left):`,
                error
              );
              retries--;
              if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
              } else {
                console.error("Failed to load analysis after all retries:", error);
                const errorMsg =
                  error instanceof Error ? error.message : String(error);
                alert(
                  `Analysis completed but could not load results: ${errorMsg}\n\nPlease try refreshing the page.`
                );
              }
            }
          }
          setAnalyzing(false);
          setProgress(null);
        },
        (error) => {
          console.error("Analysis error:", error);
          setAnalyzing(false);
          setProgress(null);
        }
      );

      // Cleanup on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to start analysis:", error);
      alert("Failed to start analysis");
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!case_) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Case not found</div>
      </div>
    );
  }

  const tabs = [
    { id: "timeline" as const, label: "Timeline & Analysis", icon: BarChart3 },
    { id: "scenarios" as const, label: "Scenarios", icon: FileText },
    { id: "reconstructions" as const, label: "4K Reconstructions", icon: ImageIcon },
    { id: "portraits" as const, label: "Witness Portraits", icon: User },
    { id: "media" as const, label: "Media Review", icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">
                  {case_.name}
                </h1>
                {case_.description && (
                  <p className="text-sm text-slate-400 mt-0.5">
                    {case_.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {analysis && case_?.status === "completed" && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Analysis Complete</span>
                </div>
              )}
              {analyzing && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    {progress?.step || "Analyzing..."}
                  </span>
                </div>
              )}
              {!analyzing && (
                <Button
                  onClick={startAnalysis}
                  disabled={evidence.length === 0}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run Analysis
                </Button>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          <AnimatePresence>
            {(analyzing || progress) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <AnalysisProgressComponent progress={progress} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Evidence Panel */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/50 overflow-y-auto">
          <EvidencePanel
            caseId={caseId}
            evidence={evidence}
            onEvidenceUploaded={loadData}
          />
        </div>

        {/* Center: Analysis Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <Tabs.Root
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabId)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="border-b border-slate-800 px-6 flex-shrink-0">
              <Tabs.List className="flex gap-1">
                {tabs.map((tab) => (
                  <Tabs.Trigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "px-6 py-3 border-b-2 transition-colors flex items-center gap-2 text-sm font-medium",
                      "data-[state=active]:border-blue-500 data-[state=active]:text-blue-400",
                      "data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-300"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <Tabs.Content value="timeline" className="space-y-6">
                {analysis ? (
                  <>
                    <Heatmap analysis={analysis} />
                    {analysis.timeline && analysis.timeline.length > 0 && (
                      <TimelineView events={analysis.timeline} />
                    )}
                    {analysis.contradictions && (
                      <Contradictions
                        contradictions={analysis.contradictions}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                    <p className="text-slate-400">
                      {evidence.length === 0
                        ? "Upload evidence to get started"
                        : "Click 'Run Analysis' to analyze the case"}
                    </p>
                  </div>
                )}
                
                {/* Evidence Relationship Graph - at the bottom */}
                {evidence.length > 0 && (
                  <EvidenceGraph 
                    evidence={evidence}
                    timeline={analysis?.timeline}
                    contradictions={analysis?.contradictions}
                  />
                )}
              </Tabs.Content>

              <Tabs.Content value="scenarios" className="space-y-6">
                {analysis?.scenarios && analysis.scenarios.length > 0 ? (
                  <ScenarioCards scenarios={analysis.scenarios} />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                    <p className="text-slate-400">
                      {evidence.length === 0
                        ? "Upload evidence to get started"
                        : "Run analysis to generate scenarios"}
                    </p>
                  </div>
                )}
              </Tabs.Content>

              <Tabs.Content value="reconstructions" className="space-y-6">
                <ReconstructionGallery
                  reconstructions={analysis?.reconstructions || []}
                />
              </Tabs.Content>

              <Tabs.Content value="portraits" className="space-y-6">
                <WitnessPortraitGenerator
                  caseId={caseId}
                  portraits={portraits}
                  onGenerate={handleGeneratePortrait}
                  onDelete={handleDeletePortrait}
                />
              </Tabs.Content>

              <Tabs.Content value="media" className="space-y-6">
                <MediaReview
                  evidence={evidence}
                  summaries={analysis?.evidenceSummaries}
                />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>

        {/* Right: Chat Panel */}
        <div className="w-96 border-l border-slate-800 bg-slate-900/50">
          <ChatPanel caseId={caseId} />
        </div>
      </div>
    </div>
  );
}
