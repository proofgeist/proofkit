import { FmodataConfig } from "../types";
import { downloadTableMetadata } from "./downloadMetadata";
import { parseMetadata, type ParsedMetadata } from "./parseMetadata";
import { generateODataTypes } from "./generateODataTypes";

export async function generateODataTablesSingle(config: FmodataConfig) {
  const { tables, reduceMetadata = false } = config;

  if (!tables || tables.length === 0) {
    throw new Error("No tables specified in config");
  }

  // Download and parse metadata for each table
  const allEntityTypes = new Map<
    string,
    ParsedMetadata["entityTypes"] extends Map<infer K, infer V> ? V : never
  >();
  const allEntitySets = new Map<
    string,
    ParsedMetadata["entitySets"] extends Map<infer K, infer V> ? V : never
  >();
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
    for (const [
      entityTypeName,
      entityType,
    ] of parsedMetadata.entityTypes.entries()) {
      allEntityTypes.set(entityTypeName, entityType);
    }

    // Merge entity sets
    for (const [
      entitySetName,
      entitySet,
    ] of parsedMetadata.entitySets.entries()) {
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
  await generateODataTypes(mergedMetadata, config);
}
