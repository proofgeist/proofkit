import { FmodataConfig } from "../types";
import { downloadMetadata as downloadMetadataFn } from "./downloadMetadata";
import fs from "fs-extra";
import { parseMetadata } from "./parseMetadata";
import { generateODataTypes } from "./generateODataTypes";

export async function generateODataTablesSingle(config: FmodataConfig) {
  const { downloadMetadata, metadataPath } = config;

  if (downloadMetadata) {
    await downloadMetadataFn(config, metadataPath);
  }

  const metadataExists = await fs.pathExists(metadataPath);
  if (!metadataExists) {
    throw new Error(`Metadata file not found at ${metadataPath}`);
  }

  const metadata = await fs.readFile(metadataPath, "utf-8");
  const parsedMetadata = await parseMetadata(metadata);

  await generateODataTypes(parsedMetadata, config);
}
