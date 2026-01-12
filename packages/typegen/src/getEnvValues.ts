import chalk from "chalk";
import type { z } from "zod/v4";
import { defaultEnvNames } from "./constants";
import type { typegenConfigSingle } from "./types";

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
  // Helper to get env name, treating empty strings as undefined
  const getEnvName = (customName: string | undefined, defaultName: string) =>
    customName && customName.trim() !== "" ? customName : defaultName;

  // Resolve environment variables
  const server = process.env[getEnvName(envNames?.server, defaultEnvNames.server)];
  const db = process.env[getEnvName(envNames?.db, defaultEnvNames.db)];

  // Always attempt to read all auth methods from environment variables,
  // regardless of which type is specified in envNames.auth
  // This matches the pattern in getEnvVarsFromConfig
  const apiKeyEnvName =
    envNames?.auth && "apiKey" in envNames.auth
      ? getEnvName(envNames.auth.apiKey, defaultEnvNames.apiKey)
      : defaultEnvNames.apiKey;
  const usernameEnvName =
    envNames?.auth && "username" in envNames.auth
      ? getEnvName(envNames.auth.username, defaultEnvNames.username)
      : defaultEnvNames.username;
  const passwordEnvName =
    envNames?.auth && "password" in envNames.auth
      ? getEnvName(envNames.auth.password, defaultEnvNames.password)
      : defaultEnvNames.password;

  const apiKey = process.env[apiKeyEnvName];
  const username = process.env[usernameEnvName];
  const password = process.env[passwordEnvName];

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
 * Follows the same validation pattern as getEnvVarsFromConfig for consistency.
 *
 * @param envValues - The environment values to validate
 * @param envNames - Optional custom environment variable names (for error messages)
 * @returns Validation result with success flag and either data or error message
 */
export function validateEnvValues(envValues: EnvValues, envNames?: EnvNames): EnvValidationResult {
  const { server, db, apiKey, username, password } = envValues;

  // Helper to get env name, treating empty strings as undefined
  const getEnvName = (customName: string | undefined, defaultName: string) =>
    customName && customName.trim() !== "" ? customName : defaultName;

  // Validate required env vars (server, db, and at least one auth method)
  if (!(server && db && (apiKey || username))) {
    // Build missing details
    const missingDetails: {
      server?: boolean;
      db?: boolean;
      auth?: boolean;
      password?: boolean;
    } = {
      server: !server,
      db: !db,
      auth: !(apiKey || username),
    };

    // Only report password as missing if server and db are both present,
    // and username is set but password is missing. This ensures we don't
    // incorrectly report password as missing when the actual error is about
    // missing server or database.
    if (server && db && username && !password) {
      missingDetails.password = true;
    }

    // Build error message with env var names
    const missingVars: string[] = [];
    if (!server) {
      missingVars.push(getEnvName(envNames?.server, defaultEnvNames.server));
    }
    if (!db) {
      missingVars.push(getEnvName(envNames?.db, defaultEnvNames.db));
    }

    if (!(apiKey || username)) {
      // Determine the names to display in the error message
      const apiKeyName = getEnvName(
        envNames?.auth && "apiKey" in envNames.auth ? envNames.auth.apiKey : undefined,
        defaultEnvNames.apiKey,
      );
      const usernameName = getEnvName(
        envNames?.auth && "username" in envNames.auth ? envNames.auth.username : undefined,
        defaultEnvNames.username,
      );
      const passwordName = getEnvName(
        envNames?.auth && "password" in envNames.auth ? envNames.auth.password : undefined,
        defaultEnvNames.password,
      );

      missingVars.push(`${apiKeyName} (or ${usernameName} and ${passwordName})`);
    }

    return {
      success: false,
      errorMessage: `Missing required environment variables: ${missingVars.join(", ")}`,
    };
  }

  // Validate password if username is provided
  if (username && !password) {
    const passwordName = getEnvName(
      envNames?.auth && "password" in envNames.auth ? envNames.auth.password : undefined,
      defaultEnvNames.password,
    );

    return {
      success: false,
      errorMessage: `Password is required when using username authentication. Missing: ${passwordName}`,
    };
  }

  const auth: { apiKey: string } | { username: string; password: string } = apiKey
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
export function validateAndLogEnvValues(envValues: EnvValues, envNames?: EnvNames): EnvValidationResult | undefined {
  const result = validateEnvValues(envValues, envNames);

  if (!result.success) {
    console.log(chalk.red("ERROR: Could not get all required config values"));
    console.log("Ensure the following environment variables are set:");

    const { server, db, apiKey } = envValues;

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

      console.log(`${apiKeyNameToLog} (or ${usernameNameToLog} and ${passwordNameToLog})`);
    }

    console.log();
    return undefined;
  }

  return result;
}
