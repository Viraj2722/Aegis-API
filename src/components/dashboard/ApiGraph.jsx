"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Network, Layers, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

const STATUS_COLORS = {
  Normal: "#10b981",
  Zombie: "#64748b",
  Suspicious: "#f59e0b",
  Critical: "#ef4444",
};

export default function ApiGraph({ graphData, clusterMode, onToggleCluster }) {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const animRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);

  const W = 800;
  const H = 420;

  useEffect(() => {
    if (!graphData) return;

    nodesRef.current = graphData.nodes.map((n, i) => {
      const angle = (i / Math.max(1, graphData.nodes.length)) * Math.PI * 2;
      const x = W / 2 + Math.cos(angle) * 160;
      const y = H / 2 + Math.sin(angle) * 130;
      return { ...n, x, y, vx: 0, vy: 0 };
    });

    edgesRef.current = graphData.links;
  }, [graphData, clusterMode]);

  useEffect(() => {
    if (nodesRef.current.length === 0) return;

    let frame = 0;
    const tick = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = Math.min(1200 / (dist * dist), 5);
          nodes[i].vx -= (dx / dist) * force;
          nodes[i].vy -= (dy / dist) * force;
          nodes[j].vx += (dx / dist) * force;
          nodes[j].vy += (dy / dist) * force;
        }
      }

      edges.forEach((e) => {
        const s = nodes.find((n) => n.id === (e.source?.id ?? e.source));
        const t = nodes.find((n) => n.id === (e.target?.id ?? e.target));
        if (!s || !t) return;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.02;
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
        t.vx -= (dx / dist) * force;
        t.vy -= (dy / dist) * force;
      });

      nodes.forEach((n) => {
        n.vx += (W / 2 - n.x) * 0.003;
        n.vy += (H / 2 - n.y) * 0.003;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(20, Math.min(W - 20, n.x));
        n.y = Math.max(20, Math.min(H - 20, n.y));
      });

      if (frame < 120) {
        frame += 1;
        animRef.current = requestAnimationFrame(tick);
      }
      draw();
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData, clusterMode, hoveredNode]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;

    edges.forEach((e) => {
      const s = nodes.find((n) => n.id === (e.source?.id ?? e.source));
      const t = nodes.find((n) => n.id === (e.target?.id ?? e.target));
      if (!s || !t) return;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle =
        e.type === "fingerprint"
          ? "rgba(34, 197, 94, 0.5)"
          : "rgba(16, 185, 129, 0.25)";
      ctx.lineWidth = e.type === "fingerprint" ? 1.5 : 1;
      if (e.type === "fingerprint") ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    nodes.forEach((n) => {
      const color = STATUS_COLORS[n.status] || "#6366f1";
      const r = n.val + 2;
      const isHov = hoveredNode?.id === n.id;

      if (isHov || n.status === "Critical") {
        ctx.shadowBlur = isHov ? 20 : 12;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHov ? color : `${color}99`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isHov ? 2.5 : 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = `${isHov ? "bold " : ""}10px monospace`;
      ctx.fillStyle = isHov ? "#fff" : "rgba(226,232,240,0.7)";
      ctx.textAlign = "center";
      const label = n.name.split("/").pop() || n.name;
      ctx.fillText(label.substring(0, 14), n.x, n.y + r + 12);
    });

    ctx.restore();
  }, [pan, zoom, hoveredNode]);

  const getNodeAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left - pan.x) / zoom;
    const my = (e.clientY - rect.top - pan.y) / zoom;
    return (
      nodesRef.current.find((n) => {
        const dx = n.x - mx;
        const dy = n.y - my;
        return Math.sqrt(dx * dx + dy * dy) < n.val + 6;
      }) || null
    );
  };

  const handleMouseMove = (e) => {
    if (isDragging && dragStart) {
      setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    } else {
      setHoveredNode(getNodeAt(e));
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.4, Math.min(2.5, z - e.deltaY * 0.001)));
  };

  return (
    <div className="glass rounded-xl border border-slate-800/60">
      <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Network size={15} className="text-emerald-400" />
          <span className="text-white font-semibold text-sm">
            API Relationship Graph
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCluster}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${clusterMode ? "bg-emerald-600 text-white" : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"}`}
          >
            <Layers size={12} />
            Cluster View
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
            className="w-7 h-7 flex items-center justify-center bg-slate-800/60 rounded-lg text-slate-400 hover:text-white"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
            className="w-7 h-7 flex items-center justify-center bg-slate-800/60 rounded-lg text-slate-400 hover:text-white"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="w-7 h-7 flex items-center justify-center bg-slate-800/60 rounded-lg text-slate-400 hover:text-white"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onMouseMove={handleMouseMove}
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
          }}
          onMouseUp={() => {
            setIsDragging(false);
            setDragStart(null);
          }}
          onMouseLeave={() => {
            setHoveredNode(null);
            setIsDragging(false);
          }}
          onWheel={handleWheel}
          className="w-full cursor-grab active:cursor-grabbing rounded-b-xl"
          style={{ display: "block", background: "transparent" }}
        />
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 pointer-events-none border border-slate-700/60"
          >
            <p className="text-xs font-mono text-emerald-300">
              {hoveredNode.name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              <span style={{ color: STATUS_COLORS[hoveredNode.status] }}>
                {hoveredNode.status}
              </span>
              {" · "}Risk: {(hoveredNode.risk * 100).toFixed(0)}%
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
