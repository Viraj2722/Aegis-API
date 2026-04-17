"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export default function AlertBanner({ stats }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !stats) return null;

  const critCount = stats.critical_apis || 0;
  const shadowCount = stats.shadow_apis || 0;

  if (critCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3"
      >
        <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-red-300 text-sm font-semibold">
            {critCount} Critical API{critCount > 1 ? "s" : ""} detected
            {shadowCount > 0 &&
              ` - ${shadowCount} Shadow API${shadowCount > 1 ? "s" : ""} identified`}
          </p>
          <p className="text-red-400/70 text-xs mt-0.5">
            Immediate review recommended. Check the API table below for details.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-400/60 hover:text-red-300 transition-colors shrink-0"
        >
          <X size={15} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
