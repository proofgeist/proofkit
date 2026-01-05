import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Search, Check, Key } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { DataGrid, DataGridContainer } from "./ui/data-grid";
import { DataGridTable } from "./ui/data-grid-table";
import { DataGridColumnHeader } from "./ui/data-grid-column-header";
import { DataGridPagination } from "./ui/data-grid-pagination";
import { Input, InputWrapper } from "./ui/input";
import { Switch } from "./ui/switch";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "./ui/dialog";
import { useTableMetadata } from "../hooks/useTableMetadata";
import type { SingleConfig } from "../lib/config-utils";
import { InfoTooltip } from "./InfoTooltip";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

// Memoize model functions outside component to ensure stable references
const coreRowModel = getCoreRowModel();
const sortedRowModel = getSortedRowModel();
const filteredRowModel = getFilteredRowModel();
const paginationRowModel = getPaginationRowModel();

// Stable empty array to prevent infinite re-renders
const EMPTY_FIELDS_CONFIG: any[] = [];

/**
 * Maps OData types to readable field type labels
 * Based on the mappings in generateODataTypes.ts
 */
function mapODataTypeToReadableLabel(edmType: string): string {
  switch (edmType) {
    case "Edm.String":
      return "Text";
    case "Edm.Decimal":
    case "Edm.Int32":
    case "Edm.Int64":
    case "Edm.Double":
      return "Number";
    case "Edm.Boolean":
      return "Boolean";
    case "Edm.Date":
      return "Date";
    case "Edm.DateTimeOffset":
      return "Timestamp";
    case "Edm.Binary":
      return "Container";
    default:
      // For unknown types, show the original type
      return edmType || "Unknown";
  }
}

/**
 * Reusable component for rendering boolean values in table cells
 * Shows a green checkmark when true, dash when false/undefined
 */
