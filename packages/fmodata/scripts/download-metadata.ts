#!/usr/bin/env bun

/**
 * OData Metadata Downloader
 *
 * This script downloads OData metadata from a FileMaker server and saves it
 * to a JSON file. The metadata can then be used with typegen-starter.ts to
 * generate TypeScript table occurrence definitions.
 *
 * Usage:
 *   bun scripts/download-metadata.ts
 *
 * For now, authentication details are hardcoded in the script.
 * Later, this will support command-line arguments for:
 *   - username and password, OR
 *   - API key and server URL
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { FMServerConnection } from "../src/client/filemaker-odata";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, ".env.local") });

// ============================================================================
// HARDCODED CONFIGURATION - Replace these with your actual values
// ============================================================================

const SERVER_URL = process.env.FM_SERVER; // Replace with your server URL
const DATABASE_NAME = process.env.FM_DATABASE; // Replace with your database name

const USERNAME = process.env.FM_USERNAME; // Replace with your username
const PASSWORD = process.env.FM_PASSWORD; // Replace with your password

// Output file path (relative to the scripts directory)
const OUTPUT_FILE = "../tests/fixtures/metadata.xml"; // Adjust as needed

// ============================================================================
// END CONFIGURATION
// ============================================================================

// Get __dirname equivalent in ES modules

async function downloadMetadata(): Promise<void> {
  console.log("Connecting to FileMaker server...");
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Database: ${DATABASE_NAME}`);

  if (!(SERVER_URL && DATABASE_NAME && USERNAME && PASSWORD)) {
    throw new Error("Missing required configuration values");
  }

  // Create connection based on authentication method
  const connection = new FMServerConnection({
    serverUrl: SERVER_URL,
    auth: { username: USERNAME, password: PASSWORD },
    fetchClientOptions: {
      timeout: 15_000, // 10 seconds
      retries: 2,
    },
  });

  const db = connection.database(DATABASE_NAME);

  console.log("Downloading metadata...");

  try {
    const fullMetadata = await db.getMetadata({ format: "xml" });

    // Resolve output path
    const outputPath = resolve(__dirname, OUTPUT_FILE);

    console.log(`Writing metadata to: ${outputPath}`);

    // Write metadata to file
    await writeFile(outputPath, fullMetadata, "utf-8");

    console.log("✓ Metadata downloaded successfully!");
    console.log("\nYou can now use this metadata file with typegen-starter.ts:");
    console.log(`  bun scripts/typegen-starter.ts ${OUTPUT_FILE} output/occurrences.ts`);
  } catch (error) {
    console.error("Error downloading metadata:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  }
}

// Run the script
downloadMetadata().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
