import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ODataApiClient } from "@proofkit/fmodata";
import {
  ListTablesSchema,
  GetMetadataSchema,
  QueryRecordsSchema,
  GetRecordSchema,
  GetRecordCountSchema,
  GetFieldValueSchema,
  NavigateRelatedSchema,
  CrossJoinSchema,
} from "../types.js";

/**
 * Create tool definitions for query operations
 */
export function createQueryTools(_client: ODataApiClient): Tool[] {
  return [
    {
      name: "fmodata_list_tables",
      description: "Get a list of all tables in the FileMaker database",
      inputSchema: ListTablesSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_get_metadata",
      description: "Get OData metadata ($metadata) for the database, including schema information",
      inputSchema: GetMetadataSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_query_records",
      description: "Query records from a table with optional filters, sorting, and pagination using OData query options",
      inputSchema: QueryRecordsSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_get_record",
      description: "Get a single record by its primary key value",
      inputSchema: GetRecordSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_get_record_count",
      description: "Get the count of records in a table, optionally filtered",
      inputSchema: GetRecordCountSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_get_field_value",
      description: "Get the value of a specific field from a record",
      inputSchema: GetFieldValueSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_navigate_related",
      description: "Navigate to related records through a navigation property (relationship)",
      inputSchema: NavigateRelatedSchema as Tool["inputSchema"],
    },
    {
      name: "fmodata_cross_join",
      description: "Perform a cross-join query between multiple tables",
      inputSchema: CrossJoinSchema as Tool["inputSchema"],
    },
  ];
}

/**
 * Handle query tool execution
 */
export async function handleQueryTool(
  client: ODataApiClient,
  name: string,
  args: unknown,
): Promise<unknown> {
  switch (name) {
    case "fmodata_list_tables": {
      return await client.getTables();
    }
    case "fmodata_get_metadata": {
      return await client.getMetadata();
    }
    case "fmodata_query_records": {
      const { table, filter, select, expand, orderby, top, skip, count } = args as {
        table: string;
        filter?: string;
        select?: string;
        expand?: string;
        orderby?: string;
        top?: number;
        skip?: number;
        count?: boolean;
      };
      return await client.getRecords(table, {
        $filter: filter,
        $select: select,
        $expand: expand,
        $orderby: orderby,
        $top: top,
        $skip: skip,
        $count: count,
      });
    }
    case "fmodata_get_record": {
      const { table, key, select, expand } = args as {
        table: string;
        key: string | number;
        select?: string;
        expand?: string;
      };
      return await client.getRecord(table, key, {
        $select: select,
        $expand: expand,
      });
    }
    case "fmodata_get_record_count": {
      const { table, filter } = args as {
        table: string;
        filter?: string;
      };
      return await client.getRecordCount(table, {
        $filter: filter,
      });
    }
    case "fmodata_get_field_value": {
      const { table, key, field } = args as {
        table: string;
        key: string | number;
        field: string;
      };
      return await client.getFieldValue(table, key, field);
    }
    case "fmodata_navigate_related": {
      const { table, key, navigation, filter, select, top, skip } = args as {
        table: string;
        key: string | number;
        navigation: string;
        filter?: string;
        select?: string;
        top?: number;
        skip?: number;
      };
      return await client.navigateRelated(table, key, navigation, {
        $filter: filter,
        $select: select,
        $top: top,
        $skip: skip,
      });
    }
    case "fmodata_cross_join": {
      const { tables, filter, select, top, skip } = args as {
        tables: string[];
        filter?: string;
        select?: string;
        top?: number;
        skip?: number;
      };
      return await client.crossJoin(tables, {
        $filter: filter,
        $select: select,
        $top: top,
        $skip: skip,
      });
    }
    default:
      throw new Error(`Unknown query tool: ${name}`);
  }
}

