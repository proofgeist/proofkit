import chalk from "chalk";
import type { z } from "zod/v4";
import type { typegenConfigSingle } from "./types";
import { defaultEnvNames } from "./constants";

type EnvNames = z.infer<typeof typegenConfigSingle>["envNames"];

export interface EnvValues {
  server: string | undefined;
  db: string | undefined;
  apiKey: string | undefined;
  username: string | undefined;
  password: string | undefined;
}

export type EnvValidationResult =
  | {
      success: true;
      server: string;
      db: string;
      auth: { apiKey: string } | { username: string; password: string };
    }
  | {
      success: false;
      errorMessage: string;
    };

/**
 * Gets environment variable values for FileMaker connection.
 * Supports both fmdapi and fmodata config types.
 *
 * @param envNames - Optional custom environment variable names
 * @returns Object containing all environment variable values
 */
export function getEnvValues(envNames?: EnvNames): EnvValues {
  const server = process.env[envNames?.server ?? defaultEnvNames.server];
  const db = process.env[envNames?.db ?? defaultEnvNames.db];

  // For apiKey, check custom env name first, then fall back to default
  // This matches the pattern in typegen.ts
  const apiKey =
    (envNames?.auth && "apiKey" in envNames.auth
      ? process.env[envNames.auth.apiKey ?? defaultEnvNames.apiKey]
      : undefined) ?? process.env[defaultEnvNames.apiKey];

  const username =
    (envNames?.auth && "username" in envNames.auth
      ? process.env[envNames.auth.username ?? defaultEnvNames.username]
      : undefined) ?? process.env[defaultEnvNames.username];

  const password =
    (envNames?.auth && "password" in envNames.auth
      ? process.env[envNames.auth.password ?? defaultEnvNames.password]
      : undefined) ?? process.env[defaultEnvNames.password];

  return {
    server,
    db,
    apiKey,
    username,
    password,
  };
}

/**
 * Validates environment values and returns a result with either success data or error message.
 * Uses chalk for console output (for fmdapi compatibility).
 *
 * @param envValues - The environment values to validate
 * @param envNames - Optional custom environment variable names (for error messages)
 * @returns Validation result with success flag and either data or error message
 */
export function validateEnvValues(
  envValues: EnvValues,
  envNames?: EnvNames,
): EnvValidationResult {
  const { server, db, apiKey, username, password } = envValues;

  if (!server || !db || (!apiKey && !username)) {
    const missingVars: string[] = [];
    if (!server) {
      missingVars.push(envNames?.server ?? defaultEnvNames.server);
    }
    if (!db) {
      missingVars.push(envNames?.db ?? defaultEnvNames.db);
    }

    if (!apiKey) {
      // Determine the names to display in the error message
      const apiKeyName =
        envNames?.auth && "apiKey" in envNames.auth && envNames.auth.apiKey
          ? envNames.auth.apiKey
          : defaultEnvNames.apiKey;
      const usernameName =
        envNames?.auth && "username" in envNames.auth && envNames.auth.username
          ? envNames.auth.username
          : defaultEnvNames.username;
      const passwordName =
        envNames?.auth && "password" in envNames.auth && envNames.auth.password
          ? envNames.auth.password
          : defaultEnvNames.password;

      missingVars.push(
        `${apiKeyName} (or ${usernameName} and ${passwordName})`,
      );
    }

    return {
      success: false,
      errorMessage: `Missing required environment variables: ${missingVars.join(", ")}`,
    };
  }

  const auth: { apiKey: string } | { username: string; password: string } =
    apiKey
      ? { apiKey }
      : { username: username ?? "", password: password ?? "" };

  return {
    success: true,
    server,
    db,
    auth,
  };
}

/**
 * Validates environment values and logs errors using chalk (for fmdapi compatibility).
 * Returns undefined if validation fails, otherwise returns the validated values.
 *
 * @param envValues - The environment values to validate
 * @param envNames - Optional custom environment variable names (for error messages)
 * @returns Validated values or undefined if validation failed
 */
export function validateAndLogEnvValues(
  envValues: EnvValues,
  envNames?: EnvNames,
): EnvValidationResult | undefined {
  const result = validateEnvValues(envValues, envNames);

  if (!result.success) {
    console.log(chalk.red("ERROR: Could not get all required config values"));
    console.log("Ensure the following environment variables are set:");

    const { server, db, apiKey, username } = envValues;

    if (!server) {
      console.log(`${envNames?.server ?? defaultEnvNames.server}`);
    }
    if (!db) {
      console.log(`${envNames?.db ?? defaultEnvNames.db}`);
    }

    if (!apiKey) {
      // Determine the names to display in the error message
      const apiKeyNameToLog =
        envNames?.auth && "apiKey" in envNames.auth && envNames.auth.apiKey
          ? envNames.auth.apiKey
          : defaultEnvNames.apiKey;
      const usernameNameToLog =
        envNames?.auth && "username" in envNames.auth && envNames.auth.username
          ? envNames.auth.username
          : defaultEnvNames.username;
      const passwordNameToLog =
        envNames?.auth && "password" in envNames.auth && envNames.auth.password
          ? envNames.auth.password
          : defaultEnvNames.password;

      console.log(
        `${apiKeyNameToLog} (or ${usernameNameToLog} and ${passwordNameToLog})`,
      );
    }

    console.log();
    return undefined;
  }

  return result;
}
