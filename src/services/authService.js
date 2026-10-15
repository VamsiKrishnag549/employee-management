import api from "./api";
const authService = {
  login: (email, password, role) => api.post("auth/login", { email, password, role }),
  refresh: (refreshToken) => api.post("auth/refresh", { refreshToken }),
  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try { if (refreshToken) await api.post("auth/logout", { refreshToken }); }
    finally { ["accessToken", "refreshToken", "token", "user"].forEach((key) => localStorage.removeItem(key)); }
  },
};
export default authService;
