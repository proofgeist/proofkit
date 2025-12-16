import { useQuery } from "@tanstack/react-query";
import { useWatch, useFormContext } from "react-hook-form";
import { client } from "../lib/api";
import type { SingleConfig } from "../lib/config-utils";
import { useFileExists } from "./useFileExists";

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

export function useParseMetadata(configIndex: number) {
  const { control } = useFormContext<{ config: SingleConfig[] }>();

  // Watch the config at the given index
  const config = useWatch({
    control,
    name: `config.${configIndex}` as const,
  });

  // Get the metadata path
  const metadataPath =
    config?.type === "fmodata" ? config.metadataPath : undefined;

  // Check if the file exists using the existing hook
  const { data: fileExistsData } = useFileExists(metadataPath);

  // Only query if config is fmodata type and file exists
  const shouldQuery =
    config?.type === "fmodata" &&
    fileExistsData?.exists === true &&
    metadataPath &&
    metadataPath.trim() !== "";

  // Create a stable key for the config to use in queryKey
  // Use metadataPath as the key since that's what determines if we need to re-parse
  const configKey =
    config && config.type === "fmodata"
      ? JSON.stringify({
          type: config.type,
          metadataPath: config.metadataPath,
        })
      : "";

  const { data, error, isLoading, isError } = useQuery<ParsedMetadataResponse>({
    queryKey: ["parseMetadata", configIndex, configKey],
    queryFn: async () => {
      if (!config || config.type !== "fmodata") {
        throw new Error("Config not found or invalid type");
      }

      // For complex objects in query params, we need to JSON stringify
      // The server will need to parse this, or we could change to POST
      // For now, let's try passing it as a JSON string in the query
      const res = await client.api["parse-metadata"].$get({
        query: {
          config: JSON.stringify(config),
        },
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorData.error || "Failed to parse metadata");
      }

      const result = await res.json();
      return result as ParsedMetadataResponse;
    },
    enabled: !!shouldQuery,
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
    fileExists: fileExistsData?.exists,
  };
}
