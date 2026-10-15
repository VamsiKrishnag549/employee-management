
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  UserCircle,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import "../../styles/Sidebar.scss";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const isMobile = () => window.innerWidth <= 760;

  const goTo = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setMobileOpen(false);

    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const isDashboard = location.pathname === "/dashboard";
  const isEmployees = location.pathname.startsWith("/employees");
  const isTasks = location.pathname.startsWith("/tasks");
  const isProfile = location.pathname.startsWith("/profile");

  const toggleSidebar = () => {
    if (isMobile()) {
      setMobileOpen((open) => !open);
    } else {
      setDesktopCollapsed((collapsed) => !collapsed);
    }
  };

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label="Toggle navigation"
        aria-expanded={isMobile() ? mobileOpen : !desktopCollapsed}
        title="Toggle navigation"
      >
        {mobileOpen ? (
          <X size={21} />
        ) : desktopCollapsed ? (
          <PanelLeftOpen size={21} />
        ) : (
          <PanelLeftClose size={21} />
        )}
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          "sidebar",
          desktopCollapsed ? "desktop-collapsed" : "",
          mobileOpen ? "mobile-open" : "",
        ].filter(Boolean).join(" ")}
      >
        <div className="sidebar-brand">
          <div className="sidebar-logo-box">EM</div>

          <div className="sidebar-brand-text">
            <strong>Employee</strong>
            <span>MANAGEMENT</span>
          </div>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-navigation">
          <button
            type="button"
            title="Dashboard"
            className={`sidebar-nav-item ${isDashboard ? "active" : ""}`}
            onClick={() => goTo("/dashboard")}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            title="Employees"
            className={`sidebar-nav-item ${isEmployees ? "active" : ""}`}
            onClick={() => goTo("/employees")}
          >
            <Users size={19} />
            <span>Employees</span>
          </button>

          <button
            type="button"
            title="Tasks"
            className={`sidebar-nav-item ${isTasks ? "active" : ""}`}
            onClick={() => goTo("/tasks")}
          >
            <ListTodo size={19} />
            <span>Tasks</span>
          </button>

          <button
            type="button"
            title="Profile"
            className={`sidebar-nav-item ${isProfile ? "active" : ""}`}
            onClick={() => goTo("/profile")}
          >
            <UserCircle size={19} />
            <span>Profile</span>
          </button>
        </nav>

        <div className="sidebar-logout">
          <button
            type="button"
            title="Logout"
            className="sidebar-nav-item logout"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
