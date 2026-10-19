import api from "./api";

const employeeService = {
  getEmployees: (params = {}, signal) => {
    const {
      pageNumber = 1,
      pageSize = 10,
      sortBy = "name",
      sortOrder = "asc",
      ...filters
    } = params;

    return api.get("Employees", {
      params: {
        ...filters,
        pageNumber,
        pageSize,
        sortBy,
        sortOrder,
      },
      signal,
    });
  },

  getEmployeeById: (id) =>
    api.get(`Employees/${id}`),

  createEmployee: (employee) =>
    api.post("Employees", employee),

  updateEmployee: (id, employee) =>
    api.put(`Employees/${id}`, employee),

  patchEmployee: (id, employee) =>
    api.patch(`Employees/${id}`, employee),

  getEmployeeTasks: (employeeId) =>
    api.get(`Employees/${employeeId}/tasks`),

  deleteEmployee: (id) =>
    api.delete(`Employees/${id}`),
};

export default employeeService;