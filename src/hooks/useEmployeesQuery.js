import { useQuery } from "@tanstack/react-query";
import employeeService from "../services/employeeService";
export const employeeKeys = { all: ["employees"], 
            list: (params) => ["employees", "list", params], 
            detail: (id) => ["employees", "detail", id] };
export function useEmployeesQuery(params) {
     return useQuery({ queryKey: employeeKeys.list(params), 
        queryFn: ({ signal }) => employeeService.getEmployees(params, signal), 
        placeholderData: (previous) => previous }); }
