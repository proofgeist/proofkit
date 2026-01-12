/** biome-ignore-all lint/performance/noBarrelFile: Re-exporting fmodata functions */
export { downloadTableMetadata } from "./downloadMetadata";
export { generateODataTypes } from "./generateODataTypes";
export {
  type EntitySet,
  type EntityType,
  type FieldMetadata,
  type NavigationProperty,
  type ParsedMetadata,
  parseMetadata,
  parseMetadataFromFile,
} from "./parseMetadata";