function BooleanCell({ value }: { value: boolean | undefined }) {
  return (
    <div className="flex items-center justify-center">
      {value === true ? (
        <Check className="size-4 text-green-600" />
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </div>
  );
}

interface FieldRow {
  fieldName: string;
  fieldType: string;
  nullable: boolean | undefined;
  global: boolean | undefined;
  readOnly: boolean;
  isExcluded: boolean;
  typeOverride?: string;
  primaryKey: boolean;
}

interface MetadataFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string | null;
  configIndex: number;
}

export function MetadataFieldsDialog({
  open,
  onOpenChange,
  tableName,
  configIndex,
}: MetadataFieldsDialogProps) {
  // Fetch metadata - query is paused when dialog is not open
  const {
    data: parsedMetadata,
    isLoading,
    isError,
    error,
  } = useTableMetadata(
    configIndex,
    tableName,
    open, // enabled flag
  );
  const { control, setValue } = useFormContext<{ config: SingleConfig[] }>();

  const [globalFilter, setGlobalFilter] = useState("");

  // Get the config type to validate we're working with fmodata
  const configType = useWatch({
    control,
    name: `config.${configIndex}.type` as const,
  });

  // Get the entire tables config - we'll extract the specific table's fields
  const allTablesConfig = useWatch({
    control,
    name: `config.${configIndex}.tables` as const,
  });

  // Use a ref to store the latest fieldsConfig to avoid unstable dependencies
  const fieldsConfigRef = useRef<any[]>(EMPTY_FIELDS_CONFIG);

  // Extract the specific table's config - use stable reference to prevent infinite re-renders
  const tableConfig = useMemo(() => {
    if (!tableName || !allTablesConfig || !Array.isArray(allTablesConfig)) {
      return undefined;
    }
    return allTablesConfig.find((t) => t?.tableName === tableName);
  }, [tableName, allTablesConfig]);

  // Compute the table index for use in form paths
  const tableIndex = useMemo(() => {
    if (!tableName || !allTablesConfig || !Array.isArray(allTablesConfig)) {
      return -1;
    }
    return allTablesConfig.findIndex((t) => t?.tableName === tableName);
  }, [tableName, allTablesConfig]);

  // Ensure table exists in config when dialog opens (if table is included)
  // This ensures we have a stable index for useController
  useEffect(() => {
    if (!open || !tableName || configType !== "fmodata") return;
    if (tableIndex < 0) {
      // Table doesn't exist yet, but we need it to exist for the form fields
      // Only create it if we're actually configuring it (it should be included)
      const currentTables = Array.isArray(allTablesConfig)
        ? allTablesConfig
        : [];
      setValue(
        `config.${configIndex}.tables` as any,
        [...currentTables, { tableName }],
        { shouldDirty: false }, // Don't mark as dirty since this is just initialization
      );
    }
  }, [
    open,
    tableName,
    tableIndex,
    configType,
    configIndex,
    allTablesConfig,
    setValue,
  ]);

  // Get the current table index - this will update after useEffect ensures table exists
  const currentTableIndex = useMemo(() => {
    if (!tableName || !allTablesConfig || !Array.isArray(allTablesConfig)) {
      return -1;
    }
    return allTablesConfig.findIndex((t) => t?.tableName === tableName);
  }, [tableName, allTablesConfig]);

  // Extract only the specific table's fields config - use stable reference to prevent infinite re-renders
  const fieldsConfig = useMemo(() => {
    if (!tableConfig) {
      return EMPTY_FIELDS_CONFIG;
    }
    return (tableConfig.fields ?? EMPTY_FIELDS_CONFIG) as any[];
  }, [tableConfig]);

  // Keep ref in sync
  fieldsConfigRef.current = fieldsConfig;

  // Helper to toggle field exclusion - use ref to avoid dependency on fieldsConfig
  const toggleFieldExclude = useCallback(
    (fieldName: string, exclude: boolean) => {
      if (configType !== "fmodata" || !tableName) return;

      const currentTables = Array.isArray(allTablesConfig)
        ? allTablesConfig
        : [];
      const tableIndex = currentTables.findIndex(
        (t) => t?.tableName === tableName,
      );

      if (tableIndex < 0) {
        // Table doesn't exist in config yet
        if (exclude) {
          // Add new table with field excluded
          setValue(
            `config.${configIndex}.tables` as any,
            [
              ...currentTables,
              { tableName, fields: [{ fieldName, exclude: true }] },
            ],
            { shouldDirty: true },
          );
        }
        return;
      }

      const currentFields = currentTables[tableIndex]?.fields ?? [];
      const fieldIndex = currentFields.findIndex(
        (f) => f?.fieldName === fieldName,
      );

      if (exclude) {
        // Set exclude to true
        if (fieldIndex >= 0) {
          // Update existing field entry
          const newFields = [...currentFields];
          newFields[fieldIndex] = { ...newFields[fieldIndex]!, exclude: true };
          const newTables = [...currentTables];
          newTables[tableIndex] = {
            ...newTables[tableIndex]!,
            fields: newFields,
          };
          setValue(`config.${configIndex}.tables` as any, newTables, {
            shouldDirty: true,
          });
        } else {
          // Add new field entry
          const newTables = [...currentTables];
          newTables[tableIndex] = {
            ...newTables[tableIndex]!,
            fields: [...currentFields, { fieldName, exclude: true }],
          };
          setValue(`config.${configIndex}.tables` as any, newTables, {
            shouldDirty: true,
          });
        }
      } else {
        // Remove exclude (or remove entire entry if no other config)
        if (fieldIndex >= 0) {
          const fieldConfig = currentFields[fieldIndex]!;
          const { exclude: _, ...rest } = fieldConfig;

          if (Object.keys(rest).length === 1 && rest.fieldName) {
            // Only fieldName left, remove entire field entry
            const newFields = currentFields.filter((_, i) => i !== fieldIndex);
            const newTables = [...currentTables];

            if (
              newFields.length === 0 &&
              Object.keys(newTables[tableIndex]!).length === 2
            ) {
              // Only tableName and fields left, remove entire table entry
              const filteredTables = currentTables.filter(
                (_, i) => i !== tableIndex,
              );
              setValue(
                `config.${configIndex}.tables` as any,
                filteredTables.length > 0 ? filteredTables : undefined,
                { shouldDirty: true },
              );
            } else {
              // Keep table but update fields
              newTables[tableIndex] = {
                ...newTables[tableIndex]!,
                fields: newFields.length > 0 ? newFields : undefined,
              };
              setValue(`config.${configIndex}.tables` as any, newTables, {
                shouldDirty: true,
              });
            }
          } else {
            // Keep other properties
            const newFields = [...currentFields];
            newFields[fieldIndex] = rest as any;
            const newTables = [...currentTables];
            newTables[tableIndex] = {
              ...newTables[tableIndex]!,
              fields: newFields,
            };
            setValue(`config.${configIndex}.tables` as any, newTables, {
              shouldDirty: true,
            });
          }
        }
      }
    },
    [configType, configIndex, tableName, allTablesConfig, setValue],
  );

  // Get the field name for variableName - table should exist due to ensuredTableIndex above
  const variableNameFieldName =
    `config.${configIndex}.tables.${currentTableIndex >= 0 ? currentTableIndex : 0}.variableName` as any;

  // Get the field name for reduceMetadata - table should exist due to ensuredTableIndex above
  const reduceMetadataFieldName =
    `config.${configIndex}.tables.${currentTableIndex >= 0 ? currentTableIndex : 0}.reduceMetadata` as any;

  // Get the field name for alwaysOverrideFieldNames - table should exist due to ensuredTableIndex above
  const alwaysOverrideFieldNamesFieldName =
    `config.${configIndex}.tables.${currentTableIndex >= 0 ? currentTableIndex : 0}.alwaysOverrideFieldNames` as any;

  // Helper to set field type override - use ref to avoid dependency on fieldsConfig
  const setFieldTypeOverride = useCallback(
    (fieldName: string, typeOverride: string | undefined) => {
      if (configType !== "fmodata" || !tableName) return;

      const currentTables = Array.isArray(allTablesConfig)
        ? allTablesConfig
        : [];
      const tableIndex = currentTables.findIndex(
        (t) => t?.tableName === tableName,
      );

      if (tableIndex < 0) {
        // Table doesn't exist in config yet
        if (typeOverride) {
          // Add new table with field type override
          setValue(
            `config.${configIndex}.tables` as any,
            [
              ...currentTables,
              { tableName, fields: [{ fieldName, typeOverride }] },
            ],
            { shouldDirty: true },
          );
        }
        return;
      }

      const currentFields = currentTables[tableIndex]?.fields ?? [];
      const fieldIndex = currentFields.findIndex(
        (f) => f?.fieldName === fieldName,
      );

      if (typeOverride) {
        // Set typeOverride
        if (fieldIndex >= 0) {
          // Update existing field entry
          const newFields = [...currentFields];
          newFields[fieldIndex] = {
            ...newFields[fieldIndex]!,
            typeOverride,
          } as any;
          const newTables = [...currentTables];
          newTables[tableIndex] = {
            ...newTables[tableIndex]!,
            fields: newFields,
          };
          setValue(`config.${configIndex}.tables` as any, newTables, {
            shouldDirty: true,
          });
        } else {
          // Add new field entry
          const newTables = [...currentTables];
          newTables[tableIndex] = {
            ...newTables[tableIndex]!,
            fields: [...currentFields, { fieldName, typeOverride } as any],
          };
          setValue(`config.${configIndex}.tables` as any, newTables, {
            shouldDirty: true,
          });
        }
      } else {
        // Remove typeOverride (or remove entire entry if no other config)
        if (fieldIndex >= 0) {
          const fieldConfig = currentFields[fieldIndex]!;
          const { typeOverride: _, ...rest } = fieldConfig;

          if (Object.keys(rest).length === 1 && rest.fieldName) {
            // Only fieldName left, remove entire field entry
            const newFields = currentFields.filter((_, i) => i !== fieldIndex);
            const newTables = [...currentTables];

            if (
              newFields.length === 0 &&
              Object.keys(newTables[tableIndex]!).length === 2
            ) {
              // Only tableName and fields left, remove entire table entry
              const filteredTables = currentTables.filter(
                (_, i) => i !== tableIndex,
              );
              setValue(
                `config.${configIndex}.tables` as any,
                filteredTables.length > 0 ? filteredTables : undefined,
                { shouldDirty: true },
              );
            } else {
              // Keep table but update fields
              newTables[tableIndex] = {
                ...newTables[tableIndex]!,
                fields: newFields.length > 0 ? newFields : undefined,
              };
              setValue(`config.${configIndex}.tables` as any, newTables, {
                shouldDirty: true,
              });
            }
          } else {
            // Keep other properties
            const newFields = [...currentFields];
            newFields[fieldIndex] = rest as any;
            const newTables = [...currentTables];
            newTables[tableIndex] = {
              ...newTables[tableIndex]!,
              fields: newFields,
            };
            setValue(`config.${configIndex}.tables` as any, newTables, {
              shouldDirty: true,
            });
          }
        }
      }
    },
    [configType, configIndex, tableName, allTablesConfig, setValue],
  );

  // Get fields for the selected table
  const fieldsData = useMemo<FieldRow[]>(() => {
    if (
      !tableName ||
      !parsedMetadata?.entitySets ||
      !parsedMetadata?.entityTypes
    ) {
      return [];
    }

    const entitySet = Object.values(parsedMetadata.entitySets).find(
      (es) => es.Name === tableName,
    );
    if (!entitySet) return [];

    const entityType = parsedMetadata.entityTypes[entitySet.EntityType];
    if (!entityType?.Properties) return [];

    const properties = entityType.Properties;
    const keyFields = entityType.$Key || [];
    const fields: FieldRow[] = [];

    // Handle both Map and object formats
    if (properties instanceof Map) {
      properties.forEach((fieldMetadata, fieldName) => {
        const metadata = fieldMetadata as {
          $Type?: string;
          $Nullable?: boolean;
          "@Calculation"?: boolean;
          "@Global"?: boolean;
          "@Org.OData.Core.V1.Permissions"?: string;
          $DefaultValue?: string;
        };
        // Determine if field is read-only based on generateODataTypes.ts logic
        const isReadOnly =
          metadata["@Calculation"] ||
          metadata["@Global"] ||
          metadata["@Org.OData.Core.V1.Permissions"]?.includes("Read") ||
          false;

        const fieldConfig = Array.isArray(fieldsConfig)
          ? fieldsConfig.find((f) => f?.fieldName === fieldName)
          : undefined;
        const isExcluded = fieldConfig?.exclude === true;
        const typeOverride = fieldConfig?.typeOverride;
        const isPrimaryKey = keyFields.includes(fieldName);

        fields.push({
          fieldName,
          fieldType: mapODataTypeToReadableLabel(metadata.$Type || ""),
          nullable: metadata.$Nullable,
          global: metadata["@Global"],
          readOnly: isReadOnly,
          isExcluded,
          typeOverride,
          primaryKey: isPrimaryKey,
        });
      });
    } else if (typeof properties === "object") {
      Object.entries(properties).forEach(([fieldName, fieldMetadata]) => {
        const metadata = fieldMetadata as {
          $Type?: string;
          $Nullable?: boolean;
          "@Calculation"?: boolean;
          "@Global"?: boolean;
          "@Org.OData.Core.V1.Permissions"?: string;
          $DefaultValue?: string;
        };
        // Determine if field is read-only based on generateODataTypes.ts logic
        const isReadOnly =
          metadata["@Calculation"] ||
          metadata["@Global"] ||
          metadata["@Org.OData.Core.V1.Permissions"]?.includes("Read") ||
          false;

        const fieldConfig = Array.isArray(fieldsConfig)
          ? fieldsConfig.find((f) => f?.fieldName === fieldName)
          : undefined;
        const isExcluded = fieldConfig?.exclude === true;
        const typeOverride = fieldConfig?.typeOverride;
        const isPrimaryKey = keyFields.includes(fieldName);

        fields.push({
          fieldName,
          fieldType: mapODataTypeToReadableLabel(metadata.$Type || ""),
          nullable: metadata.$Nullable,
          global: metadata["@Global"],
          readOnly: isReadOnly,
          isExcluded,
          typeOverride,
          primaryKey: isPrimaryKey,
        });
      });
    }

    return fields;
  }, [tableName, parsedMetadata, fieldsConfig]);

  // Check if all fields are included or excluded
  const allFieldsIncluded = useMemo(() => {
    return fieldsData.length > 0 && fieldsData.every((row) => !row.isExcluded);
  }, [fieldsData]);

  const allFieldsExcluded = useMemo(() => {
    return fieldsData.length > 0 && fieldsData.every((row) => row.isExcluded);
  }, [fieldsData]);

  // Helper to include all fields
  const includeAllFields = useCallback(() => {
    if (configType !== "fmodata" || !tableName || !fieldsData.length) return;

    const currentTables = Array.isArray(allTablesConfig) ? allTablesConfig : [];
    const tableIndex = currentTables.findIndex(
      (t) => t?.tableName === tableName,
    );

    if (tableIndex < 0) {
      // Table doesn't exist in config, nothing to do
      return;
    }

    const currentFields = currentTables[tableIndex]?.fields ?? [];
    const allFieldNames = fieldsData.map((f) => f.fieldName);

    // Remove exclude flags from all fields
    const newFields = currentFields
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
      .filter((f) => f !== null) as any[];

    const newTables = [...currentTables];
    if (newFields.length === 0) {
      // No fields left, remove fields array or entire table entry if only tableName and fields
      if (Object.keys(newTables[tableIndex]!).length === 2) {
        const filteredTables = currentTables.filter((_, i) => i !== tableIndex);
        setValue(
          `config.${configIndex}.tables` as any,
          filteredTables.length > 0 ? filteredTables : undefined,
          { shouldDirty: true },
        );
      } else {
        newTables[tableIndex] = {
          ...newTables[tableIndex]!,
          fields: undefined,
        };
        setValue(`config.${configIndex}.tables` as any, newTables, {
          shouldDirty: true,
        });
      }
    } else {
      newTables[tableIndex] = {
        ...newTables[tableIndex]!,
        fields: newFields,
      };
      setValue(`config.${configIndex}.tables` as any, newTables, {
        shouldDirty: true,
      });
    }
  }, [
    configType,
    configIndex,
    tableName,
    allTablesConfig,
    setValue,
    fieldsData,
  ]);

  // Helper to exclude all fields
  const excludeAllFields = useCallback(() => {
    if (configType !== "fmodata" || !tableName || !fieldsData.length) return;

    const currentTables = Array.isArray(allTablesConfig) ? allTablesConfig : [];
    const tableIndex = currentTables.findIndex(
      (t) => t?.tableName === tableName,
    );

    // Create a map of existing field configs
    const fieldConfigMap = new Map(
      tableIndex >= 0
        ? (currentTables[tableIndex]?.fields ?? []).map((f) => [
            f?.fieldName,
            f,
          ])
        : [],
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

    if (tableIndex < 0) {
      // Table doesn't exist, add it with all fields excluded
      setValue(
        `config.${configIndex}.tables` as any,
        [...currentTables, { tableName, fields: newFields }],
        { shouldDirty: true },
      );
    } else {
      // Update existing table
      const newTables = [...currentTables];
      newTables[tableIndex] = {
        ...newTables[tableIndex]!,
        fields: newFields,
      };
      setValue(`config.${configIndex}.tables` as any, newTables, {
        shouldDirty: true,
      });
    }
  }, [
    configType,
    configIndex,
    tableName,
    allTablesConfig,
    setValue,
    fieldsData,
  ]);

  // Define columns for fields table
  const fieldsColumns = useMemo<ColumnDef<FieldRow>[]>(
    () => [
      {
        accessorKey: "isExcluded",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Include"
            customActions={
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    includeAllFields();
                  }}
                  disabled={allFieldsIncluded}
                >
                  <span>Include All</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    excludeAllFields();
                  }}
                  disabled={allFieldsExcluded}
                >
                  <span>Exclude All</span>
                </DropdownMenuItem>
              </>
            }
          />
        ),
        enableSorting: true,
        size: 60,
        minSize: 60,
        maxSize: 60,
        cell: (info) => {
          const row = info.row.original;
          const isExcluded = row.isExcluded;
          return (
            <div className="flex items-center justify-center w-fit">
              <Switch
                checked={!isExcluded}
                onCheckedChange={(checked) => {
                  toggleFieldExclude(row.fieldName, !checked);
                }}
              />
            </div>
          );
        },
        meta: {
          skeleton: <Skeleton className="w-11 h-6" />,
        },
      },
      {
        accessorKey: "fieldName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Field Name" />
        ),
        enableSorting: true,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              {row.primaryKey && (
                <Key className="size-4 text-muted-foreground" />
              )}
              <span
                className={`font-medium ${
                  row.isExcluded ? "text-muted-foreground line-through" : ""
                }`}
              >
                {info.getValue() as string}
              </span>
            </div>
          );
        },
        meta: {
          skeleton: <Skeleton className="w-32 h-5" />,
        },
      },
      {
        accessorKey: "fieldType",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Type" />
        ),
        enableSorting: true,
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() as string}
          </span>
        ),
        meta: {
          skeleton: <Skeleton className="w-20 h-5" />,
        },
      },
      {
        id: "typeOverride",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Type Override" />
        ),
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Select
              value={row.typeOverride || "__default__"}
              onValueChange={(value) => {
                setFieldTypeOverride(
                  row.fieldName,
                  value === "__default__" ? undefined : value,
                );
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">None</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="fmBooleanNumber">FM Boolean</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="timestamp">Timestamp</SelectItem>
                <SelectItem value="container">Container</SelectItem>
              </SelectContent>
            </Select>
          );
        },
        meta: {
          skeleton: <Skeleton className="w-[140px] h-9" />,
        },
      },
      {
        accessorKey: "nullable",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Nullable" />
        ),
        enableSorting: true,
        cell: (info) => (
          <BooleanCell value={info.getValue() as boolean | undefined} />
        ),
        meta: {
          skeleton: <Skeleton className="w-6 h-6" />,
        },
      },
      {
        accessorKey: "global",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Global" />
        ),
        enableSorting: true,
        cell: (info) => (
          <BooleanCell value={info.getValue() as boolean | undefined} />
        ),
        meta: {
          skeleton: <Skeleton className="w-6 h-6" />,
        },
      },
      {
        accessorKey: "readOnly",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Read Only" />
        ),
        enableSorting: true,
        cell: (info) => <BooleanCell value={info.getValue() as boolean} />,
        meta: {
          skeleton: <Skeleton className="w-6 h-6" />,
        },
      },
    ],
    [
      toggleFieldExclude,
      setFieldTypeOverride,
      includeAllFields,
      excludeAllFields,
      allFieldsIncluded,
      allFieldsExcluded,
    ],
  );

  // Create fields table instance - use memoized model functions for stable references
  const fieldsTable = useReactTable({
    data: fieldsData,
    columns: fieldsColumns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    getPaginationRowModel: paginationRowModel,
    globalFilterFn: "includesString",
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Calculate the number of included (non-excluded) fields
  const selectedFieldsCount = useMemo(() => {
    return fieldsData.filter((row) => !row.isExcluded).length;
  }, [fieldsData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="default"
        className="max-w-6xl max-h-[90vh] w-full flex flex-col !top-[5vh] !translate-y-0"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Including {selectedFieldsCount} of {fieldsData.length} fields for{" "}
            {tableName || "Table"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="overflow-x-auto overflow-y-auto flex-1 min-h-0 flex flex-col">
          <div className="space-y-2 flex-shrink-0 mb-2">
            <InputWrapper>
              <Search className="size-4" />
              <Input
                placeholder="Search fields..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </InputWrapper>
          </div>
          <div className="flex-1 min-h-0">
            {isError ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center space-y-2">
                  <div className="text-destructive font-medium">
                    Failed to load fields
                  </div>
                  {error instanceof Error && (
                    <div className="text-sm text-muted-foreground">
                      {error.message}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <DataGrid
                table={fieldsTable}
                recordCount={fieldsTable.getFilteredRowModel().rows.length}
                isLoading={isLoading}
                emptyMessage="No fields found."
                tableLayout={{ width: "auto" }}
              >
                <DataGridContainer>
                  <DataGridTable />
                  <div className="border-t border-border px-5 min-h-14 flex items-center">
                    <DataGridPagination className="py-0" />
                  </div>
                </DataGridContainer>
              </DataGrid>
            )}
          </div>
          <div className="flex-shrink-0 pt-4 border-t border-border">
            <div className="flex  gap-4">
              <FormField
                control={control}
                name={variableNameFieldName}
                disabled={
                  currentTableIndex < 0 || configType !== "fmodata" || !open
                }
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="flex items-center gap-1">
                      Variable Name Override
                      <InfoTooltip label="The variable name to use for the generated schema for this table" />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Leave empty to use default"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          field.onChange(value || undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={alwaysOverrideFieldNamesFieldName}
                disabled={
                  currentTableIndex < 0 || configType !== "fmodata" || !open
                }
                render={({ field }) => {
                  const isDefault = field.value === undefined;
                  return (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Always Update Field Names{" "}
                        <InfoTooltip label="If true, the field names in your generated schema may be updated to match FileMaker; may cause TypeScript errors in your code. If you only use entity IDs in your OData requests, you can safely leave this off." />
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={
                            field.value === undefined
                              ? "__default__"
                              : field.value === true
                                ? "true"
                                : "false"
                          }
                          onValueChange={(val) => {
                            if (val === "__default__") {
                              field.onChange(undefined);
                            } else {
                              field.onChange(val === "true");
                            }
                          }}
                        >
                          <SelectTrigger
                            className={
                              isDefault
                                ? "[&>span]:italic [&>span]:text-muted-foreground"
                                : ""
                            }
                          >
                            <SelectValue placeholder="Select always update field names option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="__default__"
                              className="italic text-muted-foreground"
                            >
                              Use Top-Level Setting
                            </SelectItem>
                            <SelectItem value="true">
                              Always Update Field Names
                            </SelectItem>
                            <SelectItem value="false">
                              Don't Always Update Field Names
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={control}
                name={reduceMetadataFieldName}
                disabled={
                  currentTableIndex < 0 || configType !== "fmodata" || !open
                }
                render={({ field }) => {
                  const isDefault = field.value === undefined;
                  return (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Reduce Metadata Annotations{" "}
                        <InfoTooltip label="Request reduced OData annotations to reduce payload size. This will prevent comments, entity ids, and other properties from being generated." />
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={
                            field.value === undefined
                              ? "__default__"
                              : field.value === true
                                ? "true"
                                : "false"
                          }
                          onValueChange={(val) => {
                            if (val === "__default__") {
                              field.onChange(undefined);
                            } else {
                              field.onChange(val === "true");
                            }
                          }}
                        >
                          <SelectTrigger
                            className={
                              isDefault
                                ? "[&>span]:italic [&>span]:text-muted-foreground"
                                : ""
                            }
                          >
                            <SelectValue placeholder="Select reduce metadata option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="__default__"
                              className="italic text-muted-foreground"
                            >
                              Use Top-Level Setting
                            </SelectItem>
                            <SelectItem value="true">
                              Reduce Metadata
                            </SelectItem>
                            <SelectItem value="false">Full Metadata</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
