"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ShieldHalf = ({ side, animate }) => {
  const isLeft = side === "left";

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ x: 0, opacity: 1 }}
      animate={
        animate
          ? {
              x: isLeft ? "-120%" : "120%",
              opacity: 0,
              rotateY: isLeft ? -40 : 40,
              scale: 0.85,
            }
          : { x: 0, opacity: 1 }
      }
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
      style={{
        clipPath: isLeft
          ? "polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)"
          : "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)",
        perspective: 800,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 200 240"
          className="w-full h-full"
          style={{ filter: "drop-shadow(0 0 30px rgba(0,212,255,0.6))" }}
        >
          <defs>
            <linearGradient
              id={`shieldGrad${side}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="30%" stopColor="#0ea5e9" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#1a1040" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient
              id={`glassGrad${side}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <filter id={`glow${side}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M100 5 L195 45 L195 130 C195 180 150 220 100 235 C50 220 5 180 5 130 L5 45 Z"
            fill={`url(#shieldGrad${side})`}
            stroke="rgba(0,212,255,0.6)"
            strokeWidth="1.5"
            filter={`url(#glow${side})`}
          />

          <path
            d="M100 5 L195 45 L195 130 C195 180 150 220 100 235 C50 220 5 180 5 130 L5 45 Z"
            fill={`url(#glassGrad${side})`}
          />

          <path
            d="M100 20 L180 52 L180 128 C180 170 145 207 100 220 C55 207 20 170 20 128 L20 52 Z"
            fill="none"
            stroke="rgba(0,212,255,0.25)"
            strokeWidth="1"
          />

          <line
            x1="100"
            y1="60"
            x2="100"
            y2="180"
            stroke="rgba(0,212,255,0.3)"
            strokeWidth="0.8"
            strokeDasharray="4 3"
          />
          <line
            x1="40"
            y1="110"
            x2="160"
            y2="110"
            stroke="rgba(0,212,255,0.3)"
            strokeWidth="0.8"
            strokeDasharray="4 3"
          />

          <path
            d="M100 70 L130 145 M100 70 L70 145 M80 118 L120 118"
            fill="none"
            stroke="rgba(0,212,255,0.9)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow${side})`}
          />
        </svg>
      </div>
    </motion.div>
  );
};

const Particle = ({ style }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: Math.random() * 4 + 2,
      height: Math.random() * 4 + 2,
      background: Math.random() > 0.5 ? "#00d4ff" : "#7c3aed",
      ...style,
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
    }}
    transition={{ duration: 1.5, ease: "easeOut", delay: Math.random() * 0.3 }}
  />
);

export default function ShieldAnimation({ onComplete }) {
  const [phase, setPhase] = useState("idle");
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("pulse"), 400);
    const t2 = setTimeout(() => {
      setPhase("split");
      setShowParticles(true);
      setParticles(Array.from({ length: 40 }, (_, i) => i));
    }, 1600);
    const t3 = setTimeout(() => setPhase("burst"), 2000);
    const t4 = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 2800);

    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onComplete]);

  const isOpen = phase === "split" || phase === "burst" || phase === "done";
  const isBurst = phase === "burst" || phase === "done";

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{ background: "#020408" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0"
            animate={
              isBurst
                ? {
                    background: [
                      "radial-gradient(ellipse at center, rgba(0,212,255,0) 0%, transparent 70%)",
                      "radial-gradient(ellipse at center, rgba(0,212,255,0.3) 0%, rgba(124,58,237,0.1) 40%, transparent 70%)",
                      "radial-gradient(ellipse at center, rgba(0,212,255,0) 0%, transparent 70%)",
                    ],
                  }
                : {
                    background:
                      "radial-gradient(ellipse at center, rgba(0,212,255,0) 0%, transparent 70%)",
                  }
            }
            transition={{ duration: 0.8 }}
          />

          {(phase === "pulse" || phase === "split") &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-cyan-400/20"
                style={{ width: 280 + i * 80, height: 280 + i * 80 }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}

          {isBurst && (
            <motion.div
              className="absolute"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 2.5, 3] }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: 2,
                    height: 200,
                    background:
                      "linear-gradient(to top, transparent, rgba(0,212,255,0.8), transparent)",
                    transformOrigin: "bottom center",
                    transform: `rotate(${i * 30}deg) translateX(-50%)`,
                    left: "50%",
                    bottom: "50%",
                  }}
                />
              ))}
            </motion.div>
          )}

          {showParticles && (
            <div className="absolute" style={{ left: "50%", top: "50%" }}>
              {particles.map((i) => (
                <Particle key={i} style={{ left: 0, top: 0 }} />
              ))}
            </div>
          )}

          <motion.div
            className="relative"
            style={{ width: 200, height: 240, perspective: 1000 }}
            animate={
              phase === "pulse"
                ? { scale: [1, 1.05, 1, 1.08, 1] }
                : phase === "split" || phase === "burst"
                  ? { scale: [1, 1.1, 0.95] }
                  : { scale: 1 }
            }
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: "rgba(0,212,255,0.2)" }}
              animate={
                phase === "pulse"
                  ? { opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }
                  : { opacity: 0.4 }
              }
              transition={{
                duration: 1.2,
                repeat: phase === "pulse" ? Infinity : 0,
              }}
            />

            <ShieldHalf side="left" animate={isOpen} />
            <ShieldHalf side="right" animate={isOpen} />

            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={isOpen ? { opacity: [0, 1] } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                className="rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(0,212,255,1) 0%, rgba(124,58,237,0.5) 40%, transparent 70%)",
                  width: 120,
                  height: 120,
                }}
                animate={
                  isOpen ? { scale: [0, 1.5, 3], opacity: [1, 0.8, 0] } : {}
                }
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute bottom-16 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: phase === "idle" ? 0 : 0.6, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.4em] text-cyan-400/60 font-mono uppercase">
              Initializing AegisAPI
            </p>
            <div className="mt-2 flex justify-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-cyan-400/40"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 1,
                    delay: i * 0.15,
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
