import { useMutation } from "@tanstack/react-query";
import { Loader2, PlayIcon, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ConfigEditor } from "./components/ConfigEditor";
import { ConfigSummary } from "./components/ConfigSummary";
import { ConnectionWarning } from "./components/ConnectionWarning";
import { EmptyState } from "./components/EmptyState";
import { InfoTooltip } from "./components/InfoTooltip";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./components/ui/form";
import { Input } from "./components/ui/input";
import { useConfig } from "./hooks/useConfig";
import { useHealthCheck } from "./hooks/useHealthCheck";
import { client } from "./lib/api";
import type { SingleConfig } from "./lib/config-utils";

// Post-generate command presets
const COMMAND_PRESETS = [
  { label: "Biome", command: "npx @biomejs/biome format --write ." },
  { label: "Prettier", command: "npx prettier --write ." },
  { label: "ESLint", command: "npx eslint --fix ." },
] as const;

// Normalize config to always be an array
function normalizeConfig(config: SingleConfig | SingleConfig[] | null): SingleConfig[] {
  if (Array.isArray(config)) {
    return config;
  }
  if (config && typeof config === "object") {
    return [config];
  }
  return [];
}

// Create config objects for each type
function createFmdapiConfig(): SingleConfig {
  return {
    type: "fmdapi",
    envNames: {
      server: undefined,
      db: undefined,
      auth: undefined,
    },
    layouts: [],
  };
}

function createFmodataConfig(): SingleConfig {
  return {
    type: "fmodata",
    envNames: {
      server: undefined,
      db: undefined,
      auth: undefined,
    },
    tables: [],
    alwaysOverrideFieldNames: true,
    includeAllFieldsByDefault: true,
  };
}

