import { useQuery } from "@tanstack/react-query";
import { client } from "./api";

export function useEnvValue(envName: string | undefined) {
  return useQuery({
    queryKey: ["envValue", envName],
    queryFn: async () => {
      if (!envName) {
        return undefined;
      }
      const res = await client.api["env-names"].$get({
        query: { envName },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch env value: ${res.statusText}`);
      }
      const data = await res.json();
      return data.value;
    },
    enabled: !!envName,
  });
}
