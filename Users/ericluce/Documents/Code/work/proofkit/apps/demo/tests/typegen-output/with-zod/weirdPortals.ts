/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import { z } from "zod/v4";
import { Zlong_and_strangeportalNameforTesting as Zlong_and_strangeportalNameforTesting_generated } from "./generated/weirdPortals";

export const Zlong_and_strangeportalNameforTesting = Zlong_and_strangeportalNameforTesting_generated;

export type Tlong_and_strangeportalNameforTesting = z.infer<typeof Zlong_and_strangeportalNameforTesting>;

export const ZweirdPortalsPortals = z.object({
  "long_and_strange.portalName#forTesting": Zlong_and_strangeportalNameforTesting,
});

export type TweirdPortalsPortals = z.infer<typeof ZweirdPortalsPortals>;
