
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { employeeKeys } from "../../hooks/useEmployeesQuery";

import employeeService from "../../services/employeeService";
import Sidebar from "../common/Sidebar";
import Loader from "../common/Loader";
import departments from "../../constants/departments";
import "../../styles/Employees.scss";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  department: "",
  designation: "",
  status: "Active",
  joiningDate: "",
};

const convertDateForInput = (value) => {
  if (!value) return "";

  // Handles ISO dates and API date-time strings.
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);

  if (match) return match[0];

  // Handles existing display dates such as "12 Jan 2024".
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const EmployeeForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!isEdit) return;

    const loadEmployee = async () => {
      try {
        setLoading(true);
        setApiError("");

        const employee = await employeeService.getEmployeeById(id);

        if (!employee) {
          setApiError("Employee not found.");
          return;
        }

        setForm({
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          email: employee.email || "",
          phone: employee.phone || "",
          department: employee.department || "",
          designation: employee.designation || "",
          status: employee.status || "Active",
          joiningDate: convertDateForInput(employee.joiningDate),
        });
      } catch (error) {
        setApiError(
          error.message || "Unable to load employee details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (form.firstName.trim().length < 2) {
      newErrors.firstName = "First name must contain at least 2 characters.";
    }

    if (form.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must contain at least 2 characters.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required.";
    }  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!isEdit && (!form.password || form.password.length < 8)) {
      newErrors.password = "Initial password must contain at least 8 characters.";
    }

    if (form.phone && form.phone.length > 15) {
      newErrors.phone = "Phone number cannot exceed 15 characters.";
    }

    if (!form.department.trim()) {
      newErrors.department = "Department is required.";
    }

    if (!form.designation.trim()) {
      newErrors.designation = "Designation is required.";
    }

    if (!["Active", "Inactive"].includes(form.status)) {
      newErrors.status = "Select a valid status.";
    }

    if (!form.joiningDate) {
      newErrors.joiningDate = "Joining date is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setApiError("");

    if (!validate()) return;

    try {
      setSaving(true);

      const employeeData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        department: form.department.trim(),
        designation: form.designation.trim(),
        status: form.status,
        joiningDate: `${form.joiningDate}T00:00:00`,
      };

      const savedEmployee = isEdit
        ? await employeeService.updateEmployee(id, employeeData)
        : await employeeService.createEmployee({ ...employeeData, password: form.password });

      // Keep every cached page/list in sync immediately, then refetch active
      // queries so changes to filter fields (status/department/email) are
      // reconciled with backend filtering and pagination.
      if (isEdit && savedEmployee) {
        queryClient.setQueryData(employeeKeys.detail(id), savedEmployee);
        queryClient.setQueriesData({ queryKey: employeeKeys.all }, (cached) => {
          if (!cached) return cached;
          const merge = (items) => items.map((employee) =>
            String(employee.id ?? employee.Id) === String(savedEmployee.id ?? savedEmployee.Id)
              ? { ...employee, ...savedEmployee }
              : employee
          );
          if (Array.isArray(cached)) return merge(cached);
          if (Array.isArray(cached.items)) return { ...cached, items: merge(cached.items) };
          if (Array.isArray(cached.Items)) return { ...cached, Items: merge(cached.Items) };
          if (Array.isArray(cached.data)) return { ...cached, data: merge(cached.data) };
          return cached;
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);

      navigate("/employees", { replace: true });
    
    } catch (error) {
          const data = error?.response?.data;

          if (data?.errors) {
            const messages = Object.entries(data.errors)
              .flatMap(([field, errors]) => {
                const fieldName = field.replace(
                  /([a-z])([A-Z])/g,
                  "$1 $2"
                );

                return (Array.isArray(errors) ? errors : [errors])
                  .map((message) => `${fieldName}: ${message}`);
              });

            window.alert(messages.join("\n"));
          } else {
            window.alert(
              data?.detail ||
              data?.message ||
              data?.title ||
              "Unable to save employee. Please try again."
            );
          }
      } finally {
          setSaving(false);
        }

  };

  const handleCancel = () => {
    navigate("/employees");
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

  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content">
        <div className="employee-form-page">
          <div className="employee-form-container">
            <div className="employee-form-header">
              <h1>{isEdit ? "Edit Employee" : "Add Employee"}</h1>

              <p>
                {isEdit
                  ? "Update employee information"
                  : "Create a new employee"}
              </p>
            </div>

            {apiError && (
              <div className="form-error" role="alert">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="employee-form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <small className="form-error">{errors.firstName}</small>
                  )}
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <small className="form-error">{errors.lastName}</small>
                  )}
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                  />
                  {errors.email && (
                    <small className="form-error">{errors.email}</small>
                  )}
                </div>

                {!isEdit && (
                  <div className="form-group">
                    <label htmlFor="employee-password">Initial Login Password</label>
                    <input
                      id="employee-password"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Set an initial password (8+ characters)"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    {errors.password && (
                      <small className="form-error">{errors.password}</small>
                    )}
                    <small className="form-hint">Password must be 8 characters.</small>
                  </div>
                )}

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <small className="form-error">{errors.phone}</small>
                  )}
                </div>

                
                <div className="form-group">
                  <label htmlFor="department">Department</label>

                  <select
                    id="department"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select department</option>

                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>

                  {errors.department && (
                    <small className="form-error">
                      {errors.department}
                    </small>
                  )}
                </div>


                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="Enter designation"
                  />
                  {errors.designation && (
                    <small className="form-error">{errors.designation}</small>
                  )}
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  {errors.status && (
                    <small className="form-error">{errors.status}</small>
                  )}
                </div>

                <div className="form-group">
                  <label>Joining Date</label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={form.joiningDate}
                    onChange={handleChange}
                  />
                  {errors.joiningDate && (
                    <small className="form-error">
                      {errors.joiningDate}
                    </small>
                  )}
                </div>
              </div>

              <div className="employee-form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : isEdit
                      ? "Update Employee"
                      : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeForm;
