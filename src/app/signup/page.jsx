"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../../components/BrandLogo";

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
  const { signup, loginWithGoogle, loading, error, setError, user, isReady } =
    useAuth();
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
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center mb-8">
          <BrandLogo size="md" />
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
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
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
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
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
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all pr-10"
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
                className={`w-full bg-slate-900/60 border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${touched.confirm && !confirmValid ? "border-red-500/60 focus:border-red-500" : "border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"}`}
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
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold py-2.5 rounded-xl transition-all glow-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
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
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.99 7.28-2.68l-3.56-2.77c-.99.67-2.25 1.07-3.72 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.44.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l2.86-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
