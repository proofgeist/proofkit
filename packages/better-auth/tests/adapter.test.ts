import { describe, beforeAll } from "vitest";
import { runAdapterTest } from "better-auth/adapters/test";
import { FileMakerAdapter } from "../src";
import { FmOdata } from "../src/odata";

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

const odata = new FmOdata({
  hostname: process.env.FM_SERVER,
  auth: {
    username: process.env.FM_USERNAME,
    password: process.env.FM_PASSWORD,
  },
  database: process.env.FM_DATABASE,
});
const db = odata.database;

describe("My Adapter Tests", async () => {
  beforeAll(async () => {
    // reset the database
    await db.table("user").deleteMany(`"id" ne '0'`);
    await db.table("session").deleteMany(`"id" ne '0'`);
    await db.table("account").deleteMany(`"id" ne '0'`);
    await db.table("verification").deleteMany(`"id" ne '0'`);
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
      hostname: process.env.FM_SERVER!,
    },
  });

  await runAdapterTest({
    getAdapter: async (betterAuthOptions = {}) => {
      return adapter(betterAuthOptions);
    },
  });
});
