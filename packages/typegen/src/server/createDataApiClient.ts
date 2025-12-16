import fs from "fs-extra";
import path from "path";
import { parse } from "jsonc-parser";
import { typegenConfig, typegenConfigSingle } from "../types";
import type { z } from "zod/v4";
import { OttoAdapter, type OttoAPIKey } from "@proofkit/fmdapi/adapters/otto";
import DataApi from "@proofkit/fmdapi";
import { FetchAdapter } from "@proofkit/fmdapi/adapters/fetch";
import { memoryStore } from "@proofkit/fmdapi/tokenStore/memory";
import { defaultEnvNames } from "../constants";
import type { ApiContext } from "./app";
import { Database, FMServerConnection } from "@proofkit/fmodata";

export interface CreateClientResult {
  client: ReturnType<typeof DataApi<any, any, any, OttoAdapter>>;
  config: Extract<z.infer<typeof typegenConfigSingle>, { type: "fmdapi" }>;
  server: string;
  db: string;
  authType: "apiKey" | "username";
}

export interface CreateClientError {
  error: string;
  statusCode: number;
  details?: Record<string, unknown>;
  kind?: "missing_env" | "adapter_error" | "connection_error" | "unknown";
  suspectedField?: "server" | "db" | "auth";
  fmErrorCode?: string;
  message?: string;
}

type SingleConfig = z.infer<typeof typegenConfigSingle>;

type FmdapiConfig = Extract<SingleConfig, { type: "fmdapi" }>;

type FmodataConfig = Extract<SingleConfig, { type: "fmodata" }>;

type EnvVarsResult =
  | CreateClientError
  | {
      server: string;
      db: string;
      authType: "apiKey" | "username";
      auth: { apiKey: OttoAPIKey } | { username: string; password: string };
    };

function getEnvVarsFromConfig(
  envNames: SingleConfig["envNames"],
): EnvVarsResult {
  // Helper to get env name, treating empty strings as undefined
  const getEnvName = (customName: string | undefined, defaultName: string) =>
    customName && customName.trim() !== "" ? customName : defaultName;

  // Resolve environment variables
  const server =
    process.env[getEnvName(envNames?.server, defaultEnvNames.server)];
  const db = process.env[getEnvName(envNames?.db, defaultEnvNames.db)];
  const apiKey =
    (envNames?.auth && "apiKey" in envNames.auth
      ? process.env[getEnvName(envNames.auth.apiKey, defaultEnvNames.apiKey)]
      : undefined) ?? process.env[defaultEnvNames.apiKey];
  const username =
    (envNames?.auth && "username" in envNames.auth
      ? process.env[
          getEnvName(envNames.auth.username, defaultEnvNames.username)
        ]
      : undefined) ?? process.env[defaultEnvNames.username];
  const password =
    (envNames?.auth && "password" in envNames.auth
      ? process.env[
          getEnvName(envNames.auth.password, defaultEnvNames.password)
        ]
      : undefined) ?? process.env[defaultEnvNames.password];

  // Validate required env vars
  if (!server || !db || (!apiKey && !username)) {
    console.error("Missing required environment variables", {
      server,
      db,
      apiKey,
      username,
    });

    // Build missing details object
    const missingDetails: {
      server?: boolean;
      db?: boolean;
      auth?: boolean;
      password?: boolean;
    } = {
      server: !server,
      db: !db,
      auth: !apiKey && !username,
    };

    // Only report password as missing if server and db are both present,
    // and username is set but password is missing. This ensures we don't
    // incorrectly report password as missing when the actual error is about
    // missing server or database.
    if (server && db && username && !password) {
      missingDetails.password = true;
    }

    return {
      error: "Missing required environment variables",
      statusCode: 400,
      kind: "missing_env" as const,
      details: {
        missing: missingDetails,
      },
      suspectedField: (!server
        ? "server"
        : !db
          ? "db"
          : !apiKey && !username
            ? "auth"
            : undefined) as "server" | "db" | "auth" | undefined,
      message: !server
        ? "Server URL environment variable is missing"
        : !db
          ? "Database name environment variable is missing"
          : "Authentication credentials environment variable is missing",
    };
  }

  // Validate password if username is provided
  if (username && !password) {
    return {
      error: "Password is required when using username authentication",
      statusCode: 400,
      kind: "missing_env" as const,
      details: {
        missing: {
          password: true,
        },
      },
      suspectedField: "auth" as const,
      message: "Password environment variable is missing",
    };
  }

  return {
    server,
    db,
    authType: (apiKey ? "apiKey" : "username") as "apiKey" | "username",
    auth: apiKey
      ? { apiKey: apiKey as OttoAPIKey }
      : { username: username ?? "", password: password ?? "" },
  };
}

