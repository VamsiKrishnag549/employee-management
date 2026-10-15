import { useQuery } from "@tanstack/react-query";
import taskService from "../services/taskService";
export const taskKeys = { all: ["tasks"], 
    list: (params) => ["tasks", "list", params], 
    detail: (id) => ["tasks", "detail", id] };
export function useTasksQuery(params) { 
    return useQuery({ queryKey: taskKeys.list(params), 
        queryFn: ({ signal }) => taskService.getTasks(params, signal), 
        placeholderData: (previous) => previous }); }
