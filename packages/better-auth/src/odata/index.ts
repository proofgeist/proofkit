import { createFetch, createSchema } from "@better-fetch/fetch";
import { logger } from "@better-fetch/logger";
import { logger as betterAuthLogger } from "better-auth";
import { err, ok, Result } from "neverthrow";
import { z } from "zod/v4";

type BasicAuthCredentials = {
  username: string;
  password: string;
};
type OttoAPIKeyAuth = {
  apiKey: string;
};
type ODataAuth = BasicAuthCredentials | OttoAPIKeyAuth;

export type FmOdataConfig = {
  serverUrl: string;
  auth: ODataAuth;
  database: string;
  logging?: true | "verbose" | "none";
};

const schema = createSchema({
  /**
   * Create a new table
   */
  "@post/FileMaker_Tables": {
    input: z.object({ tableName: z.string(), fields: z.array(z.any()) }),
  },
  /**
   * Add fields to a table
   */
  "@patch/FileMaker_Tables/:tableName": {
    params: z.object({ tableName: z.string() }),
    input: z.object({ fields: z.array(z.any()) }),
  },
  /**
   * Delete a table
   */
  "@delete/FileMaker_Tables/:tableName": {
    params: z.object({ tableName: z.string() }),
  },
  /**
   * Delete a field from a table
   */
  "@delete/FileMaker_Tables/:tableName/:fieldName": {
    params: z.object({ tableName: z.string(), fieldName: z.string() }),
  },
});

export function createFmOdataFetch(args: FmOdataConfig) {
  const result = validateUrl(args.serverUrl);

  if (result.isErr()) {
    throw new Error("Invalid server URL");
  }
  let baseURL = result.value.origin;
  if ("apiKey" in args.auth) {
    baseURL += `/otto`;
  }
  baseURL += `/fmi/odata/v4/${args.database}`;

  return createFetch({
    baseURL,
    auth:
      "apiKey" in args.auth
        ? { type: "Bearer", token: args.auth.apiKey }
        : {
            type: "Basic",
            username: args.auth.username,
            password: args.auth.password,
          },
    onError: (error) => {
      console.error("url", error.request.url.toString());
      console.log(error.error);
      console.log("error.request.body", JSON.stringify(error.request.body));
    },
    schema,
    plugins: [
      logger({
        verbose: args.logging === "verbose",
        enabled: args.logging === "verbose" || !!args.logging,
        console: {
          fail: (...args) => betterAuthLogger.error("better-fetch", ...args),
          success: (...args) => betterAuthLogger.info("better-fetch", ...args),
          log: (...args) => betterAuthLogger.info("better-fetch", ...args),
          error: (...args) => betterAuthLogger.error("better-fetch", ...args),
          warn: (...args) => betterAuthLogger.warn("better-fetch", ...args),
        },
      }),
    ],
  });
}

export function validateUrl(input: string): Result<URL, unknown> {
  try {
    const url = new URL(input);
    return ok(url);
  } catch (error) {
    return err(error);
  }
}