export interface OdataClientResult {
  db: Database;
  connection: FMServerConnection;
  server: string;
  dbName: string;
  authType: "apiKey" | "username";
}

export interface OdataClientError {
  error: string;
  statusCode: number;
  kind?: "missing_env" | "adapter_error" | "connection_error" | "unknown";
  suspectedField?: "server" | "db" | "auth";
}

export function createOdataClientFromConfig(
  config: FmodataConfig,
): OdataClientResult | OdataClientError {
  const result = getEnvVarsFromConfig(config.envNames);
  if ("error" in result) {
    return result;
  }
  const { server, db: dbName, authType, auth } = result;

  console.log("server", server);
  console.log("dbName", dbName);
  console.log("authType", authType);
  console.log("auth", auth);
  const connection = new FMServerConnection({
    serverUrl: server,
    auth,
  });

  const db = connection.database(dbName);

  return { db, connection, server, dbName, authType };
}

/**
 * Creates a DataApi client from an in-memory config object
 * @param config The fmdapi config object
 * @returns The client, server, and db, or an error object
 */
export function createClientFromConfig(
  config: FmdapiConfig,
): Omit<CreateClientResult, "config"> | CreateClientError {
  const result = getEnvVarsFromConfig(config.envNames);
  if ("error" in result) {
    return result;
  }
  const { server, db, authType, auth } = result;

  // Determine which auth method will be used (prefer API key if available)

  // Create DataApi client with error handling for adapter construction
  let client: ReturnType<typeof DataApi<any, any, any, OttoAdapter>>;
  try {
    client =
      "apiKey" in auth
        ? DataApi({
            adapter: new OttoAdapter({ auth, server, db }),
            layout: "",
          })
        : DataApi({
            adapter: new FetchAdapter({
              auth: auth as any,
              server,
              db,
              tokenStore: memoryStore(),
            }),
            layout: "",
          });
  } catch (err) {
    // Handle adapter construction errors (e.g., invalid API key format, empty username/password)
    const errorMessage =
      err instanceof Error ? err.message : "Failed to create adapter";
    return {
      error: errorMessage,
      statusCode: 400,
      kind: "adapter_error",
      suspectedField: "auth",
      message: errorMessage,
    };
  }

  return {
    client,
    server,
    db,
    authType,
  };
}

/**
 * Creates a DataApi client from a config index
 * @param context The API context with cwd and configPath
 * @param configIndex The index of the config to use
 * @returns The client, config, server, and db, or an error object
 */
export function createDataApiClient(
  context: ApiContext,
  configIndex: number,
): CreateClientResult | CreateClientError {
  // Read and parse config file
  const fullPath = path.resolve(context.cwd, context.configPath);

  if (!fs.existsSync(fullPath)) {
    return {
      error: "Config file not found",
      statusCode: 404,
    };
  }

  let parsed;
  try {
    const raw = fs.readFileSync(fullPath, "utf8");
    const rawJson = parse(raw);
    parsed = typegenConfig.parse(rawJson);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to parse config",
      statusCode: 500,
    };
  }

  // Get config at index
  const configArray = Array.isArray(parsed.config)
    ? parsed.config
    : [parsed.config];
  const config = configArray[configIndex];

  if (!config) {
    return {
      error: "Config not found",
      statusCode: 404,
    };
  }

  // Validate config type
  if (config.type !== "fmdapi") {
    return {
      error: "Only fmdapi config type is supported",
      statusCode: 400,
    };
  }

  // Use the extracted helper function
  const result = createClientFromConfig(config);

  // Check if result is an error
  if ("error" in result) {
    return result;
  }

  return {
    ...result,
    config,
  };
}
