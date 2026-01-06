import path from "node:path";
import { zValidator } from "@hono/zod-validator";
import { type clientTypes, FileMakerError } from "@proofkit/fmdapi";
import chalk from "chalk";
import { execa, parseCommandString } from "execa";
import fs from "fs-extra";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { parse } from "jsonc-parser";
import z from "zod/v4";
import { downloadTableMetadata, parseMetadata } from "../fmodata";
import { generateTypedClients } from "../typegen";
import { typegenConfig, typegenConfigSingle, typegenConfigSingleForValidation } from "../types";
import { createClientFromConfig, createDataApiClient, createOdataClientFromConfig } from "./createDataApiClient";

export interface ApiContext {
  cwd: string;
  configPath: string;
}

/**
 * Flattens a nested layout/folder structure into a flat list with full paths
 */
function flattenLayouts(
  layouts: clientTypes.LayoutOrFolder[],
  parentPath = "",
): Array<{ name: string; path: string; table?: string }> {
  const result: Array<{ name: string; path: string; table?: string }> = [];

  for (const item of layouts) {
    if ("isFolder" in item && item.isFolder) {
      // It's a folder - recursively process its contents
      const folderPath = parentPath ? `${parentPath}/${item.name}` : item.name;
      if (item.folderLayoutNames) {
        result.push(...flattenLayouts(item.folderLayoutNames, folderPath));
      }
    } else {
      // It's a layout
      const layoutPath = parentPath ? `${parentPath}/${item.name}` : item.name;
      result.push({
        name: item.name,
        path: layoutPath,
        table: "table" in item ? item.table : undefined,
      });
    }
  }

  return result;
}

