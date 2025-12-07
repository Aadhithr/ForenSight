"use client";

import { Contradiction } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ContradictionsProps {
  contradictions: Contradiction[];
}

export function Contradictions({ contradictions }: ContradictionsProps) {
  if (!contradictions || contradictions.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              Contradictions Analysis
            </h2>
          </div>
          <div className="text-center py-8">
            <div className="text-emerald-400 text-4xl mb-2">✓</div>
            <p className="text-slate-300">No contradictions detected</p>
            <p className="text-sm text-slate-500 mt-1">
              All evidence appears consistent
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30";
      case "medium":
        return "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30";
      case "low":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/30";
      default:
        return "bg-slate-50 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/30";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 dark:text-red-400";
      case "medium":
        return "text-amber-600 dark:text-amber-400";
      case "low":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold text-slate-100">
            Contradictions Analysis
          </h2>
          <span className="ml-auto px-2 py-1 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
            {contradictions.length} found
          </span>
        </div>

        <div className="space-y-4">
          {contradictions.map((contradiction, idx) => (
            <div
              key={contradiction.id || idx}
              className={`p-4 rounded-lg border ${getSeverityColor(contradiction.severity)}`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getSeverityIcon(contradiction.severity)}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      Contradiction #{idx + 1}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-xs rounded capitalize ${
                        contradiction.severity === "high"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                          : contradiction.severity === "medium"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                      }`}
                    >
                      {contradiction.severity} severity
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-3">
                    {contradiction.description}
                  </p>

                  {contradiction.involvedWitnesses &&
                    contradiction.involvedWitnesses.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Involved witnesses:{" "}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {contradiction.involvedWitnesses.join(", ")}
                        </span>
                      </div>
                    )}

                  {contradiction.involvedEvidenceIds &&
                    contradiction.involvedEvidenceIds.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {contradiction.involvedEvidenceIds.map((id, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Analysis Notes
          </h4>
          <p className="text-sm text-slate-300">
            Contradictions may indicate witness misremembering, different
            perspectives, or deliberate deception. Further investigation is
            recommended for high-severity contradictions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

