/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import { z } from "zod";
import {
  Ztest as Ztest_generated,
  ZVLYesNo as ZVLYesNo_generated,
  ZtestLayout as ZtestLayout_generated,
} from "./generated/testLayout";
import type { InferZodPortals } from "@proofkit/fmdapi";

export const Ztest = Ztest_generated;

export type Ttest = z.infer<typeof Ztest>;

export const ZVLYesNo = ZVLYesNo_generated;

export type TVLYesNo = z.infer<typeof ZVLYesNo>;

export const ZtestLayout = ZtestLayout_generated;

export type TtestLayout = z.infer<typeof ZtestLayout>;

export const ZtestLayoutPortals = {
  test: Ztest,
};

export type TtestLayoutPortals = InferZodPortals<typeof ZtestLayoutPortals>;
