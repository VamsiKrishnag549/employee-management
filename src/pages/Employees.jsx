
import { useMemo, useState } from "react";
import { FixedSizeList } from "react-window";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/common/Sidebar";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";

import useDebounce from "../hooks/useDebounce";
import { useEmployeesQuery } from "../hooks/useEmployeesQuery";
import { useAuth } from "../context/AuthContext";
import departments from "../constants/departments";
import "../styles/Employees.scss";
import "../styles/largeData.scss";

const PAGE_SIZE = 10;

// Individual virtualized employee row
const EmployeeVirtualRow = ({ index, style, data }) => {
  const employee = data[index];

  if (!employee) {
    return null;
  }

  return (
    <div
      style={style}
      className="employee-virtual-row"
    >
      <div className="employee-card-name">
        {employee.firstName} {employee.lastName}
      </div>

      <div>{employee.department}</div>

      <div>{employee.designation}</div>

      <div>
        <span
          className={`status-badge ${
            (employee.status || "").toLowerCase()
          }`}
        >
          {employee.status}
        </span>
      </div>

      <div>
        <button
          type="button"
          onClick={() =>
            data.navigate(`/employees/${employee.id}`)
          }
        >
          View
        </button>
      </div>
    </div>
  );
};

const Employees = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determine the current user's role
  const role = String(user?.role || "").toLowerCase();

  const canManageEmployees =
    role === "admin" || role === "manager";

  // Search, pagination, and filter state
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");

  // Wait until the user stops typing before searching
  const debouncedSearch = useDebounce(search, 350);

  // Parameters sent to the backend
  const params = useMemo(
    () => ({
      pageNumber,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: status || undefined,
      department: department || undefined,
      sortBy: "name",
      sortOrder: "asc",
    }),
    [pageNumber, debouncedSearch, status, department]
  );

  // Fetch employees using TanStack Query
  const query = useEmployeesQuery(params);
  const response = query.data;

  // Support array and paginated API response formats
  const employees = Array.isArray(response)
    ? response
    : response?.items || response?.data || [];

  const totalCount = Array.isArray(response)
    ? response.length
    : response?.totalCount ?? employees.length;

  const totalPages = Array.isArray(response)
    ? 1
    : response?.totalPages ??
      Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Provide navigation to the virtualized row component
  const rowData = useMemo(
    () => Object.assign([...employees], { navigate }),
    [employees, navigate]
  );

  const changeSearch = (value) => {
    setSearch(value);
    setPageNumber(1);
  };

  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content">
        {/* Page heading */}
        <div className="page-topbar">
          <div>
            <h1>Employees</h1>
            <p>Manage employees and employee records</p>
          </div>
        </div>

        <div className="employees-page">
          {/* Employee list header */}
          <div className="employees-header">
            <div>
              <h2>Employee List</h2>
              <p>
                {totalCount.toLocaleString()} employees
                {" · "}paginated results
              </p>
            </div>

            {canManageEmployees && (
              <button
                type="button"
                className="add-employee-button"
                onClick={() => navigate("/employees/new")}
              >
                <Plus size={16} />
                Add Employee
              </button>
            )}
          </div>

          {/* Search and filters */}
          <div className="employee-search">
            <Search size={17} />

            <input
              type="search"
              placeholder="Search name, email, department..."
              value={search}
              onChange={(event) =>
                changeSearch(event.target.value)
              }
              aria-label="Search employees"
            />

            
              <select
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setPageNumber(1);
                }}
                aria-label="Filter department"
              >
                <option value="">All departments</option>

                {departments.map((departmentName) => (
                  <option
                    key={departmentName}
                    value={departmentName}
                  >
                    {departmentName}
                  </option>
                ))}
              </select>


            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPageNumber(1);
              }}
              aria-label="Filter status"
            >
              <option value="">All statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          {/* Loading, error, empty, and success states */}
          {query.isPending ? (
            <Loader text="Loading employees..." />
          ) : query.isError ? (
            <ErrorMessage
              message={
                query.error.message ||
                "Unable to load employees."
              }
              onRetry={() => query.refetch()}
            />
          ) : employees.length === 0 ? (
            <div className="employee-empty">
              No employees found.
            </div>
          ) : (
            <div className="employee-table">
              {/* Table header */}
              <div className="employee-table-header">
                <span>Name</span>
                <span>Department</span>
                <span>Designation</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              {/* Render visible rows using virtualization */}
              <FixedSizeList
                height={Math.min(
                  560,
                  employees.length * 62
                )}
                itemCount={employees.length}
                itemSize={62}
                width="100%"
                itemData={rowData}
                itemKey={(index, data) =>
                  data[index]?.id ?? index
                }
              >
                {EmployeeVirtualRow}
              </FixedSizeList>
            </div>
          )}

          {/* Pagination controls */}
          <div className="employee-pagination">
            <span>
              Page {pageNumber} of {totalPages}
              {" · "}
              {totalCount.toLocaleString()} records
            </span>

            <div>
              <button
                type="button"
                disabled={pageNumber <= 1 || query.isFetching}
                onClick={() => setPageNumber((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={
                  pageNumber >= totalPages || query.isFetching
                }
                onClick={() => setPageNumber((p) => p + 1)}
                aria-label="Next page"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {query.isFetching && !query.isPending && (
            <small className="query-refreshing">
              Updating results…
            </small>
          )}
        </div>
      </main>
    </div>
  );
};

export default Employees;
