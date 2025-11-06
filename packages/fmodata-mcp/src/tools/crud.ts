import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ODataApiClient } from "@proofkit/fmodata";
import {
  CreateRecordSchema,
  UpdateRecordSchema,
  DeleteRecordSchema,
} from "../types.js";

/**
 * Create tool definitions for CRUD operations
 */
export function createCrudTools(_client: ODataApiClient): Tool[] {
  return [
    {
      name: "fmodata_create_record",
      description: "Create a new record in a table",
      inputSchema: CreateRecordSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_update_record",
      description: "Update an existing record by primary key",
      inputSchema: UpdateRecordSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_delete_record",
      description: "Delete a record by primary key",
      inputSchema: DeleteRecordSchema as Tool["inputSchema"],
    },
  ];
}

/**
 * Handle CRUD tool execution
 */
export async function handleCrudTool(
  client: ODataApiClient,
  name: string,
  args: unknown,
): Promise<unknown> {
  switch (name) {
    case "fmodata_create_record": {
      const { table, data } = args as {
        table: string;
        data: Record<string, unknown>;
      };
      return await client.createRecord(table, { data });
    }
    case "fmodata_update_record": {
      const { table, key, data } = args as {
        table: string;
        key: string | number;
        data: Record<string, unknown>;
      };
      return await client.updateRecord(table, key, { data });
    }
    case "fmodata_delete_record": {
      const { table, key } = args as {
        table: string;
        key: string | number;
      };
      await client.deleteRecord(table, key);
      return { success: true };
    }
    default:
      throw new Error(`Unknown CRUD tool: ${name}`);
  }
}

