import { useMemo, useState } from "react";
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
import { MetadataFieldsDialog } from "./MetadataFieldsDialog";

interface MetadataTablesEditorProps {
  configIndex: number;
}

interface TableRow {
  tableName: string;
  fieldCount: number;
  entityType: string;
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

  const [selectedTableName, setSelectedTableName] = useState<string | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  // Prepare table data with field counts
  const tableData = useMemo<TableRow[]>(() => {
    if (!parsedMetadata?.entitySets || !parsedMetadata?.entityTypes) {
      return [];
    }

    return Object.values(parsedMetadata.entitySets).map((entitySet) => {
      // Find the corresponding entity type to get field count
      const entityType = parsedMetadata.entityTypes[entitySet.EntityType];

      // Handle both Map and object formats for Properties
      let fieldCount = 0;
      if (entityType?.Properties) {
        if (entityType.Properties instanceof Map) {
          fieldCount = entityType.Properties.size;
        } else if (typeof entityType.Properties === "object") {
          fieldCount = Object.keys(entityType.Properties).length;
        }
      }

      return {
        tableName: entitySet.Name,
        fieldCount,
        entityType: entitySet.EntityType,
      };
    });
  }, [parsedMetadata]);

  // Define columns
  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => [
      {
        accessorKey: "tableName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Table Occurrence Name" />
        ),
        enableSorting: true,
        cell: (info) => (
          <span className="font-medium">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: "fieldCount",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Field Count" />
        ),
        enableSorting: true,
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() as number}
          </span>
        ),
      },
    ],
    [],
  );

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
      />
    </>
  );
}
