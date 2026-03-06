import { FMServerConnection } from "@proofkit/fmodata";
import { beforeAll, describe, expect, it } from "vitest";
import { FileMakerAdapter } from "../../src";

// Note: runAdapterTest was removed in Better Auth 1.5. Adapter behavior is covered by
// unit tests (adapter.test.ts) and the custom e2e tests below.

if (!process.env.FM_SERVER) {
  throw new Error("FM_SERVER is not set");
}
if (!process.env.FM_DATABASE) {
  throw new Error("FM_DATABASE is not set");
}
if (!process.env.FM_USERNAME) {
  throw new Error("FM_USERNAME is not set");
}
if (!process.env.FM_PASSWORD) {
  throw new Error("FM_PASSWORD is not set");
}

const connection = new FMServerConnection({
  serverUrl: process.env.FM_SERVER,
  auth: {
    username: process.env.FM_USERNAME,
    password: process.env.FM_PASSWORD,
  },
});
const db = connection.database(process.env.FM_DATABASE);

describe("My Adapter Tests", () => {
  beforeAll(async () => {
    // reset the database
    for (const table of ["user", "session", "account", "verification"]) {
      const result = await db._makeRequest<{ value: { id: string }[] }>(`/${table}`);

      if (result.error) {
        console.log("Error fetching records:", result.error);
        continue;
      }

      const records = result.data?.value || [];
      for (const record of records) {
        const deleteResult = await db._makeRequest(`/${table}('${record.id}')`, {
          method: "DELETE",
        });

        if (deleteResult.error) {
          console.log(`Error deleting record ${record.id}:`, deleteResult.error);
        }
      }
    }
  }, 60_000);

  if (!process.env.FM_SERVER) {
    throw new Error("FM_SERVER is not set");
  }
  if (!process.env.FM_DATABASE) {
    throw new Error("FM_DATABASE is not set");
  }
  if (!process.env.FM_USERNAME) {
    throw new Error("FM_USERNAME is not set");
  }
  if (!process.env.FM_PASSWORD) {
    throw new Error("FM_PASSWORD is not set");
  }

  const adapter = FileMakerAdapter({
    debugLogs: {
      isRunningAdapterTests: true,
    },
    database: db,
  });

  it("should sort descending", async () => {
    const result = await adapter({}).findMany({
      model: "verification",
      where: [
        {
          field: "identifier",
          operator: "eq",
          value: "zyzaUHEsETWiuORCCdyguVVlVPcnduXk",
        },
      ],
      limit: 1,
      sortBy: { direction: "desc", field: "createdAt" },
    });

    console.log(result);
  });
});

it("should properly filter by dates", async () => {
  // delete all users
  const deleteAllResult = await db._makeRequest(`/user?$filter="id" ne '0'`, {
    method: "DELETE",
  });

  if (deleteAllResult.error) {
    console.log("Error deleting all users:", deleteAllResult.error);
  }

  // create user
  const date = new Date("2025-01-10").toISOString();
  const createResult = await db._makeRequest<{ id: string }>("/user", {
    method: "POST",
    body: JSON.stringify({
      id: "filter-test",
      createdAt: date,
    }),
  });

  if (createResult.error) {
    throw new Error(`Failed to create user: ${createResult.error}`);
  }

  const result = await db._makeRequest<{ value: unknown[] }>("/user?$filter=createdAt ge 2025-01-05");

  console.log(result);

  if (result.error) {
    throw new Error(`Failed to fetch users: ${result.error}`);
  }

  expect(result.data?.value).toHaveLength(1);

  // delete record
  const deleteResult = await db._makeRequest(`/user('filter-test')`, {
    method: "DELETE",
  });

  if (deleteResult.error) {
    console.log("Error deleting test record:", deleteResult.error);
  }
});
