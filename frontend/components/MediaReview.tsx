"use client";

import { useState } from "react";
import { EvidenceItem } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Image,
  Video,
  Mic,
  FileText,
  CheckCircle,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MediaReviewProps {
  evidence: EvidenceItem[];
  summaries?: Array<{
    evidenceId: string;
    summary: string;
    tags: string[];
    processed: boolean;
  }>;
}

export function MediaReview({ evidence, summaries }: MediaReviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<EvidenceItem | null>(null);

  const getFileType = (type: string): "image" | "video" | "audio" | "text" => {
    if (type === "image") return "image";
    if (type === "video") return "video";
    if (type === "audio") return "audio";
    return "text";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-5 h-5" />;
      case "video":
        return <Video className="w-5 h-5" />;
      case "audio":
        return <Mic className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "image":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "video":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "audio":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      default:
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
    }
  };

  const getSummary = (evidenceId: string) => {
    const summaryItem = summaries?.find((s) => s.evidenceId === evidenceId);
    return summaryItem;
  };

  const processedCount = evidence.filter(
    (e) => e.derived?.summary || getSummary(e.id)?.processed
  ).length;

  return (
    <>
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                Media Review
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                All evidence items with AI-generated summaries
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <span>{evidence.length} items</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>{processedCount} processed</span>
              </div>
            </div>
          </div>

          {/* Evidence List */}
          <div className="space-y-3">
            {evidence.map((item) => {
              const summary = getSummary(item.id);
              const itemSummary =
                item.derived?.summary || summary?.summary || null;
              const itemTags = item.derived?.tags || summary?.tags || [];
              const isExpanded = expandedId === item.id;
              const isProcessed = !!itemSummary;

              return (
                <motion.div
                  key={item.id}
                  layout
                  className={`bg-slate-800/50 border rounded-lg transition-colors ${
                    isExpanded ? "border-blue-500/50" : "border-slate-700"
                  }`}
                >
                  {/* Header */}
                  <div
                    className="p-4 cursor-pointer flex items-start gap-4"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : item.id)
                    }
                  >
                    <div
                      className={`p-3 rounded-lg border ${getTypeColor(item.type)}`}
                    >
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-slate-100 font-medium truncate">
                          {item.originalFilename}
                        </h3>
                        {isProcessed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                      </div>

                      {itemSummary && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {itemSummary}
                        </p>
                      )}

                      {itemTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {itemTags.slice(0, 5).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-400 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {itemTags.length > 5 && (
                            <span className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-500 rounded">
                              +{itemTags.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-600 mt-2">
                        Uploaded{" "}
                        {new Date(item.uploadedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 border-t border-slate-700">
                          <div className="pt-4 space-y-4">
                            {/* Media Preview */}
                            {(item.type === "image" ||
                              item.type === "video") && (
                              <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden">
                                {item.type === "image" ? (
                                  <img
                                    src={`http://localhost:3001${item.storageUrl}`}
                                    alt={item.originalFilename}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://via.placeholder.com/800x450?text=Image+Not+Available";
                                    }}
                                  />
                                ) : (
                                  <video
                                    src={`http://localhost:3001${item.storageUrl}`}
                                    controls
                                    className="w-full h-full"
                                  />
                                )}
                              </div>
                            )}

                            {item.type === "audio" && (
                              <audio
                                src={`http://localhost:3001${item.storageUrl}`}
                                controls
                                className="w-full"
                              />
                            )}

                            {/* Full Summary */}
                            {itemSummary && (
                              <div className="p-4 bg-slate-900/50 rounded-lg">
                                <h4 className="text-sm font-medium text-slate-300 mb-2">
                                  AI Summary
                                </h4>
                                <p className="text-sm text-slate-400 whitespace-pre-wrap">
                                  {itemSummary}
                                </p>
                              </div>
                            )}

                            {/* Transcript for audio */}
                            {item.type === "audio" &&
                              item.derived?.transcript && (
                                <div className="p-4 bg-slate-900/50 rounded-lg">
                                  <h4 className="text-sm font-medium text-slate-300 mb-2">
                                    Transcript
                                  </h4>
                                  <p className="text-sm text-slate-400 whitespace-pre-wrap">
                                    {item.derived.transcript}
                                  </p>
                                </div>
                              )}

                            {/* All Tags */}
                            {itemTags.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-300 mb-2">
                                  Tags
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {itemTags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">Type:</span>
                                <span className="text-slate-300 ml-2 capitalize">
                                  {item.type}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">
                                  Evidence ID:
                                </span>
                                <span className="text-slate-300 ml-2 font-mono text-xs">
                                  {item.id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {evidence.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No evidence uploaded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

