import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Path, useFormContext, useWatch } from "react-hook-form";
import { useListTables } from "../hooks/useListTables";
import { useTableMetadata } from "../hooks/useTableMetadata";
import { useTestConnection } from "../hooks/useTestConnection";
import type { SingleConfig } from "../lib/config-utils";
import { MetadataFieldsDialog } from "./MetadataFieldsDialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DataGrid, DataGridContainer } from "./ui/data-grid";
import { DataGridColumnHeader } from "./ui/data-grid-column-header";
import { DataGridTable } from "./ui/data-grid-table";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import { Input, InputWrapper } from "./ui/input";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface FormValues {
  config: SingleConfig[];
}

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

  // Get the top-level includeAllFieldsByDefault value
  const topLevelIncludeAllFieldsByDefault = useWatch({
    control,
    name: `config.${configIndex}.includeAllFieldsByDefault` as const,
  });

  const tableConfig = Array.isArray(allTablesConfig)
    ? allTablesConfig.find((t) => t?.tableName === tableName)
    : undefined;
  const fieldsConfig = tableConfig?.fields ?? [];

  // Get the effective includeAllFieldsByDefault value (table-level override or top-level default)
  const effectiveIncludeAllFieldsByDefault =
    tableConfig?.includeAllFieldsByDefault ?? topLevelIncludeAllFieldsByDefault ?? true;

  const fieldCount = useMemo(() => {
    if (!(parsedMetadata?.entitySets && parsedMetadata?.entityTypes)) {
      return undefined;
    }

    const entitySet = Object.values(parsedMetadata.entitySets).find((es) => es.Name === tableName);
    if (!entitySet) {
      return undefined;
    }

    const entityType = parsedMetadata.entityTypes[entitySet.EntityType];
    if (!entityType?.Properties) {
      return undefined;
    }

    const properties = entityType.Properties;
    // Handle both Map and object formats
    if (properties instanceof Map) {
      return properties.size;
    }
    if (typeof properties === "object") {
      return Object.keys(properties).length;
    }
    return undefined;
  }, [parsedMetadata, tableName]);

  const includedFieldCount = useMemo(() => {
    if (fieldCount === undefined) {
      return undefined;
    }

    if (effectiveIncludeAllFieldsByDefault) {
      // If includeAllFieldsByDefault is true, count all fields minus explicitly excluded ones
      const excludedFields = fieldsConfig.filter((f) => f?.exclude === true).length;
      return fieldCount - excludedFields;
    }
    // If includeAllFieldsByDefault is false, only count fields explicitly in the array that are not excluded
    return fieldsConfig.filter((f) => f?.exclude !== true).length;
  }, [fieldCount, fieldsConfig, effectiveIncludeAllFieldsByDefault]);

  if (isLoading) {
    return <Skeleton className="h-5 w-12" />;
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

// Helper component to fetch and display relationship count for a table
function RelationshipCountCell({
  tableName,
  isIncluded,
  configIndex,
}: {
  tableName: string;
  isIncluded: boolean;
  configIndex: number;
}) {
  const { data: parsedMetadata, isLoading } = useTableMetadata(
    configIndex,
    tableName,
    isIncluded, // Only fetch when table is included
  );

  const relationships = useMemo(() => {
    if (!(parsedMetadata?.entitySets && parsedMetadata?.entityTypes)) {
      return [];
    }

    const entitySet = Object.values(parsedMetadata.entitySets).find((es) => es.Name === tableName);
    if (!entitySet) {
      return [];
    }

    const entityType = parsedMetadata.entityTypes[entitySet.EntityType];
    if (!entityType?.NavigationProperties) {
      return [];
    }

    const navProps = entityType.NavigationProperties;
    // Handle both Array and other formats
    if (Array.isArray(navProps)) {
      return navProps.map((np) => np.Name);
    }
    return [];
  }, [parsedMetadata, tableName]);

  if (isLoading) {
    return <Skeleton className="h-5 w-12" />;
  }

  if (!isIncluded) {
    return null;
  }

  const count = relationships.length;

  if (count === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const relationshipNames = relationships.join(", ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help text-sm">{count}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="mb-1 font-medium">Relationships:</div>
        <div className="text-xs">{relationshipNames}</div>
      </TooltipContent>
    </Tooltip>
  );
}

export function MetadataTablesEditor({ configIndex }: MetadataTablesEditorProps) {
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

  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Use a ref to store the latest config to avoid unstable callback dependencies
  const configRef = useRef(config);
  configRef.current = config;

  // Helper to toggle table inclusion
  const toggleTableInclude = useCallback(
    (tableName: string, include: boolean) => {
      const currentConfig = configRef.current;
      if (currentConfig?.type !== "fmodata") {
        return;
      }

      const currentTables = currentConfig.tables ?? [];
      const tableIndex = currentTables.findIndex((t) => t?.tableName === tableName);

      if (include) {
        // Add table if not already present
        if (tableIndex < 0) {
          setValue(`config.${configIndex}.tables` as Path<FormValues>, [...currentTables, { tableName }], {
            shouldDirty: true,
          });
        }
      } else if (tableIndex >= 0) {
        // Remove table if present
        const tableConfig = currentTables[tableIndex];
        if (!tableConfig) {
          return;
        }
        // If table has other config (like fields), we might want to keep it
        // But for now, if it's just tableName, remove it
        const { tableName: _, ...rest } = tableConfig;
        if (Object.keys(rest).length === 0) {
          // No other config, remove entirely
          const newTables = currentTables.filter((_, i) => i !== tableIndex);
          setValue(`config.${configIndex}.tables` as Path<FormValues>, newTables.length > 0 ? newTables : undefined, {
            shouldDirty: true,
          });
        } else {
          // Has other config, but we're removing it anyway per user request
          const newTables = currentTables.filter((_, i) => i !== tableIndex);
          setValue(`config.${configIndex}.tables` as Path<FormValues>, newTables.length > 0 ? newTables : undefined, {
            shouldDirty: true,
          });
        }
      }
    },
    [configIndex, setValue],
  );

  // Helper to include all tables
  const includeAllTables = useCallback(() => {
    if (!tables || tables.length === 0) {
      return;
    }
    const currentConfig = configRef.current;
    if (currentConfig?.type !== "fmodata") {
      return;
    }

    const currentTables = currentConfig.tables ?? [];
    const currentTableNames = new Set(currentTables.map((t) => t?.tableName).filter(Boolean));

    // Add all tables that aren't already included
    const tablesToAdd = tables.filter((tableName) => !currentTableNames.has(tableName));
    if (tablesToAdd.length > 0) {
      const newTables = [...currentTables, ...tablesToAdd.map((tableName) => ({ tableName }))];
      setValue(`config.${configIndex}.tables` as Path<FormValues>, newTables, {
        shouldDirty: true,
      });
    }
  }, [tables, configIndex, setValue]);

  // Helper to exclude all tables
  const excludeAllTables = useCallback(() => {
    const currentConfig = configRef.current;
    if (currentConfig?.type !== "fmodata") {
      return;
    }

    setValue(`config.${configIndex}.tables` as Path<FormValues>, undefined, {
      shouldDirty: true,
    });
  }, [configIndex, setValue]);

  // Calculate if all tables are included/excluded
  const allIncluded = useMemo(() => {
    if (!tables || tables.length === 0) {
      return false;
    }
    return tables.every((tableName) => tablesConfig.some((t) => t?.tableName === tableName));
  }, [tables, tablesConfig]);

  const allExcluded = useMemo(() => {
    if (!tables || tables.length === 0) {
      return true;
    }
    return tables.every((tableName) => !tablesConfig.some((t) => t?.tableName === tableName));
  }, [tables, tablesConfig]);

  // Convert tables to table rows (filtering will be handled by DataGrid)
  const tableRows = useMemo<TableRow[]>(() => {
    if (!tables) {
      return [];
    }
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
          <DataGridColumnHeader
            column={column}
            customActions={
              <>
                <DropdownMenuItem disabled={allIncluded || isLoadingTables} onClick={includeAllTables}>
                  Include All
                </DropdownMenuItem>
                <DropdownMenuItem disabled={allExcluded || isLoadingTables} onClick={excludeAllTables}>
                  Exclude All
                </DropdownMenuItem>
              </>
            }
            title="Include"
          />
        ),
        enableSorting: true,
        size: 45,
        minSize: 45,
        maxSize: 45,
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
          skeleton: <Skeleton className="h-6 w-11" />,
          cellClassName: "!w-[45px] !min-w-[45px] !max-w-[45px]",
        },
      },
      {
        accessorKey: "tableName",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Table Occurrence Name" />,
        enableSorting: true,
        // Use a large size relative to other columns so it takes most space
        // In fixed layout, space is distributed proportionally

        cell: (info) => {
          const row = info.row.original;
          return (
            <span className={`font-medium ${row.isIncluded ? "" : "text-muted-foreground italic"}`}>
              {info.getValue() as string}
            </span>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-5 w-48" />,
        },
      },
      {
        id: "fieldCount",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Fields" />,
        enableSorting: false,
        size: 50,
        minSize: 50,
        maxSize: 100,
        cell: (info) => {
          const row = info.row.original;
          if (!row.isIncluded) {
            return null;
          }
          return <FieldCountCell configIndex={configIndex} isIncluded={row.isIncluded} tableName={row.tableName} />;
        },
        meta: {
          skeleton: <Skeleton className="h-5 w-12" />,
        },
      },
      {
        id: "relationships",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Relationships" />,
        enableSorting: false,
        size: 50,
        minSize: 10,
        maxSize: 100,
        cell: (info) => {
          const row = info.row.original;
          if (!row.isIncluded) {
            return null;
          }
          return (
            <RelationshipCountCell configIndex={configIndex} isIncluded={row.isIncluded} tableName={row.tableName} />
          );
        },
        meta: {
          skeleton: <Skeleton className="h-5 w-12" />,
        },
      },
      {
        id: "actions",
        header: () => null,
        enableSorting: false,
        size: 1,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex justify-end">
              <Button
                className={row.isIncluded ? "" : "invisible"}
                disabled={!row.isIncluded}
                onClick={() => {
                  setSelectedTableName(row.tableName);
                  setIsDialogOpen(true);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Configure
              </Button>
            </div>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-8 w-[72px]" />,
          cellClassName: "!w-px",
          headerClassName: "!w-px",
        },
      },
    ],
    [toggleTableInclude, includeAllTables, excludeAllTables, allIncluded, allExcluded, isLoadingTables],
  );

  // Create tables table instance
  const tablesTable = useReactTable({
    data: tableRows,
    columns: tablesColumns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    globalFilterFn: "includesString",
    state: {
      globalFilter: searchFilter,
      columnPinning: {
        right: ["actions"],
      },
    },
    onGlobalFilterChange: setSearchFilter,
  });

  // Show loading state only when actively loading
  if (isLoadingTables && shouldLoadTables) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">OData Tables</h3>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading tables...</span>
        </div>
      </div>
    );
  }

  // Show error state only if we attempted to load
  if (isErrorTables && shouldLoadTables) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">OData Tables</h3>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Failed to load tables</div>
              {errorTables instanceof Error && <div className="mt-1 text-xs opacity-90">{errorTables.message}</div>}
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
          <h3 className="font-semibold text-lg">OData Tables</h3>
          <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-2 text-sm text-yellow-700 dark:text-yellow-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="flex-1">
                <div>
                  <div className="font-medium">Connection test failed</div>
                  {errorDetails?.message && <div className="mt-1 text-xs opacity-90">{errorDetails.message}</div>}
                  <div className="mt-1 text-xs opacity-75">
                    Fix the connection issue in the "Server Connection Settings" dialog before loading tables.
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
      <div className="mx-auto w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">OData Tables</h3>
        </div>
        <div className="mx-auto w-full rounded-md border border-border bg-muted/50 p-4 text-center">
          <p className="mb-4 text-muted-foreground text-sm">
            Your connection looks good! Click the button below to pick the tables you want to generate types for.
          </p>
          <Button
            disabled={isLoadingTables}
            onClick={() => {
              setShouldLoadTables(true);
            }}
            type="button"
          >
            {isLoadingTables ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
        <h3 className="font-semibold text-lg">OData Tables</h3>
        <p className="text-muted-foreground text-sm">No tables found in database.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-lg">
            OData Tables{" "}
            <Badge size="sm" variant="secondary">
              {tableRows.filter((t) => t.isIncluded).length} selected
            </Badge>
          </h3>
          <Button disabled={isLoadingTables} onClick={() => refetchTables()} size="sm" type="button" variant="outline">
            <RefreshCw className={`h-4 w-4 ${isLoadingTables ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="space-y-2">
          <InputWrapper>
            <Search className="size-4" />
            <Input
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search tables..."
              value={searchFilter}
            />
          </InputWrapper>

          <DataGrid
            emptyMessage="No tables found."
            isLoading={isLoadingTables}
            recordCount={tablesTable.getFilteredRowModel().rows.length}
            table={tablesTable}
            tableLayout={{
              width: "auto",
              headerSticky: true,
              dense: true,
              columnsPinnable: true,
            }}
          >
            <DataGridContainer>
              <ScrollArea className="max-h-[650px]">
                <DataGridTable />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </DataGridContainer>
          </DataGrid>
        </div>
      </div>

      <MetadataFieldsDialog
        configIndex={configIndex}
        onOpenChange={setIsDialogOpen}
        open={isDialogOpen}
        tableName={selectedTableName}
      />
    </>
  );
}
