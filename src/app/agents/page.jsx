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

const AIAgentPage = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isZipLoading, setIsZipLoading] = useState(true);
  const [zipError, setZipError] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.async = true;
    script.onload = () => setIsZipLoading(false);
    script.onerror = () => {
      setIsZipLoading(false);
      setZipError(true);
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const serverUrl = "https://api.aegis-security.com/api/v1/ingest";

  const generateApiKey = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const newKey = {
        id: Date.now(),
        key: `ag_${Math.random().toString(36).slice(2, 34)}`,
        serverUrl,
        created: new Date().toLocaleDateString(),
      };

      setApiKeys((prev) => [newKey, ...prev]);
      setIsGenerating(false);
    }, 600);
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
    if (typeof window.JSZip === "undefined") return;

    const zip = new window.JSZip();

    const agentPython = `import json
import requests
import os

def load_config():
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Configuration Error: {e}")
        return None

def main():
    config = load_config()
    if not config: return
    print(f"AegisAPI Agent Active. Monitoring: {config['log_file_path']}")

if __name__ == "__main__":
    main()`;

    const configJson = JSON.stringify(
      {
        server_url: serverUrl,
        api_key: apiKeys.length > 0 ? apiKeys[0].key : "YOUR_API_KEY_HERE",
        log_file_path: "/var/log/nginx/access.log",
      },
      null,
      4,
    );

    zip.file("agent.py", agentPython);
    zip.file("config.json", configJson);

    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "AegisAPI_Agent.zip";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black cyber-grid text-slate-300 font-sans">
      <Navbar />
      <div className="max-w-4xl mx-auto space-y-12 px-6 md:px-8 pt-28 pb-12">
        <section>
          <h1 className="text-3xl font-bold text-white mb-4">
            AegisAPI Agent Setup
          </h1>
          <p className="text-slate-400 leading-relaxed max-w-2xl">
            The AI Agent is required for large-scale systems where log files are
            too massive for manual uploads. It automates the log analysis
            process by monitoring files locally and pushing processed security
            signatures to the dashboard in real-time.
          </p>
        </section>

        <div className="glass neon-border rounded-xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">
              Step 1: Download Agent
            </h2>
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
                    <strong className="text-white">agent.py</strong> - Main
                    script
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
  "server_url": "",
  "api_key": "",
  "log_file_path": ""
}`}</pre>
            </div>
          </div>

          <button
            onClick={downloadAgentZip}
            disabled={isZipLoading || zipError}
            className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] disabled:opacity-50"
          >
            {isZipLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Loading JSZip...
              </>
            ) : zipError ? (
              <>
                <AlertCircle size={18} /> Error Loading JSZip
              </>
            ) : (
              <>
                <Download size={18} /> Download Agent (ZIP)
              </>
            )}
          </button>
        </div>

        <div className="glass rounded-xl border border-emerald-500/20 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              Step 2: Create API Key
            </h2>
            <button
              onClick={generateApiKey}
              disabled={isGenerating}
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase border-b border-emerald-500/15">
                <tr>
                  <th className="py-3 px-4">Sr No</th>
                  <th className="py-3 px-4">Server URL</th>
                  <th className="py-3 px-4">API Key</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
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
                      <td className="py-4 px-4 font-mono text-xs">
                        {k.serverUrl}
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
            file. Copy the <strong className="text-white">server_url</strong>{" "}
            and <strong className="text-white">api_key</strong> generated in
            Step 2 and paste them into the corresponding fields.
          </p>
        </div>

        <div className="glass rounded-xl border border-emerald-500/20 p-8 space-y-10">
          <h2 className="text-xl font-bold text-white">Step 4: Run Agent</h2>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Settings size={16} className="text-cyan-400" /> 4.1 Update log
              file path
            </h3>
            <div className="p-4 bg-black/60 border border-emerald-500/20 rounded-lg font-mono text-xs">
              "log_file_path":{" "}
              <span className="text-cyan-400">"/path/to/logs.json"</span>
            </div>
            <p className="text-xs text-slate-500">
              Ensure the path points to your actual application log file.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Play size={16} className="text-green-500" /> 4.2 Run the script
            </h3>
            <div className="flex items-center justify-between p-4 bg-black/60 border border-emerald-500/20 rounded-lg font-mono text-xs">
              <code className="text-slate-300">python agent.py</code>
              <Copy size={14} className="text-slate-700 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgentPage;
