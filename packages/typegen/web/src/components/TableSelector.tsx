import { AlertTriangle, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { type Path, useFormContext } from "react-hook-form";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SingleConfig } from "@/lib/config-utils";
import { cn } from "@/lib/utils";
import { useListTables } from "../hooks/useListTables";
import { InfoTooltip } from "./InfoTooltip";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";

interface FormData {
  config: SingleConfig[];
}

export function TableSelector({ configIndex, path }: { configIndex: number; path: Path<FormData> }) {
  const { control } = useFormContext<FormData>();
  const [open, setOpen] = useState(false);

  const { tables, isLoading, isError, error } = useListTables(configIndex);

  // Transform tables array into combobox format
  const tableOptions = useMemo(() => {
    if (!tables) {
      return [];
    }
    return tables.map((table) => ({
      value: table,
      label: table,
    }));
  }, [tables]);

  return (
    <FormField
      control={control}
      name={path}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Table Occurrence Name <InfoTooltip label="The table occurrence name from your OData service" />
          </FormLabel>
          <FormControl>
            <Popover onOpenChange={setOpen} open={open}>
              <PopoverTrigger asChild>
                <Button
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={isLoading || isError}
                  mode="input"
                  placeholder={!field.value}
                  role="combobox"
                  variant="outline"
                >
                  <span className={cn("truncate")}>
                    {field.value ? tableOptions.find((table) => table.value === field.value)?.label : "Select table..."}
                  </span>
                  <ButtonArrow />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
                <Command>
                  <CommandInput placeholder="Search table..." />
                  <CommandList>
                    {(() => {
                      if (isLoading) {
                        return (
                          <div className="py-6 text-center text-muted-foreground text-sm">
                            <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                            Loading tables...
                          </div>
                        );
                      }
                      if (isError) {
                        return (
                          <div className="space-y-2 px-4 py-6 text-destructive text-sm">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="text-center font-medium">
                                  {error instanceof Error ? error.message : "Failed to load tables"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <>
                          <CommandEmpty>No table found.</CommandEmpty>
                          <CommandGroup>
                            {tableOptions.map((table) => (
                              <CommandItem
                                key={table.value}
                                onSelect={(currentValue) => {
                                  const newValue = currentValue === field.value ? "" : currentValue;
                                  field.onChange(newValue);
                                  setOpen(false);
                                }}
                                value={table.value}
                              >
                                <span className="truncate">{table.label}</span>
                                {field.value === table.value && <CommandCheck />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      );
                    })()}
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

export default TableSelector;
