import { CircleMinus } from "lucide-react";
import { useFormContext } from "react-hook-form";
import type { SingleConfig } from "../lib/config-utils";
import { InfoTooltip } from "./InfoTooltip";
import { LayoutSelector } from "./LayoutSelector";
import { Button } from "./ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { SwitchField } from "./ui/switch-field";

interface LayoutItemEditorProps {
  configIndex: number;
  layoutIndex: number;
  onRemove: () => void;
}

export function LayoutItemEditor({ configIndex, layoutIndex, onRemove }: LayoutItemEditorProps) {
  const { control, watch } = useFormContext<{ config: SingleConfig[] }>();
  const schemaName = watch(`config.${configIndex}.layouts.${layoutIndex}.schemaName`);
  const layoutName = watch(`config.${configIndex}.layouts.${layoutIndex}.layoutName`);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-base">{schemaName || `Layout ${layoutIndex + 1}`}</h4>
          <div className="text-muted-foreground text-sm">
            {layoutName ? layoutName : <span className="italic">No layout selected</span>}
          </div>
        </div>
        <Button appearance="ghost" onClick={onRemove} type="button" variant="destructive">
          <CircleMinus className="h-4 w-4" />
          Remove Layout
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LayoutSelector
            configIndex={configIndex}
            path={`config.${configIndex}.layouts.${layoutIndex}.layoutName` as const}
          />

          <FormField
            control={control}
            name={`config.${configIndex}.layouts.${layoutIndex}.schemaName` as const}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Schema Name <InfoTooltip label="The name of the type or client in your codebase." />
                </FormLabel>
                <FormControl>
                  <Input placeholder="Schema name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={control}
            name={`config.${configIndex}.layouts.${layoutIndex}.valueLists` as const}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Value Lists{" "}
                  <InfoTooltip label="If set to 'strict', the value lists will be validated to ensure that the values are correct. If set to 'allowEmpty', the value lists will be validated to ensure that the values are correct, but empty value lists will be allowed. If set to 'ignore', the value lists will not be validated and typed as `string`." />
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(val) => field.onChange(val === "__default__" ? undefined : val)}
                    value={field.value ?? "__default__"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select value lists" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Default</SelectItem>
                      <SelectItem value="strict">Strict</SelectItem>
                      <SelectItem value="allowEmpty">Allow Empty</SelectItem>
                      <SelectItem value="ignore">Ignore</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`config.${configIndex}.layouts.${layoutIndex}.strictNumbers` as const}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <SwitchField
                    checked={field.value ?? false}
                    infoTooltip="If true, number fields will be typed as `number | null`. It's false by default because sometimes very large number will be returned as scientific notation via the Data API and therefore the type will be `number | string`."
                    label="Strict Numbers"
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`config.${configIndex}.layouts.${layoutIndex}.generateClient` as const}
            render={({ field }) => {
              const isDefault = field.value === undefined;
              return (
                <FormItem>
                  <FormLabel>Generate Client</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(val) => {
                        if (val === "__default__") {
                          field.onChange(undefined);
                        } else {
                          field.onChange(val === "true");
                        }
                      }}
                      value={(() => {
                        if (field.value === undefined) {
                          return "__default__";
                        }
                        return field.value === true ? "true" : "false";
                      })()}
                    >
                      <SelectTrigger className={isDefault ? "[&>span]:text-muted-foreground [&>span]:italic" : ""}>
                        <SelectValue placeholder="Select generate option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem className="text-muted-foreground italic" value="__default__">
                          Use Top-Level Setting
                        </SelectItem>
                        <SelectItem value="true">Generate Client</SelectItem>
                        <SelectItem value="false">Types Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
