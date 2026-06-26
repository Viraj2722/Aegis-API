"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Bot,
  Globe,
  Activity,
  AlertTriangle,
  Flame,
  Database,
  ShieldCheck,
  Bell,
  LogOut,
  X,
  RefreshCw,
} from "lucide-react";

import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/admin-dashboard/StatCard";
import {
  ThreatDonut,
  APICategories,
  LogsLineChart,
  LatencyGauge,
  ProfessionBar,
} from "../../components/admin-dashboard/RiskChart";
import Heatmap from "../../components/admin-dashboard/Heatmap";
import AgentStatus from "../../components/admin-dashboard/AgentStatus";
import PrivacyPanel from "../../components/admin-dashboard/PrivacyPanel";
import HelpPanel from "../../components/admin-dashboard/HelpPanel";
import BrandLogo from "../../components/BrandLogo";
import {
  globalStats as defaultGlobalStats,
  ingestionStats as defaultIngestionStats,
  ingestionData as defaultIngestionData,
  threatData as defaultThreatData,
  riskMatrixData as defaultRiskMatrixData,
  professionData as defaultProfessionData,
  agentsData as defaultAgentsData,
} from "../../components/admin-dashboard/data/mockData";

function Section({ title, icon: Icon, children }) {
  return (
    <div className="glass p-6 lg:p-8 space-y-6 rounded-2xl border border-slate-800/50">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-sky-400" />
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Navbar({ setHelpOpen, onSignOut }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-[#050a14]/90 backdrop-blur-lg">
      <div className="max-w-[1400px] mx-auto px-8 lg:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" href="/admin" />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg hover:bg-white/5" aria-label="Notifications">
            <Bell size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => setHelpOpen(true)}
            className="text-xs px-4 py-2 border border-slate-700 rounded-lg text-sky-300 hover:bg-white/5"
          >
            Help
          </button>

          <button
            onClick={onSignOut}
            className="text-xs px-4 py-2 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/10 inline-flex items-center gap-1.5"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function HelpDrawer({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />}

      <motion.div
        className="fixed right-0 top-0 h-full w-80 bg-[#060d1a] z-50 p-8 overflow-y-auto border-l border-slate-700/40"
        initial={{ x: "100%" }}
        animate={{ x: open ? 0 : "100%" }}
      >
        <div className="flex justify-between mb-8">
          <span className="text-white font-semibold">Help</span>
          <button onClick={onClose} aria-label="Close help">
            <X className="text-slate-400" />
          </button>
        </div>

        <HelpPanel />
      </motion.div>
    </>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const { isAdmin, isReady, logout, user } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [globalStats, setGlobalStats] = useState(defaultGlobalStats);
  const [ingestionStats, setIngestionStats] = useState(defaultIngestionStats);
  const [threatData, setThreatData] = useState(defaultThreatData);
  const [riskMatrixData, setRiskMatrixData] = useState(defaultRiskMatrixData);
  const [professionData, setProfessionData] = useState(defaultProfessionData);
  const [agentsData, setAgentsData] = useState(defaultAgentsData);
  const [ingestionData, setIngestionData] = useState(defaultIngestionData);
  const [usersDetails, setUsersDetails] = useState([]);
  const initialFetchDoneRef = useRef(false);

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  const fetchAdminData = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = user?.id ? await getAuthToken() : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [statsRes, riskRes, categoriesRes, healthRes, heatmapRes, professionRes, agentsRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }).catch(() => ({})),
        fetch("/api/admin/risk-distribution", { headers }).catch(() => ({})),
        fetch("/api/admin/api-categories", { headers }).catch(() => ({})),
        fetch("/api/admin/system-health", { headers }).catch(() => ({})),
        fetch("/api/admin/heatmap", { headers }).catch(() => ({})),
        fetch("/api/admin/user-distribution", { headers }).catch(() => ({})),
        fetch("/api/admin/agents", { headers }).catch(() => ({})),
        fetch("/api/admin/users", { headers }).catch(() => ({})),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setGlobalStats(data.globalStats || defaultGlobalStats);
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setIngestionStats(data.ingestionStats || defaultIngestionStats);
        setIngestionData(
          Array.isArray(data.ingestionData) && data.ingestionData.length > 0
            ? data.ingestionData
            : defaultIngestionData,
        );
      }

      if (riskRes.ok) {
        const riskData = await riskRes.json();
        const donut = riskData.threatData?.donut || defaultThreatData.donut;
        setThreatData((prev) => ({
          donut,
          categories: prev?.categories || defaultThreatData.categories,
        }));
      }

      if (categoriesRes.ok) {
        const catData = await categoriesRes.json();
        const categories = catData.threatData?.categories || defaultThreatData.categories;
        setThreatData((prev) => ({
          donut: prev?.donut || defaultThreatData.donut,
          categories,
        }));
      }

      if (heatmapRes.ok) {
        const data = await heatmapRes.json();
        setRiskMatrixData(data.riskMatrixData || defaultRiskMatrixData);
      }

      if (professionRes.ok) {
        const data = await professionRes.json();
        const profData = data.professionData || [];
        if (profData.length > 0) {
          setProfessionData(profData);
        }
      }

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        const agents = data?.agentsData;
        if (agents && Array.isArray(agents.agents)) {
          setAgentsData(agents);
        }
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        const users = Array.isArray(data?.users) ? data.users : [];
        setUsersDetails(users);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isReady || !isAdmin) return;
    setGlobalStats(defaultGlobalStats);
    setIngestionStats(defaultIngestionStats);
    setThreatData(defaultThreatData);
    setRiskMatrixData(defaultRiskMatrixData);
    setProfessionData(defaultProfessionData);
    setAgentsData(defaultAgentsData);
    setIngestionData(defaultIngestionData);
    setUsersDetails([]);
  }, [isReady, isAdmin]);

  useEffect(() => {
    if (!isReady || !isAdmin) return;
    if (initialFetchDoneRef.current) return;

    initialFetchDoneRef.current = true;
    fetchAdminData();
  }, [isReady, isAdmin, fetchAdminData]);

  useEffect(() => {
    if (!isReady) return;
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isReady, isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400">
        Checking admin access...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar setHelpOpen={setHelpOpen} onSignOut={handleSignOut} />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />

      <main className="max-w-[1400px] mx-auto px-8 lg:px-12 pt-8 pb-12 space-y-12">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Security Overview</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-slate-400">Mock data shown by default. Use refresh to pull live admin data.</p>
            <button
              onClick={fetchAdminData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-white/5 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
          <StatCard icon={Users} label="Users" value={globalStats.totalUsers} />
          <StatCard icon={Bot} label="Agents" value={globalStats.activeAgents} />
          <StatCard icon={Activity} label="Online" value={globalStats.onlineAgents} />
          <StatCard icon={Globe} label="Regions" value={globalStats.regionsCovered} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Section title="System Health" icon={Database}>
            <>
              <p className="text-3xl text-white">{ingestionStats.totalLogsAnalyzed.toLocaleString()}</p>
              <LatencyGauge value={ingestionStats.avgLatencyMs} max={100} />
              <div className="h-[220px]">
                <LogsLineChart data={ingestionData} />
              </div>
            </>
          </Section>

          <Section title="Risk Distribution" icon={AlertTriangle}>
            <div className="h-[260px]">
              {threatData?.donut ? (
                <ThreatDonut data={threatData.donut} />
              ) : null}
            </div>
          </Section>
        </div>

        <Section title="API Categories" icon={Flame}>
          <div className="h-[260px]">
            {threatData?.categories ? (
              <APICategories data={threatData.categories} />
            ) : null}
          </div>
        </Section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Section title="Global Risk" icon={Globe}>
            {riskMatrixData ? (
              <Heatmap data={riskMatrixData} />
            ) : null}
          </Section>

          <Section title="Agents" icon={Bot}>
            <AgentStatus agentsData={agentsData} />
          </Section>
        </div>

        <Section title="User Insights" icon={Users}>
          <div className="space-y-6">
            {professionData && professionData.length > 0 ? (
              <ProfessionBar data={professionData} />
            ) : null}

            <div className="overflow-x-auto rounded-2xl border border-slate-700/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/40 bg-white/[0.02]">
                    {[
                      "Name",
                      "Email",
                      "Role",
                      "Country",
                      "Admin",
                      "APIs",
                      "Alerts",
                      "Agents",
                      "Last Activity",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 text-slate-500 font-medium uppercase tracking-wider text-[11px]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersDetails.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 px-4 text-slate-500 text-center">
                        No users data loaded yet. Click Refresh to fetch from Supabase.
                      </td>
                    </tr>
                  ) : (
                    usersDetails.map((u) => (
                      <tr key={u.id} className="border-b border-slate-800/30 hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 text-white font-medium">{u.full_name || "-"}</td>
                        <td className="py-3 px-4 text-slate-300">{u.email || "-"}</td>
                        <td className="py-3 px-4 text-slate-300">{u.role || "-"}</td>
                        <td className="py-3 px-4 text-slate-300">{u.country || "-"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs border ${
                              u.is_admin
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/25"
                            }`}
                          >
                            {u.is_admin ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{Number(u.api_count || 0)}</td>
                        <td className="py-3 px-4 text-slate-300">{Number(u.risk_alert_count || 0)}</td>
                        <td className="py-3 px-4 text-slate-300">{Number(u.agent_count || 0)}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {u.last_activity
                            ? new Date(u.last_activity).toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section title="Privacy" icon={ShieldCheck}>
          <PrivacyPanel />
        </Section>

        <div className="text-center text-xs text-slate-600 pt-6">AegisAPI · All systems operational</div>
      </main>
    </div>
  );
}

// Helper function to get auth token
async function getAuthToken() {
  try {
    const { data } = await (await import("../../utils/supabaseClient")).supabase.auth.getSession();
    return data?.session?.access_token;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
