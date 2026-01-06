/**
 * Type for field configuration within a table
 */
export interface FieldConfig {
  fieldName: string;
  exclude?: boolean;
  typeOverride?: "text" | "number" | "boolean" | "fmBooleanNumber" | "date" | "timestamp" | "container";
}

/**
 * Type for table configuration
 */
export interface TableConfig {
  tableName: string;
  variableName?: string;
  fields?: FieldConfig[];
  reduceMetadata?: boolean;
  alwaysOverrideFieldNames?: boolean;
  includeAllFieldsByDefault?: boolean;
}

/**
 * Row data structure for the fields table
 */
export interface FieldRow {
  fieldName: string;
  fieldType: string;
  nullable: boolean | undefined;
  global: boolean | undefined;
  readOnly: boolean;
  isExcluded: boolean;
  typeOverride?: string;
  primaryKey: boolean;
}

/**
 * Props for the MetadataFieldsDialog component
 */
export interface MetadataFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string | null;
  configIndex: number;
}

/**
 * Type override options available for field types
 */
export type TypeOverrideValue = "text" | "number" | "boolean" | "fmBooleanNumber" | "date" | "timestamp" | "container";

/**
 * Stable empty array to prevent infinite re-renders
 */
export const EMPTY_FIELDS_CONFIG: FieldConfig[] = [];
