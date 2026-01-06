import { useDebounce } from "@uidotdev/usehooks";
import { CircleCheck, CircleSlash, Loader } from "lucide-react";
import { useMemo } from "react";
import { type Path, type PathValue, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { cn } from "@/lib/utils";
import { useEnvValue } from "../lib/envValues";
import type { configSchema } from "../lib/schema";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input, InputWrapper } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type FormData = z.infer<typeof configSchema>;
interface FormConfig {
  config: FormData[];
}

interface EnvVarFieldProps<TFieldName extends Path<FormConfig>> {
  fieldName: TFieldName extends Path<FormConfig>
    ? PathValue<FormConfig, TFieldName> extends string | undefined
      ? TFieldName
      : never
    : never;
  label: string;
  placeholder: string;
  defaultValue: string;
  dimField?: boolean;
}

export function EnvVarField<TFieldName extends Path<FormConfig>>({
  fieldName,
  label,
  placeholder,
  defaultValue,
  dimField = false,
}: EnvVarFieldProps<TFieldName>) {
  const { control } = useFormContext<FormConfig>();
  const envName = useWatch({
    control,
    name: fieldName,
    defaultValue: undefined,
  });

  const debouncedEnvName = useDebounce(envName, 300);

  // Get the resolved value from the server (using debounced value)
  // Ensure debouncedEnvName is a string or undefined before passing to useEnvValue
  // Handle nested paths where watch might return objects or other types
  const envNameForQuery: string | undefined = (() => {
    if (typeof debouncedEnvName === "string") {
      return debouncedEnvName.trim() !== "" ? debouncedEnvName : undefined;
    }
    return undefined;
  })();
  const { data: envValue, isLoading } = useEnvValue(envNameForQuery ?? defaultValue);

  const valueState: "loading" | "not-set" | "set" = useMemo(() => {
    if (isLoading) {
      return "loading";
    }
    if (envValue === undefined || envValue === null || envValue === "") {
      return "not-set";
    }
    return "set";
  }, [isLoading, envValue]);

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label} {dimField ? <span className="text-muted-foreground text-xs"> (not used)</span> : ""}
          </FormLabel>
          <FormControl>
            <InputWrapper className={dimField ? "!bg-muted" : ""}>
              <Input placeholder={placeholder} type="text" {...field} />
              {(() => {
                if (valueState === "set") {
                  return (
                    <Tooltip>
                      <TooltipTrigger>
                        <CircleCheck
                          className={cn("size-4", dimField ? "!text-muted-foreground" : "!text-green-500")}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{envValue}</TooltipContent>
                    </Tooltip>
                  );
                }
                if (valueState === "loading") {
                  return <Loader className="size-4 animate-spin" />;
                }
                return (
                  <Tooltip>
                    <TooltipTrigger>
                      <CircleSlash className="!text-destructive size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Not set</TooltipContent>
                  </Tooltip>
                );
              })()}
            </InputWrapper>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
