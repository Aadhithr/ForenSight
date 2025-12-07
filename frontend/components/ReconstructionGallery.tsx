"use client";

import { useState } from "react";
import { ReconstructionImage } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { X, Maximize2, Eye, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReconstructionGalleryProps {
  reconstructions: ReconstructionImage[];
}

export function ReconstructionGallery({
  reconstructions,
}: ReconstructionGalleryProps) {
  const [selectedImage, setSelectedImage] =
    useState<ReconstructionImage | null>(null);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "most_likely":
        return "Primary Reconstruction";
      case "alternative":
        return "Alternative Scenario";
      case "before":
        return "Before State";
      case "after":
        return "After State";
      default:
        return type;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "most_likely":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "alternative":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "before":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
      case "after":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  if (!reconstructions || reconstructions.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              4K Scene Reconstructions
            </h2>
          </div>
          <div className="text-center py-12 text-slate-400">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No reconstructions generated yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Run analysis to generate 4K scene reconstructions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                4K Scene Reconstructions
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                AI-generated photorealistic reconstructions powered by Nano
                Banana Pro
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Eye className="w-4 h-4" />
              <span>{reconstructions.length} reconstructions</span>
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reconstructions.map((recon) => (
              <motion.div
                key={recon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all"
              >
                {/* Image */}
                <div className="relative aspect-video bg-slate-800 overflow-hidden">
                  <img
                    src={
                      recon.storageUrl.startsWith("http")
                        ? recon.storageUrl
                        : `http://localhost:3001${recon.storageUrl}`
                    }
                    alt={recon.description || "Scene reconstruction"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback to placeholder on error
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=675&fit=crop&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setSelectedImage(recon)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Maximize2 className="w-4 h-4" />
                      View Full Resolution
                    </button>
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-3 py-1 rounded-full border text-xs backdrop-blur-sm ${getTypeBadge(recon.type)}`}
                    >
                      {getTypeLabel(recon.type)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-slate-100 font-medium">
                      {recon.viewpoint}
                    </h3>
                  </div>

                  <p className="text-sm text-slate-400 line-clamp-2">
                    {recon.description}
                  </p>

                  <div className="flex items-center gap-2 text-slate-500 mt-3">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs">{recon.viewpoint}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Technical Info */}
          <div className="mt-6 p-6 bg-slate-800/30 border border-slate-700 rounded-xl">
            <h3 className="text-slate-100 font-medium mb-4">
              Reconstruction Methodology
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">
                  Image Generation
                </h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Nano Banana Pro 4K synthesis engine</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Physical evidence-guided generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Shadow & lighting consistency validation</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">
                  Data Sources
                </h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Security camera frames & angles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Scene photographs & measurements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Gemini 3 spatial reasoning model</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-6xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={
                  selectedImage.storageUrl.startsWith("http")
                    ? selectedImage.storageUrl
                    : `http://localhost:3001${selectedImage.storageUrl}`
                }
                alt={selectedImage.description || "Scene reconstruction"}
                className="w-full rounded-xl shadow-2xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=2400&h=1350&fit=crop&q=90";
                }}
              />
              <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100 mb-2">
                      {selectedImage.viewpoint}
                    </h3>
                    <p className="text-slate-400">{selectedImage.description}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full border text-xs whitespace-nowrap ${getTypeBadge(selectedImage.type)}`}
                  >
                    {getTypeLabel(selectedImage.type)}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-slate-400 text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{selectedImage.viewpoint}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

