import type { Effect as Fx } from "effect";
import { Cause, Effect, Exit } from "effect";
import { getOrUndefined } from "effect/Option";

export async function getFailure<A, E>(effect: Fx.Effect<A, E, never>) {
  const exit = await Effect.runPromiseExit(effect);
  if (!Exit.isFailure(exit)) {
    throw new Error("Expected effect to fail.");
  }
  const failure = getOrUndefined(Cause.failureOption(exit.cause));
  if (!failure) {
    throw new Error("Expected failure cause.");
  }
  return failure;
}
