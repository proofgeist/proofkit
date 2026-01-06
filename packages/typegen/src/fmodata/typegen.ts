import path from "node:path";
import type { z } from "zod/v4";
import type { FmodataConfig, typegenConfig } from "../types";
import { downloadTableMetadata } from "./downloadMetadata";
import { generateODataTypes } from "./generateODataTypes";
import { type ParsedMetadata, parseMetadata } from "./parseMetadata";

type GlobalOptions = Omit<z.infer<typeof typegenConfig>, "config">;

export async function generateODataTablesSingle(
  config: FmodataConfig,
  options?: GlobalOptions & { cwd?: string },
): Promise<string | undefined> {
  const { tables, reduceMetadata = false, path: outputPath = "schema" } = config;
  const { cwd = process.cwd() } = options ?? {};

  if (!tables || tables.length === 0) {
    throw new Error("No tables specified in config");
  }

  // Download and parse metadata for each table
  const allEntityTypes = new Map<string, ParsedMetadata["entityTypes"] extends Map<string, infer V> ? V : never>();
  const allEntitySets = new Map<string, ParsedMetadata["entitySets"] extends Map<string, infer V> ? V : never>();
  let namespace = "";

  for (const tableConfig of tables) {
    const tableName = tableConfig.tableName;

    // Download metadata for this table
    const tableMetadataXml = await downloadTableMetadata({
      config,
      tableName,
      reduceAnnotations: tableConfig.reduceMetadata ?? reduceMetadata,
    });

    // Parse the metadata
    const parsedMetadata = await parseMetadata(tableMetadataXml);

    // Merge entity types
    for (const [entityTypeName, entityType] of parsedMetadata.entityTypes.entries()) {
      allEntityTypes.set(entityTypeName, entityType);
    }

    // Merge entity sets
    for (const [entitySetName, entitySet] of parsedMetadata.entitySets.entries()) {
      allEntitySets.set(entitySetName, entitySet);
    }

    // Use namespace from first table (should be the same for all)
    if (!namespace) {
      namespace = parsedMetadata.namespace;
    }
  }

  // Combine all parsed metadata
  const mergedMetadata: ParsedMetadata = {
    entityTypes: allEntityTypes,
    entitySets: allEntitySets,
    namespace,
  };

  // Generate types from merged metadata
  await generateODataTypes(mergedMetadata, { ...config, postGenerateCommand: options?.postGenerateCommand, cwd });

  // Return the resolved output path
  return path.resolve(cwd, outputPath);
}
