import { AlertTriangle, Plus } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTestConnection } from "../hooks/useTestConnection";
import type { SingleConfig } from "../lib/config-utils";
import { LayoutItemEditor } from "./LayoutItemEditor";
import { Button } from "./ui/button";

interface LayoutEditorProps {
  configIndex: number;
}

export function LayoutEditor({ configIndex }: LayoutEditorProps) {
  const { control } = useFormContext<{ config: SingleConfig[] }>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `config.${configIndex}.layouts` as const,
  });

  // Check connection test status
  const { status: testStatus, errorDetails } = useTestConnection(configIndex);
  // Only show warning if connection test failed
  const showWarning = testStatus === "error";

  return (
    <div className="space-y-4">
      {showWarning && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-2 text-sm text-yellow-700 dark:text-yellow-400">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              <div>
                <div className="font-medium">Connection test failed</div>
                {errorDetails?.message && <div className="mt-1 text-xs opacity-90">{errorDetails.message}</div>}
                <div className="mt-1 text-xs opacity-75">
                  Fix the connection issue in the "Server Connection Settings" dialog before adding layouts.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 className="font-semibold text-lg">Layouts</h3>

      {fields.length === 0 && (
        <p className="text-muted-foreground text-sm">No layouts configured. Click "Add Layout" to add one.</p>
      )}

      {fields.map((field, fieldIndex) => (
        <LayoutItemEditor
          configIndex={configIndex}
          key={field.id}
          layoutIndex={fieldIndex}
          onRemove={() => remove(fieldIndex)}
        />
      ))}

      <div className="flex items-center justify-end">
        <Button
          onClick={() =>
            append({
              layoutName: "",
              schemaName: "",
              valueLists: undefined,
              generateClient: undefined,
              strictNumbers: undefined,
            })
          }
          type="button"
        >
          <Plus /> Add Layout
        </Button>
      </div>
    </div>
  );
}
