import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({ defaultOptions: { queries: {
  staleTime: 30_000, gcTime: 5 * 60_000, 
  retry: (count, error) => error?.response?.status >= 400 && error.response.status < 500 ? false : count < 2,
  refetchOnWindowFocus: true,
}, mutations: { retry: 0 } } });
