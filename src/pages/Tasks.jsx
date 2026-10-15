
import React, { useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import Sidebar from "../components/common/Sidebar";
import StatusBadge from "../components/common/StatusBadge";
import taskService from "../services/taskService";
import employeeService from "../services/employeeService";
import { taskKeys } from "../hooks/useTasksQuery";
import { employeeKeys } from "../hooks/useEmployeesQuery";
import useDebounce from "../hooks/useDebounce";
import { useAuth } from "../context/AuthContext";

import "../styles/Tasks.scss";

const initialForm = {
  title: "",
  description: "",
  employeeId: "",
  status: "Pending",
  priority: "Medium",
  dueDate: "",
};

const Tasks = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canManageTasks = role === "admin" || role === "manager";
  const canDeleteTasks = role === "admin";
  const isEmployee = role === "employee";
  const [statusError, setStatusError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const debouncedSearch = useDebounce(search, 350);
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 300);
  const taskParams = useMemo(() => ({ page, pageSize, search: debouncedSearch || undefined, status: statusFilter || undefined, priority: priorityFilter || undefined, sortBy: "createdAt", sortDir: "desc" }), [page, pageSize, debouncedSearch, statusFilter, priorityFilter]);
  const tasksQuery = useQuery({
    queryKey: taskKeys.list(taskParams),
    queryFn: ({ signal }) => taskService.getTasks(taskParams, signal),
    placeholderData: (previous) => previous,
  });
  const employeeParams = useMemo(() => ({ page: 1, pageSize: 15, search: debouncedEmployeeSearch || undefined, sortBy: "lastName", sortDir: "asc" }), [debouncedEmployeeSearch]);
  const employeesQuery = useQuery({
    queryKey: employeeKeys.list(employeeParams),
    queryFn: ({ signal }) => employeeService.getEmployees(employeeParams, signal),
    staleTime: 60_000,
    enabled: showForm,
  });
  const tasks = Array.isArray(tasksQuery.data) ? tasksQuery.data : (tasksQuery.data?.items || []);
  const totalCount = tasksQuery.data?.totalCount ?? tasks.length;
  const totalPages = Math.max(1, tasksQuery.data?.totalPages ?? Math.ceil(totalCount / pageSize));
  const loading = tasksQuery.isPending || (showForm && employeesQuery.isPending);
  const error = tasksQuery.error?.response?.data?.detail || tasksQuery.error?.response?.data?.message || tasksQuery.error?.message || (showForm ? (employeesQuery.error?.response?.data?.detail || employeesQuery.error?.message) : "") || "";
  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id != null ? taskService.updateTask(id, data) : taskService.createTask(data),
    onSuccess: async (savedTask, variables) => {
      // Patch cached pages first so a task's new status/priority appears right
      // away. The invalidation below reconciles filter/pagination membership.
      if (variables?.id != null && savedTask) {
        queryClient.setQueryData(taskKeys.detail(variables.id), savedTask);
        queryClient.setQueriesData({ queryKey: taskKeys.all }, (cached) => {
          if (!cached) return cached;
          const merge = (items) => items.map((task) =>
            String(task.id ?? task.Id) === String(savedTask.id ?? savedTask.Id)
              ? { ...task, ...savedTask }
              : task
          );
          if (Array.isArray(cached)) return merge(cached);
          if (Array.isArray(cached.items)) return { ...cached, items: merge(cached.items) };
          if (Array.isArray(cached.Items)) return { ...cached, Items: merge(cached.Items) };
          if (Array.isArray(cached.data)) return { ...cached, data: merge(cached.data) };
          return cached;
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => taskService.deleteTask(id),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => taskService.updateTaskStatus(id, status),
    onSuccess: async (updatedTask) => {
      if (updatedTask) {
        queryClient.setQueriesData({ queryKey: taskKeys.all }, (cached) => {
          if (!cached) return cached;
          const merge = (items) => items.map((task) =>
            String(task.id ?? task.Id) === String(updatedTask.id ?? updatedTask.Id)
              ? { ...task, ...updatedTask }
              : task
          );
          if (Array.isArray(cached)) return merge(cached);
          if (Array.isArray(cached.items)) return { ...cached, items: merge(cached.items) };
          if (Array.isArray(cached.Items)) return { ...cached, Items: merge(cached.Items) };
          return cached;
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
  React.useEffect(() => {
    const payload = employeesQuery.data;
    setEmployees(Array.isArray(payload) ? payload : (payload?.items || []));
  }, [employeesQuery.data]);

  // Resolve employee names using the employee ID
  const getEmployeeName = (employeeId) => {
    const employee = employees.find(
      (item) => Number(item.id) === Number(employeeId)
    );

    if (!employee) {
      return "Unknown employee";
    }

    return `${employee.firstName} ${employee.lastName}`;
  };

  // Format backend dates for the date input
  const formatDateForInput = (date) => {
    if (!date) return "";

    return String(date).substring(0, 10);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setEmployeeSearch("");
    setShowForm(true);
  };

  const openEditForm = (task) => {
    setEditingId(task.id);

    setForm({
      title: task.title || "",
      description: task.description || "",
      employeeId: String(task.employeeId ?? ""),
      status: task.status || "Pending",
      priority: task.priority || "Medium",
      dueDate: formatDateForInput(task.dueDate),
    });

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
    setEmployeeSearch("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || form.title.trim().length < 3) {
      window.alert("Task title must contain at least 3 characters.");
      return;
    }

    if (!form.employeeId) {
      window.alert("Please select an employee.");
      return;
    }

    if (!form.dueDate) {
      window.alert("Please select a due date.");
      return;
    }

    if (form.description.length > 500) {
      window.alert("Description cannot exceed 500 characters.");
      return;
    }

    const taskData = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      employeeId: Number(form.employeeId),
      priority: form.priority,
      status: form.status,
      dueDate: `${form.dueDate}T00:00:00`,
    };

    try {
      await saveMutation.mutateAsync({ id: editingId, data: taskData });
    } catch (err) {
      window.alert(err.response?.data?.message || err.message || "Failed to save the task.");
    }
  };

  const handleStatusChange = async (id, status) => {
    setStatusError("");
    setUpdatingStatusId(id);
    try {
      await statusMutation.mutateAsync({ id, status });
    } catch (err) {
      setStatusError(err.response?.data?.detail || err.response?.data?.message || "Unable to update task status.");
      await tasksQuery.refetch();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!canDeleteTasks) return;
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      window.alert(err.response?.data?.message || err.message || "Failed to delete the task.");
    }
  };

  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content">
        <div className="tasks-page">
          {/* Header */}
          <div className="tasks-header">
            <div>
              <h1>Tasks</h1>
              <p>Create, manage and track employee tasks</p>
            </div>

            {canManageTasks && (
              <button
                type="button"
                className="add-task-button"
                onClick={openCreateForm}
              >
                <Plus size={17} />
                Add Task
              </button>
            )}
          </div>

          {/* Search */}
          <div className="task-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <div className="task-filters">
            <label>Filter status
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                <option value="">All statuses</option><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option>
              </select>
            </label>
            <label>Filter priority
              <select value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value); setPage(1); }}>
                <option value="">All priorities</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
              </select>
            </label>
          </div>

          {(error || statusError || saveMutation.error || deleteMutation.error) && (
            <div role="alert" className="error-message">
              {statusError || error || saveMutation.error?.response?.data?.detail || saveMutation.error?.response?.data?.message || deleteMutation.error?.response?.data?.detail || deleteMutation.error?.response?.data?.message || "The request failed. Please try again."}
              <button type="button" onClick={() => tasksQuery.refetch()}>Retry</button>
            </div>
          )}

          {/* Form */}
          {showForm && canManageTasks && (
            <div className="task-form-card">
              <div className="task-form-header">
                <div>
                  <h2>{editingId !== null ? "Edit Task" : "Add Task"}</h2>
                  <p>Enter task information</p>
                </div>

                <button
                  type="button"
                  className="close-task-form"
                  onClick={closeForm}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="task-form-grid">
                  <div className="task-form-group">
                    <label htmlFor="task-title">Task Title</label>

                    <input
                      id="task-title"
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Enter task title"
                      minLength={3}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="task-form-group">
                    <label htmlFor="task-employee-search">Find employee</label>
                    <input
                      id="task-employee-search"
                      type="search"
                      value={employeeSearch}
                      onChange={(event) => setEmployeeSearch(event.target.value)}
                      placeholder="Search by employee name, email or department"
                    />
                    <label htmlFor="task-employee">Employee</label>

                    <select
                      id="task-employee"
                      name="employeeId"
                      value={form.employeeId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select employee</option>

                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} — {employee.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="task-form-group">
                    <label htmlFor="task-status">Status</label>

                    <select
                      id="task-status"
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div className="task-form-group">
                    <label htmlFor="task-priority">Priority</label>

                    <select
                      id="task-priority"
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="task-form-group">
                    <label htmlFor="task-due-date">Due Date</label>

                    <input
                      id="task-due-date"
                      type="date"
                      name="dueDate"
                      value={form.dueDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="task-form-group task-description">
                    <label htmlFor="task-description">Description</label>

                    <textarea
                      id="task-description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Enter task description"
                      maxLength={500}
                    />
                  </div>
                </div>

                <div className="task-form-actions">
                  <button
                    type="button"
                    className="task-cancel-button"
                    onClick={closeForm}
                    disabled={saveMutation.isPending}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="task-save-button"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending
                      ? "Saving..."
                      : editingId !== null
                      ? "Update Task"
                      : "Save Task"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Only the requested server page is downloaded; react-window renders visible rows. */}
          <div className="tasks-table">
            <div className="tasks-table-header">
              <span>Task</span><span>Employee</span><span>Priority</span><span>Status</span><span>Due Date</span><span>Action</span>
            </div>
            {loading ? <div className="tasks-empty">Loading tasks...</div> : tasksQuery.isError ? <div className="tasks-empty">Unable to load tasks. Use Retry above.</div> : tasks.length === 0 ? <div className="tasks-empty">No tasks found.</div> : (
              <List height={Math.min(560, Math.max(112, tasks.length * 70))} itemCount={tasks.length} itemSize={70} width="100%" itemData={{ tasks, getEmployeeName, formatDateForInput, openEditForm, handleDelete: (id) => handleDelete(id), handleStatusChange, role, userEmail: user?.email || "", updatingStatusId, deleting: deleteMutation.isPending, canManageTasks, canDeleteTasks }}>
                {({ index, style, data }) => {
                  const task = data.tasks[index];
                  if (!task) return null;
                  const isAssignedToCurrentEmployee = data.role === "employee" && data.userEmail && String(task.employeeEmail || "").toLowerCase() === String(data.userEmail).toLowerCase();
                  const nextStatuses = task.status === "Pending" ? ["Pending", "In Progress"] : task.status === "In Progress" ? ["In Progress", "Completed"] : ["Completed"];
                  return <div style={style} className="task-row" key={task.id}>
                    <div className="task-title-cell"><strong>{task.title}</strong><span>{task.description || "No description"}</span></div>
                    <div>{task.employeeName || data.getEmployeeName(task.employeeId)}</div>
                    <div><span className={`priority-badge ${(task.priority || "medium").toLowerCase()}`}>{task.priority}</span></div>
                    <div>
                      {isAssignedToCurrentEmployee ? (
                        <select aria-label={`Update status for ${task.title}`} value={task.status} disabled={data.updatingStatusId === task.id} onChange={(event) => data.handleStatusChange(task.id, event.target.value)}>
                          {nextStatuses.map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption}</option>)}
                        </select>
                      ) : <StatusBadge status={task.status} />}
                    </div>
                    <div>{data.formatDateForInput(task.dueDate) || "-"}</div>
                    <div className="task-actions">
                      {data.canManageTasks && <button type="button" onClick={() => data.openEditForm(task)} title="Edit" aria-label={`Edit ${task.title}`}><Pencil size={15} /></button>}
                      {data.canDeleteTasks && <button type="button" disabled={data.deleting} onClick={() => data.handleDelete(task.id)} title="Delete" aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button>}
                    </div>
                  </div>;
                }}
              </List>
            )}
          </div>
          <div className="employee-pagination task-pagination">
            <span>Page {page} of {totalPages} · {totalCount.toLocaleString()} tasks</span>
            <div>
              <button type="button" disabled={page <= 1 || tasksQuery.isFetching} onClick={() => setPage((value) => value - 1)}>Previous</button>
              <button type="button" disabled={page >= totalPages || tasksQuery.isFetching} onClick={() => setPage((value) => value + 1)}>Next</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Tasks;
