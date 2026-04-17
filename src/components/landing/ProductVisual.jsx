"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

const mockData = [
  { label: "zombie", value: 78, color: "#ef4444" },
  { label: "suspicious", value: 45, color: "#f59e0b" },
  { label: "normal", value: 234, color: "#00d4ff" },
  { label: "secured", value: 189, color: "#10b981" },
];

const timelinePoints = [
  0, 12, 28, 18, 45, 30, 55, 40, 68, 52, 85, 62, 72, 88, 76, 95, 82, 100,
];

function MiniGraph() {
  const max = Math.max(...timelinePoints);
  const width = 320;
  const height = 100;

  const points = timelinePoints.map((v, i) => ({
    x: (i / (timelinePoints.length - 1)) * width,
    y: height - (v / max) * height * 0.85 - 5,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: 100 }}
    >
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#00d4ff" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGrad)" />
      <path
        d={pathD}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) =>
        i % 4 === 0 ? (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill="#00d4ff"
            style={{ filter: "drop-shadow(0 0 4px #00d4ff)" }}
          />
        ) : null,
      )}
    </svg>
  );
}

export default function ProductVisual() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  return (
    <section ref={ref} className="relative py-24 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400/60 uppercase mb-4">
            <div className="w-8 h-px bg-cyan-400/30" />
            Live Dashboard
            <div className="w-8 h-px bg-cyan-400/30" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white">
            Intelligence at a <span className="gradient-text">Glance</span>
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto">
            Real-time visualization of your API ecosystem - threats, anomalies,
            and patterns surfaced instantly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.01 }}
          className="relative rounded-2xl overflow-hidden glass neon-border group cursor-default"
          style={{
            y,
            boxShadow:
              "0 0 80px rgba(0,212,255,0.08), 0 40px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.05) 0%, transparent 60%)",
            }}
          />

          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-3 py-0.5 rounded glass text-xs font-mono text-slate-500">
                aegisapi.io/dashboard
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400/70 font-mono">Live</span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              {mockData.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="glass rounded-xl p-3 flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                >
                  <div
                    className="w-2 h-8 rounded-full flex-shrink-0"
                    style={{
                      background: item.color,
                      boxShadow: `0 0 10px ${item.color}60`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 capitalize font-mono">
                      {item.label} APIs
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </div>
                  </div>
                  <div className="w-12 h-6 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${(item.value / 234) * 100}%`,
                        background: `linear-gradient(90deg, ${item.color}40, ${item.color})`,
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="glass rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400">
                  Threat Timeline
                </span>
                <span className="text-xs text-cyan-400 font-mono">7d</span>
              </div>
              <div className="flex-1 flex items-end">
                <MiniGraph />
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400 mb-3">
                High-Risk Endpoints
              </div>
              <div className="space-y-2">
                {[
                  {
                    path: "/api/v1/user/legacy",
                    risk: "CRITICAL",
                    color: "#ef4444",
                  },
                  { path: "/api/auth/token", risk: "HIGH", color: "#f59e0b" },
                  {
                    path: "/api/v2/data/export",
                    risk: "MEDIUM",
                    color: "#f59e0b",
                  },
                  {
                    path: "/api/internal/debug",
                    risk: "CRITICAL",
                    color: "#ef4444",
                  },
                  {
                    path: "/api/webhook/callback",
                    risk: "LOW",
                    color: "#10b981",
                  },
                ].map((ep, i) => (
                  <motion.div
                    key={ep.path}
                    className="flex items-center gap-2 text-xs"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.6 + i * 0.08 }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: ep.color }}
                    />
                    <span className="flex-1 font-mono text-slate-400 truncate">
                      {ep.path}
                    </span>
                    <span
                      className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        color: ep.color,
                        background: `${ep.color}15`,
                        border: `1px solid ${ep.color}30`,
                      }}
                    >
                      {ep.risk}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
