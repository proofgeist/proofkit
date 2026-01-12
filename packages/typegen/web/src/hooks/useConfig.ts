import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getConfig, saveConfig } from "../lib/api";
import type { SingleConfig } from "../lib/config-utils";

export function useConfig() {
  const queryClient = useQueryClient();

  // Load config with React Query
  const {
    data: configDataResponse,
    isLoading: isLoadingConfig,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
    retry: (failureCount, error) => {
      // Retry on connection errors
      const isConnectionError =
        error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError") ||
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("after retries")));
      return isConnectionError && failureCount < 5;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
    staleTime: Number.POSITIVE_INFINITY,
  });

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      configsToSave,
      postGenerateCommand,
    }: {
      configsToSave: SingleConfig[];
      postGenerateCommand?: string;
    }) => {
      console.log("configsToSave", configsToSave);
      return await saveConfig(configsToSave, postGenerateCommand);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });

  return {
    configDataResponse,
    isLoadingConfig,
    isError,
    error,
    isFetching,
    refetch,
    saveMutation,
    isLoading: isLoadingConfig || isFetching,
    isRetrying: (isLoadingConfig || isFetching) && isFetching,
  };
}
