import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "./ui/button";
import { SingleConfig } from "../lib/config-utils";
import { LayoutItemEditor } from "./LayoutItemEditor";
import { Plus, AlertTriangle } from "lucide-react";
import { useTestConnection } from "../hooks/useTestConnection";

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
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div>
                <div className="font-medium">Connection test failed</div>
                {errorDetails?.message && (
                  <div className="text-xs mt-1 opacity-90">
                    {errorDetails.message}
                  </div>
                )}
                <div className="text-xs mt-1 opacity-75">
                  Fix the connection issue in the "Server Connection Settings"
                  dialog before adding layouts.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold">Layouts</h3>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No layouts configured. Click "Add Layout" to add one.
        </p>
      )}

      {fields.map((field, fieldIndex) => (
        <LayoutItemEditor
          key={field.id}
          configIndex={configIndex}
          layoutIndex={fieldIndex}
          onRemove={() => remove(fieldIndex)}
        />
      ))}

      <div className="flex items-center justify-end">
        <Button
          type="button"
          onClick={() =>
            append({
              layoutName: "",
              schemaName: "",
              valueLists: undefined,
              generateClient: undefined,
              strictNumbers: undefined,
            })
          }
        >
          <Plus /> Add Layout
        </Button>
      </div>
    </div>
  );
}
