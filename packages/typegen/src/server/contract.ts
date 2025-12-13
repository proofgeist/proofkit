import { z } from "zod/v4";
import { typegenConfigSingle, typegenConfig } from "../types";
import type { ApiApp } from "./app";

// Re-export config types for convenience
export type SingleConfig = z.infer<typeof typegenConfigSingle>;
export type ConfigsArray = z.infer<typeof typegenConfigSingle>[];

// GET /api/config response
export const getConfigResponseSchema = z.object({
  exists: z.boolean(),
  path: z.string(),
  config: z
    .union([z.array(typegenConfigSingle), typegenConfigSingle])
    .nullable(),
});
export type GetConfigResponse = z.infer<typeof getConfigResponseSchema>;

// POST /api/config request
export const postConfigRequestSchema = z.union([
  z.array(typegenConfigSingle),
  typegenConfigSingle,
]);
export type PostConfigRequest = z.infer<typeof postConfigRequestSchema>;

// POST /api/config response
export const postConfigResponseSchema = z.object({
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
});
export type PostConfigResponse = z.infer<typeof postConfigResponseSchema>;

// POST /api/run request (stub)
export const runTypegenRequestSchema = z.object({
  config: z
    .union([z.array(typegenConfigSingle), typegenConfigSingle])
    .optional(),
});
export type RunTypegenRequest = z.infer<typeof runTypegenRequestSchema>;

// POST /api/run response (stub)
export const runTypegenResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  message: z.string().optional(),
});
export type RunTypegenResponse = z.infer<typeof runTypegenResponseSchema>;

// GET /api/layouts response (stub)
export const getLayoutsResponseSchema = z.object({
  layouts: z.array(
    z.object({
      layoutName: z.string(),
      schemaName: z.string().optional(),
    }),
  ),
});
export type GetLayoutsResponse = z.infer<typeof getLayoutsResponseSchema>;

// GET /api/env-names response
export const getEnvNamesResponseSchema = z.object({
  value: z.string().optional(),
});
export type GetEnvNamesResponse = z.infer<typeof getEnvNamesResponseSchema>;

// Re-export ApiApp type for client usage
export type { ApiApp };
