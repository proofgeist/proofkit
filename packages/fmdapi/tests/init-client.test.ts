import { describe, expect, test } from "vitest";
import { DataApi, FetchAdapter, FileMakerError, OttoAdapter } from "../src";
import memoryStore from "../src/tokenStore/memory";
import { client, invalidLayoutClient } from "./setup";

describe("try to init client", () => {
  test("without server", () => {
    expect(() => {
      return DataApi({
        adapter: new OttoAdapter({
          auth: { apiKey: "dk_anything" },
          db: "anything",
          server: "",
        }),
        layout: "customer",
      });
    }).toThrow();
  });
  test("without https", () => {
    expect(() =>
      DataApi({
        adapter: new OttoAdapter({
          auth: { apiKey: "dk_anything" },
          db: "anything",
          server: "http://example.com",
        }),
        layout: "customer",
      }),
    ).not.toThrow();
  });
  test("without db", () => {
    expect(
      () =>
        new OttoAdapter({
          auth: { apiKey: "dk_anything" },
          db: "",
          server: "https://example.com",
        }),
    ).toThrow();
  });
  test("without auth", () => {
    expect(() =>
      DataApi({
        // @ts-expect-error the auth object is missing properties
        auth: {},
        db: "anything",
        server: "https://example.com",
        tokenStore: memoryStore(),
      }),
    ).toThrow();
  });

  test("without password", () => {
    expect(() =>
      DataApi({
        adapter: new FetchAdapter({
          auth: { username: "anything", password: "" },
          db: "anything",
          server: "https://example.com",
          tokenStore: memoryStore(),
        }),
        layout: "customer",
      }),
    ).toThrow();
  });
  test("without username", () => {
    expect(() =>
      DataApi({
        adapter: new FetchAdapter({
          auth: { username: "", password: "anything" },
          db: "anything",
          server: "https://example.com",
          tokenStore: memoryStore(),
        }),
        layout: "customer",
      }),
    ).toThrow();
  });
  test("without apiKey", () => {
    expect(() =>
      DataApi({
        adapter: new OttoAdapter({
          // @ts-expect-error invalid api KEY
          auth: { apiKey: "" },
          db: "anything",
          server: "https://example.com",
        }),
        layout: "customer",
      }),
    ).toThrow();
  });
  test("with too much auth (otto3)", () => {
    const client = DataApi({
      adapter: new OttoAdapter({
        auth: {
          apiKey: "KEY_anything",
          // @ts-expect-error too much auth
          username: "anything",
          password: "anything",
        },
        db: "anything",
        server: "https://example.com",
      }),
      layout: "customer",
    });
    expect(client.baseUrl.toString()).toContain(":3030");
  });
  test("with too much auth (otto4)", () => {
    const client = DataApi({
      adapter: new OttoAdapter({
        auth: {
          apiKey: "dk_anything",
          // @ts-expect-error too much auth
          username: "anything",
          password: "anything",
        },
        db: "anything",
        server: "https://example.com",
      }),
      layout: "customer",
    });
    expect(client.baseUrl.toString()).toContain("/otto/");
  });
});

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
