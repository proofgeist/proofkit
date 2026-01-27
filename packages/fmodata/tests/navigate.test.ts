/**
 * Navigation Tests
 *
 * Tests for the navigate() function on RecordBuilder instances.
 * This validates that navigation properties can be accessed from record instances.
 */

import { dateField, fmTableOccurrence, textField } from "@proofkit/fmodata";
import { describe, expect, expectTypeOf, it } from "vitest";
import { arbitraryTable, contacts, createMockClient, invoices, lineItems, users } from "./utils/test-setup";

const contactsUsersPathRegex = /^\/contacts\/users/;

// Tables with defaultSelect: "schema" to test issue #107
const contactsWithSchema = fmTableOccurrence(
  "contacts",
  {
    PrimaryKey: textField().primaryKey(),
    name: textField(),
    closedDate: dateField(),
  },
  {
    defaultSelect: "schema",
    navigationPaths: ["users"],
  },
);

const usersWithSchema = fmTableOccurrence(
  "users",
  {
    id: textField().primaryKey(),
    name: textField(),
  },
  {
    defaultSelect: "schema",
    navigationPaths: ["contacts"],
  },
);

describe("navigate", () => {
  const client = createMockClient();

  it("should not allow navigation to an invalid relation", () => {
    const db = client.database("test_db");
    const record = db.from(users).get("test-id");

    // @ts-expect-error - arbitraryTable is not a valid navigation target
    record.navigate(arbitraryTable);

    const entitySet = db.from(contacts);

    // @ts-expect-error - bad is not a valid navigation target
    const _entityQueryBuilder = entitySet.navigate("bad");

    // expect(
    //   entityQueryBuilder
    //     .list()
    //     // this won't error because the table is already invalid, so we've gotten back to any state
    //     .select({ arbitrary_field: arbitraryTable.name })
    //     .getQueryString(),
    // ).toBe("/contacts/bad?$select=name&$top=1000");

    // this one should work
    entitySet.navigate(users);

    // @ts-expect-error - arbitraryTable is not a valid expand target
    record.expand(arbitraryTable);
  });

  it("should return a QueryBuilder when navigating to a valid relation", () => {
    const db = client.database("test_db");
    const record = db.from(contacts).get("test-id");

    const queryBuilder = record.navigate(users);

    expectTypeOf(queryBuilder.select).parameter(0).not.toEqualTypeOf<string>();

    // Use actual fields from usersBase schema
    expect(queryBuilder.select({ name: users.name, active: users.active }).getQueryString()).toBe(
      "/contacts('test-id')/users?$select=name,active",
    );
  });

  it("should navigate w/o needing to get a record first", () => {
    const db = client.database("test_db");
    const queryBuilder = db.from(contacts).navigate(users).list();

    const queryString = queryBuilder.getQueryString();

    expect(queryString).toBe("/contacts/users?$top=1000");
  });

  it("should handle expands", () => {
    const db = client.database("test_db");
    expect(db.from(contacts).navigate(users).list().expand(contacts).getQueryString()).toBe(
      "/contacts/users?$top=1000&$expand=contacts",
    );

    const entitySet = db.from(users).list();
    expectTypeOf(entitySet.expand).parameter(0).not.toEqualTypeOf<string>();

    expect(db.from(users).list().expand(contacts).getQueryString()).toBe("/users?$top=1000&$expand=contacts");
  });

  it("should provide type-safe navigation with invoices and lineItems", () => {
    const db = client.database("test_db");

    // contacts -> invoices navigation
    const invoiceQuery = db.from(contacts).navigate(invoices).list();
    expectTypeOf(invoiceQuery.select).parameter(0).not.toEqualTypeOf<string>();
    invoiceQuery.select({
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      // @ts-expect-error - not valid since we navigated to invoices, not contacts
      other: contacts.name,
    });

    // invoices -> lineItems navigation
    const lineItemsQuery = db.from(invoices).navigate(lineItems).list();
    expectTypeOf(lineItemsQuery.select).parameter(0).not.toEqualTypeOf<string>();

    // Should allow valid fields from lineItems schema
    lineItemsQuery.select({
      description: lineItems.description,
      quantity: lineItems.quantity,
    });

    expect(lineItemsQuery.getQueryString()).toBe("/invoices/lineItems?$top=1000");
  });

  it("should support multi-hop navigation patterns", () => {
    const db = client.database("test_db");

    const query = db.from(contacts).navigate(invoices).navigate(lineItems).list();
    expect(query.getQueryString()).toBe("/contacts/invoices/lineItems?$top=1000");

    // Navigate from a specific contact to their invoices
    const contactInvoices = db.from(contacts).get("contact-123").navigate(invoices);

    expect(
      contactInvoices
        .select({
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
        })
        .getQueryString(),
    ).toBe("/contacts('contact-123')/invoices?$select=invoiceNumber,status");

    // Navigate from a specific invoice to its line items
    const invoiceLineItems = db.from(invoices).get("inv-456").expand(lineItems);

    expect(
      invoiceLineItems
        .select({
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
        })
        .getQueryString(),
    ).toBe("/invoices('inv-456')?$select=invoiceNumber,total&$expand=lineItems");

    const nestedExpand = db
      .from(contacts)
      .get("contact-123")
      .expand(invoices, (b: any) =>
        b.expand(lineItems, (b: any) =>
          b.select({
            description: lineItems.description,
            quantity: lineItems.quantity,
          }),
        ),
      );

    expect(nestedExpand.getQueryString()).toBe(
      "/contacts('contact-123')?$expand=invoices($expand=lineItems($select=description,quantity))",
    );

    // await nestedExpand.execute({
    //   fetchHandler: simpleMock({ status: 200, body: {} }),
    // });
  });

  // Issue #107: navigate() doesn't include parent table in URL path
  // when defaultSelect is "schema" or an object
  describe("with defaultSelect='schema' (#107)", () => {
    it("should include parent table in URL path", () => {
      const db = client.database("test_db");
      const query = db
        .from(contactsWithSchema)
        .navigate(usersWithSchema)
        .list()
        .where("contacts/closedDate eq null")
        .select({ name: usersWithSchema.name })
        .top(10);

      expect(query.getQueryString()).toContain("/contacts/users");
    });

    it("should include parent table in URL path without filter", () => {
      const db = client.database("test_db");
      const query = db.from(contactsWithSchema).navigate(usersWithSchema).list();

      expect(query.getQueryString()).toMatch(contactsUsersPathRegex);
    });
  });
});
