/**
 * Shared Test Setup Components
 *
 * Provides reusable base tables, table occurrences, and mock client
 * for use across test files. Based on e2e.test.ts schemas.
 */

import {
  FMServerConnection,
  defineBaseTable,
  defineTableOccurrence,
  buildOccurrences,
} from "../../src/index";
import { z } from "zod/v4";
import { InferSchemaType } from "../../src/types";

// Base Tables matching e2e.test.ts schemas

export const usersSimpleBase = defineBaseTable({
  schema: {
    id: z.string(),
    name: z.string(),
    // intentionally missing fields to test validation
  },
  idField: "id",
});

export const hobbyEnum = z.enum([
  "Board games",
  "Reading",
  "Traveling",
  "Unknown",
]);

export const contactsBase = defineBaseTable({
  schema: {
    PrimaryKey: z.string(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    hobby: hobbyEnum.nullable().catch("Unknown"),
    id_user: z.string().nullable(),
  },
  idField: "PrimaryKey",
});

export const usersBase = defineBaseTable({
  schema: {
    id: z.uuid(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    active: z.coerce.boolean(),
    fake_field: z
      .string()
      .catch("I only exist in the schema, not the database"),
    id_customer: z.string().nullable(),
  },
  idField: "id",
});

export const invoicesBase = defineBaseTable({
  schema: {
    id: z.string(),
    invoiceNumber: z.string(),
    id_contact: z.string().nullable(),
    invoiceDate: z.string().nullable(),
    dueDate: z.string().nullable(),
    total: z.number().nullable(),
    status: z.enum(["draft", "sent", "paid", "overdue"]).nullable(),
  },
  idField: "id",
});

export const lineItemsBase = defineBaseTable({
  schema: {
    id: z.string(),
    id_invoice: z.string().nullable(),
    description: z.string().nullable(),
    quantity: z.number().nullable(),
    unitPrice: z.number().nullable(),
    lineTotal: z.number().nullable(),
  },
  idField: "id",
});

export const contactsBaseWithIds = defineBaseTable({
  schema: {
    PrimaryKey: z.string(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    hobby: hobbyEnum.nullable().catch("Unknown"),
    id_user: z.string().nullable(),
  },
  idField: "PrimaryKey",
  fmfIds: {
    PrimaryKey: "FMFID:10",
    CreationTimestamp: "FMFID:11",
    CreatedBy: "FMFID:12",
    ModificationTimestamp: "FMFID:13",
    ModifiedBy: "FMFID:14",
    name: "FMFID:15",
    hobby: "FMFID:16",
    id_user: "FMFID:17",
  },
});

export const usersBaseWithIds = defineBaseTable({
  schema: {
    id: z.uuid(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    active: z.coerce.boolean(),
    fake_field: z
      .string()
      .catch("I only exist in the schema, not the database"),
    id_customer: z.string().nullable(),
  },
  idField: "id",
  fmfIds: {
    id: "FMFID:1",
    CreationTimestamp: "FMFID:2",
    CreatedBy: "FMFID:3",
    ModificationTimestamp: "FMFID:4",
    ModifiedBy: "FMFID:5",
    name: "FMFID:6",
    active: "FMFID:7",
    fake_field: "FMFID:8",
    id_customer: "FMFID:9",
  },
});

// Phase 1: Define base TableOccurrences (without navigation)
const _contactsTO = defineTableOccurrence({
  name: "contacts",
  baseTable: contactsBase,
  defaultSelect: "all",
});

const _usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
  defaultSelect: "all",
});

const _invoicesTO = defineTableOccurrence({
  name: "invoices",
  baseTable: invoicesBase,
  defaultSelect: "all",
});

const _lineItemsTO = defineTableOccurrence({
  name: "lineItems",
  baseTable: lineItemsBase,
  defaultSelect: "all",
});

// Phase 2: Build final TOs with navigation
export const occurrences = buildOccurrences({
  occurrences: [_contactsTO, _usersTO, _invoicesTO, _lineItemsTO],
  navigation: {
    contacts: ["users", "invoices"],
    users: ["contacts"],
    invoices: ["lineItems", "contacts"],
    lineItems: ["invoices"],
  },
});

// Phase 1: Define base TOs with entity IDs (without navigation)
const _contactsTOWithIds = defineTableOccurrence({
  name: "contacts",
  baseTable: contactsBaseWithIds,
  fmtId: "FMTID:200",
  defaultSelect: "all",
});

const _usersTOWithIds = defineTableOccurrence({
  name: "users",
  baseTable: usersBaseWithIds,
  fmtId: "FMTID:1065093",
  defaultSelect: "all",
});

// type check only, don't run this
() => {
  buildOccurrences({
    occurrences: [_contactsTO, _usersTO],
    navigation: {
      // @ts-expect-error - navigation to self is not allowed
      contacts: ["contacts"],
      // @ts-expect-error - navigation to nonexistent table is not allowed
      users: ["other"],
    },
  });

  // Full navigation
  buildOccurrences({
    occurrences: [_contactsTOWithIds, _usersTOWithIds],
    navigation: {
      contacts: ["users"],
      users: ["contacts"],
    },
  });

  // Partial navigation
  buildOccurrences({
    occurrences: [_contactsTOWithIds, _usersTOWithIds],
    navigation: {
      contacts: ["users"],
    },
  });

  // No navigation
  buildOccurrences({
    occurrences: [_contactsTOWithIds, _usersTOWithIds],
  });
};

// Phase 2: Build final TOs with navigation
export const occurrencesWithIds = buildOccurrences({
  occurrences: [_contactsTOWithIds, _usersTOWithIds],
  navigation: {
    contacts: ["users"],
    users: ["contacts"],
  },
});

export const usersSimpleTO = defineTableOccurrence({
  name: "users", // same name as usersTO to test validation
  baseTable: usersSimpleBase,
});

defineBaseTable({
  schema: {
    id: z.string(),
    name: z.string(),
    // extra: z.string(), // try omitting this field
  },
  idField: "id",
  required: ["extra"],
  fmfIds: {
    id: "FMFID:1",
    name: "FMFID:2",
    extra: "FMFID:3", // no TS error
  },
});

// Types
export type ContactSchema = InferSchemaType<typeof contactsBase.schema>;
export type UserSchema = InferSchemaType<typeof usersBase.schema>;
export type InvoiceSchema = InferSchemaType<typeof invoicesBase.schema>;
export type LineItemSchema = InferSchemaType<typeof lineItemsBase.schema>;

// Mock client factory - ensures unit tests never hit real databases
export function createMockClient(): FMServerConnection {
  return new FMServerConnection({
    serverUrl: "https://api.example.com",
    auth: { apiKey: "test-api-key" },
  });
}
