"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, EyeOff, Check, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const strength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
};

const StrengthBar = ({ password }) => {
  const s = strength(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "",
    "bg-red-500",
    "bg-yellow-500",
    "bg-cyan-500",
    "bg-emerald-500",
  ];
  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i <= s ? colors[s] : "bg-slate-700"}`}
          />
        ))}
      </div>
      <span
        className={`text-xs ${s <= 1 ? "text-red-400" : s === 2 ? "text-yellow-400" : s === 3 ? "text-cyan-400" : "text-emerald-400"}`}
      >
        {labels[s]}
      </span>
    </div>
  );
};

const Rule = ({ met, label }) => (
  <div
    className={`flex items-center gap-1.5 text-xs ${met ? "text-emerald-400" : "text-slate-500"}`}
  >
    {met ? <Check size={11} /> : <X size={11} />} {label}
  </div>
);

export default function SignupPage() {
  const { signup, loginWithGoogle, loading, error, setError, user, isReady } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (isReady && user) {
      router.replace("/dashboard");
    }
  }, [isReady, user, router]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const rules = {
    minLen: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    digit: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };

  const passwordValid = Object.values(rules).every(Boolean);
  const confirmValid = form.password === form.confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordValid || !confirmValid) return;
    const ok = await signup(form.name, form.email, form.password);
    if (ok) router.push("/dashboard");
  };

  const handleGoogleOAuth = async () => {
    await loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow-blue">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">AegisAPI</span>
        </div>

        <div className="glass rounded-2xl p-8 glow-purple">
          <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
          <p className="text-slate-400 text-sm mb-6">
            Start monitoring your API security
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                onBlur={() => touch("name")}
                placeholder="Jane Smith"
                required
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                onBlur={() => touch("email")}
                placeholder="you@company.com"
                required
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  onBlur={() => touch("password")}
                  placeholder="........"
                  required
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <StrengthBar password={form.password} />
              {touched.password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <Rule met={rules.minLen} label="8+ characters" />
                  <Rule met={rules.upper} label="Uppercase letter" />
                  <Rule met={rules.digit} label="Number" />
                  <Rule met={rules.special} label="Special character" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setField("confirm", e.target.value)}
                onBlur={() => touch("confirm")}
                placeholder="........"
                required
                className={`w-full bg-slate-900/60 border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${touched.confirm && !confirmValid ? "border-red-500/60 focus:border-red-500" : "border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"}`}
              />
              {touched.confirm && !confirmValid && (
                <p className="text-red-400 text-xs mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordValid || !confirmValid}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 rounded-xl transition-all glow-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>

            <button
              type="button"
              onClick={handleGoogleOAuth}
              className="w-full bg-white hover:bg-slate-100 text-slate-800 font-semibold py-2.5 rounded-xl transition-all border border-slate-300 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.5 12 20.5c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.8-.1-1.1H12z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
