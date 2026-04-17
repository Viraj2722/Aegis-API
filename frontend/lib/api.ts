const BASE_URL = "http://127.0.0.1:8000";

export const runAnalysis = async () => {
  const res = await fetch(`${BASE_URL}/run-analysis`, {
    method: "POST",
  });
  return res.json();
};