export function createApiApp(context: ApiContext) {
  // Request-validation schema: add default `type` for backwards compatibility.
  // Important: we keep `typegenConfigSingleForValidation` as a pure discriminated union
  // so JSON Schema generation (apps/docs) remains unchanged.
  const typegenConfigSingleRequestForValidation = z.preprocess((data) => {
    if (data && typeof data === "object" && !("type" in data)) {
      return { ...(data as Record<string, unknown>), type: "fmdapi" };
    }
    return data;
  }, typegenConfigSingleForValidation);

  // Define all routes with proper chaining for type inference
  const app = new Hono()
    .basePath("/api")

    // GET /api/config
    .get("/config", (c) => {
      const { configPath, cwd } = context;
      const fullPath = path.resolve(cwd, configPath);

      const exists = fs.existsSync(fullPath);

      if (!exists) {
        return c.json({
          exists: false,
          path: configPath,
          fullPath,
          config: null,
          formatCommand: undefined,
        });
      }

      try {
        const raw = fs.readFileSync(fullPath, "utf8");
        const rawJson = parse(raw);
        const parsed = typegenConfig.parse(rawJson);

        return c.json({
          exists: true,
          path: configPath,
          fullPath,
          config: parsed.config,
          formatCommand: parsed.postGenerateCommand,
        });
      } catch (err) {
        console.log("error from get config", err);
        return c.json(
          {
            error: err instanceof Error ? err.message : "Failed to read config",
          },
          500,
        );
      }
    })
    // POST /api/config
    .post(
      "/config",
      zValidator(
        "json",
        z.object({
          config: z.array(typegenConfigSingleRequestForValidation),
          formatCommand: z.string().optional(),
        }),
      ),
      async (c) => {
        try {
          const data = c.req.valid("json");

          // Transform validated data using runtime schema (applies transforms)
          const transformedData = {
            formatCommand: data.formatCommand,
            config: data.config.map((config) => {
              // Add default type if missing (backwards compatibility)
              const configWithType =
                "type" in config && config.type
                  ? config
                  : { ...(config as Record<string, unknown>), type: "fmdapi" as const };
              // Parse with runtime schema to apply transforms
              return typegenConfigSingle.parse(configWithType);
            }),
          };

          // Validate with Zod (data is already { config: [...], formatCommand?: string })
          const validation = typegenConfig.safeParse(transformedData);

          if (!validation.success) {
            const issues = validation.error.issues.map((err) => ({
              path: err.path,
              message: err.message,
            }));

            const response = z
              .object({
                success: z.boolean(),
                error: z.string().optional(),
                issues: z
                  .array(
                    z.object({
                      path: z.array(z.union([z.string(), z.number()])),
                      message: z.string(),
                    }),
                  )
                  .optional(),
              })
              .parse({
                success: false,
                error: "Validation failed",
                issues,
              });
            return c.json(response, 400);
          }

          // Write to disk as pretty JSON (replacing JSONC)
          const fullPath = path.resolve(context.cwd, context.configPath);
          // Add $schema at the top of the config
          const configData = validation.data as Record<string, unknown>;
          const { $schema: _, ...rest } = configData;
          const configWithSchema = {
            $schema: "https://proofkit.dev/typegen-config-schema.json",
            ...rest,
          };
          const jsonContent = `${JSON.stringify(configWithSchema, null, 2)}\n`;

          await fs.ensureDir(path.dirname(fullPath));
          await fs.writeFile(fullPath, jsonContent, "utf8");

          const response = z
            .object({
              success: z.boolean(),
              error: z.string().optional(),
              issues: z
                .array(
                  z.object({
                    path: z.array(z.union([z.string(), z.number()])),
                    message: z.string(),
                  }),
                )
                .optional(),
            })
            .parse({ success: true });
          return c.json(response);
        } catch (err) {
          const response = z
            .object({
              success: z.boolean(),
              error: z.string().optional(),
              issues: z
                .array(
                  z.object({
                    path: z.array(z.union([z.string(), z.number()])),
                    message: z.string(),
                  }),
                )
                .optional(),
            })
            .parse({
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            });
          return c.json(response, 500);
        }
      },
    )
    // POST /api/run
    .post(
      "/run",
      zValidator(
        "json",
        z.object({
          config: z.union([z.array(typegenConfigSingleRequestForValidation), typegenConfigSingleRequestForValidation]),
          formatCommand: z.string().optional(),
        }),
      ),
      async (c, next) => {
        const rawData = c.req.valid("json");
        // Transform validated data using runtime schema (applies transforms)
        const configArray = Array.isArray(rawData.config) ? rawData.config : [rawData.config];
        const transformedConfig = configArray.map((config) => {
          // Add default type if missing (backwards compatibility)
          const configWithType =
            "type" in config && config.type
              ? config
              : { ...(config as Record<string, unknown>), type: "fmdapi" as const };
          // Parse with runtime schema to apply transforms
          return typegenConfigSingle.parse(configWithType);
        });
        const config: z.infer<typeof typegenConfig>["config"] =
          transformedConfig.length === 1 && transformedConfig[0] ? transformedConfig[0] : transformedConfig;

        // Get formatCommand from request or from config file
        let formatCommand = rawData.formatCommand;
        if (!formatCommand) {
          // Try to read from config file
          try {
            const configPath = path.resolve(context.cwd, context.configPath);
            if (fs.existsSync(configPath)) {
              const raw = fs.readFileSync(configPath, "utf8");
              const rawJson = parse(raw);
              const parsed = typegenConfig.parse(rawJson);
              formatCommand = parsed.postGenerateCommand;
            }
          } catch (_err) {
            // Ignore errors reading config
          }
        }

        // Generate typed clients
        await generateTypedClients(config, {
          cwd: context.cwd,
          formatCommand,
        });

        // Execute post-generate command if provided
        if (formatCommand) {
          try {
            // Run the command exactly as specified
            const [command, ...args] = parseCommandString(formatCommand);
            if (!command) {
              throw new Error("Post-generate command is empty");
            }
            console.log(chalk.blue(`Running post-generate command: ${command} ${args.join(" ")}`));
            await execa(command, args, { cwd: context.cwd });
            console.log(chalk.green("Post-generate command completed successfully"));
          } catch (error) {
            // Log error but don't fail the typegen
            console.log(
              chalk.yellow(
                `Warning: Post-generate command failed: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
        }

        await next();
      },
    )
    // GET /api/layouts
    .get("/layouts", zValidator("query", z.object({ configIndex: z.coerce.number() })), async (c) => {
      const input = c.req.valid("query");
      const configIndex = input.configIndex;

      const result = createDataApiClient(context, configIndex);

      // Check if result is an error
      if ("error" in result) {
        const statusCode = result.statusCode;
        if (statusCode === 400) {
          return c.json(
            {
              error: result.error,
              ...(result.details || {}),
            },
            400,
          );
        }
        if (statusCode === 404) {
          return c.json(
            {
              error: result.error,
              ...(result.details || {}),
            },
            404,
          );
        }
        return c.json(
          {
            error: result.error,
            ...(result.details || {}),
          },
          500,
        );
      }

      const { client } = result;

      // Call layouts method - using type assertion as TypeScript has inference issues with DataApi return type
      // The layouts method exists but TypeScript can't infer it from the complex return type
      try {
        if (!("layouts" in client)) {
          return c.json({ error: "Layouts method not found" }, 500);
        }
        const layoutsResp = (await client.layouts()) as {
          layouts: clientTypes.LayoutOrFolder[];
        };
        const { layouts } = layoutsResp;

        // Flatten the nested layout/folder structure into a flat list with full paths
        const flatLayouts = flattenLayouts(layouts);

        return c.json({ layouts: flatLayouts });
      } catch (err) {
        // Handle connection errors from layouts() call
        let errorMessage = "Failed to fetch layouts";
        let statusCode = 500;
        let suspectedField: "server" | "db" | "auth" | undefined;
        let fmErrorCode: string | undefined;

        if (err instanceof FileMakerError) {
          errorMessage = err.message;
          fmErrorCode = err.code;

          // Infer suspected field from error code
          if (err.code === "105") {
            suspectedField = "db";
            errorMessage = `Database not found: ${err.message}`;
          } else if (err.code === "212" || err.code === "952") {
            suspectedField = "auth";
            errorMessage = `Authentication failed: ${err.message}`;
          }
          statusCode = 400;
        } else if (err instanceof TypeError) {
          errorMessage = `Connection error: ${err.message}`;
          suspectedField = "server";
          statusCode = 400;
        } else if (err instanceof Error) {
          errorMessage = err.message;
          statusCode = 500;
        }

        return c.json(
          {
            error: errorMessage,
            message: errorMessage,
            suspectedField,
            fmErrorCode,
          },
          statusCode as ContentfulStatusCode,
        );
      }
    })
    // GET /api/env-names
    .get("/env-names", zValidator("query", z.object({ envName: z.string() })), (c) => {
      const input = c.req.valid("query");

      const value = process.env[input.envName];

      return c.json({ value });
    })
    .get("/file-exists", zValidator("query", z.object({ path: z.string() })), async (c) => {
      const input = c.req.valid("query");
      const path = input.path;
      const exists = await fs.pathExists(path);
      return c.json({ exists });
    })
    .post(
      "/table-metadata",
      zValidator(
        "json",
        z.object({
          config: typegenConfigSingleRequestForValidation,
          tableName: z.string(),
        }),
      ),
      async (c) => {
        const rawInput = c.req.valid("json");
        // Transform validated data using runtime schema (applies transforms)
        const configWithType =
          "type" in rawInput.config && rawInput.config.type
            ? rawInput.config
            : { ...(rawInput.config as Record<string, unknown>), type: "fmdapi" as const };
        const config = typegenConfigSingle.parse(configWithType);
        const tableName = rawInput.tableName;
        if (config.type !== "fmodata") {
          return c.json({ error: "Invalid config type" }, 400);
        }
        const tableConfig = config.tables.find((t) => t.tableName === tableName);
        try {
          // Download metadata for the specified table
          const tableMetadataXml = await downloadTableMetadata({
            config,
            tableName,
            reduceAnnotations: tableConfig?.reduceMetadata ?? false,
          });
          // Parse the metadata
          const parsedMetadata = await parseMetadata(tableMetadataXml);
          // Convert Maps to objects for JSON serialization
          // Also convert nested Maps (like Properties) to objects
          const serializedMetadata = {
            entityTypes: Object.fromEntries(
              Array.from(parsedMetadata.entityTypes.entries()).map(([key, value]) => [
                key,
                {
                  ...value,
                  Properties: Object.fromEntries(value.Properties),
                },
              ]),
            ),
            entitySets: Object.fromEntries(parsedMetadata.entitySets),
            namespace: parsedMetadata.namespace,
          };
          return c.json({ parsedMetadata: serializedMetadata });
        } catch (err) {
          return c.json(
            {
              error: err instanceof Error ? err.message : "Failed to fetch metadata",
            },
            500,
          );
        }
      },
    )
    .get("/list-tables", zValidator("query", z.object({ config: z.string() })), async (c) => {
      const input = c.req.valid("query");
      // Parse the JSON-encoded config string
      let config: z.infer<typeof typegenConfigSingle>;
      try {
        config = typegenConfigSingle.parse(JSON.parse(input.config));
      } catch (_err) {
        return c.json({ error: "Invalid config format" }, 400);
      }
      if (config.type !== "fmodata") {
        return c.json({ error: "Invalid config type" }, 400);
      }
      try {
        const result = createOdataClientFromConfig(config);
        if ("error" in result) {
          return c.json(
            {
              error: result.error,
              kind: result.kind,
              suspectedField: result.suspectedField,
            },
            result.statusCode as ContentfulStatusCode,
          );
        }
        const { db } = result;
        const tableNames = await db.listTableNames();
        return c.json({ tables: tableNames });
      } catch (err) {
        return c.json(
          {
            error: err instanceof Error ? err.message : "Failed to list tables",
          },
          500,
        );
      }
    })
    // POST /api/test-connection
    .post(
      "/test-connection",
      zValidator("json", z.object({ config: typegenConfigSingleRequestForValidation })),
      async (c) => {
        try {
          const rawData = c.req.valid("json");
          // Transform validated data using runtime schema (applies transforms)
          const configWithType =
            "type" in rawData.config && rawData.config.type
              ? rawData.config
              : { ...(rawData.config as Record<string, unknown>), type: "fmdapi" as const };
          const config = typegenConfigSingle.parse(configWithType);

          // Validate config type
          if (config.type === "fmdapi") {
            // Create client from config
            const clientResult = createClientFromConfig(config);

            // Check if client creation failed
            if ("error" in clientResult) {
              return c.json(
                {
                  ok: false,
                  ...clientResult,
                },
                clientResult.statusCode as ContentfulStatusCode,
              );
            }

            const { client, server, db, authType } = clientResult;

            // Test connection by calling layouts()
            try {
              await client.layouts();

              return c.json({
                ok: true,
                server,
                db,
                authType,
              });
            } catch (err) {
              // Handle connection errors
              let errorMessage = "Failed to connect to FileMaker Data API";
              let statusCode = 500;
              let kind: "connection_error" | "unknown" = "unknown";
              let suspectedField: "server" | "db" | "auth" | undefined;
              let fmErrorCode: string | undefined;

              if (err instanceof FileMakerError) {
                errorMessage = err.message;
                fmErrorCode = err.code;
                kind = "connection_error";

                // Infer suspected field from error code
                // Common FileMaker error codes:
                // 105 = Database not found
                // 212 = Authentication failed
                // 802 = Record not found (less relevant here)
                if (err.code === "105") {
                  suspectedField = "db";
                  errorMessage = `Database not found: ${err.message}`;
                } else if (err.code === "212" || err.code === "952") {
                  suspectedField = "auth";
                  errorMessage = `Authentication failed: ${err.message}`;
                }
                statusCode = 400;
              } else if (err instanceof TypeError) {
                // Network/URL errors
                errorMessage = `Connection error: ${err.message}`;
                suspectedField = "server";
                kind = "connection_error";
                statusCode = 400;
              } else if (err instanceof Error) {
                errorMessage = err.message;
                kind = "connection_error";
                statusCode = 500;
              }

              return c.json(
                {
                  ok: false,
                  error: errorMessage,
                  statusCode,
                  kind,
                  suspectedField,
                  fmErrorCode,
                  message: errorMessage,
                },
                statusCode as ContentfulStatusCode,
              );
            }
          } else if (config.type === "fmodata") {
            const result = createOdataClientFromConfig(config);
            if ("error" in result) {
              return c.json(
                {
                  ok: false,
                  ...result,
                },
                result.statusCode as ContentfulStatusCode,
              );
            }

            const { db, connection, server, dbName, authType } = result;

            if (authType === "username") {
              // Test connection by calling listDatabaseNames() and listTableNames() separately
              // First test: listDatabaseNames() - tests server connection
              try {
                await connection.listDatabaseNames();
              } catch (err) {
                // Handle connection errors from listDatabaseNames()
                let errorMessage = "Failed to connect to FileMaker OData API (listDatabaseNames failed)";
                let statusCode = 500;
                let kind: "connection_error" | "unknown" = "unknown";
                let suspectedField: "server" | "db" | "auth" | undefined;

                if (err instanceof Error) {
                  errorMessage = `listDatabaseNames() failed: ${err.message}`;
                  kind = "connection_error";

                  // Infer suspected field from error message
                  const lowerMessage = errorMessage.toLowerCase();
                  if (
                    lowerMessage.includes("database") ||
                    lowerMessage.includes("not found") ||
                    lowerMessage.includes("404")
                  ) {
                    suspectedField = "db";
                  } else if (
                    lowerMessage.includes("auth") ||
                    lowerMessage.includes("unauthorized") ||
                    lowerMessage.includes("401") ||
                    lowerMessage.includes("403")
                  ) {
                    suspectedField = "auth";
                  } else if (
                    lowerMessage.includes("network") ||
                    lowerMessage.includes("connection") ||
                    lowerMessage.includes("timeout") ||
                    lowerMessage.includes("dns")
                  ) {
                    suspectedField = "server";
                  }

                  // Network/URL errors typically indicate server issues
                  if (err instanceof TypeError) {
                    suspectedField = "server";
                    statusCode = 400;
                  } else {
                    statusCode = 400;
                  }
                }

                return c.json(
                  {
                    ok: false,
                    error: errorMessage,
                    statusCode,
                    kind,
                    suspectedField,
                    message: errorMessage,
                    failedMethod: "listDatabaseNames",
                  },
                  statusCode as ContentfulStatusCode,
                );
              }
            }

            // Second test: listTableNames() - tests database connection
            try {
              await db.listTableNames();

              return c.json({
                ok: true,
                server,
                db: dbName,
                authType,
              });
            } catch (err) {
              // Handle connection errors from listTableNames()
              let errorMessage = "Failed to connect to FileMaker OData API (listTableNames failed)";
              let statusCode = 500;
              let kind: "connection_error" | "unknown" = "unknown";
              let suspectedField: "server" | "db" | "auth" | undefined;

              if (err instanceof Error) {
                errorMessage = `listTableNames() failed: ${err.message}`;
                kind = "connection_error";

                // Infer suspected field from error message
                const lowerMessage = errorMessage.toLowerCase();
                if (
                  lowerMessage.includes("database") ||
                  lowerMessage.includes("not found") ||
                  lowerMessage.includes("404")
                ) {
                  suspectedField = "db";
                } else if (
                  lowerMessage.includes("auth") ||
                  lowerMessage.includes("unauthorized") ||
                  lowerMessage.includes("401") ||
                  lowerMessage.includes("403")
                ) {
                  suspectedField = "auth";
                } else if (
                  lowerMessage.includes("network") ||
                  lowerMessage.includes("connection") ||
                  lowerMessage.includes("timeout") ||
                  lowerMessage.includes("dns")
                ) {
                  suspectedField = "server";
                }

                // Network/URL errors typically indicate server issues
                if (err instanceof TypeError) {
                  suspectedField = "server";
                  statusCode = 400;
                } else {
                  statusCode = 400;
                }
              }

              return c.json(
                {
                  ok: false,
                  error: errorMessage,
                  statusCode,
                  kind,
                  suspectedField,
                  message: errorMessage,
                  failedMethod: "listTableNames",
                },
                statusCode as ContentfulStatusCode,
              );
            }
          } else {
            return c.json(
              {
                ok: false,
                error: "Invalid config type",
              },
              400,
            );
          }
        } catch (err) {
          return c.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : "Unknown error",
              statusCode: 500,
              kind: "unknown",
              message: err instanceof Error ? err.message : "Unknown error",
            },
            500,
          );
        }
      },
    );

  return app;
}

// Export the app type for use in the typed client
// With proper chaining, TypeScript can now infer all route types
export type ApiApp = ReturnType<typeof createApiApp>;
