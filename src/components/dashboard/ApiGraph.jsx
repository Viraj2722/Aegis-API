"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Network, Layers, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

const STATUS_COLORS = {
  Normal: "#10b981",
  Zombie: "#64748b",
  Suspicious: "#f59e0b",
  Critical: "#ef4444",
};

const EDGE_COLORS = {
  fingerprint: "rgba(167, 139, 250, 0.95)",
  risk: "rgba(248, 113, 113, 0.95)",
  inferred: "rgba(56, 189, 248, 0.75)",
  connection: "rgba(129, 140, 248, 0.68)",
};

const STATUS_CLUSTER_X = {
  Critical: 0.22,
  Suspicious: 0.43,
  Zombie: 0.65,
  Normal: 0.82,
};

function toId(value) {
  if (value && typeof value === "object") {
    return value.id;
  }
  return value;
}

function endpointTokens(name) {
  return String(name || "")
    .toLowerCase()
    .split(/[\/_\-.?=&]+/)
    .filter((t) => t && t.length > 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inferLinks(nodes, existingLinks) {
  const links = Array.isArray(existingLinks) ? [...existingLinks] : [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const seen = new Set(
    links
      .map((l) => [toId(l.source), toId(l.target)].sort().join("|"))
      .filter((k) => k && !k.includes("undefined")),
  );

  const tokenMap = new Map(
    nodes.map((n) => [n.id, new Set(endpointTokens(n.name || n.id))]),
  );

  const connected = new Set();
  links.forEach((l) => {
    const s = toId(l.source);
    const t = toId(l.target);
    if (nodeIds.has(s) && nodeIds.has(t)) {
      connected.add(s);
      connected.add(t);
    }
  });

  const highestRisk = [...nodes].sort((a, b) => (b.risk || 0) - (a.risk || 0))[0];

  const pushLink = (source, target, type = "inferred") => {
    if (!source || !target || source === target) return;
    const key = [source, target].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source, target, type });
    connected.add(source);
    connected.add(target);
  };

  // Build meaningful links based on endpoint token overlap.
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const aTokens = tokenMap.get(a.id) || new Set();
      const bTokens = tokenMap.get(b.id) || new Set();
      let shared = 0;
      aTokens.forEach((t) => {
        if (bTokens.has(t)) shared += 1;
      });
      if (shared >= 1) {
        const riskyPair =
          (a.status === "Critical" || a.status === "Suspicious") &&
          (b.status === "Critical" || b.status === "Suspicious");
        pushLink(a.id, b.id, riskyPair ? "risk" : "connection");
      }
    }
  }

  // Guarantee overall graph connectivity: connect orphan nodes toward highest-risk node.
  if (highestRisk) {
    nodes.forEach((n) => {
      if (!connected.has(n.id) && n.id !== highestRisk.id) {
        pushLink(n.id, highestRisk.id, "inferred");
      }
    });
  }

  // Safety net for tiny/fragmented datasets: make a low-strength chain by risk order.
  const byRisk = [...nodes].sort((a, b) => (b.risk || 0) - (a.risk || 0));
  for (let i = 0; i < byRisk.length - 1; i += 1) {
    pushLink(byRisk[i].id, byRisk[i + 1].id, "inferred");
  }

  return links.filter((l) => nodeIds.has(toId(l.source)) && nodeIds.has(toId(l.target)));
}

