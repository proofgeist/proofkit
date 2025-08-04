import { createFetch } from "@better-fetch/fetch";
import { logger } from "@better-fetch/logger";
import { err, ok, Result } from "neverthrow";

export type BasicAuthCredentials = {
  username: string;
  password: string;
};
export type OttoAPIKeyAuth = {
  apiKey: string;
};
export type ODataAuth = BasicAuthCredentials | OttoAPIKeyAuth;

export function isBasicAuth(auth: ODataAuth): auth is BasicAuthCredentials {
  return (
    typeof (auth as BasicAuthCredentials).username === "string" &&
    typeof (auth as BasicAuthCredentials).password === "string"
  );
}

export function isOttoAPIKeyAuth(auth: ODataAuth): auth is OttoAPIKeyAuth {
  return typeof (auth as OttoAPIKeyAuth).apiKey === "string";
}

export type FmOdataConfig = {
  serverUrl: string;
  auth: ODataAuth;
  database: string;
  logging?: true | "verbose" | "none";
};

export function createFmOdataFetch(
  args: FmOdataConfig,
): ReturnType<typeof createFetch> {
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
      console.error(error.request.url.toString(), error.error);
    },
    plugins: [
      logger({
        verbose: args.logging === "verbose",
        enabled: args.logging === "verbose" || !!args.logging,
        console: {
          fail: (...args) => console.error(...args),
          success: (...args) => console.log(...args),
          log: (...args) => console.log(...args),
          error: (...args) => console.error(...args),
          warn: (...args) => console.warn(...args),
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
    console.error(error);
    return err(error);
  }
}
