import type { ColumnDef } from "@tanstack/react-table";
import { Key } from "lucide-react";
import { DataGridColumnHeader } from "../ui/data-grid-column-header";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";
import { BooleanCell } from "./BooleanCell";
import type { FieldRow } from "./types";

interface CreateFieldsColumnsOptions {
  toggleFieldExclude: (fieldName: string, exclude: boolean) => void;
  setFieldTypeOverride: (fieldName: string, typeOverride: string | undefined) => void;
  includeAllFields: () => void;
  excludeAllFields: () => void;
  allFieldsIncluded: boolean;
  allFieldsExcluded: boolean;
}

/**
 * Creates column definitions for the fields data grid
 */
export function createFieldsColumns({
  toggleFieldExclude,
  setFieldTypeOverride,
  includeAllFields,
  excludeAllFields,
  allFieldsIncluded,
  allFieldsExcluded,
}: CreateFieldsColumnsOptions): ColumnDef<FieldRow>[] {
  return [
    {
      accessorKey: "isExcluded",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          customActions={
            <>
              <DropdownMenuItem
                disabled={allFieldsIncluded}
                onClick={(e) => {
                  e.stopPropagation();
                  includeAllFields();
                }}
              >
                <span>Include All</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={allFieldsExcluded}
                onClick={(e) => {
                  e.stopPropagation();
                  excludeAllFields();
                }}
              >
                <span>Exclude All</span>
              </DropdownMenuItem>
            </>
          }
          title="Include"
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
          <div className="flex w-fit items-center justify-center">
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
        skeleton: <Skeleton className="h-6 w-11" />,
      },
    },
    {
      accessorKey: "fieldName",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Field Name" />,
      enableSorting: true,
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center gap-2">
            {row.primaryKey && <Key className="size-4 text-muted-foreground" />}
            <span className={`font-medium ${row.isExcluded ? "text-muted-foreground/50 italic" : ""}`}>
              {info.getValue() as string}
            </span>
          </div>
        );
      },
      meta: {
        skeleton: <Skeleton className="h-5 w-32" />,
      },
    },
    {
      accessorKey: "fieldType",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
      enableSorting: true,
      cell: (info) => <span className="text-muted-foreground">{info.getValue() as string}</span>,
      meta: {
        skeleton: <Skeleton className="h-5 w-20" />,
      },
    },
    {
      id: "typeOverride",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Type Override" />,
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        return (
          <Select
            onValueChange={(value) => {
              setFieldTypeOverride(row.fieldName, value === "__default__" ? undefined : value);
            }}
            value={row.typeOverride || "__default__"}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">None</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="timestamp">Timestamp</SelectItem>
              <SelectItem value="container">Container</SelectItem>
              <SelectItem value="list">List</SelectItem>
            </SelectContent>
          </Select>
        );
      },
      meta: {
        skeleton: <Skeleton className="h-9 w-[140px]" />,
      },
    },
    {
      accessorKey: "nullable",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Nullable" />,
      enableSorting: true,
      cell: (info) => <BooleanCell value={info.getValue() as boolean | undefined} />,
      meta: {
        skeleton: <Skeleton className="h-6 w-6" />,
      },
    },
    {
      accessorKey: "global",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Global" />,
      enableSorting: true,
      cell: (info) => <BooleanCell value={info.getValue() as boolean | undefined} />,
      meta: {
        skeleton: <Skeleton className="h-6 w-6" />,
      },
    },
    {
      accessorKey: "readOnly",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Read Only" />,
      enableSorting: true,
      cell: (info) => <BooleanCell value={info.getValue() as boolean} />,
      meta: {
        skeleton: <Skeleton className="h-6 w-6" />,
      },
    },
  ];
}
