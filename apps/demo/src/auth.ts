import { betterAuth } from "better-auth";
import { FileMakerAdapter } from "@proofkit/better-auth";
import { organization, username } from "better-auth/plugins";

export const auth = betterAuth({
  database: FileMakerAdapter({
    odata: {
      hostname: "acme-dev.ottomatic.cloud",
      auth: {
        username: process.env.BETTER_AUTH_FM_USERNAME!,
        password: process.env.BETTER_AUTH_FM_PASSWORD!,
      },
      database: process.env.BETTER_AUTH_FM_DATABASE!,
    },
  }),
  plugins: [
    organization({ schema: { organization: { modelName: "clients" } } }),
    username(),
  ],
});
