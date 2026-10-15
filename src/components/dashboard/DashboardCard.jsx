import React from "react";

const DashboardCard = ({
  title,
  children,
  action,
}) => {
  return (
    <div className="dashboard-card">

      <div className="dashboard-card-header">

        <h3>{title}</h3>

        {action && (
          <button
            className="dashboard-card-action"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}

      </div>

      <div className="dashboard-card-body">
        {children}
      </div>

    </div>
  );
};

export default DashboardCard;