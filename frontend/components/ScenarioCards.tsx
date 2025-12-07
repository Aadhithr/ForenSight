"use client";

import { Scenario } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { motion } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Image as ImageIcon,
} from "lucide-react";

interface ScenarioCardsProps {
  scenarios: Scenario[];
}

export function ScenarioCards({ scenarios }: ScenarioCardsProps) {
  const sortedScenarios = [...scenarios].sort(
    (a, b) => b.likelihood - a.likelihood
  );

  if (scenarios.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-400 py-8">
            No scenarios generated yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const getLikelihoodColor = (likelihood: number) => {
    if (likelihood >= 0.7)
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (likelihood >= 0.3)
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    return "text-slate-400 bg-slate-500/10 border-slate-500/30";
  };

  const getLikelihoodLabel = (likelihood: number) => {
    if (likelihood >= 0.7) return "High Likelihood";
    if (likelihood >= 0.3) return "Possible";
    return "Low Likelihood";
  };

  const getBarColor = (likelihood: number) => {
    if (likelihood >= 0.7) return "bg-emerald-500";
    if (likelihood >= 0.3) return "bg-yellow-500";
    return "bg-slate-500";
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-100">Scenario Analysis</CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              AI-generated hypotheses ranked by likelihood and evidence support
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs.Root defaultValue={sortedScenarios[0]?.id} className="space-y-4">
          <Tabs.List className="flex gap-2 border-b border-slate-700">
            {sortedScenarios.map((scenario) => (
              <Tabs.Trigger
                key={scenario.id}
                value={scenario.id}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-blue-500 hover:text-slate-200 transition-colors text-slate-400",
                  "data-[state=active]:border-blue-500 data-[state=active]:text-blue-400"
                )}
              >
                {scenario.name}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {sortedScenarios.map((scenario) => (
            <Tabs.Content key={scenario.id} value={scenario.id}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-100">
                        {scenario.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full border text-xs ${getLikelihoodColor(scenario.likelihood)}`}
                      >
                        {getLikelihoodLabel(scenario.likelihood)} •{" "}
                        {Math.round(scenario.likelihood * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Likelihood Bar */}
                <div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${getBarColor(scenario.likelihood)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${scenario.likelihood * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Narrative */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-slate-300 whitespace-pre-wrap">
                    {scenario.narrative}
                  </p>
                </div>

                {/* Reasoning */}
                {scenario.reasoning && (
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-medium text-blue-400">
                        Why This Scenario?
                      </h4>
                    </div>
                    <p className="text-sm text-slate-300">{scenario.reasoning}</p>
                  </div>
                )}

                {/* Evidence Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Supporting Evidence */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-medium text-slate-200">
                        Supporting Evidence
                      </h4>
                      <span className="text-xs text-slate-500">
                        (
                        {scenario.supportingEvidence?.length ||
                          scenario.supportingEvidenceIds.length}
                        )
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {(
                        scenario.supportingEvidence ||
                        scenario.supportingEvidenceIds
                      ).map((evidence, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-slate-300"
                        >
                          <span className="text-emerald-400 mt-1">•</span>
                          <span>{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Conflicting Evidence */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <h4 className="text-sm font-medium text-slate-200">
                        Conflicting Evidence
                      </h4>
                      <span className="text-xs text-slate-500">
                        (
                        {scenario.conflictingEvidence?.length ||
                          scenario.conflictingEvidenceIds.length}
                        )
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {(
                        scenario.conflictingEvidence ||
                        scenario.conflictingEvidenceIds
                      ).map((evidence, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-slate-300"
                        >
                          <span className="text-red-400 mt-1">•</span>
                          <span>{evidence}</span>
                        </li>
                      ))}
                      {(
                        scenario.conflictingEvidence ||
                        scenario.conflictingEvidenceIds
                      ).length === 0 && (
                        <li className="text-sm text-slate-500 italic">
                          No conflicting evidence found
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Key Findings */}
                {scenario.keyFindings && scenario.keyFindings.length > 0 && (
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-medium text-slate-200">
                        Key Findings & Analysis
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {scenario.keyFindings.map((finding, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-slate-300"
                        >
                          <span className="text-blue-400 mt-1">▸</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reconstruction link */}
                {scenario.reconstructionImageIds &&
                  scenario.reconstructionImageIds.length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                      <button className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-between transition-colors group">
                        <div className="flex items-center gap-3">
                          <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                          <span className="text-slate-300 group-hover:text-slate-100 transition-colors">
                            View {scenario.reconstructionImageIds.length} 4K
                            Reconstruction
                            {scenario.reconstructionImageIds.length !== 1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                        <span className="text-slate-500 group-hover:text-slate-400 transition-colors">
                          →
                        </span>
                      </button>
                    </div>
                  )}
              </motion.div>
            </Tabs.Content>
          ))}
        </Tabs.Root>

        {/* Analysis Notes */}
        <div className="mt-6 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Analysis Notes
          </h4>
          <p className="text-sm text-slate-300">
            Scenario rankings are based on evidence correlation, physical
            feasibility, temporal consistency, and witness reliability scores.
            All scenarios remain under investigation until additional evidence
            confirms or eliminates possibilities.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
