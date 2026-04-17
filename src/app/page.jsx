"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Zap, Activity, Ghost, BarChart3, Lock, ChevronRight, AlertOctagon, RefreshCw, UploadCloud, FileJson, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from '../components/Dashboard';
import ApiGraph from '../components/ApiGraph';
import ApiDetailsPanel from '../components/ApiDetailsPanel';
import { aegisApi } from '../api';

export default function App() {
  const [data, setData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [view, setView] = useState('landing'); // 'landing', 'dashboard', 'graph'
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [attackMode, setAttackMode] = useState(false);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const [analysisRes, graphRes] = await Promise.all([
        aegisApi.getAnalysis(),
        aegisApi.getGraph()
      ]);
      setData(analysisRes);
      setGraphData(graphRes);
      setLastUpdated(new Date().toLocaleTimeString());
      if (view === 'landing') setView('dashboard');
      
      // Trigger Toast if new critical threats detected in background
      if (isBackground && analysisRes.metrics.critical_risk > 0) {
        setToast(`WARNING: ${analysisRes.metrics.critical_risk} Critical Threats Active.`);
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err) {
      console.error(err);
      alert("Backend not reachable. Ensure uvicorn is running!");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [view]);

  // Auto-refresh polling every 10 seconds once logged in
  useEffect(() => {
    let interval;
    if (view !== 'landing') {
      interval = setInterval(() => loadData(true), 10000);
    }
    return () => clearInterval(interval);
  }, [view, loadData]);

  const activeApiDetails = data?.api_data?.find(a => a.endpoint === selectedEndpoint);

  if (view === 'landing') return <LandingPage onStart={() => loadData(false)} loading={loading} />;

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-200 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-[#0f172a] p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <Shield className="text-indigo-500 w-8 h-8" />
          <span className="text-xl font-bold tracking-tight text-white">AEGIS<span className="text-indigo-500">API</span></span>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem icon={<BarChart3 size={20}/>} label="Risk Overview" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={<Activity size={20}/>} label="Attack Surface" active={view === 'graph'} onClick={() => setView('graph')} />
          <div className="pt-4 mt-4 border-t border-slate-800">
            <NavItem icon={<UploadCloud size={20}/>} label="New Scan" active={false} onClick={() => setView('landing')} />
          </div>
        </nav>

        <button onClick={() => setView('landing')} className="text-sm text-slate-500 hover:text-white transition-colors">
          Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-8">
        
        {/* Global Threat Banner */}
        <AnimatePresence>
          {data?.metrics?.critical_risk > 0 && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-4 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <AlertOctagon className="text-red-500 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-red-400 font-bold">Critical Threats Detected</h3>
                <p className="text-sm text-red-400/80">{data.metrics.critical_risk} API endpoints are showing critical vulnerability patterns. Immediate review required.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white capitalize">{view.replace('-', ' ')}</h1>
            <p className="text-slate-400">Security intelligence for banking infrastructure.</p>
          </div>
          <div className="flex items-center gap-6">
            {/* Simulate Attack Toggle */}
            <button 
              onClick={() => { setAttackMode(!attackMode); if(view !== 'graph') setView('graph'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border transition-all overflow-hidden relative ${attackMode ? 'bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}`}
            >
              {attackMode && <div className="absolute inset-0 bg-red-500/20 animate-pulse" />}
              <Crosshair size={18} className={attackMode ? "animate-spin-slow" : ""} />
              {attackMode ? "Halt Simulation" : "Simulate Attack"}
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              {isRefreshing ? <RefreshCw size={14} className="animate-spin text-indigo-400" /> : <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
              Last updated: {lastUpdated}
            </div>
          </div>
        </header>

        {view === 'dashboard' ? (
          <Dashboard data={data} onSelectApi={setSelectedEndpoint} />
        ) : (
          <ApiGraph graphData={graphData} onSelectApi={setSelectedEndpoint} isSimulatingAttack={attackMode} />
        )}
        
        {/* Sliding Details Panel */}
        {selectedEndpoint && <ApiDetailsPanel api={activeApiDetails} onClose={() => setSelectedEndpoint(null)} />}
        
        {/* Global Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }} className="fixed bottom-10 left-1/2 bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(239,68,68,0.6)] flex items-center gap-3 z-50">
              <AlertOctagon size={18} className="animate-pulse" /> {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function LandingPage({ onStart }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, analyzing
  const [progress, setProgress] = useState(0);

  const handleFile = async (file) => {
    if (!file) return;
    setUploadStatus('uploading');
    
    try {
      const text = await file.text();
      let json;
      
      // Schema-agnostic frontend parser (supports both CSV and JSON)
      if (file.name.toLowerCase().endsWith('.csv')) {
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
        json = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, i) => {
            let val = values[i]?.trim();
            if (val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            obj[header] = val;
            return obj;
          }, {});
        });
      } else {
        json = JSON.parse(text);
      }
      
      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 10;
        if (prog < 90) setProgress(prog);
      }, 100);

      await aegisApi.uploadLogs(json);
      
      clearInterval(interval);
      setProgress(100);
      setUploadStatus('analyzing');
      setTimeout(() => onStart(), 1500);
    } catch (err) {
      console.error(err);
      if (err.response?.data?.detail) {
        alert(`Upload Failed: ${err.response.data.detail}`);
      } else {
        alert("Error: Please upload a valid JSON or CSV log file.");
      }
      setUploadStatus('idle');
      setProgress(0);
    }
  };

  const handleSimulatedUpload = async () => {
    setUploadStatus('uploading');
    await aegisApi.resetDemo(); // Tell backend to generate fresh mock data
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 15;
      if (prog >= 100) {
        clearInterval(interval);
        setProgress(100);
        setUploadStatus('analyzing');
        setTimeout(() => onStart(), 1500);
      } else {
        setProgress(prog);
      }
    }, 200);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden selection:bg-indigo-500/30 font-sans">
      {/* Animated Background Elements */}
      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/20 blur-[120px] -z-10 pointer-events-none" />
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/20 blur-[150px] -z-10 pointer-events-none" />

      {/* Sticky Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
              <Shield className="text-indigo-400 w-6 h-6 md:w-7 md:h-7" />
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tight">AEGIS<span className="text-indigo-500">API</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onStart()} className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition-colors">Skip to Dashboard</button>
            <button onClick={() => window.scrollTo({top: 500, behavior: 'smooth'})} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-indigo-50 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">Get Started</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-32 pb-24 md:pt-40 md:pb-32 text-center">
        <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } }} className="relative z-10">
          
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs md:text-sm font-semibold mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Powered by Isolation Forest AI
          </motion.div>

          <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }} className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 md:mb-8 leading-[1.1]">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">Expose the Invisible.</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">Secure the Forgotten.</span>
          </motion.h1>

          <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }} className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 md:mb-16 leading-relaxed">
            Enterprise-grade behavioral anomaly detection. Identify <strong className="text-slate-200 font-semibold">Zombie APIs</strong>, map your attack surface, and prevent lateral movement before the breach occurs.
          </motion.p>

          {/* Drag & Drop Ingestion Zone */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }} className="max-w-2xl mx-auto relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${isDragging ? 'opacity-75 blur-md animate-pulse' : ''}`}></div>
            
            <div className="relative bg-[#0b1120]/90 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-6 md:p-10 shadow-2xl">
            {uploadStatus === 'idle' ? (
              <>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('log-upload').click()}
                className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-8 md:p-12 transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] overflow-hidden ${isDragging ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]' : 'border-slate-700 bg-slate-900/50 hover:border-indigo-500/50 hover:bg-slate-800/80'}`}
              >
                {/* Hover glow effect inside dropzone */}
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <input 
                  type="file" 
                  id="log-upload" 
                  className="hidden" 
                  accept=".json,.csv"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
                <div className={`p-4 rounded-full mb-6 transition-all duration-500 ${isDragging ? 'bg-indigo-500/20 text-indigo-400 scale-110' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10'}`}>
                  <UploadCloud size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-white">Ingest Telemetry Logs</h3>
                <p className="text-slate-400 mb-8 text-sm text-center max-w-sm">Drag and drop your API Gateway logs (JSON or CSV) or click to browse your local filesystem.</p>
                
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1.5 bg-[#020617] px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner"><FileJson size={14} className="text-amber-400"/> AWS Gateway</span>
                  <span className="flex items-center gap-1.5 bg-[#020617] px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner"><FileJson size={14} className="text-emerald-400"/> NGINX</span>
                  <span className="flex items-center gap-1.5 bg-[#020617] px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner"><FileJson size={14} className="text-blue-400"/> Kong</span>
                </div>
              </div>
              <button 
                onClick={handleSimulatedUpload} 
                className="mt-6 flex items-center justify-center w-full gap-2 text-sm text-slate-400 hover:text-white transition-colors py-2 group/btn"
              >
                <span>Or click here to load the</span>
                <span className="text-indigo-400 group-hover/btn:underline underline-offset-4 decoration-indigo-400/50">live demo architecture</span>
              </button>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 px-6 flex flex-col items-center justify-center min-h-[350px]">
                <div className="relative mb-8">
                  <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin w-16 h-16 blur-[2px]"></div>
                  <div className="border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin w-16 h-16"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield size={20} className="text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <div className="w-full max-w-md">
                  <div className="flex justify-between items-end mb-3 font-mono text-sm">
                    <span className="text-indigo-300 font-medium tracking-wide">
                      {uploadStatus === 'uploading' ? 'Ingesting telemetry streams...' : 'AI mapping attack surface...'}
                    </span>
                    <span className="text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#020617] rounded-full overflow-hidden border border-slate-800 shadow-inner">
                    <motion.div 
                      className={`h-full relative ${uploadStatus === 'uploading' ? 'bg-indigo-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'}`}
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.2 }}
                    >
                      {uploadStatus === 'analyzing' && <div className="absolute inset-0 bg-white/20 animate-[pulse_1s_ease-in-out_infinite]" />}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
            </div>
          </motion.div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } }}
          className="grid md:grid-cols-3 gap-6 md:gap-8 mt-32 text-left relative z-10"
        >
          <FeatureCard 
            icon={<Ghost size={24} className="text-orange-400"/>} 
            title="Zombie API Detection" 
            desc="Automatically identifies forgotten, unmonitored legacy endpoints that act as invisible backdoors for attackers." 
            glowColor="group-hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]"
          />
          <FeatureCard 
            icon={<Activity size={24} className="text-indigo-400"/>} 
            title="Behavioral Fingerprinting" 
            desc="Calculates complex baseline deviations for latency, error rates, and traffic volume to detect Shadow APIs instantly." 
            glowColor="group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]"
          />
          <FeatureCard 
            icon={<Lock size={24} className="text-emerald-400"/>} 
            title="Kill Chain Mapping" 
            desc="Visualizes your microservice topography and intelligently simulates how lateral movement breaches occur." 
            glowColor="group-hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]"
          />
        </motion.div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc, glowColor }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} 
      className={`group p-8 rounded-3xl border border-slate-800 bg-[#0b1120]/60 backdrop-blur-sm hover:bg-[#0f172a]/80 hover:border-slate-700 transition-all duration-300 ${glowColor}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-indigo-300 transition-colors">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm md:text-base">{desc}</p>
    </motion.div>
  );
}