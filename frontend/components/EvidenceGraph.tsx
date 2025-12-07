"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Network, ZoomIn, ZoomOut } from "lucide-react";
import { EvidenceItem, TimelineEvent, Contradiction } from "@/lib/types";

interface EvidenceGraphProps {
  evidence: EvidenceItem[];
  timeline?: TimelineEvent[];
  contradictions?: Contradiction[];
}

interface Node {
  id: string;
  label: string;
  type: "evidence" | "event" | "contradiction";
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  color: string;
  radius: number;
  evidenceType?: string;
  intensity: number; // 0-1 for color intensity variation
}

interface Edge {
  source: string;
  target: string;
  type: "supports" | "contradicts" | "related";
  strength: number;
}

// Monochrome indigo palette
const MONO_COLORS = {
  darkest: "#1e1b4b",
  darker: "#312e81",
  dark: "#3730a3",
  base: "#4f46e5",
  medium: "#6366f1",
  light: "#818cf8",
  lighter: "#a5b4fc",
  lightest: "#c7d2fe",
  accent: "#e0e7ff",
};

export function EvidenceGraph({ evidence, timeline, contradictions }: EvidenceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  const { nodes, edges } = useMemo(() => {
    if (!evidence.length) return { nodes: [], edges: [] };

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const width = 700;
    const height = 420;
    const centerX = width / 2;
    const centerY = height / 2;

    // Evidence nodes in ellipse with varying intensity based on type
    evidence.forEach((item, index) => {
      const angle = (index / evidence.length) * Math.PI * 2 - Math.PI / 2;
      const radiusX = width * 0.38;
      const radiusY = height * 0.36;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      
      // Different intensity for different types (still mono)
      const intensity = item.type === "video" ? 1 : 
                       item.type === "image" ? 0.8 : 
                       item.type === "audio" ? 0.6 : 0.5;
      
      newNodes.push({
        id: item.id,
        label: item.originalFilename.length > 12 
          ? item.originalFilename.substring(0, 10) + "…" 
          : item.originalFilename,
        type: "evidence",
        x, y,
        baseX: x,
        baseY: y,
        color: MONO_COLORS.medium,
        radius: 24,
        evidenceType: item.type,
        intensity,
      });
    });

    // Connect all evidence
    for (let i = 0; i < evidence.length; i++) {
      for (let j = i + 1; j < evidence.length; j++) {
        const sameType = evidence[i].type === evidence[j].type;
        const isAdjacent = Math.abs(i - j) === 1 || Math.abs(i - j) === evidence.length - 1;
        newEdges.push({
          source: evidence[i].id,
          target: evidence[j].id,
          type: "related",
          strength: isAdjacent ? 0.8 : (sameType ? 0.5 : 0.15),
        });
      }
    }

    // Timeline events
    timeline?.slice(0, 3).forEach((event, index) => {
      const angle = (index / 3) * Math.PI * 2 - Math.PI / 2;
      const radius = 45;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      newNodes.push({
        id: `event-${event.id}`,
        label: event.label.length > 8 ? event.label.substring(0, 6) + "…" : event.label,
        type: "event",
        x, y,
        baseX: x,
        baseY: y,
        color: MONO_COLORS.lighter,
        radius: 16,
        intensity: 0.9,
      });

      event.supportingEvidenceIds?.forEach(evidenceId => {
        if (newNodes.find(n => n.id === evidenceId)) {
          newEdges.push({
            source: `event-${event.id}`,
            target: evidenceId,
            type: "supports",
            strength: 0.7,
          });
        }
      });
    });

    // Contradictions
    contradictions?.slice(0, 2).forEach((contradiction, index) => {
      const involvedNodes = contradiction.involvedEvidenceIds
        ?.map(id => newNodes.find(n => n.id === id))
        .filter(Boolean) as Node[];
      
      let x = centerX + (index - 0.5) * 50;
      let y = centerY + 25;
      
      if (involvedNodes.length >= 2) {
        x = (involvedNodes[0].x + involvedNodes[1].x) / 2;
        y = (involvedNodes[0].y + involvedNodes[1].y) / 2;
      }
      
      newNodes.push({
        id: `contradiction-${contradiction.id}`,
        label: "!",
        type: "contradiction",
        x, y,
        baseX: x,
        baseY: y,
        color: MONO_COLORS.lightest,
        radius: 12,
        intensity: 1,
      });

      contradiction.involvedEvidenceIds?.forEach(evidenceId => {
        if (newNodes.find(n => n.id === evidenceId)) {
          newEdges.push({
            source: `contradiction-${contradiction.id}`,
            target: evidenceId,
            type: "contradicts",
            strength: 0.9,
          });
        }
      });
    });

    return { nodes: newNodes, edges: newEdges };
  }, [evidence, timeline, contradictions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !nodes.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = container.clientWidth;
    const height = 420;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let time = 0;

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);

      // Dark mono background with subtle gradient
      const bgGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      bgGradient.addColorStop(0, "#0f0d1a");
      bgGradient.addColorStop(0.5, "#0c0a14");
      bgGradient.addColorStop(1, "#050407");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle grid pattern
      ctx.strokeStyle = "rgba(99, 102, 241, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.save();
      const offsetX = (width - width * zoom) / 2;
      const offsetY = (height - height * zoom) / 2;
      ctx.translate(offsetX, offsetY);
      ctx.scale(zoom, zoom);

      // Update positions
      const updatedNodes = nodes.map(node => {
        const idleX = Math.sin(time * 0.7 + node.baseX * 0.008) * 1.5;
        const idleY = Math.cos(time * 0.5 + node.baseY * 0.008) * 1.5;
        
        let x = node.baseX + idleX;
        let y = node.baseY + idleY;

        if (hoveredNode?.id === node.id) {
          x = node.baseX + (mousePos.x - node.baseX) * 0.06;
          y = node.baseY + (mousePos.y - node.baseY) * 0.06;
        }

        return { ...node, x, y };
      });

      // Draw edges
      edges.forEach(edge => {
        const sourceNode = updatedNodes.find(n => n.id === edge.source);
        const targetNode = updatedNodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        const isHovered = hoveredNode && 
          (hoveredNode.id === edge.source || hoveredNode.id === edge.target);

        // Glow for hovered edges
        if (isHovered && edge.strength > 0.3) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = `rgba(165, 180, 252, 0.15)`;
          ctx.lineWidth = 8;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        
        const alpha = isHovered ? 0.6 : edge.strength * 0.25;
        ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
        ctx.lineWidth = isHovered ? 1.5 : 1;
        
        if (edge.type === "contradicts") {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = `rgba(199, 210, 254, ${isHovered ? 0.8 : 0.4})`;
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      });

      // Draw nodes
      updatedNodes.forEach(node => {
        const isHovered = hoveredNode?.id === node.id;
        const scale = isHovered ? 1.15 : 1;
        const radius = node.radius * scale;

        // Outer glow
        const glowIntensity = isHovered ? 0.4 : 0.1;
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, radius * 0.5,
          node.x, node.y, radius * 2.5
        );
        glowGradient.addColorStop(0, `rgba(129, 140, 248, ${glowIntensity})`);
        glowGradient.addColorStop(0.5, `rgba(99, 102, 241, ${glowIntensity * 0.3})`);
        glowGradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Pulse ring
        const pulseAlpha = (Math.sin(time * 2 + node.baseX * 0.01) + 1) * 0.15;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(165, 180, 252, ${pulseAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.stroke();

        // Shadow
        ctx.beginPath();
        ctx.arc(node.x + 1, node.y + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fill();

        // Main node with mono gradient based on intensity
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(
          node.x - radius / 2.5, node.y - radius / 2.5, 0,
          node.x, node.y, radius * 1.3
        );
        
        // Use intensity for color variation
        const baseAlpha = 0.7 + node.intensity * 0.3;
        gradient.addColorStop(0, `rgba(199, 210, 254, ${baseAlpha})`);
        gradient.addColorStop(0.3, `rgba(165, 180, 252, ${baseAlpha * 0.9})`);
        gradient.addColorStop(0.7, `rgba(129, 140, 248, ${baseAlpha * 0.8})`);
        gradient.addColorStop(1, `rgba(99, 102, 241, ${baseAlpha * 0.7})`);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(node.x - radius * 0.25, node.y - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered 
          ? "rgba(224, 231, 255, 0.9)" 
          : `rgba(165, 180, 252, ${0.3 + node.intensity * 0.2})`;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Label
        if (node.type === "contradiction") {
          ctx.fillStyle = MONO_COLORS.darkest;
          ctx.font = "bold 12px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(node.label, node.x, node.y);
        } else {
          ctx.fillStyle = "rgba(224, 231, 255, 0.9)";
          ctx.font = "500 9px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 3;
          ctx.fillText(node.label, node.x, node.y + radius + 6);
          ctx.shadowBlur = 0;
        }
      });

      // Center dot
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(165, 180, 252, 0.4)";
      ctx.fill();

      ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, edges, zoom, hoveredNode, mousePos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setMousePos({ x, y });

    const hovered = nodes.find(node => {
      const dx = node.baseX - x;
      const dy = node.baseY - y;
      return Math.sqrt(dx * dx + dy * dy) < node.radius + 12;
    });
    setHoveredNode(hovered || null);
  };

  if (!evidence.length) return null;

  return (
    <div className="relative mt-8">
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent mb-6" />
      
      <div className="bg-[#0a0910] rounded-2xl border border-indigo-500/10 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-indigo-500/10 bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                <Network className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-indigo-100">Evidence Network</h3>
                <p className="text-[10px] text-indigo-400/60">Relationship visualization</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 bg-indigo-950/50 rounded-lg p-0.5">
              <button
                onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
                className="p-1.5 hover:bg-indigo-500/20 rounded text-indigo-400 hover:text-indigo-200 transition-all"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-indigo-400/60 w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                className="p-1.5 hover:bg-indigo-500/20 rounded text-indigo-400 hover:text-indigo-200 transition-all"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="relative" style={{ height: 420 }}>
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredNode(null)}
            className="cursor-crosshair"
          />

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-indigo-950/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-indigo-500/20">
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-indigo-300/70">Evidence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-300" />
                <span className="text-indigo-300/70">Event</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-200" />
                <span className="text-indigo-300/70">Alert</span>
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {hoveredNode && (
            <div className="absolute top-3 right-3 bg-indigo-950/95 backdrop-blur-md rounded-lg p-3 border border-indigo-500/30 max-w-[200px] animate-in fade-in slide-in-from-top-1 duration-150">
              {hoveredNode.type === "evidence" && (
                <>
                  <div className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1">
                    {evidence.find(e => e.id === hoveredNode.id)?.type}
                  </div>
                  <div className="text-xs font-medium text-indigo-100 mb-1">
                    {evidence.find(e => e.id === hoveredNode.id)?.originalFilename}
                  </div>
                  {evidence.find(e => e.id === hoveredNode.id)?.derived?.summary && (
                    <p className="text-[10px] text-indigo-300/60 line-clamp-2">
                      {evidence.find(e => e.id === hoveredNode.id)?.derived?.summary}
                    </p>
                  )}
                </>
              )}
              {hoveredNode.type === "event" && (
                <>
                  <div className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1">Event</div>
                  <div className="text-xs text-indigo-100">
                    {timeline?.find(e => `event-${e.id}` === hoveredNode.id)?.label}
                  </div>
                </>
              )}
              {hoveredNode.type === "contradiction" && (
                <>
                  <div className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">Contradiction</div>
                  <div className="text-xs text-indigo-100">
                    {contradictions?.find(c => `contradiction-${c.id}` === hoveredNode.id)?.description}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-indigo-500/10 bg-indigo-950/10">
          <p className="text-[10px] text-indigo-400/40 text-center">
            Hover to explore • Intensity indicates evidence type
          </p>
        </div>
      </div>
    </div>
  );
}
