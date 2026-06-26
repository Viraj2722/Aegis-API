export const globalStats = {
  totalUsers: 1824,
  activeAgents: 48,
  onlineAgents: 41,
  regionsCovered: 12,
};

export const ingestionStats = {
  totalLogsAnalyzed: 2458921,
  avgLatencyMs: 28,
};

export const professionData = [
  { name: "Security Engineers", value: 482, color: "#38bdf8" },
  { name: "Backend Developers", value: 396, color: "#a855f7" },
  { name: "DevOps Engineers", value: 351, color: "#34d399" },
  { name: "SRE", value: 279, color: "#f59e0b" },
  { name: "Platform Engineers", value: 221, color: "#22d3ee" },
];

export const threatData = {
  donut: [
    { name: "Critical", value: 18, color: "#f87171" },
    { name: "High", value: 34, color: "#fb923c" },
    { name: "Medium", value: 72, color: "#fbbf24" },
    { name: "Low", value: 119, color: "#38bdf8" },
  ],
  categories: [
    { category: "Auth", suspicious: 22, zombie: 6 },
    { category: "Payments", suspicious: 18, zombie: 4 },
    { category: "Users", suspicious: 11, zombie: 3 },
    { category: "Reports", suspicious: 14, zombie: 5 },
    { category: "Internal", suspicious: 7, zombie: 9 },
  ],
};

export const ingestionData = [
  { time: "09:00", logs: 12000 },
  { time: "10:00", logs: 15400 },
  { time: "11:00", logs: 13200 },
  { time: "12:00", logs: 18100 },
  { time: "13:00", logs: 16500 },
  { time: "14:00", logs: 20500 },
  { time: "15:00", logs: 19300 },
  { time: "16:00", logs: 22400 },
];

export const riskMatrixData = {
  regions: ["NA", "EU", "IN", "APAC", "MEA"],
  riskLevels: ["Critical", "High", "Medium", "Low", "Info"],
  matrix: [
    [82, 74, 69, 57, 42],
    [66, 59, 52, 47, 33],
    [41, 38, 35, 28, 22],
    [26, 19, 17, 15, 12],
    [11, 9, 7, 6, 4],
  ],
};

export const agentsData = {
  total: 3,
  online: 2,
  offline: 1,
  idle: 0,
  agents: [
    { id: "AG-1001", name: "Aegis Core", region: "NA", status: "online", load: 72 },
    { id: "AG-1002", name: "Risk Mapper", region: "EU", status: "online", load: 63 },
    { id: "AG-1003", name: "Shadow Hunter", region: "APAC", status: "offline", load: 0 },
  ],
};

export const helpItems = [
  {
    title: "How is risk score calculated?",
    content:
      "Risk combines anomaly score, error rate, latency, inactivity, and behavioral overlap with known risky APIs.",
  },
  {
    title: "What is a shadow API?",
    content:
      "A shadow API is an undocumented or duplicate endpoint discovered by traffic behavior and route similarity patterns.",
  },
  {
    title: "How often is analysis refreshed?",
    content:
      "Analysis updates after each upload cycle. In admin view, charts represent the latest aggregated telemetry snapshot.",
  },
  {
    title: "How do I clear uploaded user data?",
    content:
      "Current setup clears user analysis artifacts when they sign out, including api analysis, risk alerts, graph, and upload sessions.",
  },
];
