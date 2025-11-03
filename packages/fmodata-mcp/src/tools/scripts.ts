import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ODataApiClient } from "@proofkit/fmodata";
import { RunScriptSchema, BatchRequestsSchema } from "../types.js";

/**
 * Create tool definitions for script execution and batch operations
 */
export function createScriptTools(_client: ODataApiClient): Tool[] {
  return [
    {
      name: "fmodata_run_script",
      description: "Run a FileMaker script",
      inputSchema: RunScriptSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_batch",
      description: "Execute multiple OData operations in a single batch request",
      inputSchema: BatchRequestsSchema as Tool["inputSchema"],
    },
  ];
}

/**
 * Handle script tool execution
 */
export async function handleScriptTool(
  client: ODataApiClient,
  name: string,
  args: unknown,
): Promise<unknown> {
  switch (name) {
    case "fmodata_run_script": {
      const { table, script, param } = args as {
        table: string;
        script: string;
        param?: string;
      };
      return await client.runScript(table, { script, param });
    }
    case "fmodata_batch": {
      const { requests } = args as {
        requests: Array<{
          method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
          url: string;
          headers?: Record<string, string>;
          body?: unknown;
        }>;
      };
      return await client.batchRequests({ requests });
    }
    default:
      throw new Error(`Unknown script tool: ${name}`);
  }
}

