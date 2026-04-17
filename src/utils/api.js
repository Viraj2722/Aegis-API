import axios from "axios";
import { supabase } from "./supabaseClient";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token || localStorage.getItem("aegis_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
