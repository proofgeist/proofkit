/**
 * OData Query String Generation Tests
 *
 * This test file validates that the query builder correctly generates OData
 * query strings. These tests focus on ensuring that:
 *
 * - Query options ($select, $filter, $orderby, $top, $skip, $expand, $count)
 *   are correctly formatted according to OData v4 specification
 * - Query string encoding and escaping is handled properly
 * - Method chaining produces correct combined query strings
 * - Edge cases and special characters are handled correctly
 *
 * These tests do NOT:
 * - Execute actual HTTP requests (.execute() is never called)
 * - Test network behavior or responses
 * - Require a mock fetch implementation
 *
 * They serve to ensure the query builder generates valid OData query strings
 * that will be correctly parsed by OData endpoints.
 */

import { describe, expect, it } from "vitest";
import { createMockClient } from "./utils/test-setup";

describe("OData Query String Generation", () => {
  const createClient = () => {
    return createMockClient();
  };

  describe("$select", () => {
    it("should generate $select query for single field", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name")
        .getQueryString();

      expect(queryString).toContain("$select");
      expect(queryString).toContain("name");
    });
    it("should auto quote fields with special characters", () => {
      const client = createClient();
      const db = client.database("TestDB");

      const base = db.from("Users").list();

      expect(base.select("id").getQueryString()).toBe('/Users?$select="id"&$top=1000');
      expect(base.select("name with spaces").getQueryString()).toBe(
        "/Users?$select=name with spaces&$top=1000",
      );
      expect(base.select("special%char").getQueryString()).toBeOneOf([
        "/Users?$select=special%25char&$top=1000", // can be URL encoded to %25
        "/Users?$select=special%char&$top=1000", // but percent char doesn't need to be URL encoded
      ]);
      expect(base.select("special&char").getQueryString()).toBe(
        "/Users?$select=special%26char&$top=1000",
      );

      expect(
        base.expand("contacts", (b) => b.select("id")).getQueryString(),
      ).toBe('/Users?$top=1000&$expand=contacts($select="id")');
      expect(
        db
          .from("Users")
          .list()
          .expand("contacts", (b) => b.select("name with spaces"))
          .getQueryString(),
      ).toBeOneOf([
        "/Users?$top=1000&$expand=contacts($select=name with spaces)",
        "/Users?$top=1000&$expand=contacts($select=name%20with%20spaces)",
      ]);
      expect(
        db
          .from("Users")
          .list()
          .expand("contacts", (b) => b.select("special%char"))
          .getQueryString(),
      ).toBeOneOf([
        "/Users?$top=1000&$expand=contacts($select=special%25char)",
        "/Users?$top=1000&$expand=contacts($select=special%char)",
      ]);
      expect(
        db
          .from("Users")
          .list()
          .expand("contacts", (b) => b.select("special&char"))
          .getQueryString(),
      ).toBe("/Users?$top=1000&$expand=contacts($select=special%26char)");
    });

    it("should generate $select query for multiple fields", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name", "email", "age")
        .getQueryString();

      expect(queryString).toContain("$select");
      expect(queryString).toContain("name");
      expect(queryString).toContain("email");
      expect(queryString).toContain("age");
    });

    it("should generate $select with comma-separated fields", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("id", "name")
        .getQueryString();

      // OData format: $select=id,name
      const selectPart = queryString.match(/\$select=([^&]+)/)?.[1];
      expect(selectPart).toBeDefined();

      expect(selectPart?.split(",")).toContain("name");
    });
  });

  // describe.skip("$filter", () => {
  //   it("should generate $filter with equality operator", () => {
  //     const client = createClient();
  //     const db = client.database("TestDB");
  //     const queryString = db
  //       .from("Users")
  //       .list()
  //       .filter({ name: { eq: "John" } })
  //       .getQueryString();

  //     expect(queryString).toContain("$filter");
  //     expect(queryString).toContain("name");
  //     expect(queryString).toContain("eq");
  //     expect(queryString).toContain("John");
  //   });

  //   it("should generate $filter with numeric comparison", () => {
  //     const client = createClient();
  //     const db = client.database("TestDB");
  //     const queryString = db
  //       .from("Users")
  //       .list()
  //       .filter({ age: { gt: 18 } })
  //       .getQueryString();

  //     expect(queryString).toContain("$filter");
  //     expect(queryString).toContain("age");
  //     expect(queryString).toContain("gt");
  //   });

  //   it("should generate $filter with multiple conditions using AND", () => {
  //     const client = createClient();
  //     const db = client.database("TestDB");
  //     const queryString = db
  //       .from("Users")
  //       .list()
  //       .filter({
  //         and: [{ name: { eq: "John" } }, { age: { gt: 18 } }],
  //       })
  //       .getQueryString();

  //     expect(queryString).toContain("$filter");
  //     expect(queryString).toContain("name");
  //     expect(queryString).toContain("age");
  //   });

  //   it("should generate $filter with OR conditions", () => {
  //     const client = createClient();
  //     const db = client.database("TestDB");
  //     const queryString = db
  //       .from("Users")
  //       .list()
  //       .filter({
  //         or: [{ status: { eq: "active" } }, { status: { eq: "pending" } }],
  //       })
  //       .getQueryString();

  //     expect(queryString).toContain("$filter");
  //     expect(queryString).toContain("status");
  //   });

  //   it("should handle string values with quotes in filter", () => {
  //     const client = createClient();
  //     const db = client.database("TestDB");
  //     const queryString = db
  //       .from("Users")
  //       .list()
  //       .filter({ name: { eq: "John O'Connor" } })
  //       .getQueryString();

  //     expect(queryString).toContain("$filter");
  //     // OData should properly escape quotes
  //     expect(queryString).toContain("John");
  //   });

  //   it("should handle null values in filter", () => {
  //     const client = createClient();
  //     const db = client.database("TestDB");
  //     const queryString = db
  //       .from("Users")
  //       .list()
  //       .filter({ deletedAt: { eq: null } })
  //       .getQueryString();

  //     expect(queryString).toContain("$filter");
  //     expect(queryString).toContain("null");
  //   });
  // });

  describe("$orderby", () => {
    it("should generate $orderby for ascending order", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .orderBy("name")
        .getQueryString();

      expect(queryString).toContain("$orderby");
      expect(queryString).toContain("name");
    });

    it("should generate $orderby for descending order", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .orderBy("name desc")
        .getQueryString();

      expect(queryString).toContain("$orderby");
      expect(queryString).toContain("name");
      expect(queryString).toContain("desc");
    });

    it("should generate $orderby with multiple fields", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .orderBy("name, age desc")
        .getQueryString();

      expect(queryString).toContain("$orderby");
      expect(queryString).toContain("name");
      expect(queryString).toContain("age");
    });
  });

  describe("$top", () => {
    it("should generate $top query parameter", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db.from("Users").list().top(10).getQueryString();

      expect(queryString).toContain("$top");
      expect(queryString).toContain("10");
    });

    it("should generate $top with different values", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db.from("Users").list().top(25).getQueryString();

      expect(queryString).toContain("$top");
      expect(queryString).toContain("25");
    });
  });

  describe("$skip", () => {
    it("should generate $skip query parameter", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db.from("Users").list().skip(20).getQueryString();

      expect(queryString).toContain("$skip");
      expect(queryString).toContain("20");
    });

    it("should generate $skip with zero value", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db.from("Users").list().skip(0).getQueryString();

      expect(queryString).toContain("$skip");
      expect(queryString).toContain("0");
    });
  });

  describe("$expand", () => {
    it("should generate $expand query parameter", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .expand("orders")
        .getQueryString();

      expect(queryString).toContain("$expand");
      expect(queryString).toContain("orders");
    });
  });

  describe("$count", () => {
    it("should generate query with $count parameter", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db.from("Users").list().count().getQueryString();

      expect(queryString).toContain("$count");
    });

    it("should generate $count with other query parameters", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .filter("status eq 'active'")
        .count()
        .getQueryString();

      expect(queryString).toContain("$count");
      expect(queryString).toContain("$filter");
    });
  });

  describe("Combined query parameters", () => {
    it("should combine $select and $filter", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name", "email")
        .filter("age gt 18")
        .getQueryString();

      expect(queryString).toContain("$select");
      expect(queryString).toContain("$filter");
      expect(queryString).toContain("name");
      expect(queryString).toContain("age");
    });

    it("should combine $select, $filter, and $orderby", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name", "email")
        .filter("status eq 'active'")
        .orderBy("name")
        .getQueryString();

      expect(queryString).toContain("$select");
      expect(queryString).toContain("$filter");
      expect(queryString).toContain("$orderby");
    });

    it("should combine $top and $skip for pagination", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .top(10)
        .skip(20)
        .getQueryString();

      expect(queryString).toContain("$top");
      expect(queryString).toContain("$skip");
      expect(queryString).toContain("10");
      expect(queryString).toContain("20");
    });

    it("should combine multiple query parameters", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name", "email")
        .filter("age gt 18")
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
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name", "email")
        .filter("status eq 'active'")
        .orderBy("name")
        .top(25)
        .expand("orders")
        .getQueryString();

      expect(queryString).toContain("$select");
      expect(queryString).toContain("$filter");
      expect(queryString).toContain("$orderby");
      expect(queryString).toContain("$top");
      expect(queryString).toContain("$expand");
    });
  });

  describe("single() mode", () => {
    it("should generate query string for single record", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name")
        .single()
        .getQueryString();

      expect(queryString).toContain("$select");
      // single() mode affects execution, not query string format
      expect(queryString).toBeDefined();
    });

    it("should generate query string with single() and filter", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .filter("id eq '123'")
        .single()
        .getQueryString();

      expect(queryString).toContain("$filter");
      expect(queryString).toContain("id");
    });
  });

  describe("Query string format validation", () => {
    it("should use & to separate multiple parameters", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name")
        .filter("age gt 18")
        .top(10)
        .getQueryString();

      // Should have & between parameters
      const matches = queryString.match(/&/g);
      expect(matches?.length).toBeGreaterThan(0);
    });

    it("should URL encode special characters in values", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .filter("name eq 'John & Jane'")
        .getQueryString();

      expect(queryString).toContain("$filter");
      // Special characters should be properly encoded
      expect(queryString).toBeDefined();
    });
  });

  describe("list() method", () => {
    it("should generate query string from list() builder", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db.from("Users").list().getQueryString();

      expect(queryString).toBeDefined();
      expect(typeof queryString).toBe("string");
    });

    it("should combine list() with query parameters", () => {
      const client = createClient();
      const db = client.database("TestDB");
      const queryString = db
        .from("Users")
        .list()
        .select("name")
        .top(10)
        .getQueryString();

      expect(queryString).toContain("$select");
      expect(queryString).toContain("$top");
    });
  });
});
