import { getCoreRowModel, getFilteredRowModel, getSortedRowModel } from "@tanstack/react-table";

/**
 * Memoized model functions for react-table to ensure stable references
 */
export const coreRowModel = getCoreRowModel();
export const sortedRowModel = getSortedRowModel();
export const filteredRowModel = getFilteredRowModel();

/**
 * Maps OData types to readable field type labels
 * Based on the mappings in generateODataTypes.ts
 */
export function mapODataTypeToReadableLabel(edmType: string): string {
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
