/**
 * Shared Test Setup Components
 *
 * Provides reusable table occurrences and mock client
 * for use across test files. Based on e2e.test.ts schemas.
 */

import {
  dateField,
  type FieldBuilder,
  FMServerConnection,
  fmTableOccurrence,
  type InferTableSchema,
  numberField,
  textField,
  timestampField,
} from "@proofkit/fmodata";
import { z } from "zod/v4";

// Helper function for boolean fields (FileMaker stores as 0/1)
const booleanField = (): FieldBuilder<boolean, boolean, number | null, false> =>
  numberField()
    // Parses the number to a boolean when reading from the database
    .readValidator(z.coerce.boolean())
    // Allows the user to pass a boolean when inserting or updating, converting it back to number
    .writeValidator(z.boolean().transform((val) => (val ? 1 : 0)));

export const hobbyEnum = z.enum(["Board games", "Reading", "Traveling", "Unknown"]);

// Table occurrences using new ORM patterns

export const contacts = fmTableOccurrence(
  "contacts",
  {
    PrimaryKey: textField().primaryKey(),
    CreationTimestamp: timestampField().readOnly(),
    CreatedBy: textField().readOnly(),
    ModificationTimestamp: timestampField().readOnly(),
    ModifiedBy: textField(),
    name: textField(),
    hobby: textField().readValidator(hobbyEnum.nullable().catch("Unknown")),
    id_user: textField(),
    image: containerField(), // should not be included in the default select when set to "all" or "schema"
  },
  {
    defaultSelect: "all",
    navigationPaths: ["users", "invoices"],
  },
);

export const users = fmTableOccurrence(
  "users",
  {
    id: textField().primaryKey().readValidator(z.uuid()),
    CreationTimestamp: timestampField(),
    CreatedBy: textField(),
    ModificationTimestamp: timestampField(),
    ModifiedBy: textField(),
    name: textField(),
    active: booleanField(),
    fake_field: textField().readValidator(z.string().catch("I only exist in the schema, not the database")),
    id_customer: textField(),
  },
  {
    defaultSelect: "all",
    navigationPaths: ["contacts"],
  },
);

export const invoices = fmTableOccurrence(
  "invoices",
  {
    id: textField().primaryKey(),
    invoiceNumber: textField().notNull(),
    id_contact: textField(),
    invoiceDate: dateField(),
    dueDate: dateField(),
    total: numberField(),
    status: textField().readValidator(z.enum(["draft", "sent", "paid", "overdue"]).nullable()),
  },
  {
    defaultSelect: "all",
    navigationPaths: ["lineItems", "contacts"],
  },
);

export const lineItems = fmTableOccurrence(
  "lineItems",
  {
    id: textField().primaryKey(),
    id_invoice: textField(),
    description: textField(),
    quantity: numberField(),
    unitPrice: numberField(),
    lineTotal: numberField(),
  },
  {
    defaultSelect: "all",
    navigationPaths: ["invoices"],
  },
);

// Table occurrences with entity IDs
export const contactsTOWithIds = fmTableOccurrence(
  "contacts",
  {
    PrimaryKey: textField().primaryKey().entityId("FMFID:10"),
    CreationTimestamp: timestampField().entityId("FMFID:11"),
    CreatedBy: textField().entityId("FMFID:12"),
    ModificationTimestamp: timestampField().entityId("FMFID:13"),
    ModifiedBy: textField().entityId("FMFID:14"),
    name: textField().entityId("FMFID:15"),
    hobby: textField().entityId("FMFID:16").readValidator(hobbyEnum.nullable().catch("Unknown")),
    id_user: textField().entityId("FMFID:17"),
  },
  {
    entityId: "FMTID:200",
    useEntityIds: true,
    defaultSelect: "all",
    navigationPaths: ["users"],
  },
);

export const usersTOWithIds = fmTableOccurrence(
  "users",
  {
    id: textField().primaryKey().entityId("FMFID:1").readValidator(z.uuid()),
    CreationTimestamp: timestampField().entityId("FMFID:2"),
    CreatedBy: textField().entityId("FMFID:3"),
    ModificationTimestamp: timestampField().entityId("FMFID:4"),
    ModifiedBy: textField().entityId("FMFID:5"),
    name: textField().entityId("FMFID:6"),
    active: booleanField().entityId("FMFID:7"),
    fake_field: textField()
      .entityId("FMFID:8")
      .readValidator(z.string().catch("I only exist in the schema, not the database")),
    id_customer: textField().entityId("FMFID:9"),
  },
  {
    entityId: "FMTID:1065093",
    useEntityIds: true,
    defaultSelect: "all",
    navigationPaths: ["contacts"],
  },
);

export const arbitraryTable = fmTableOccurrence("arbitrary_table", {
  id: textField().primaryKey(),
  name: textField().notNull(),
});

// Simple users table occurrence (same name as usersTO to test validation)
export const usersSimpleTO = fmTableOccurrence("users", {
  id: textField().primaryKey().notNull(),
  name: textField().notNull(),
  // intentionally missing fields to test validation
});

// Types - extract from table occurrences for backward compatibility
export type ContactSchema = InferTableSchema<typeof contacts>;
export type UserSchema = InferTableSchema<typeof users>;
export type InvoiceSchema = InferTableSchema<typeof invoices>;
export type LineItemSchema = InferTableSchema<typeof lineItems>;

// Backward-compatible base table exports for tests that need .schema property
// These extract the schema from the new FMTable instances
import { containerField, FMTable } from "@proofkit/fmodata";

// biome-ignore lint/suspicious/noExplicitAny: Generic constraint accepting any FMTable configuration
function _getSchemaFromTable<T extends FMTable<any, any>>(table: T) {
  // biome-ignore lint/suspicious/noExplicitAny: Symbol property access requires type assertion
  return (table as any)[FMTable.Symbol.Schema];
}

// export const contactsBase = {
//   schema: getSchemaFromTable(contactsTO),
// } as const;

// export const usersBase = {
//   schema: getSchemaFromTable(usersTO),
// } as const;

// export const invoicesBase = {
//   schema: getSchemaFromTable(invoicesTO),
// } as const;

// export const lineItemsBase = {
//   schema: getSchemaFromTable(lineItemsTO),
// } as const;

// export const contactsBaseWithIds = {
//   schema: getSchemaFromTable(contactsTOWithIds),
// } as const;

// export const usersBaseWithIds = {
//   schema: getSchemaFromTable(usersTOWithIds),
// } as const;

// Mock client factory - ensures unit tests never hit real databases
export function createMockClient(): FMServerConnection {
  return new FMServerConnection({
    serverUrl: "https://api.example.com",
    auth: { apiKey: "test-api-key" },
  });
}
