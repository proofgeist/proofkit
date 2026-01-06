import { type Path, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useEnvValue } from "../lib/envValues";
import type { configSchema } from "../lib/schema";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";

type FormData = z.infer<typeof configSchema>;

interface EnvVarFieldProps {
  index: number;
  fieldName: Path<{ config: FormData[] }>;
  label: string;
  placeholder: string;
  defaultValue: string;
  type?: "text" | "password";
}

export function EnvVarField({ fieldName, label, placeholder, defaultValue, type = "text" }: EnvVarFieldProps) {
  const { control } = useFormContext<{ config: FormData[] }>();

  // Watch the env name value to get the resolved env var
  const envName = useWatch({
    control,
    name: fieldName,
  });

  // Ensure envName is a string or undefined before passing to useEnvValue
  // Handle nested paths where watch might return objects or other types
  const envNameForQuery: string | undefined = (() => {
    if (typeof envName === "string") {
      return envName.trim() !== "" ? envName : undefined;
    }
    return undefined;
  })();

  // Get the resolved value from the server
  const { data: envValue, isLoading } = useEnvValue(envNameForQuery ?? defaultValue);

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              type={type}
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
            />
          </FormControl>
          {(envNameForQuery || defaultValue) && (
            <div className="mt-1 text-muted-foreground text-xs">
              {(() => {
                if (isLoading) {
                  return <span>Loading...</span>;
                }
                if (envValue) {
                  return <span>Resolved: {envValue}</span>;
                }
                return <span className="text-destructive">Not set</span>;
              })()}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
