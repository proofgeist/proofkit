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

const settingsSchema = z.object({
  auth: authSchema,
  envFile: z.string().default(".env"),
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
}
