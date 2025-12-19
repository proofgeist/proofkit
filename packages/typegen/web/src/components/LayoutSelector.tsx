import * as React from "react";
import { client } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Path, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button, ButtonArrow } from "@/components/ui/button";
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { SingleConfig } from "@/lib/config-utils";
import { InfoTooltip } from "./InfoTooltip";

type FormData = { config: SingleConfig[] };

export function LayoutSelector({
  configIndex,
  path,
}: {
  configIndex: number;
  path: Path<FormData>;
}) {
  const { control, setValue, getValues } = useFormContext<FormData>();
  const [open, setOpen] = React.useState(false);

  const {
    data: layouts,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["layouts", configIndex],
    queryFn: async () => {
      const res = await client.api.layouts.$get({
        query: { configIndex: configIndex.toString() },
      });

      const data = await res.json();
      if (!res.ok || "error" in data) {
        // Parse error JSON to get detailed error information
        const errorMessage =
          "error" in data ? data.error : "Failed to fetch layouts";
        throw new Error(errorMessage);
      }
      return data.layouts;
    },
  });

  // Extract error details from the error object
  const errorDetails = error && (error as any).details;

  // Transform layouts array into combobox format
  const layoutOptions = React.useMemo(() => {
    if (!layouts) return [];
    return layouts.map((layout) => ({
      value: layout.name,
      label: layout.name,
    }));
  }, [layouts]);

  return (
    <FormField
      control={control}
      name={path}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Layout Name{" "}
            <InfoTooltip label="The layout name from your FileMaker file" />
          </FormLabel>
          <FormControl>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  mode="input"
                  placeholder={!field.value}
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={isLoading || isError}
                >
                  <span className={cn("truncate")}>
                    {field.value
                      ? layoutOptions.find(
                          (layout) => layout.value === field.value,
                        )?.label
                      : "Select layout..."}
                  </span>
                  <ButtonArrow />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
                <Command>
                  <CommandInput placeholder="Search layout..." />
                  <CommandList>
                    {isLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Loading layouts...
                      </div>
                    ) : isError ? (
                      <div className="py-6 px-4 space-y-2 text-sm text-destructive">
                        <div className="font-medium text-center">
                          {error instanceof Error
                            ? error.message
                            : "Failed to load layouts"}
                        </div>
                        {errorDetails && (
                          <div className="space-y-1 text-xs">
                            {errorDetails.missing && (
                              <div>
                                <div className="font-medium">
                                  Missing environment variables:
                                </div>
                                <ul className="list-disc list-inside space-y-0.5 mt-1">
                                  {errorDetails.missing.server && (
                                    <li>
                                      Server
                                      {errorDetails.suspectedField ===
                                        "server" && " ⚠️"}
                                    </li>
                                  )}
                                  {errorDetails.missing.db && (
                                    <li>
                                      Database
                                      {errorDetails.suspectedField === "db" &&
                                        " ⚠️"}
                                    </li>
                                  )}
                                  {errorDetails.missing.auth && (
                                    <li>
                                      Authentication
                                      {errorDetails.suspectedField === "auth" &&
                                        " ⚠️"}
                                    </li>
                                  )}
                                  {errorDetails.missing.password && (
                                    <li>
                                      Password
                                      {errorDetails.suspectedField === "auth" &&
                                        " ⚠️"}
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            {errorDetails.fmErrorCode && (
                              <div>
                                <span className="font-medium">
                                  FileMaker Error Code:
                                </span>{" "}
                                {errorDetails.fmErrorCode}
                              </div>
                            )}
                            {errorDetails.suspectedField &&
                              !errorDetails.missing && (
                                <div>
                                  Suspected issue with:{" "}
                                  {errorDetails.suspectedField === "server"
                                    ? "Server URL"
                                    : errorDetails.suspectedField === "db"
                                      ? "Database name"
                                      : "Credentials"}
                                </div>
                              )}
                          </div>
                        )}
                        <div className="text-xs text-center opacity-75 pt-2">
                          Check your connection settings in "Configure
                          Environment Variables"
                        </div>
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No layout found.</CommandEmpty>
                        <CommandGroup>
                          {layoutOptions.map((layout) => (
                            <CommandItem
                              key={layout.value}
                              value={layout.value}
                              onSelect={(currentValue) => {
                                const newValue =
                                  currentValue === field.value
                                    ? ""
                                    : currentValue;
                                field.onChange(newValue);

                                // If schema name is undefined or empty, set it to the layout name
                                if (newValue) {
                                  const schemaNamePath = path.replace(
                                    ".layoutName",
                                    ".schemaName",
                                  ) as Path<FormData>;
                                  const currentSchemaName =
                                    getValues(schemaNamePath);
                                  if (
                                    currentSchemaName === undefined ||
                                    currentSchemaName === ""
                                  ) {
                                    setValue(schemaNamePath, newValue);
                                  }
                                }

                                setOpen(false);
                              }}
                            >
                              <span className="truncate">{layout.label}</span>
                              {field.value === layout.value && <CommandCheck />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default LayoutSelector;
