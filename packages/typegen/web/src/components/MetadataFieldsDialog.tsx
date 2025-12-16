import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "./ui/dialog";
import type { ParsedMetadataResponse } from "../hooks/useParseMetadata";

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
  calculation: boolean | undefined;
  global: boolean | undefined;
  readOnly: boolean;
}

interface MetadataFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string | null;
  parsedMetadata: ParsedMetadataResponse["parsedMetadata"] | undefined;
}

export function MetadataFieldsDialog({
  open,
  onOpenChange,
  tableName,
  parsedMetadata,
}: MetadataFieldsDialogProps) {
  const [globalFilter, setGlobalFilter] = useState("");

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

        fields.push({
          fieldName,
          fieldType: mapODataTypeToReadableLabel(metadata.$Type || ""),
          nullable: metadata.$Nullable,
          calculation: metadata["@Calculation"],
          global: metadata["@Global"],
          readOnly: isReadOnly,
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

        fields.push({
          fieldName,
          fieldType: mapODataTypeToReadableLabel(metadata.$Type || ""),
          nullable: metadata.$Nullable,
          calculation: metadata["@Calculation"],
          global: metadata["@Global"],
          readOnly: isReadOnly,
        });
      });
    }

    return fields;
  }, [tableName, parsedMetadata]);

  // Define columns for fields table
  const fieldsColumns = useMemo<ColumnDef<FieldRow>[]>(
    () => [
      {
        accessorKey: "fieldName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Field Name" />
        ),
        enableSorting: true,
        cell: (info) => (
          <span className="font-medium">{info.getValue() as string}</span>
        ),
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
      },
      {
        accessorKey: "calculation",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Calculation" />
        ),
        enableSorting: true,
        cell: (info) => (
          <BooleanCell value={info.getValue() as boolean | undefined} />
        ),
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
      },
      {
        accessorKey: "readOnly",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Read Only" />
        ),
        enableSorting: true,
        cell: (info) => <BooleanCell value={info.getValue() as boolean} />,
      },
    ],
    [],
  );

  // Create fields table instance
  const fieldsTable = useReactTable({
    data: fieldsData,
    columns: fieldsColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="default"
        className="max-w-6xl max-h-[90vh] w-full flex flex-col !top-[5vh] !translate-y-0"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Fields for {tableName || "Table"}</DialogTitle>
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
            <DataGrid
              table={fieldsTable}
              recordCount={fieldsTable.getFilteredRowModel().rows.length}
              isLoading={false}
              emptyMessage="No fields found."
              tableLayout={{ width: "auto" }}
            >
              <DataGridContainer>
                <DataGridTable />
              </DataGridContainer>
            </DataGrid>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
