#!/usr/bin/env npx tsx

/**
 * OData Metadata Fetcher Script
 *
 * This script downloads OData metadata from a FileMaker server and saves it
 * to the tests/fixtures directory for use in tests.
 *
 * Usage:
 *   npx tsx scripts/fetch-odata-metadata.ts [tableName]
 *
 * Without tableName: fetches full database metadata
 * With tableName: fetches metadata for a specific table only
 *
 * Environment variables required (from .env.local):
 *   - FM_SERVER: The FileMaker server URL
 *   - FM_DATABASE: The database name
 *   - FM_USERNAME and FM_PASSWORD (for username/password auth)
 *   OR
 *   - OTTO_API_KEY (for Otto API key auth)
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FMServerConnection } from "@proofkit/fmodata";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SERVER_URL = process.env.FM_SERVER ?? process.env.DIFFERENT_FM_SERVER;
const DATABASE_NAME = process.env.FM_DATABASE ?? process.env.DIFFERENT_FM_DATABASE;

// Auth options
const USERNAME = process.env.FM_USERNAME ?? process.env.DIFFERENT_FM_USERNAME;
const PASSWORD = process.env.FM_PASSWORD ?? process.env.DIFFERENT_FM_PASSWORD;
const OTTO_API_KEY = process.env.OTTO_API_KEY ?? process.env.DIFFERENT_OTTO_API_KEY;

// Output directory
const FIXTURES_DIR = path.resolve(__dirname, "../tests/fixtures");

interface FetchMetadataOptions {
  tableName?: string;
  reduceAnnotations?: boolean;
  outputFileName?: string;
}

async function fetchAndCacheMetadata(options: FetchMetadataOptions = {}): Promise<void> {
  const { tableName, reduceAnnotations = false } = options;

  console.log("Connecting to FileMaker server...");
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Database: ${DATABASE_NAME}`);
  console.log(`Table: ${tableName ?? "all tables"}`);

  if (!(SERVER_URL && DATABASE_NAME)) {
    throw new Error("Missing FM_SERVER or FM_DATABASE environment variables");
  }

  // Determine auth method
  let auth: { username: string; password: string } | { apiKey: string };
  if (OTTO_API_KEY) {
    auth = { apiKey: OTTO_API_KEY };
    console.log("Using Otto API key authentication");
  } else if (USERNAME && PASSWORD) {
    auth = { username: USERNAME, password: PASSWORD };
    console.log("Using username/password authentication");
  } else {
    throw new Error("Missing authentication: provide either OTTO_API_KEY or (FM_USERNAME and FM_PASSWORD)");
  }

  // Create connection
  const connection = new FMServerConnection({
    serverUrl: SERVER_URL,
    auth,
    fetchClientOptions: {
      timeout: 30_000,
      retries: 2,
    },
  });

  const db = connection.database(DATABASE_NAME);

  console.log("Downloading metadata...");

  // Fetch metadata
  const metadata = await db.getMetadata({
    format: "xml",
    tableName,
    reduceAnnotations,
  });

  // Ensure fixtures directory exists
  await mkdir(FIXTURES_DIR, { recursive: true });

  // Generate output filename
  const outputFileName =
    options.outputFileName ??
    (tableName ? `${tableName.toLowerCase().replace(/[^a-z0-9]/g, "_")}-metadata.xml` : "full-metadata.xml");

  const outputPath = path.join(FIXTURES_DIR, outputFileName);

  console.log(`Writing metadata to: ${outputPath}`);
  await writeFile(outputPath, metadata, "utf-8");

  console.log("Metadata cached successfully!");
  console.log("\nTo use in tests:");
  console.log(`  import { parseMetadataFromFile } from "../src/fmodata/parseMetadata";`);
  console.log(`  const metadata = await parseMetadataFromFile("${outputPath}");`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const tableName = args[0];

// Run the script
fetchAndCacheMetadata({
  tableName,
  reduceAnnotations: args.includes("--reduce"),
  outputFileName: args.find((a) => a.startsWith("--output="))?.split("=")[1],
}).catch((error) => {
  console.error("Error fetching metadata:", error);
  process.exit(1);
});
