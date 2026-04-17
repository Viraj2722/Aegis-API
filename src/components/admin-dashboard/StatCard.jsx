import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

/* ── Count Animation (kept but smoother) ───────────────── */
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)

    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [target, duration])

  return count
}

/* ── Online/Offline Indicator (simplified) ─────────────── */
function AgentSplitIndicator({ online, offline }) {
  const total = online + offline || 1
  const onlinePct = (online / total) * 100

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Online {online}</span>
        <span>Offline {offline}</span>
      </div>

      <div className="h-1 rounded-full bg-slate-700/50 overflow-hidden">
        <motion.div
          className="h-full bg-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${onlinePct}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  )
}

/* ── MAIN CARD ────────────────────────────────────────── */
export default function StatCard({
  icon: Icon,
  label,
  value,
  color = 'blue',
  subData,
  suffix = '',
}) {
  const animatedValue = useCountUp(typeof value === 'number' ? value : 0)

  const colorMap = {
    blue: 'text-sky-400',
    purple: 'text-purple-400',
    green: 'text-emerald-400',
    cyan: 'text-cyan-400',
  }

  const iconColor = colorMap[color] || colorMap.blue

  return (
    <motion.div
      className="glass-card p-5 flex flex-col gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ICON + LABEL */}
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconColor} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>

      {/* VALUE */}
      <div className="text-2xl font-semibold text-white">
        {typeof value === 'number'
          ? animatedValue.toLocaleString()
          : value}
        {suffix && (
          <span className="text-sm ml-1 text-slate-400">{suffix}</span>
        )}
      </div>

      {/* OPTIONAL DATA */}
      {subData && (
        <AgentSplitIndicator
          online={subData.online}
          offline={subData.offline}
        />
      )}
    </motion.div>
  )
}