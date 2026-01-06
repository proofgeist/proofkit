/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type {
  Ttest as Ttest_generated,
  TtestLayout as TtestLayout_generated,
  TVLYesNo as TVLYesNo_generated,
} from "./generated/testLayout";

export type Ttest = Ttest_generated;
export type TVLYesNo = TVLYesNo_generated;
export type TtestLayout = TtestLayout_generated;
export type TtestLayoutPortals = {
  test: Ttest;
};
