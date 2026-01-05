import { useMemo } from "react";
import { useFormContext, useWatch, Path, PathValue } from "react-hook-form";
import { z } from "zod";
import { CircleCheck, CircleSlash, Loader } from "lucide-react";
import { configSchema } from "../lib/schema";
import { Input, InputWrapper } from "./ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { useEnvValue } from "../lib/envValues";
import { useDebounce } from "@uidotdev/usehooks";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";

type FormData = z.infer<typeof configSchema>;
type FormConfig = { config: FormData[] };

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
  const { data: envValue, isLoading } = useEnvValue(
    envNameForQuery ?? defaultValue,
  );

  const valueState: "loading" | "not-set" | "set" = useMemo(() => {
    if (isLoading) return "loading";
    if (envValue === undefined || envValue === null || envValue === "")
      return "not-set";
    return "set";
  }, [isLoading, envValue]);

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}{" "}
            {dimField ? (
              <span className="text-xs text-muted-foreground"> (not used)</span>
            ) : (
              ""
            )}
          </FormLabel>
          <FormControl>
            <InputWrapper className={dimField ? "!bg-muted" : ""}>
              <Input type="text" placeholder={placeholder} {...field} />
              {valueState === "set" ? (
                <Tooltip>
                  <TooltipTrigger>
                    <CircleCheck
                      className={cn(
                        "size-4",
                        dimField ? "!text-muted-foreground" : "!text-green-500",
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{envValue}</TooltipContent>
                </Tooltip>
              ) : valueState === "loading" ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Tooltip>
                  <TooltipTrigger>
                    <CircleSlash className="size-4 !text-destructive" />
                  </TooltipTrigger>
                  <TooltipContent>Not set</TooltipContent>
                </Tooltip>
              )}
            </InputWrapper>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
