import { FMServerConnection } from "@proofkit/fmodata";
import { describe, expect, it } from "vitest";
import { getMetadata } from "../../src/migrate";

function getTestEnv() {
  const fmServer = process.env.FM_SERVER;
  const fmDatabase = process.env.FM_DATABASE;
  const ottoApiKey = process.env.OTTO_API_KEY;

  if (!fmServer) {
    throw new Error("FM_SERVER is not set");
  }
  if (!fmDatabase) {
    throw new Error("FM_DATABASE is not set");
  }
  if (!ottoApiKey) {
    throw new Error("OTTO_API_KEY is not set");
  }

  return { fmServer, fmDatabase, ottoApiKey };
}

const { fmServer, fmDatabase, ottoApiKey } = getTestEnv();

const connection = new FMServerConnection({
  serverUrl: fmServer,
  auth: {
    apiKey: ottoApiKey,
  },
});
const db = connection.database(fmDatabase);

describe("migrate", () => {
  it("should get back metadata in JSON format", async () => {
    const metadata = await getMetadata(db);
    expect(metadata).toBeDefined();
    expect(typeof metadata).toBe("object");
  });

  it("can create/update/delete a table", async () => {
    const tableName = "test_table";

    // Delete table if it exists (cleanup)
    try {
      await db.schema.deleteTable(tableName);
    } catch {
      // Table might not exist
    }

    // Create table
    await db.schema.createTable(tableName, [
      {
        name: "Company ID",
        type: "string",
        primary: true,
      },
    ]);

    // Add field to table
    await db.schema.addFields(tableName, [
      {
        name: "Phone",
        type: "string",
      },
    ]);

    // Delete field from table
    await db.schema.deleteField(tableName, "Phone");

    // Delete table
    await db.schema.deleteTable(tableName);
  });
});
