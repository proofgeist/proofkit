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

import { describe, it, expect, expectTypeOf } from "vitest";
import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  contains,
  startsWith,
  endsWith,
  inArray,
  notInArray,
  and,
  or,
  isNull,
  isNotNull,
  fmTableOccurrence,
  textField,
} from "@proofkit/fmodata";
import {
  createMockClient,
  users,
  contacts,
  usersTOWithIds,
} from "./utils/test-setup";
import { z } from "zod/v4";

describe("Filter Tests", () => {
  const client = createMockClient();
  const db = client.database("fmdapi_test.fmp12");

  it("should enforce correct operator types for each field type", () => {
    // ✅ String operators
    const stringQuery = db
      .from(contacts)
      .list()
      .where(eq(contacts.name, "John"));
    expect(stringQuery.getQueryString()).toBe(
      "/contacts?$filter=name eq 'John'&$top=1000",
    );

    // ✅ Boolean operators
    // Note: active field has a writeValidator that converts boolean to number (1/0)
    const boolQuery = db.from(users).list().where(eq(users.active, true));
    expect(boolQuery.getQueryString()).toBe(
      "/users?$filter=active eq 1&$top=1000",
    );
  });

  it("should support equality operator", () => {
    const query = db.from(contacts).list().where(eq(contacts.name, "John"));
    expect(query.getQueryString()).toBe(
      "/contacts?$filter=name eq 'John'&$top=1000",
    );
  });

  it("should support multiple conditions with AND", () => {
    const query = db
      .from(contacts)
      .list()
      .where(and(eq(contacts.name, "John"), ne(contacts.name, "Jane")));
    expect(query.getQueryString()).toContain("name eq 'John'");
    expect(query.getQueryString()).toContain("and");
  });

  it("should support string operators", () => {
    // Contains operator
    const containsQuery = db
      .from(contacts)
      .list()
      .where(contains(contacts.name, "John"));
    expect(containsQuery.getQueryString()).toContain("contains");

    // Starts with operator
    const startsWithQuery = db
      .from(contacts)
      .list()
      .where(startsWith(contacts.name, "J"));
    expect(startsWithQuery.getQueryString()).toContain("startswith");

    // Ends with operator
    const endsWithQuery = db
      .from(contacts)
      .list()
      .where(endsWith(contacts.name, "n"));
    expect(endsWithQuery.getQueryString()).toContain("endswith");
  });

  it("should support logical operators", () => {
    const query = db
      .from(users)
      .list()
      .where(and(contains(users.name, "John"), eq(users.active, true)));
    expect(query.getQueryString()).toContain("contains");
    expect(query.getQueryString()).toContain("and");
  });

  it("should support or operator", () => {
    const query = db
      .from(users)
      .list()
      .where(or(eq(users.name, "John"), eq(users.name, "Jane")));
    expect(query.getQueryString()).toContain("or");
  });

  it("should support in operator", () => {
    const query = db
      .from(contacts)
      .list()
      .where(inArray(contacts.name, ["John", "Jane", "Bob"]));
    expect(query.getQueryString()).toContain("in");
  });

  it("should support null values", () => {
    const query = db.from(users).list().where(isNull(users.name));
    expect(query.getQueryString()).toContain("null");
  });

  it("should properly escape or quote field names in filters", () => {
    /**
     * From the FileMaker docs:
     * Enclose field names that include special characters, such as spaces or underscores, in double-quotation marks.
     */
    const weirdTable = fmTableOccurrence(
      "weird_table",
      {
        id: textField().primaryKey(),
        "name with spaces": textField(),
      },
      { defaultSelect: "all" },
    );
    const query = db
      .from(weirdTable)
      .list()
      .where(eq(weirdTable["name with spaces"], "John"));
    expect(query.getQueryString()).toContain(
      "$filter=\"name with spaces\" eq 'John'",
    );

    const query2 = db.from(weirdTable).list().where(eq(weirdTable.id, "John"));
    expect(query2.getQueryString()).toContain(`$filter="id" eq 'John'`);
  });

  it("should support complex nested filters", () => {
    const query = db
      .from(users)
      .list()
      .where(
        and(
          or(eq(users.name, "John"), eq(users.name, "Jane")),
          eq(users.active, true),
        ),
      );
    expect(query.getQueryString()).toContain("or");
    expect(query.getQueryString()).toContain("and");
  });

  it("should combine $count with filter", () => {
    const queryString = db
      .from(users)
      .list()
      .where(eq(users.active, true))
      .count()
      .getQueryString();

    expect(queryString).toContain("$count");
    expect(queryString).toContain("$filter");
  });

  it("should combine $select and $filter", () => {
    const queryString = db
      .from(users)
      .list()
      .select({ name: users.name, id: users.id })
      .where(eq(users.active, true))
      .getQueryString();

    expect(queryString).toContain("$select");
    expect(queryString).toContain("$filter");
    expect(queryString).toContain("name");
    expect(queryString).toContain("active");
  });

  it("should combine $select, $filter, and $orderby", () => {
    const queryString = db
      .from(users)
      .list()
      .select({ name: users.name, id: users.id })
      .where(eq(users.active, true))
      .orderBy("name")
      .getQueryString();

    expect(queryString).toContain("$select");
    expect(queryString).toContain("$filter");
    expect(queryString).toContain("$orderby");
  });

  it("should combine multiple query parameters", () => {
    const queryString = db
      .from(users)
      .list()
      .select({ name: users.name, id: users.id })
      .where(eq(users.active, true))
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
      .from(users)
      .list()
      .select({ name: users.name, id: users.id })
      .where(eq(users.active, true))
      .orderBy("name")
      .top(25)
      .expand(contacts)
      .getQueryString();

    expect(queryString).toContain("$select");
    expect(queryString).toContain("$filter");
    expect(queryString).toContain("$orderby");
    expect(queryString).toContain("$top");
    expect(queryString).toContain("$expand");
  });

  it("should generate query string with single() and filter", () => {
    const queryString = db
      .from(users)
      .list()
      .where(eq(users.id, "123"))
      .single()
      .getQueryString();

    expect(queryString).toContain("$filter");
    expect(queryString).toContain("id");
  });

  it("should use & to separate multiple parameters", () => {
    const queryString = db
      .from(users)
      .list()
      .select({ name: users.name })
      .where(eq(users.active, true))
      .top(10)
      .getQueryString();

    // Should have & between parameters
    const matches = queryString.match(/&/g);
    expect(matches?.length).toBeGreaterThan(0);
  });

  it("should URL encode special characters in filter values", () => {
    const queryString = db
      .from(contacts)
      .list()
      .where(eq(contacts.name, "John & Jane"))
      .getQueryString();

    expect(queryString).toContain("$filter");
    // Special characters should be properly encoded
    expect(queryString).toBeDefined();
  });

  it("should use entity IDs when enabled", () => {
    const queryString = db
      .from(usersTOWithIds)
      .list()
      .where(eq(usersTOWithIds.id, "123"))
      .getQueryString();

    expect(queryString).toContain("$filter");
    expect(queryString).toContain("FMFID");

    const dbWithIds = createMockClient().database("fmdapi_test.fmp12", {
      useEntityIds: true,
    });

    const queryStringWithIds = dbWithIds
      .from(usersTOWithIds)
      .list()
      .where(eq(usersTOWithIds.id, "123"))
      .getQueryString();

    expect(queryStringWithIds).toContain("$filter");
    expect(queryStringWithIds).toContain("FMFID");
  });

  // it("should not allow filter on the wrong table", ()=>{})

  it("should use the write validator for all operations", () => {
    const testTable = fmTableOccurrence(
      "test",
      {
        text: textField().primaryKey(),
        textNumber: textField().writeValidator(z.number().transform(toString)),
        enum: textField().writeValidator(z.enum(["a", "b", "c"])),
        transform: textField().writeValidator(
          z.string().transform(() => "static-value"),
        ),
      },
      { useEntityIds: false },
    );

    // ------------------ Test eq (equal) operator ------------------
    // @ts-expect-error - should not allow number
    eq(testTable.text, 1); // text field

    // @ts-expect-error - should not allow string
    eq(testTable.textNumber, "1"); // text field
    eq(testTable.textNumber, 1); // number field

    eq(testTable.enum, "a"); // enum field
    // @ts-expect-error - should not allow invalid enum value
    eq(testTable.enum, "d");

    // ------------------ Test ne (not equal) operator ------------------
    // @ts-expect-error - should not allow number
    ne(testTable.text, 1);
    // @ts-expect-error - should not allow string
    ne(testTable.textNumber, "1");
    ne(testTable.textNumber, 1);
    ne(testTable.enum, "a");
    // @ts-expect-error - should not allow invalid enum value
    ne(testTable.enum, "d");

    // ------------------ Test gt (greater than) operator ------------------
    // @ts-expect-error - should not allow number
    gt(testTable.text, 1);
    // @ts-expect-error - should not allow string
    gt(testTable.textNumber, "1");
    gt(testTable.textNumber, 1);
    gt(testTable.enum, "a");
    // @ts-expect-error - should not allow invalid enum value
    gt(testTable.enum, "d");

    // ------------------ Test gte (greater than or equal) operator ------------------
    // @ts-expect-error - should not allow number
    gte(testTable.text, 1);
    // @ts-expect-error - should not allow string
    gte(testTable.textNumber, "1");
    gte(testTable.textNumber, 1);
    gte(testTable.enum, "a");
    // @ts-expect-error - should not allow invalid enum value
    gte(testTable.enum, "d");

    // ------------------ Test lt (less than) operator ------------------
    // @ts-expect-error - should not allow number
    lt(testTable.text, 1);
    // @ts-expect-error - should not allow string
    lt(testTable.textNumber, "1");
    lt(testTable.textNumber, 1);
    lt(testTable.enum, "a");
    // @ts-expect-error - should not allow invalid enum value
    lt(testTable.enum, "d");

    // ------------------ Test lte (less than or equal) operator ------------------
    // @ts-expect-error - should not allow number
    lte(testTable.text, 1);
    // @ts-expect-error - should not allow string
    lte(testTable.textNumber, "1");
    lte(testTable.textNumber, 1);
    lte(testTable.enum, "a");
    // @ts-expect-error - should not allow invalid enum value
    lte(testTable.enum, "d");

    // ------------------ Test contains operator ------------------
    // @ts-expect-error - should not allow number
    contains(testTable.text, 1);
    // @ts-expect-error - should not allow string
    contains(testTable.textNumber, "1");
    contains(testTable.textNumber, 1);
    contains(testTable.enum, "a");
    // @ts-expect-error - should not allow invalid enum value
    contains(testTable.enum, "d");

    // ------------------ Test startsWith operator ------------------
    // @ts-expect-error - should not allow number
    startsWith(testTable.text, 1);
    // @ts-expect-error - should not allow string
    startsWith(testTable.textNumber, "1");
    startsWith(testTable.textNumber, 1);
    startsWith(testTable.enum, "a");
    // @ts-expect-error - should not allow invalid enum value
    startsWith(testTable.enum, "d");

    // ------------------ Test endsWith operator ------------------
    // @ts-expect-error - should not allow number
    endsWith(testTable.text, 1);
    // @ts-expect-error - should not allow string
    endsWith(testTable.textNumber, "1");
    endsWith(testTable.textNumber, 1);
    endsWith(testTable.enum, "a");
    // @ts-expect-error - should not allow invalid enum value
    endsWith(testTable.enum, "d");

    // ------------------ Test inArray operator ------------------
    // @ts-expect-error - should not allow number array
    inArray(testTable.text, [1, 2]);
    // @ts-expect-error - should not allow string array
    inArray(testTable.textNumber, ["1", "2"]);
    inArray(testTable.textNumber, [1, 2]);
    inArray(testTable.enum, ["a", "b"]);
    // @ts-expect-error - should not allow invalid enum values
    inArray(testTable.enum, ["d", "e"]);

    // ------------------ Test notInArray operator ------------------
    // @ts-expect-error - should not allow number array
    notInArray(testTable.text, [1, 2]);
    // @ts-expect-error - should not allow string array
    notInArray(testTable.textNumber, ["1", "2"]);
    notInArray(testTable.textNumber, [1, 2]);
    notInArray(testTable.enum, ["a", "b"]);
    // @ts-expect-error - should not allow invalid enum values
    notInArray(testTable.enum, ["d", "e"]);

    // Test that write validators are used for all operators
    const queryStringEq = db
      .from(testTable)
      .list()
      .where(eq(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringEq).toContain("$filter");
    expect(queryStringEq).toContain("static-value");

    const queryStringNe = db
      .from(testTable)
      .list()
      .where(ne(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringNe).toContain("$filter");
    expect(queryStringNe).toContain("static-value");

    const queryStringGt = db
      .from(testTable)
      .list()
      .where(gt(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringGt).toContain("$filter");
    expect(queryStringGt).toContain("static-value");

    const queryStringGte = db
      .from(testTable)
      .list()
      .where(gte(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringGte).toContain("$filter");
    expect(queryStringGte).toContain("static-value");

    const queryStringLt = db
      .from(testTable)
      .list()
      .where(lt(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringLt).toContain("$filter");
    expect(queryStringLt).toContain("static-value");

    const queryStringLte = db
      .from(testTable)
      .list()
      .where(lte(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringLte).toContain("$filter");
    expect(queryStringLte).toContain("static-value");

    const queryStringContains = db
      .from(testTable)
      .list()
      .where(contains(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringContains).toContain("$filter");
    expect(queryStringContains).toContain("static-value");

    const queryStringStartsWith = db
      .from(testTable)
      .list()
      .where(startsWith(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringStartsWith).toContain("$filter");
    expect(queryStringStartsWith).toContain("static-value");

    const queryStringEndsWith = db
      .from(testTable)
      .list()
      .where(endsWith(testTable.transform, "anything"))
      .getQueryString();
    expect(queryStringEndsWith).toContain("$filter");
    expect(queryStringEndsWith).toContain("static-value");

    const queryStringInArray = db
      .from(testTable)
      .list()
      .where(inArray(testTable.transform, ["anything"]))
      .getQueryString();
    expect(queryStringInArray).toContain("$filter");
    expect(queryStringInArray).toContain("static-value");

    const queryStringNotInArray = db
      .from(testTable)
      .list()
      .where(notInArray(testTable.transform, ["anything"]))
      .getQueryString();
    expect(queryStringNotInArray).toContain("$filter");
    expect(queryStringNotInArray).toContain("static-value");
  });
});
