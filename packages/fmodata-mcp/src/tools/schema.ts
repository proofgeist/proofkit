import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ODataApiClient } from "@proofkit/fmodata";
import {
  CreateTableSchema,
  AddFieldsSchema,
  DeleteTableSchema,
  DeleteFieldSchema,
} from "../types.js";

/**
 * Create tool definitions for schema modification operations
 */
export function createSchemaTools(_client: ODataApiClient): Tool[] {
  return [
    {
      name: "fmodata_create_table",
      description: "Create a new table in the database (schema modification)",
      inputSchema: CreateTableSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_add_fields",
      description: "Add fields to an existing table (schema modification)",
      inputSchema: AddFieldsSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_delete_table",
      description: "Delete a table from the database (schema modification)",
      inputSchema: DeleteTableSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_delete_field",
      description: "Delete a field from a table (schema modification)",
      inputSchema: DeleteFieldSchema as Tool["inputSchema"],
    },
  ];
}

/**
 * Handle schema tool execution
 */
export async function handleSchemaTool(
  client: ODataApiClient,
  name: string,
  args: unknown,
): Promise<unknown> {
  switch (name) {
    case "fmodata_create_table": {
      const { tableName, fields } = args as {
        tableName: string;
        fields: Array<{
          name: string;
          type: string;
          nullable?: boolean;
          defaultValue?: unknown;
        }>;
      };
      await client.createTable({ tableName, fields });
      return { success: true, tableName };
    }
    case "fmodata_add_fields": {
      const { table, fields } = args as {
        table: string;
        fields: Array<{
          name: string;
          type: string;
          nullable?: boolean;
          defaultValue?: unknown;
        }>;
      };
      await client.addFields(table, { fields });
      return { success: true, table, fieldsAdded: fields.length };
    }
    case "fmodata_delete_table": {
      const { table } = args as { table: string };
      await client.deleteTable(table);
      return { success: true, table };
    }
    case "fmodata_delete_field": {
      const { table, field } = args as {
        table: string;
        field: string;
      };
      await client.deleteField(table, field);
      return { success: true, table, field };
    }
    default:
      throw new Error(`Unknown schema tool: ${name}`);
  }
}

