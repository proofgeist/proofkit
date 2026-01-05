/**
 * Tests for per-request useEntityIds override
 *
 * These tests verify that the useEntityIds option can be overridden at the request level
 * using ExecuteOptions, allowing users to disable entity IDs for specific requests even
 * when the database is configured to use them by default.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import {
  FMServerConnection,
  fmTableOccurrence,
  textField,
} from "@proofkit/fmodata";
import { simpleMock } from "./utils/mock-fetch";

// Create database with entity IDs
const contactsTO = fmTableOccurrence(
  "contacts",
  {
    id: textField().primaryKey().entityId("FMFID:1"),
    name: textField().entityId("FMFID:2"),
  },
  {
    entityId: "FMTID:100",
  },
);

describe("Per-request useEntityIds override", () => {
  it("should allow disabling entity IDs for a specific request", async () => {
    // Create connection with entity IDs enabled by default
    const connection = new FMServerConnection({
      serverUrl: "https://test.com",
      auth: { username: "test", password: "test" },
    });

    const db = connection.database("TestDB");

    // First request: use default (should have entity ID header)
    await db
      .from(contactsTO)
      .list()
      .execute({
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBe("fmodata.entity-ids");
          return simpleMock({ body: { value: [] }, status: 200 })(input, init);
        },
      });

    // Second request: explicitly disable entity IDs for this request only
    await db
      .from(contactsTO)
      .list()
      .execute({
        useEntityIds: false,
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBeUndefined();
          return simpleMock({ body: { value: [] }, status: 200 })(input, init);
        },
      });

    // Third request: explicitly enable entity IDs for this request
    await db
      .from(contactsTO)
      .list()
      .execute({
        useEntityIds: true,
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBe("fmodata.entity-ids");
          return simpleMock({ body: { value: [] }, status: 200 })(input, init);
        },
      });
  });

  it("should allow enabling entity IDs for a specific request when disabled by default", async () => {
    // Create connection without entity IDs by default
    const connection = new FMServerConnection({
      serverUrl: "https://test.com",
      auth: { username: "test", password: "test" },
    });

    const db = connection.database("TestDB", {
      useEntityIds: false,
    });

    // First request: use default (should NOT have entity ID header)
    await db
      .from(contactsTO)
      .list()
      .execute({
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBeUndefined();
          return simpleMock({ body: { value: [] }, status: 200 })(input, init);
        },
      });

    // Second request: explicitly enable entity IDs for this request only
    await db
      .from(contactsTO)
      .list()
      .execute({
        useEntityIds: true,
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBe("fmodata.entity-ids");
          return simpleMock({ body: { value: [] }, status: 200 })(input, init);
        },
      });

    // Third request: confirm default is still disabled
    await db
      .from(contactsTO)
      .list()
      .execute({
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBeUndefined();
          return simpleMock({ body: { value: [] }, status: 200 })(input, init);
        },
      });
  });

  it("should work with insert operations", async () => {
    const connection = new FMServerConnection({
      serverUrl: "https://test.com",
      auth: { username: "test", password: "test" },
    });

    const contactsTO = fmTableOccurrence(
      "contacts",
      {
        id: textField().primaryKey().entityId("FMFID:1"),
        name: textField().entityId("FMFID:2"),
      },
      {
        entityId: "FMTID:100",
      },
    );

    const db = connection.database("TestDB");

    // Insert with default settings (entity IDs enabled)
    await db
      .from(contactsTO)
      .insert({ name: "Test" })
      .execute({
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toContain("fmodata.entity-ids");
          return simpleMock({ body: { id: "1", name: "Test" }, status: 200 })(
            input,
            init,
          );
        },
      });

    // Insert with entity IDs disabled for this request
    await db
      .from(contactsTO)
      .insert({ name: "Test" })
      .execute({
        useEntityIds: false,
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).not.toContain("fmodata.entity-ids");
          return simpleMock({ body: { id: "1", name: "Test" }, status: 200 })(
            input,
            init,
          );
        },
      });
  });

  it("should work with update operations", async () => {
    const connection = new FMServerConnection({
      serverUrl: "https://test.com",
      auth: { username: "test", password: "test" },
    });

    const contactsTO = fmTableOccurrence(
      "contacts",
      {
        id: textField().primaryKey().entityId("FMFID:1"),
        name: textField().entityId("FMFID:2"),
      },
      {
        entityId: "FMTID:100",
      },
    );

    const db = connection.database("TestDB");

    // Update with entity IDs disabled
    await db
      .from(contactsTO)
      .update({ name: "Updated" })
      .byId("123")
      .execute({
        useEntityIds: false,
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBeUndefined();
          return simpleMock({
            body: "1",
            status: 200,
            headers: { "fmodata.affected_rows": "1" },
          })(input, init);
        },
      });

    // Update with entity IDs enabled
    await db
      .from(contactsTO)
      .update({ name: "Updated" })
      .byId("123")
      .execute({
        useEntityIds: true,
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBe("fmodata.entity-ids");
          return simpleMock({
            body: "1",
            status: 200,
            headers: { "fmodata.affected_rows": "1" },
          })(input, init);
        },
      });
  });

  it("should work with delete operations", async () => {
    const connection = new FMServerConnection({
      serverUrl: "https://test.com",
      auth: { username: "test", password: "test" },
    });

    const contactsTO = fmTableOccurrence(
      "contacts",
      {
        id: textField().primaryKey().entityId("FMFID:1"),
        name: textField().entityId("FMFID:2"),
      },
      {
        entityId: "FMTID:100",
      },
    );

    const db = connection.database("TestDB");

    // Delete with entity IDs enabled
    await db
      .from(contactsTO)
      .delete()
      .byId("123")
      .execute({
        useEntityIds: true,
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBe("fmodata.entity-ids");
          return simpleMock({
            body: "1",
            status: 204,
            headers: { "fmodata.affected_rows": "1" },
          })(input, init);
        },
      });

    // Delete with entity IDs disabled
    await db
      .from(contactsTO)
      .delete()
      .byId("123")
      .execute({
        useEntityIds: false,
        fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = (init as RequestInit)?.headers as Record<
            string,
            string
          >;
          expect(headers?.Prefer).toBeUndefined();
          return simpleMock({
            body: "1",
            status: 204,
            headers: { "fmodata.affected_rows": "1" },
          })(input, init);
        },
      });
  });
});
