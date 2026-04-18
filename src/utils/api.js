import axios from "axios";
import { supabase } from "./supabaseClient";

const AGENT_KEY_STORAGE = "aegis_agent_key";

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
    } else {
      const agentKey = (localStorage.getItem(AGENT_KEY_STORAGE) || "").trim();
      if (agentKey) {
        config.params = config.params || {};
        if (!config.params.secret_key && !config.params.agent_key) {
          config.params.secret_key = agentKey;
        }
      }
    }
  }
  return config;
});

export default api;
