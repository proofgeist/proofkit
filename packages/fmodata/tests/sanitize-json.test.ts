/**
 * JSON Sanitization Tests
 *
 * Tests for the sanitizeFileMakerJson function that handles FileMaker's
 * invalid JSON responses containing unquoted `?` characters as field values.
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeFileMakerJson,
  safeJsonParse,
} from "../src/client/sanitize-json";
import { ResponseParseError } from "../src/errors";

describe("sanitizeFileMakerJson", () => {
  describe("basic sanitization", () => {
    it("should replace single unquoted ? value with null", () => {
      const input = '{"field": ?}';
      const expected = '{"field": null}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });

    it("should replace multiple unquoted ? values with null", () => {
      const input = '{"field1": ?, "field2": ?}';
      const expected = '{"field1": null, "field2": null}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });

    it("should handle mixed valid and invalid values", () => {
      const input = '{"field1": "valid", "field2": ?, "field3": null}';
      const expected = '{"field1": "valid", "field2": null, "field3": null}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });

    it("should handle ? at the end of an object", () => {
      const input = '{"field1": "value", "field2": ?}';
      const expected = '{"field1": "value", "field2": null}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });

    it("should handle ? followed by comma", () => {
      const input = '{"field1": ?, "field2": "value"}';
      const expected = '{"field1": null, "field2": "value"}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });
  });

  describe("should not modify valid JSON", () => {
    it("should not modify ? inside string values", () => {
      const input = '{"field": "Is this a question?"}';
      expect(sanitizeFileMakerJson(input)).toBe(input);
    });

    it("should not modify ? in the middle of string values", () => {
      const input = '{"field": "What? Really?"}';
      expect(sanitizeFileMakerJson(input)).toBe(input);
    });

    it("should not modify escaped ? in strings", () => {
      const input = '{"field": "test\\?test"}';
      expect(sanitizeFileMakerJson(input)).toBe(input);
    });

    it("should not modify normal null values", () => {
      const input = '{"field": null}';
      expect(sanitizeFileMakerJson(input)).toBe(input);
    });

    it("should not modify numeric values", () => {
      const input = '{"field": 123}';
      expect(sanitizeFileMakerJson(input)).toBe(input);
    });

    it("should not modify boolean values", () => {
      const input = '{"field1": true, "field2": false}';
      expect(sanitizeFileMakerJson(input)).toBe(input);
    });

    it("should not modify empty strings", () => {
      const input = '{"field": ""}';
      expect(sanitizeFileMakerJson(input)).toBe(input);
    });
  });

  describe("nested objects and arrays", () => {
    it("should handle ? in nested objects", () => {
      const input = '{"outer": {"inner": ?}}';
      const expected = '{"outer": {"inner": null}}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });

    it("should handle ? in arrays", () => {
      const input = '{"value": [1, ?, 3]}';

      const result = sanitizeFileMakerJson(input);

      // The sanitized JSON should be parseable
      expect(() => JSON.parse(result)).not.toThrow();

      // And should have the correct values
      const parsed = JSON.parse(result);
      expect(parsed.value).toEqual([1, null, 3]);
    });

    it("should handle complex nested structures", () => {
      const input =
        '{"users": [{"name": "John", "age": ?}, {"name": ?, "age": 30}]}';
      const expected =
        '{"users": [{"name": "John", "age": null}, {"name": null, "age": 30}]}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });
  });

  describe("whitespace handling", () => {
    it("should handle no whitespace around ?", () => {
      const input = '{"field":?}';
      const expected = '{"field": null}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });

    it("should handle extra whitespace around ?", () => {
      const input = '{"field":    ?   }';
      const expected = '{"field": null   }';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });

    it("should handle newlines around ?", () => {
      const input = '{"field":\n?\n}';
      const expected = '{"field": null\n}';
      expect(sanitizeFileMakerJson(input)).toBe(expected);
    });
  });

  describe("realistic FileMaker OData responses", () => {
    it("should sanitize a typical FileMaker list response", () => {
      // Manual construction to ensure the ? is unquoted
      const inputWithUnquoted =
        '{"@odata.context":"$metadata#Users","value":[{"ROWID":1,"name":"John","email":"john@example.com","phone":?},{"ROWID":2,"name":"Jane","email":?,"phone":"555-1234"}]}';

      const result = sanitizeFileMakerJson(inputWithUnquoted);

      // The sanitized JSON should be parseable
      expect(() => JSON.parse(result)).not.toThrow();

      // And should have the correct values
      const parsed = JSON.parse(result);
      expect(parsed.value[0].phone).toBeNull();
      expect(parsed.value[1].email).toBeNull();
      expect(parsed.value[0].email).toBe("john@example.com");
      expect(parsed.value[1].phone).toBe("555-1234");
    });

    it("should sanitize response with all fields as ?", () => {
      const input =
        '{"@odata.context":"$metadata#Test","value":[{"field1":?,"field2":?,"field3":?}]}';

      const result = sanitizeFileMakerJson(input);

      // The sanitized JSON should be parseable
      expect(() => JSON.parse(result)).not.toThrow();

      // And should have the correct values
      const parsed = JSON.parse(result);
      expect(parsed.value[0].field1).toBeNull();
      expect(parsed.value[0].field2).toBeNull();
      expect(parsed.value[0].field3).toBeNull();
    });
  });
});

describe("safeJsonParse", () => {
  it("should parse valid JSON from Response", async () => {
    const data = { field: "value" };
    const response = new Response(JSON.stringify(data));
    const result = await safeJsonParse(response);
    expect(result).toEqual(data);
  });

  it("should parse and sanitize invalid FileMaker JSON from Response", async () => {
    const invalidJson = '{"field1": "valid", "field2": ?, "field3": null}';
    const response = new Response(invalidJson);
    const result = await safeJsonParse(response);
    expect(result).toEqual({ field1: "valid", field2: null, field3: null });
  });

  it("should handle complex nested invalid JSON", async () => {
    const invalidJson =
      '{"users":[{"name":"John","age":?},{"name":?,"age":30}]}';
    const response = new Response(invalidJson);
    const result = await safeJsonParse(response);
    expect(result).toEqual({
      users: [
        { name: "John", age: null },
        { name: null, age: 30 },
      ],
    });
  });

  it("should throw ResponseParseError for completely invalid JSON", async () => {
    const invalidJson = "not json at all";
    const response = new Response(invalidJson);
    await expect(safeJsonParse(response)).rejects.toThrow(ResponseParseError);

    // Verify the error includes the sanitized text for debugging
    try {
      await safeJsonParse(new Response(invalidJson));
    } catch (err) {
      expect(err).toBeInstanceOf(ResponseParseError);
      const parseError = err as ResponseParseError;
      expect(parseError.rawText).toBe(invalidJson);
      expect(parseError.cause).toBeInstanceOf(SyntaxError);
    }
  });

  it("should throw ResponseParseError for empty response body", async () => {
    const response = new Response("");
    await expect(safeJsonParse(response)).rejects.toThrow(ResponseParseError);

    // Verify the error includes empty string as rawText
    try {
      await safeJsonParse(new Response(""));
    } catch (err) {
      expect(err).toBeInstanceOf(ResponseParseError);
      const parseError = err as ResponseParseError;
      expect(parseError.rawText).toBe("");
    }
  });
});
