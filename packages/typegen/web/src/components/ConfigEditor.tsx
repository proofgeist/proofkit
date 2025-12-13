import { useFormContext, useWatch } from "react-hook-form";
import { useState, useEffect, useId } from "react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { SwitchField } from "./ui/switch-field";
import { Switch, SwitchIndicator, SwitchWrapper } from "./ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { EnvVarDialog } from "./EnvVarDialog";
import { SingleConfig } from "../lib/config-utils";
import { InfoTooltip } from "./InfoTooltip";
import { LayoutEditor } from "./LayoutEditor";

interface ConfigEditorProps {
  index: number;
}

export function ConfigEditor({ index }: ConfigEditorProps) {
  const {
    control,
    formState: { errors },
    setValue,
  } = useFormContext<{ config: SingleConfig[] }>();

  const configErrors = errors.config?.[index];
  const webviewerScriptName = useWatch({
    control,
    name: `config.${index}.webviewerScriptName` as const,
  });
  const [usingWebviewer, setUsingWebviewer] = useState(!!webviewerScriptName);

  useEffect(() => {
    setUsingWebviewer(!!webviewerScriptName);
  }, [webviewerScriptName]);

  const handleWebviewerToggle = (checked: boolean) => {
    setUsingWebviewer(checked);
    if (!checked) {
      setValue(`config.${index}.webviewerScriptName` as const, "");
    }
  };

  return (
    <div className="space-y-6">
      {configErrors?.root && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <strong>Error:</strong> {configErrors.root.message}
        </div>
      )}

      <div className="space-y-8">
        {/* General Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pr-1 pt-3 overflow-visible">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Config Settings</h3>
              <p className="text-sm text-muted-foreground">
                Settings apply to all layouts in this config.
              </p>
            </div>

            <EnvVarDialog index={index} />
          </div>
          <div className="space-y-4">
            {/* Path, Client Suffix, and Validator in one row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={control}
                name={`config.${index}.path`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Path{" "}
                      <InfoTooltip label="The path to the directory where the generated files will be saved." />
                    </FormLabel>

                    <FormControl>
                      <Input placeholder="schema" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`config.${index}.clientSuffix` as const}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Suffix</FormLabel>
                    <FormControl>
                      <Input placeholder="Layout" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`config.${index}.validator` as const}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validator</FormLabel>
                    <FormControl>
                      <Select
                        value={
                          field.value === false
                            ? "false"
                            : String(field.value || "")
                        }
                        onValueChange={(value) => {
                          field.onChange(value === "false" ? false : value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select validator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zod/v4">zod/v4</SelectItem>
                          <SelectItem value="zod/v3">zod/v3</SelectItem>
                          <SelectItem value="zod">zod</SelectItem>
                          <SelectItem value="false">false</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Toggles in one row with fields expanding below */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Generate Client */}
              <div className="space-y-4">
                <FormField
                  control={control}
                  name={`config.${index}.generateClient` as const}
                  render={({ field }) => {
                    const switchId = useId();
                    return (
                      <FormItem>
                        <FormLabel>Generate</FormLabel>
                        <FormControl>
                          <div className="flex w-full items-center">
                            <SwitchWrapper
                              permanent={true}
                              className="w-full inline-grid"
                            >
                              <Switch
                                id={switchId}
                                size="xl"
                                className="w-full rounded-md h-10"
                                thumbClassName="rounded-md"
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                              />
                              <SwitchIndicator
                                state="off"
                                className="w-1/2 text-accent-foreground peer-data-[state=checked]:text-primary"
                              >
                                Full Client
                              </SwitchIndicator>
                              <SwitchIndicator
                                state="on"
                                className="w-1/2 text-accent-foreground peer-data-[state=unchecked]:text-primary"
                              >
                                Types Only
                              </SwitchIndicator>
                            </SwitchWrapper>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              {/* Clear Old Files */}
              <div className="space-y-4">
                <FormField
                  control={control}
                  name={`config.${index}.clearOldFiles` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <SwitchField
                          label="Clear Old Files"
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          infoTooltip="Clear old files will clear the path before the new files are written. Only the `client` and `generated` directories are cleared to allow for potential overrides to be kept."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Using a Webviewer */}
              <div className="space-y-4">
                <SwitchField
                  label="Using a Webviewer?"
                  checked={usingWebviewer}
                  onCheckedChange={handleWebviewerToggle}
                />

                {usingWebviewer && (
                  <FormField
                    control={control}
                    name={`config.${index}.webviewerScriptName` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webviewer Script Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Layouts */}
        <LayoutEditor configIndex={index} />
      </div>
    </div>
  );
}
