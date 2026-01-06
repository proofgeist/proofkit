import { CircleMinus } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { SingleConfig } from "../lib/config-utils";
import { MetadataFieldsDialog } from "./MetadataFieldsDialog";
import { TableSelectorCompact } from "./TableSelectorCompact";
import { Button } from "./ui/button";

interface TableItemEditorProps {
  configIndex: number;
  tableIndex: number;
  onRemove: () => void;
}

export function TableItemEditor({ configIndex, tableIndex, onRemove }: TableItemEditorProps) {
  const { watch } = useFormContext<{ config: SingleConfig[] }>();
  const tableName = watch(`config.${configIndex}.tables.${tableIndex}.tableName`);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 border-b py-2 last:border-b-0">
        <div className="min-w-0 flex-1">
          <TableSelectorCompact
            configIndex={configIndex}
            path={`config.${configIndex}.tables.${tableIndex}.tableName` as const}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tableName && (
            <Button onClick={() => setIsDialogOpen(true)} size="sm" type="button" variant="outline">
              View Fields
            </Button>
          )}
          <Button appearance="ghost" onClick={onRemove} size="sm" type="button" variant="destructive">
            <CircleMinus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MetadataFieldsDialog
        configIndex={configIndex}
        onOpenChange={setIsDialogOpen}
        open={isDialogOpen}
        tableName={tableName}
      />
    </>
  );
}
