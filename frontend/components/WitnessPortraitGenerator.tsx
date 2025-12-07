"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Loader2, Download, Trash2, Plus, X, Maximize2 } from "lucide-react";
import { WitnessPortrait, WitnessPortraitParams } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface WitnessPortraitGeneratorProps {
  caseId: string;
  portraits: WitnessPortrait[];
  onGenerate: (params: WitnessPortraitParams) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const defaultParams: WitnessPortraitParams = {
  faceShape: "oval",
  skinTone: "medium",
  eyeShape: "almond",
  eyeColor: "brown",
  eyeSize: "medium",
  eyeSpacing: "average",
  eyebrowShape: "arched",
  noseShape: "straight",
  noseSize: "medium",
  lipShape: "full",
  hairColor: "brown",
  hairStyle: "short",
  hairTexture: "straight",
  ageRange: "26-35",
  gender: "male",
  expression: "neutral",
};

export function WitnessPortraitGenerator({
  caseId,
  portraits,
  onGenerate,
  onDelete,
}: WitnessPortraitGeneratorProps) {
  const [params, setParams] = useState<WitnessPortraitParams>(defaultParams);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPortrait, setSelectedPortrait] = useState<WitnessPortrait | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await onGenerate(params);
      setShowForm(false);
      setParams(defaultParams);
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to generate portrait");
    } finally {
      setIsGenerating(false);
    }
  };

  const SelectField = ({ 
    label, 
    value, 
    options, 
    onChange 
  }: { 
    label: string; 
    value: string; 
    options: { value: string; label: string }[]; 
    onChange: (val: string) => void;
  }) => (
    <div className="space-y-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                Witness Portrait Generator
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Generate photorealistic portraits from witness descriptions
              </p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-purple-600 hover:bg-purple-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Portrait
            </Button>
          </div>

          {/* Generation Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-6 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
              >
                {error && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <h3 className="text-slate-100 font-medium mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  Configure Facial Features
                </h3>
                
                {/* Demographics */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider text-purple-400 mb-3">Demographics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SelectField
                      label="Gender"
                      value={params.gender}
                      options={[
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                      ]}
                      onChange={(v) => setParams({ ...params, gender: v as any })}
                    />
                    <SelectField
                      label="Age Range"
                      value={params.ageRange}
                      options={[
                        { value: "18-25", label: "18-25 years" },
                        { value: "26-35", label: "26-35 years" },
                        { value: "36-45", label: "36-45 years" },
                        { value: "46-55", label: "46-55 years" },
                        { value: "56-65", label: "56-65 years" },
                        { value: "65+", label: "65+ years" },
                      ]}
                      onChange={(v) => setParams({ ...params, ageRange: v as any })}
                    />
                    <SelectField
                      label="Ethnicity"
                      value={params.ethnicity || ""}
                      options={[
                        { value: "", label: "Not specified" },
                        { value: "caucasian", label: "Caucasian/European" },
                        { value: "african", label: "African/Black" },
                        { value: "asian", label: "East Asian" },
                        { value: "south_asian", label: "South Asian" },
                        { value: "hispanic", label: "Hispanic/Latino" },
                        { value: "middle_eastern", label: "Middle Eastern" },
                        { value: "mixed", label: "Mixed/Multiracial" },
                      ]}
                      onChange={(v) => setParams({ ...params, ethnicity: v as any || undefined })}
                    />
                    <SelectField
                      label="Skin Tone"
                      value={params.skinTone}
                      options={[
                        { value: "very_light", label: "Very Light" },
                        { value: "light", label: "Light" },
                        { value: "medium_light", label: "Medium Light" },
                        { value: "medium", label: "Medium" },
                        { value: "medium_dark", label: "Medium Dark" },
                        { value: "dark", label: "Dark" },
                        { value: "very_dark", label: "Very Dark" },
                      ]}
                      onChange={(v) => setParams({ ...params, skinTone: v as any })}
                    />
                  </div>
                </div>

                {/* Face Structure */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider text-purple-400 mb-3">Face Structure</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SelectField
                      label="Face Shape"
                      value={params.faceShape}
                      options={[
                        { value: "oval", label: "Oval" },
                        { value: "round", label: "Round" },
                        { value: "square", label: "Square" },
                        { value: "heart", label: "Heart" },
                        { value: "oblong", label: "Oblong" },
                        { value: "diamond", label: "Diamond" },
                      ]}
                      onChange={(v) => setParams({ ...params, faceShape: v as any })}
                    />
                    <SelectField
                      label="Face Width"
                      value={params.faceWidth || "average"}
                      options={[
                        { value: "narrow", label: "Narrow" },
                        { value: "average", label: "Average" },
                        { value: "wide", label: "Wide" },
                      ]}
                      onChange={(v) => setParams({ ...params, faceWidth: v as any })}
                    />
                    <SelectField
                      label="Jawline"
                      value={params.jawline || "average"}
                      options={[
                        { value: "soft", label: "Soft/Rounded" },
                        { value: "defined", label: "Defined" },
                        { value: "angular", label: "Angular/Strong" },
                      ]}
                      onChange={(v) => setParams({ ...params, jawline: v as any })}
                    />
                    <SelectField
                      label="Cheekbones"
                      value={params.cheekbones || "average"}
                      options={[
                        { value: "flat", label: "Flat" },
                        { value: "average", label: "Average" },
                        { value: "prominent", label: "Prominent/High" },
                      ]}
                      onChange={(v) => setParams({ ...params, cheekbones: v as any })}
                    />
                  </div>
                </div>

                {/* Eyes */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider text-purple-400 mb-3">Eyes & Eyebrows</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SelectField
                      label="Eye Shape"
                      value={params.eyeShape}
                      options={[
                        { value: "almond", label: "Almond" },
                        { value: "round", label: "Round" },
                        { value: "hooded", label: "Hooded" },
                        { value: "monolid", label: "Monolid" },
                        { value: "upturned", label: "Upturned" },
                        { value: "downturned", label: "Downturned" },
                      ]}
                      onChange={(v) => setParams({ ...params, eyeShape: v as any })}
                    />
                    <SelectField
                      label="Eye Color"
                      value={params.eyeColor}
                      options={[
                        { value: "brown", label: "Brown" },
                        { value: "blue", label: "Blue" },
                        { value: "green", label: "Green" },
                        { value: "hazel", label: "Hazel" },
                        { value: "gray", label: "Gray" },
                        { value: "amber", label: "Amber" },
                        { value: "black", label: "Black" },
                      ]}
                      onChange={(v) => setParams({ ...params, eyeColor: v as any })}
                    />
                    <SelectField
                      label="Eye Size"
                      value={params.eyeSize}
                      options={[
                        { value: "small", label: "Small" },
                        { value: "medium", label: "Medium" },
                        { value: "large", label: "Large" },
                      ]}
                      onChange={(v) => setParams({ ...params, eyeSize: v as any })}
                    />
                    <SelectField
                      label="Eye Spacing"
                      value={params.eyeSpacing || "average"}
                      options={[
                        { value: "close", label: "Close-set" },
                        { value: "average", label: "Average" },
                        { value: "wide", label: "Wide-set" },
                      ]}
                      onChange={(v) => setParams({ ...params, eyeSpacing: v as any })}
                    />
                    <SelectField
                      label="Eyebrow Shape"
                      value={params.eyebrowShape || "arched"}
                      options={[
                        { value: "straight", label: "Straight" },
                        { value: "arched", label: "Arched" },
                        { value: "curved", label: "Curved" },
                        { value: "flat", label: "Flat" },
                        { value: "thick", label: "Thick/Bushy" },
                        { value: "thin", label: "Thin" },
                      ]}
                      onChange={(v) => setParams({ ...params, eyebrowShape: v as any })}
                    />
                  </div>
                </div>

                {/* Nose & Lips */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider text-purple-400 mb-3">Nose & Lips</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SelectField
                      label="Nose Shape"
                      value={params.noseShape}
                      options={[
                        { value: "straight", label: "Straight" },
                        { value: "roman", label: "Roman" },
                        { value: "button", label: "Button" },
                        { value: "upturned", label: "Upturned" },
                        { value: "wide", label: "Wide" },
                        { value: "narrow", label: "Narrow" },
                        { value: "aquiline", label: "Aquiline" },
                      ]}
                      onChange={(v) => setParams({ ...params, noseShape: v as any })}
                    />
                    <SelectField
                      label="Nose Size"
                      value={params.noseSize || "medium"}
                      options={[
                        { value: "small", label: "Small" },
                        { value: "medium", label: "Medium" },
                        { value: "large", label: "Large" },
                      ]}
                      onChange={(v) => setParams({ ...params, noseSize: v as any })}
                    />
                    <SelectField
                      label="Lip Shape"
                      value={params.lipShape}
                      options={[
                        { value: "thin", label: "Thin" },
                        { value: "full", label: "Full" },
                        { value: "heart", label: "Heart-shaped" },
                        { value: "wide", label: "Wide" },
                        { value: "bow", label: "Bow-shaped" },
                        { value: "downturned", label: "Downturned" },
                      ]}
                      onChange={(v) => setParams({ ...params, lipShape: v as any })}
                    />
                    <SelectField
                      label="Expression"
                      value={params.expression || "neutral"}
                      options={[
                        { value: "neutral", label: "Neutral" },
                        { value: "slight_smile", label: "Slight Smile" },
                        { value: "serious", label: "Serious" },
                      ]}
                      onChange={(v) => setParams({ ...params, expression: v as any })}
                    />
                  </div>
                </div>

                {/* Hair */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider text-purple-400 mb-3">Hair</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SelectField
                      label="Hair Color"
                      value={params.hairColor}
                      options={[
                        { value: "black", label: "Black" },
                        { value: "dark_brown", label: "Dark Brown" },
                        { value: "brown", label: "Brown" },
                        { value: "light_brown", label: "Light Brown" },
                        { value: "blonde", label: "Blonde" },
                        { value: "red", label: "Red" },
                        { value: "auburn", label: "Auburn" },
                        { value: "gray", label: "Gray" },
                        { value: "white", label: "White" },
                        { value: "bald", label: "Bald" },
                      ]}
                      onChange={(v) => setParams({ ...params, hairColor: v as any })}
                    />
                    <SelectField
                      label="Hair Style"
                      value={params.hairStyle}
                      options={[
                        { value: "short", label: "Short" },
                        { value: "medium", label: "Medium" },
                        { value: "long", label: "Long" },
                        { value: "buzz", label: "Buzz Cut" },
                        { value: "bald", label: "Bald" },
                        { value: "receding", label: "Receding" },
                      ]}
                      onChange={(v) => setParams({ ...params, hairStyle: v as any })}
                    />
                    <SelectField
                      label="Hair Texture"
                      value={params.hairTexture}
                      options={[
                        { value: "straight", label: "Straight" },
                        { value: "wavy", label: "Wavy" },
                        { value: "curly", label: "Curly" },
                        { value: "coily", label: "Coily" },
                      ]}
                      onChange={(v) => setParams({ ...params, hairTexture: v as any })}
                    />
                    {params.gender === "male" && (
                      <SelectField
                        label="Facial Hair"
                        value={params.facialHair || "none"}
                        options={[
                          { value: "none", label: "None" },
                          { value: "stubble", label: "Stubble" },
                          { value: "short_beard", label: "Short Beard" },
                          { value: "full_beard", label: "Full Beard" },
                          { value: "mustache", label: "Mustache" },
                          { value: "goatee", label: "Goatee" },
                        ]}
                        onChange={(v) => setParams({ ...params, facialHair: v as any })}
                      />
                    )}
                  </div>
                </div>

                {/* Distinguishing Features */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider text-purple-400 mb-3">Distinguishing Features</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SelectField
                      label="Glasses"
                      value={params.distinguishingFeatures?.glasses?.type || "none"}
                      options={[
                        { value: "none", label: "None" },
                        { value: "reading", label: "Reading Glasses" },
                        { value: "round", label: "Round Frames" },
                        { value: "rectangular", label: "Rectangular Frames" },
                        { value: "sunglasses", label: "Sunglasses" },
                      ]}
                      onChange={(v) => setParams({ 
                        ...params, 
                        distinguishingFeatures: { 
                          ...params.distinguishingFeatures, 
                          glasses: { type: v as any }
                        }
                      })}
                    />
                    <SelectField
                      label="Wrinkles"
                      value={params.distinguishingFeatures?.wrinkles || "none"}
                      options={[
                        { value: "none", label: "None" },
                        { value: "light", label: "Light" },
                        { value: "moderate", label: "Moderate" },
                        { value: "heavy", label: "Heavy" },
                      ]}
                      onChange={(v) => setParams({ 
                        ...params, 
                        distinguishingFeatures: { 
                          ...params.distinguishingFeatures, 
                          wrinkles: v as any 
                        }
                      })}
                    />
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Freckles</label>
                      <div className="flex items-center gap-3 h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={params.distinguishingFeatures?.freckles || false}
                            onChange={(e) => setParams({
                              ...params,
                              distinguishingFeatures: {
                                ...params.distinguishingFeatures,
                                freckles: e.target.checked
                              }
                            })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm text-slate-300">Has freckles</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Dimples</label>
                      <div className="flex items-center gap-3 h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={params.distinguishingFeatures?.dimples || false}
                            onChange={(e) => setParams({
                              ...params,
                              distinguishingFeatures: {
                                ...params.distinguishingFeatures,
                                dimples: e.target.checked
                              }
                            })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm text-slate-300">Has dimples</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider text-purple-400 mb-3">Additional Details</h4>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">
                      Custom Description (scars, moles, tattoos, unique features, etc.)
                    </label>
                    <textarea
                      value={params.description || ""}
                      onChange={(e) => setParams({ ...params, description: e.target.value })}
                      placeholder="e.g., Small scar above left eyebrow, mole on right cheek, birthmark on neck, crooked nose from old injury..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none h-24"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Add any specific details not covered above. Be descriptive for better results.
                    </p>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setError(null);
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="bg-purple-600 hover:bg-purple-500 min-w-[160px]"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 mr-2" />
                        Generate Portrait
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Portrait Gallery */}
          {portraits.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No witness portraits generated yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Click "New Portrait" to create a photorealistic witness image
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {portraits.map((portrait) => (
                <motion.div
                  key={portrait.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative aspect-square bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-purple-500/50 transition-all"
                >
                  <img
                    src={
                      portrait.storageUrl.startsWith("http")
                        ? portrait.storageUrl
                        : `http://localhost:3001${portrait.storageUrl}`
                    }
                    alt={portrait.description}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs text-slate-200 line-clamp-2 mb-2">
                        {portrait.description}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPortrait(portrait)}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                          title="View Full Size"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => window.open(`http://localhost:3001${portrait.storageUrl}`, "_blank")}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDelete(portrait.id)}
                          className="p-1.5 bg-red-900/50 hover:bg-red-800 rounded text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Info Section */}
          {portraits.length > 0 && (
            <div className="mt-6 p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Portrait Generation</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Portraits are generated using Gemini 3 Pro Image for photorealistic results. 
                    Customize facial features including face shape, skin tone, eyes, nose, lips, and hair.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {selectedPortrait && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setSelectedPortrait(null)}
          >
            <button
              onClick={() => setSelectedPortrait(null)}
              className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <img
                  src={
                    selectedPortrait.storageUrl.startsWith("http")
                      ? selectedPortrait.storageUrl
                      : `http://localhost:3001${selectedPortrait.storageUrl}`
                  }
                  alt={selectedPortrait.description}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">
                    Witness Portrait
                  </h3>
                  <p className="text-slate-400 text-sm">{selectedPortrait.description}</p>
                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={() => window.open(`http://localhost:3001${selectedPortrait.storageUrl}`, "_blank")}
                      className="bg-purple-600 hover:bg-purple-500"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onDelete(selectedPortrait.id);
                        setSelectedPortrait(null);
                      }}
                      className="border-red-700 text-red-400 hover:bg-red-900/30"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
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

