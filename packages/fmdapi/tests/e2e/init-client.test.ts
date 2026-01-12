import { describe, expect, test } from "vitest";
import { FileMakerError } from "../../src";
import { client, invalidLayoutClient } from "../setup";

describe("client methods (otto 4)", () => {
  test("list", async () => {
    await client.list();
  });
  test("list with limit param", async () => {
    await client.list({ limit: 1 });
  });
  test("missing layout should error", async () => {
    await invalidLayoutClient.list().catch((err) => {
      expect(err).toBeInstanceOf(FileMakerError);
      expect(err.code).toBe("105"); // missing layout error
    });
  });
});
