import axios from 'axios';

const apiClient = axios.create({
  baseURL: "https://ticketing-system-93gf.onrender.com/",
  headers: {
    "Content-Type": "application/json",
  },
});
// Add a request interceptor to include Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
