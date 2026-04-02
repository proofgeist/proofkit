import { Cause } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NonInteractiveInputError } from "~/core/errors.js";
import { renderFailure } from "~/index.js";

describe("renderFailure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders tagged cli errors without squashing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderFailure(
      Cause.fail(
        new NonInteractiveInputError({
          message: "typed failure",
        }),
      ),
      false,
    );

    expect(errorSpy).toHaveBeenCalledWith("typed failure");
  });

  it("renders unknown defects via squash", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderFailure(Cause.die(new Error("boom")), false);

    expect(errorSpy).toHaveBeenCalledWith("boom");
  });
});
