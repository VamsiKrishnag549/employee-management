import api from "./api";
const taskService = {
  getTasks: (params = {}, signal) => api.get("Tasks", { params: { page: 1, pageSize: 15, ...params }, signal }),
  getTaskById: (id) => api.get(`Tasks/${id}`),
  createTask: (task) => api.post("Tasks", task),
  updateTask: (id, task) => api.put(`Tasks/${id}`, task),
  updateTaskStatus: (id, status) => api.patch(`Tasks/${id}/status`, { status }),
  deleteTask: (id) => api.delete(`Tasks/${id}`),
};
export default taskService;
