"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const AuthContext = createContext(null);
const TOKEN_KEY = "aegis_token";
const DEMO_TOKEN = "demo_token";
const AGENT_KEY_STORAGE = "aegis_agent_key";
const DEMO_USER = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@aegisapi.io",
  avatar_url: null,
};
const DEMO_PROFILE = {
  id: "demo-user",
  full_name: "Demo User",
  role: "Security Analyst",
  country: "India",
  avatar_url: null,
  is_admin: false,
};
const AGENT_GUEST_USER = {
  id: "agent-guest",
  name: "Agent Viewer",
  email: "agent-guest@aegisapi.local",
  avatar_url: null,
};
const AGENT_GUEST_PROFILE = {
  id: "agent-guest",
  full_name: "Agent Viewer",
  role: "Guest",
  country: "N/A",
  avatar_url: null,
  is_admin: false,
};

function hasAgentKeyInUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search || "");
  return !!params.get("agent_key") || !!params.get("secret_key");
}

function getAgentKeyFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search || "");
  return (params.get("agent_key") || params.get("secret_key") || "").trim();
}

function getStoredAgentKey() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(AGENT_KEY_STORAGE) || "").trim();
}

function mapSupabaseUser(rawUser) {
  if (!rawUser) return null;
  const meta = rawUser.user_metadata || {};
  return {
    id: rawUser.id,
    name:
      meta.full_name ||
      meta.name ||
      rawUser.email?.split("@")[0] ||
      "User",
    email: rawUser.email,
    avatar_url: meta.avatar_url || null,
  };
}

function isAdminFromUserClaims(rawUser) {
  if (!rawUser) return false;
  const appMeta = rawUser.app_metadata || {};
  const userMeta = rawUser.user_metadata || {};

  if (appMeta.admin === true) return true;
  if (appMeta.is_admin === true) return true;
  if (appMeta.claims?.admin === true) return true;
  if (userMeta.admin === true) return true;
  if (userMeta.is_admin === true) return true;

  return false;
}

function mapProfileRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    full_name: row.full_name || "",
    role: row.role || "",
    country: row.country || "",
    avatar_url: row.avatar_url || null,
    is_admin: !!row.is_admin,
  };
}

function clearLocalAuthArtifacts() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);

  const localKeysToDelete = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith("aegis_") || key.includes("supabase") || key.startsWith("sb-")) {
      localKeysToDelete.push(key);
    }
  }
  localKeysToDelete.forEach((key) => localStorage.removeItem(key));

  const sessionKeysToDelete = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    if (key.startsWith("aegis_") || key.includes("supabase") || key.startsWith("sb-")) {
      sessionKeysToDelete.push(key);
    }
  }
  sessionKeysToDelete.forEach((key) => sessionStorage.removeItem(key));
}

