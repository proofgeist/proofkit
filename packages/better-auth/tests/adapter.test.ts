import { describe, beforeAll, it, expect } from "vitest";
import { runAdapterTest } from "better-auth/adapters/test";
import { FileMakerAdapter } from "../src";
import { createRawFetch } from "../src/odata";
import { z } from "zod/v4";

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

const { fetch } = createRawFetch({
  serverUrl: process.env.FM_SERVER,
  auth: {
    username: process.env.FM_USERNAME,
    password: process.env.FM_PASSWORD,
  },
  database: process.env.FM_DATABASE,
  logging: "verbose", // Enable verbose logging to see the response details
});

describe("My Adapter Tests", async () => {
  beforeAll(async () => {
    // reset the database
    for (const table of ["user", "session", "account", "verification"]) {
      const result = await fetch(`/${table}`, {
        output: z.object({ value: z.array(z.any()) }),
      });

      if (result.error) {
        console.log("Error fetching records:", result.error);
        continue;
      }

      const records = result.data?.value || [];
      for (const record of records) {
        const deleteResult = await fetch(`/${table}('${record.id}')`, {
          method: "DELETE",
        });

        if (deleteResult.error) {
          console.log(
            `Error deleting record ${record.id}:`,
            deleteResult.error,
          );
        }
      }
    }
  });

  const adapter = FileMakerAdapter({
    debugLogs: {
      isRunningAdapterTests: true, // This is our super secret flag to let us know to only log debug logs if a test fails.
    },
    odata: {
      auth: {
        username: process.env.FM_USERNAME!,
        password: process.env.FM_PASSWORD!,
      },
      database: process.env.FM_DATABASE!,
      serverUrl: process.env.FM_SERVER!,
    },
  });

  await runAdapterTest({
    getAdapter: async (betterAuthOptions = {}) => {
      return adapter(betterAuthOptions);
    },
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

    // expect(result.data).toHaveLength(1);
  });
});

it("should properly filter by dates", async () => {
  // delete all users - using buildQuery to construct the filter properly
  const deleteAllResult = await fetch(`/user?$filter="id" ne '0'`, {
    method: "DELETE",
  });

  if (deleteAllResult.error) {
    console.log("Error deleting all users:", deleteAllResult.error);
  }

  // create user
  const date = new Date("2025-01-10").toISOString();
  const createResult = await fetch(`/user`, {
    method: "POST",
    body: {
      id: "filter-test",
      createdAt: date,
    },
    output: z.object({ id: z.string() }),
  });

  if (createResult.error) {
    throw new Error(`Failed to create user: ${createResult.error}`);
  }

  const result = await fetch(`/user?$filter=createdAt ge 2025-01-05`, {
    method: "GET",
    output: z.object({ value: z.array(z.any()) }),
  });

  console.log(result);

  if (result.error) {
    throw new Error(`Failed to fetch users: ${result.error}`);
  }

  expect(result.data?.value).toHaveLength(1);

  // delete record
  const deleteResult = await fetch(`/user('filter-test')`, {
    method: "DELETE",
  });

  if (deleteResult.error) {
    console.log("Error deleting test record:", deleteResult.error);
  }
});
