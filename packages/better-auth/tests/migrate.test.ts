import { describe, it, expect } from "vitest";
import { createRawFetch } from "../src/odata";
import { getMetadata } from "../src/migrate";

if (!process.env.FM_SERVER) {
  throw new Error("FM_SERVER is not set");
}
if (!process.env.FM_DATABASE) {
  throw new Error("FM_DATABASE is not set");
}
if (!process.env.OTTO_API_KEY) {
  throw new Error("OTTO_API_KEY is not set");
}

const { fetch } = createRawFetch({
  serverUrl: process.env.FM_SERVER,
  auth: {
    apiKey: process.env.OTTO_API_KEY,
  },
  database: process.env.FM_DATABASE,
  logging: "verbose",
});

describe("migrate", () => {
  it("should get back metadata in JSON format", async () => {
    const metadata = await getMetadata(fetch, process.env.FM_DATABASE!);
    expect(metadata).toBeDefined();
    expect(typeof metadata).toBe("object");
  });

  it("can create/update/delete a table", async () => {
    const tableName = "test_table";

    // Delete table if it exists (cleanup)
    const deleteResult = await fetch(`/FileMaker_Tables/${tableName}`, {
      method: "DELETE",
    });
    // Don't throw on delete errors as table might not exist

    // Create table
    const createResult = await fetch("/FileMaker_Tables", {
      method: "POST",
      body: {
        tableName,
        fields: [
          {
            name: "Company ID",
            type: "varchar",
            primary: true,
          },
        ],
      },
    });

    if (createResult.error) {
      throw new Error(`Failed to create table: ${createResult.error}`);
    }

    // Add field to table
    const updateResult = await fetch(`/FileMaker_Tables/${tableName}`, {
      method: "PATCH",
      body: {
        fields: [
          {
            name: "Phone",
            type: "varchar",
          },
        ],
      },
    });

    if (updateResult.error) {
      throw new Error(`Failed to update table: ${updateResult.error}`);
    }

    // Delete field from table
    const deleteFieldResult = await fetch(
      `/FileMaker_Tables/${tableName}/Phone`,
      {
        method: "DELETE",
      },
    );

    if (deleteFieldResult.error) {
      throw new Error(`Failed to delete field: ${deleteFieldResult.error}`);
    }

    // Delete table
    const deleteTableResult = await fetch(`/FileMaker_Tables/${tableName}`, {
      method: "DELETE",
    });

    if (deleteTableResult.error) {
      throw new Error(`Failed to delete table: ${deleteTableResult.error}`);
    }
  });
});
