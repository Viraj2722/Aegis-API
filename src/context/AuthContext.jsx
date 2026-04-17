"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const TOKEN_KEY = "aegis_token";
const USER_KEY = "aegis_user";
const DEMO_TOKEN = "demo_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsReady(true);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      if (!email || !password) {
        setError("Email and password are required");
        return false;
      }

      const displayName = email.split("@")[0] || "User";
      const loginUser = {
        id: Date.now(),
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email,
      };

      localStorage.setItem(TOKEN_KEY, "local_token");
      localStorage.setItem(USER_KEY, JSON.stringify(loginUser));
      setUser(loginUser);
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

      const signupUser = { id: Date.now(), name, email };
      localStorage.setItem(TOKEN_KEY, "local_token");
      localStorage.setItem(USER_KEY, JSON.stringify(signupUser));
      setUser(signupUser);
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
    localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
