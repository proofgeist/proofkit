import { useEffect, useState } from "react";
import { useWatch, useFormContext } from "react-hook-form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { defaultEnvNames } from "../../../src/constants";
import { EnvVarField } from "./EnvVarField";
import { useEnvVarIndicator } from "./useEnvVarIndicator";
import { useEnvValue } from "../lib/envValues";
import { useTestConnection, setDialogOpen } from "../hooks/useTestConnection";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface EnvVarDialogProps {
  index: number;
}

export function EnvVarDialog({ index }: EnvVarDialogProps) {
  const { control, setValue, getValues } = useFormContext<{
    config: any[];
  }>();
  const [authTypeSelector, setAuthTypeSelector] = useState<
    "none" | "apiKey" | "username"
  >("apiKey");
  const [dialogOpen, setDialogOpenState] = useState(false);

  // Track dialog open state to pause background tests
  useEffect(() => {
    setDialogOpen(index, dialogOpen);
    return () => {
      setDialogOpen(index, false);
    };
  }, [index, dialogOpen]);

  // Watch the envNames.auth value for this config
  const envNamesAuth = useWatch({
    control,
    name: `config.${index}.envNames.auth` as const,
  });

  // Get indicator data
  const {
    hasCustomValues,
    serverValue,
    serverLoading,
    dbValue,
    dbLoading,
    authEnvName: baseAuthEnvName,
  } = useEnvVarIndicator(index);

  // Determine auth env name based on auth type selector
  const authEnvName =
    baseAuthEnvName ||
    (authTypeSelector === "apiKey"
      ? defaultEnvNames.apiKey
      : defaultEnvNames.username);

  const { data: authValue, isLoading: authLoading } = useEnvValue(authEnvName);

  // Test connection hook - disable automatic testing when dialog is open
  // It will only run when the retry button is clicked
  const {
    status: testStatus,
    data: testData,
    error: testError,
    errorDetails,
    run: runTest,
  } = useTestConnection(index, { enabled: false });

  // Check if any values resolve to undefined/null/empty (only check after loading completes)
  const hasUndefinedValues =
    (!serverLoading &&
      (serverValue === undefined ||
        serverValue === null ||
        serverValue === "")) ||
    (!dbLoading &&
      (dbValue === undefined || dbValue === null || dbValue === "")) ||
    (!authLoading &&
      (authValue === undefined || authValue === null || authValue === ""));

  // Initialize auth type selector based on current form value
  useEffect(() => {
    let authSelector: "none" | "apiKey" | "username" = "apiKey";

    if (envNamesAuth) {
      if (typeof envNamesAuth === "object") {
        // Check for username first (since it has two fields, it's more specific)
        if ("username" in envNamesAuth || "password" in envNamesAuth) {
          authSelector = "username";
        } else if ("apiKey" in envNamesAuth) {
          authSelector = "apiKey";
        }
        // If it's an empty object {}, don't change the selector or reset values
        // This preserves the current state when the server returns {}
      }
    } else {
      // Only initialize if auth is truly undefined/null
      // Check current form value to avoid overwriting
      const currentAuth = getValues(`config.${index}.envNames.auth` as any);
      if (!currentAuth) {
        setValue(`config.${index}.envNames.auth` as const, {
          apiKey: "",
        });
      }
    }

    // Only update selector if it's different to avoid unnecessary re-renders
    if (authSelector !== authTypeSelector) {
      setAuthTypeSelector(authSelector);
    }
  }, [envNamesAuth, setValue, getValues, index, authTypeSelector]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpenState}>
      <div className="relative overflow-visible mr-2">
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="relative">
            Server Connection Settings
          </Button>
        </DialogTrigger>
        {(hasUndefinedValues || hasCustomValues) && (
          <span
            className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold pointer-events-none z-50 ${
              hasUndefinedValues
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {hasUndefinedValues ? "!" : "•"}
          </span>
        )}
      </div>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Environment Variable Names</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EnvVarField
              fieldName={`config.${index}.envNames.server` as const}
              label="Server"
              placeholder={defaultEnvNames.server}
              defaultValue={defaultEnvNames.server}
            />

            <EnvVarField
              fieldName={`config.${index}.envNames.db` as const}
              label="Database"
              placeholder={defaultEnvNames.db}
              defaultValue={defaultEnvNames.db}
            />

            <div className="col-span-full flex flex-col gap-4 md:flex-row md:flex-nowrap md:items-start">
              <div className="space-y-2 md:w-[180px] md:flex-shrink-0">
                <label
                  htmlFor={`config.${index}.authType`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Auth Type
                </label>
                <Select
                  value={authTypeSelector}
                  onValueChange={(value: "none" | "apiKey" | "username") => {
                    setAuthTypeSelector(value);
                    // Preserve existing values when switching auth types
                    const currentAuth = envNamesAuth;
                    if (value === "apiKey") {
                      setValue(`config.${index}.envNames.auth` as const, {
                        apiKey:
                          (currentAuth &&
                            typeof currentAuth === "object" &&
                            "apiKey" in currentAuth &&
                            currentAuth.apiKey) ||
                          "",
                      });
                    } else if (value === "username") {
                      setValue(`config.${index}.envNames.auth` as const, {
                        username:
                          (currentAuth &&
                            typeof currentAuth === "object" &&
                            "username" in currentAuth &&
                            currentAuth.username) ||
                          "",
                        password:
                          (currentAuth &&
                            typeof currentAuth === "object" &&
                            "password" in currentAuth &&
                            currentAuth.password) ||
                          "",
                      });
                    } else {
                      setValue(
                        `config.${index}.envNames.auth` as const,
                        undefined,
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select auth type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apiKey">OttoFMS API Key</SelectItem>
                    <SelectItem value="username">Username/Password</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:flex-nowrap md:flex-1">
                {authTypeSelector === "apiKey" && (
                  <div className="flex-1">
                    <EnvVarField
                      fieldName={
                        `config.${index}.envNames.auth.apiKey` as const
                      }
                      label="API Key"
                      placeholder={defaultEnvNames.apiKey}
                      defaultValue={defaultEnvNames.apiKey}
                    />
                  </div>
                )}

                {authTypeSelector === "username" && (
                  <>
                    <div className="flex-1">
                      <EnvVarField
                        fieldName={
                          `config.${index}.envNames.auth.username` as const
                        }
                        label="Username"
                        placeholder={defaultEnvNames.username}
                        defaultValue={defaultEnvNames.username}
                      />
                    </div>

                    <div className="flex-1">
                      <EnvVarField
                        fieldName={
                          `config.${index}.envNames.auth.password` as const
                        }
                        label="Password"
                        placeholder={defaultEnvNames.password}
                        defaultValue={defaultEnvNames.password}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Test Connection Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Connection Status</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runTest()}
                disabled={testStatus === "pending"}
              >
                {testStatus === "pending" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Retry Test"
                )}
              </Button>
            </div>

            {/* Test Results - Show automatically when available */}
            {testStatus !== "idle" && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  testStatus === "success"
                    ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                    : testStatus === "error"
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : ""
                }`}
              >
                {testStatus === "pending" && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Testing connection...</span>
                  </div>
                )}

                {testStatus === "success" && testData && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Connection OK</span>
                    </div>
                    <div className="pl-6 space-y-0.5 text-xs">
                      <div>
                        <span className="font-medium">Server:</span>{" "}
                        {testData.server}
                      </div>
                      <div>
                        <span className="font-medium">Database:</span>{" "}
                        {testData.db}
                      </div>
                      <div>
                        <span className="font-medium">Auth Type:</span>{" "}
                        {testData.authType === "apiKey"
                          ? "API Key"
                          : "Username/Password"}
                      </div>
                    </div>
                  </div>
                )}

                {testStatus === "error" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <XCircle className="w-4 h-4" />
                      <span>Connection Failed</span>
                    </div>
                    {errorDetails && (
                      <div className="pl-6 space-y-1 text-xs">
                        <div className="font-medium">
                          {errorDetails.message ||
                            errorDetails.error ||
                            "Unknown error"}
                        </div>
                        {errorDetails.details?.missing && (
                          <div className="space-y-0.5">
                            <div className="font-medium">
                              Missing environment variables:
                            </div>
                            <ul className="list-disc list-inside space-y-0.5">
                              {errorDetails.details.missing.server && (
                                <li>
                                  Server (
                                  {errorDetails.suspectedField === "server" &&
                                    "⚠️"}
                                  )
                                </li>
                              )}
                              {errorDetails.details.missing.db && (
                                <li>
                                  Database (
                                  {errorDetails.suspectedField === "db" && "⚠️"}
                                  )
                                </li>
                              )}
                              {errorDetails.details.missing.auth && (
                                <li>
                                  Authentication (
                                  {errorDetails.suspectedField === "auth" &&
                                    "⚠️"}
                                  )
                                </li>
                              )}
                              {errorDetails.details.missing.password && (
                                <li>
                                  Password (
                                  {errorDetails.suspectedField === "auth" &&
                                    "⚠️"}
                                  )
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
                          !errorDetails.details?.missing && (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>
                                Suspected issue with:{" "}
                                {errorDetails.suspectedField === "server"
                                  ? "Server URL"
                                  : errorDetails.suspectedField === "db"
                                    ? "Database name"
                                    : "Credentials"}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                    {testError && !errorDetails && (
                      <div className="pl-6 text-xs">{testError.message}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
