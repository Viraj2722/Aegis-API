"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  Fingerprint,
  Info,
  TrendingUp,
  Clock,
  Zap,
  ShieldCheck,
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
    color: "text-green-400 bg-green-500/15",
    desc: "Undocumented API behaving similarly to a known endpoint.",
  },
};

export default function ApiDetailPanel({
  api,
  onClose,
  mitigation,
  mitigationLoading,
  mitigationError,
}) {
  useEffect(() => {
    if (mitigation?.llm_error) {
      console.error("AI mitigation error:", mitigation.llm_error);
      if (mitigation.llm_error_body) {
        console.error("AI mitigation error body:", mitigation.llm_error_body);
      }
    }
  }, [mitigation]);

  const normalizedSteps =
    (Array.isArray(mitigation?.mitigation_steps)
      ? mitigation.mitigation_steps.filter(
          (step) => typeof step === "string" && step.trim(),
        )
      : []) ||
    (Array.isArray(mitigation?.mitigations)
      ? mitigation.mitigations.flatMap((item) =>
          (item?.steps || []).filter(
            (step) => typeof step === "string" && step.trim(),
          ),
        )
      : []) ||
    [];

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
                  <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
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
                      <span className="text-green-400 mt-0.5">•</span>
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

              <div className="glass rounded-xl border border-cyan-500/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={14} className="text-cyan-400" />
                  <span className="text-white font-semibold text-sm">
                    AI Mitigation Techniques
                  </span>
                </div>

                {mitigationLoading && (
                  <p className="text-xs text-slate-400">
                    Generating mitigation guidance...
                  </p>
                )}

                {!mitigationLoading && mitigationError && (
                  <p className="text-xs text-red-300">{mitigationError}</p>
                )}

                {!mitigationLoading && !mitigationError && !mitigation && (
                  <p className="text-xs text-slate-400">
                    No mitigation guidance loaded yet.
                  </p>
                )}

                {!mitigationLoading && !mitigationError && mitigation && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/50 border border-slate-700/60 px-3 py-2">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        Source
                      </span>
                      <span className="text-[11px] font-semibold text-cyan-300">
                        {mitigation.source || "generated"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/50 border border-slate-700/60 px-3 py-2">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        Endpoint
                      </span>
                      <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[210px]">
                        {mitigation.endpoint || api.endpoint}
                      </span>
                    </div>

                    {mitigation.summary && (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {mitigation.summary}
                      </p>
                    )}

                    {(mitigation.why_flagged || []).length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                          Why Flagged
                        </p>
                        <ul className="space-y-1.5">
                          {mitigation.why_flagged.map((reason, idx) => (
                            <li
                              key={`${reason}-${idx}`}
                              className="flex items-start gap-2 text-xs text-slate-300"
                            >
                              <span className="text-cyan-400 mt-0.5">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {Array.isArray(mitigation.mitigations) &&
                    mitigation.mitigations.length > 0 ? (
                      <div className="space-y-2.5">
                        {mitigation.mitigations.map((item, idx) => (
                          <div
                            key={`${item.title || "mitigation"}-${idx}`}
                            className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-2.5"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-xs text-white font-semibold">
                                {item.title || "Mitigation"}
                              </p>
                              {item.priority && (
                                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                                  {item.priority}
                                </span>
                              )}
                            </div>
                            {item.why && (
                              <p className="text-[11px] text-slate-400 mb-1.5">
                                {item.why}
                              </p>
                            )}
                            {(item.steps || []).length > 0 && (
                              <ul className="space-y-1">
                                {item.steps.map((step, sidx) => (
                                  <li
                                    key={`${step}-${sidx}`}
                                    className="text-xs text-slate-300 leading-relaxed"
                                  >
                                    {sidx + 1}. {step}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No mitigation techniques available yet.
                      </p>
                    )}

                    {normalizedSteps.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                          Mitigation Steps
                        </p>
                        <ul className="space-y-1.5">
                          {normalizedSteps.map((step, idx) => (
                            <li
                              key={`${step}-${idx}`}
                              className="text-xs text-slate-300 leading-relaxed"
                            >
                              {idx + 1}. {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {normalizedSteps.length === 0 &&
                      Array.isArray(mitigation.mitigations) &&
                      mitigation.mitigations.length > 0 && (
                        <p className="text-xs text-slate-400">
                          The LLM returned mitigation techniques but no
                          flattened step list.
                        </p>
                      )}
                  </div>
                )}
              </div>

              {api.similar_api && (
                <div className="glass rounded-xl border border-green-500/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Fingerprint size={14} className="text-green-400" />
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
                    <code className="text-emerald-300 text-xs font-mono">
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
