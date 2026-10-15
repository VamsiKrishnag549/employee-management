import { useMemo, useState } from "react";
import { FixedSizeList } from "react-window";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import useDebounce from "../hooks/useDebounce";
import { useEmployeesQuery } from "../hooks/useEmployeesQuery";
import { useAuth } from "../context/AuthContext";
import "../styles/Employees.scss";
import "../styles/largeData.scss";
const PAGE_SIZE = 15;
const EmployeeVirtualRow = ({ index, style, data }) => { const employee = data[index]; if (!employee) return null; return <div style={style} className="employee-virtual-row"><div className="employee-card-name">{employee.firstName} {employee.lastName}</div><div>{employee.department}</div><div>{employee.designation}</div><div><span className={`status-badge ${(employee.status || "").toLowerCase()}`}>{employee.status}</span></div><div><button type="button" onClick={() => data.navigate(`/employees/${employee.id}`)}>View</button></div></div>; };
const Employees = () => {
 const navigate = useNavigate(); const { user } = useAuth(); const role = String(user?.role || "").toLowerCase(); const canManageEmployees = role === "admin" || role === "manager"; const [search, setSearch] = useState(""); const [page, setPage] = useState(1); const [status, setStatus] = useState(""); const [department, setDepartment] = useState("");
 const debouncedSearch = useDebounce(search, 350);
 const params = useMemo(() => ({ page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, status: status || undefined, department: department || undefined, sortBy: "lastName", sortDir: "asc" }), [page, debouncedSearch, status, department]);
 const query = useEmployeesQuery(params);
 const response = query.data;
 const employees = Array.isArray(response) ? response : (response?.items || response?.data || []);
 const totalCount = Array.isArray(response) ? response.length : (response?.totalCount ?? employees.length);
 const totalPages = Array.isArray(response) ? 1 : (response?.totalPages ?? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));
 const rowData = useMemo(() => Object.assign([...employees], { navigate }), [employees, navigate]);
 const changeSearch = (value) => { setSearch(value); setPage(1); };
 return <div className="page-layout"><Sidebar/><main className="page-content"><div className="page-topbar"><div><h1>Employees</h1><p>Manage employees and employee records</p></div></div><div className="employees-page"><div className="employees-header"><div><h2>Employee List</h2><p>{totalCount.toLocaleString()} employees · paginated results</p></div>{canManageEmployees && <button type="button" className="add-employee-button" onClick={() => navigate("/employees/new")}><Plus size={16}/>Add Employee</button>}</div>
 <div className="employee-search"><Search size={17}/><input type="search" placeholder="Search name, email, department..." value={search} onChange={(e) => changeSearch(e.target.value)} aria-label="Search employees"/><select value={department} onChange={(e)=>{setDepartment(e.target.value);setPage(1)}} aria-label="Filter department"><option value="">All departments</option>{[...new Set(employees.map(e=>e.department).filter(Boolean))].sort().map(d=><option key={d} value={d}>{d}</option>)}</select><select value={status} onChange={(e)=>{setStatus(e.target.value);setPage(1)}} aria-label="Filter status"><option value="">All statuses</option><option>Active</option><option>Inactive</option></select></div>
 {query.isPending ? <Loader text="Loading employees..."/> : query.isError ? <ErrorMessage message={query.error.message || "Unable to load employees."} onRetry={() => query.refetch()}/> : employees.length === 0 ? <div className="employee-empty">No employees found.</div> : <div className="employee-table"><div className="employee-table-header"><span>Name</span><span>Department</span><span>Designation</span><span>Status</span><span>Action</span></div><FixedSizeList height={Math.min(560, employees.length * 62)} itemCount={employees.length} itemSize={62} width="100%" itemData={rowData} itemKey={(index,data)=>data[index]?.id ?? index}>{EmployeeVirtualRow}</FixedSizeList></div>}
 <div className="employee-pagination"><span>Page {page} of {totalPages} · {totalCount.toLocaleString()} records</span><div><button type="button" disabled={page<=1 || query.isFetching} onClick={()=>setPage(p=>p-1)} aria-label="Previous page"><ChevronLeft size={16}/>Previous</button><button type="button" disabled={page>=totalPages || query.isFetching} onClick={()=>setPage(p=>p+1)} aria-label="Next page">Next<ChevronRight size={16}/></button></div></div>{query.isFetching && !query.isPending && <small className="query-refreshing">Updating results…</small>}</div></main></div>;
};
export default Employees;
