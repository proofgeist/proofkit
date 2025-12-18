import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "./ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "./ui/form";
import { SingleConfig } from "../lib/config-utils";
import { TableSelectorCompact } from "./TableSelectorCompact";
import { CircleMinus } from "lucide-react";
import { MetadataFieldsDialog } from "./MetadataFieldsDialog";
import { useState } from "react";
import { useTableMetadata } from "../hooks/useTableMetadata";

interface TableItemEditorProps {
  configIndex: number;
  tableIndex: number;
  onRemove: () => void;
}

export function TableItemEditor({
  configIndex,
  tableIndex,
  onRemove,
}: TableItemEditorProps) {
  const { watch } = useFormContext<{ config: SingleConfig[] }>();
  const tableName = watch(
    `config.${configIndex}.tables.${tableIndex}.tableName`,
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch metadata when dialog is opened
  const { data: dialogTableMetadata } = useTableMetadata(
    configIndex,
    isDialogOpen ? tableName : null,
  );

  return (
    <>
      <div className="flex items-center gap-3 py-2 border-b last:border-b-0">
        <div className="flex-1 min-w-0">
          <TableSelectorCompact
            configIndex={configIndex}
            path={
              `config.${configIndex}.tables.${tableIndex}.tableName` as const
            }
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tableName && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              View Fields
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            appearance="ghost"
            size="sm"
            onClick={onRemove}
          >
            <CircleMinus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <MetadataFieldsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tableName={tableName}
        parsedMetadata={dialogTableMetadata}
        configIndex={configIndex}
      />
    </>
  );
}

