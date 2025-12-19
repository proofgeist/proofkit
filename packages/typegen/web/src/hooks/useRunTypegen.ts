import { useMutation } from "@tanstack/react-query";
import { client } from "../lib/api";
import type { SingleConfig } from "../lib/config-utils";

export function useRunTypegen() {
  const runTypegenMutation = useMutation({
    mutationFn: async (config: SingleConfig | SingleConfig[]) => {
      await client.api.run.$post({
        json: { config },
      });
    },
  });

  return {
    runTypegen: runTypegenMutation.mutateAsync,
    isRunning: runTypegenMutation.isPending,
    error: runTypegenMutation.error,
  };
}




