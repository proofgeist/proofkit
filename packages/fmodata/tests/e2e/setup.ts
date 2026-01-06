/**
 * Shared setup for E2E tests
 *
 * Provides schemas, table occurrences, and connection setup
 * used across all E2E test files.
 */

import path from "node:path";
import { fmTableOccurrence, textField, timestampField } from "@proofkit/fmodata";
import { config } from "dotenv";
import { z } from "zod/v4";

config({ path: path.resolve(__dirname, "../../.env.local") });

// Load environment variables
export const serverUrl = process.env.FMODATA_SERVER_URL;
export const apiKey = process.env.FMODATA_API_KEY;
export const username = process.env.FMODATA_USERNAME;
export const password = process.env.FMODATA_PASSWORD;
export const database = process.env.FMODATA_DATABASE;

// Define TOs with navigationPaths
export const contacts = fmTableOccurrence(
  "contacts",
  {
    PrimaryKey: textField().primaryKey(),
    CreationTimestamp: timestampField(),
    CreatedBy: textField(),
    ModificationTimestamp: timestampField(),
    ModifiedBy: textField(),
    name: textField(),
    hobby: textField(),
    id_user: textField(),
  },
  {
    navigationPaths: ["users"],
  },
);

export const users = fmTableOccurrence(
  "users",
  {
    id: textField().primaryKey(),
    CreationTimestamp: timestampField(),
    CreatedBy: textField(),
    ModificationTimestamp: timestampField(),
    ModifiedBy: textField(),
    name: textField(),
    id_customer: textField(),
  },
  {
    navigationPaths: ["contacts"],
  },
);

// Define TOs with entity IDs and navigationPaths
export const contactsTOWithIds = fmTableOccurrence(
  "contacts",
  {
    PrimaryKey: textField().primaryKey().entityId("FMFID:4296032390"),
    CreationTimestamp: timestampField().readOnly().entityId("FMFID:8590999686"),
    CreatedBy: textField().readOnly().entityId("FMFID:12885966982"),
    ModificationTimestamp: timestampField().readOnly().entityId("FMFID:17180934278"),
    ModifiedBy: textField().readOnly().entityId("FMFID:21475901574"),
    name_renamed: textField().entityId("FMFID:25770868870"), // in FM: "name"
    hobby: textField().entityId("FMFID:30065836166"),
    id_user: textField().entityId("FMFID:38655770758"),
  },
  {
    entityId: "FMTID:1065094",
    navigationPaths: ["users"],
  },
);

export const usersTOWithIds = fmTableOccurrence(
  "users",
  {
    id: textField().primaryKey().entityId("FMFID:4296032389"),
    CreationTimestamp: timestampField().readOnly().entityId("FMFID:8590999685"),
    CreatedBy: textField().readOnly().entityId("FMFID:12885966981"),
    ModificationTimestamp: timestampField().readOnly().entityId("FMFID:17180934277"),
    ModifiedBy: textField().readOnly().entityId("FMFID:21475901573"),
    name: textField().entityId("FMFID:25770868869"),
    id_customer: textField().entityId("FMFID:30065836165"),
  },
  {
    entityId: "FMTID:1065093",
    navigationPaths: ["contacts"],
  },
);

// Export occurrences array for backward compatibility
export const occurrencesWithIds = [contactsTOWithIds, usersTOWithIds] as const;

// Schema for batch operations tests
export const contactsTOForBatch = fmTableOccurrence("contacts", {
  PrimaryKey: textField().primaryKey(),
  CreationTimestamp: timestampField(),
  CreatedBy: textField(),
  ModificationTimestamp: timestampField(),
  ModifiedBy: textField(),
  name: textField(),
  hobby: textField().readValidator(z.string().transform((_val) => "static-value")),
  id_user: textField(),
});

export const usersTOForBatch = fmTableOccurrence("users", {
  id: textField().primaryKey(),
  CreationTimestamp: timestampField(),
  CreatedBy: textField(),
  ModificationTimestamp: timestampField(),
  ModifiedBy: textField(),
  name: textField(),
  id_customer: textField(),
});
