import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, ClipboardList, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/dashboard/StatCard";
import DashboardCard from "../components/dashboard/DashboardCard";
import Sidebar from "../components/common/Sidebar";
import ErrorMessage from "../components/common/ErrorMessage";
import employeeService from "../services/employeeService";
import taskService from "../services/taskService";
import dashboardService from "../services/dashboardService";
import { employeeKeys } from "../hooks/useEmployeesQuery";
import { taskKeys } from "../hooks/useTasksQuery";
import "../styles/Dashboard.scss";

const itemsFrom = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.Items)) return result.Items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};
const valueFrom = (obj, ...keys) => {
  for (const key of keys) 
    if (obj?.[key] !== undefined && obj?.[key] !== null) 
      return obj[key];
  return 0;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const summaryQuery = useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardService.getDashboardSummary });
  const employeesQuery = useQuery({ queryKey: employeeKeys.list({ page: 1, pageSize: 4, sortBy: "createdAt", sortDir: "desc" }), queryFn: () => employeeService.getEmployees({ page: 1, pageSize: 4, sortBy: "createdAt", sortDir: "desc" }) });
  const tasksQuery = useQuery({ queryKey: taskKeys.list({ page: 1, pageSize: 4, sortBy: "createdAt", sortDir: "desc" }), queryFn: () => taskService.getTasks({ page: 1, pageSize: 4, sortBy: "createdAt", sortDir: "desc" }) });
  const isLoading = summaryQuery.isLoading || employeesQuery.isLoading || tasksQuery.isLoading;
  const error = summaryQuery.error || employeesQuery.error || tasksQuery.error;
  const summary = summaryQuery.data || {};
  const employees = itemsFrom(employeesQuery.data);
  const tasks = itemsFrom(tasksQuery.data);
  const displayName = user?.name || user?.fullName || user?.email || "Admin User";
  const totalEmployees = valueFrom(summary, "totalEmployees", "TotalEmployees");
  const activeEmployees = valueFrom(summary, "activeEmployees", "ActiveEmployees");
  const totalTasks = valueFrom(summary, "totalTasks", "TotalTasks");
  const completedTasks = valueFrom(summary, "completedTasks", "CompletedTasks");
  const getEmployeeName = (employeeId) => {
    const employee = employees.find((item) => Number(item.id ?? item.Id) === Number(employeeId));
    return employee ? `${employee.firstName ?? employee.FirstName ?? ""} ${employee.lastName ?? employee.LastName ?? ""}`.trim() : (employeeId ? `Employee #${employeeId}` : "Unassigned");
  };
  const refresh = () => Promise.all([summaryQuery.refetch(), employeesQuery.refetch(), tasksQuery.refetch()]);

  return <div className="dashboard-layout">
    <Sidebar />
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div className="header-title"><h1>Dashboard</h1><p>Overview of employees and tasks</p></div>
        <div className="header-user"><div className="user-avatar">{displayName.charAt(0).toUpperCase()}</div><div className="user-info"><strong>{displayName}</strong><span>{user?.role || "Administrator"}</span></div></div>
      </header>
      <section className="dashboard-content">
        <div className="welcome-section"><h2>Welcome back, {displayName.split(" ")[0]} 👋</h2><p>Here's what's happening with your organization today.</p></div>
        {error && <div className="dashboard-load-error" role="alert"><ErrorMessage message={error.response?.data?.message || error.message || "Unable to load dashboard data."} /><button type="button" onClick={refresh}><RefreshCw size={15}/> Retry loading</button></div>}
        {isLoading && <p aria-live="polite">Loading dashboard data…</p>}
        <div className="stats-grid">
          <StatCard title="Total Employees" value={isLoading ? "—" : totalEmployees} subtitle="Current employees" icon={<Users size={22}/>} type="primary" />
          <StatCard title="Active Employees" value={isLoading ? "—" : activeEmployees} subtitle="Currently active" icon={<UserCheck size={22}/>} type="success" />
          <StatCard title="Total Tasks" value={isLoading ? "—" : totalTasks} subtitle="All assigned tasks" icon={<ClipboardList size={22}/>} type="info" />
          <StatCard title="Completed Tasks" value={isLoading ? "—" : completedTasks} subtitle="Successfully completed" icon={<CheckCircle2 size={22}/>} type="warning" />
        </div>
        <div className="dashboard-grid">

          {/* for recent employees */}
          <DashboardCard title="Recent Employees">
            <div className="employee-list">
              {!isLoading && employees.length === 0 ? <p>No employees found.</p> : employees.map((employee) => {
              const id = employee.id ?? employee.Id;
              const name = `${employee.firstName ?? employee.FirstName ?? ""} ${employee.lastName ?? employee.LastName ?? ""}`.trim();
              const status = employee.status ?? employee.Status ?? "Inactive";
              return <div className="employee-row" key={id}><div className="employee-info"><strong>{name || "Unnamed Employee"}</strong><span>{employee.department ?? employee.Department ?? "-"}</span><small>{employee.designation ?? employee.Designation ?? "-"}</small></div><span className={`status-badge ${String(status).toLowerCase()}`}>{status}</span></div>;
            })}</div>
            <button type="button" className="dashboard-view-all" onClick={() => navigate("/employees")}>View all employees</button>
          </DashboardCard>

          {/* for recent tasks */}
          <DashboardCard title="Recent Tasks">
            <div className="task-list">
              {!isLoading && tasks.length === 0 ? <p>No tasks found.</p> : tasks.map((task) => {
              const id = task.id ?? task.Id; 
              const status = task.status ?? task.Status ?? "Pending";
              return <div className="task-row" key={id}>
                    <div className="task-info">
                      <strong>{task.title ?? task.Title ?? "Untitled Task"}</strong>
                      <span>{getEmployeeName(task.employeeId ?? task.EmployeeId)}</span>
                      </div><span className={`task-status ${String(status).toLowerCase().replace(/\s+/g, "-")}`}>{status}</span></div>;
            })}</div>
            <button type="button" className="dashboard-view-all" onClick={() => navigate("/tasks")}>View all tasks</button>
          </DashboardCard>
        </div>
      </section>
    </main>
  </div>;
}
