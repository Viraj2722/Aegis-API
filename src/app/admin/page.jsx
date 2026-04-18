"use client";

import { useEffect, useState } from "react";
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
  professionData as defaultProfessionData,
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
            onClick={onSignOut}
            className="text-xs px-4 py-2 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/10 inline-flex items-center gap-1.5"
          >
            <LogOut size={13} />
            Sign out
          </button>

          <button
            onClick={() => setHelpOpen(true)}
            className="text-xs px-4 py-2 border border-slate-700 rounded-lg text-sky-300 hover:bg-white/5"
          >
            Help
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
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState(null);
  const [ingestionStats, setIngestionStats] = useState(null);
  const [threatData, setThreatData] = useState(null);
  const [riskMatrixData, setRiskMatrixData] = useState(null);
  const [professionData, setProfessionData] = useState(null);

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  // Fetch admin analytics data on component mount
  useEffect(() => {
    if (!isReady || !isAdmin) return;

    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const token = user?.id ? await getAuthToken() : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch all admin stats in parallel
        const [statsRes, riskRes, categoriesRes, healthRes, heatmapRes, professionRes] = await Promise.all([
          fetch("/api/admin/stats", { headers }).catch(() => ({})),
          fetch("/api/admin/risk-distribution", { headers }).catch(() => ({})),
          fetch("/api/admin/api-categories", { headers }).catch(() => ({})),
          fetch("/api/admin/system-health", { headers }).catch(() => ({})),
          fetch("/api/admin/heatmap", { headers }).catch(() => ({})),
          fetch("/api/admin/user-distribution", { headers }).catch(() => ({})),
        ]);

        // Parse successful responses
        if (statsRes.ok) {
          const data = await statsRes.json();
          setGlobalStats(data.globalStats || defaultGlobalStats);
        }

        if (healthRes.ok) {
          const data = await healthRes.json();
          setIngestionStats(data.ingestionStats || defaultIngestionStats);
        }

        if (riskRes.ok && categoriesRes.ok) {
          const riskData = await riskRes.json();
          const catData = await categoriesRes.json();
          setThreatData({
            donut: riskData.threatData?.donut || [],
            categories: catData.threatData?.categories || [],
          });
        }

        if (heatmapRes.ok) {
          const data = await heatmapRes.json();
          setRiskMatrixData(data.riskMatrixData);
        }

        if (professionRes.ok) {
          const data = await professionRes.json();
          const profData = data.professionData || [];
          // Only set if we have real data, otherwise keep mock
          if (profData.length > 0) {
            setProfessionData(profData);
          }
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
        // Fall back to defaults which are already set
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [isReady, isAdmin, user]);

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
          <p className="text-sm text-slate-400">
            {loading ? "Loading live data..." : "Real-time visibility across APIs and agents"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
          {loading ? (
            <>
              <div className="h-20 bg-slate-800/50 rounded-lg animate-pulse" />
              <div className="h-20 bg-slate-800/50 rounded-lg animate-pulse" />
              <div className="h-20 bg-slate-800/50 rounded-lg animate-pulse" />
              <div className="h-20 bg-slate-800/50 rounded-lg animate-pulse" />
            </>
          ) : globalStats ? (
            <>
              <StatCard icon={Users} label="Users" value={globalStats.totalUsers} />
              <StatCard icon={Bot} label="Agents" value={globalStats.activeAgents} />
              <StatCard icon={Activity} label="Online" value={globalStats.onlineAgents} />
              <StatCard icon={Globe} label="Regions" value={globalStats.regionsCovered} />
            </>
          ) : null}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Section title="System Health" icon={Database}>
            {loading ? (
              <div className="space-y-4">
                <div className="h-10 bg-slate-800/50 rounded animate-pulse" />
                <div className="h-32 bg-slate-800/50 rounded animate-pulse" />
                <div className="h-48 bg-slate-800/50 rounded animate-pulse" />
              </div>
            ) : ingestionStats ? (
              <>
                <p className="text-3xl text-white">{ingestionStats.totalLogsAnalyzed.toLocaleString()}</p>
                <LatencyGauge value={ingestionStats.avgLatencyMs} max={100} />
                <div className="h-[220px]">
                  <LogsLineChart />
                </div>
              </>
            ) : null}
          </Section>

          <Section title="Risk Distribution" icon={AlertTriangle}>
            <div className="h-[260px]">
              {loading ? (
                <div className="w-full h-full bg-slate-800/50 rounded animate-pulse" />
              ) : threatData?.donut ? (
                <ThreatDonut data={threatData.donut} />
              ) : null}
            </div>
          </Section>
        </div>

        <Section title="API Categories" icon={Flame}>
          <div className="h-[260px]">
            {loading ? (
              <div className="w-full h-full bg-slate-800/50 rounded animate-pulse" />
            ) : threatData?.categories ? (
              <APICategories data={threatData.categories} />
            ) : null}
          </div>
        </Section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Section title="Global Risk" icon={Globe}>
            {loading ? (
              <div className="w-full h-64 bg-slate-800/50 rounded animate-pulse" />
            ) : riskMatrixData ? (
              <Heatmap data={riskMatrixData} />
            ) : null}
          </Section>

          <Section title="Agents" icon={Bot}>
            {loading ? (
              <div className="w-full h-64 bg-slate-800/50 rounded animate-pulse" />
            ) : (
              <AgentStatus />
            )}
          </Section>
        </div>

        <Section title="User Insights" icon={Users}>
          {loading ? (
            <div className="space-y-3">
              <div className="h-8 bg-slate-800/50 rounded animate-pulse" />
              <div className="h-8 bg-slate-800/50 rounded animate-pulse" />
              <div className="h-8 bg-slate-800/50 rounded animate-pulse" />
              <div className="h-8 bg-slate-800/50 rounded animate-pulse" />
              <div className="h-8 bg-slate-800/50 rounded animate-pulse" />
            </div>
          ) : professionData && professionData.length > 0 ? (
            <ProfessionBar data={professionData} />
          ) : null}
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
