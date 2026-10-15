import { queryClient } from "../lib/queryClient";
export const invalidateEmployees = () => queryClient.invalidateQueries({ queryKey: ["employees"] });
export const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });
export const invalidateDashboard = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });
