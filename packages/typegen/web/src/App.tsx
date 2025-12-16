import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { client } from "./lib/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Loader2, PlayIcon, Plus } from "lucide-react";
import { ConfigSummary } from "./components/ConfigSummary";
import { type SingleConfig } from "./lib/config-utils";
import { Form } from "./components/ui/form";
import { useConfig } from "./hooks/useConfig";
import { Badge } from "./components/ui/badge";
import { ConfigEditor } from "./components/ConfigEditor";

// Normalize config to always be an array
function normalizeConfig(
  config: SingleConfig | SingleConfig[] | null,
): SingleConfig[] {
  if (Array.isArray(config)) {
    return config;
  }
  if (config && typeof config === "object") {
    return [config];
  }
  return [];
}

function App() {
  // Load and save config using custom hook
  const {
    configDataResponse,
    isError,
    error,
    refetch,
    saveMutation,
    isLoading,
    isRetrying,
  } = useConfig();

  // Track active accordion item to preserve state
  const [activeAccordionItem, setActiveAccordionItem] = useState<number>(0);

  // Use React Hook Form to manage the configs array
  type FormData = { config: SingleConfig[] };
  const form = useForm<FormData>({});

  useEffect(() => {
    console.log("configData from useEffect", configDataResponse);
    if (configDataResponse) {
      const configData = configDataResponse?.config;
      const serverConfigs = normalizeConfig(configData);
      form.reset({ config: serverConfigs });
    }
  }, [configDataResponse]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "config",
  });

  // Get configs from form values for data access
  const configs = form.watch("config");

  // Run typegen mutation
  const runTypegenMutation = useMutation({
    mutationFn: async () => {
      await client.api.run.$post({
        json: { config: configs },
      });
    },
  });

  const handleSaveAll = form.handleSubmit(async (data) => {
    try {
      await saveMutation.mutateAsync(data.config);
      // Reset the form with the current form state to clear dirty state
      // Use getValues() to get the current state, preserving any changes made during the save request
      // The accordion state is preserved because it's controlled and the component doesn't unmount
      const currentConfigs = form.getValues("config");
      form.reset({ config: currentConfigs });
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
      <div className="max-w-7xl mx-auto px-4 py-8 relative">
        {/* Loading Overlay - Preserves form state underneath */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-muted-foreground">
              {isRetrying ? "Waiting for API server..." : "Loading config..."}
            </div>
          </div>
        )}

        {/* Error Overlay - Preserves form state underneath */}
        {isError && !isRetrying && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 max-w-md">
              <h2 className="text-2xl font-semibold text-destructive mb-2">
                Error
              </h2>
              <p className="text-destructive/90 mb-4">
                {error instanceof Error
                  ? error.message
                  : "Failed to load config"}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content - Always rendered to preserve state */}
        <header>
          <div className="mb-4 flex gap-2  justify-between">
            <div className="flex items-center gap-3">
              <img src="/proofkit-horiz.png" alt="ProofKit" className="h-12" />
              <h1 className="text-3xl font-bold flex items-baseline gap-2 ">
                <div>
                  <span className="text-blue-600 dark:text-blue-400">type</span>
                  <span>gen</span>
                </div>
                <span className="px-2 py-1 bg-muted rounded-md text-[1.25rem] caption-bottom">
                  UI
                </span>
              </h1>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleRunTypegen}
                disabled={
                  runTypegenMutation.isPending || saveMutation.isPending
                }
              >
                {runTypegenMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
                {runTypegenMutation.isPending ? "Running..." : "Run Typegen"}
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={
                  saveMutation.isPending ||
                  runTypegenMutation.isPending ||
                  !form.formState.isDirty
                }
                variant={form.formState.isDirty ? "primary" : "outline"}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {saveMutation.isPending
                  ? "Saving..."
                  : form.formState.isDirty
                    ? "Save"
                    : "Saved"}
              </Button>
            </div>
          </div>
        </header>

        <Form {...form}>
          <form onSubmit={handleSaveAll}>
            <Accordion
              value={activeAccordionItem.toString()}
              onValueChange={(value) => setActiveAccordionItem(Number(value))}
              type="single"
              variant="outline"
              collapsible
              className="w-full lg:w-[75%] mx-auto"
            >
              {fields.map((field, index) => {
                const config = configs[index];
                return (
                  <AccordionItem
                    key={field.id}
                    value={index.toString()}
                    className="bg-card"
                  >
                    <AccordionTrigger>
                      <ConfigSummary config={config} />
                    </AccordionTrigger>
                    <AccordionContent>
                      <ConfigEditor
                        index={index}
                        onRemove={() => remove(index)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}

              <div className="w-full flex justify-center mt-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="inverse">
                      <Plus className="w-4 h-4" />
                      Add Connection
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <DropdownMenuItem
                      className="flex flex-col items-start gap-1 p-4 cursor-pointer"
                      onClick={() => {
                        append({
                          type: "fmdapi",
                          envNames: {
                            server: undefined,
                            db: undefined,
                            auth: undefined,
                          },
                          layouts: [],
                        });
                        setTimeout(() => {
                          setActiveAccordionItem(fields.length);
                        }, 1);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-base">Data API</p>
                        <Badge shape="circle" appearance="light" variant="info">
                          Legacy
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Reads/writes data using layout-specific context
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex flex-col items-start gap-1 p-4 cursor-pointer"
                      onClick={() => {
                        append({
                          type: "fmodata",
                          envNames: {
                            server: undefined,
                            db: undefined,
                            auth: undefined,
                          },
                          downloadMetadata: false,
                          metadataPath: "schema",
                        });
                        setTimeout(() => {
                          setActiveAccordionItem(fields.length);
                        }, 1);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-base">OData</p>
                        <Badge
                          shape="circle"
                          appearance="light"
                          variant="success"
                        >
                          New
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Reads/writes data directly to the database tables, using
                        the relationship graph as context
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Accordion>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default App;
