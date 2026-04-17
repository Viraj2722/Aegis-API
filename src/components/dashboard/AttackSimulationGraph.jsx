"use client";

import { memo, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Play, Pause, RotateCcw, AlertTriangle, Shield, Activity, Gauge } from "lucide-react";

const RISK_COLOR = {
  CRITICAL: "#ef4444",
  HIGH: "#fb923c",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};

function toTitle(value) {
  const text = String(value || "").toLowerCase();
  if (!text) return "Unknown";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function clampRisk(value) {
  const number = Number(value || 0);
  const normalized = number > 1 ? number / 100 : number;
  return Math.max(0, Math.min(1, normalized));
}

function buildOrderedNodes(simulationData) {
  const apis = Array.isArray(simulationData?.apis) ? simulationData.apis : [];
  const edges = Array.isArray(simulationData?.edges) ? simulationData.edges : [];

  const byApi = new Map();
  for (const api of apis) {
    const key = api?.api;
    if (!key) continue;
    byApi.set(key, api);
  }

  const inDegree = new Map();
  const outGraph = new Map();
  for (const api of byApi.keys()) {
    inDegree.set(api, 0);
    outGraph.set(api, []);
  }

  for (const edge of edges) {
    if (!edge?.source || !edge?.target) continue;
    if (!byApi.has(edge.source) || !byApi.has(edge.target)) continue;
    outGraph.get(edge.source).push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue = [...byApi.keys()].filter((k) => (inDegree.get(k) || 0) === 0);
  const ordered = [];
  const seen = new Set();

  while (queue.length > 0) {
    const node = queue.shift();
    if (seen.has(node)) continue;
    seen.add(node);
    ordered.push(node);
    for (const next of outGraph.get(node) || []) {
      const nextDegree = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, nextDegree);
      if (nextDegree <= 0) {
        queue.push(next);
      }
    }
  }

  for (const node of byApi.keys()) {
    if (!seen.has(node)) ordered.push(node);
  }

  if (ordered.length <= 1) {
    return ordered.map((id, index) => ({
      id,
      step: index + 1,
      ...byApi.get(id),
    }));
  }

  return ordered.map((id, index) => ({
    id,
    step: index + 1,
    ...byApi.get(id),
  }));
}

function riskTone(risk) {
  const level = String(risk || "LOW").toUpperCase();
  return {
    level,
    color: RISK_COLOR[level] || RISK_COLOR.LOW,
  };
}

const SimulationNode = memo(({ data }) => {
  const { level, color } = riskTone(data.riskLevel);

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#94a3b8", width: 8, height: 8 }}
      />
      <div
        className="w-[240px] rounded-xl border bg-[#091227] shadow-[0_8px_30px_rgba(2,6,23,0.45)] px-3 py-2.5"
        style={{
          borderColor: data.active ? "rgba(34,211,238,0.85)" : "rgba(51,65,85,0.9)",
          boxShadow: data.active
            ? "0 0 0 1px rgba(34,211,238,0.45), 0 10px 24px rgba(34,211,238,0.15)"
            : "0 8px 24px rgba(2,6,23,0.4)",
          opacity: data.future ? 0.76 : 1,
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Step {data.step}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full border"
            style={{ color, borderColor: color, background: `${color}14` }}
          >
            {level}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-100 truncate" title={data.api}>
          {data.api}
        </p>
        <div className="mt-2 text-[11px] text-slate-300 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Error rate</span>
            <span>{(Number(data.errorRate || 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Traffic</span>
            <span>{toTitle(data.trafficPattern)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Risk score</span>
            <span>{Math.round(clampRisk(data.riskScore) * 100)}</span>
          </div>
        </div>
        {data.active ? (
          <div className="mt-2 text-[11px] text-cyan-300 flex items-center gap-1.5">
            <Activity size={12} />
            Active compromise stage
          </div>
        ) : data.past ? (
          <div className="mt-2 text-[11px] text-emerald-300 flex items-center gap-1.5">
            <Shield size={12} />
            Stage traversed
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-slate-500">Awaiting progression</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#94a3b8", width: 8, height: 8 }}
      />
    </>
  );
});

SimulationNode.displayName = "SimulationNode";

function buildFlowData(sequence, activeStep, edgesInput) {
  const fallbackEdges = sequence
    .map((node, idx) =>
      idx < sequence.length - 1
        ? { source: node.id, target: sequence[idx + 1].id }
        : null,
    )
    .filter(Boolean);

  const usableEdges = Array.isArray(edgesInput) && edgesInput.length > 0 ? edgesInput : fallbackEdges;

  const flowNodes = sequence.map((node, idx) => {
    const x = 90 + idx * 320;
    const y = 80 + (idx % 2 === 0 ? 0 : 120);
    return {
      id: node.id,
      type: "simulationNode",
      position: { x, y },
      draggable: false,
      data: {
        step: idx + 1,
        api: node.api,
        riskLevel: node.risk_level,
        riskScore: node.risk_score,
        errorRate: node.error_rate,
        trafficPattern: node.traffic_pattern,
        active: idx === activeStep,
        past: idx < activeStep,
        future: idx > activeStep,
      },
    };
  });

  const flowEdges = usableEdges
    .map((edge, idx) => {
      const sourceIdx = sequence.findIndex((item) => item.id === edge.source);
      const targetIdx = sequence.findIndex((item) => item.id === edge.target);
      if (sourceIdx === -1 || targetIdx === -1) return null;
      const completed = sourceIdx < activeStep && targetIdx <= activeStep;
      const active = sourceIdx <= activeStep && targetIdx === activeStep + 1;

      return {
        id: `sim-edge-${idx}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: active,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: active ? "#22d3ee" : completed ? "#4ade80" : "#475569",
        },
        style: {
          strokeWidth: active ? 3 : 2,
          stroke: active ? "#22d3ee" : completed ? "#4ade80" : "#475569",
          opacity: active || completed ? 1 : 0.7,
        },
      };
    })
    .filter(Boolean);

  return { flowNodes, flowEdges };
}

export default function AttackSimulationGraph({ simulationData }) {
  const sequence = useMemo(() => buildOrderedNodes(simulationData), [simulationData]);
  const attackEdges = useMemo(() => {
    if (!Array.isArray(simulationData?.edges)) return [];
    return simulationData.edges
      .map((edge) => ({ source: edge?.source, target: edge?.target }))
      .filter((edge) => edge.source && edge.target);
  }, [simulationData]);
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1200);

  const { flowNodes, flowEdges } = useMemo(
    () => buildFlowData(sequence, activeStep, attackEdges),
    [sequence, activeStep, attackEdges],
  );

  const nodeTypes = useMemo(
    () => ({
      simulationNode: SimulationNode,
    }),
    [],
  );

  useEffect(() => {
    setActiveStep(0);
    setPlaying(false);
  }, [simulationData]);

  useEffect(() => {
    if (!playing || sequence.length <= 1) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => {
        const next = prev + 1;
        if (next >= sequence.length) {
          setPlaying(false);
          return prev;
        }
        return next;
      });
    }, speedMs);

    return () => clearInterval(timer);
  }, [playing, sequence.length, speedMs]);

  const current = sequence[activeStep] || null;

  if (!sequence.length) {
    return (
      <div className="glass rounded-xl border border-slate-800/60 p-8 text-center text-slate-400">
        No simulation data available. Upload logs to generate attack paths.
      </div>
    );
  }

  return (
    <div className="glass rounded-xl border border-slate-800/60 p-4 sm:p-5 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-base sm:text-lg">Attack Simulation</h3>
          <p className="text-slate-400 text-xs sm:text-sm">
            Step through likely lateral movement across your API surface.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium inline-flex items-center gap-1.5"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setActiveStep(0);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white text-sm inline-flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-700/70 bg-slate-900/40">
            <Gauge size={14} className="text-cyan-400" />
            <input
              type="range"
              min={600}
              max={2200}
              step={100}
              value={speedMs}
              onChange={(event) => setSpeedMs(Number(event.target.value))}
              className="w-24 accent-cyan-400"
              aria-label="Playback speed"
            />
          </div>
        </div>
      </div>

      <div className="relative rounded-xl border border-slate-800/70 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_48%),linear-gradient(180deg,#050a18,#071022)] overflow-hidden">
        <div className="h-[480px]">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            minZoom={0.45}
            maxZoom={1.4}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap
              pannable
              zoomable
              className="!bg-slate-950/70 !border !border-slate-700/70"
              nodeColor={(node) => {
                const risk = node?.data?.riskLevel;
                return riskTone(risk).color;
              }}
            />
            <Controls
              showInteractive={false}
              className="!bg-slate-950/80 !border !border-slate-700/70 !rounded-lg"
            />
            <Background color="#1e293b" gap={24} size={1} />
          </ReactFlow>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          Active path
        </div>
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          Traversed stages
        </div>
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          Upcoming stages
        </div>
      </div>

      <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 flex items-center gap-2">
        <AlertTriangle size={15} className="text-amber-400" />
        {current
          ? `Current step ${activeStep + 1}/${sequence.length}: ${current.api} (${String(current.risk_level || "LOW").toUpperCase()})`
          : "Simulation ready"}
      </div>
    </div>
  );
}
