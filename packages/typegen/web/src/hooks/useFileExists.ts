import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";

export function useFileExists(path: string | undefined) {
  return useQuery({
    queryKey: ["fileExists", path],
    queryFn: async () => {
      if (!path || path.trim() === "") {
        return { exists: false };
      }
      const res = await client.api["file-exists"].$get({
        query: { path },
      });
      if (!res.ok) {
        throw new Error(`Failed to check file existence: ${res.statusText}`);
      }
      const data = await res.json();
      return data as { exists: boolean };
    },
    enabled: !!path && path.trim() !== "",
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch often
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });
}
