"use client";

import { AnalysisProgress as AnalysisProgressType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface AnalysisProgressProps {
  progress: AnalysisProgressType | null;
}

export function AnalysisProgress({ progress }: AnalysisProgressProps) {
  if (!progress) return null;

  const getStatusIcon = () => {
    if (progress.status === "completed") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (progress.status === "error") {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
  };

  const getStatusColor = () => {
    if (progress.status === "completed") return "text-green-600";
    if (progress.status === "error") return "text-red-600";
    return "text-blue-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={getStatusColor()}>
            {progress.step}
            {progress.stepNumber && progress.totalSteps && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({progress.stepNumber}/{progress.totalSteps})
              </span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress.progress} className="h-2" />
        <div className="text-sm text-muted-foreground">
          {progress.progress}% complete
        </div>
        
        <AnimatePresence mode="wait">
          {progress.reasoning && (
            <motion.div
              key={progress.step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="p-3 bg-muted rounded-lg border-l-4 border-primary"
            >
              <div className="text-xs font-semibold text-primary mb-1">
                Reasoning:
              </div>
              <div className="text-sm text-foreground">
                {progress.reasoning}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {progress.currentItem && (
          <div className="text-xs text-muted-foreground">
            Processing: {progress.currentItem}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

