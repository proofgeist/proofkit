import { useQuery } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";
import { client } from "../lib/api";
import type { SingleConfig } from "../lib/config-utils";

// Type for the parsed metadata response
export interface ParsedMetadataResponse {
  parsedMetadata: {
    entityTypes: Record<
      string,
      {
        Name: string;
        "@TableID": string;
        $Key?: string[];
        Properties: Record<string, unknown>;
        NavigationProperties: Array<{ Name: string; Type: string }>;
      }
    >;
    entitySets: Record<string, { Name: string; EntityType: string }>;
    namespace: string;
  };
}

export function useTableMetadata(configIndex: number, tableName: string | null, enabled = true) {
  const { control } = useFormContext<{ config: SingleConfig[] }>();

  // Watch the config at the given index
  const config = useWatch({
    control,
    name: `config.${configIndex}` as const,
  });

  // Only query if enabled, config is fmodata type, and tableName is provided
  const shouldQuery = enabled && config?.type === "fmodata" && tableName !== null && tableName.trim() !== "";

  const { data, error, isLoading, isError } = useQuery<ParsedMetadataResponse>({
    queryKey: ["tableMetadata", configIndex, tableName],
    queryFn: async () => {
      if (!config || config.type !== "fmodata" || !tableName) {
        throw new Error("Config not found, invalid type, or table name missing");
      }

      const res = await client.api["table-metadata"].$post({
        json: { config, tableName },
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorData.error || "Failed to fetch table metadata");
      }

      const result = await res.json();
      return result as ParsedMetadataResponse;
    },
    enabled: shouldQuery,
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch often
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  return {
    data: data?.parsedMetadata,
    error,
    isLoading,
    isError,
  };
}
