import React from "react";

import {
  useNavigate,
} from "react-router-dom";

import StatusBadge
  from "../common/StatusBadge";


const EmployeeCard = ({
  employee,
}) => {

  const navigate =
    useNavigate();


  return (

    <div className="employee-card">

      <div className="employee-card-name">

        {employee.firstName}{" "}
        {employee.lastName}

      </div>


      <div className="employee-card-department">

        {employee.department}

      </div>


      <div className="employee-card-designation">

        {employee.designation}

      </div>


      <div className="employee-card-status">

        <StatusBadge
          status={employee.status}
        />

      </div>


      <div className="employee-card-action">

        <button
          type="button"
          onClick={() =>
            navigate(
              `/employees/${employee.id}`
            )
          }
        >
          View
        </button>

      </div>

    </div>

  );
};


export default EmployeeCard;