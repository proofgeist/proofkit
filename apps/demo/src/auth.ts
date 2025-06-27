import { betterAuth } from "better-auth";
import { FileMakerAdapter } from "@proofkit/better-auth";
import { BasicAuth, Connection, Database } from "fm-odata-client";
import { organization } from "better-auth/plugins";

export const fmDatabase = new Database(
  new Connection(
    "acme-dev.ottomatic.cloud",
    new BasicAuth(
      process.env.BETTER_AUTH_FM_USERNAME!,
      process.env.BETTER_AUTH_FM_PASSWORD!,
    ),
  ),
  process.env.BETTER_AUTH_FM_DATABASE!,
);

export const auth = betterAuth({
  database: FileMakerAdapter({
    database: fmDatabase,
  }),

  plugins: [organization()],
});
