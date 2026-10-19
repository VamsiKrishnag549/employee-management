
import React, { useEffect, useMemo, useRef ,useState } from "react";
import { FixedSizeList as List } from "react-window";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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

// --------------------------------------------------
// Tasks Page
// --------------------------------------------------

const Tasks = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // User permissions
  const role = String(user?.role || "").toLowerCase();

  const canManageTasks = role === "admin" || role === "manager";
  const canDeleteTasks = role === "admin";

  // ------------------------------------------------
  // State management
  // ------------------------------------------------

  const [statusError, setStatusError] = useState("");
  const [formError, setFormError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [employees, setEmployees] = useState([]);

  const [search, setSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  const formRef = useRef(null);
  const [pageNumber, setPageNumber] = useState(1);

  const pageSize = 10;

  // Debounced search
  const debouncedSearch = useDebounce(search, 350);
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 300);

  // ------------------------------------------------
  // Task query parameters
  // ------------------------------------------------

  const taskParams = useMemo(
    () => ({
      pageNumber,
      pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      sortBy: "createdAt",
      sortOrder: "asc",
    }),
    [
      pageNumber,
      pageSize,
      debouncedSearch,
      statusFilter,
      priorityFilter,
    ]
  );

  // ------------------------------------------------
  // Fetch tasks
  // ------------------------------------------------

  const tasksQuery = useQuery({
    queryKey: taskKeys.list(taskParams),

    queryFn: ({ signal }) =>
      taskService.getTasks(taskParams, signal),

    placeholderData: (previous) => previous,
  });

  // ------------------------------------------------
  // Employee query parameters
  // ------------------------------------------------

  const employeeParams = useMemo(
    () => ({
      pageNumber: 1,
      pageSize: 10,
      search: debouncedEmployeeSearch || undefined,
      sortBy: "name",
      sortOrder: "asc",
    }),
    [debouncedEmployeeSearch]
  );

  // ------------------------------------------------
  // Fetch employees when the form is open
  // ------------------------------------------------

  const employeesQuery = useQuery({
    queryKey: employeeKeys.list(employeeParams),

    queryFn: ({ signal }) =>
      employeeService.getEmployees(employeeParams, signal),

    staleTime: 60_000,
    enabled: showForm,
  });

  // ------------------------------------------------
  // Normalize API response data
  // ------------------------------------------------

  const taskResponse = tasksQuery.data;

  const tasks = Array.isArray(taskResponse)
    ? taskResponse
    : taskResponse?.items ??
      taskResponse?.Items ??
      taskResponse?.data ??
      taskResponse?.Data ??
      [];

  const totalCount = Array.isArray(taskResponse)
    ? taskResponse.length
    : taskResponse?.totalCount ??
      taskResponse?.TotalCount ??
      tasks.length;

  const totalPages = Math.max(
    1,
    taskResponse?.totalPages ??
      taskResponse?.TotalPages ??
      Math.ceil(totalCount / pageSize)
  );

  const loading =
    tasksQuery.isPending ||
    (showForm && employeesQuery.isPending);

  const error =
    tasksQuery.error?.response?.data?.detail ||
    tasksQuery.error?.response?.data?.message ||
    tasksQuery.error?.message ||
    (showForm
      ? employeesQuery.error?.response?.data?.detail ||
        employeesQuery.error?.message
      : "") ||
    "";

  // ------------------------------------------------
  // Update cached task data
  // ------------------------------------------------

  const updateCachedTask = (updatedTask) => {
    if (!updatedTask) return;

    const updatedId = updatedTask.id ?? updatedTask.Id;

    const mergeTasks = (items) =>
      items.map((task) => {
        const taskId = task.id ?? task.Id;

        return String(taskId) === String(updatedId)
          ? { ...task, ...updatedTask }
          : task;
      });

    queryClient.setQueriesData(
      { queryKey: taskKeys.all },
      (cached) => {
        if (!cached) return cached;

        if (Array.isArray(cached)) {
          return mergeTasks(cached);
        }

        if (Array.isArray(cached.items)) {
          return {
            ...cached,
            items: mergeTasks(cached.items),
          };
        }

        if (Array.isArray(cached.Items)) {
          return {
            ...cached,
            Items: mergeTasks(cached.Items),
          };
        }

        if (Array.isArray(cached.data)) {
          return {
            ...cached,
            data: mergeTasks(cached.data),
          };
        }

        return cached;
      }
    );
  };

  // ------------------------------------------------
  // Refresh task and dashboard queries
  // ------------------------------------------------

  const refreshTaskQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: taskKeys.all,
      }),

      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      }),
    ]);
  };

  // ------------------------------------------------
  // Create or update task
  // ------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id != null
        ? taskService.updateTask(id, data)
        : taskService.createTask(data),

    onSuccess: async (savedTask, variables) => {
      if (variables?.id != null && savedTask) {
        queryClient.setQueryData(
          taskKeys.detail(variables.id),
          savedTask
        );

        updateCachedTask(savedTask);
      }

      await refreshTaskQueries();

      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
    },
  });

  // ------------------------------------------------
  // Delete task
  // ------------------------------------------------

  const deleteMutation = useMutation({
    mutationFn: (id) => taskService.deleteTask(id),

    onSuccess: refreshTaskQueries,
  });

  // ------------------------------------------------
  // Update task status
  // ------------------------------------------------

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      taskService.updateTaskStatus(id, status),

    onSuccess: async (updatedTask) => {
      updateCachedTask(updatedTask);

      await refreshTaskQueries();
    },
  });

  // ------------------------------------------------
  // Store employee query results
  // ------------------------------------------------

  useEffect(() => {
    const payload = employeesQuery.data;

    const employeeList = Array.isArray(payload)
      ? payload
      : payload?.items ??
        payload?.Items ??
        payload?.data ??
        payload?.Data ??
        [];

    setEmployees(employeeList);
  }, [employeesQuery.data]);

  // ------------------------------------------------
  // Helper functions
  // ------------------------------------------------

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(
      (item) => Number(item.id) === Number(employeeId)
    );

    if (!employee) {
      return "Unknown employee";
    }

    return `${employee.firstName} ${employee.lastName}`;
  };

  const formatDateForInput = (date) => {
    if (!date) return "";

    return String(date).substring(0, 10);
  };

  // Convert ASP.NET Core / Axios errors into a readable message.
  const getApiErrorMessage = (err) => {
    const data = err?.response?.data;

    if (typeof data === "string" && data.trim()) return data;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.title) return data.title;

    if (data?.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors).flat().filter(Boolean);
      if (messages.length) return messages.join(" ");
    }

    if (!err?.response) {
      return "Cannot connect to the server. Check the backend and ngrok connection.";
    }

    if (err.response.status === 401) return "Your session has expired. Please sign in again.";
    if (err.response.status === 403) return "You do not have permission to perform this action.";
    return err?.message || "The request failed. Please try again.";
  };

  // ------------------------------------------------
  // Form handlers
  // ------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    setFormError("");
    setEditingId(null);
    setForm(initialForm);
    setEmployeeSearch("");
    setShowForm(true);
  };

  const openEditForm = (task) => {
  setFormError("");
  setEditingId(task.id ?? task.Id);

  setForm({
    title: task.title || "",
    description: task.description || "",
    employeeId: String(task.employeeId ?? task.EmployeeId ?? ""),
    status: task.status || "Pending",
    priority: task.priority || "Medium",
    dueDate: formatDateForInput(task.dueDate ?? task.DueDate),
  });

  setShowForm(true);

  setTimeout(() => {
    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
};

  const closeForm = () => {
    setFormError("");
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
    setEmployeeSearch("");
  };

  // ------------------------------------------------
  // Submit task form
  // ------------------------------------------------

 
const handleSubmit = async (event) => {
  event.preventDefault();
  setFormError("");

  // Validate required fields
  if (!form.title?.trim()) {
    setFormError("Task title is required.");
    return;
  }

  if (!form.employeeId) {
    setFormError("Please select an employee.");
    return;
  }

  if (!form.dueDate) {
    setFormError("Please select a due date.");
    return;
  }

  // Backend requires a future due date.
  // Compare calendar dates to avoid midnight/timezone issues.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = new Date(`${form.dueDate}T00:00:00`);
  selectedDate.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    window.alert("Due date cannot be in the past.");
    return;
  }

  const taskData = {
    title: form.title.trim(),
    description: form.description?.trim() || null,
    employeeId: Number(form.employeeId),
    status: form.status,
    priority: form.priority,
    dueDate: `${form.dueDate}T00:00:00`,
  };

  try {
    setIsSaving(true);

    if (editingId) {
      await taskService.updateTask(editingId, taskData);
    } else {
      await taskService.createTask(taskData);
    }

    setShowForm(false);
    setEditingId(null);

    // Refresh the task list using your existing query.
    await queryClient.invalidateQueries({
      queryKey: ["tasks"],
    });
  } catch (err) {
    window.alert(getApiErrorMessage(err));
  } finally {
    setIsSaving(false);
  }
};

  // ------------------------------------------------
  // Handle status changes
  // ------------------------------------------------

  const handleStatusChange = async (id, status) => {
    setStatusError("");
    setUpdatingStatusId(id);

    try {
      await statusMutation.mutateAsync({
        id,
        status,
      });
    } catch (err) {
      window.alert(getApiErrorMessage(err) || "Unable to update task status.");

      await tasksQuery.refetch();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ------------------------------------------------
  // Handle task deletion
  // ------------------------------------------------

  
const handleDelete = async (id) => {
  if (!canDeleteTasks) return;

  const confirmed = window.confirm(
    "Are you sure you want to delete this task?"
  );

  if (!confirmed) return;

  try {
    await deleteMutation.mutateAsync(id);
  } catch (err) {
    if (err?.response?.status === 409) {
      window.alert(
        err.response?.data?.message ||
        "Tasks with Pending or In Progress status cannot be deleted."
      );
    } else {
      window.alert(getApiErrorMessage(err));
    }
  } finally {
    deleteMutation.reset();
  }
};


  // ------------------------------------------------
  // Virtualized task row
  // ------------------------------------------------

  const TaskRow = ({ index, style, data }) => {
    const task = data.tasks[index];

    if (!task) return null;
    const taskId = task.id ?? task.Id;

    const taskEmployeeEmail =
      task.employeeEmail ??
      task.EmployeeEmail ??
      task.employee?.email ??
      task.employee?.Email ??
      task.assigneeEmail ??
      task.AssigneeEmail ??
      "";

    const currentUserEmail = String(data.userEmail || "").trim().toLowerCase();
    const isAssignedToCurrentEmployee =
      data.role === "employee" &&
      Boolean(currentUserEmail) &&
      Boolean(taskEmployeeEmail) &&
      String(taskEmployeeEmail).trim().toLowerCase() === currentUserEmail;

    const nextStatuses =
      task.status === "Pending"
        ? ["Pending", "In Progress"]
        : task.status === "In Progress"
          ? ["In Progress", "Completed"]
          : ["Completed"];

    return (
      <div style={style} className="task-row" key={task.id}>
        <div className="task-title-cell">
          <strong>{task.title}</strong>

          <span>
            {task.description || "No description"}
          </span>
        </div>

        <div>
          {task.employeeName ||
            data.getEmployeeName(task.employeeId)}
        </div>

        <div>
          <span
            className={`priority-badge ${
              (task.priority || "medium").toLowerCase()
            }`}
          >
            {task.priority}
          </span>
        </div>

        <div>
          {isAssignedToCurrentEmployee ? (
            <select
              aria-label={`Update status for ${task.title}`}
              value={task.status}
              disabled={String(data.updatingStatusId) === String(taskId)}
              onChange={(event) =>
                data.handleStatusChange(
                  taskId,
                  event.target.value
                )
              }
            >
              {nextStatuses.map((statusOption) => (
                <option
                  key={statusOption}
                  value={statusOption}
                >
                  {statusOption}
                </option>
              ))}
            </select>
          ) : (
            <StatusBadge status={task.status} />
          )}
        </div>

        <div>
          {data.formatDateForInput(task.dueDate) || "-"}
        </div>

        <div className="task-actions">
          {data.canManageTasks && (
            <button
              type="button"
              onClick={() => data.openEditForm(task)}
              title="Edit"
              aria-label={`Edit ${task.title}`}
            >
              <Pencil size={15} />
            </button>
          )}

          {data.canDeleteTasks && (
            <button
              type="button"
              disabled={data.deleting}
              onClick={() => data.handleDelete(taskId)}
              title="Delete"
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ------------------------------------------------
  // Page UI
  // ------------------------------------------------

  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content">
        <div className="tasks-page">

          {/* Page header */}

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

          {/* Task search */}

          <div className="task-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPageNumber(1);
              }}
            />
          </div>

          {/* Task filters */}

          <div className="task-filters">
            <label>
              Filter status

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPageNumber(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </label>

            <label>
              Filter priority

              <select
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(event.target.value);
                  setPageNumber(1);
                }}
              >
                <option value="">All priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
          </div>

          {/* Error messages */}

          {(error ||
            statusError ||
            saveMutation.error) && (
            <div role="alert" className="error-message">
              {statusError ||
                error ||
                saveMutation.error?.response?.data?.detail ||
                saveMutation.error?.response?.data?.message ||
                "The request failed. Please try again."}

              <button
                type="button"
                onClick={() => tasksQuery.refetch()}
              >
                Retry
              </button>
            </div>
          )}

          {/* Create and edit form */}

          {showForm && canManageTasks && (
            <div className="task-form-card" ref={formRef}>
              <div className="task-form-header">
                <div>
                  <h2>
                    {editingId !== null
                      ? "Edit Task"
                      : "Add Task"}
                  </h2>

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

                  {/* Task title */}

                  <div className="task-form-group">
                    <label htmlFor="task-title">
                      Task Title
                    </label>

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

                  {/* Employee selection */}

                  <div className="task-form-group">
                    <label htmlFor="task-employee-search">
                      Find employee
                    </label>

                    <input
                      id="task-employee-search"
                      type="search"
                      value={employeeSearch}
                      onChange={(event) =>
                        setEmployeeSearch(event.target.value)
                      }
                      placeholder="Search by employee name, email or department"
                    />

                    <label htmlFor="task-employee">
                      Employee
                    </label>

                    <select
                      id="task-employee"
                      name="employeeId"
                      value={form.employeeId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select employee</option>

                      {employees.map((employee) => (
                        <option
                          key={employee.id}
                          value={employee.id}
                        >
                          {employee.firstName}{" "}
                          {employee.lastName} —{" "}
                          {employee.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Task status */}

                  <div className="task-form-group">
                    <label htmlFor="task-status">
                      Status
                    </label>

                    <select
                      id="task-status"
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">
                        In Progress
                      </option>
                      <option value="Completed">
                        Completed
                      </option>
                    </select>
                  </div>

                  {/* Task priority */}

                  <div className="task-form-group">
                    <label htmlFor="task-priority">
                      Priority
                    </label>

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

                  {/* Due date */}

                  <div className="task-form-group">
                    <label htmlFor="task-due-date">
                      Due Date
                    </label>

                    <input
                      id="task-due-date"
                      type="date"
                      name="dueDate"
                      value={form.dueDate}
                      min={new Date().getFullYear() + "-" +
       String(new Date().getMonth() + 1).padStart(2, "0") + "-" +
       String(new Date().getDate()).padStart(2, "0")}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Description */}

                  <div className="task-form-group task-description">
                    <label htmlFor="task-description">
                      Description
                    </label>

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

                {/* Form actions */}

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

          {/* Tasks table */}

          <div className="tasks-table">
            <div className="tasks-table-header">
              <span>Task</span>
              <span>Employee</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Due Date</span>
              <span>Action</span>
            </div>

            {loading ? (
              <div className="tasks-empty">
                Loading tasks...
              </div>
            ) : tasksQuery.isError ? (
              <div className="tasks-empty">
                Unable to load tasks. Use Retry above.
              </div>
            ) : tasks.length === 0 ? (
              <div className="tasks-empty">
                No tasks found.
              </div>
            ) : (
              <List
                height={Math.min(
                  560,
                  Math.max(112, tasks.length * 70)
                )}
                itemCount={tasks.length}
                itemSize={70}
                width="100%"
                itemData={{
                  tasks,
                  getEmployeeName,
                  formatDateForInput,
                  openEditForm,
                  handleDelete,
                  handleStatusChange,
                  role,
                  userEmail: user?.email ?? user?.Email ?? user?.userEmail ?? "",
                  updatingStatusId,
                  deleting: deleteMutation.isPending,
                  canManageTasks,
                  canDeleteTasks,
                }}
              >
                {TaskRow}
              </List>
            )}
          </div>

          {/* Server-side pagination */}

          <div className="employee-pagination task-pagination">
            <span>
              Page {pageNumber} of {totalPages} ·{" "}
              {totalCount.toLocaleString()} tasks
            </span>

            <div>
              <button
                type="button"
                disabled={
                  pageNumber <= 1 || tasksQuery.isFetching
                }
                onClick={() =>
                  setPageNumber((value) => value - 1)
                }
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  pageNumber >= totalPages ||
                  tasksQuery.isFetching
                }
                onClick={() =>
                  setPageNumber((value) => value + 1)
                }
              >
                Next
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Tasks;
