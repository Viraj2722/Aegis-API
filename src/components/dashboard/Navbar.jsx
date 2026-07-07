"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  LogOut,
  User,
  LayoutDashboard,
  ChevronDown,
  Activity,
  Bot,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import BrandLogo from "../BrandLogo";

export default function Navbar({ alerts = [], lastUpdated, displayName = "User", displayProfile = null, isAgentKeyMode = false }) {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [showUser, setShowUser] = useState(false);

  // In agent mode, use email from displayProfile; otherwise use user.email
  const displayEmail = isAgentKeyMode 
    ? displayProfile?.email 
    : user?.email;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <nav className="glass border-b border-slate-800/60 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <BrandLogo size="sm" href="/" />
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

        <Link
          href="/agents"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 transition-all"
        >
          <Bot size={14} className="text-emerald-400" />
          <span className="text-sm text-slate-200 font-medium">Agents</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => {
              setShowUser(!showUser);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 transition-all"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
            <span className="text-sm text-slate-300 hidden sm:block max-w-[100px] truncate">
              {displayName || user?.name || "User"}
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
                    {displayName || user?.name || "User"}
                  </p>
                  <p className="text-slate-500 text-xs truncate">
                    {displayEmail || "No email"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUser(false);
                    router.push("/profile");
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-slate-300 hover:bg-slate-700/40 transition-colors text-sm"
                >
                  <User size={14} />
                  Profile
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowUser(false);
                      router.push("/admin");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-slate-300 hover:bg-slate-700/40 transition-colors text-sm"
                  >
                    <LayoutDashboard size={14} />
                    Admin Dashboard
                  </button>
                )}
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

      {showUser && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUser(false);
          }}
        />
      )}
    </nav>
  );
}
