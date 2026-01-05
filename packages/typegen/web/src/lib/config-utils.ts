import { z } from "zod/v4";
import { configSchema } from "./schema";

export type SingleConfig = z.infer<typeof configSchema>;

export const configsArraySchema = z.array(configSchema);
export type ConfigsArray = z.infer<typeof configsArraySchema>;
