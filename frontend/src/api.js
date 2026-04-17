import axios from "axios";

const API_BASE = "http://localhost:8000/api";

export const aegisApi = {
  uploadLogs: async (logs) => {
    const response = await axios.post(`${API_BASE}/upload`, logs);
    return response.data;
  },
  
  resetDemo: async () => {
    const response = await axios.post(`${API_BASE}/reset-demo`);
    return response.data;
  },

  getAnalysis: async () => {
    const response = await axios.get(`${API_BASE}/analysis`);
    return response.data;
  },
  
  getGraph: async () => {
    const response = await axios.get(`${API_BASE}/graph`);
    return response.data;
  }
};

export default aegisApi;