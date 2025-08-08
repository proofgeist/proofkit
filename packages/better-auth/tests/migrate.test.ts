import { describe, it, expect } from "vitest";
import { createFmOdataFetch } from "../src/odata";
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

const fetch = createFmOdataFetch({
  serverUrl: process.env.FM_SERVER,
  auth: {
    apiKey: process.env.OTTO_API_KEY,
  },
  database: process.env.FM_DATABASE,
});

describe("migrate", () => {
  it("should get back metadata in JSON format", async () => {
    const metadata = await getMetadata(fetch, process.env.FM_DATABASE!);
    expect(metadata).toBeDefined();
    expect(typeof metadata).toBe("object");
  });

  it("can create/update/delete a table", async () => {
    const tableName = "test_table";
    await fetch("@delete/FileMaker_Tables/:tableName", {
      params: { tableName },
    });

    await fetch("@post/FileMaker_Tables", {
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
      throw: true,
    });

    await fetch("@patch/FileMaker_Tables/:tableName", {
      params: { tableName },

      body: {
        fields: [
          {
            name: "Phone",
            type: "varchar",
          },
        ],
      },
      throw: true,
    });

    await fetch("@delete/FileMaker_Tables/:tableName/:fieldName", {
      params: { tableName, fieldName: "Phone" },
      throw: true,
    });

    await fetch("@delete/FileMaker_Tables/:tableName", {
      params: { tableName },
      throw: true,
    });
  });
});
