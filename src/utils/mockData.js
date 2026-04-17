export const MOCK_ALERTS = [
  {
    id: 1,
    severity: "critical",
    message: "Critical API behavior detected",
    time: "Just now",
    read: false,
  },
  {
    id: 2,
    severity: "high",
    message: "Shadow API detected by behavioral fingerprint",
    time: "2 min ago",
    read: false,
  },
  {
    id: 3,
    severity: "medium",
    message: "Low-traffic endpoint may be zombie API",
    time: "5 min ago",
    read: true,
  },
];
