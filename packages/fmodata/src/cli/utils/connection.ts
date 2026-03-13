import type { Database } from "../../client/database";
import { FMServerConnection } from "../../client/filemaker-odata";

export const ENV_NAMES = {
  server: "FM_SERVER",
  db: "FM_DATABASE",
  username: "FM_USERNAME",
  password: "FM_PASSWORD",
  apiKey: "OTTO_API_KEY",
} as const;

export interface ConnectionOptions {
  server?: string;
  database?: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

export interface BuiltConnection {
  connection: FMServerConnection;
  db: Database;
}

export function buildConnection(opts: ConnectionOptions): BuiltConnection {
  const server = opts.server ?? process.env[ENV_NAMES.server];
  const database = opts.database ?? process.env[ENV_NAMES.db];
  const apiKey = opts.apiKey ?? process.env[ENV_NAMES.apiKey];
  const username = opts.username ?? process.env[ENV_NAMES.username];
  const password = opts.password ?? process.env[ENV_NAMES.password];

  if (!server) {
    throw new Error(`Missing required: --server or ${ENV_NAMES.server} environment variable`);
  }
  if (!database) {
    throw new Error(`Missing required: --database or ${ENV_NAMES.db} environment variable`);
  }
  if (!(apiKey || username)) {
    throw new Error(`Missing required auth: --api-key (${ENV_NAMES.apiKey}) or --username (${ENV_NAMES.username})`);
  }
  if (!apiKey && username && !password) {
    throw new Error(`Missing required: --password (${ENV_NAMES.password}) when using username auth`);
  }

  const auth = apiKey ? { apiKey } : { username: username as string, password: password as string };
  const connection = new FMServerConnection({ serverUrl: server, auth });
  const db = connection.database(database);
  return { connection, db };
}
