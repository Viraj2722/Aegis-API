"use client";

import { useState, useEffect, useCallback } from "react";
import { useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Upload, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import Navbar from "../../components/dashboard/Navbar";
import StatCards from "../../components/dashboard/StatCards";
import ApiTable from "../../components/dashboard/ApiTable";
import ApiDetailPanel from "../../components/dashboard/ApiDetailPanel";
import ApiGraph from "../../components/dashboard/ApiGraph";
import AttackSimulationGraph from "../../components/dashboard/AttackSimulationGraph";
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

const DEMO_LOGS = [
  {
    api: "/api/auth/login",
    method: "POST",
    response_code: 200,
    response_time: 280,
    payload_size: 1240,
    timestamp: "2026-04-15T10:11:00Z",
  },
  {
    api: "/api/auth/login",
    method: "POST",
    response_code: 401,
    response_time: 390,
    payload_size: 1320,
    timestamp: "2026-04-15T10:14:00Z",
  },
  {
    api: "/api/auth/login",
    method: "POST",
    response_code: 200,
    response_time: 260,
    payload_size: 1210,
    timestamp: "2026-04-15T10:18:00Z",
  },
  {
    api: "/api/users",
    method: "GET",
    response_code: 200,
    response_time: 180,
    payload_size: 3400,
    timestamp: "2026-04-16T08:02:00Z",
  },
  {
    api: "/api/users",
    method: "GET",
    response_code: 500,
    response_time: 920,
    payload_size: 3600,
    timestamp: "2026-04-16T08:05:00Z",
  },
  {
    api: "/api/users",
    method: "GET",
    response_code: 200,
    response_time: 210,
    payload_size: 3450,
    timestamp: "2026-04-16T08:07:00Z",
  },
  {
    api: "/api/payments/charge",
    method: "POST",
    response_code: 200,
    response_time: 560,
    payload_size: 980,
    timestamp: "2026-04-16T12:11:00Z",
  },
  {
    api: "/api/payments/charge",
    method: "POST",
    response_code: 502,
    response_time: 1300,
    payload_size: 1020,
    timestamp: "2026-04-16T12:12:00Z",
  },
  {
    api: "/api/payments/charge",
    method: "POST",
    response_code: 504,
    response_time: 1480,
    payload_size: 1100,
    timestamp: "2026-04-16T12:13:00Z",
  },
  {
    api: "/api/internal/debug",
    method: "GET",
    response_code: 200,
    response_time: 640,
    payload_size: 2200,
    timestamp: "2026-02-01T09:20:00Z",
  },
  {
    api: "/api/internal/debug",
    method: "GET",
    response_code: 200,
    response_time: 690,
    payload_size: 2300,
    timestamp: "2026-02-01T09:25:00Z",
  },
  {
    api: "/api/reports/export",
    method: "GET",
    response_code: 200,
    response_time: 980,
    payload_size: 7800,
    timestamp: "2026-04-16T15:41:00Z",
  },
  {
    api: "/api/reports/export",
    method: "GET",
    response_code: 200,
    response_time: 1120,
    payload_size: 8000,
    timestamp: "2026-04-16T15:42:00Z",
  },
  {
    api: "/api/reports/export",
    method: "GET",
    response_code: 429,
    response_time: 870,
    payload_size: 7600,
    timestamp: "2026-04-16T15:43:00Z",
  },
];

function buildStatus(api) {
  const level = String(api.risk_level || "").toUpperCase();
  const numericRisk = Number(api.risk_score || 0);
  const normalizedRisk = numericRisk > 1 ? numericRisk / 100 : numericRisk;
  if (level === "CRITICAL") return "Critical";
  if (normalizedRisk >= 0.8) return "Critical";
  if (api.is_zombie) return "Zombie";
  if (level === "HIGH" || level === "MEDIUM") return "Suspicious";
  if (normalizedRisk >= 0.5) return "Suspicious";
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

function statusToRiskLevel(status) {
  if (status === "Critical") return "CRITICAL";
  if (status === "Suspicious") return "HIGH";
  if (status === "Zombie") return "MEDIUM";
  return "LOW";
}

function classifyTrafficPattern(calls = 0, responseTime = 0) {
  if (calls >= 120 || responseTime >= 900) return "BURST";
  if (calls >= 40) return "STEADY";
  return "LOW";
}

function buildSimulationData(rawApis, rawEdges) {
  const apis = (rawApis || []).map((row) => {
    const apiName = row.endpoint || row.api || "unknown";
    const status = row.status || buildStatus(row);
    const calls = Number(row.call_count ?? row.calls ?? 0);
    const responseTime = Number(
      row.avg_response_time ?? row.response_time ?? 0,
    );
    return {
      api: apiName,
      risk_level: String(
        row.risk_level || statusToRiskLevel(status),
      ).toUpperCase(),
      error_rate: Number(row.error_rate ?? 0),
      anomaly:
        row.anomaly === -1 || row.anomaly === 1
          ? row.anomaly
          : status === "Critical" || status === "Suspicious"
            ? -1
            : 1,
      traffic_pattern:
        row.traffic_pattern || classifyTrafficPattern(calls, responseTime),
      risk_score: Number(
        (row.risk_score ?? 0) / (row.risk_score > 1 ? 100 : 1),
      ),
    };
  });

  const edges = (rawEdges || [])
    .map((e) => ({ source: e.source, target: e.target }))
    .filter(
      (e) =>
        e.source &&
        e.target &&
        e.source !== "gateway" &&
        e.target !== "gateway",
    );

  if (edges.length > 0) {
    return { apis, edges };
  }

  // Fallback chain from highest risk to keep simulation meaningful when no graph edges exist.
  const riskWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sorted = [...apis].sort(
    (a, b) =>
      (riskWeight[b.risk_level] || 0) - (riskWeight[a.risk_level] || 0) ||
      (b.risk_score || 0) - (a.risk_score || 0),
  );

  const inferredEdges = sorted
    .map((a, idx) =>
      idx < sorted.length - 1
        ? {
            source: a.api,
            target: sorted[idx + 1].api,
          }
        : null,
    )
    .filter(Boolean);

  return {
    apis,
    edges: inferredEdges,
  };
}

function buildDemoDashboardFromLogs(logRows) {
  const now = Date.now();
  const groups = new Map();

  for (const row of logRows || []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const endpoint = String(row.api || row.endpoint || row.path || "").trim();
    if (!endpoint) continue;
    const method = String(row.method || "GET").toUpperCase();
    const key = `${method} ${endpoint}`;
    const ts = new Date(row.timestamp || now).getTime();
    const responseCode = Number(row.response_code ?? 200);
    const responseTime = Number(row.response_time ?? 0);

    if (!groups.has(key)) {
      groups.set(key, {
        endpoint,
        method,
        call_count: 0,
        error_count: 0,
        total_response_time: 0,
        last_seen_ts: 0,
      });
    }

    const g = groups.get(key);
    g.call_count += 1;
    g.total_response_time += Number.isFinite(responseTime) ? responseTime : 0;
    if (Number.isFinite(responseCode) && responseCode >= 400) {
      g.error_count += 1;
    }
    if (Number.isFinite(ts)) {
      g.last_seen_ts = Math.max(g.last_seen_ts, ts);
    }
  }

  const apis = Array.from(groups.values()).map((g) => {
    const errorRate = g.call_count > 0 ? g.error_count / g.call_count : 0;
    const avgResponseTime =
      g.call_count > 0 ? g.total_response_time / g.call_count : 0;
    const inactiveDays = g.last_seen_ts
      ? Math.floor((now - g.last_seen_ts) / (1000 * 60 * 60 * 24))
      : 0;

    const isZombie = inactiveDays >= 30;
    const isShadow = /(internal|debug|shadow)/i.test(g.endpoint);

    let riskScore = 0.08;
    if (errorRate >= 0.4) riskScore += 0.5;
    else if (errorRate >= 0.2) riskScore += 0.35;
    else if (errorRate >= 0.1) riskScore += 0.2;

    if (avgResponseTime >= 1200) riskScore += 0.35;
    else if (avgResponseTime >= 700) riskScore += 0.22;
    else if (avgResponseTime >= 400) riskScore += 0.12;

    if (isZombie) riskScore += 0.3;
    if (isShadow) riskScore += 0.18;

    riskScore = Math.max(0, Math.min(1, riskScore));

    let status = "Normal";
    if (riskScore >= 0.8) status = "Critical";
    else if (isZombie) status = "Zombie";
    else if (riskScore >= 0.5) status = "Suspicious";

    return {
      id: g.endpoint,
      endpoint: g.endpoint,
      method: g.method,
      risk_score: riskScore,
      status,
      error_rate: errorRate * 100,
      inactive_days: inactiveDays,
      calls: g.call_count,
      response_time: avgResponseTime,
      similar_api: null,
      similarity: null,
      relationship: isShadow ? "Shadow" : null,
    };
  });

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
    links: apis
      .filter((a) => a.status === "Critical" || a.status === "Suspicious")
      .slice(0, 4)
      .map((a, i, arr) =>
        i < arr.length - 1
          ? {
              source: arr[i].id,
              target: arr[i + 1].id,
              type: "fingerprint",
              label: "Risk path",
            }
          : null,
      )
      .filter(Boolean),
  };

  const alerts = apis
    .filter((a) => a.status === "Critical" || a.status === "Suspicious")
    .slice(0, 6)
    .map((a, idx) => ({
      id: `demo-alert-${idx}`,
      read: false,
      severity: a.status === "Critical" ? "high" : "medium",
      message: `${a.status} risk on ${a.endpoint}`,
      time: "just now",
    }));

  return { apis, stats, graphData, alerts };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, isDemoMode, isAdmin } = useAuth();
  const uploadInputRef = useRef(null);
  const [demoLogs, setDemoLogs] = useState(DEMO_LOGS);
  const [apis, setApis] = useState([]);
  const [stats, setStats] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [simulationData, setSimulationData] = useState({ apis: [], edges: [] });
  const [alerts, setAlerts] = useState([]);
  const [selectedApi, setSelectedApi] = useState(null);
  const [selectedMitigation, setSelectedMitigation] = useState(null);
  const [selectedMitigationLoading, setSelectedMitigationLoading] =
    useState(false);
  const [selectedMitigationError, setSelectedMitigationError] = useState("");
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
    if (isDemoMode) {
      const demoData = buildDemoDashboardFromLogs(demoLogs);
      setApis(demoData.apis);
      setStats(demoData.stats);
      setGraphData(demoData.graphData);
      setSimulationData(
        buildSimulationData(
          demoData.apis.map((a) => ({
            endpoint: a.endpoint,
            risk_level: statusToRiskLevel(a.status),
            error_rate: (a.error_rate || 0) / 100,
            call_count: a.calls,
            avg_response_time: a.response_time,
            risk_score: a.risk_score,
            status: a.status,
          })),
          demoData.graphData.links,
        ),
      );
      setAlerts(demoData.alerts);
      updateLastUpdated();
      setLoading(false);
      return;
    }

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
      setSimulationData(
        buildSimulationData(
          analysisRes.data?.api_data || [],
          graphRes.data?.edges || [],
        ),
      );
      setAlerts(formatAlerts(alertsRes.data?.alerts));
      updateLastUpdated();
    } catch (error) {
      setApis([]);
      setStats({
        total_apis: 0,
        zombie_apis: 0,
        critical_apis: 0,
        duplicate_apis: 0,
        shadow_apis: 0,
      });
      setGraphData({ nodes: [], links: [] });
      setSimulationData({ apis: [], edges: [] });
      setAlerts([]);
      updateLastUpdated();
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to fetch analysis data";
      addToast(msg, "high");
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, demoLogs, updateLastUpdated, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isDemoMode && isAdmin) {
      router.replace("/admin");
    }
  }, [isDemoMode, isAdmin, router]);

  useEffect(() => {
    if (isDemoMode) return;
    refreshProfile();
  }, [isDemoMode, refreshProfile]);

  const isProfileComplete =
    isDemoMode || (!!profile?.role?.trim() && !!profile?.country?.trim());

  useEffect(() => {
    let active = true;

    const loadMitigation = async () => {
      if (!selectedApi?.endpoint) {
        setSelectedMitigation(null);
        setSelectedMitigationLoading(false);
        setSelectedMitigationError("");
        return;
      }

      setSelectedMitigationLoading(true);
      setSelectedMitigationError("");
      setSelectedMitigation(null);

      try {
        const response = await api.post("/mitigations/generate", {
          endpoint: selectedApi.endpoint,
          method: selectedApi.method,
        });

        if (!active) return;
        setSelectedMitigation(response.data || null);
      } catch (error) {
        if (!active) return;
        setSelectedMitigationError(
          error?.response?.data?.detail ||
            error?.message ||
            "Unable to generate mitigation techniques",
        );
      } finally {
        if (active) {
          setSelectedMitigationLoading(false);
        }
      }
    };

    loadMitigation();

    return () => {
      active = false;
    };
  }, [selectedApi?.endpoint, selectedApi?.method]);

  const handleUploadClick = () => {
    if (!isProfileComplete) {
      addToast(
        "You must complete your profile before uploading logs",
        "medium",
      );
      router.push("/profile");
      return;
    }
    uploadInputRef.current?.click();
  };

  const handleUploadChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (isDemoMode) {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          throw new Error("JSON must be an array of log records.");
        }
        const hasInvalidRecord = parsed.some(
          (row) => !row || typeof row !== "object" || Array.isArray(row),
        );
        if (hasInvalidRecord) {
          throw new Error("Each log entry must be an object.");
        }
        const demoData = buildDemoDashboardFromLogs(parsed);
        setDemoLogs(parsed);
        setApis(demoData.apis);
        setStats(demoData.stats);
        setGraphData(demoData.graphData);
        setSimulationData(
          buildSimulationData(
            demoData.apis.map((a) => ({
              endpoint: a.endpoint,
              risk_level: statusToRiskLevel(a.status),
              error_rate: (a.error_rate || 0) / 100,
              call_count: a.calls,
              avg_response_time: a.response_time,
              risk_score: a.risk_score,
              status: a.status,
            })),
            demoData.graphData.links,
          ),
        );
        setAlerts(demoData.alerts);
        addToast(
          `Demo mode: loaded ${parsed.length} log records into dashboard`,
          "success",
        );
        updateLastUpdated();
        return;
      }

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
                <span className="text-emerald-400 font-medium">
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
                className="flex items-center gap-1.5 px-3 py-2 glass rounded-lg text-sm text-slate-300 hover:text-white border border-slate-700/60 hover:border-emerald-500/40 transition-all"
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
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium transition-all glow-blue disabled:opacity-60 disabled:cursor-not-allowed"
                title="Upload API logs"
              >
                <Upload size={13} />
                {uploading ? "Uploading..." : "Upload Logs"}
              </button>
            </div>
          </motion.div>

          {!isProfileComplete && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-300 text-sm">
              Complete your profile (role and country) to enable log uploads.
            </div>
          )}

          {isDemoMode && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-4 py-3 text-cyan-300 text-sm">
              Demo mode: uploads are validated locally and not saved to backend.
            </div>
          )}

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
            {["table", "graph", "attack"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {t === "table"
                  ? "API Table"
                  : t === "graph"
                    ? "Graph View"
                    : "Attack Simulation"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="glass rounded-xl border border-slate-800/60 p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
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
          ) : tab === "graph" ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {graphData && (
                <ApiGraph
                  graphData={graphData}
                  clusterMode={clusterMode}
                  onToggleCluster={() => setClusterMode((c) => !c)}
                />
              )}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AttackSimulationGraph simulationData={simulationData} />
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
          mitigation={selectedMitigation}
          mitigationLoading={selectedMitigationLoading}
          mitigationError={selectedMitigationError}
          onClose={() => setSelectedApi(null)}
        />
        <Toast toasts={toasts} remove={removeToast} />
      </div>
    </ProtectedRoute>
  );
}
