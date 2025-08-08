import { describe, beforeAll, it, expect } from "vitest";
import { runAdapterTest } from "better-auth/adapters/test";
import { FileMakerAdapter } from "../src";
import { createFmOdataFetch } from "../src/odata";

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

const fetch = createFmOdataFetch({
  serverUrl: process.env.FM_SERVER,
  auth: {
    username: process.env.FM_USERNAME,
    password: process.env.FM_PASSWORD,
  },
  database: process.env.FM_DATABASE,
});

describe("My Adapter Tests", async () => {
  beforeAll(async () => {
    // reset the database
    for (const table of ["user", "session", "account", "verification"]) {
      await fetch(`/${table}`, {
        method: "DELETE",
        query: {
          $filter: `"id" ne '0'`,
        },
      });
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
});

it("should properly filter by dates", async () => {
  // delete all users
  await fetch(`/user`, {
    method: "DELETE",
    query: {
      $filter: `"id" ne '0'`,
    },
  });

  // create user
  const date = new Date("2025-01-10").toISOString();
  await fetch(`/user`, {
    method: "POST",
    body: {
      id: "filter-test",
      createdAt: date,
    },
    throw: true,
  });

  const result = await fetch(`/user`, {
    method: "GET",
    query: {
      $filter: `createdAt ge 2025-01-05`,
    },
  });

  console.log(result);

  expect(result.data?.value).toHaveLength(1);

  // delete record
  await fetch(`/user('filter-test')`, {
    method: "DELETE",
    throw: true,
  });
});
