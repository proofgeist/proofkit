import { useFormContext, useWatch } from "react-hook-form";
import { useState, useEffect, useId, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { MetadataTablesEditor } from "./MetadataTablesEditor";
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
  CheckCircleIcon,
} from "lucide-react";
import { useRunTypegen } from "../hooks/useRunTypegen";
import { useFileExists } from "../hooks/useFileExists";
import { client } from "../lib/api";

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
    trigger,
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
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { runTypegen, isRunning } = useRunTypegen();
  const queryClient = useQueryClient();

  // Watch the downloadMetadata field to check if auto-download is enabled
  const downloadMetadata = useWatch({
    control,
    name: `config.${index}.downloadMetadata` as const,
  });

  // Debounced metadata path for file existence check
  const metadataPath = useWatch({
    control,
    name: `config.${index}.metadataPath` as const,
  });
  const [debouncedMetadataPath, setDebouncedMetadataPath] = useState<
    string | undefined
  >(undefined);
  const metadataPathTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce the metadata path to prevent excessive API calls
  useEffect(() => {
    if (metadataPathTimerRef.current) {
      clearTimeout(metadataPathTimerRef.current);
    }

    metadataPathTimerRef.current = setTimeout(() => {
      setDebouncedMetadataPath(
        metadataPath && metadataPath.trim() !== "" ? metadataPath : undefined,
      );
    }, 300); // 300ms debounce

    return () => {
      if (metadataPathTimerRef.current) {
        clearTimeout(metadataPathTimerRef.current);
      }
    };
  }, [metadataPath]);

  // Check if the file exists (only for fmodata config type)
  const { data: fileExistsData } = useFileExists(
    configType === "fmodata" ? debouncedMetadataPath : undefined,
  );

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

  const handleDownloadMetadata = async () => {
    if (!currentConfig || currentConfig.type !== "fmodata") {
      return;
    }

    setIsDownloading(true);
    try {
      const res = await client.api["download-metadata"].$post({
        json: { config: currentConfig },
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorData.error || "Failed to download metadata");
      }

      // Refetch the file exists query to check if the download was successful
      await queryClient.refetchQueries({
        queryKey: ["fileExists", debouncedMetadataPath],
      });

      // Invalidate the parse-metadata query so it automatically reparses
      // Construct the configKey the same way useParseMetadata does
      const configKey = currentConfig
        ? JSON.stringify({
            type: currentConfig.type,
            metadataPath: currentConfig.metadataPath,
          })
        : "";
      queryClient.invalidateQueries({
        queryKey: ["parseMetadata", index, configKey],
      });
    } catch (err) {
      console.error("Failed to download metadata:", err);
      // You might want to show an error toast here
    } finally {
      setIsDownloading(false);
      setShowDownloadDialog(false);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If auto-download is enabled, skip the warning
    if (downloadMetadata) {
      handleDownloadMetadata();
    } else {
      // Show confirmation dialog
      setShowDownloadDialog(true);
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
                        topLabelTooltip="If true, the metadata will be re-downloaded each time typegen runs. Otherwise, it will only use the cached .xml file at the specified path."
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
                    rules={{
                      validate: (value) => {
                        if (!value || value.trim() === "") {
                          return true; // Allow empty, will be caught by required validation if needed
                        }
                        if (!value.toLowerCase().endsWith(".xml")) {
                          return "Metadata path must point to a file ending with .xml";
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Metadata Path{" "}
                          <InfoTooltip label="The path to the file where the downloaded metadata will be saved. Must be a .xml file." />
                        </FormLabel>
                        <FormControl>
                          <InputGroup>
                            <InputWrapper variant="md">
                              <Input
                                {...field}
                                onBlur={() => {
                                  field.onBlur();
                                  trigger(`config.${index}.metadataPath`);
                                }}
                              />
                              {fileExistsData?.exists === false &&
                                debouncedMetadataPath &&
                                debouncedMetadataPath.trim() !== "" && (
                                  <AlertTriangle className="!text-yellow-500" />
                                )}
                              {fileExistsData?.exists === true &&
                                debouncedMetadataPath &&
                                debouncedMetadataPath.trim() !== "" && (
                                  <CheckCircleIcon className="!text-green-500" />
                                )}
                            </InputWrapper>
                            <InputAddon
                              className="ml-2"
                              variant="md"
                              mode="icon"
                            >
                              <button
                                type="button"
                                onClick={handleDownloadClick}
                                disabled={isDownloading}
                                className="cursor-pointer hover:bg-muted/80 transition-colors w-full h-full flex items-center justify-center border-0 bg-transparent p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isDownloading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <DownloadIcon />
                                )}
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
        {configType === "fmodata" && (
          <MetadataTablesEditor configIndex={index} />
        )}
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

      {/* Download Metadata Confirmation Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Warning: Download Metadata
            </DialogTitle>
            <DialogDescription className="pt-2">
              Downloading metadata could crash the OData service on your server
              if the relationship graph is too large. Files with large
              relationship graphs containing many table occurrences using the
              same base tables are particularly at risk.
            </DialogDescription>
            <DialogDescription className="pt-2">
              We recommend creating a dedicated file with a simple graph and
              external file references to avoid this issue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDownloadDialog(false)}
              disabled={isDownloading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDownloadMetadata}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                "Download Metadata"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
