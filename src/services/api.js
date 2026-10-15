import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5090/api";
const api = axios.create({ baseURL: API_BASE_URL, headers: { "Content-Type": "application/json" }, timeout: 15000 });
const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
let refreshPromise = null;
let onSessionExpired = null;
export const setSessionExpiredHandler = (handler) => { onSessionExpired = handler; };

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response.data, async (error) => {
  const original = error.config || {};
  if (!error.response) error.message = "Cannot connect to the server. Check the API URL and backend status.";
  const isAuthRoute = /auth\/(login|refresh|logout)/i.test(original.url || "");
  if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) { onSessionExpired?.(); return Promise.reject(error); }
    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient.post("auth/refresh", { refreshToken }).then((r) => r.data).finally(() => { refreshPromise = null; });
      }
      const tokens = await refreshPromise;
      if (!tokens?.accessToken || !tokens?.refreshToken) throw new Error("Refresh endpoint returned an invalid token response.");
      localStorage.setItem("accessToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);
      if (tokens.user) localStorage.setItem("user", JSON.stringify(tokens.user));
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(original);
    } catch (refreshError) {
      localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); localStorage.removeItem("user");
      onSessionExpired?.();
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});

// Services receive response.data, never Axios response wrappers.
const apiService = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data, config = {}) => api.post(url, data, config),
  put: (url, data, config = {}) => api.put(url, data, config),
  patch: (url, data, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
};
export default apiService;
