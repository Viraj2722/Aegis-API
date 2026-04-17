"use client";

import { useState, useEffect, useCallback } from "react";
import { useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Upload, Database } from "lucide-react";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import Navbar from "../../components/dashboard/Navbar";
import StatCards from "../../components/dashboard/StatCards";
import ApiTable from "../../components/dashboard/ApiTable";
import ApiDetailPanel from "../../components/dashboard/ApiDetailPanel";
import ApiGraph from "../../components/dashboard/ApiGraph";
import AlertBanner from "../../components/dashboard/AlertBanner";
import { Toast, useToasts } from "../../components/dashboard/Toast";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { uploadLogFile } from "../../utils/logUpload";

const DEMO_TOKEN = "demo_token";
const isDemo = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("aegis_token") === DEMO_TOKEN
    : false;

function buildStatus(api) {
  const level = String(api.risk_level || "").toUpperCase();
  if (level === "CRITICAL") return "Critical";
  if (api.is_zombie) return "Zombie";
  if (level === "HIGH" || level === "MEDIUM")
    return "Suspicious";
  return "Normal";
}

function formatAlerts(alertRows) {
  return (alertRows || []).map((a) => ({
    id: a.id,
    read: false,
    severity: String(a.severity || "medium").toLowerCase(),
    message: a.title || a.description || "Risk alert",
    time: "just now",
  }));
}

function transformAnalysisToDashboard(analysis) {
  const rawApis = analysis?.api_data || [];

  const apis = rawApis.map((row) => ({
    id: row.endpoint,
    endpoint: row.endpoint,
    method: row.method || (row.endpoint?.includes("/auth") ? "POST" : "GET"),
    risk_score: Math.max(0, Math.min(1, (row.risk_score || 0) / 100)),
    status: buildStatus(row),
    error_rate: (row.error_rate || 0) * 100,
    inactive_days: row.days_inactive || 0,
    calls: row.call_count || 0,
    response_time: row.avg_response_time || 0,
    similar_api: null,
    similarity: null,
    relationship: row.is_shadow_api ? "Shadow" : null,
  }));

  const stats = {
    total_apis: apis.length,
    zombie_apis: apis.filter((a) => a.status === "Zombie").length,
    critical_apis: apis.filter((a) => a.status === "Critical").length,
    duplicate_apis: apis.filter((a) => a.relationship === "Duplicate").length,
    shadow_apis: apis.filter((a) => a.relationship === "Shadow").length,
  };

  const graphData = {
    nodes: apis.map((a) => ({
      id: a.id,
      name: a.endpoint,
      val: a.risk_score * 10 + 3,
      status: a.status,
      risk: a.risk_score,
    })),
    links: [],
  };

  return { apis, stats, graphData };
}

function mapLinksForGraph(rawEdges) {
  return (rawEdges || [])
    .filter((e) => e.source !== "gateway" && e.target !== "gateway")
    .map((e) => ({
      source: e.source,
      target: e.target,
      type:
        e.data?.is_kill_chain || e.data?.is_risky
          ? "fingerprint"
          : "connection",
      label: e.data?.is_kill_chain ? "Risk path" : undefined,
    }));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const uploadInputRef = useRef(null);
  const [apis, setApis] = useState([]);
  const [stats, setStats] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedApi, setSelectedApi] = useState(null);
  const [clusterMode, setClusterMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [tab, setTab] = useState("table");
  const [uploading, setUploading] = useState(false);
  const { toasts, add: addToast, remove: removeToast } = useToasts();

  const updateLastUpdated = useCallback(() => {
    setLastUpdated("just now");
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisRes, graphRes, alertsRes] = await Promise.all([
        api.get("/analysis"),
        api.get("/graph"),
        api.get("/alerts"),
      ]);
      const transformed = transformAnalysisToDashboard(analysisRes.data);

      transformed.graphData.links = mapLinksForGraph(graphRes.data?.edges);

      setApis(transformed.apis);
      setStats(transformed.stats);
      setGraphData(transformed.graphData);
      setAlerts(formatAlerts(alertsRes.data?.alerts));
      updateLastUpdated();
    } catch {
      setApis([]);
      setStats({
        total_apis: 0,
        zombie_apis: 0,
        critical_apis: 0,
        duplicate_apis: 0,
        shadow_apis: 0,
      });
      setGraphData({ nodes: [], links: [] });
      setAlerts([]);
      updateLastUpdated();
    } finally {
      setLoading(false);
    }
  }, [updateLastUpdated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      addToast("New anomaly detected in API traffic", "high");
    }, 8000);
    return () => clearTimeout(timer);
  }, [addToast]);

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleUploadChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadLogFile(file, api);
      await fetchData();
      addToast(`Uploaded ${result.count} log records`, "success");
    } catch (error) {
      addToast(error?.message || "Log upload failed", "high");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#020817] bg-grid">
        <Navbar alerts={alerts} lastUpdated={lastUpdated} />

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between flex-wrap gap-3"
          >
            <div>
              <h1 className="text-2xl font-bold text-white">
                API Intelligence Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Welcome back,{" "}
                <span className="text-indigo-400 font-medium">
                  {user?.name}
                </span>
                {isDemo() && (
                  <span className="ml-2 text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-full">
                    Demo Mode
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={uploadInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleUploadChange}
              />
              <button
                onClick={() => {
                  fetchData();
                  addToast("Refreshing analysis data...", "medium");
                }}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 glass rounded-lg text-sm text-slate-300 hover:text-white border border-slate-700/60 hover:border-indigo-500/40 transition-all"
              >
                <RefreshCw
                  size={13}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium transition-all glow-blue disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Upload size={13} />
                {uploading ? "Uploading..." : "Upload Logs"}
              </button>
            </div>
          </motion.div>

          <AlertBanner stats={stats} />

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="glass rounded-xl p-4 border border-slate-800/60 animate-pulse"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-800 mb-3" />
                  <div className="h-8 w-12 bg-slate-800 rounded mb-2" />
                  <div className="h-3 w-20 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <StatCards stats={stats} />
          )}

          <div className="flex items-center gap-1 p-1 glass rounded-xl border border-slate-800/60 w-fit">
            {["table", "graph"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {t === "table" ? "API Table" : "Graph View"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="glass rounded-xl border border-slate-800/60 p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Analyzing APIs...</p>
              </div>
            </div>
          ) : tab === "table" ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ApiTable
                apis={apis}
                onSelect={setSelectedApi}
                selected={selectedApi}
              />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {graphData && (
                <ApiGraph
                  graphData={graphData}
                  clusterMode={clusterMode}
                  onToggleCluster={() => setClusterMode((c) => !c)}
                />
              )}
            </motion.div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-600 pb-4">
            <div className="flex items-center gap-1.5">
              <Database size={11} />
              {`${apis.length} endpoints monitored`}
            </div>
            <span>Last updated: {lastUpdated}</span>
          </div>
        </main>

        <ApiDetailPanel
          api={selectedApi}
          onClose={() => setSelectedApi(null)}
        />
        <Toast toasts={toasts} remove={removeToast} />
      </div>
    </ProtectedRoute>
  );
}
