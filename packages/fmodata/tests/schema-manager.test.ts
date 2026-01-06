/**
 * Schema Manager E2E Tests
 *
 * These tests execute real schema management operations against a live FileMaker OData server.
 * They require valid credentials and a running server to pass.
 *
 * Setup:
 * - Create a `.env.local` file in this package directory with the following variables:
 *   - FMODATA_SERVER_URL - The FileMaker OData server URL (e.g., https://api.example.com)
 *   - FMODATA_API_KEY - API key for bearer token authentication
 *   - FMODATA_DATABASE - The database name to use for testing
 *
 * Note: These tests may be skipped if environment variables are not set.
 * Run with: pnpm test schema-manager
 */

import path from "node:path";
import type {
  ContainerField,
  DateField,
  Field,
  NumericField,
  StringField,
  TimeField,
  TimestampField,
} from "@proofkit/fmodata";
import { FMServerConnection } from "@proofkit/fmodata";
import { config } from "dotenv";
import { afterEach, describe, expect, it } from "vitest";

config({ path: path.resolve(__dirname, "../.env.local") });

// Load environment variables
const serverUrl = process.env.FMODATA_SERVER_URL;
const apiKey = process.env.FMODATA_API_KEY;
const database = process.env.FMODATA_DATABASE;

describe("SchemaManager E2E Tests", () => {
  // Skip tests if credentials are not available
  if (!(serverUrl && apiKey && database)) {
    console.warn(
      "Skipping SchemaManager E2E tests: FMODATA_SERVER_URL, FMODATA_API_KEY, and FMODATA_DATABASE environment variables are required",
    );
    return;
  }

  const connection = new FMServerConnection({
    serverUrl,
    auth: { apiKey },
  });

  const db = connection.database(database);

  // Generate unique table name for this test run
  const testTableName = `test_schema_${Date.now()}`;

  // Track all tables created during tests for cleanup
  const createdTables: string[] = [];

  // Cleanup: Delete all test tables after each test
  afterEach(async () => {
    for (const tableName of createdTables) {
      try {
        await db.schema.deleteTable(tableName);
      } catch (error) {
        // Ignore errors - table may have already been deleted or may not exist
        console.warn(`Failed to delete test table ${tableName}:`, error);
      }
    }
    createdTables.length = 0;
  });

  it("should create a table with various field types", async () => {
    // Create table with most field types (container added separately)
    const fields: Field[] = [
      {
        name: "id",
        type: "string",
        primary: true,
        maxLength: 36,
      },
      {
        name: "username",
        type: "string",
        nullable: false,
        unique: true,
        maxLength: 50,
      },
      {
        name: "email",
        type: "string",
        nullable: false,
        maxLength: 255,
      },
      {
        name: "age",
        type: "numeric",
        nullable: true,
      },
      {
        name: "birth_date",
        type: "date",
        nullable: true,
      },
      {
        name: "start_time",
        type: "time",
        nullable: true,
      },
      {
        name: "created_at",
        type: "timestamp",
        nullable: true,
      },
    ];

    const tableDefinition = await db.schema.createTable(testTableName, fields);
    createdTables.push(testTableName);

    expect(tableDefinition).toBeDefined();
    expect(tableDefinition.tableName).toBe(testTableName);
    expect(tableDefinition.fields).toBeDefined();
    expect(Array.isArray(tableDefinition.fields)).toBe(true);
  });

  it("should create a table with string fields that have maxLength and repetitions", async () => {
    const tableName = `${testTableName}_repeating`;
    const fields: Field[] = [
      {
        name: "id",
        type: "string",
        primary: true,
        maxLength: 36,
      },
      {
        name: "tags",
        type: "string",
        repetitions: 5,
        maxLength: 50,
      },
    ];

    const tableDefinition = await db.schema.createTable(tableName, fields);

    createdTables.push(tableName);

    expect(tableDefinition).toBeDefined();
    expect(tableDefinition.tableName).toBe(tableName);
  });

  it("should create a table with string fields that have default values", async () => {
    const tableName = `${testTableName}_defaults`;
    const fields: StringField[] = [
      {
        name: "id",
        type: "string",
        primary: true,
        maxLength: 36,
      },
      {
        name: "created_by",
        type: "string",
        default: "USER",
      },
      {
        name: "username",
        type: "string",
        default: "USERNAME",
      },
    ];

    const tableDefinition = await db.schema.createTable(tableName, fields);

    createdTables.push(tableName);

    expect(tableDefinition).toBeDefined();
    expect(tableDefinition.tableName).toBe(tableName);
  });

  it("should add fields to an existing table", async () => {
    // First create a table
    const initialFields: Field[] = [
      {
        name: "id",
        type: "string",
        primary: true,
        maxLength: 36,
      },
      {
        name: "username",
        type: "string",
        nullable: false,
        maxLength: 50,
      },
    ];

    await db.schema.createTable(testTableName, initialFields);
    createdTables.push(testTableName);

    // Then add more fields
    const newFields: Field[] = [
      {
        name: "email",
        type: "string",
        nullable: false,
        unique: true,
        maxLength: 255,
      },
      {
        name: "phone",
        type: "string",
        nullable: true,
        maxLength: 20,
      },
      {
        name: "age",
        type: "numeric",
        nullable: true,
      },
    ];

    const updatedTable = await db.schema.addFields(testTableName, newFields);

    expect(updatedTable).toBeDefined();
    expect(updatedTable.tableName).toBe(testTableName);
    expect(updatedTable.fields).toBeDefined();
    expect(Array.isArray(updatedTable.fields)).toBe(true);
  });

  it("should create and delete an index", async () => {
    // First create a table
    const fields: Field[] = [
      {
        name: "id",
        type: "string",
        primary: true,
        maxLength: 36,
      },
      {
        name: "email",
        type: "string",
        nullable: false,
        maxLength: 255,
      },
    ];

    await db.schema.createTable(testTableName, fields);
    createdTables.push(testTableName);

    // Create an index
    const index = await db.schema.createIndex(testTableName, "email");

    expect(index).toBeDefined();
    expect(index.indexName).toBe("email");

    // Delete the index
    await db.schema.deleteIndex(testTableName, "email");

    // If no error is thrown, the operation succeeded
    expect(true).toBe(true);
  });

  it("should delete a field from a table", async () => {
    // First create a table with multiple fields
    const fields: Field[] = [
      {
        name: "id",
        type: "string",
        primary: true,
        maxLength: 36,
      },
      {
        name: "username",
        type: "string",
        nullable: false,
        maxLength: 50,
      },
      {
        name: "temp_field",
        type: "string",
        nullable: true,
        maxLength: 100,
      },
    ];

    await db.schema.createTable(testTableName, fields);
    createdTables.push(testTableName);

    // Delete a field
    await db.schema.deleteField(testTableName, "temp_field");

    // If no error is thrown, the operation succeeded
    expect(true).toBe(true);
  });

  it("should delete a table", async () => {
    const tableName = `${testTableName}_delete`;
    // First create a table
    const fields: Field[] = [
      {
        name: "id",
        type: "string",
        primary: true,
        maxLength: 36,
      },
      {
        name: "name",
        type: "string",
        nullable: false,
        maxLength: 100,
      },
    ];

    await db.schema.createTable(tableName, fields);
    createdTables.push(tableName);

    // Verify table exists by trying to add a field (should not throw)
    await db.schema.addFields(tableName, [
      {
        name: "description",
        type: "string",
        nullable: true,
      },
    ]);

    // Delete the table (remove from tracking since we're deleting it explicitly)
    await db.schema.deleteTable(tableName);
    const index = createdTables.indexOf(tableName);
    if (index > -1) {
      createdTables.splice(index, 1);
    }

    // If no error is thrown, the operation succeeded
    expect(true).toBe(true);
  });

  it("should handle field type definitions correctly", () => {
    // Type checking test - ensure TypeScript accepts valid field types
    const stringField: StringField = {
      name: "name",
      type: "string",
      maxLength: 100,
    };

    const numericField: NumericField = {
      name: "age",
      type: "numeric",
    };

    const dateField: DateField = {
      name: "birth_date",
      type: "date",
      default: "CURRENT_DATE",
    };

    const timeField: TimeField = {
      name: "start_time",
      type: "time",
      default: "CURRENT_TIME",
    };

    const timestampField: TimestampField = {
      name: "created_at",
      type: "timestamp",
      default: "CURRENT_TIMESTAMP",
    };

    const containerField: ContainerField = {
      name: "avatar",
      type: "container",
      externalSecurePath: "/secure/path",
    };

    expect(stringField.type).toBe("string");
    expect(numericField.type).toBe("numeric");
    expect(dateField.type).toBe("date");
    expect(timeField.type).toBe("time");
    expect(timestampField.type).toBe("timestamp");
    expect(containerField.type).toBe("container");
  });
});
