"use client";

import { motion } from "framer-motion";
import { Globe, Skull, AlertTriangle, Copy, EyeOff, Zap } from "lucide-react";

const cards = [
  {
    key: "total_apis",
    label: "Total APIs",
    icon: Globe,
    glow: "glow-blue",
    textColor: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    key: "zombie_apis",
    label: "Zombie APIs",
    icon: Skull,
    glow: "",
    textColor: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
  },
  {
    key: "critical_apis",
    label: "Critical APIs",
    icon: AlertTriangle,
    glow: "glow-red",
    textColor: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    key: "duplicate_apis",
    label: "Duplicate APIs",
    icon: Copy,
    glow: "",
    textColor: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    key: "shadow_apis",
    label: "Shadow APIs",
    icon: EyeOff,
    glow: "glow-purple",
    textColor: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    key: "traffic_spike_apis",
    label: "Traffic Spikes",
    icon: Zap,
    glow: "glow-blue",
    textColor: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
];

export default function StatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const value = stats?.[c.key] ?? 0;
        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className={`glass rounded-xl p-4 border ${c.border} ${c.glow} hover:scale-[1.02] transition-transform cursor-default`}
          >
            <div
              className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-3`}
            >
              <Icon size={18} className={c.textColor} />
            </div>
            <div className={`text-3xl font-bold ${c.textColor} mb-1`}>
              {value}
            </div>
            <div className="text-slate-400 text-xs font-medium">{c.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
