/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod";
import { Zcustomer as Zcustomer_generated } from "./generated/customer";

export const Zcustomer = Zcustomer_generated;

export type Tcustomer = z.infer<typeof Zcustomer>;
