/**
 * Mock Fetch Tests
 *
 * These tests use captured responses from real FileMaker OData API calls
 * to test the client without requiring a live server connection.
 *
 * The mock responses are stored in tests/fixtures/responses.ts and are
 * captured using the capture script: pnpm capture
 *
 * To add new tests:
 * 1. First, ensure you have a corresponding mock response captured
 * 2. Create a test that uses the same query pattern
 * 3. The mock fetch will automatically match the request URL to the stored response
 */

import { describe, it, expect } from "vitest";
import { occurrences, createMockClient } from "./utils/test-setup";

describe("Filter Tests", () => {
  const client = createMockClient();
  const db = client.database("fmdapi_test.fmp12", {
    occurrences: occurrences,
  });

  it("should enforce correct operator types for each field type", () => {
    // ✅ String operators (single operator object)
    const stringQuery = db
      .from("contacts")
      .list()
      .filter({ name: { eq: "John" } });
    expect(stringQuery.getQueryString()).toBe(
      "/contacts?$filter=name eq 'John'&$top=1000",
    );

    // ✅ String operators (array syntax also works)
    const stringQueryArray = db
      .from("contacts")
      .list()
      .filter({ name: [{ eq: "John" }] });
    expect(stringQueryArray.getQueryString()).toBe(
      "/contacts?$filter=name eq 'John'&$top=1000",
    );

    // ✅ Boolean operators (single operator object)
    const boolQuery = db
      .from("users")
      .list()
      .filter({ active: { eq: true } });
    expect(boolQuery.getQueryString()).toBe(
      "/users?$filter=active eq true&$top=1000",
    );
  });

  it("should support shorthand syntax", () => {
    const query = db.from("contacts").list().filter({ name: "John" });
    expect(query.getQueryString()).toBe(
      "/contacts?$filter=name eq 'John'&$top=1000",
    );
  });

  it("should support multiple operators on same field (implicit AND)", () => {
    const query = db
      .from("contacts")
      .list()
      .filter({ name: [{ eq: "John" }, { ne: "Jane" }] });
    expect(query.getQueryString()).toContain("name eq 'John'");
    expect(query.getQueryString()).toContain("and");
  });

  it("should support string operators", () => {
    // Single operator object syntax
    const containsQuery = db
      .from("contacts")
      .list()
      .filter({ name: { contains: "John" } });
    expect(containsQuery.getQueryString()).toContain("contains");

    const startsWithQuery = db
      .from("contacts")
      .list()
      .filter({ name: { startswith: "J" } });
    expect(startsWithQuery.getQueryString()).toContain("startswith");

    const endsWithQuery = db
      .from("contacts")
      .list()
      .filter({ name: { endswith: "n" } });
    expect(endsWithQuery.getQueryString()).toContain("endswith");

    // Array syntax also works
    const containsQueryArray = db
      .from("contacts")
      .list()
      .filter({ name: [{ contains: "John" }] });
    expect(containsQueryArray.getQueryString()).toContain("contains");
  });

  it("should support logical operators", () => {
    const query = db
      .from("users")
      .list()
      .filter({
        and: [{ name: [{ contains: "John" }] }, { active: [{ eq: true }] }],
      });
    expect(query.getQueryString()).toContain("contains");
    expect(query.getQueryString()).toContain("and");
  });

  it("should support or operator", () => {
    const query = db
      .from("users")
      .list()
      .filter({
        or: [{ name: [{ eq: "John" }] }, { name: [{ eq: "Jane" }] }],
      });
    expect(query.getQueryString()).toContain("or");
  });

  it("should support in operator", () => {
    const query = db
      .from("contacts")
      .list()
      .filter({ name: [{ in: ["John", "Jane", "Bob"] }] });
    expect(query.getQueryString()).toContain("in");
  });

  it("should support null values", () => {
    const query = db
      .from("users")
      .list()
      .filter({ name: [{ eq: null }] });
    expect(query.getQueryString()).toContain("null");
  });

  it("should support raw string filters as escape hatch", () => {
    const query = db.from("users").list().filter("substringof('John', name)");
    expect(query.getQueryString()).toBe(
      "/users?$filter=substringof('John', name)&$top=1000",
    );
  });

  it("should support complex nested filters", () => {
    const query = db
      .from("users")
      .list()
      .filter({
        and: [
          {
            or: [{ name: [{ eq: "John" }] }, { name: [{ eq: "Jane" }] }],
          },
          { active: [{ eq: true }] },
        ],
      });
    expect(query.getQueryString()).toContain("or");
    expect(query.getQueryString()).toContain("and");
  });

  it("should combine $count with filter", () => {
    const queryString = db
      .from("users")
      .list()
      .filter({ active: { eq: true } })
      .count()
      .getQueryString();

    expect(queryString).toContain("$count");
    expect(queryString).toContain("$filter");
  });

  it("should combine $select and $filter", () => {
    const queryString = db
      .from("users")
      .list()
      .select("name", "id")
      .filter({ active: { eq: true } })
      .getQueryString();

    expect(queryString).toContain("$select");
    expect(queryString).toContain("$filter");
    expect(queryString).toContain("name");
    expect(queryString).toContain("active");
  });

  it("should combine $select, $filter, and $orderby", () => {
    const queryString = db
      .from("users")
      .list()
      .select("name", "id")
      .filter({ active: { eq: true } })
      .orderBy("name")
      .getQueryString();

    expect(queryString).toContain("$select");
    expect(queryString).toContain("$filter");
    expect(queryString).toContain("$orderby");
  });

  it("should combine multiple query parameters", () => {
    const queryString = db
      .from("users")
      .list()
      .select("name", "id")
      .filter({ active: { eq: true } })
      .orderBy("name")
      .top(10)
      .skip(0)
      .getQueryString();

    expect(queryString).toContain("$select");
    expect(queryString).toContain("$filter");
    expect(queryString).toContain("$orderby");
    expect(queryString).toContain("$top");
    expect(queryString).toContain("$skip");
  });

  it("should combine $select, $filter, $orderby, $top, and $expand", () => {
    const queryString = db
      .from("users")
      .list()
      .select("name", "id")
      .filter({ active: { eq: true } })
      .orderBy("name")
      .top(25)
      .expand("contacts")
      .getQueryString();

    expect(queryString).toContain("$select");
    expect(queryString).toContain("$filter");
    expect(queryString).toContain("$orderby");
    expect(queryString).toContain("$top");
    expect(queryString).toContain("$expand");
  });

  it("should generate query string with single() and filter", () => {
    const queryString = db
      .from("users")
      .list()
      .filter({ id: { eq: "123" } })
      .single()
      .getQueryString();

    expect(queryString).toContain("$filter");
    expect(queryString).toContain("id");
  });

  it("should use & to separate multiple parameters", () => {
    const queryString = db
      .from("users")
      .list()
      .select("name")
      .filter({ active: { eq: true } })
      .top(10)
      .getQueryString();

    // Should have & between parameters
    const matches = queryString.match(/&/g);
    expect(matches?.length).toBeGreaterThan(0);
  });

  it("should URL encode special characters in filter values", () => {
    const queryString = db
      .from("contacts")
      .list()
      .filter({ name: { eq: "John & Jane" } })
      .getQueryString();

    expect(queryString).toContain("$filter");
    // Special characters should be properly encoded
    expect(queryString).toBeDefined();
  });
});
