import { describe, beforeAll } from "vitest";
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
    disableTests: {
      // CREATE_MODEL: true,
      // CREATE_MODEL_SHOULD_ALWAYS_RETURN_AN_ID: true,
      // DELETE_MODEL: true,
      // FIND_MODEL: true,
      // FIND_MODEL_WITH_MODIFIED_FIELD_NAME: true,
      // FIND_MODEL_WITH_SELECT: true,
      // FIND_MODEL_WITHOUT_ID: true,
      // SHOULD_DELETE_MANY: true,
      // SHOULD_FIND_MANY_WITH_CONTAINS_OPERATOR: true,
      // SHOULD_FIND_MANY: true,
      // SHOULD_FIND_MANY_WITH_LIMIT: true,
      // SHOULD_FIND_MANY_WITH_OFFSET: true,
      // SHOULD_FIND_MANY_WITH_OPERATORS: true,
      // SHOULD_FIND_MANY_WITH_SORT_BY: true,
      // SHOULD_FIND_MANY_WITH_WHERE: true,
      // SHOULD_NOT_THROW_ON_DELETE_RECORD_NOT_FOUND: true,
      // SHOULD_NOT_THROW_ON_RECORD_NOT_FOUND: true,
      // SHOULD_SEARCH_USERS_WITH_STARTS_WITH: true,
      // SHOULD_SEARCH_USERS_WITH_ENDS_WITH: true,
      // SHOULD_PREFER_GENERATE_ID_IF_PROVIDED: true,
      // SHOULD_UPDATE_WITH_MULTIPLE_WHERE: true,
      // SHOULD_WORK_WITH_REFERENCE_FIELDS: true,
      // UPDATE_MODEL: true,
    },
    getAdapter: async (betterAuthOptions = {}) => {
      return adapter(betterAuthOptions);
    },
  });
});
