
import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";

import Sidebar from "../components/common/Sidebar";
import { useAuth } from "../context/AuthContext";

import "../styles/Profile.scss";

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const fullName =
    user?.fullName ||
    user?.name ||
    user?.email ||
    "Admin User";

  const email = user?.email || "Email unavailable — sign out and sign in again to refresh your account details.";
  const role = user?.role || "Admin";
  const accountStatus = user?.accountStatus || "Active";

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content profile-page">
        <header className="profile-page-header">
          <div>
            <h1>Profile</h1>
            <p>Your account information</p>
          </div>

          <div className="profile-user-chip">
            <div className="profile-chip-avatar">
              {fullName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{fullName}</strong>
              <span>{role}</span>
            </div>
          </div>
        </header>

        <div className="profile-content-grid">
          <section className="profile-information-card">
            <div className="profile-identity">
              <div className="profile-large-avatar">
                {fullName.charAt(0).toUpperCase()}
              </div>

              <div className="profile-identity-details">
                <h2>{fullName}</h2>
                <span className="profile-role-badge">
                  {role}
                </span>
              </div>
            </div>

            <div className="profile-detail-list">
              <div className="profile-detail">
                <span>Email</span>
                <strong>{email}</strong>
              </div>

              <div className="profile-detail">
                <span>Role</span>
                <strong>{role}</strong>
              </div>

              <div className="profile-detail">
                <span>Account Status</span>
                <strong className="profile-account-status">
                  <span className="profile-status-dot" />
                  {accountStatus}
                </strong>
              </div>
            </div>
          </section>

          <section className="profile-session-card">
            <div className="profile-session-heading">
              <div className="profile-session-icon">
                <UserRound size={19} />
              </div>

              <h2>Session</h2>
            </div>

            <p>You are currently signed in.</p>

            <button
              type="button"
              className="profile-logout-button"
              onClick={handleLogout}
            >
              <LogOut size={15} />
              Logout
            </button>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Profile;
