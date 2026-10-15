import api from "./api";

const dashboardService = {
  getDashboardSummary: () => api.get("Dashboard/summary"),
};

export default dashboardService;
