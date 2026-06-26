"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Settings,
  Play,
  Plus,
  FileJson,
  CheckCircle2,
  Copy,
  Terminal,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Navbar from "../../components/landing/Navbar";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const AIAgentPage = () => {
  const SCHEDULE_OPTIONS = [
    { label: "6 hours", seconds: 21600 },
    { label: "12 hours", seconds: 43200 },
    { label: "24 hours", seconds: 86400 },
    { label: "7 days", seconds: 604800 },
  ];

  const { user, isDemoMode } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [apiError, setApiError] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [scheduledInterval, setScheduledInterval] = useState(86400);
  const [scheduledError, setScheduledError] = useState("");
  const [isScheduledGenerating, setIsScheduledGenerating] = useState(false);
  const [scheduledZipUrl, setScheduledZipUrl] = useState("");
  const [scheduledZipName, setScheduledZipName] = useState(
    "scheduled-agent.zip",
  );
  const [scheduledRunCount, setScheduledRunCount] = useState(5);
  const [runForever, setRunForever] = useState(false);
  const backendApiBase = (
    process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");

  const ingestPath = "/api/agent/ingest";

  useEffect(() => {
    return () => {
      if (scheduledZipUrl) {
        window.URL.revokeObjectURL(scheduledZipUrl);
      }
    };
  }, [scheduledZipUrl]);

  useEffect(() => {
    const loadAgents = async () => {
      if (!user?.id || isDemoMode) {
        setApiKeys([]);
        return;
      }

      setIsLoadingKeys(true);
      setApiError("");
      try {
        const response = await api.get("/agents");
        const rows = Array.isArray(response?.data?.agents)
          ? response.data.agents
          : [];
        setApiKeys(
          rows.map((row) => ({
            id: row.id,
            key: row.secret_key,
            serverUrl: row.dashboard_url,
            created: row.created_at
              ? new Date(row.created_at).toLocaleDateString()
              : "",
          })),
        );
      } catch (err) {
        setApiError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to load agent keys",
        );
      } finally {
        setIsLoadingKeys(false);
      }
    };

    loadAgents();
  }, [user?.id, isDemoMode]);

  const generateApiKey = async () => {
    setIsGenerating(true);
    setApiError("");

    try {
      if (!user?.id || isDemoMode) {
        throw new Error("Sign in with a real account to generate agent keys");
      }

      const dashboardUrl = `${window.location.origin}/dashboard`;
      const response = await api.post("/agents", {
        dashboard_url: dashboardUrl,
      });
      const row = response?.data || {};

      const newKey = {
        id: row.id || Date.now(),
        key: row.secret_key || "",
        serverUrl: row.dashboard_url || dashboardUrl,
        created: row.created_at
          ? new Date(row.created_at).toLocaleDateString()
          : new Date().toLocaleDateString(),
      };

      setApiKeys((prev) => [newKey, ...prev]);
    } catch (err) {
      setApiError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to generate API key",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const downloadAgentZip = async () => {
    setApiError("");

    if (apiKeys.length === 0 || !apiKeys[0].key) {
      setApiError("Create an API key first");
      return;
    }

    try {
      const response = await api.post(
        `${backendApiBase}/agents/generate`,
        {
          secret_key: apiKeys[0].key,
          interval_seconds: 0,
          run_count: 1,
        },
        {
          responseType: "blob",
          timeout: 600000,
        },
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "AegisAPI_Agent.zip";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setApiError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to generate agent zip",
      );
    }
  };

  const handleGenerateScheduledAgent = async () => {
    setScheduledError("");
    setIsScheduledGenerating(true);

    try {
      if (!user?.id || isDemoMode) {
        throw new Error(
          "Sign in with a real account to generate scheduled agents",
        );
      }
      if (apiKeys.length === 0 || !apiKeys[0].key) {
        throw new Error("Create an API key first");
      }

      if (scheduledZipUrl) {
        window.URL.revokeObjectURL(scheduledZipUrl);
        setScheduledZipUrl("");
      }

      const response = await api.post(
        `${backendApiBase}/agents/scheduled/generate`,
        {
          secret_key: apiKeys[0].key,
          interval_seconds: Number(scheduledInterval),
          run_count: runForever ? -1 : Number(scheduledRunCount),
        },
        {
          responseType: "blob",
          timeout: 600000,
        },
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      setScheduledZipUrl(url);

      const disposition = response?.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      setScheduledZipName(match?.[1] || "scheduled-agent.zip");
    } catch (err) {
      setScheduledError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to generate scheduled agent",
      );
    } finally {
      setIsScheduledGenerating(false);
    }
  };

  const handleDownloadScheduledAgent = () => {
    if (!scheduledZipUrl) return;
    const link = document.createElement("a");
    link.href = scheduledZipUrl;
    link.download = scheduledZipName || "scheduled-agent.zip";
    link.click();
  };

  return (
    <div className="min-h-screen bg-black cyber-grid text-slate-300 font-sans">
      <Navbar />
      <div className="max-w-4xl mx-auto space-y-12 px-6 md:px-8 pt-28 pb-12">
        <section>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-white mb-4">
                AegisAPI Agent Setup
              </h1>
              <p className="text-slate-400 leading-relaxed max-w-2xl">
                The AI Agent is required for large-scale systems where log files
                are too massive for manual uploads. It automates the log
                analysis process by monitoring files locally and pushing
                processed security signatures to the dashboard in real-time.
              </p>
            </div>
          </div>
        </section>

        <div className="glass neon-border rounded-xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">
              Step 1: Select Scan Interval & Download Agent
            </h2>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-400">
              Scan Interval
            </p>
            <select
              value={scheduledInterval}
              onChange={(event) =>
                setScheduledInterval(Number(event.target.value))
              }
              className="w-full md:w-64 bg-black/60 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              {SCHEDULE_OPTIONS.map((option) => (
                <option key={option.seconds} value={option.seconds}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-400">
              Number Of Scheduled Scans
            </p>
            <select
              disabled={runForever}
              value={scheduledRunCount}
              onChange={(event) =>
                setScheduledRunCount(Number(event.target.value))
              }
              className="w-full md:w-64 bg-black/60 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={5}>5 scans</option>
              <option value={10}>10 scans</option>
            </select>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 ml-2">
              <input
                type="checkbox"
                checked={runForever}
                onChange={(event) => setRunForever(event.target.checked)}
                className="accent-emerald-500"
              />
              Run forever
            </label>
            <p className="text-[11px] text-slate-500">
              When enabled, the generated scheduled agent runs continuously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                ZIP Content
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Terminal size={16} className="text-cyan-400" />
                  <span>
                    <strong className="text-white">logs.exe</strong> - Log
                    collector executable
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FileJson size={16} className="text-cyan-400" />
                  <span>
                    <strong className="text-white">config.json</strong> -
                    Configuration file
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                config.json template
              </p>
              <pre className="bg-black/60 p-4 rounded-lg border border-emerald-500/20 font-mono text-xs text-cyan-400">{`{
  "secret_key": "",
  "log_path": ""
}`}</pre>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                logs.exe should send normalized logs + secret_key to
                <span className="text-cyan-400"> {ingestPath}</span> (backend
                URL).
              </p>
            </div>
          </div>

          <button
            onClick={downloadAgentZip}
            onClick={downloadAgentZip}
            disabled={apiKeys.length === 0}
            className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] disabled:opacity-50"
          >
            <Download size={18} /> Download Agent (ZIP)
          </button>

          <div className="pt-2 space-y-3">
            <p className="text-sm font-semibold text-slate-400">
              Scheduled Agent
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleGenerateScheduledAgent}
                disabled={isScheduledGenerating || apiKeys.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScheduledGenerating
                  ? "Generating..."
                  : "Generate Scheduled Agent"}
              </button>

              <button
                onClick={handleDownloadScheduledAgent}
                disabled={!scheduledZipUrl}
                className="px-6 py-2.5 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download Scheduled Agent
              </button>
            </div>

            {apiKeys.length === 0 ? (
              <p className="text-xs text-amber-300">
                Create an API key first before generating scheduled agent.
              </p>
            ) : null}

            {scheduledError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs px-3 py-2">
                {scheduledError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass rounded-xl border border-emerald-500/20 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              Step 2: Create API Key
            </h2>
            <button
              onClick={generateApiKey}
              disabled={isGenerating || isLoadingKeys}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded border border-emerald-500/30 transition-all flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Generating...
                </>
              ) : (
                <>
                  <Plus size={14} /> Create
                </>
              )}
            </button>
          </div>

          {apiError ? (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs px-3 py-2">
              {apiError}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase border-b border-emerald-500/15">
                <tr>
                  <th className="py-3 px-4">Sr No</th>
                  <th className="py-3 px-4">Secret Key</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {isLoadingKeys ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="py-8 text-center text-slate-600 italic"
                    >
                      Loading keys...
                    </td>
                  </tr>
                ) : apiKeys.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="py-8 text-center text-slate-600 italic"
                    >
                      No keys generated yet.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((k, index) => (
                    <tr key={k.id} className="hover:bg-emerald-500/5">
                      <td className="py-4 px-4 text-slate-500">
                        {apiKeys.length - index}
                      </td>
                      <td className="py-4 px-4 font-mono text-cyan-400">
                        {k.key.substring(0, 12)}...
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => copyToClipboard(k.key, k.id)}
                          className="p-2 hover:bg-emerald-500/10 rounded transition-colors"
                        >
                          {copiedKey === k.id ? (
                            <CheckCircle2
                              size={16}
                              className="text-green-500"
                            />
                          ) : (
                            <Copy size={16} className="text-slate-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-xl border border-emerald-500/20 p-8 space-y-4">
          <h2 className="text-xl font-bold text-white">
            Step 3: Configure JSON
          </h2>
          <p className="text-slate-400 text-sm">
            Open the downloaded{" "}
            <code className="bg-black/60 px-1.5 py-0.5 rounded text-cyan-400 border border-emerald-500/20">
              config.json
            </code>{" "}
            file. Copy the <strong className="text-white">secret_key</strong>{" "}
            generated in Step 2 and paste it into the corresponding field along
            with your log file path. The ingest URL is handled by logs.exe.
          </p>
        </div>

        <div className="glass rounded-xl border border-emerald-500/20 p-8 space-y-10">
          <h2 className="text-xl font-bold text-white">Step 4: Run Agent</h2>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Settings size={16} className="text-cyan-400" /> 4.1 Update
              configuration
            </h3>
            <div className="p-4 bg-black/60 border border-emerald-500/20 rounded-lg font-mono text-xs">
              "secret_key":{" "}
              <span className="text-cyan-400">"&lt;your_secret_key&gt;"</span>
              <br />
              "api_key":{" "}
              <span className="text-cyan-400">"&lt;your_api_key&gt;"</span>
              <br />
              "log_path":{" "}
              <span className="text-cyan-400">"/path/to/logs.json"</span>
            </div>
            <p className="text-xs text-slate-500">
              Fill in your secret key from Step 2 and ensure the path points to
              your actual application log file.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Play size={16} className="text-green-500" /> 4.2 Run the agent
            </h3>
            <div className="flex items-center justify-between p-4 bg-black/60 border border-emerald-500/20 rounded-lg font-mono text-xs">
              <code className="text-slate-300">logs.exe</code>
              <Copy size={14} className="text-slate-700 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgentPage;
