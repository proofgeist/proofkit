/**
 * Shared setup for E2E tests
 *
 * Provides schemas, table occurrences, and connection setup
 * used across all E2E test files.
 */

import path from "path";
import { config } from "dotenv";
import {
  FMServerConnection,
  defineBaseTable,
  defineTableOccurrence,
  buildOccurrences,
} from "../../src/index";
import { z } from "zod/v4";

config({ path: path.resolve(__dirname, "../../.env.local") });

// Load environment variables
export const serverUrl = process.env.FMODATA_SERVER_URL;
export const apiKey = process.env.FMODATA_API_KEY;
export const username = process.env.FMODATA_USERNAME;
export const password = process.env.FMODATA_PASSWORD;
export const database = process.env.FMODATA_DATABASE;

// Schema for contacts table (used in basic E2E tests)
export const contactsBase = defineBaseTable({
  schema: {
    PrimaryKey: z.string(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    hobby: z.string().nullable(),
    id_user: z.string().nullable(),
  },
  idField: "PrimaryKey",
});

// Schema for users table (used in basic E2E tests)
export const usersBase = defineBaseTable({
  schema: {
    id: z.string(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    id_customer: z.string().nullable(),
  },
  idField: "id",
});

// Phase 1: Define base TOs (without navigation)
const _contactsTO = defineTableOccurrence({
  name: "contacts",
  baseTable: contactsBase,
});

const _usersTO = defineTableOccurrence({
  name: "users",
  baseTable: usersBase,
});

// Phase 2: Build final TOs with navigation
export const [contactsTO, usersTO] = buildOccurrences({
  occurrences: [_contactsTO, _usersTO],
  navigation: {
    contacts: ["users"],
    users: ["contacts"],
  },
});

// Schema for contacts table with IDs (used in entity-ids tests)
export const contactsBaseWithIds = defineBaseTable({
  schema: {
    PrimaryKey: z.string(),
    CreationTimestamp: z.string(),
    CreatedBy: z.string(),
    ModificationTimestamp: z.string(),
    ModifiedBy: z.string(),
    name_renamed: z.string().nullable(),
    hobby: z.string().nullable(),
    id_user: z.string().nullable(),
  },
  idField: "PrimaryKey",
  readOnly: [
    "CreationTimestamp",
    "CreatedBy",
    "ModificationTimestamp",
    "ModifiedBy",
  ] as const,
  fmfIds: {
    PrimaryKey: "FMFID:4296032390",
    CreationTimestamp: "FMFID:8590999686",
    CreatedBy: "FMFID:12885966982",
    ModificationTimestamp: "FMFID:17180934278",
    ModifiedBy: "FMFID:21475901574",
    name_renamed: "FMFID:25770868870", // in FM: "name"
    hobby: "FMFID:30065836166",
    id_user: "FMFID:38655770758",
  },
});

// Schema for users table with IDs (used in entity-ids tests)
export const usersBaseWithIds = defineBaseTable({
  schema: {
    id: z.string(),
    CreationTimestamp: z.string(),
    CreatedBy: z.string(),
    ModificationTimestamp: z.string(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    id_customer: z.string().nullable(),
  },
  idField: "id",
  readOnly: [
    "CreationTimestamp",
    "CreatedBy",
    "ModifiedBy",
    "ModificationTimestamp",
  ] as const,
  fmfIds: {
    id: "FMFID:4296032389",
    CreationTimestamp: "FMFID:8590999685",
    CreatedBy: "FMFID:12885966981",
    ModificationTimestamp: "FMFID:17180934277",
    ModifiedBy: "FMFID:21475901573",
    name: "FMFID:25770868869",
    id_customer: "FMFID:30065836165",
  },
});

// Phase 1: Define base TOs with entity IDs (without navigation)
const _contactsTOWithIds = defineTableOccurrence({
  fmtId: "FMTID:1065094",
  name: "contacts",
  baseTable: contactsBaseWithIds,
});

const _usersTOWithIds = defineTableOccurrence({
  fmtId: "FMTID:1065093",
  name: "users",
  baseTable: usersBaseWithIds,
});

// Phase 2: Build final TOs with navigation
export const occurrencesWithIds = buildOccurrences({
  occurrences: [_contactsTOWithIds, _usersTOWithIds],
  navigation: {
    contacts: ["users"],
    users: ["contacts"],
  },
});

// Export individual TOs for tests that need them
export const [contactsTOWithIds, usersTOWithIds] = occurrencesWithIds;

// Schema for batch operations tests
export const contactsBaseForBatch = defineBaseTable({
  schema: {
    PrimaryKey: z.string(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    hobby: z
      .string()
      .nullable()
      .transform((val) => "static-value"),
    id_user: z.string().nullable(),
  },
  idField: "PrimaryKey",
});

export const usersBaseForBatch = defineBaseTable({
  schema: {
    id: z.string(),
    CreationTimestamp: z.string().nullable(),
    CreatedBy: z.string().nullable(),
    ModificationTimestamp: z.string().nullable(),
    ModifiedBy: z.string().nullable(),
    name: z.string().nullable(),
    id_customer: z.string().nullable(),
  },
  idField: "id",
});

export const contactsTOForBatch = defineTableOccurrence({
  name: "contacts" as const,
  baseTable: contactsBaseForBatch,
});

export const usersTOForBatch = defineTableOccurrence({
  name: "users" as const,
  baseTable: usersBaseForBatch,
});
