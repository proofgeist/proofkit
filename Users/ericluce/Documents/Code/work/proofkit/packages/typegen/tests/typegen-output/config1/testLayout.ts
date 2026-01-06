/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import { z } from "zod/v4";
import {
  Ztest as Ztest_generated,
  ZtestLayout as ZtestLayout_generated,
  ZVLYesNo as ZVLYesNo_generated,
} from "./generated/testLayout";

export const Ztest = Ztest_generated;

export type Ttest = z.infer<typeof Ztest>;

export const ZVLYesNo = ZVLYesNo_generated;

export type TVLYesNo = z.infer<typeof ZVLYesNo>;

export const ZtestLayout = ZtestLayout_generated;

export type TtestLayout = z.infer<typeof ZtestLayout>;

export const ZtestLayoutPortals = z.object({
  test: Ztest,
});

export type TtestLayoutPortals = z.infer<typeof ZtestLayoutPortals>;
