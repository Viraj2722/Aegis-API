"use client";
import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

export default function ApiGraph({ graphData, onSelectApi, isSimulatingAttack }) {
  if (!graphData) return null;

  // Dynamically rewrite nodes and edges for the Attack Simulation
  const { nodes, edges } = useMemo(() => {
    if (!isSimulatingAttack) return graphData;

    const simEdges = graphData.edges.map(edge => {
      // Highlight the exact Kill Chain (Lateral Movement)
      if (edge.data?.is_kill_chain) {
        return { ...edge, animated: true, type: 'step', style: { stroke: '#ef4444', strokeWidth: 4, filter: 'drop-shadow(0 0 8px rgba(239,68,68,1))' } };
      } else if (edge.data?.is_risky) {
        return { ...edge, animated: true, style: { stroke: '#f97316', strokeWidth: 2 } };
      }
      return { ...edge, style: { stroke: '#334155', opacity: 0.1 } };
    });

    const simNodes = graphData.nodes.map(node => {
      const isTarget = simEdges.some(e => e.target === node.id && e.data?.is_kill_chain);
      const isSource = simEdges.some(e => e.source === node.id && e.data?.is_kill_chain);
      if (node.id === 'gateway' || isTarget || isSource || node.data?.is_risky) return { ...node, style: { ...node.style, boxShadow: isTarget ? '0 0 30px rgba(239,68,68,0.8)' : node.style.boxShadow } };
      return { ...node, style: { ...node.style, opacity: 0.1, filter: 'grayscale(100%)' } };
    });

    return { nodes: simNodes, edges: simEdges };
  }, [graphData, isSimulatingAttack]);

  return (
    <div className="bg-[#0f172a]/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-800 h-[700px] flex flex-col animate-in fade-in zoom-in-95 duration-500">
      <div className="flex-1 rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
        <ReactFlow 
          nodes={nodes} 
          edges={edges}
          onNodeClick={(event, node) => node.id !== 'gateway' && onSelectApi(node.id)}
          fitView
          attributionPosition="bottom-right"
          className="dark"
          nodesDraggable={true}
        >
          <Background color="#334155" gap={20} size={2} />
          <Controls className="bg-slate-900 border-slate-700 fill-slate-300" />
        </ReactFlow>
      </div>
      <div className="mt-4 flex gap-6 justify-center text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#dcfce3] border border-[#22c55e] rounded-full"></div>
          Healthy API
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#ffedd5] border border-[#f97316] rounded-full"></div>
          Zombie API
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#fee2e2] border border-[#ef4444] rounded-full"></div>
          Suspicious / High Risk API
        </div>
      </div>
    </div>
  );
}
