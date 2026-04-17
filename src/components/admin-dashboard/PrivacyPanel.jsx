import React from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Lock, Server, Eye, CheckCircle2 } from 'lucide-react'

const badges = [
  {
    icon: Server,
    title: 'No External Log Storage',
    desc: 'Logs are processed in-memory and never stored externally.',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.05)',
    border: 'rgba(52,211,153,0.12)',
  },
  {
    icon: Lock,
    title: 'Local Data Processing',
    desc: 'All analysis runs within your infrastructure boundary.',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.05)',
    border: 'rgba(56,189,248,0.12)',
  },
  {
    icon: ShieldCheck,
    title: 'Encrypted Communication',
    desc: 'Secure TLS 1.3 encryption across all channels.',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.05)',
    border: 'rgba(168,85,247,0.12)',
  },
  {
    icon: Eye,
    title: 'No Third-Party Tracking',
    desc: 'Zero analytics or data sharing with external services.',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.05)',
    border: 'rgba(251,191,36,0.12)',
  },
]

export default function PrivacyPanel() {
  return (
    <div className="flex flex-col gap-8">

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {badges.map((b, i) => (
          <motion.div
            key={b.title}
            className="flex gap-4 p-4 rounded-xl border"
            style={{ background: b.bg, borderColor: b.border }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.08 }}
          >

            {/* ICON */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `${b.color}12`,
                border: `1px solid ${b.color}20`,
              }}
            >
              <b.icon size={16} style={{ color: b.color }} />
            </div>

            {/* TEXT */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={11} style={{ color: b.color }} />
                <span className="text-sm text-white font-medium">
                  {b.title}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {b.desc}
              </p>
            </div>

          </motion.div>
        ))}
      </div>

      {/* FOOTER BADGE */}
      <motion.div
        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <ShieldCheck size={14} className="text-emerald-400" />
        <span className="text-xs text-emerald-300">
          SOC 2 Type II compliant · Data fully secured
        </span>
      </motion.div>

    </div>
  )
}