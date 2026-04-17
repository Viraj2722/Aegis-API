"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Bell,
  LogOut,
  User,
  ChevronDown,
  Activity,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function Navbar({ alerts = [], lastUpdated }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUser, setShowUser] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const unread = alerts.filter((a) => !a.read).length;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <nav className="glass border-b border-slate-800/60 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow-blue">
          <ShieldCheck size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold gradient-text">AegisAPI</span>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <Activity size={10} className="text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Live</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="hidden md:block text-slate-500 text-xs">
            Updated {lastUpdated}
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => {
              setShowAlerts(!showAlerts);
              setShowUser(false);
            }}
            className="relative w-9 h-9 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 flex items-center justify-center transition-all"
          >
            <Bell size={16} className="text-slate-300" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showAlerts && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-11 w-80 glass rounded-xl border border-slate-700/60 shadow-2xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Alerts
                  </span>
                  {unread > 0 && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  {alerts.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">
                      No alerts
                    </p>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${!alert.read ? "bg-slate-800/20" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.severity === "critical" ? "bg-red-500" : alert.severity === "high" ? "bg-orange-500" : "bg-yellow-500"}`}
                          />
                          <div>
                            <p className="text-slate-200 text-xs leading-relaxed">
                              {alert.message}
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                              {alert.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowUser(!showUser);
              setShowAlerts(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 transition-all"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
            <span className="text-sm text-slate-300 hidden sm:block max-w-[100px] truncate">
              {user?.name || "User"}
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-500 transition-transform ${showUser ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {showUser && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-11 w-52 glass rounded-xl border border-slate-700/60 shadow-2xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-white text-sm font-medium truncate">
                    {user?.name}
                  </p>
                  <p className="text-slate-500 text-xs truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {(showAlerts || showUser) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowAlerts(false);
            setShowUser(false);
          }}
        />
      )}
    </nav>
  );
}
