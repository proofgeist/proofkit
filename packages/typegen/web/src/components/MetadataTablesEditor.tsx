import { useMemo, useState, useCallback, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useParseMetadata } from "../hooks/useParseMetadata";
import { Loader2, AlertTriangle, Search } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { DataGrid, DataGridContainer } from "./ui/data-grid";
import { DataGridTable } from "./ui/data-grid-table";
import { DataGridColumnHeader } from "./ui/data-grid-column-header";
import { Input, InputWrapper } from "./ui/input";
import { Switch } from "./ui/switch";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import { MetadataFieldsDialog } from "./MetadataFieldsDialog";
import type { SingleConfig } from "../lib/config-utils";

// Memoize model functions outside component to ensure stable references
const coreRowModel = getCoreRowModel();
const sortedRowModel = getSortedRowModel();
const filteredRowModel = getFilteredRowModel();

// Stable empty array to prevent infinite re-renders
const EMPTY_TABLES_CONFIG: any[] = [];

interface MetadataTablesEditorProps {
  configIndex: number;
}

interface TableRow {
  tableName: string;
  totalFieldCount: number;
  includedFieldCount: number;
  entityType: string;
  isExcluded: boolean;
}

export function MetadataTablesEditor({
  configIndex,
}: MetadataTablesEditorProps) {
  const {
    data: parsedMetadata,
    isLoading,
    isError,
    error,
    fileExists,
  } = useParseMetadata(configIndex);

  const { control, setValue } = useFormContext<{ config: SingleConfig[] }>();
  const config = useWatch({
    control,
    name: `config.${configIndex}` as const,
  });

  const [selectedTableName, setSelectedTableName] = useState<string | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  // Get tables config, ensuring it exists - use stable reference to prevent infinite re-renders
  const tablesConfig =
    config?.type === "fmodata"
      ? (config.tables ?? EMPTY_TABLES_CONFIG)
      : EMPTY_TABLES_CONFIG;

  // Use a ref to store the latest config to avoid unstable callback dependencies
  const configRef = useRef(config);
  configRef.current = config;

  // Helper to toggle table exclusion - use ref to avoid dependency on config
  const toggleTableExclude = useCallback(
    (tableName: string, exclude: boolean) => {
      const currentConfig = configRef.current;
      if (currentConfig?.type !== "fmodata") return;

      const currentTables = currentConfig.tables ?? [];
      const tableIndex = currentTables.findIndex(
        (t) => t?.tableName === tableName,
      );

      if (exclude) {
        // Set exclude to true
        if (tableIndex >= 0) {
          // Update existing entry
          const newTables = [...currentTables];
          newTables[tableIndex] = { ...newTables[tableIndex]!, exclude: true };
          setValue(`config.${configIndex}.tables` as any, newTables, {
            shouldDirty: true,
          });
        } else {
          // Add new entry
          setValue(
            `config.${configIndex}.tables` as any,
            [...currentTables, { tableName, exclude: true }],
            { shouldDirty: true },
          );
        }
      } else {
        // Remove exclude (or remove entire entry if no other config)
        if (tableIndex >= 0) {
          const tableConfig = currentTables[tableIndex]!;
          const { exclude: _, ...rest } = tableConfig;

          if (Object.keys(rest).length === 1 && rest.tableName) {
            // Only tableName left, remove entire entry
            const newTables = currentTables.filter((_, i) => i !== tableIndex);
            setValue(
              `config.${configIndex}.tables` as any,
              newTables.length > 0 ? newTables : undefined,
              { shouldDirty: true },
            );
          } else {
            // Keep other properties
            const newTables = [...currentTables];
            newTables[tableIndex] = rest as any;
            setValue(`config.${configIndex}.tables` as any, newTables, {
              shouldDirty: true,
            });
          }
        }
      }
    },
    [configIndex, setValue],
  );

  // Helper to include all tables
  const includeAllTables = useCallback(() => {
    const currentConfig = configRef.current;
    if (currentConfig?.type !== "fmodata" || !parsedMetadata?.entitySets)
      return;

    const currentTables = currentConfig.tables ?? [];
    const allTableNames = Object.values(parsedMetadata.entitySets).map(
      (es) => es.Name,
    );

    // Remove exclude flags from all tables
    const newTables = currentTables
      .map((tableConfig) => {
        const tableName = tableConfig?.tableName;
        if (tableName && allTableNames.includes(tableName)) {
          const { exclude: _, ...rest } = tableConfig;
          // If only tableName is left, don't include it
          if (Object.keys(rest).length === 1 && rest.tableName) {
            return null;
          }
          return Object.keys(rest).length > 1 ? rest : null;
        }
        return tableConfig;
      })
      .filter((t) => t !== null) as any[];

    setValue(
      `config.${configIndex}.tables` as any,
      newTables.length > 0 ? newTables : undefined,
      { shouldDirty: true },
    );
  }, [configIndex, setValue, parsedMetadata]);

  // Helper to exclude all tables
  const excludeAllTables = useCallback(() => {
    const currentConfig = configRef.current;
    if (currentConfig?.type !== "fmodata" || !parsedMetadata?.entitySets)
      return;

    const currentTables = currentConfig.tables ?? [];
    const allTableNames = Object.values(parsedMetadata.entitySets).map(
      (es) => es.Name,
    );

    // Create a map of existing table configs
    const tableConfigMap = new Map(currentTables.map((t) => [t?.tableName, t]));

    // Update or add exclude flag for all tables
    const newTables = allTableNames.map((tableName) => {
      const existing = tableConfigMap.get(tableName);
      if (existing) {
        return { ...existing, exclude: true };
      }
      return { tableName, exclude: true };
    });

    setValue(`config.${configIndex}.tables` as any, newTables, {
      shouldDirty: true,
    });
  }, [configIndex, setValue, parsedMetadata]);

  // Prepare table data with field counts and include status
  const tableData = useMemo<TableRow[]>(() => {
    if (!parsedMetadata?.entitySets || !parsedMetadata?.entityTypes) {
      return [];
    }

    return Object.values(parsedMetadata.entitySets).map((entitySet) => {
      // Find the corresponding entity type to get field count
      const entityType = parsedMetadata.entityTypes[entitySet.EntityType];

      // Handle both Map and object formats for Properties
      let totalFieldCount = 0;
      let fieldNames: string[] = [];
      if (entityType?.Properties) {
        if (entityType.Properties instanceof Map) {
          totalFieldCount = entityType.Properties.size;
          fieldNames = Array.from(entityType.Properties.keys());
        } else if (typeof entityType.Properties === "object") {
          fieldNames = Object.keys(entityType.Properties);
          totalFieldCount = fieldNames.length;
        }
      }

      const tableConfig = Array.isArray(tablesConfig)
        ? tablesConfig.find((t) => t?.tableName === entitySet.Name)
        : undefined;
      const isExcluded = tableConfig?.exclude === true;

      // Count excluded fields
      const excludedFieldsSet = new Set<string>();
      if (tableConfig?.fields && Array.isArray(tableConfig.fields)) {
        for (const fieldConfig of tableConfig.fields) {
          if (fieldConfig?.exclude === true && fieldConfig.fieldName) {
            excludedFieldsSet.add(fieldConfig.fieldName);
          }
        }
      }

      const includedFieldCount = totalFieldCount - excludedFieldsSet.size;

      return {
        tableName: entitySet.Name,
        totalFieldCount,
        includedFieldCount,
        entityType: entitySet.EntityType,
        isExcluded,
      };
    });
  }, [parsedMetadata, tablesConfig]);

  // Check if all tables are included or excluded
  const allTablesIncluded = useMemo(() => {
    return tableData.length > 0 && tableData.every((row) => !row.isExcluded);
  }, [tableData]);

  const allTablesExcluded = useMemo(() => {
    return tableData.length > 0 && tableData.every((row) => row.isExcluded);
  }, [tableData]);

  // Define columns
  const columns = useMemo<ColumnDef<TableRow>[]>(
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
                    includeAllTables();
                  }}
                  disabled={allTablesIncluded}
                >
                  <span>Include All</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    excludeAllTables();
                  }}
                  disabled={allTablesExcluded}
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
                  toggleTableExclude(row.tableName, !checked);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "tableName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Table Occurrence Name" />
        ),
        enableSorting: true,
        cell: (info) => {
          const row = info.row.original;
          return (
            <span
              className={`font-medium ${
                row.isExcluded ? "text-muted-foreground line-through" : ""
              }`}
            >
              {info.getValue() as string}
            </span>
          );
        },
      },
      {
        accessorFn: (row) => row.includedFieldCount,
        id: "fieldCount",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Field Count" />
        ),
        enableSorting: true,
        cell: (info) => {
          const row = info.row.original;
          const hasExclusions = row.includedFieldCount !== row.totalFieldCount;
          return (
            <span className="text-muted-foreground">
              {hasExclusions
                ? `${row.includedFieldCount} / ${row.totalFieldCount}`
                : row.totalFieldCount}
            </span>
          );
        },
      },
    ],
    [
      toggleTableExclude,
      includeAllTables,
      excludeAllTables,
      allTablesIncluded,
      allTablesExcluded,
    ],
  );

  // Create table instance - use memoized model functions for stable references
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    globalFilterFn: "includesString",
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  // Handle row click to open dialog with fields
  const handleRowClick = (row: TableRow) => {
    setSelectedTableName(row.tableName);
    setIsDialogOpen(true);
  };

  if (fileExists === false) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">OData Tables</h3>
        <p className="text-sm text-muted-foreground">
          Metadata file does not exist. Download the metadata file first to see
          available tables.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">OData Tables</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Parsing metadata...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">OData Tables</h3>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Failed to parse metadata</div>
              {error instanceof Error && (
                <div className="text-xs mt-1 opacity-90">{error.message}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!parsedMetadata || tableData.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">OData Tables</h3>
        <p className="text-sm text-muted-foreground">
          {!parsedMetadata
            ? "No metadata available."
            : "No tables found in metadata."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">OData Tables</h3>
        <div className="space-y-2">
          <InputWrapper>
            <Search className="size-4" />
            <Input
              placeholder="Search tables..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </InputWrapper>
          <DataGrid
            table={table}
            recordCount={table.getFilteredRowModel().rows.length}
            isLoading={isLoading}
            emptyMessage="No tables found in metadata."
            onRowClick={handleRowClick}
          >
            <DataGridContainer>
              <DataGridTable />
            </DataGridContainer>
          </DataGrid>
        </div>
      </div>

      <MetadataFieldsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tableName={selectedTableName}
        parsedMetadata={parsedMetadata}
        configIndex={configIndex}
      />
    </>
  );
}
