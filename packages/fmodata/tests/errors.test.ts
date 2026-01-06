/**
 * Error Handling Tests
 *
 * Tests for rich error handling in the library, including:
 * - HTTP errors (4xx, 5xx)
 * - Network errors (timeout, abort, retry limit, circuit open)
 * - Validation errors with library-specific formatting (Zod example)
 * - OData errors
 * - Response structure errors
 * - Type guards and error detection
 */

import {
  fmTableOccurrence,
  HTTPError,
  isHTTPError,
  isODataError,
  isRecordCountMismatchError,
  isResponseStructureError,
  isSchemaLockedError,
  isValidationError,
  numberField,
  ODataError,
  RecordCountMismatchError,
  ResponseStructureError,
  SchemaLockedError,
  textField,
  ValidationError,
} from "@proofkit/fmodata";
import { assert, describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { createMockFetch, simpleMock } from "./utils/mock-fetch";
import { createMockClient } from "./utils/test-setup";

describe("Error Handling", () => {
  const client = createMockClient();

  const users = fmTableOccurrence("users", {
    id: textField().primaryKey(),
    username: textField(),
    email: textField().readValidator(z.string().email()),
    active: numberField().readValidator(z.coerce.boolean()),
    age: numberField().readValidator(z.number().int().min(0).max(150)),
  });

  describe("HTTP Errors", () => {
    it("should return HTTPError for 404 Not Found", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({ status: 404 }),
        });

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(HTTPError);

      const httpError = result.error as HTTPError;
      expect(httpError.status).toBe(404);
      expect(httpError.isNotFound()).toBe(true);
      expect(httpError.is4xx()).toBe(true);
      expect(httpError.is5xx()).toBe(false);
    });

    it("should return HTTPError for 401 Unauthorized", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({ status: 401 }),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(HTTPError);

      const httpError = result.error as HTTPError;
      expect(httpError.status).toBe(401);
      expect(httpError.isUnauthorized()).toBe(true);
    });

    it("should return HTTPError for 500 Server Error", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({ status: 500 }),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(HTTPError);

      const httpError = result.error as HTTPError;
      expect(httpError.status).toBe(500);
      expect(httpError.is5xx()).toBe(true);
      expect(httpError.is4xx()).toBe(false);
    });

    it("should include response body in HTTPError", async () => {
      const errorBody = { message: "Custom error message" };
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({
            status: 400,
            body: errorBody,
          }),
        });

      expect(result.error).toBeInstanceOf(HTTPError);
      const httpError = result.error as HTTPError;
      expect(httpError.response).toEqual(errorBody);
    });
  });

  describe("OData Errors", () => {
    it("should return ODataError for OData error responses", async () => {
      const odataError = {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid OData query",
          target: "$filter",
        },
      };

      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch({
            url: "https://api.example.com",
            method: "GET",
            status: 400,
            response: odataError,
            headers: { "content-type": "application/json" },
          }),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(ODataError);

      const odataErr = result.error as ODataError;
      expect(odataErr.code).toBe("INVALID_REQUEST");
      expect(odataErr.details).toEqual(odataError.error);
    });

    it("should return SchemaLockedError for database schema locked error (code 303)", async () => {
      const schemaLockedError = {
        error: {
          code: "303",
          message: "Database schema is locked by another user",
        },
      };

      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch({
            url: "https://api.example.com",
            method: "GET",
            status: 400,
            response: schemaLockedError,
            headers: { "content-type": "application/json" },
          }),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(SchemaLockedError);

      const schemaError = result.error as SchemaLockedError;
      expect(schemaError.code).toBe("303");
      expect(schemaError.message).toContain("Database schema is locked");
      expect(schemaError.details).toEqual(schemaLockedError.error);
      expect(schemaError.kind).toBe("SchemaLockedError");
    });

    it("should return SchemaLockedError when error code is numeric 303", async () => {
      const schemaLockedError = {
        error: {
          code: 303,
          message: "Database schema is locked by another user",
        },
      };

      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch({
            url: "https://api.example.com",
            method: "GET",
            status: 400,
            response: schemaLockedError,
            headers: { "content-type": "application/json" },
          }),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(SchemaLockedError);
    });
  });

  describe("Validation Errors", () => {
    it("should return ValidationError when schema validation fails", async () => {
      const db = client.database("testdb");

      // Return data that doesn't match schema (email is invalid, age is out of range)
      const invalidData = [
        {
          id: "1",
          username: "testuser",
          email: "not-an-email", // Invalid email
          active: true,
          age: 200, // Out of range (max 150)
        },
      ];

      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch(invalidData),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(ValidationError);

      const validationError = result.error as ValidationError;
      expect(validationError.issues).toBeDefined();
      expect(Array.isArray(validationError.issues)).toBe(true);
      expect(validationError.issues.length).toBeGreaterThan(0);
      expect(validationError.value).toBeDefined();
    });

    it("should preserve Standard Schema issues in cause property", async () => {
      const db = client.database("testdb");

      const invalidData = [
        {
          id: "1",
          username: "testuser",
          email: "not-an-email",
          active: true,
          age: 200,
        },
      ];

      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch(invalidData),
        });

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;

      // The cause property (ES2022 Error.cause) contains the Standard Schema issues array
      // This follows the same pattern as uploadthing and is validator-agnostic
      assert(validationError.cause, "Cause is not defined");

      // The cause should be the Standard Schema issues array
      expect(Array.isArray(validationError.cause)).toBe(true);
      expect(validationError.cause).toBe(validationError.issues);

      // The issues array is always available
      expect(validationError.issues).toBeDefined();
      expect(Array.isArray(validationError.issues)).toBe(true);
      expect(validationError.issues.length).toBeGreaterThan(0);

      // ensure the end user can pass this back to zod
      expect(z.prettifyError(validationError)).toBeDefined();
    });

    it("should include field name in ValidationError", async () => {
      const db = client.database("testdb");

      const invalidData = [
        {
          id: "1",
          username: "testuser",
          email: "not-an-email",
          active: true,
          age: 25,
        },
      ];

      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch(invalidData),
        });

      expect(result.error).toBeInstanceOf(ValidationError);
      const validationError = result.error as ValidationError;

      // The error should mention which field failed
      expect(validationError.message).toContain("email");
    });
  });

  describe("Response Structure Errors", () => {
    it("should return ResponseStructureError for invalid response structure", async () => {
      const db = client.database("testdb");

      // Return invalid structure (not an object)
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch({
            url: "https://api.example.com",
            method: "GET",
            status: 200,
            response: "not an object", // Invalid - should be object with value array
            headers: { "content-type": "application/json" },
          }),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(ResponseStructureError);

      const structureError = result.error as ResponseStructureError;
      expect(structureError.expected).toContain("object");
    });

    it("should return ResponseStructureError when value is not an array", async () => {
      const db = client.database("testdb");

      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch({
            url: "https://api.example.com",
            method: "GET",
            status: 200,
            response: { value: "not an array" }, // Invalid - value should be array
            headers: { "content-type": "application/json" },
          }),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(ResponseStructureError);
    });
  });

  describe("Record Count Mismatch Errors", () => {
    it("should return RecordCountMismatchError for single() when multiple records found", async () => {
      const db = client.database("testdb");

      const multipleRecords = [
        {
          id: "1",
          username: "user1",
          email: "user1@test.com",
          active: true,
          age: 25,
        },
        {
          id: "2",
          username: "user2",
          email: "user2@test.com",
          active: true,
          age: 30,
        },
      ];

      const result = await db
        .from(users)
        .list()
        .single()
        .execute({
          fetchHandler: createMockFetch(multipleRecords),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(RecordCountMismatchError);

      const countError = result.error as RecordCountMismatchError;
      expect(countError.expected).toBe("one");
      expect(countError.received).toBe(2);
    });

    it("should return RecordCountMismatchError for single() when no records found", async () => {
      const db = client.database("testdb");

      const result = await db
        .from(users)
        .list()
        .single()
        .execute({
          fetchHandler: createMockFetch([]),
        });

      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(RecordCountMismatchError);

      const countError = result.error as RecordCountMismatchError;
      expect(countError.expected).toBe("one");
      expect(countError.received).toBe(0);
    });
  });

  describe("Type Guards", () => {
    it("should correctly identify HTTPError using type guard", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({ status: 404 }),
        });

      expect(result.error).toBeDefined();
      expect(isHTTPError(result.error)).toBe(true);

      if (isHTTPError(result.error)) {
        // TypeScript should know this is HTTPError
        expect(result.error.status).toBe(404);
      }
    });

    it("should correctly identify ValidationError using type guard", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch([
            {
              id: "1",
              username: "test",
              email: "invalid-email",
              active: true,
              age: 25,
            },
          ]),
        });

      expect(result.error).toBeDefined();
      expect(isValidationError(result.error)).toBe(true);

      if (isValidationError(result.error)) {
        // TypeScript should know this is ValidationError
        expect(result.error.issues).toBeDefined();
      }
    });

    it("should correctly identify ODataError using type guard", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch({
            url: "https://api.example.com",
            method: "GET",
            status: 400,
            response: { error: { code: "ERROR", message: "Test" } },
            headers: { "content-type": "application/json" },
          }),
        });

      expect(result.error).toBeDefined();
      expect(isODataError(result.error)).toBe(true);

      if (isODataError(result.error)) {
        // TypeScript should know this is ODataError
        expect(result.error.code).toBeDefined();
      }
    });

    it("should correctly identify SchemaLockedError using type guard", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch({
            url: "https://api.example.com",
            method: "GET",
            status: 400,
            response: {
              error: { code: "303", message: "Database schema is locked" },
            },
            headers: { "content-type": "application/json" },
          }),
        });

      expect(result.error).toBeDefined();
      expect(isSchemaLockedError(result.error)).toBe(true);

      if (isSchemaLockedError(result.error)) {
        // TypeScript should know this is SchemaLockedError
        expect(result.error.code).toBe("303");
        expect(result.error.kind).toBe("SchemaLockedError");
      }
    });

    it("should correctly identify ResponseStructureError using type guard", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: createMockFetch({
            url: "https://api.example.com",
            method: "GET",
            status: 200,
            response: "invalid",
            headers: { "content-type": "application/json" },
          }),
        });

      expect(result.error).toBeDefined();
      expect(isResponseStructureError(result.error)).toBe(true);
    });

    it("should correctly identify RecordCountMismatchError using type guard", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .single()
        .execute({
          fetchHandler: createMockFetch([
            {
              id: "1",
              username: "user1",
              email: "user1@test.com",
              active: true,
              age: 25,
            },
            {
              id: "2",
              username: "user2",
              email: "user2@test.com",
              active: true,
              age: 30,
            },
          ]),
        });

      expect(result.error).toBeDefined();
      expect(isRecordCountMismatchError(result.error)).toBe(true);
    });
  });

  describe("Error Properties", () => {
    it("should include timestamp in all errors", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({ status: 404 }),
        });

      expect(result.error).toBeDefined();
      if (result.error && "timestamp" in result.error) {
        expect(result.error.timestamp).toBeInstanceOf(Date);
      }
    });

    it("should include kind property for discriminated unions", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({ status: 404 }),
        });

      expect(result.error).toBeDefined();
      if (result.error && "kind" in result.error) {
        expect(result.error.kind).toBe("HTTPError");
      }
    });
  });

  describe("Error Handling Patterns", () => {
    it("should allow instanceof checks (like ffetch pattern)", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({ status: 404 }),
        });

      if (result.error) {
        if (result.error instanceof HTTPError) {
          expect(result.error.status).toBe(404);
        } else {
          throw new Error("Expected HTTPError");
        }
      }
    });

    it("should allow switch statement on kind property", async () => {
      const db = client.database("testdb");
      const result = await db
        .from(users)
        .list()
        .execute({
          fetchHandler: simpleMock({ status: 404 }),
        });

      if (result.error && "kind" in result.error) {
        switch (result.error.kind) {
          case "HTTPError":
            expect((result.error as HTTPError).status).toBe(404);
            break;
          case "ValidationError":
            throw new Error("Unexpected ValidationError");
          case "ODataError":
            throw new Error("Unexpected ODataError");
          default:
            throw new Error("Unexpected error kind");
        }
      }
    });
  });
});
