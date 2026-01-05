import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { defaultEnvNames } from "../../../src/constants";
import { EnvVarField } from "./EnvVarField";
import { useEnvVarIndicator } from "./useEnvVarIndicator";
import { useEnvValue } from "../lib/envValues";
import { useTestConnection, setDialogOpen } from "../hooks/useTestConnection";
import { Alert, AlertContent, AlertDescription, AlertIcon } from "./ui/alert";
import { Card, CardContent, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Server,
  Info,
} from "lucide-react";

interface EnvVarDialogProps {
  index: number;
}

// Helper to safely extract error message from various error formats
function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

export function EnvVarDialog({ index }: EnvVarDialogProps) {
  const { control, setValue, getValues } = useFormContext<{
    config: any[];
  }>();
  const [dialogOpen, setDialogOpenState] = useState(false);

  // Track dialog open state to pause background tests
  useEffect(() => {
    setDialogOpen(index, dialogOpen);
    return () => {
      setDialogOpen(index, false);
    };
  }, [index, dialogOpen]);

  // Get indicator data
  const { hasCustomValues, serverValue, serverLoading, dbValue, dbLoading } =
    useEnvVarIndicator(index);

  // Watch the auth env names from the form
  const envNamesAuth = useWatch({
    control,
    name: `config.${index}.envNames.auth` as const,
  });

  // Determine the actual env names to use (from form or defaults)
  const apiKeyEnvName =
    envNamesAuth &&
    typeof envNamesAuth === "object" &&
    "apiKey" in envNamesAuth &&
    envNamesAuth.apiKey &&
    envNamesAuth.apiKey.trim() !== ""
      ? envNamesAuth.apiKey
      : defaultEnvNames.apiKey;
  const usernameEnvName =
    envNamesAuth &&
    typeof envNamesAuth === "object" &&
    "username" in envNamesAuth &&
    envNamesAuth.username &&
    envNamesAuth.username.trim() !== ""
      ? envNamesAuth.username
      : defaultEnvNames.username;
  const passwordEnvName =
    envNamesAuth &&
    typeof envNamesAuth === "object" &&
    "password" in envNamesAuth &&
    envNamesAuth.password &&
    envNamesAuth.password.trim() !== ""
      ? envNamesAuth.password
      : defaultEnvNames.password;

  // Resolve all three auth env values
  const { data: apiKeyValue, isLoading: apiKeyLoading } =
    useEnvValue(apiKeyEnvName);
  const { data: usernameValue, isLoading: usernameLoading } =
    useEnvValue(usernameEnvName);
  const { data: passwordValue, isLoading: passwordLoading } =
    useEnvValue(passwordEnvName);

  // Determine which authentication method will be used
  // Default to API key if it resolves to a value, otherwise use username/password if both resolve
  const activeAuthMethod =
    !apiKeyLoading &&
    apiKeyValue !== undefined &&
    apiKeyValue !== null &&
    apiKeyValue !== ""
      ? "apiKey"
      : !usernameLoading &&
          !passwordLoading &&
          usernameValue !== undefined &&
          usernameValue !== null &&
          usernameValue !== "" &&
          passwordValue !== undefined &&
          passwordValue !== null &&
          passwordValue !== ""
        ? "username"
        : null;

  // Test connection hook - enable when dialog is closed, disable when open
  // When dialog is open, it will only run when the retry button is clicked
  const {
    status: testStatus,
    data: testData,
    error: testError,
    errorDetails,
    run: runTest,
  } = useTestConnection(index, { enabled: !dialogOpen });

  // Check if any values resolve to undefined/null/empty (only check after loading completes)
  // For auth, check that at least one complete auth method is configured (either API key OR username+password)
  const hasApiKeyAuth =
    !apiKeyLoading &&
    apiKeyValue !== undefined &&
    apiKeyValue !== null &&
    apiKeyValue !== "";
  const hasUsernamePasswordAuth =
    !usernameLoading &&
    !passwordLoading &&
    usernameValue !== undefined &&
    usernameValue !== null &&
    usernameValue !== "" &&
    passwordValue !== undefined &&
    passwordValue !== null &&
    passwordValue !== "";
  const hasAuth = hasApiKeyAuth || hasUsernamePasswordAuth;

  const hasUndefinedValues =
    (!serverLoading &&
      (serverValue === undefined ||
        serverValue === null ||
        serverValue === "")) ||
    (!dbLoading &&
      (dbValue === undefined || dbValue === null || dbValue === "")) ||
    (!apiKeyLoading && !usernameLoading && !passwordLoading && !hasAuth);

  // Initialize auth fields if not already set
  useEffect(() => {
    const currentAuth = getValues(`config.${index}.envNames.auth` as any);
    if (!currentAuth) {
      setValue(`config.${index}.envNames.auth` as const, {
        apiKey: "",
        username: "",
        password: "",
      });
    } else if (typeof currentAuth === "object") {
      // Ensure all fields exist
      setValue(`config.${index}.envNames.auth` as const, {
        apiKey: currentAuth.apiKey || "",
        username: currentAuth.username || "",
        password: currentAuth.password || "",
      });
    }
  }, [setValue, getValues, index]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpenState}>
      <div className="relative overflow-visible mr-2">
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="relative">
            <Server className="size-4" />
            Connection Settings
            {testStatus === "error" && (
              <AlertTriangle className="size-4 ml-2 text-yellow-500" />
            )}
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
          <DialogDescription>
            Enter the <span className="font-medium text-foreground">names</span>{" "}
            of the environment variables below, not the values
          </DialogDescription>
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

            <div className="col-span-full">
              <Card className="bg-transparent">
                <CardContent className="space-y-4 bg-transparent">
                  <CardTitle>Authentication</CardTitle>
                  {/* API Key on its own line */}
                  <EnvVarField
                    fieldName={`config.${index}.envNames.auth.apiKey` as const}
                    label="API Key"
                    placeholder={defaultEnvNames.apiKey}
                    defaultValue={defaultEnvNames.apiKey}
                    dimField={activeAuthMethod !== "apiKey"}
                  />

                  {/* OR Divider */}
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-sm text-muted-foreground font-medium">
                      OR
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  {/* Username and Password on the same line */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <EnvVarField
                      fieldName={
                        `config.${index}.envNames.auth.username` as const
                      }
                      label="Username"
                      placeholder={defaultEnvNames.username}
                      defaultValue={defaultEnvNames.username}
                      dimField={activeAuthMethod !== "username"}
                    />

                    <EnvVarField
                      fieldName={
                        `config.${index}.envNames.auth.password` as const
                      }
                      label="Password"
                      placeholder={defaultEnvNames.password}
                      defaultValue={defaultEnvNames.password}
                      dimField={activeAuthMethod !== "username"}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Alert variant="mono" appearance="light" size="sm">
            <AlertIcon>
              <Info className="size-4" />
            </AlertIcon>
            <AlertContent>
              <AlertDescription>
                You will need to rerun the{" "}
                <code className="font-mono bg-muted px-1 py-0.5 rounded-md">
                  @proofkit/typegen ui
                </code>{" "}
                command if you change any environment variables.
              </AlertDescription>
            </AlertContent>
          </Alert>

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
                            getErrorMessage(errorDetails.error as unknown) ||
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
                      <div className="pl-6 text-xs">
                        {testError instanceof Error
                          ? testError.message
                          : typeof testError === "object" &&
                              testError !== null &&
                              "message" in testError
                            ? String(
                                (testError as { message: unknown }).message,
                              )
                            : "Unknown error"}
                      </div>
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
