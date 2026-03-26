import { describe, expect, it } from "vitest";
import { formatBatchRequest, toBatchSubRequestUrl } from "../src/client/batch-request";

describe("toBatchSubRequestUrl", () => {
  it("strips /otto/ prefix and .fmp12 extension", () => {
    const result = toBatchSubRequestUrl(
      "https://host.example.com/otto/fmi/odata/v4/GMT_Web.fmp12/bookings?$top=1&$select=_GMTNum",
    );
    expect(result).toBe("/fmi/odata/v4/GMT_Web/bookings?$top=1&$select=_GMTNum");
  });

  it("strips .fmp12 extension without /otto/ prefix", () => {
    const result = toBatchSubRequestUrl("https://host.example.com/fmi/odata/v4/GMT_Web.fmp12/bookings");
    expect(result).toBe("/fmi/odata/v4/GMT_Web/bookings");
  });

  it("handles URLs without /otto/ or .fmp12", () => {
    const result = toBatchSubRequestUrl("https://host.example.com/fmi/odata/v4/MyDB/contacts");
    expect(result).toBe("/fmi/odata/v4/MyDB/contacts");
  });

  it("preserves query parameters", () => {
    const result = toBatchSubRequestUrl(
      "https://host.example.com/otto/fmi/odata/v4/MyDB.fmp12/contacts?$filter=name eq 'test'&$top=10",
    );
    expect(result).toBe("/fmi/odata/v4/MyDB/contacts?$filter=name%20eq%20%27test%27&$top=10");
  });
});

describe("formatBatchRequest sub-request URLs", () => {
  it("uses canonical paths without /otto/ prefix or .fmp12 in sub-requests", () => {
    const baseUrl = "https://host.example.com/otto/fmi/odata/v4/GMT_Web.fmp12";
    const { body } = formatBatchRequest(
      [{ method: "GET", url: `${baseUrl}/bookings?$top=1&$select=_GMTNum` }],
      baseUrl,
    );

    // The sub-request line must use the canonical path
    expect(body).toContain("GET /fmi/odata/v4/GMT_Web/bookings?$top=1&$select=_GMTNum HTTP/1.1");
    // Must NOT contain the otto prefix or .fmp12 in the request line
    expect(body).not.toContain("/otto/");
    expect(body).not.toContain(".fmp12");
  });

  it("handles relative URLs by prepending baseUrl then transforming", () => {
    const baseUrl = "https://host.example.com/otto/fmi/odata/v4/MyDB.fmp12";
    const { body } = formatBatchRequest([{ method: "GET", url: "/contacts?$top=5" }], baseUrl);

    expect(body).toContain("GET /fmi/odata/v4/MyDB/contacts?$top=5 HTTP/1.1");
  });
});
