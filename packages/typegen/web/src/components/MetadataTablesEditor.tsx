import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "./ui/button";
import { SingleConfig } from "../lib/config-utils";
import { AlertTriangle, Loader2, Search, RefreshCw } from "lucide-react";
import { useListTables } from "../hooks/useListTables";
import { useTestConnection } from "../hooks/useTestConnection";
import { Switch } from "./ui/switch";
import { Input, InputWrapper } from "./ui/input";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { MetadataFieldsDialog } from "./MetadataFieldsDialog";
import { useTableMetadata } from "../hooks/useTableMetadata";
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
import { Skeleton } from "./ui/skeleton";

interface MetadataTablesEditorProps {
  configIndex: number;
}

interface TableRow {
  tableName: string;
  isIncluded: boolean;
  fieldCount?: number;
  includedFieldCount?: number;
}

// Memoize model functions outside component to ensure stable references
const coreRowModel = getCoreRowModel();
const sortedRowModel = getSortedRowModel();
const filteredRowModel = getFilteredRowModel();
const paginationRowModel = getPaginationRowModel();

// Helper component to fetch and display field count for a table
function FieldCountCell({
  tableName,
  isIncluded,
  configIndex,
}: {
  tableName: string;
  isIncluded: boolean;
  configIndex: number;
}) {
  const { control } = useFormContext<{ config: SingleConfig[] }>();
  const { data: parsedMetadata, isLoading } = useTableMetadata(
    configIndex,
    tableName,
    isIncluded, // Only fetch when table is included
  );

  // Watch the tables config directly to ensure reactivity
  const allTablesConfig = useWatch({
    control,
    name: `config.${configIndex}.tables` as const,
  });

  const tableConfig = Array.isArray(allTablesConfig)
    ? allTablesConfig.find((t) => t?.tableName === tableName)
    : undefined;
  const fieldsConfig = tableConfig?.fields ?? [];

  const fieldCount = useMemo(() => {
    if (!parsedMetadata?.entitySets || !parsedMetadata?.entityTypes) {
      return undefined;
    }

    const entitySet = Object.values(parsedMetadata.entitySets).find(
      (es) => es.Name === tableName,
    );
    if (!entitySet) return undefined;

    const entityType = parsedMetadata.entityTypes[entitySet.EntityType];
    if (!entityType?.Properties) return undefined;

    const properties = entityType.Properties;
    // Handle both Map and object formats
    if (properties instanceof Map) {
      return properties.size;
    } else if (typeof properties === "object") {
      return Object.keys(properties).length;
    }
    return undefined;
  }, [parsedMetadata, tableName]);

  const includedFieldCount = useMemo(() => {
    if (fieldCount === undefined) return undefined;

    // Count excluded fields
    const excludedFields = fieldsConfig.filter(
      (f) => f?.exclude === true,
    ).length;

    // Total fields minus excluded fields
    return fieldCount - excludedFields;
  }, [fieldCount, fieldsConfig]);

  if (isLoading) {
    return <Skeleton className="w-12 h-5" />;
  }

  if (fieldCount === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  // Show "included / total" if some fields are excluded, otherwise just total
  if (includedFieldCount !== undefined && includedFieldCount < fieldCount) {
    return (
      <span className="text-sm">
        {includedFieldCount} / {fieldCount}
      </span>
    );
  }

  return <span className="text-sm">{fieldCount}</span>;
}

export function MetadataTablesEditor({
  configIndex,
}: MetadataTablesEditorProps) {
  const { control, setValue } = useFormContext<{ config: SingleConfig[] }>();
  const config = useWatch({
    control,
    name: `config.${configIndex}` as const,
  });

  // Get tables config - memoize to prevent unnecessary recalculations
  const tablesConfig = useMemo(() => {
    if (config?.type === "fmodata" && "tables" in config) {
      return config.tables ?? [];
    }
    return [];
  }, [config]);

  // Local state to control whether to enable the query
  // Initialize based on whether there are tables in the config
  const [shouldLoadTables, setShouldLoadTables] = useState(() => {
    if (config?.type === "fmodata" && "tables" in config) {
      return (config.tables ?? []).length > 0;
    }
    return false;
  });

  // Update shouldLoadTables when tablesConfig changes (e.g., user adds tables manually)
  useEffect(() => {
    if (tablesConfig.length > 0 && !shouldLoadTables) {
      setShouldLoadTables(true);
    }
  }, [tablesConfig.length, shouldLoadTables]);

  // Check connection test status
  const { status: testStatus, errorDetails } = useTestConnection(configIndex);
  const hasConnectionError = testStatus === "error";

  const {
    tables,
    isLoading: isLoadingTables,
    isError: isErrorTables,
    error: errorTables,
    refetch: refetchTables,
  } = useListTables(configIndex, shouldLoadTables);

  const [selectedTableName, setSelectedTableName] = useState<string | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Use a ref to store the latest config to avoid unstable callback dependencies
  const configRef = useRef(config);
  configRef.current = config;

  // Helper to toggle table inclusion
  const toggleTableInclude = useCallback(
    (tableName: string, include: boolean) => {
      const currentConfig = configRef.current;
      if (currentConfig?.type !== "fmodata") return;

      const currentTables = currentConfig.tables ?? [];
      const tableIndex = currentTables.findIndex(
        (t) => t?.tableName === tableName,
      );

      if (include) {
        // Add table if not already present
        if (tableIndex < 0) {
          setValue(
            `config.${configIndex}.tables` as any,
            [...currentTables, { tableName }],
            { shouldDirty: true },
          );
        }
      } else {
        // Remove table if present
        if (tableIndex >= 0) {
          const tableConfig = currentTables[tableIndex]!;
          // If table has other config (like fields), we might want to keep it
          // But for now, if it's just tableName, remove it
          const { tableName: _, ...rest } = tableConfig;
          if (Object.keys(rest).length === 0) {
            // No other config, remove entirely
            const newTables = currentTables.filter((_, i) => i !== tableIndex);
            setValue(
              `config.${configIndex}.tables` as any,
              newTables.length > 0 ? newTables : undefined,
              { shouldDirty: true },
            );
          } else {
            // Has other config, but we're removing it anyway per user request
            const newTables = currentTables.filter((_, i) => i !== tableIndex);
            setValue(
              `config.${configIndex}.tables` as any,
              newTables.length > 0 ? newTables : undefined,
              { shouldDirty: true },
            );
          }
        }
      }
    },
    [configIndex, setValue],
  );

  // Convert tables to table rows (filtering will be handled by DataGrid)
  const tableRows = useMemo<TableRow[]>(() => {
    if (!tables) return [];
    return tables.map((tableName) => ({
      tableName,
      isIncluded: tablesConfig.some((t) => t?.tableName === tableName),
    }));
  }, [tables, tablesConfig]);

  // Define columns for tables table
  const tablesColumns = useMemo<ColumnDef<TableRow>[]>(
    () => [
      {
        accessorKey: "isIncluded",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Include" />
        ),
        enableSorting: true,
        size: 100,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center justify-center">
              <Switch
                checked={row.isIncluded}
                onCheckedChange={(checked) => {
                  toggleTableInclude(row.tableName, checked);
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
                !row.isIncluded ? "text-muted-foreground" : ""
              }`}
            >
              {info.getValue() as string}
            </span>
          );
        },
        meta: {
          skeleton: <Skeleton className="w-48 h-5" />,
        },
      },
      {
        id: "fieldCount",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Fields" />
        ),
        enableSorting: false,
        size: 100,
        cell: (info) => {
          const row = info.row.original;
          if (!row.isIncluded) {
            return null;
          }
          return (
            <FieldCountCell
              tableName={row.tableName}
              isIncluded={row.isIncluded}
              configIndex={configIndex}
            />
          );
        },
        meta: {
          skeleton: <Skeleton className="w-12 h-5" />,
        },
      },
      {
        id: "actions",
        header: () => null,
        enableSorting: false,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!row.isIncluded}
                onClick={() => {
                  setSelectedTableName(row.tableName);
                  setIsDialogOpen(true);
                }}
                className={!row.isIncluded ? "invisible" : ""}
              >
                Configure Fields
              </Button>
            </div>
          );
        },
        meta: {
          skeleton: <Skeleton className="w-32 h-9" />,
        },
      },
    ],
    [toggleTableInclude],
  );

  // Create tables table instance
  const tablesTable = useReactTable({
    data: tableRows,
    columns: tablesColumns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    getPaginationRowModel: paginationRowModel,
    globalFilterFn: "includesString",
    state: {
      globalFilter: searchFilter,
    },
    onGlobalFilterChange: setSearchFilter,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Show loading state only when actively loading
  if (isLoadingTables && shouldLoadTables) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">OData Tables</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading tables...</span>
        </div>
      </div>
    );
  }

  // Show error state only if we attempted to load
  if (isErrorTables && shouldLoadTables) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">OData Tables</h3>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Failed to load tables</div>
              {errorTables instanceof Error && (
                <div className="text-xs mt-1 opacity-90">
                  {errorTables.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show button to load tables if not yet loaded
  if (!shouldLoadTables) {
    // Show connection warning if there are connection errors
    if (hasConnectionError) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">OData Tables</h3>
          <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-2 text-sm text-yellow-700 dark:text-yellow-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div>
                  <div className="font-medium">Connection test failed</div>
                  {errorDetails?.message && (
                    <div className="text-xs mt-1 opacity-90">
                      {errorDetails.message}
                    </div>
                  )}
                  <div className="text-xs mt-1 opacity-75">
                    Fix the connection issue in the "Server Connection Settings"
                    dialog before loading tables.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show button to load tables if connection is good
    return (
      <div className="space-y-4 w-full mx-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">OData Tables</h3>
        </div>
        <div className="rounded-md border border-border bg-muted/50 p-4 w-full mx-auto text-center ">
          <p className="text-sm text-muted-foreground mb-4">
            Your connection looks good! Click the button below to pick the
            tables you want to generate types for.
          </p>
          <Button
            type="button"
            onClick={() => {
              setShouldLoadTables(true);
            }}
            disabled={isLoadingTables}
          >
            {isLoadingTables ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>Continue to Pick Tables</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state only after loading
  if (!tables || tables.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">OData Tables</h3>
        <p className="text-sm text-muted-foreground">
          No tables found in database.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">OData Tables</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchTables()}
            disabled={isLoadingTables}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingTables ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="space-y-2">
          <InputWrapper>
            <Search className="size-4" />
            <Input
              placeholder="Search tables..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </InputWrapper>

          <DataGrid
            table={tablesTable}
            recordCount={tablesTable.getFilteredRowModel().rows.length}
            isLoading={isLoadingTables}
            emptyMessage="No tables found."
            tableLayout={{ width: "auto" }}
          >
            <DataGridContainer className="overflow-hidden">
              <div className="overflow-x-auto">
                <DataGridTable />
              </div>
              <div className="border-t border-border px-5 min-h-14 flex items-center">
                <DataGridPagination className="py-0" />
              </div>
            </DataGridContainer>
          </DataGrid>
        </div>
      </div>

      <MetadataFieldsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tableName={selectedTableName}
        configIndex={configIndex}
      />
    </>
  );
}
