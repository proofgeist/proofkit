import type { ApiApp } from "@proofkit/typegen/webui-server";
import { hc } from "hono/client";
import type { SingleConfig } from "./config-utils";

// Create typed client using the server app type
// This gives us full type inference from the server routes
export const client = hc<ApiApp>("/");

export async function getConfig() {
  const res = await client.api.config.$get();
  if (!res.ok) {
    throw new Error(`Failed to fetch config: ${res.statusText}`);
  }
  const data = await res.json();
  return data;
}

export async function saveConfig(config: SingleConfig[]) {
  const res = await client.api.config.$post({
    json: { config },
  });
  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as {
      success: boolean;
      error?: string;
      issues?: { path: (string | number)[]; message: string }[];
    };
    throw new Error(
      errorData.error ||
        (errorData.issues && errorData.issues.length > 0
          ? errorData.issues
              .map(
                (issue: { path: (string | number)[]; message: string }) => `${issue.path.join(".")}: ${issue.message}`,
              )
              .join("; ")
          : "Failed to save config"),
    );
  }
  const data = await res.json();
  // Validate response
  return data;
}
