import * as React from "react";
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
  FormMessage,
} from "./ui/form";
import { SingleConfig } from "@/lib/config-utils";
import { useListTables } from "../hooks/useListTables";
import { Loader2, AlertTriangle } from "lucide-react";

type FormData = { config: SingleConfig[] };

export function TableSelectorCompact({
  configIndex,
  path,
}: {
  configIndex: number;
  path: Path<FormData>;
}) {
  const { control } = useFormContext<FormData>();
  const [open, setOpen] = React.useState(false);

  const {
    tables,
    isLoading,
    isError,
    error,
  } = useListTables(configIndex);

  // Transform tables array into combobox format
  const tableOptions = React.useMemo(() => {
    if (!tables) return [];
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
                      ? tableOptions.find(
                          (table) => table.value === field.value,
                        )?.label
                      : "Select table..."}
                  </span>
                  <ButtonArrow />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
                <Command>
                  <CommandInput placeholder="Search table..." />
                  <CommandList>
                    {isLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                        Loading tables...
                      </div>
                    ) : isError ? (
                      <div className="py-6 px-4 space-y-2 text-sm text-destructive">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-center">
                              {error instanceof Error
                                ? error.message
                                : "Failed to load tables"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No table found.</CommandEmpty>
                        <CommandGroup>
                          {tableOptions.map((table) => (
                            <CommandItem
                              key={table.value}
                              value={table.value}
                              onSelect={(currentValue) => {
                                const newValue =
                                  currentValue === field.value
                                    ? ""
                                    : currentValue;
                                field.onChange(newValue);
                                setOpen(false);
                              }}
                            >
                              <span className="truncate">{table.label}</span>
                              {field.value === table.value && <CommandCheck />}
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

