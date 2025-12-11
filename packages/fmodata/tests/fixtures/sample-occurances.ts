import {
  defineBaseTable,
  defineTableOccurrence,
  buildOccurrences,
} from "../../src";
import { z } from "zod/v4";

// ============================================================================
// Phase 1: Define all TableOccurrences (without navigation)
// ============================================================================

const _Addresses = defineTableOccurrence({
  fmtId: "FMTID:1065109",
  name: "Addresses",
  baseTable: defineBaseTable({
    schema: {
      "ADDRESS code": z.number().nullable(),
      "ADDRESS name": z.string().nullable(),
      "ADDRESS address": z.string(), // Key field - never null
      "ADDRESS city": z.string().nullable(),
      "ADDRESS state": z.string().nullable(),
      "ADDRESS zip": z.string().nullable(),
      full_address: z.string().nullable(),
      search_address: z.string().nullable(),
      created_date: z.string().nullable(), // Edm.Date
      modified_date: z.string(), // Not marked as nullable in metadata
    },
    idField: "ADDRESS address",
    fmfIds: {
      "ADDRESS code": "FMFID:4296032405",
      "ADDRESS name": "FMFID:12885966997",
      "ADDRESS address": "FMFID:17180934293",
      "ADDRESS city": "FMFID:25770868885",
      "ADDRESS state": "FMFID:30065836181",
      "ADDRESS zip": "FMFID:34360803477",
      full_address: "FMFID:38655770773",
      search_address: "FMFID:51540672661",
      created_date: "FMFID:120260149397",
      modified_date: "FMFID:124555116693",
    },
    readOnly: ["ADDRESS city", "full_address", "search_address"], // Calculation fields
  }),
});

const _Builder_Contacts = defineTableOccurrence({
  fmtId: "FMTID:1065107",
  name: "Builder_Contacts",
  baseTable: defineBaseTable({
    schema: {
      __pk_builder_contacts_id: z.string(), // Key field - never null
      CreationTimestamp: z.string(), // DateTimeOffset, not nullable
      CreatedBy: z.string(), // Not nullable
      ModificationTimestamp: z.string(), // DateTimeOffset, not nullable
      ModifiedBy: z.string(), // Not nullable
      _fk_builder_id: z.string().nullable(),
      First_name: z.string().nullable(),
      Last_name: z.string().nullable(),
      Email: z.string().nullable(),
      web_portal_access: z.string().nullable(),
    },
    idField: "__pk_builder_contacts_id",
    fmfIds: {
      __pk_builder_contacts_id: "FMFID:4296032403",
      CreationTimestamp: "FMFID:8590999699",
      CreatedBy: "FMFID:12885966995",
      ModificationTimestamp: "FMFID:17180934291",
      ModifiedBy: "FMFID:21475901587",
      _fk_builder_id: "FMFID:25770868883",
      First_name: "FMFID:30065836179",
      Last_name: "FMFID:34360803475",
      Email: "FMFID:47245705363",
      web_portal_access: "FMFID:55835639955",
    },
  }),
});

const _Tickets = defineTableOccurrence({
  fmtId: "FMTID:1065110",
  name: "Tickets" as const,
  baseTable: defineBaseTable({
    schema: {
      STATIC_1: z.number().nullable(),
      ticket_id: z.number().nullable(),
      work_order_id: z.string().nullable(),
      ticket_status: z.string().nullable(),
      description: z.string().nullable(),
      priority: z.number().nullable(),
      due_date: z.string().nullable(), // Edm.Date
      photo: z.string().nullable(), // Edm.Binary (base64 string)
      created_timestamp: z.string().nullable(), // DateTimeOffset
    },
    idField: "ticket_id",
    fmfIds: {
      STATIC_1: "FMFID:4296032406",
      ticket_id: "FMFID:8590999702",
      work_order_id: "FMFID:12885966998",
      ticket_status: "FMFID:17180934294",
      description: "FMFID:21475901590",
      priority: "FMFID:25770868886",
      due_date: "FMFID:30065836182",
      photo: "FMFID:34360803478",
      created_timestamp: "FMFID:38655770774",
    },
  }),
});

// ============================================================================
// Phase 2: Build final TableOccurrences with navigation relationships
// ============================================================================

export const [Addresses, Builder_Contacts, Tickets] = buildOccurrences({
  occurrences: [_Addresses, _Builder_Contacts, _Tickets],
  navigation: {
    Addresses: ["Tickets"],
    Builder_Contacts: ["Addresses"],
    Tickets: ["Addresses"],
  },
});

// Export as array for use with database()
export const occurrences = [Addresses, Builder_Contacts, Tickets];
