import { useQuery } from "@tanstack/react-query";
import { useWatch, useFormContext } from "react-hook-form";
import { client } from "../lib/api";
import type { SingleConfig } from "../lib/config-utils";

export function useListTables(configIndex: number) {
  const { control } = useFormContext<{ config: SingleConfig[] }>();

  // Watch the config at the given index
  const config = useWatch({
    control,
    name: `config.${configIndex}` as const,
  });

  // Only query if config is fmodata type
  const shouldQuery = config?.type === "fmodata";

  const { data, error, isLoading, isError, refetch } = useQuery<{
    tables: string[];
  }>({
    queryKey: ["listTables", configIndex],
    queryFn: async () => {
      if (!config || config.type !== "fmodata") {
        throw new Error("Config not found or invalid type");
      }

      const res = await client.api["list-tables"].$get({
        query: {
          config: JSON.stringify(config),
        },
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorData.error || "Failed to list tables");
      }

      const result = await res.json();
      return result as { tables: string[] };
    },
    enabled: !!shouldQuery,
    staleTime: Infinity, // Never consider data stale while page is open
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  });

  return {
    tables: data?.tables ?? [],
    error,
    isLoading,
    isError,
    refetch,
  };
}

