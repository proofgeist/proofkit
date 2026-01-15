import { useFormContext } from "react-hook-form";
import type { SingleConfig } from "../../lib/config-utils";
import { InfoTooltip } from "../InfoTooltip";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface TableOptionsFormProps {
  configIndex: number;
  currentTableIndex: number;
  configType: string | undefined;
  open: boolean;
  topLevelIncludeAllFieldsByDefault: boolean | undefined;
}

/**
 * Form fields for table-level options like variableName, reduceMetadata, etc.
 */
export function TableOptionsForm({
  configIndex,
  currentTableIndex,
  configType,
  open,
  topLevelIncludeAllFieldsByDefault,
}: TableOptionsFormProps) {
  const { control, setValue, watch } = useFormContext<{ config: SingleConfig[] }>();

  // DEBUG: Log the current table config whenever it changes
  const currentTableConfig = watch(
    `config.${configIndex}.tables.${currentTableIndex >= 0 ? currentTableIndex : 0}` as const,
  );
  console.log("[TableOptionsForm] currentTableIndex:", currentTableIndex);
  console.log("[TableOptionsForm] currentTableConfig:", currentTableConfig);

  // Get the field names for the form fields
  const variableNameFieldName =
    `config.${configIndex}.tables.${currentTableIndex >= 0 ? currentTableIndex : 0}.variableName` as const;

  const reduceMetadataFieldName =
    `config.${configIndex}.tables.${currentTableIndex >= 0 ? currentTableIndex : 0}.reduceMetadata` as const;

  const alwaysOverrideFieldNamesFieldName =
    `config.${configIndex}.tables.${currentTableIndex >= 0 ? currentTableIndex : 0}.alwaysOverrideFieldNames` as const;

  const includeAllFieldsByDefaultFieldName =
    `config.${configIndex}.tables.${currentTableIndex >= 0 ? currentTableIndex : 0}.includeAllFieldsByDefault` as const;

  const isDisabled = currentTableIndex < 0 || configType !== "fmodata" || !open;

  return (
    <div className="shrink-0 border-border border-t pt-4">
      <div className="flex gap-4">
        <FormField
          control={control}
          disabled={isDisabled}
          name={variableNameFieldName}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="flex items-center gap-1">
                Variable/File Name Override
                <InfoTooltip label="The variable name to use for the generated schema for this table" />
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Leave empty to use default"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    field.onChange(value || undefined);
                  }}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Use watch() instead of FormField's field.value because useController doesn't sync undefined values properly */}
        {(() => {
          const watchedValue = watch(alwaysOverrideFieldNamesFieldName);
          const isDefault = watchedValue === undefined;
          let selectValue: string;
          if (watchedValue === undefined) {
            selectValue = "__default__";
          } else if (watchedValue === true) {
            selectValue = "true";
          } else {
            selectValue = "false";
          }
          return (
            <FormItem className="flex-1">
              <FormLabel>
                Always Update Field Names{" "}
                <InfoTooltip label="If true, the field names in your generated schema may be updated to match FileMaker; may cause TypeScript errors in your code. If you only use entity IDs in your OData requests, you can safely leave this off." />
              </FormLabel>
              <FormControl>
                <Select
                  disabled={isDisabled}
                  onValueChange={(val) => {
                    console.log("[TableOptionsForm] alwaysOverrideFieldNames changing to:", val);
                    const newValue = val === "__default__" ? undefined : val === "true";
                    setValue(alwaysOverrideFieldNamesFieldName, newValue, { shouldDirty: true });
                  }}
                  value={selectValue}
                >
                  <SelectTrigger className={isDefault ? "[&>span]:text-muted-foreground [&>span]:italic" : ""}>
                    <SelectValue placeholder="Select always update field names option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="text-muted-foreground italic" value="__default__">
                      Use Top-Level Setting
                    </SelectItem>
                    <SelectItem value="true">Always Update Field Names</SelectItem>
                    <SelectItem value="false">Don't Always Update Field Names</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        })()}
        {(() => {
          const watchedValue = watch(reduceMetadataFieldName);
          const isDefault = watchedValue === undefined;
          let selectValue: string;
          if (watchedValue === undefined) {
            selectValue = "__default__";
          } else if (watchedValue === true) {
            selectValue = "true";
          } else {
            selectValue = "false";
          }
          return (
            <FormItem className="flex-1">
              <FormLabel>
                Reduce Metadata Annotations{" "}
                <InfoTooltip label="Request reduced OData annotations to reduce payload size. This will prevent comments, entity ids, and other properties from being generated." />
              </FormLabel>
              <FormControl>
                <Select
                  disabled={isDisabled}
                  onValueChange={(val) => {
                    console.log("[TableOptionsForm] reduceMetadata changing to:", val);
                    const newValue = val === "__default__" ? undefined : val === "true";
                    setValue(reduceMetadataFieldName, newValue, { shouldDirty: true });
                  }}
                  value={selectValue}
                >
                  <SelectTrigger className={isDefault ? "[&>span]:text-muted-foreground [&>span]:italic" : ""}>
                    <SelectValue placeholder="Select reduce metadata option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="text-muted-foreground italic" value="__default__">
                      Use Top-Level Setting
                    </SelectItem>
                    <SelectItem value="true">Reduce Metadata</SelectItem>
                    <SelectItem value="false">Full Metadata</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        })()}
        {(() => {
          const watchedValue = watch(includeAllFieldsByDefaultFieldName);
          const isDefault = watchedValue === undefined;
          const effectiveValue = watchedValue ?? topLevelIncludeAllFieldsByDefault ?? true;
          let selectValue: string;
          if (watchedValue === undefined) {
            selectValue = "__default__";
          } else if (watchedValue === true) {
            selectValue = "true";
          } else {
            selectValue = "false";
          }
          return (
            <FormItem className="flex-1">
              <FormLabel>
                Include All Fields By Default{" "}
                <InfoTooltip label="If true, all fields from metadata will be included unless explicitly excluded. If false, only fields defined in the fields array will be included." />
              </FormLabel>
              <FormControl>
                <Select
                  disabled={isDisabled}
                  onValueChange={(val) => {
                    console.log("[TableOptionsForm] includeAllFieldsByDefault changing to:", val);
                    const newValue = val === "__default__" ? undefined : val === "true";
                    setValue(includeAllFieldsByDefaultFieldName, newValue, { shouldDirty: true });
                  }}
                  value={selectValue}
                >
                  <SelectTrigger className={isDefault ? "[&>span]:text-muted-foreground [&>span]:italic" : ""}>
                    <SelectValue placeholder="Select include all fields option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="text-muted-foreground italic" value="__default__">
                      Use Top-Level Setting
                      {isDefault && ` (${effectiveValue ? "Include All" : "Only Explicit"})`}
                    </SelectItem>
                    <SelectItem value="true">Include All Fields By Default</SelectItem>
                    <SelectItem value="false">Only Include Explicit Fields</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        })()}
      </div>
    </div>
  );
}
