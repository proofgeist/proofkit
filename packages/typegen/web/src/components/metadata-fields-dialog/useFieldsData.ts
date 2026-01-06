import { useMemo } from "react";
import type { FieldConfig, FieldRow } from "./types";
import { mapODataTypeToReadableLabel } from "./utils";

interface ParsedMetadata {
  entitySets?: Record<string, { Name: string; EntityType: string }>;
  entityTypes?: Record<
    string,
    {
      Properties?: Map<string, PropertyMetadata> | Record<string, unknown>;
      $Key?: string[];
    }
  >;
}

interface PropertyMetadata {
  $Type?: string;
  $Nullable?: boolean;
  "@Calculation"?: boolean;
  "@Global"?: boolean;
  "@Org.OData.Core.V1.Permissions"?: string;
  $DefaultValue?: string;
}

interface UseFieldsDataProps {
  tableName: string | null;
  parsedMetadata: ParsedMetadata | undefined;
  fieldsConfig: FieldConfig[];
  effectiveIncludeAllFieldsByDefault: boolean;
}

/**
 * Hook to transform raw metadata into field rows for display
 */
export function useFieldsData({
  tableName,
  parsedMetadata,
  fieldsConfig,
  effectiveIncludeAllFieldsByDefault,
}: UseFieldsDataProps): FieldRow[] {
  return useMemo<FieldRow[]>(() => {
    if (!(tableName && parsedMetadata?.entitySets && parsedMetadata?.entityTypes)) {
      return [];
    }

    const entitySet = Object.values(parsedMetadata.entitySets).find((es) => es.Name === tableName);
    if (!entitySet) {
      return [];
    }

    const entityType = parsedMetadata.entityTypes[entitySet.EntityType];
    if (!entityType?.Properties) {
      return [];
    }

    const properties = entityType.Properties;
    const keyFields = entityType.$Key || [];
    const fields: FieldRow[] = [];

    const processField = (fieldName: string, metadata: PropertyMetadata) => {
      // Determine if field is read-only based on generateODataTypes.ts logic
      const isReadOnly =
        metadata["@Calculation"] || metadata["@Global"] || metadata["@Org.OData.Core.V1.Permissions"]?.includes("Read");

      const fieldConfig = Array.isArray(fieldsConfig)
        ? fieldsConfig.find((f) => f?.fieldName === fieldName)
        : undefined;

      // Determine if field is excluded:
      // - If explicitly excluded (exclude === true), always exclude
      // - If includeAllFieldsByDefault is false, exclude if field is not in fields array
      // - Otherwise, include by default
      let isExcluded: boolean;
      if (fieldConfig?.exclude === true) {
        isExcluded = true;
      } else if (effectiveIncludeAllFieldsByDefault) {
        // Default behavior: include all unless explicitly excluded
        isExcluded = false;
      } else {
        // If includeAllFieldsByDefault is false, only include fields explicitly in the array
        isExcluded = !fieldConfig;
      }

      const typeOverride = fieldConfig?.typeOverride;
      const isPrimaryKey = keyFields.includes(fieldName);

      fields.push({
        fieldName,
        fieldType: mapODataTypeToReadableLabel(metadata.$Type || ""),
        nullable: metadata.$Nullable,
        global: metadata["@Global"],
        readOnly: isReadOnly ?? false,
        isExcluded,
        typeOverride,
        primaryKey: isPrimaryKey,
      });
    };

    // Handle both Map and object formats
    if (properties instanceof Map) {
      properties.forEach((fieldMetadata, fieldName) => {
        processField(fieldName, fieldMetadata);
      });
    } else if (typeof properties === "object") {
      for (const [fieldName, fieldMetadata] of Object.entries(properties)) {
        processField(fieldName, fieldMetadata as PropertyMetadata);
      }
    }

    return fields;
  }, [tableName, parsedMetadata, fieldsConfig, effectiveIncludeAllFieldsByDefault]);
}
