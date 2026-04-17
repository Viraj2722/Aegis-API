"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, CheckCircle, X } from "lucide-react";

const ICONS = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: Info,
  success: CheckCircle,
};

const COLORS = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

export function Toast({ toasts, remove }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.severity] || Info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border glass ${COLORS[t.severity] || COLORS.medium}`}
            >
              <Icon size={15} className="mt-0.5 shrink-0" />
              <p className="text-xs flex-1 leading-relaxed">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const add = useCallback(
    (message, severity = "medium") => {
      const id = Date.now();
      setToasts((t) => [...t, { id, message, severity }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  return useMemo(() => ({ toasts, add, remove }), [toasts, add, remove]);
}
