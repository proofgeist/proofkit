import path from "path";
import fs from "fs-extra";
import { z } from "zod";

const authSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("clerk"),
  }),
  z.object({
    type: z.literal("next-auth"),
  }),
  z.object({
    type: z.literal("none"),
  }),
]);

export const dataSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fm"),
    name: z.string(),
    envNames: z
      .object({
        database: z.string().default("FM_DATABASE"),
        server: z.string().default("FM_SERVER"),
        apiKey: z.string().default("OTTO_API_KEY"),
      })
      .default({}),
  }),
  z.object({
    type: z.literal("supabase"),
    name: z.string(),
  }),
]);

const settingsSchema = z.object({
  auth: authSchema,
  envFile: z.string().default(".env"),
  dataSources: z.array(dataSourceSchema).default([]),
});

export const parseSettings = (projectDir?: string) => {
  const settings: Settings = fs.readJSONSync(
    path.join(projectDir ?? process.cwd(), "proofkit.json")
  ) as Settings;
  return settingsSchema.parse(settings);
};

export type Settings = z.infer<typeof settingsSchema>;

export function setSettings(settings: Settings, projectDir?: string) {
  fs.writeJSONSync(
    path.join(projectDir ?? process.cwd(), "proofkit.json"),
    settings,
    {
      spaces: 2,
    }
  );
  return settings;
}
