"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Save, ArrowLeft } from "lucide-react";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";

const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Cote d'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "",
    country: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    refreshProfile();
  }, [user?.id, refreshProfile]);

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || user?.name || "",
      email: user?.email || "",
      role: profile?.role || "",
      country: profile?.country || "",
    });
  }, [
    user?.id,
    user?.name,
    user?.email,
    profile?.id,
    profile?.full_name,
    profile?.role,
    profile?.country,
  ]);

  const isComplete = useMemo(
    () => form.role.trim().length > 0 && form.country.trim().length > 0,
    [form.role, form.country],
  );

  const save = async (e) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    const res = await updateProfile({
      full_name: form.full_name,
      role: form.role,
      country: form.country,
      avatar_url: profile?.avatar_url || null,
    });
    setSaving(false);
    if (!res.ok) {
      setMessage(res.error || "Failed to save profile");
      return;
    }
    setMessage("Profile saved successfully. Redirecting...");
    router.push("/dashboard");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#020817] bg-grid">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-5 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl border border-slate-800/60 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                <User size={18} className="text-indigo-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Profile</h1>
                <p className="text-slate-400 text-sm">
                  Complete role and country to enable log uploads.
                </p>
              </div>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Full Name</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Email</label>
                <input
                  value={form.email}
                  disabled
                  className="w-full bg-slate-900/40 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Role in Company</label>
                <input
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  placeholder="e.g. Security Engineer"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Country</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                  required
                >
                  <option value="" disabled>
                    Select your country
                  </option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              {message && (
                <p className={`text-sm ${message.includes("success") ? "text-emerald-400" : "text-red-400"}`}>
                  {message}
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className={`text-xs ${isComplete ? "text-emerald-400" : "text-amber-400"}`}>
                  {isComplete
                    ? "Profile complete. Upload is enabled on dashboard."
                    : "Role and country are required to enable uploads."}
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </motion.div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
