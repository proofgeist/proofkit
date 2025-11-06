import type { JSONSchema7 } from "json-schema";

/**
 * Tool input/output schemas using JSON Schema
 * These are used to define MCP tool parameters
 */

export const ListTablesSchema: JSONSchema7 = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export const GetMetadataSchema: JSONSchema7 = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export const QueryRecordsSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table to query",
    },
    filter: {
      type: "string",
      description: "OData $filter expression",
    },
    select: {
      type: "string",
      description: "Comma-separated list of fields to select ($select)",
    },
    expand: {
      type: "string",
      description: "Navigation properties to expand ($expand)",
    },
    orderby: {
      type: "string",
      description: "Order by clause ($orderby)",
    },
    top: {
      type: "number",
      description: "Maximum number of records to return ($top)",
    },
    skip: {
      type: "number",
      description: "Number of records to skip ($skip)",
    },
    count: {
      type: "boolean",
      description: "Include total count in response ($count)",
    },
  },
  required: ["table"],
  additionalProperties: false,
};

export const GetRecordSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    key: {
      oneOf: [{ type: "string" }, { type: "number" }],
      description:
        "Primary key value of the record (can be string UUID or numeric ROWID)",
    },
    select: {
      type: "string",
      description: "Comma-separated list of fields to select",
    },
    expand: {
      type: "string",
      description: "Navigation properties to expand",
    },
  },
  required: ["table", "key"],
  additionalProperties: false,
};

export const GetRecordCountSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    filter: {
      type: "string",
      description: "OData $filter expression",
    },
  },
  required: ["table"],
  additionalProperties: false,
};

export const GetFieldValueSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    key: {
      oneOf: [{ type: "string" }, { type: "number" }],
      description:
        "Primary key value of the record (can be string UUID or numeric ROWID)",
    },
    field: {
      type: "string",
      description: "The name of the field",
    },
  },
  required: ["table", "key", "field"],
  additionalProperties: false,
};

export const CreateRecordSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    data: {
      type: "object",
      description: "Record data as key-value pairs",
      additionalProperties: true,
    },
  },
  required: ["table", "data"],
  additionalProperties: false,
};

export const UpdateRecordSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    key: {
      oneOf: [{ type: "string" }, { type: "number" }],
      description:
        "Primary key value of the record (can be string UUID or numeric ROWID)",
    },
    data: {
      type: "object",
      description: "Fields to update as key-value pairs",
      additionalProperties: true,
    },
  },
  required: ["table", "key", "data"],
  additionalProperties: false,
};

export const DeleteRecordSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    key: {
      oneOf: [{ type: "string" }, { type: "number" }],
      description:
        "Primary key value of the record (can be string UUID or numeric ROWID)",
    },
  },
  required: ["table", "key"],
  additionalProperties: false,
};

export const NavigateRelatedSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the source table",
    },
    key: {
      oneOf: [{ type: "string" }, { type: "number" }],
      description:
        "Primary key value of the source record (can be string UUID or numeric ROWID)",
    },
    navigation: {
      type: "string",
      description: "Navigation property name",
    },
    filter: {
      type: "string",
      description: "OData $filter expression",
    },
    select: {
      type: "string",
      description: "Comma-separated list of fields to select",
    },
    top: {
      type: "number",
      description: "Maximum number of records to return",
    },
    skip: {
      type: "number",
      description: "Number of records to skip",
    },
  },
  required: ["table", "key", "navigation"],
  additionalProperties: false,
};

export const CrossJoinSchema: JSONSchema7 = {
  type: "object",
  properties: {
    tables: {
      type: "array",
      items: { type: "string" },
      description: "Array of table names to join",
      minItems: 2,
    },
    filter: {
      type: "string",
      description: "OData $filter expression",
    },
    select: {
      type: "string",
      description: "Comma-separated list of fields to select",
    },
    top: {
      type: "number",
      description: "Maximum number of records to return",
    },
    skip: {
      type: "number",
      description: "Number of records to skip",
    },
  },
  required: ["tables"],
  additionalProperties: false,
};

/**
 * Valid field types for FileMaker_Tables schema modifications
 * These are the only types accepted by the FileMaker OData API
 */
const VALID_FIELD_TYPES = [
  "NUMERIC",
  "DECIMAL",
  "INT",
  "DATE",
  "TIME",
  "TIMESTAMP",
  "VARCHAR",
  "CHARACTER VARYING",
  "BLOB",
  "VARBINARY",
  "LONGVARBINARY",
  "BINARY VARYING",
];

export const CreateTableSchema: JSONSchema7 = {
  type: "object",
  properties: {
    tableName: {
      type: "string",
      description: "The name of the table to create",
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: {
            type: "string",
            enum: VALID_FIELD_TYPES,
            description:
              "Field type. Must be one of: NUMERIC, DECIMAL, INT, DATE, TIME, TIMESTAMP, VARCHAR, CHARACTER VARYING, BLOB, VARBINARY, LONGVARBINARY, or BINARY VARYING",
          },
          nullable: { type: "boolean" },
          defaultValue: {},
        },
        required: ["name", "type"],
      },
      description: "Array of field definitions",
    },
  },
  required: ["tableName", "fields"],
  additionalProperties: false,
};

export const AddFieldsSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: {
            type: "string",
            enum: VALID_FIELD_TYPES,
            description:
              "Field type. Must be one of: NUMERIC, DECIMAL, INT, DATE, TIME, TIMESTAMP, VARCHAR, CHARACTER VARYING, BLOB, VARBINARY, LONGVARBINARY, or BINARY VARYING",
          },
          nullable: { type: "boolean" },
          defaultValue: {},
        },
        required: ["name", "type"],
      },
      description: "Array of field definitions to add",
    },
  },
  required: ["table", "fields"],
  additionalProperties: false,
};

export const DeleteTableSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table to delete",
    },
  },
  required: ["table"],
  additionalProperties: false,
};

export const DeleteFieldSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    field: {
      type: "string",
      description: "The name of the field to delete",
    },
  },
  required: ["table", "field"],
  additionalProperties: false,
};

export const RunScriptSchema: JSONSchema7 = {
  type: "object",
  properties: {
    table: {
      type: "string",
      description: "The name of the table",
    },
    script: {
      type: "string",
      description: "The name of the script to run",
    },
    param: {
      type: "string",
      description: "Optional script parameter",
    },
  },
  required: ["table", "script"],
  additionalProperties: false,
};

export const BatchRequestsSchema: JSONSchema7 = {
  type: "object",
  properties: {
    requests: {
      type: "array",
      items: {
        type: "object",
        properties: {
          method: {
            type: "string",
            enum: ["GET", "POST", "PATCH", "PUT", "DELETE"],
          },
          url: { type: "string" },
          headers: {
            type: "object",
            additionalProperties: { type: "string" },
          },
          body: {},
        },
        required: ["method", "url"],
      },
      description: "Array of batch requests",
    },
  },
  required: ["requests"],
  additionalProperties: false,
};

