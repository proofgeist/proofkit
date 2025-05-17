import { DataApi, FetchAdapter } from "../src";
import { upstashTokenStore } from "../src/tokenStore";
import { describe, it } from "vitest";

describe("TokenStorage", () => {
  it("should allow passing upstash to client init", () => {
    DataApi({
      adapter: new FetchAdapter({
        auth: { username: "username", password: "password" },
        db: "db",
        server: "https://example.com",
        tokenStore: upstashTokenStore({
          token: "token",
          url: "https://example.com",
        }),
      }),
      layout: "customer",
    });
  });
  it("shoulw not require a token store", () => {
    DataApi({
      adapter: new FetchAdapter({
        auth: { username: "username", password: "password" },
        db: "db",
        server: "https://example.com",
      }),
      layout: "customer",
    });
  });
});
