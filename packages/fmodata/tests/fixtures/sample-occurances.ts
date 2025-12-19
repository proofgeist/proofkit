import {
  fmTableOccurrence,
  textField,
  numberField,
  dateField,
  containerField,
  timestampField,
} from "@proofkit/fmodata";
import { z } from "zod/v4";

// ============================================================================
// Define all TableOccurrences with navigationPaths
// ============================================================================

export const Addresses = fmTableOccurrence(
  "Addresses",
  {
    "ADDRESS code": numberField().entityId("FMFID:4296032405"),
    "ADDRESS name": textField().entityId("FMFID:12885966997"),
    "ADDRESS address": textField().primaryKey().entityId("FMFID:17180934293"), // Key field - never null
    "ADDRESS city": textField().readOnly().entityId("FMFID:25770868885"),
    "ADDRESS state": textField().entityId("FMFID:30065836181"),
    "ADDRESS zip": textField().entityId("FMFID:34360803477"),
    full_address: textField().readOnly().entityId("FMFID:38655770773"),
    search_address: textField().readOnly().entityId("FMFID:51540672661"),
    created_date: dateField().entityId("FMFID:120260149397"), // Edm.Date
    modified_date: dateField().notNull().entityId("FMFID:124555116693"), // Not marked as nullable in metadata
  },
  {
    entityId: "FMTID:1065109",
    navigationPaths: ["Tickets"],
  },
);

export const Builder_Contacts = fmTableOccurrence(
  "Builder_Contacts",
  {
    __pk_builder_contacts_id: textField()
      .primaryKey()
      .entityId("FMFID:4296032403"), // Key field - never null
    CreationTimestamp: timestampField().notNull().entityId("FMFID:8590999699"), // DateTimeOffset, not nullable
    CreatedBy: textField().notNull().entityId("FMFID:12885966995"), // Not nullable
    ModificationTimestamp: timestampField()
      .notNull()
      .entityId("FMFID:17180934291"), // DateTimeOffset, not nullable
    ModifiedBy: textField().notNull().entityId("FMFID:21475901587"), // Not nullable
    _fk_builder_id: textField().entityId("FMFID:25770868883"),
    First_name: textField().entityId("FMFID:30065836179"),
    Last_name: textField().entityId("FMFID:34360803475"),
    Email: textField().entityId("FMFID:47245705363"),
    web_portal_access: textField().entityId("FMFID:55835639955"),
  },
  {
    entityId: "FMTID:1065107",
    navigationPaths: ["Addresses"],
  },
);

export const Tickets = fmTableOccurrence(
  "Tickets",
  {
    STATIC_1: numberField().entityId("FMFID:4296032406"),
    ticket_id: numberField().primaryKey().entityId("FMFID:8590999702"),
    work_order_id: textField().entityId("FMFID:12885966998"),
    ticket_status: textField().entityId("FMFID:17180934294"),
    description: textField().entityId("FMFID:21475901590"),
    priority: numberField().entityId("FMFID:25770868886"),
    due_date: dateField().entityId("FMFID:30065836182"), // Edm.Date
    photo: containerField().entityId("FMFID:34360803478"), // Edm.Binary (base64 string)
    created_timestamp: timestampField().entityId("FMFID:38655770774"), // DateTimeOffset
  },
  {
    entityId: "FMTID:1065110",
    navigationPaths: ["Addresses"],
  },
);

// Export as array for use with database()
export const occurrences = [Addresses, Builder_Contacts, Tickets];
