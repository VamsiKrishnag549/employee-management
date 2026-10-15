import api from "./api";
const employeeService = {
  getEmployees: (params = {}, signal) => api.get("Employees", { params: { page: 1, pageSize: 15, ...params }, signal }),
  getEmployeeById: (id) => api.get(`Employees/${id}`),
  createEmployee: (employee) => api.post("Employees", employee),
  updateEmployee: (id, employee) => api.put(`Employees/${id}`, employee),
  patchEmployee: (id, employee) => api.patch(`Employees/${id}`, employee),
  getEmployeeTasks: (employeeId) => api.get(`Employees/${employeeId}/tasks`),
  deleteEmployee: (id) => api.delete(`Employees/${id}`),
};
export default employeeService;
