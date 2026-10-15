
import React from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Employees from "../pages/Employees";
import EmployeeDetails from "../pages/EmployeeDetails";
import EmployeeForm from "../components/employees/EmployeeForm";
import Tasks from "../pages/Tasks";
import Profile from "../pages/Profile";

import ProtectedRoute from "./ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/employees"
          element={<Employees />}
        />

        <Route
          path="/employees/:id"
          element={<EmployeeDetails />}
        />

        <Route element={<ProtectedRoute allowedRoles={["Admin", "Manager"]} />}>
          <Route path="/employees/new" element={<EmployeeForm />} />
          <Route path="/employees/:id/edit" element={<EmployeeForm />} />
        </Route>

        <Route
          path="/tasks"
          element={<Tasks />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />
      </Route>

      {/* Default route */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
};

export default AppRoutes;
