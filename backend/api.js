import axios from "axios";

const API_BASE = "http://localhost:8000/api";

export const aegisApi = {
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