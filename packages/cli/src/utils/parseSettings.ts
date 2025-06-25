import path from "path";
import fs from "fs-extra";
import { z } from "zod/v4";

import { state } from "~/state.js";

const authSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("clerk"),
    }),
    z.object({
      type: z.literal("next-auth"),
    }),
    z.object({
      type: z.literal("proofkit").transform(() => "fmaddon"),
    }),
    z.object({
      type: z.literal("fmaddon"),
    }),
    z.object({
      type: z.literal("none"),
    }),
  ])
  .default({ type: "none" });

export const envNamesSchema = z.object({
  database: z.string().default("FM_DATABASE"),
  server: z.string().default("FM_SERVER"),
  apiKey: z.string().default("OTTO_API_KEY"),
});
export const dataSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fm"),
    name: z.string(),
    envNames: envNamesSchema,
  }),
  z.object({
    type: z.literal("supabase"),
    name: z.string(),
  }),
]);
export type DataSource = z.infer<typeof dataSourceSchema>;

export const appTypes = ["browser", "webviewer"] as const;

const settingsSchema = z.object({
  appType: z.enum(appTypes).default("browser"),
  auth: authSchema,
  envFile: z.string().default(".env"),
  dataSources: z.array(dataSourceSchema).default([]),
  tanstackQuery: z.boolean().catch(false),
  replacedMainPage: z.boolean().catch(false),
  appliedUpgrades: z.array(z.string()).default([]),
});

export const defaultSettings = settingsSchema.parse({ auth: { type: "none" } });

let settings: Settings | undefined;
export const getSettings = () => {
  if (settings) return settings;

  const settingsFile: unknown = fs.readJSONSync(
    path.join(state.projectDir, "proofkit.json")
  );

  const parsed = settingsSchema.parse(settingsFile);
  settings = parsed;
  state.appType = parsed.appType;
  return settings;
};

export type Settings = z.infer<typeof settingsSchema>;

export function mergeSettings(_settings: Partial<Settings>) {
  const settings = getSettings();
  setSettings({ ...settings, ..._settings });
}

export function setSettings(_settings: Settings) {
  fs.writeJSONSync(path.join(state.projectDir, "proofkit.json"), _settings, {
    spaces: 2,
  });
  settings = _settings;
  return settings;
}
