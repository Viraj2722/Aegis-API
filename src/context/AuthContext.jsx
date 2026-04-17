"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const AuthContext = createContext(null);
const TOKEN_KEY = "aegis_token";
const DEMO_TOKEN = "demo_token";

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

async function upsertProfile(user) {
  if (!user) return;
  const metadata = user.user_metadata || {};

  const profileRow = {
    id: user.id,
    full_name:
      metadata.full_name || metadata.name || user.email?.split("@")[0] || null,
    company_name: metadata.company_name || null,
    role: metadata.role || null,
    avatar_url: metadata.avatar_url || null,
  };

  await supabase.from("profiles").upsert(profileRow, { onConflict: "id" });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const mappedUser = mapSupabaseUser(data.session?.user);
      setUser(mappedUser);
      if (mappedUser) {
        localStorage.removeItem(TOKEN_KEY);
        upsertProfile(data.session.user).catch(() => {
          // Profile write can fail if RLS policies are not configured yet.
        });
      }
      setIsReady(true);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const mappedUser = mapSupabaseUser(session?.user);
      setUser(mappedUser);

      if (mappedUser) {
        localStorage.removeItem(TOKEN_KEY);
        upsertProfile(session.user).catch(() => {
          // Profile write can fail if RLS policies are not configured yet.
        });
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
    const demoUser = { id: 0, name: "Demo User", email: "demo@aegisapi.io" };
    localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
    setUser(demoUser);
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
    localStorage.removeItem(TOKEN_KEY);
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      setError,
      isReady,
      login,
      signup,
      loginWithGoogle,
      loginDemo,
      logout,
    }),
    [user, loading, error, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
