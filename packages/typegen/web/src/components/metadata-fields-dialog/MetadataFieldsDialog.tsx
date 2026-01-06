import { useReactTable } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTableMetadata } from "../../hooks/useTableMetadata";
import type { SingleConfig } from "../../lib/config-utils";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input, InputWrapper } from "../ui/input";
import { FieldsDataGrid } from "./FieldsDataGrid";
import { createFieldsColumns } from "./fieldsColumns";
import { TableOptionsForm } from "./TableOptionsForm";
import type { MetadataFieldsDialogProps, TableConfig } from "./types";
import { useFieldsConfig } from "./useFieldsConfig";
import { useFieldsData } from "./useFieldsData";
import { coreRowModel, filteredRowModel, sortedRowModel } from "./utils";

export function MetadataFieldsDialog({ open, onOpenChange, tableName, configIndex }: MetadataFieldsDialogProps) {
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

  const { setValue } = useFormContext<{ config: SingleConfig[] }>();
  const [globalFilter, setGlobalFilter] = useState("");

  // Reset search filter when dialog opens or table changes
  useEffect(() => {
    if (open) {
      setGlobalFilter("");
    }
  }, [open, tableName]);

  // Initial empty fieldsData for useFieldsConfig (will be populated after we have metadata)
  const emptyFieldsData: never[] = [];

  // Get field configuration state - first call to get config values needed for other hooks
  const {
    tableIndex,
    fieldsConfig,
    configType,
    topLevelIncludeAllFieldsByDefault,
    effectiveIncludeAllFieldsByDefault,
    allTablesConfig,
  } = useFieldsConfig({
    configIndex,
    tableName,
    fieldsData: emptyFieldsData,
  });

  // Ensure table exists in config when dialog opens (if table is included)
  // This ensures we have a stable index for useController
  useEffect(() => {
    if (!(open && tableName) || configType !== "fmodata") {
      return;
    }
    if (tableIndex < 0) {
      // Table doesn't exist yet, but we need it to exist for the form fields
      // Only create it if we're actually configuring it (it should be included)
      const currentTables = (Array.isArray(allTablesConfig) ? allTablesConfig : []) as TableConfig[];
      setValue(
        `config.${configIndex}.tables`,
        [...currentTables, { tableName }],
        { shouldDirty: false }, // Don't mark as dirty since this is just initialization
      );
    }
  }, [open, tableName, tableIndex, configType, configIndex, allTablesConfig, setValue]);

  // Transform metadata into field rows
  const fieldsData = useFieldsData({
    tableName,
    parsedMetadata,
    fieldsConfig,
    effectiveIncludeAllFieldsByDefault,
  });

  // Get field manipulation callbacks with actual fieldsData
  const {
    currentTableIndex,
    toggleFieldExclude,
    setFieldTypeOverride,
    includeAllFields,
    excludeAllFields,
    allFieldsIncluded,
    allFieldsExcluded,
  } = useFieldsConfig({
    configIndex,
    tableName,
    fieldsData,
  });

  // Create column definitions
  const fieldsColumns = useMemo(
    () =>
      createFieldsColumns({
        toggleFieldExclude,
        setFieldTypeOverride,
        includeAllFields,
        excludeAllFields,
        allFieldsIncluded,
        allFieldsExcluded,
      }),
    [
      toggleFieldExclude,
      setFieldTypeOverride,
      includeAllFields,
      excludeAllFields,
      allFieldsIncluded,
      allFieldsExcluded,
    ],
  );

  // Create fields table instance
  const fieldsTable = useReactTable({
    data: fieldsData,
    columns: fieldsColumns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    globalFilterFn: "includesString",
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  // Calculate the number of included (non-excluded) fields
  const selectedFieldsCount = useMemo(() => {
    return fieldsData.filter((row) => !row.isExcluded).length;
  }, [fieldsData]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="!top-[5vh] !translate-y-0 flex max-h-[90vh] w-full max-w-6xl flex-col"
        variant="default"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Including {selectedFieldsCount} of {fieldsData.length} fields for {tableName || "Table"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-auto">
          <div className="mb-2 flex-shrink-0 space-y-2">
            <InputWrapper>
              <Search className="size-4" />
              <Input
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search fields..."
                value={globalFilter}
              />
            </InputWrapper>
          </div>
          <div className="min-h-0 flex-1">
            <FieldsDataGrid error={error} isError={isError} isLoading={isLoading} open={open} table={fieldsTable} />
          </div>
          <TableOptionsForm
            configIndex={configIndex}
            configType={configType}
            currentTableIndex={currentTableIndex}
            open={open}
            topLevelIncludeAllFieldsByDefault={topLevelIncludeAllFieldsByDefault}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