export default function ApiGraph({ graphData, clusterMode, onToggleCluster }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 500 });
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const phaseRef = useRef(0);
  const animRef = useRef(null);

  const preparedGraph = useMemo(() => {
    const nodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
    const links = inferLinks(nodes, graphData?.links || []);
    return { nodes, links };
  }, [graphData]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const update = () => {
      const width = Math.max(720, Math.floor(host.clientWidth));
      const height = Math.max(460, Math.min(640, Math.floor(width * 0.42)));
      setCanvasSize({ width, height });
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const drawBackdrop = useCallback((ctx, width, height) => {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#020817");
    grad.addColorStop(1, "#010513");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.35, height * 0.3, 20, width * 0.35, height * 0.3, width * 0.7);
    glow.addColorStop(0, "rgba(56,189,248,0.14)");
    glow.addColorStop(0.5, "rgba(99,102,241,0.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const grid = 32;
    ctx.strokeStyle = "rgba(71, 85, 105, 0.22)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  const buildFixedLayout = useCallback(
    (nodes) => {
      if (!nodes.length) return [];

      const width = canvasSize.width;
      const height = canvasSize.height;
      const centerX = width / 2;
      const centerY = height / 2;

      if (clusterMode) {
        const groups = {
          Critical: nodes.filter((n) => n.status === "Critical"),
          Suspicious: nodes.filter((n) => n.status === "Suspicious"),
          Zombie: nodes.filter((n) => n.status === "Zombie"),
          Normal: nodes.filter((n) => n.status === "Normal"),
        };
        const groupKeys = ["Critical", "Suspicious", "Zombie", "Normal"];
        const clusterColumns = {
          Critical: width * 0.22,
          Suspicious: width * 0.44,
          Zombie: width * 0.66,
          Normal: width * 0.82,
        };

        return groupKeys.flatMap((status) => {
          const items = groups[status];
          const columnX = clusterColumns[status];
          const spread = Math.min(160, Math.max(90, (height - 120) / Math.max(1, items.length + 1)));
          return items.map((node, index) => {
            const offsetY = (index - (items.length - 1) / 2) * spread;
            return {
              ...node,
              x: clamp(columnX + (index % 2 === 0 ? -12 : 12), 48, width - 48),
              y: clamp(centerY + offsetY, 48, height - 48),
              fx: null,
              fy: null,
            };
          });
        });
      }

      const radiusX = Math.max(130, Math.min(220, width * 0.23));
      const radiusY = Math.max(95, Math.min(165, height * 0.22));

      return nodes.map((node, index) => {
        const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
        return {
          ...node,
          x: clamp(centerX + Math.cos(angle) * radiusX, 48, width - 48),
          y: clamp(centerY + Math.sin(angle) * radiusY, 48, height - 48),
          fx: null,
          fy: null,
        };
      });
    },
    [canvasSize.width, canvasSize.height, clusterMode],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = canvasSize.width;
    const height = canvasSize.height;
    const pixelWidth = Math.floor(width * dpr);
    const pixelHeight = Math.floor(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    drawBackdrop(ctx, width, height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;

    if (!nodes.length) {
      ctx.restore();
      return;
    }

    edges.forEach((e) => {
      const s = nodes.find((n) => n.id === toId(e.source));
      const t = nodes.find((n) => n.id === toId(e.target));
      if (!s || !t) return;

      const linkedToHovered =
        hoveredNode && (s.id === hoveredNode.id || t.id === hoveredNode.id);

      const mx = (s.x + t.x) / 2;
      const my = (s.y + t.y) / 2;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;
      const curve = Math.min(24, dist * 0.14);

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
<<<<<<< HEAD
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle =
        e.type === "fingerprint"
          ? "rgba(34, 197, 94, 0.5)"
          : "rgba(16, 185, 129, 0.25)";
      ctx.lineWidth = e.type === "fingerprint" ? 1.5 : 1;
      if (e.type === "fingerprint") ctx.setLineDash([5, 5]);
=======
      ctx.quadraticCurveTo(mx + nx * curve, my + ny * curve, t.x, t.y);

      const color = EDGE_COLORS[e.type] || EDGE_COLORS.connection;
      const isDimmed = hoveredNode && !linkedToHovered;
      ctx.strokeStyle = isDimmed ? "rgba(71,85,105,0.28)" : color;
      ctx.lineWidth = linkedToHovered ? 3 : e.type === "inferred" ? 1.6 : 2.4;

      if (e.type === "fingerprint" || e.type === "risk") {
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -(phaseRef.current * 0.6);
      } else if (e.type === "inferred") {
        ctx.setLineDash([2, 9]);
        ctx.lineDashOffset = -(phaseRef.current * 0.35);
      } else {
        ctx.setLineDash([]);
      }

>>>>>>> 95799056cfaccdfc7304f7f727e5cb45baf956ac
      ctx.stroke();
      ctx.setLineDash([]);

      if (e.type === "risk" || e.type === "fingerprint") {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(mx + nx * curve, my + ny * curve, t.x, t.y);
        ctx.strokeStyle = e.type === "risk" ? "rgba(248,113,113,0.26)" : "rgba(167,139,250,0.24)";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
      }

      if (e.type === "fingerprint") {
        const tx = (s.x + t.x) / 2 + nx * (curve + 4);
        const ty = (s.y + t.y) / 2 + ny * (curve + 4);
        ctx.save();
        ctx.fillStyle = "rgba(196,181,253,0.9)";
        ctx.beginPath();
        ctx.arc(tx, ty, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Inferred links intentionally have no midpoint marker for cleaner visuals.
    });

    nodes.forEach((n) => {
      const color = STATUS_COLORS[n.status] || "#6366f1";
      const r = n.val + 2;
      const isHov = hoveredNode?.id === n.id;

      if (isHov || n.status === "Critical") {
        ctx.shadowBlur = isHov ? 24 : 16;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHov ? color : `${color}B3`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isHov ? 2.8 : 1.8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (n.status === "Critical") {
        const pulse = 5.2 + Math.sin(phaseRef.current / 10) * 0.9;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(248,113,113,0.35)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      ctx.font = `${isHov ? "bold " : ""}10px monospace`;
      ctx.fillStyle = isHov ? "#FFFFFF" : "rgba(226,232,240,0.92)";
      ctx.textAlign = "center";
      const label = n.name.split("/").pop() || n.name;
      ctx.fillText(label.substring(0, 16), n.x, n.y + r + 13);
    });

    ctx.restore();
  }, [canvasSize, pan, zoom, hoveredNode, drawBackdrop]);

  useEffect(() => {
    if (!preparedGraph?.nodes?.length) {
      nodesRef.current = [];
      edgesRef.current = [];
      return;
    }

    nodesRef.current = buildFixedLayout(preparedGraph.nodes);

    edgesRef.current = preparedGraph.links.map((e) => ({
      ...e,
      source: toId(e.source),
      target: toId(e.target),
    }));
  }, [preparedGraph, buildFixedLayout]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const tick = () => {
      phaseRef.current += 1;
      draw();
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [draw]);

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
    setHoveredNode(getNodeAt(e));
  };

  const handleWheel = (e) => {
    // Keep natural page scroll unless user intentionally zooms graph with Ctrl/Cmd.
    if (!(e.ctrlKey || e.metaKey)) {
      return;
    }
    e.preventDefault();
    setZoom((z) => Math.max(0.4, Math.min(2.5, z - e.deltaY * 0.001)));
  };

  return (
    <div className="glass rounded-xl border border-slate-800/60 overflow-hidden">
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
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={() => {}}
          onMouseUp={() => {}}
          onMouseLeave={() => {
            setHoveredNode(null);
          }}
          onWheel={handleWheel}
          className="w-full rounded-b-xl"
          style={{
            display: "block",
            background: "transparent",
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            cursor: "default",
          }}
        />
        {!preparedGraph.nodes.length && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            No APIs available to render graph
          </div>
        )}
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
        <div className="absolute top-3 left-4 flex items-center gap-4 text-[10px] text-slate-300/95 bg-[#020817]/80 backdrop-blur-sm rounded-md px-2 py-1 border border-slate-700/60">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-[2px] bg-indigo-300 rounded-full" /> Related
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-[2px] border-t-2 border-dashed border-violet-300" /> Fingerprint
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-[2px] border-t-2 border-dotted border-cyan-300" /> Inferred
          </span>
        </div>
      </div>
    </div>
  );
}
