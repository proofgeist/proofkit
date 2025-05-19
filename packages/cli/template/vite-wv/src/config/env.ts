import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";
import { type OttoAPIKey } from "@proofgeist/fmdapi";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  clientPrefix: "VITE_",
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
