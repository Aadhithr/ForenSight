"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { EvidenceItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Upload, File, Video, Image, Music, FileText, X } from "lucide-react";
import { apiClient } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface EvidencePanelProps {
  caseId: string;
  evidence: EvidenceItem[];
  onEvidenceUploaded: () => void;
}

const getEvidenceIcon = (type: EvidenceItem["type"]) => {
  switch (type) {
    case "image":
      return <Image className="h-4 w-4" />;
    case "video":
      return <Video className="h-4 w-4" />;
    case "audio":
      return <Music className="h-4 w-4" />;
    case "text":
    case "document":
      return <FileText className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

export function EvidencePanel({
  caseId,
  evidence,
  onEvidenceUploaded,
}: EvidencePanelProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          await apiClient.uploadEvidence(caseId, file);
        }
        onEvidenceUploaded();
      } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to upload evidence");
      } finally {
        setUploading(false);
      }
    },
    [caseId, onEvidenceUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Evidence</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? "Drop files here"
              : "Drag & drop evidence files, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Images, videos, audio, text files
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          <AnimatePresence>
            {evidence.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="text-muted-foreground">
                  {getEvidenceIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.originalFilename}
                  </div>
                  {item.derived?.summary && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {item.derived.summary}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

