import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, AlertTriangle, ShieldAlert, Info, Clock, Server, Fingerprint, Crosshair } from "lucide-react";

export default function ApiDetailsPanel({ api, onClose }) {
  if (!api) return null;

  // AI Explainability Heuristics
  const insights = [];
  if (api.is_zombie) {
    insights.push({ icon: <Clock size={16} />, title: "Zombie Endpoint", text: "API is active but receives extremely low traffic, indicating a forgotten legacy endpoint.", color: "text-orange-400" });
  }
  if (api.error_rate > 0.5) {
    insights.push({ icon: <AlertTriangle size={16} />, title: "Error Spike", text: `Abnormally high error rate (${(api.error_rate * 100).toFixed(1)}%). Possible brute force or broken integration.`, color: "text-red-400" });
  }
  if (api.avg_response_time > 300) {
    insights.push({ icon: <Server size={16} />, title: "Resource Exhaustion", text: "Performance anomaly: Response time is unusually high, potentially indicating DoS.", color: "text-yellow-400" });
  }
  if (api.is_shadow_api) {
    insights.push({ icon: <Fingerprint size={16} />, title: "Shadow API Detected", text: "This endpoint shares an exact behavioral signature with another API, suggesting unauthorized duplication.", color: "text-purple-400" });
  }
  if (insights.length === 0) {
    insights.push({ icon: <Info size={16} />, title: "Baseline Normal", text: "Behavior matches expected network baseline patterns.", color: "text-emerald-400" });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-[450px] bg-[#0f172a]/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className={api.risk_score > 75 ? "text-red-500" : "text-emerald-500"} />
              Endpoint Analysis
            </h2>
            <p className="text-sm font-mono text-slate-400 mt-1 truncate max-w-[300px]">{api.endpoint}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* ML Score Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 text-center">
            <div className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-2">Isolation Forest Risk Score</div>
            <div className={`text-5xl font-black ${api.risk_score > 75 ? 'text-red-500' : api.risk_score > 50 ? 'text-orange-500' : 'text-emerald-500'}`}>
              {api.risk_score.toFixed(0)}<span className="text-xl text-slate-600">/100</span>
            </div>
            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 uppercase">
              {api.risk_level} Risk Level
            </div>
          </div>

          {/* Explainability Engine */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} className="text-indigo-400"/> AI Engine Insights
            </h3>
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex gap-3 bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
                  <div className={`mt-0.5 ${insight.color}`}>{insight.icon}</div>
                  <div>
                    <div className={`text-sm font-bold ${insight.color}`}>{insight.title}</div>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">{insight.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Behavioral Deviations */}
          {api.deviations && (
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Crosshair size={16} className="text-indigo-400"/> Behavioral Deviations
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <DeviationStat label="Latency" val={api.deviations.latency_dev} />
                <DeviationStat label="Error Rate" val={api.deviations.error_dev} />
                <DeviationStat label="Traffic" val={api.deviations.traffic_dev} />
              </div>
              <div className="mt-4 p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase font-bold">Behavioral Signature</span>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{api.fingerprint}</span>
              </div>
            </div>
          )}

          {/* Raw Telemetry */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Raw Telemetry</h3>
            <div className="grid grid-cols-2 gap-3">
              <TelemetryStat label="Avg Latency" value={`${api.avg_response_time.toFixed(0)} ms`} />
              <TelemetryStat label="Error Rate" value={`${(api.error_rate * 100).toFixed(1)}%`} isWarning={api.error_rate > 0.5} />
              <TelemetryStat label="Traffic Freq" value={`${api.daily_calls.toFixed(1)} /day`} />
              <TelemetryStat label="Days Active" value={api.days_active} />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function DeviationStat({ label, val }) {
  const isPositive = val > 0;
  const color = isPositive ? 'text-red-400' : 'text-emerald-400';
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-2 rounded-lg text-center">
      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{label}</div>
      <div className={`text-sm font-mono font-bold ${color}`}>{isPositive ? '+' : ''}{val}%</div>
    </div>
  );
}

function TelemetryStat({ label, value, isWarning }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-mono font-semibold ${isWarning ? 'text-red-400' : 'text-slate-200'}`}>{value}</div>
    </div>
  );
}