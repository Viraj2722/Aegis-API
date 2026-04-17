import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, ChevronDown, BookOpen, Zap, Terminal } from 'lucide-react'
import { helpItems } from './data/mockData'

/* ── Accordion Item (cleaner + lighter) ── */
function AccordionItem({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-700/30 rounded-xl overflow-hidden">

      {/* HEADER */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02]"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={13} className="text-sky-400" />
          <span className="text-sm text-white">{item.title}</span>
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={13} className="text-slate-500" />
        </motion.div>
      </button>

      {/* CONTENT */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 text-sm text-slate-400 border-t border-slate-700/30 leading-relaxed">
              {item.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── MAIN PANEL ── */
export default function HelpPanel() {
  return (
    <div className="flex flex-col gap-8">

      {/* QUICK LINKS (clean + smaller) */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen, label: 'Docs', color: '#38bdf8' },
          { icon: Zap, label: 'Start', color: '#a855f7' },
          { icon: Terminal, label: 'API', color: '#34d399' },
        ].map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-slate-700/30 bg-white/[0.02] hover:bg-white/[0.04]"
          >
            <Icon size={15} style={{ color }} />
            <span className="text-[11px] text-slate-400">{label}</span>
          </button>
        ))}
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        {helpItems.map((item) => (
          <AccordionItem key={item.title} item={item} />
        ))}
      </div>

    </div>
  )
}