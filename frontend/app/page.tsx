"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Case } from "@/lib/types";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  X,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";

export default function HomePage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await apiClient.getCases();
      setCases(data);
    } catch (error) {
      console.error("Failed to load cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: creating,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const createCase = async () => {
    if (!caseName.trim()) {
      alert("Please enter a case name");
      return;
    }

    setCreating(true);
    try {
      const newCase = await apiClient.createCase(
        caseName.trim(),
        caseDescription.trim() || undefined
      );

      // Upload files if any were selected
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file) => {
          try {
            await apiClient.uploadEvidence(newCase.id, file);
            console.log("Uploaded:", file.name);
          } catch (error) {
            console.error("Failed to upload file:", file.name, error);
            throw error;
          }
        });

        await Promise.all(uploadPromises);
      }

      // Reset form
      setCaseName("");
      setCaseDescription("");
      setSelectedFiles([]);
      setShowCreateForm(false);

      // Navigate to the new case
      router.push(`/cases/${newCase.id}`);
    } catch (error) {
      console.error("Failed to create case:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create case or upload files";
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: Case["status"]) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
      case "running":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/30";
      case "error":
        return "bg-red-500/10 text-red-400 border border-red-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border border-slate-500/30";
    }
  };

  const getStatusIcon = (status: Case["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-3 h-3" />;
      case "running":
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case "error":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
              <Sparkles className="w-10 h-10 text-blue-400" />
              ForenSight AI
            </h1>
            <p className="text-slate-400 mt-2">
              Multimodal forensic analysis platform powered by Gemini 3
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </div>

        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Create New Case
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-slate-300">
                      Case Name *
                    </label>
                    <input
                      type="text"
                      value={caseName}
                      onChange={(e) => setCaseName(e.target.value)}
                      placeholder="Enter case name"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 placeholder-slate-500"
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-slate-300">
                      Description (optional)
                    </label>
                    <textarea
                      value={caseDescription}
                      onChange={(e) => setCaseDescription(e.target.value)}
                      placeholder="Enter case description"
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 placeholder-slate-500 resize-none"
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-slate-300">
                      Upload Evidence (optional)
                    </label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                        isDragActive
                          ? "border-blue-500 bg-blue-500/5"
                          : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                      } ${creating ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <input {...getInputProps()} />
                      <p className="text-sm text-slate-400">
                        {isDragActive
                          ? "Drop files here"
                          : "Drag & drop evidence files, or click to select"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Images, videos, audio, text files
                      </p>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-slate-800 rounded-lg border border-slate-700"
                          >
                            <span className="text-sm text-slate-300 truncate flex-1">
                              {file.name}
                            </span>
                            <button
                              onClick={() => removeFile(index)}
                              className="ml-2 text-slate-500 hover:text-red-400 transition-colors"
                              disabled={creating}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setCaseName("");
                        setCaseDescription("");
                        setSelectedFiles([]);
                      }}
                      disabled={creating}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createCase}
                      disabled={creating || !caseName.trim()}
                      className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Case
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {cases.length === 0 && !showCreateForm ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-16 text-center">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 mb-4">
                No cases yet. Create your first case to get started.
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          cases.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cases.map((case_, index) => (
                <motion.div
                  key={case_.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-slate-700 hover:bg-slate-900/80 transition-all group"
                    onClick={() => router.push(`/cases/${case_.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-slate-100 group-hover:text-blue-400 transition-colors">
                          {case_.name}
                        </CardTitle>
                        <span
                          className={`text-xs px-2 py-1 rounded-full flex items-center gap-1.5 ${getStatusColor(
                            case_.status
                          )}`}
                        >
                          {getStatusIcon(case_.status)}
                          {case_.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {case_.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {case_.description}
                        </p>
                      )}
                      <div className="mt-4 text-xs text-slate-600">
                        Created:{" "}
                        {new Date(case_.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-slate-600 text-sm">
          <p>Powered by Gemini 3 Pro & Nano Banana Pro</p>
        </div>
      </div>
    </div>
  );
}
