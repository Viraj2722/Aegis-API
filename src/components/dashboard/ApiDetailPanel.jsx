"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  Fingerprint,
  Info,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";

const STATUS_COLORS = {
  Normal: "text-emerald-400",
  Zombie: "text-slate-400",
  Suspicious: "text-yellow-400",
  Critical: "text-red-400",
};

const RISK_BG = (score) => {
  if (score >= 0.8) return "from-red-600/20 to-red-600/5 border-red-500/30";
  if (score >= 0.5)
    return "from-yellow-600/20 to-yellow-600/5 border-yellow-500/30";
  return "from-emerald-600/20 to-emerald-600/5 border-emerald-500/30";
};

const RELATIONSHIP_INFO = {
  Duplicate: {
    color: "text-yellow-400 bg-yellow-500/15",
    desc: "This API has nearly identical behavior to another endpoint. Likely redundant.",
  },
  Renamed: {
    color: "text-blue-400 bg-blue-500/15",
    desc: "This API was likely versioned or renamed. Legacy endpoint may still be exposed.",
  },
  Shadow: {
    color: "text-purple-400 bg-purple-500/15",
    desc: "Undocumented API behaving similarly to a known endpoint.",
  },
};

export default function ApiDetailPanel({ api, onClose }) {
  return (
    <AnimatePresence>
      {api && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[#060e1e] border-l border-slate-800 z-50 overflow-y-auto scrollbar-thin"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between sticky top-0 bg-[#060e1e]/95 backdrop-blur-sm">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1">
                  API Detail
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 text-xs font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                    {api.method}
                  </span>
                  <code className="text-white text-sm font-mono truncate max-w-[250px]">
                    {api.endpoint}
                  </code>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-white transition-colors ml-3 mt-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              <div
                className={`rounded-xl border bg-gradient-to-br p-4 ${RISK_BG(api.risk_score)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      size={15}
                      className={
                        api.risk_score >= 0.5
                          ? "text-red-400"
                          : "text-emerald-400"
                      }
                    />
                    <span className="text-white font-semibold text-sm">
                      Risk Analysis
                    </span>
                  </div>
                  <span
                    className={`text-2xl font-bold ${STATUS_COLORS[api.status]}`}
                  >
                    {(api.risk_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-2 mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${api.risk_score * 100}%` }}
                    transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                    className={`h-2 rounded-full ${api.risk_score >= 0.8 ? "bg-red-500" : api.risk_score >= 0.5 ? "bg-yellow-500" : "bg-emerald-500"}`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black/20 rounded-lg p-2.5 text-center">
                    <div className="text-slate-400 text-[10px] mb-1 flex items-center justify-center gap-1">
                      <TrendingUp size={10} /> Error Rate
                    </div>
                    <div className="text-white font-bold text-sm">
                      {api.error_rate?.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2.5 text-center">
                    <div className="text-slate-400 text-[10px] mb-1 flex items-center justify-center gap-1">
                      <Clock size={10} /> Inactive
                    </div>
                    <div className="text-white font-bold text-sm">
                      {api.inactive_days}d
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2.5 text-center">
                    <div className="text-slate-400 text-[10px] mb-1 flex items-center justify-center gap-1">
                      <Zap size={10} /> Calls
                    </div>
                    <div className="text-white font-bold text-sm">
                      {api.calls?.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20">
                  <div
                    className={`w-2 h-2 rounded-full ${api.status === "Critical" ? "bg-red-500 animate-pulse" : api.status === "Zombie" ? "bg-slate-400" : api.status === "Suspicious" ? "bg-yellow-500" : "bg-emerald-500"}`}
                  />
                  <span
                    className={`text-sm font-semibold ${STATUS_COLORS[api.status]}`}
                  >
                    {api.status}
                  </span>
                </div>
              </div>

              <div className="glass rounded-xl border border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-cyan-400" />
                  <span className="text-white font-semibold text-sm">
                    Why Flagged
                  </span>
                </div>
                <ul className="space-y-2">
                  {api.error_rate > 5 && (
                    <li className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-red-400 mt-0.5">•</span>High error
                      rate ({api.error_rate?.toFixed(1)}%)
                    </li>
                  )}
                  {api.inactive_days > 30 && (
                    <li className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-yellow-400 mt-0.5">•</span>No
                      traffic for {api.inactive_days} days
                    </li>
                  )}
                  {api.response_time > 500 && (
                    <li className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-orange-400 mt-0.5">•</span>Slow
                      response time ({api.response_time}ms)
                    </li>
                  )}
                  {api.similarity >= 80 && (
                    <li className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-purple-400 mt-0.5">•</span>
                      {api.similarity}% behavioral similarity with another
                      endpoint
                    </li>
                  )}
                  {api.risk_score < 0.5 && (
                    <li className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-emerald-400 mt-0.5">•</span>No
                      significant anomalies detected
                    </li>
                  )}
                </ul>
              </div>

              {api.similar_api && (
                <div className="glass rounded-xl border border-purple-500/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Fingerprint size={14} className="text-purple-400" />
                    <span className="text-white font-semibold text-sm">
                      Fingerprint Insights
                    </span>
                    {api.relationship && (
                      <span
                        className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${RELATIONSHIP_INFO[api.relationship]?.color || ""}`}
                      >
                        {api.relationship}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-xs">
                        Similar Endpoint
                      </span>
                      <span className="text-cyan-400 font-bold text-sm">
                        {api.similarity}%
                      </span>
                    </div>
                    <code className="text-indigo-300 text-xs font-mono">
                      {api.similar_api}
                    </code>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {api.relationship
                      ? RELATIONSHIP_INFO[api.relationship]?.desc
                      : "Similar behavior detected in response time and usage patterns."}
                  </p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
