import { FMServerConnection } from "@proofkit/fmodata";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { z } from "zod/v4";
import type { typegenConfigSingle } from "../types";
import { getEnvValues, validateEnvValues } from "../getEnvValues";

type FmodataConfig = Extract<
  z.infer<typeof typegenConfigSingle>,
  { type: "fmodata" }
>;

/**
 * Downloads OData metadata from a FileMaker server and saves it to a file.
 *
 * @param config - The fmodata config object containing connection details
 * @param metadataPath - The path where the metadata file should be saved
 * @returns Promise that resolves when the metadata has been downloaded and saved
 */
export async function downloadMetadata(
  config: FmodataConfig,
  metadataPath: string,
): Promise<void> {
  const envValues = getEnvValues(config.envNames);
  const validationResult = validateEnvValues(envValues, config.envNames);

  if (!validationResult.success) {
    throw new Error(validationResult.errorMessage);
  }

  const { server, db, auth } = validationResult;

  // Create connection based on authentication method
  const connection = new FMServerConnection({
    serverUrl: server,
    auth,
    fetchClientOptions: {
      timeout: 15000, // 15 seconds
      retries: 2,
    },
  });

  const database = connection.database(db);

  // Download metadata in XML format
  const fullMetadata = await database.getMetadata({ format: "xml" });

  // Resolve output path (ensure directory exists)
  const resolvedPath = resolve(metadataPath);
  const outputDir = dirname(resolvedPath);
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolvedPath, fullMetadata, "utf-8");

  return;
}
