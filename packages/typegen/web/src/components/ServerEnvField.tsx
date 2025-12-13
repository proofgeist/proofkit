import { useFormContext, useWatch, Path } from "react-hook-form";
import { z } from "zod";
import { configSchema } from "../lib/schema";
import { Input } from "./ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { useEnvValue } from "../lib/envValues";

type FormData = z.infer<typeof configSchema>;

interface EnvVarFieldProps {
  index: number;
  fieldName: Path<{ config: FormData[] }>;
  label: string;
  placeholder: string;
  defaultValue: string;
  type?: "text" | "password";
}

export function EnvVarField({
  index,
  fieldName,
  label,
  placeholder,
  defaultValue,
  type = "text",
}: EnvVarFieldProps) {
  const { control } = useFormContext<{ config: FormData[] }>();

  // Watch the env name value to get the resolved env var
  const envName = useWatch({
    control,
    name: fieldName,
  });

  // Get the resolved value from the server
  const { data: envValue, isLoading } = useEnvValue(envName || defaultValue);

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          {(envName || defaultValue) && (
            <div className="text-xs text-muted-foreground mt-1">
              {isLoading ? (
                <span>Loading...</span>
              ) : envValue ? (
                <span>Resolved: {envValue}</span>
              ) : (
                <span className="text-destructive">Not set</span>
              )}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
