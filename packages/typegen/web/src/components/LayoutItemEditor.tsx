import { useFormContext } from "react-hook-form";
import { Button } from "./ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { SwitchField } from "./ui/switch-field";
import { SingleConfig } from "../lib/config-utils";
import { LayoutSelector } from "./LayoutSelector";
import { InfoTooltip } from "./InfoTooltip";
import { CircleMinus } from "lucide-react";

interface LayoutItemEditorProps {
  configIndex: number;
  layoutIndex: number;
  onRemove: () => void;
}

export function LayoutItemEditor({
  configIndex,
  layoutIndex,
  onRemove,
}: LayoutItemEditorProps) {
  const { control, watch } = useFormContext<{ config: SingleConfig[] }>();
  const schemaName = watch(
    `config.${configIndex}.layouts.${layoutIndex}.schemaName`,
  );
  const layoutName = watch(
    `config.${configIndex}.layouts.${layoutIndex}.layoutName`,
  );

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-medium">
            {schemaName || `Layout ${layoutIndex + 1}`}
          </h4>
          <div className="text-sm text-muted-foreground">
            {layoutName ? (
              layoutName
            ) : (
              <span className="italic">No layout selected</span>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          appearance="ghost"
          onClick={onRemove}
        >
          <CircleMinus className="w-4 h-4" />
          Remove Layout
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LayoutSelector
            configIndex={configIndex}
            path={
              `config.${configIndex}.layouts.${layoutIndex}.layoutName` as const
            }
          />

          <FormField
            control={control}
            name={
              `config.${configIndex}.layouts.${layoutIndex}.schemaName` as const
            }
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Schema Name{" "}
                  <InfoTooltip label="The name of the type or client in your codebase." />
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
            name={
              `config.${configIndex}.layouts.${layoutIndex}.valueLists` as const
            }
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value Lists</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ?? "__default__"}
                    onValueChange={(val) =>
                      field.onChange(val === "__default__" ? undefined : val)
                    }
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
            name={
              `config.${configIndex}.layouts.${layoutIndex}.strictNumbers` as const
            }
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <SwitchField
                    label="Strict Numbers"
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={
              `config.${configIndex}.layouts.${layoutIndex}.generateClient` as const
            }
            render={({ field }) => {
              const isDefault = field.value === undefined;
              return (
                <FormItem>
                  <FormLabel>Generate</FormLabel>
                  <FormControl>
                    <Select
                      value={
                        field.value === undefined
                          ? "__default__"
                          : field.value === true
                            ? "true"
                            : "false"
                      }
                      onValueChange={(val) => {
                        if (val === "__default__") {
                          field.onChange(undefined);
                        } else {
                          field.onChange(val === "true");
                        }
                      }}
                    >
                      <SelectTrigger
                        className={
                          isDefault
                            ? "[&>span]:italic [&>span]:text-muted-foreground"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Select generate option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="__default__"
                          className="italic text-muted-foreground"
                        >
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
