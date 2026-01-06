import { useCallback, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { SingleConfig } from "../../lib/config-utils";
import { EMPTY_FIELDS_CONFIG, type FieldConfig, type FieldRow, type TableConfig } from "./types";

interface UseFieldsConfigProps {
  configIndex: number;
  tableName: string | null;
  fieldsData: FieldRow[];
}

interface UseFieldsConfigReturn {
  /** Current table configuration */
  tableConfig: TableConfig | undefined;
  /** Index of the current table in the tables array */
  tableIndex: number;
  /** Computed table index that accounts for when table is being initialized */
  currentTableIndex: number;
  /** Field configurations for the current table */
  fieldsConfig: FieldConfig[];
  /** Config type (fmodata, fmdapi, etc.) */
  configType: string | undefined;
  /** Top-level includeAllFieldsByDefault value */
  topLevelIncludeAllFieldsByDefault: boolean | undefined;
  /** Effective includeAllFieldsByDefault (table-level or top-level) */
  effectiveIncludeAllFieldsByDefault: boolean;
  /** All tables configuration */
  allTablesConfig: TableConfig[] | undefined;
  /** Toggle field exclusion */
  toggleFieldExclude: (fieldName: string, exclude: boolean) => void;
  /** Set field type override */
  setFieldTypeOverride: (fieldName: string, typeOverride: string | undefined) => void;
  /** Include all fields */
  includeAllFields: () => void;
  /** Exclude all fields */
  excludeAllFields: () => void;
  /** Check if all fields are included */
  allFieldsIncluded: boolean;
  /** Check if all fields are excluded */
  allFieldsExcluded: boolean;
}

export function useFieldsConfig({ configIndex, tableName, fieldsData }: UseFieldsConfigProps): UseFieldsConfigReturn {
  const { control, setValue } = useFormContext<{ config: SingleConfig[] }>();

  // Get the config type to validate we're working with fmodata
  const configType = useWatch({
    control,
    name: `config.${configIndex}.type` as const,
  });

  // Get the entire tables config
  const allTablesConfig = useWatch({
    control,
    name: `config.${configIndex}.tables` as const,
  });

  // Get the top-level includeAllFieldsByDefault value
  const topLevelIncludeAllFieldsByDefault = useWatch({
    control,
    name: `config.${configIndex}.includeAllFieldsByDefault` as const,
  });

  // Extract the specific table's config
  const tableConfig = useMemo(() => {
    if (!(tableName && allTablesConfig && Array.isArray(allTablesConfig))) {
      return undefined;
    }
    return allTablesConfig.find((t) => t?.tableName === tableName);
  }, [tableName, allTablesConfig]);

  // Compute the table index for use in form paths
  const tableIndex = useMemo(() => {
    if (!(tableName && allTablesConfig && Array.isArray(allTablesConfig))) {
      return -1;
    }
    return allTablesConfig.findIndex((t) => t?.tableName === tableName);
  }, [tableName, allTablesConfig]);

  // Get the current table index - updates after useEffect ensures table exists
  const currentTableIndex = useMemo(() => {
    if (!(tableName && allTablesConfig && Array.isArray(allTablesConfig))) {
      return -1;
    }
    return allTablesConfig.findIndex((t) => t?.tableName === tableName);
  }, [tableName, allTablesConfig]);

  // Extract only the specific table's fields config
  const fieldsConfig = useMemo(() => {
    if (!tableConfig) {
      return EMPTY_FIELDS_CONFIG;
    }
    return (tableConfig.fields ?? EMPTY_FIELDS_CONFIG) as FieldConfig[];
  }, [tableConfig]);

  // Get the effective includeAllFieldsByDefault value
  const effectiveIncludeAllFieldsByDefault = useMemo(() => {
    return tableConfig?.includeAllFieldsByDefault ?? topLevelIncludeAllFieldsByDefault ?? true;
  }, [tableConfig?.includeAllFieldsByDefault, topLevelIncludeAllFieldsByDefault]);

  // Check if all fields are included or excluded
  const allFieldsIncluded = useMemo(() => {
    return fieldsData.length > 0 && fieldsData.every((row) => !row.isExcluded);
  }, [fieldsData]);

  const allFieldsExcluded = useMemo(() => {
    return fieldsData.length > 0 && fieldsData.every((row) => row.isExcluded);
  }, [fieldsData]);

  // Helper to toggle field exclusion
  const toggleFieldExclude = useCallback(
    (fieldName: string, exclude: boolean) => {
      if (configType !== "fmodata" || !tableName) {
        return;
      }

      const currentTables = (Array.isArray(allTablesConfig) ? allTablesConfig : []) as TableConfig[];
      const tableIdx = currentTables.findIndex((t) => t?.tableName === tableName);

      // Get effective includeAllFieldsByDefault value
      const tblConfig = currentTables[tableIdx];
      const effectiveInclude = tblConfig?.includeAllFieldsByDefault ?? topLevelIncludeAllFieldsByDefault ?? true;

      if (tableIdx < 0) {
        // Table doesn't exist in config yet
        if (exclude) {
          // Add new table with field excluded
          setValue(
            `config.${configIndex}.tables`,
            [...currentTables, { tableName, fields: [{ fieldName, exclude: true }] }],
            { shouldDirty: true },
          );
        } else if (!effectiveInclude) {
          // If includeAllFieldsByDefault is false, add field to array to include it
          setValue(`config.${configIndex}.tables`, [...currentTables, { tableName, fields: [{ fieldName }] }], {
            shouldDirty: true,
          });
        }
        return;
      }

      const currentFields = currentTables[tableIdx]?.fields ?? [];
      const fieldIndex = currentFields.findIndex((f) => f?.fieldName === fieldName);

      if (exclude) {
        // Set exclude to true
        if (fieldIndex >= 0) {
          // Update existing field entry
          const existingField = currentFields[fieldIndex];
          if (!existingField) {
            return;
          }
          const newFields = [...currentFields];
          newFields[fieldIndex] = { ...existingField, exclude: true };
          const newTables = [...currentTables];
          const existingTable = newTables[tableIdx];
          if (!existingTable) {
            return;
          }
          newTables[tableIdx] = {
            ...existingTable,
            fields: newFields,
          };
          setValue(`config.${configIndex}.tables`, newTables, {
            shouldDirty: true,
          });
        } else {
          // Add new field entry
          const newTables = [...currentTables];
          const existingTable = newTables[tableIdx];
          if (!existingTable) {
            return;
          }
          newTables[tableIdx] = {
            ...existingTable,
            fields: [...currentFields, { fieldName, exclude: true }],
          };
          setValue(`config.${configIndex}.tables`, newTables, {
            shouldDirty: true,
          });
        }
      } else if (effectiveInclude) {
        // If includeAllFieldsByDefault is true, remove field from array (or just remove exclude property)
        if (fieldIndex >= 0) {
          const fieldConfig = currentFields[fieldIndex];
          if (!fieldConfig) {
            return;
          }
          const { exclude: _, ...rest } = fieldConfig;

          if (Object.keys(rest).length === 1 && rest.fieldName) {
            // Only fieldName left, remove entire field entry
            const newFields = currentFields.filter((_, i) => i !== fieldIndex);
            const newTables = [...currentTables];

            const table = newTables[tableIdx];
            if (!table) {
              return;
            }
            const tableKeys = Object.keys(table);
            const hasOnlyTableNameAndFields =
              tableKeys.length === 2 && tableKeys.includes("tableName") && tableKeys.includes("fields");
            if (newFields.length === 0 && hasOnlyTableNameAndFields) {
              // Only tableName and fields left, remove entire table entry
              const filteredTables = currentTables.filter((_, i) => i !== tableIdx);
              setValue(
                `config.${configIndex}.tables`,
                (filteredTables.length > 0 ? filteredTables : undefined) as TableConfig[] | undefined,
                {
                  shouldDirty: true,
                },
              );
            } else {
              // Keep table but update fields
              newTables[tableIdx] = {
                ...table,
                fields: newFields.length > 0 ? newFields : undefined,
              };
              setValue(`config.${configIndex}.tables`, newTables, {
                shouldDirty: true,
              });
            }
          } else {
            // Keep other properties
            const newFields = [...currentFields];
            newFields[fieldIndex] = rest as FieldConfig;
            const newTables = [...currentTables];
            const existingTable = newTables[tableIdx];
            if (!existingTable) {
              return;
            }
            newTables[tableIdx] = {
              ...existingTable,
              fields: newFields,
            };
            setValue(`config.${configIndex}.tables`, newTables, {
              shouldDirty: true,
            });
          }
        }
      } else if (fieldIndex >= 0) {
        // Field exists, just remove exclude property
        const fieldConfig = currentFields[fieldIndex];
        if (!fieldConfig) {
          return;
        }
        const { exclude: _, ...rest } = fieldConfig;
        const newFields = [...currentFields];
        newFields[fieldIndex] = rest as FieldConfig;
        const newTables = [...currentTables];
        const existingTable = newTables[tableIdx];
        if (!existingTable) {
          return;
        }
        newTables[tableIdx] = {
          ...existingTable,
          fields: newFields,
        };
        setValue(`config.${configIndex}.tables`, newTables, {
          shouldDirty: true,
        });
      } else {
        // Add field to array
        const newTables = [...currentTables];
        const existingTable = newTables[tableIdx];
        if (!existingTable) {
          return;
        }
        newTables[tableIdx] = {
          ...existingTable,
          fields: [...currentFields, { fieldName }],
        };
        setValue(`config.${configIndex}.tables`, newTables, {
          shouldDirty: true,
        });
      }
    },
    [configType, configIndex, tableName, allTablesConfig, setValue, topLevelIncludeAllFieldsByDefault],
  );

  // Helper to set field type override
  const setFieldTypeOverride = useCallback(
    (fieldName: string, typeOverride: string | undefined) => {
      if (configType !== "fmodata" || !tableName) {
        return;
      }

      const currentTables = (Array.isArray(allTablesConfig) ? allTablesConfig : []) as TableConfig[];
      const tableIdx = currentTables.findIndex((t) => t?.tableName === tableName);

      if (tableIdx < 0) {
        // Table doesn't exist in config yet
        if (typeOverride) {
          // Add new table with field type override
          setValue(
            `config.${configIndex}.tables`,
            [...currentTables, { tableName, fields: [{ fieldName, typeOverride }] }] as TableConfig[],
            { shouldDirty: true },
          );
        }
        return;
      }

      const currentFields = currentTables[tableIdx]?.fields ?? [];
      const fieldIndex = currentFields.findIndex((f) => f?.fieldName === fieldName);

      if (typeOverride) {
        // Set typeOverride
        if (fieldIndex >= 0) {
          // Update existing field entry
          const existingField = currentFields[fieldIndex];
          if (!existingField) {
            return;
          }
          const newFields = [...currentFields];
          newFields[fieldIndex] = {
            ...existingField,
            typeOverride,
          } as FieldConfig;
          const newTables = [...currentTables];
          const existingTable = newTables[tableIdx];
          if (!existingTable) {
            return;
          }
          newTables[tableIdx] = {
            ...existingTable,
            fields: newFields,
          };
          setValue(`config.${configIndex}.tables`, newTables, {
            shouldDirty: true,
          });
        } else {
          // Add new field entry
          const newTables = [...currentTables];
          const existingTable = newTables[tableIdx];
          if (!existingTable) {
            return;
          }
          newTables[tableIdx] = {
            ...existingTable,
            fields: [...currentFields, { fieldName, typeOverride } as FieldConfig],
          };
          setValue(`config.${configIndex}.tables`, newTables, {
            shouldDirty: true,
          });
        }
      } else if (fieldIndex >= 0) {
        // Remove typeOverride (or remove entire entry if no other config)
        const fieldConfig = currentFields[fieldIndex];
        if (!fieldConfig) {
          return;
        }
        const { typeOverride: _, ...rest } = fieldConfig;

        if (Object.keys(rest).length === 1 && rest.fieldName) {
          // Only fieldName left, remove entire field entry
          const newFields = currentFields.filter((_, i) => i !== fieldIndex);
          const newTables = [...currentTables];

          const table = newTables[tableIdx];
          if (!table) {
            return;
          }
          const tableKeys = Object.keys(table);
          const hasOnlyTableNameAndFields =
            tableKeys.length === 2 && tableKeys.includes("tableName") && tableKeys.includes("fields");
          if (newFields.length === 0 && hasOnlyTableNameAndFields) {
            // Only tableName and fields left, remove entire table entry
            const filteredTables = currentTables.filter((_, i) => i !== tableIdx);
            setValue(
              `config.${configIndex}.tables`,
              (filteredTables.length > 0 ? filteredTables : undefined) as TableConfig[] | undefined,
              {
                shouldDirty: true,
              },
            );
          } else {
            // Keep table but update fields
            newTables[tableIdx] = {
              ...table,
              fields: newFields.length > 0 ? newFields : undefined,
            };
            setValue(`config.${configIndex}.tables`, newTables, {
              shouldDirty: true,
            });
          }
        } else {
          // Keep other properties
          const newFields = [...currentFields];
          newFields[fieldIndex] = rest as FieldConfig;
          const newTables = [...currentTables];
          const existingTable = newTables[tableIdx];
          if (!existingTable) {
            return;
          }
          newTables[tableIdx] = {
            ...existingTable,
            fields: newFields,
          };
          setValue(`config.${configIndex}.tables`, newTables, {
            shouldDirty: true,
          });
        }
      }
    },
    [configType, configIndex, tableName, allTablesConfig, setValue],
  );

  // Helper to include all fields
  const includeAllFields = useCallback(() => {
    if (configType !== "fmodata" || !tableName || !fieldsData.length) {
      return;
    }

    const currentTables = (Array.isArray(allTablesConfig) ? allTablesConfig : []) as TableConfig[];
    const tableIdx = currentTables.findIndex((t) => t?.tableName === tableName);

    // Get effective includeAllFieldsByDefault value
    const tblConfig = tableIdx >= 0 ? currentTables[tableIdx] : undefined;
    const effectiveInclude = tblConfig?.includeAllFieldsByDefault ?? topLevelIncludeAllFieldsByDefault ?? true;

    const currentFields = tableIdx >= 0 ? (currentTables[tableIdx]?.fields ?? []) : [];
    const allFieldNames = fieldsData.map((f) => f.fieldName);

    let newFields: FieldConfig[];
    let newTables: TableConfig[];

    if (effectiveInclude) {
      // If includeAllFieldsByDefault is true, remove all field entries (or just remove exclude flags)
      // since all fields are included by default
      newFields = currentFields
        .map((fieldConfig) => {
          const fieldName = fieldConfig?.fieldName;
          if (fieldName && allFieldNames.includes(fieldName)) {
            const { exclude: _, ...rest } = fieldConfig;
            // If only fieldName is left, don't include it
            if (Object.keys(rest).length === 1 && rest.fieldName) {
              return null;
            }
            return Object.keys(rest).length > 1 ? rest : null;
          }
          return fieldConfig;
        })
        .filter((f): f is FieldConfig => f !== null);

      newTables = [...currentTables];
      if (tableIdx < 0) {
        // Table doesn't exist, but with includeAllFieldsByDefault=true, we don't need to add it
        return;
      }

      if (newFields.length === 0) {
        // No fields left, remove fields array or entire table entry if only tableName and fields
        const table = newTables[tableIdx];
        if (!table) {
          return;
        }
        const tableKeys = Object.keys(table);
        const hasOnlyTableNameAndFields =
          tableKeys.length === 2 && tableKeys.includes("tableName") && tableKeys.includes("fields");
        if (hasOnlyTableNameAndFields) {
          const filteredTables = currentTables.filter((_, i) => i !== tableIdx);
          setValue(
            `config.${configIndex}.tables`,
            (filteredTables.length > 0 ? filteredTables : undefined) as TableConfig[] | undefined,
            {
              shouldDirty: true,
            },
          );
        } else {
          const existingTable = newTables[tableIdx];
          if (!existingTable) {
            return;
          }
          newTables[tableIdx] = {
            ...existingTable,
            fields: undefined,
          };
          setValue(`config.${configIndex}.tables`, newTables, {
            shouldDirty: true,
          });
        }
      } else {
        const existingTable = newTables[tableIdx];
        if (!existingTable) {
          return;
        }
        newTables[tableIdx] = {
          ...existingTable,
          fields: newFields,
        };
        setValue(`config.${configIndex}.tables`, newTables, {
          shouldDirty: true,
        });
      }
    } else {
      // If includeAllFieldsByDefault is false, add all fields to the array (or ensure they're all there)
      // Create a map of existing field configs
      const fieldConfigMap = new Map(currentFields.map((f) => [f?.fieldName, f]));

      // Ensure all fields are in the array without exclude flags
      newFields = allFieldNames.map((fieldName) => {
        const existing = fieldConfigMap.get(fieldName);
        if (existing) {
          // Remove exclude flag if present
          const { exclude: _, ...rest } = existing;
          return rest;
        }
        // Add new field entry
        return { fieldName };
      });

      if (tableIdx < 0) {
        // Table doesn't exist, add it with all fields
        setValue(`config.${configIndex}.tables`, [...currentTables, { tableName, fields: newFields }], {
          shouldDirty: true,
        });
      } else {
        // Update existing table
        newTables = [...currentTables];
        const existingTable = newTables[tableIdx];
        if (!existingTable) {
          return;
        }
        newTables[tableIdx] = {
          ...existingTable,
          fields: newFields,
        };
        setValue(`config.${configIndex}.tables`, newTables, {
          shouldDirty: true,
        });
      }
    }
  }, [configType, configIndex, tableName, allTablesConfig, setValue, fieldsData, topLevelIncludeAllFieldsByDefault]);

  // Helper to exclude all fields
  const excludeAllFields = useCallback(() => {
    if (configType !== "fmodata" || !tableName || !fieldsData.length) {
      return;
    }

    const currentTables = (Array.isArray(allTablesConfig) ? allTablesConfig : []) as TableConfig[];
    const tableIdx = currentTables.findIndex((t) => t?.tableName === tableName);

    // Create a map of existing field configs
    const fieldConfigMap = new Map(
      tableIdx >= 0 ? (currentTables[tableIdx]?.fields ?? []).map((f) => [f?.fieldName, f]) : [],
    );

    // Update or add exclude flag for all fields
    const allFieldNames = fieldsData.map((f) => f.fieldName);
    const newFields = allFieldNames.map((fieldName) => {
      const existing = fieldConfigMap.get(fieldName);
      if (existing) {
        return { ...existing, exclude: true };
      }
      return { fieldName, exclude: true };
    });

    if (tableIdx < 0) {
      // Table doesn't exist, add it with all fields excluded
      setValue(`config.${configIndex}.tables`, [...currentTables, { tableName, fields: newFields }], {
        shouldDirty: true,
      });
    } else {
      // Update existing table
      const newTables = [...currentTables];
      const existingTable = newTables[tableIdx];
      if (!existingTable) {
        return;
      }
      newTables[tableIdx] = {
        ...existingTable,
        fields: newFields,
      };
      setValue(`config.${configIndex}.tables`, newTables, {
        shouldDirty: true,
      });
    }
  }, [configType, configIndex, tableName, allTablesConfig, setValue, fieldsData]);

  return {
    tableConfig,
    tableIndex,
    currentTableIndex,
    fieldsConfig,
    configType,
    topLevelIncludeAllFieldsByDefault,
    effectiveIncludeAllFieldsByDefault,
    allTablesConfig,
    toggleFieldExclude,
    setFieldTypeOverride,
    includeAllFields,
    excludeAllFields,
    allFieldsIncluded,
    allFieldsExcluded,
  };
}
