"use client";

import { useMemo } from "react";
import { CaseAnalysis } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface HeatmapProps {
  analysis: CaseAnalysis;
}

export function Heatmap({ analysis }: HeatmapProps) {
  const data = useMemo(() => {
    if (!analysis?.heatmap?.segments) return [];

    return analysis.heatmap.segments.map((segment, idx) => ({
      time: `T+${Math.round(segment.startTime)}s`,
      confidence: Math.round(segment.confidence * 100),
      contradictions: Math.round(segment.contradictionScore * 10),
    }));
  }, [analysis]);

  const getBarColor = (confidence: number, contradictions: number) => {
    if (contradictions > 2) return "bg-red-500";
    if (contradictions > 0) return "bg-orange-500";
    if (confidence >= 85) return "bg-emerald-500";
    if (confidence >= 70) return "bg-yellow-500";
    return "bg-orange-500";
  };

  // Stats
  const stats = useMemo(() => {
    const highQuality = data.filter(
      (d) => d.confidence >= 85 && d.contradictions === 0
    ).length;
    const mediumQuality = data.filter(
      (d) => d.confidence < 85 && d.confidence >= 70
    ).length;
    const lowQuality = data.filter((d) => d.confidence < 70).length;
    const totalContradictions = data.reduce(
      (sum, d) => sum + d.contradictions,
      0
    );
    const avgConfidence = data.length > 0 
      ? Math.round(data.reduce((sum, d) => sum + d.confidence, 0) / data.length)
      : 0;

    return { highQuality, mediumQuality, lowQuality, totalContradictions, avgConfidence };
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 mb-1">
              Confidence & Contradiction Heatmap
            </h2>
            <p className="text-sm text-slate-400">
              Timeline analysis of evidence quality and conflicts
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-400">High Confidence</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-slate-400">Contradictions</span>
            </div>
          </div>
        </div>

        {/* Simple bar chart visualization */}
        <div className="space-y-3 mb-6">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-12 text-right font-mono">
                {item.time}
              </span>
              <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${getBarColor(item.confidence, item.contradictions)} transition-all`}
                  style={{ width: `${item.confidence}%` }}
                />
                <span className="absolute inset-y-0 right-2 flex items-center text-xs text-slate-300 font-mono">
                  {item.confidence}%
                </span>
              </div>
              {item.contradictions > 0 && (
                <span className="text-xs text-red-400 w-8">
                  ⚠️ {item.contradictions}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Contradiction Indicators */}
        <div className="flex gap-1 mb-4">
          {data.map((segment, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-full ${
                segment.contradictions > 0
                  ? "bg-red-500 animate-pulse"
                  : "bg-slate-700"
              }`}
              style={{
                opacity: segment.contradictions > 0
                  ? Math.min(segment.contradictions * 0.3 + 0.4, 1)
                  : 0.5,
              }}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 pt-4 border-t border-slate-800">
          <div className="text-center">
            <div className="text-lg font-semibold text-emerald-400 mb-1">
              {stats.highQuality}
            </div>
            <div className="text-xs text-slate-500">High Quality</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-400 mb-1">
              {stats.mediumQuality}
            </div>
            <div className="text-xs text-slate-500">Medium</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-400 mb-1">
              {stats.lowQuality}
            </div>
            <div className="text-xs text-slate-500">Low Quality</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-400 mb-1">
              {stats.totalContradictions}
            </div>
            <div className="text-xs text-slate-500">Contradictions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-400 mb-1">
              {stats.avgConfidence}%
            </div>
            <div className="text-xs text-slate-500">Avg Confidence</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
