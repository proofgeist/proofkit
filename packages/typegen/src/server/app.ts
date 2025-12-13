import { Hono } from "hono";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import fs from "fs-extra";
import path from "path";
import { parse } from "jsonc-parser";
import { typegenConfig, typegenConfigSingle } from "../types";
import z from "zod/v4";
import { type clientTypes, FileMakerError } from "@proofkit/fmdapi";
import {
  createDataApiClient,
  createClientFromConfig,
} from "./createDataApiClient";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { generateTypedClients } from "../typegen";

export interface ApiContext {
  cwd: string;
  configPath: string;
}

export const devOnlyLogger = (message: string, ...rest: string[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(message, ...rest);
  }
};

/**
 * Flattens a nested layout/folder structure into a flat list with full paths
 */
function flattenLayouts(
  layouts: clientTypes.LayoutOrFolder[],
  parentPath: string = "",
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
  // Define all routes with proper chaining for type inference
  const app = new Hono()
    .use(logger(devOnlyLogger))
    .basePath("/api")

    // GET /api/config
    .get("/config", async (c) => {
      const { configPath } = context;
      const fullPath = path.resolve(context.cwd, configPath);

      const exists = fs.existsSync(fullPath);

      if (!exists) {
        return c.json({
          exists: false,
          path: configPath,
          config: null,
        });
      }

      try {
        const raw = fs.readFileSync(fullPath, "utf8");
        const rawJson = parse(raw);
        const parsed = typegenConfig.parse(rawJson);

        return c.json({
          exists: true,
          path: configPath,
          config: parsed.config,
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
          config: z.array(typegenConfigSingle),
        }),
      ),
      async (c) => {
        try {
          const data = c.req.valid("json");

          // Validate with Zod (data is already { config: [...] })
          const validation = typegenConfig.safeParse(data);

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
          const jsonContent = JSON.stringify(validation.data, null, 2) + "\n";

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
    // POST /api/run (stub)
    .post(
      "/run",
      zValidator(
        "json",
        z.object({
          config: z.union([z.array(typegenConfigSingle), typegenConfigSingle]),
        }),
      ),
      async (c, next) => {
        const data = c.req.valid("json");
        const config = data.config;

        await generateTypedClients(config);
        await next();
      },
    )
    // GET /api/layouts
    .get(
      "/layouts",
      zValidator("query", z.object({ configIndex: z.coerce.number() })),
      async (c) => {
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
          } else if (statusCode === 404) {
            return c.json(
              {
                error: result.error,
                ...(result.details || {}),
              },
              404,
            );
          } else {
            return c.json(
              {
                error: result.error,
                ...(result.details || {}),
              },
              500,
            );
          }
        }

        const { client } = result;

        // Call layouts method - using type assertion as TypeScript has inference issues with DataApi return type
        // The layouts method exists but TypeScript can't infer it from the complex return type
        try {
          const layoutsResp = (await (client as any).layouts()) as {
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
      },
    )
    // GET /api/env-names
    .get(
      "/env-names",
      zValidator("query", z.object({ envName: z.string() })),
      async (c) => {
        const input = c.req.valid("query");

        const value = process.env[input.envName];

        return c.json({ value });
      },
    )
    // POST /api/test-connection
    .post(
      "/test-connection",
      zValidator("json", z.object({ config: typegenConfigSingle })),
      async (c) => {
        try {
          const data = c.req.valid("json");
          const config = data.config;

          // Validate config type
          if (config.type !== "fmdapi") {
            return c.json(
              {
                ok: false,
                error: "Only fmdapi config type is supported",
                statusCode: 400,
                kind: "unknown",
                message: "Only fmdapi config type is supported",
              },
              400,
            );
          }

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
            const layoutsResp = (await (client as any).layouts()) as {
              layouts: clientTypes.LayoutOrFolder[];
            };

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
