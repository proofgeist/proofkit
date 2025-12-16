import { useFormContext, useWatch } from "react-hook-form";
import { useState, useEffect, useId } from "react";
import { Input, InputWrapper, InputGroup, InputAddon } from "./ui/input";
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
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  PlayIcon,
  Trash2,
  Loader2,
  DownloadIcon,
  AlertTriangle,
} from "lucide-react";
import { useRunTypegen } from "../hooks/useRunTypegen";

interface ConfigEditorProps {
  index: number;
  onRemove: () => void;
}

export function ConfigEditor({ index, onRemove }: ConfigEditorProps) {
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<{ config: SingleConfig[] }>();

  const hasMultipleConfigs = watch("config").length > 1;

  const baseId = useId();
  const generateClientSwitchId = `${baseId}-generate-client`;
  const configType = watch(`config.${index}.type` as const);
  const generateClient = useWatch({
    control,
    name: `config.${index}.generateClient` as const,
  });

  const configErrors = errors.config?.[index];
  const webviewerScriptName = useWatch({
    control,
    name: `config.${index}.webviewerScriptName` as const,
  });
  const [usingWebviewer, setUsingWebviewer] = useState(!!webviewerScriptName);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const { runTypegen, isRunning } = useRunTypegen();

  // Get the current config value
  const currentConfig = watch(`config.${index}` as const);

  useEffect(() => {
    setUsingWebviewer(!!webviewerScriptName);
  }, [webviewerScriptName]);

  const handleWebviewerToggle = (checked: boolean) => {
    setUsingWebviewer(checked);
    if (!checked) {
      setValue(`config.${index}.webviewerScriptName` as const, "");
    }
  };

  const handleRunTypegen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await runTypegen(currentConfig);
    } catch (err) {
      console.error("Failed to run typegen:", err);
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
              <h3 className="text-lg font-semibold">General Settings</h3>
            </div>

            <div className="flex items-center gap-2">
              <EnvVarDialog index={index} />
              {hasMultipleConfigs && (
                <Button
                  variant="success"
                  appearance="ghost"
                  size="sm"
                  onClick={handleRunTypegen}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                appearance="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowRemoveDialog(true);
                }}
                className="gap-2"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {/* First row: Display Name, Output Path, Clear Old Files */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={control}
                name={`config.${index}.configName`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Display Name{" "}
                      <InfoTooltip label="The name of this connection displayed in this UI only" />
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
                name={`config.${index}.path`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Output Path{" "}
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

            {/* Second row: Generate Client, Client Suffix, and Validator */}
            {configType === "fmdapi" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={control}
                  name={`config.${index}.generateClient` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Generate</FormLabel>
                      <FormControl>
                        <div className="flex w-full items-center">
                          <SwitchWrapper
                            permanent={true}
                            className="w-full inline-grid"
                          >
                            <Switch
                              id={generateClientSwitchId}
                              size="xl"
                              className="w-full rounded-md h-9"
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
                  )}
                />

                {generateClient && (
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
                )}

                {generateClient && (
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
                )}
              </div>
            )}

            {configType === "fmodata" && (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <FormField
                    control={control}
                    name={`config.${index}.downloadMetadata` as const}
                    render={({ field }) => (
                      <SwitchField
                        topLabel="Auto-Download Metadata"
                        label="I confirm the relationship graph is small enough"
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        infoTooltip="Files that have large relationship graphs with many table occurrences using the same base tables can cause the OData service to crash when downloading the metadata. We suggest creating a dedicated file with a simple graph and external file references to avoid this issue."
                      />
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <FormField
                    control={control}
                    name={`config.${index}.metadataPath` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Metadata Path{" "}
                          <InfoTooltip label="The path to the directory where the downloaded metadata will be saved." />
                        </FormLabel>
                        <FormControl>
                          <InputGroup>
                            <InputWrapper variant="md">
                              <Input {...field} />
                              <AlertTriangle className="!text-yellow-500" />
                            </InputWrapper>
                            <InputAddon
                              className="ml-2"
                              variant="md"
                              mode="icon"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // TODO: Add download functionality
                                }}
                                className="cursor-pointer hover:bg-muted/80 transition-colors w-full h-full flex items-center justify-center border-0 bg-transparent p-0"
                              >
                                <DownloadIcon />
                              </button>
                            </InputAddon>
                          </InputGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Final row: Using a Webviewer switch with script name inline */}
            {configType === "fmdapi" && (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <SwitchField
                    label="Generate Webviewer Client"
                    topLabel="Webviewer Options"
                    checked={usingWebviewer}
                    onCheckedChange={handleWebviewerToggle}
                  />
                </div>
                {usingWebviewer && (
                  <div className="flex-1 min-w-0">
                    <FormField
                      control={control}
                      name={`config.${index}.webviewerScriptName` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Webviewer Script Name{" "}
                            <InfoTooltip label="The name of the webviewer script that uses the @proofkit/webviewer pattern and passes the input to the Execute Data API script step." />
                          </FormLabel>
                          <FormControl>
                            <Input required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {configType === "fmdapi" && <LayoutEditor configIndex={index} />}
        {configType === "fmodata" && <div>Odata tables</div>}
      </div>

      {/* Remove Config Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Config</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this config? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onRemove();
                setShowRemoveDialog(false);
              }}
            >
              Remove Config
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
