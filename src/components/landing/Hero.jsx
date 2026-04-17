"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "../../utils/api";
import { uploadLogFile } from "../../utils/logUpload";

function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animFrame;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? "0,212,255" : "124,58,237",
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,212,255,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animFrame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Hero() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  const handleAnalyzeLogs = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAnalyzeError("");
    setAnalyzing(true);
    try {
      await uploadLogFile(file, api);
      router.push("/dashboard");
    } catch (_error) {
      setAnalyzeError(_error?.message || "Unable to upload logs.");
    } finally {
      setAnalyzing(false);
      event.target.value = "";
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden cyber-grid">
      <ParticleCanvas />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050810]/60 to-[#050810]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 40%, rgba(124,58,237,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.08) 0%, transparent 55%)",
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="scan-line" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 md:pt-24 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass neon-border text-xs font-mono tracking-widest text-cyan-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              API Security Intelligence Platform
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-6"
          >
            <span className="block whitespace-nowrap">
              <span className="gradient-text">Expose the</span>{" "}
              <span className="text-white">Invisible.</span>
            </span>
            <span className="block whitespace-nowrap">
              <span className="gradient-text">Secure the</span>{" "}
              <span className="text-white">Forgotten.</span>
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            AegisAPI uses behavioral AI to detect zombie endpoints, map attack
            surfaces, and surface hidden risks across your entire API ecosystem
            - before attackers do.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileChange}
            />
            <motion.button
              type="button"
              onClick={handleAnalyzeLogs}
              disabled={analyzing}
              className="btn-primary px-8 py-4 rounded-xl text-white font-semibold text-sm tracking-wide flex items-center gap-2 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg
                className={`w-4 h-4 ${analyzing ? "animate-spin" : "group-hover:animate-spin"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                />
              </svg>
              {analyzing ? "Analyzing..." : "Analyze Logs"}
            </motion.button>
            <motion.button
              type="button"
              className="btn-secondary px-8 py-4 rounded-xl text-cyan-400 font-semibold text-sm tracking-wide flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              View Demo
            </motion.button>
          </motion.div>

          {analyzeError ? (
            <motion.p
              variants={itemVariants}
              className="mt-4 text-sm text-red-400"
            >
              {analyzeError}
            </motion.p>
          ) : null}

          <motion.div
            variants={itemVariants}
            className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
          >
            {[
              { value: "99.8%", label: "Detection Rate" },
              { value: "<50ms", label: "Analysis Time" },
              { value: "10M+", label: "APIs Scanned" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl md:text-2xl font-black glow-text text-cyan-400">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="absolute left-[10%] top-[30%] w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
        animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[10%] bottom-[30%] w-72 h-72 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #00d4ff, transparent)" }}
        animate={{ y: [20, -20, 20], x: [10, -10, 10] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

    </section>
  );
}