function App() {
  // Health check to detect if server is down
  const { isHealthy } = useHealthCheck({
    enabled: true,
  });

  // Load and save config using custom hook
  const { configDataResponse, isError, error, refetch, saveMutation, isLoading, isRetrying } = useConfig();

  // Track active accordion item to preserve state
  const [activeAccordionItem, setActiveAccordionItem] = useState<number>(0);

  // Use React Hook Form to manage the configs array and postGenerateCommand
  interface FormData {
    config: SingleConfig[];
    postGenerateCommand?: string;
  }
  const form = useForm<FormData>({});

  useEffect(() => {
    console.log("configData from useEffect", configDataResponse);
    if (configDataResponse) {
      const configData = configDataResponse?.config;
      const serverConfigs = normalizeConfig(configData);
      form.reset({
        config: serverConfigs,
        postGenerateCommand: configDataResponse.exists ? configDataResponse.postGenerateCommand : undefined,
      });
    }
  }, [configDataResponse]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "config",
  });

  // Get configs from form values for data access
  const configs = form.watch("config");

  // Extract exists and path from configDataResponse
  const configExists = configDataResponse?.exists ?? false;
  const configPath = configDataResponse?.path;
  const fullPath = configDataResponse?.fullPath;

  // Determine empty state conditions
  const isFileMissing = !configExists;
  const isEmptyConfig = configExists && configs.length === 0;
  const showEmptyState = isFileMissing || isEmptyConfig;

  // Unified handler for creating configs (works for both file creation and adding)
  const handleAddConfig = async (type: "fmdapi" | "fmodata") => {
    const newConfig = type === "fmdapi" ? createFmdapiConfig() : createFmodataConfig();

    // If file doesn't exist, create it with the new config
    if (isFileMissing) {
      try {
        const postGenerateCommand = form.getValues("postGenerateCommand");
        await saveMutation.mutateAsync({ configsToSave: [newConfig], postGenerateCommand });
        await refetch();
        setTimeout(() => {
          setActiveAccordionItem(0);
        }, 100);
      } catch (err) {
        const apiType = type === "fmdapi" ? "Data API" : "OData";
        console.error(`Failed to create config file with ${apiType}:`, err);
      }
    } else {
      // File exists, just append to form
      append(newConfig);
      setTimeout(() => {
        setActiveAccordionItem(fields.length);
      }, 1);
    }
  };

  // Run typegen mutation
  const runTypegenMutation = useMutation({
    mutationFn: async () => {
      const postGenerateCommand = form.getValues("postGenerateCommand");
      await client.api.run.$post({
        json: { config: configs, postGenerateCommand },
      });
    },
  });

  const handleSaveAll = form.handleSubmit(async (_data) => {
    // IMPORTANT: Use form.getValues() instead of the `data` parameter passed to handleSubmit.
    // react-hook-form's handleSubmit callback receives stale data for dynamically added nested
    // fields (like table-level options set via setValue in child components).
    // form.getValues() returns the current live form state with all updates.
    const currentConfigs = form.getValues("config");
    const currentPostGenerateCommand = form.getValues("postGenerateCommand");
    console.log(
      "[App.handleSaveAll] Form data being submitted:",
      JSON.stringify({ config: currentConfigs, postGenerateCommand: currentPostGenerateCommand }, null, 2),
    );
    console.log("[App.handleSaveAll] Form dirty fields:", form.formState.dirtyFields);
    try {
      await saveMutation.mutateAsync({
        configsToSave: currentConfigs,
        postGenerateCommand: currentPostGenerateCommand,
      });
      // Reset the form with the current form state to clear dirty state
      // The accordion state is preserved because it's controlled and the component doesn't unmount
      console.log(
        "[App.handleSaveAll] After save, form values:",
        JSON.stringify({ config: currentConfigs, postGenerateCommand: currentPostGenerateCommand }, null, 2),
      );
      form.reset({ config: currentConfigs, postGenerateCommand: currentPostGenerateCommand });
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to save configs:", err);
    }
  });

  const handleRunTypegen = async () => {
    try {
      // First save the config if there are changes
      if (form.formState.isDirty) {
        await handleSaveAll();
      }
      // Then run typegen
      await runTypegenMutation.mutateAsync();
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to run typegen:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative mx-auto max-w-7xl px-4 py-8">
        {/* Connection Warning Overlay - Shows when server is unreachable */}
        {/* Only show if we've lost connection (not during initial load or retries) */}
        {!(isHealthy || isLoading || isRetrying) && <ConnectionWarning onRefresh={() => refetch()} />}

        {/* Loading Overlay - Preserves form state underneath */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-muted-foreground">
              {isRetrying ? "Waiting for API server..." : "Loading config..."}
            </div>
          </div>
        )}

        {/* Error Overlay - Preserves form state underneath */}
        {isError && !isRetrying && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6">
              <h2 className="mb-2 font-semibold text-2xl text-destructive">Error</h2>
              <p className="mb-4 text-destructive/90">
                {error instanceof Error ? error.message : "Failed to load config"}
              </p>
              <button
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={() => refetch()}
                type="button"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content - Always rendered to preserve state */}
        <header>
          <div className="mb-4 flex justify-between gap-2">
            <div className="flex items-center gap-3">
              {/** biome-ignore lint/performance/noImgElement: just a logo */}
              {/** biome-ignore lint/correctness/useImageSize: just a logo */}
              <img alt="ProofKit" className="h-12" src="/proofkit-horiz.png" />
              <h1 className="flex items-baseline gap-2 font-bold text-3xl">
                <div>
                  <span className="text-blue-600 dark:text-blue-400">type</span>
                  <span>gen</span>
                </div>
                <span className="caption-bottom rounded-md bg-muted px-2 py-1 text-[1.25rem]">UI</span>
              </h1>
            </div>

            {!isFileMissing && (
              <div className="flex gap-2">
                <Button
                  disabled={runTypegenMutation.isPending || saveMutation.isPending}
                  onClick={handleRunTypegen}
                  variant="secondary"
                >
                  {runTypegenMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                  {runTypegenMutation.isPending ? "Running..." : "Run Typegen"}
                </Button>
                <Button
                  disabled={saveMutation.isPending || runTypegenMutation.isPending || !form.formState.isDirty}
                  onClick={handleSaveAll}
                  variant={form.formState.isDirty ? "primary" : "outline"}
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {(() => {
                    if (saveMutation.isPending) {
                      return "Saving...";
                    }
                    if (form.formState.isDirty) {
                      return "Save";
                    }
                    return "Saved";
                  })()}
                </Button>
              </div>
            )}
          </div>
        </header>

        <Form {...form}>
          <form onSubmit={handleSaveAll}>
            {!isLoading && showEmptyState ? (
              <div className="mx-auto w-full lg:w-[75%]">
                <EmptyState
                  configPath={isFileMissing ? fullPath || configPath : configPath}
                  onAddFmdapi={isFileMissing || isEmptyConfig ? () => handleAddConfig("fmdapi") : undefined}
                  onAddFmodata={isFileMissing || isEmptyConfig ? () => handleAddConfig("fmodata") : undefined}
                  variant={isFileMissing ? "file-missing" : "empty-config"}
                />
              </div>
            ) : (
              <>
                {/* Global Settings Section */}
                {!isFileMissing && (
                  <div className="mx-auto mb-6 w-full rounded-lg border bg-card p-6 lg:w-[75%]">
                    <h3 className="mb-4 font-semibold text-lg">Global Settings</h3>
                    <FormField
                      control={form.control}
                      name="postGenerateCommand"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>
                              Post-Generate Command{" "}
                              <InfoTooltip label="Optional CLI command to run after files are generated. Commonly used for formatting. Example: 'pnpm biome format --write .' or 'npx prettier --write src/'" />
                            </FormLabel>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button className="h-8" size="sm" variant="outline">
                                  Presets
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {COMMAND_PRESETS.map((preset) => (
                                  <DropdownMenuItem key={preset.label} onSelect={() => field.onChange(preset.command)}>
                                    {preset.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <FormControl>
                            <Input
                              placeholder="e.g., pnpm biome format --write ."
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <Accordion
                  className="mx-auto w-full lg:w-[75%]"
                  collapsible
                  onValueChange={(value) => setActiveAccordionItem(Number(value))}
                  type="single"
                  value={activeAccordionItem.toString()}
                  variant="outline"
                >
                  {fields.map((field, index) => {
                    const config = configs[index];
                    return (
                      <AccordionItem className="bg-card" key={field.id} value={index.toString()}>
                        <AccordionTrigger>
                          <ConfigSummary config={config} />
                        </AccordionTrigger>
                        <AccordionContent>
                          <ConfigEditor index={index} onRemove={() => remove(index)} />
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}

                  <div className="mt-6 flex w-full justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="lg" variant="inverse">
                          <Plus className="h-4 w-4" />
                          Add Connection
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80">
                        <DropdownMenuItem
                          className="flex cursor-pointer flex-col items-start gap-1 p-4"
                          onClick={() => handleAddConfig("fmdapi")}
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-base">Data API</p>
                            <Badge appearance="light" shape="circle" variant="info">
                              Legacy
                            </Badge>
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Reads/writes data using layout-specific context
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex cursor-pointer flex-col items-start gap-1 p-4"
                          onClick={() => handleAddConfig("fmodata")}
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-base">OData</p>
                            <Badge appearance="light" shape="circle" variant="success">
                              New
                            </Badge>
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Reads/writes data directly to the database tables, using the relationship graph as context
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Accordion>
              </>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}

export default App;