async function upsertProfile(user) {
  if (!user) return;
  const metadata = user.user_metadata || {};

  const profileRow = {
    id: user.id,
    full_name:
      metadata.full_name || metadata.name || user.email?.split("@")[0] || null,
    avatar_url: metadata.avatar_url || null,
  };

  await supabase.from("profiles").upsert(profileRow, { onConflict: "id" });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdminClaim, setIsAdminClaim] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAgentGuestMode, setIsAgentGuestMode] = useState(false);
  const [agentKey, setAgentKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const isAdmin =
    isAdminClaim ||
    !!profile?.is_admin ||
    String(user?.email || "").toLowerCase().startsWith("admin@");

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const demoToken =
        typeof window !== "undefined"
          ? localStorage.getItem(TOKEN_KEY) === DEMO_TOKEN
          : false;
      if (demoToken) {
        setUser(DEMO_USER);
        setProfile(DEMO_PROFILE);
        setIsDemoMode(true);
        setIsAdminClaim(false);
        setIsReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const mappedUser = mapSupabaseUser(data.session?.user);
      setUser(mappedUser);
      setIsDemoMode(false);
      setIsAdminClaim(isAdminFromUserClaims(data.session?.user));
      setIsAgentGuestMode(false);
      setAgentKey("");
      if (mappedUser) {
        localStorage.removeItem(AGENT_KEY_STORAGE);
        localStorage.removeItem(TOKEN_KEY);
        upsertProfile(data.session.user).catch(() => {
          // Profile write can fail if RLS policies are not configured yet.
        });
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, role, country, avatar_url, is_admin")
          .eq("id", data.session.user.id)
          .single();
        setProfile(mapProfileRow(profileData));
      } else {
        const keyFromUrl = getAgentKeyFromUrl();
        const storedKey = getStoredAgentKey();
        const resolvedAgentKey = (keyFromUrl || storedKey || "").trim();

        if (resolvedAgentKey) {
          localStorage.setItem(AGENT_KEY_STORAGE, resolvedAgentKey);
          setAgentKey(resolvedAgentKey);
          setUser(AGENT_GUEST_USER);
          setProfile(AGENT_GUEST_PROFILE);
          setIsDemoMode(false);
          setIsAdminClaim(false);
          setIsAgentGuestMode(true);
        } else {
          localStorage.removeItem(AGENT_KEY_STORAGE);
          setUser(null);
          setProfile(null);
          setIsAgentGuestMode(false);
          setAgentKey("");
        }
      }
      setIsReady(true);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const demoToken =
        typeof window !== "undefined"
          ? localStorage.getItem(TOKEN_KEY) === DEMO_TOKEN
          : false;

      const mappedUser = mapSupabaseUser(session?.user);
      setUser(mappedUser);
      setIsAdminClaim(isAdminFromUserClaims(session?.user));

      if (mappedUser) {
        setIsDemoMode(false);
        setIsAgentGuestMode(false);
        setAgentKey("");
        localStorage.removeItem(AGENT_KEY_STORAGE);
        localStorage.removeItem(TOKEN_KEY);
        upsertProfile(session.user).catch(() => {
          // Profile write can fail if RLS policies are not configured yet.
        });
        supabase
          .from("profiles")
          .select("id, full_name, role, country, avatar_url, is_admin")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profileData }) => {
            setProfile(mapProfileRow(profileData));
          })
          .catch(() => {
            setProfile(null);
          });
      } else {
        if (demoToken) {
          setUser(DEMO_USER);
          setProfile(DEMO_PROFILE);
          setIsAdminClaim(false);
          setIsDemoMode(true);
          setIsAgentGuestMode(false);
          setAgentKey("");
          localStorage.removeItem(AGENT_KEY_STORAGE);
        } else {
          const keyFromUrl = getAgentKeyFromUrl();
          const storedKey = getStoredAgentKey();
          const resolvedAgentKey = (keyFromUrl || storedKey || "").trim();

          if (resolvedAgentKey) {
            localStorage.setItem(AGENT_KEY_STORAGE, resolvedAgentKey);
            setAgentKey(resolvedAgentKey);
            setUser(AGENT_GUEST_USER);
            setProfile(AGENT_GUEST_PROFILE);
            setIsAdminClaim(false);
            setIsDemoMode(false);
            setIsAgentGuestMode(true);
          } else {
            setUser(null);
            setProfile(null);
            setIsAdminClaim(false);
            setIsDemoMode(false);
            setIsAgentGuestMode(false);
            setAgentKey("");
            localStorage.removeItem(AGENT_KEY_STORAGE);
          }
        }
      }

      if (!isReady) {
        setIsReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (isDemoMode) {
      return profile || DEMO_PROFILE;
    }
    if (!user?.id) return null;
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, country, avatar_url, is_admin")
      .eq("id", user.id)
      .single();
    if (profileError) return null;
    const mapped = mapProfileRow(data);
    setProfile(mapped);
    return mapped;
  }, [isDemoMode, user?.id]);

  const updateProfile = useCallback(async (patch) => {
    if (isDemoMode) {
      const updated = {
        ...(profile || DEMO_PROFILE),
        full_name: patch?.full_name ?? profile?.full_name ?? DEMO_PROFILE.full_name,
        role: patch?.role ?? profile?.role ?? DEMO_PROFILE.role,
        country: patch?.country ?? profile?.country ?? DEMO_PROFILE.country,
        avatar_url: patch?.avatar_url ?? profile?.avatar_url ?? null,
      };
      setProfile(updated);
      setUser((prev) => ({
        ...(prev || DEMO_USER),
        name: updated.full_name || (prev?.name ?? DEMO_USER.name),
      }));
      return { ok: true };
    }

    if (!user?.id) return { ok: false, error: "Not authenticated" };
    const payload = {
      id: user.id,
      full_name: patch?.full_name ?? user.name ?? null,
      role: patch?.role ?? null,
      country: patch?.country ?? null,
      avatar_url: patch?.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (upsertErr) {
      return { ok: false, error: upsertErr.message || "Profile update failed" };
    }

    await refreshProfile();
    return { ok: true };
  }, [isDemoMode, profile, refreshProfile, user?.id, user?.name]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      if (!email || !password) {
        setError("Email and password are required");
        return false;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (signInError) {
        setError(signInError.message || "Login failed");
        return false;
      }

      if (data.user) {
        await upsertProfile(data.user).catch(() => {
          // Profile write can fail if RLS policies are not configured yet.
        });
      }

      return true;
    } catch {
      setError("Login failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      if (!name || !email || !password) {
        setError("All fields are required");
        return false;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Signup failed");
        return false;
      }

      if (data.user) {
        await upsertProfile(data.user).catch(() => {
          // Profile write can fail if RLS policies are not configured yet.
        });
      }

      return true;
    } catch {
      setError("Signup failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = () => {
    clearLocalAuthArtifacts();
    localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
    setUser(DEMO_USER);
    setProfile(DEMO_PROFILE);
    setIsDemoMode(true);
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/dashboard`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (oauthError) {
        setError(oauthError.message || "Google login failed");
        return false;
      }

      return true;
    } catch {
      setError("Google login failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!isDemoMode && !isAgentGuestMode) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          await fetch("/api/reset-data", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch {
        // Keep logout resilient even if cleanup call fails.
      }
    }

    clearLocalAuthArtifacts();

    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // Fallback for environments that do not support global scope.
      await supabase.auth.signOut();
    }

    setUser(null);
    setProfile(null);
    setIsAdminClaim(false);
    setIsDemoMode(false);
    setIsAgentGuestMode(false);
    setAgentKey("");
    setError(null);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      isDemoMode,
      isAgentGuestMode,
      agentKey,
      isAdmin,
      loading,
      error,
      setError,
      isReady,
      login,
      signup,
      loginWithGoogle,
      loginDemo,
      refreshProfile,
      updateProfile,
      logout,
    }),
    [
      user,
      profile,
      isDemoMode,
      isAgentGuestMode,
      agentKey,
      isAdmin,
      isAdminClaim,
      loading,
      error,
      isReady,
      refreshProfile,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
