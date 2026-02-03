import type { CleanedWhere } from "better-auth/adapters";
import { describe, expect, test } from "vitest";
import { parseWhere } from "../src/adapter";

describe("parseWhere", () => {
  test("should return empty string for empty where clause", () => {
    const result = parseWhere();
    expect(result).toBe("");
  });

  test("should return empty string for empty array", () => {
    const result = parseWhere([]);
    expect(result).toBe("");
  });

  test("should parse simple equality condition", () => {
    const where: CleanedWhere[] = [{ field: "name", operator: "eq", value: "John", connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe("name eq 'John'");
  });

  test("should parse multiple conditions with AND connector", () => {
    const where: CleanedWhere[] = [
      { field: "name", operator: "eq", value: "John", connector: "AND" },
      { field: "age", operator: "gt", value: 25, connector: "AND" },
    ];
    const result = parseWhere(where);
    expect(result).toBe("name eq 'John' and age gt 25");
  });

  test("should parse conditions with OR connector", () => {
    const where: CleanedWhere[] = [
      { field: "name", operator: "eq", value: "John", connector: "OR" },
      { field: "name", operator: "eq", value: "Jane", connector: "OR" },
    ];
    const result = parseWhere(where);
    expect(result).toBe("name eq 'John' or name eq 'Jane'");
  });

  test("should handle field names with spaces", () => {
    const where: CleanedWhere[] = [{ field: "user name", operator: "eq", value: "John", connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe("\"user name\" eq 'John'");
  });

  test("should handle field names with underscores", () => {
    const where: CleanedWhere[] = [{ field: "user_name", operator: "eq", value: "John", connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe("\"user_name\" eq 'John'");
  });

  test("should handle null values", () => {
    const where: CleanedWhere[] = [{ field: "deleted_at", operator: "eq", value: null, connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe("deleted_at eq null");
  });

  test("should handle boolean values", () => {
    const where: CleanedWhere[] = [{ field: "active", operator: "eq", value: true, connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe("active eq true");
  });

  test("should handle date values", () => {
    const date = new Date("2023-01-01T00:00:00.000Z");
    const where: CleanedWhere[] = [{ field: "created_at", operator: "eq", value: date, connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe("created_at eq 2023-01-01T00:00:00.000Z");
  });

  test("should handle IN operator with array values", () => {
    const where: CleanedWhere[] = [
      {
        field: "status",
        operator: "in",
        value: ["active", "pending"],
        connector: "AND",
      },
    ];
    const result = parseWhere(where);
    expect(result).toBe("(status eq 'active' or status eq 'pending')");
  });

  test("should handle CONTAINS operator", () => {
    const where: CleanedWhere[] = [
      {
        field: "description",
        operator: "contains",
        value: "test",
        connector: "AND",
      },
    ];
    const result = parseWhere(where);
    expect(result).toBe("contains(description, 'test')");
  });

  test("should handle STARTS_WITH operator", () => {
    const where: CleanedWhere[] = [
      {
        field: "name",
        operator: "starts_with",
        value: "John",
        connector: "AND",
      },
    ];
    const result = parseWhere(where);
    expect(result).toBe("startswith(name, 'John')");
  });

  test("should handle ENDS_WITH operator", () => {
    const where: CleanedWhere[] = [
      {
        field: "email",
        operator: "ends_with",
        value: "@example.com",
        connector: "AND",
      },
    ];
    const result = parseWhere(where);
    expect(result).toBe("endswith(email, '@example.com')");
  });

  test("should escape single quotes in string values", () => {
    const where: CleanedWhere[] = [{ field: "name", operator: "eq", value: "O'Connor", connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe("name eq 'O''Connor'");
  });

  test("should handle numeric values", () => {
    const where: CleanedWhere[] = [{ field: "age", operator: "gte", value: 18, connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe("age ge 18");
  });

  test("should quote special field names", () => {
    const where: CleanedWhere[] = [{ field: "id", operator: "eq", value: "123", connector: "AND" }];
    const result = parseWhere(where);
    expect(result).toBe(`"id" eq '123'`);
  });

  test("should handle date values, no single quotes", () => {
    const where: CleanedWhere[] = [
      {
        operator: "lt",
        connector: "AND",
        field: "expiresAt",
        value: new Date("2025-08-06T18:06:11.066Z"),
      },
    ];
    const result = parseWhere(where);
    expect(result).toBe("expiresAt lt 2025-08-06T18:06:11.066Z");
  });

  test("should handle date-like objects (serialized dates)", () => {
    // Simulate what happens when a Date gets serialized/deserialized
    const dateObj = new Date("2025-08-06T18:06:11.066Z");
    const serializedDate = JSON.parse(JSON.stringify({ value: dateObj })).value;

    const where: CleanedWhere[] = [
      {
        operator: "lt",
        connector: "AND",
        field: "expiresAt",
        value: serializedDate,
      },
    ];

    const result = parseWhere(where);
    expect(result).toBe("expiresAt lt 2025-08-06T18:06:11.066Z");
  });

  test("should handle various ISO date string formats", () => {
    const testCases = [
      {
        value: "2023-01-01T00:00:00.000Z",
        expected: "field eq 2023-01-01T00:00:00.000Z",
      },
      {
        value: "2023-01-01T00:00:00Z",
        expected: "field eq 2023-01-01T00:00:00Z",
      },
      {
        value: "2023-01-01T00:00:00.123Z",
        expected: "field eq 2023-01-01T00:00:00.123Z",
      },
      { value: "not-a-date", expected: "field eq 'not-a-date'" }, // Regular string should get quotes
    ];

    for (const { value, expected } of testCases) {
      const where: CleanedWhere[] = [{ field: "field", operator: "eq", value, connector: "AND" }];
      const result = parseWhere(where);
      expect(result).toBe(expected);
    }
  });

  test("should handle date-only strings (without time)", () => {
    const testCases = [
      { value: "2023-01-01", expected: "field eq '2023-01-01'" }, // Date-only should be treated as regular string
      { value: "2023-12-31", expected: "field eq '2023-12-31'" },
      { value: "2023-01-01T", expected: "field eq '2023-01-01T'" }, // Invalid format should be treated as string
    ];

    for (const { value, expected } of testCases) {
      const where: CleanedWhere[] = [{ field: "field", operator: "eq", value, connector: "AND" }];
      const result = parseWhere(where);
      expect(result).toBe(expected);
    }
  });
});
