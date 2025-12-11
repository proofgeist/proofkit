/**
 * Navigation Tests
 *
 * Tests for the navigate() function on RecordBuilder instances.
 * This validates that navigation properties can be accessed from record instances.
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import {
  occurrences,
  createMockClient,
  usersBase,
  invoicesBase,
  lineItemsBase,
} from "./utils/test-setup";
import { InferSchemaType } from "../src/types";
import { simpleMock } from "./utils/mock-fetch";

describe("navigate", () => {
  const client = createMockClient();

  // Destructure the built occurrences from test-setup
  const [contactsTO, usersTO, invoicesTO, lineItemsTO] = occurrences;

  type UserFieldNames = keyof InferSchemaType<typeof usersBase.schema>;

  it("should properly type the from based on the defined occurrences", () => {
    const db = client.database("test_db", {
      occurrences: [contactsTO, usersTO],
    });

    expectTypeOf(db.from)
      .parameter(0)
      .toEqualTypeOf<"contacts" | "users" | (string & {})>();
  });

  it("should not allow navigation to an invalid relation", () => {
    const db = client.database("test_db", {
      occurrences: [contactsTO, usersTO],
    });
    const record = db.from("users").get("test-id");

    const queryBuilder = record.navigate("bad");
    expect(queryBuilder.select("arbitrary_field").getQueryString()).toBe(
      "/users('test-id')/bad?$select=arbitrary_field",
    );

    // this one should work
    record.navigate("contacts");

    const entitySet = db.from("contacts");

    const entityQueryBuilder = entitySet.navigate("bad");

    expect(
      entityQueryBuilder.list().select("arbitrary_field").getQueryString(),
    ).toBe("/contacts/bad?$select=arbitrary_field&$top=1000");

    // this one should work
    entitySet.navigate("users");
  });

  it("should return a QueryBuilder when navigating to a valid relation", () => {
    const db = client.database("test_db", {
      occurrences: [contactsTO, usersTO],
    });
    const record = db.from("contacts").get("test-id");

    const queryBuilder = record.navigate("users");

    expectTypeOf(queryBuilder.select).parameter(0).not.toEqualTypeOf<string>();

    // Use actual fields from usersBase schema
    expect(queryBuilder.select("name", "active").getQueryString()).toBe(
      "/contacts('test-id')/users?$select=name,active",
    );
  });

  it("should navigate w/o needing to get a record first", () => {
    const db = client.database("test_db", {
      occurrences: [contactsTO, usersTO],
    });
    const queryBuilder = db.from("contacts").navigate("users").list();

    const queryString = queryBuilder.getQueryString();

    expect(queryString).toBe("/contacts/users?$top=1000");
  });

  it("should allow navigation to an arbitrary table", () => {
    const db = client.database("test_db", {
      occurrences: [contactsTO, usersTO],
    });
    const record = db.from("contacts").get("test-id");
    const queryBuilder = record.navigate("unrelated");
    const queryString = queryBuilder.getQueryString();
    expect(queryString).toBe("/contacts('test-id')/unrelated");
  });

  it("should handle expands", () => {
    const db = client.database("test_db", {
      occurrences: [contactsTO, usersTO],
    });
    expect(
      db
        .from("contacts")
        .navigate("users")
        .list()
        .expand("contacts")
        .getQueryString(),
    ).toBe("/contacts/users?$top=1000&$expand=contacts");

    const entitySet = db.from("users").list();
    expectTypeOf(entitySet.expand).parameter(0).not.toEqualTypeOf<string>();

    expect(db.from("users").list().expand("contacts").getQueryString()).toBe(
      "/users?$top=1000&$expand=contacts",
    );
    expect(db.from("users").list().expand("bad").getQueryString()).toBe(
      "/users?$top=1000&$expand=bad",
    );
  });

  it("should provide type-safe navigation with invoices and lineItems", () => {
    const db = client.database("test_db", {
      occurrences: [contactsTO, invoicesTO, lineItemsTO],
    });

    // contacts -> invoices navigation
    const invoiceQuery = db.from("contacts").navigate("invoices").list();
    expectTypeOf(invoiceQuery.select).parameter(0).not.toEqualTypeOf<string>();
    invoiceQuery.select("invoiceNumber", "total");

    // invoices -> lineItems navigation
    const lineItemsQuery = db.from("invoices").navigate("lineItems").list();
    expectTypeOf(lineItemsQuery.select)
      .parameter(0)
      .not.toEqualTypeOf<string>();

    // Should allow valid fields from lineItems schema
    lineItemsQuery.select("description", "quantity");

    expect(lineItemsQuery.getQueryString()).toBe(
      "/invoices/lineItems?$top=1000",
    );
  });

  it("should support multi-hop navigation patterns", async () => {
    const db = client.database("test_db", {
      occurrences: occurrences,
    });

    const query = db
      .from("contacts")
      .navigate("invoices")
      .navigate("lineItems")
      .list();
    expect(query.getQueryString()).toBe(
      "/contacts/invoices/lineItems?$top=1000",
    );

    // Navigate from a specific contact to their invoices
    const contactInvoices = db
      .from("contacts")
      .get("contact-123")
      .navigate("invoices");

    expect(
      contactInvoices.select("invoiceNumber", "status").getQueryString(),
    ).toBe("/contacts('contact-123')/invoices?$select=invoiceNumber,status");

    // Navigate from a specific invoice to its line items
    const invoiceLineItems = db
      .from("invoices")
      .get("inv-456")
      .expand("lineItems");

    expect(
      invoiceLineItems.select("invoiceNumber", "total").getQueryString(),
    ).toBe(
      "/invoices('inv-456')?$select=invoiceNumber,total&$expand=lineItems",
    );

    const nestedExpand = db
      .from("contacts")
      .get("contact-123")
      .expand("invoices", (b) =>
        b.expand("lineItems", (b) => b.select("description", "quantity")),
      );

    expect(nestedExpand.getQueryString()).toBe(
      "/contacts('contact-123')?$expand=invoices($expand=lineItems($select=description,quantity))",
    );

    // await nestedExpand.execute({
    //   fetchHandler: simpleMock({ status: 200, body: {} }),
    // });
  });
});
