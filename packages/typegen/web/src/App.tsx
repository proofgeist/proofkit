import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { client } from "./lib/api";
import { ConfigEditor } from "./components/ConfigEditor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { z } from "zod/v4";
import { Button } from "./components/ui/button";
import { Loader2, PlayIcon } from "lucide-react";
import { ConfigSummary } from "./components/ConfigSummary";
import { type SingleConfig, configsArraySchema } from "./lib/config-utils";
import { Form } from "./components/ui/form";
import { useConfig } from "./hooks/useConfig";

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

  // Use React Hook Form to manage the configs array
  const formSchema = z.object({ config: configsArraySchema });
  type FormData = z.infer<typeof formSchema>;
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any, // Type assertion needed due to discriminated union
  });

  useEffect(() => {
    console.log("configData from useEffect", configDataResponse);
    if (configDataResponse) {
      const configData = configDataResponse?.config;
      const serverConfigs = normalizeConfig(configData);
      form.reset({ config: serverConfigs });
    }
  }, [configDataResponse]);

  const { fields } = useFieldArray({
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

  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading">
            {isRetrying ? "Waiting for API server..." : "Loading config..."}
          </div>
        </div>
      </div>
    );
  }

  if (isError && !isRetrying) {
    return (
      <div className="app">
        <div className="container">
          <div className="error">
            <h2>Error</h2>
            <p>
              {error instanceof Error ? error.message : "Failed to load config"}
            </p>
            <button onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <header>
          <div className="mb-4 flex gap-2  justify-between">
            <h1>Typegen Config Editor</h1>

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
              defaultValue="0"
              type="single"
              variant="outline"
              collapsible
              className="w-full lg:w-[75%] mx-auto"
            >
              {fields.map((field, index) => {
                const config = configs[index];
                return (
                  <AccordionItem key={field.id} value={index.toString()}>
                    <AccordionTrigger>
                      <ConfigSummary config={config} />
                    </AccordionTrigger>
                    <AccordionContent>
                      <ConfigEditor index={index} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default App;
