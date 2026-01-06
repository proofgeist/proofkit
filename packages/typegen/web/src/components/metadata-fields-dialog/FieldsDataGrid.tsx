import { flexRender, type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { DataGrid, DataGridContainer } from "../ui/data-grid";
import type { FieldRow } from "./types";

interface FieldsDataGridProps {
  table: Table<FieldRow>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  open: boolean;
}

/**
 * Virtualized data grid for displaying field metadata
 */
export function FieldsDataGrid({ table, isLoading, isError, error, open }: FieldsDataGridProps) {
  // Ref for the scrollable container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Get filtered rows for virtualization
  const { rows } = table.getRowModel();

  // Setup virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 57, // Estimated row height in pixels
    overscan: 10, // Number of items to render outside of the visible area
  });

  // Recalculate virtualizer when dialog opens or rows change
  useEffect(() => {
    if (open && tableContainerRef.current && rows.length > 0) {
      // Small delay to ensure container is fully rendered
      const timeoutId = setTimeout(() => {
        rowVirtualizer.measure();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [open, rows.length, rowVirtualizer]);

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  let paddingTop = 0;
  if (virtualRows.length > 0) {
    paddingTop = virtualRows[0]?.start ?? 0;
  }
  let paddingBottom = 0;
  if (virtualRows.length > 0) {
    const lastRow = virtualRows.at(-1);
    paddingBottom = totalSize - (lastRow?.end ?? 0);
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="space-y-2 text-center">
          <div className="font-medium text-destructive">Failed to load fields</div>
          {error instanceof Error && <div className="text-muted-foreground text-sm">{error.message}</div>}
        </div>
      </div>
    );
  }

  return (
    <DataGrid
      emptyMessage="No fields found."
      isLoading={isLoading}
      recordCount={table.getFilteredRowModel().rows.length}
      table={table}
      tableLayout={{ width: "auto", headerSticky: true }}
    >
      <DataGridContainer border={true}>
        <div
          className="overflow-auto"
          ref={tableContainerRef}
          style={{
            contain: "strict",
            height: "650px",
            maxHeight: "650px",
          }}
        >
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      className="h-10 border-b px-4 text-left align-middle font-normal text-secondary-foreground/80"
                      key={header.id}
                      style={{
                        width: header.getSize(),
                      }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {(() => {
                if (isLoading) {
                  return (
                    <tr>
                      <td className="py-8 text-center" colSpan={table.getAllColumns().length}>
                        <div className="text-muted-foreground">Loading fields...</div>
                      </td>
                    </tr>
                  );
                }
                if (rows.length === 0) {
                  return (
                    <tr>
                      <td className="py-8 text-center" colSpan={table.getAllColumns().length}>
                        <div className="text-muted-foreground">No fields found.</div>
                      </td>
                    </tr>
                  );
                }
                if (virtualRows.length === 0 && rows.length > 0) {
                  // Fallback: if virtualizer hasn't initialized yet, show all rows
                  return rows.map((row) => (
                    <tr className="border-b hover:bg-muted/40" key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td className="px-4 py-3 align-middle" key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ));
                }
                return (
                  <>
                    {paddingTop > 0 && (
                      <tr>
                        <td colSpan={table.getAllColumns().length} style={{ height: `${paddingTop}px` }} />
                      </tr>
                    )}
                    {virtualRows.map((virtualRow) => {
                      const row = rows[virtualRow.index];
                      return (
                        <tr className="border-b hover:bg-muted/40" key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <td className="px-4 py-3 align-middle" key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {paddingBottom > 0 && (
                      <tr>
                        <td colSpan={table.getAllColumns().length} style={{ height: `${paddingBottom}px` }} />
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </DataGridContainer>
    </DataGrid>
  );
}
