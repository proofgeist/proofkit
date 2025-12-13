import { useState, useEffect, useRef, memo } from "react";
import { useFormContext, useWatch, Path, PathValue } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { configSchema } from "../lib/schema";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { useEnvValue } from "../lib/envValues";

type FormData = z.infer<typeof configSchema>;
type FormConfig = { config: FormData[] };

// Separate component for value display to prevent Input re-renders
const EnvValueDisplay = memo(function EnvValueDisplay({
  fieldName,
  defaultValue,
}: {
  fieldName: Path<FormConfig>;
  defaultValue: string;
}) {
  const { control } = useFormContext<FormConfig>();
  const [isVisible, setIsVisible] = useState(false);
  const [debouncedEnvName, setDebouncedEnvName] = useState<string | undefined>(
    undefined,
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Watch the env name value - but debounce updates to prevent re-renders
  const envNameRaw = useWatch({
    control,
    name: fieldName,
    defaultValue: "",
  }) as string | undefined;

  // Treat empty string as undefined to use default
  const envName =
    envNameRaw && envNameRaw.trim() !== "" ? envNameRaw : undefined;

  // Debounce the env name to prevent excessive re-renders and API calls
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedEnvName(envName);
    }, 300); // 300ms debounce

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [envName]);

  // Get the resolved value from the server (using debounced value)
  const { data: envValue, isLoading } = useEnvValue(
    debouncedEnvName ?? defaultValue,
  );

  if (!envName && !defaultValue) return null;

  return (
    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
      {isLoading ? (
        <span>Loading...</span>
      ) : envValue ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            mode="icon"
            onClick={() => setIsVisible(!isVisible)}
            className="h-4 w-4 p-0"
          >
            {isVisible ? (
              <EyeOff className="size-3" />
            ) : (
              <Eye className="size-3" />
            )}
          </Button>
          <span>
            Value:{" "}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {isVisible ? envValue : "****"}
            </code>
          </span>
        </>
      ) : (
        <span className="text-destructive">Not set</span>
      )}
    </div>
  );
});

interface EnvVarFieldProps<TFieldName extends Path<FormConfig>> {
  fieldName: TFieldName extends Path<FormConfig>
    ? PathValue<FormConfig, TFieldName> extends string | undefined
      ? TFieldName
      : never
    : never;
  label: string;
  placeholder: string;
  defaultValue: string;
}

export function EnvVarField<TFieldName extends Path<FormConfig>>({
  fieldName,
  label,
  placeholder,
  defaultValue,
}: EnvVarFieldProps<TFieldName>) {
  const { control } = useFormContext<FormConfig>();

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="text" placeholder={placeholder} {...field} />
          </FormControl>
          <EnvValueDisplay fieldName={fieldName} defaultValue={defaultValue} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
