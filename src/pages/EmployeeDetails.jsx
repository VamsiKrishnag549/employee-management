
import React, { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { employeeKeys } from "../hooks/useEmployeesQuery";
import { useAuth } from "../context/AuthContext";

import employeeService from "../services/employeeService";

import Sidebar from "../components/common/Sidebar";
import StatusBadge from "../components/common/StatusBadge";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";

import "../styles/EmployeeDetails.scss";

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canManageEmployees = role === "admin" || role === "manager";
  const isAdmin = role === "admin";

  const [employee, setEmployee] = useState(null);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadEmployee = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await employeeService.getEmployeeById(id);

        if (!data) {
          if (!cancelled) {
            setEmployee(null);
            setAssignedTasks([]);
            setError("Employee not found.");
          }
          return;
        }

        const tasks = await employeeService.getEmployeeTasks(id);

        if (cancelled) return;

        setEmployee(data);

        const employeeTasks = Array.isArray(tasks) ? tasks : [];

        employeeTasks.sort((a, b) => {
          const priorityOrder = {
            high: 3,
            medium: 2,
            low: 1,
          };

          const priorityA =
            priorityOrder[(a.priority || "").toLowerCase()] || 0;

          const priorityB =
            priorityOrder[(b.priority || "").toLowerCase()] || 0;

          if (priorityA !== priorityB) {
            return priorityB - priorityA;
          }

          const dateA = Date.parse(a.createdAt || a.createdDate || "");
          const dateB = Date.parse(b.createdAt || b.createdDate || "");

          return (
            (Number.isNaN(dateB) ? 0 : dateB) -
            (Number.isNaN(dateA) ? 0 : dateA)
          );
        });

        setAssignedTasks(employeeTasks);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Unable to load employee details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEmployee();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () =>{
      const confirmed = window.confirm(
        `Are u sure u want delete ${employee.firstName} ${employee.lastName} ?`
      );

      setDeleting(true);
      setError("");

      try {
        await employeeService.deleteEmployee(employee.id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
          queryClient.invalidateQueries({ queryKey: ["tasks"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        ]);

        // Navigate only after the cached list and summary have been invalidated.
        navigate("/employees", { replace: true });
      } catch (error) {
        setError(
          error.message || "Unable to delete employee, Please try again!!!"
        );
      }
      finally{
        setDeleting(false);
      }
  }

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return String(date).substring(0, 10);
    }

    return parsedDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="page-layout">
        <Sidebar />

        <main className="page-content">
          <div className="details-state">
            <Loader text="Loading employee..." />
          </div>
        </main>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="page-layout">
        <Sidebar />

        <main className="page-content">
          <div className="details-state">
            <ErrorMessage
              message={error || "Employee not found."}
            />

            <button
              type="button"
              className="back-button"
              onClick={() => navigate("/employees")}
            >
              ← Back to Employees
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content">
        <div className="employee-details-page">
          {/* Page heading */}
          <div className="details-topbar">
            <div>
              <h1>Employee Details</h1>
              <p>Employee profile and assigned work</p>
            </div>
          </div>

          {/* Back button */}
          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/employees")}
          >
            ← Back to Employees
          </button>

          {/* Employee information */}
          <div className="employee-profile-card">
            <div className="employee-profile-name">
              <div>
                <h2>
                  {employee.firstName} {employee.lastName}
                </h2>

                <p>{employee.designation}</p>
              </div>

              <StatusBadge status={employee.status} />
            </div>

            <div className="employee-profile-grid">
              <div>
                <label>Email</label>
                <strong>{employee.email}</strong>
              </div>

              <div>
                <label>Phone</label>
                <strong>{employee.phone || "-"}</strong>
              </div>

              <div>
                <label>Department</label>
                <strong>{employee.department}</strong>
              </div>

              <div>
                <label>Designation</label>
                <strong>{employee.designation}</strong>
              </div>

              <div>
                <label>Joining Date</label>
                <strong>{formatDate(employee.joiningDate)}</strong>
              </div>
            </div>

            
            {(canManageEmployees || isAdmin) && (
              <div className="details-actions">
                {canManageEmployees && (
                  <button
                    type="button"
                    className="edit-button"
                    onClick={() => navigate(`/employees/${employee.id}/edit`)}
                  >
                    Edit Employee
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="delete-button"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    Delete Employee
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Assigned Tasks */}
          {assignedTasks.length > 0 && (
            <div className="assigned-tasks-card">
              <div className="section-heading">
                <div>
                  <h2>Assigned Tasks</h2>
                  <p>
                    Tasks assigned to {employee.firstName}{" "}
                    {employee.lastName}
                  </p>
                </div>
              </div>

              {assignedTasks.map((task) => (
                <div className="assigned-task" key={task.id}>
                  <div className="assigned-task-info">
                    <strong>{task.title}</strong>

                    <span>{task.description || ""}</span>
                  </div>

                  <div className="assigned-task-meta">
                    <StatusBadge status={task.status} />

                    <span
                      className={`task-priority ${
                        (task.priority || "low").toLowerCase()
                      }`}
                    >
                      {task.priority || "Low"} Priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeDetails;
