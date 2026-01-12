/**
 * Mock Layout Metadata Fixtures
 *
 * These fixtures contain sample layout metadata responses for use in unit tests.
 * They follow the same structure as the FileMaker Data API layoutMetadata endpoint.
 *
 * To add new fixtures:
 * 1. Add a new entry to mockLayoutMetadata with a descriptive key
 * 2. Follow the LayoutMetadataResponse structure from @proofkit/fmdapi
 */

import type { clientTypes } from "@proofkit/fmdapi";

export type LayoutMetadata = clientTypes.LayoutMetadataResponse;

/**
 * Helper to create a field metadata entry
 */
function field(
  name: string,
  result: clientTypes.FieldMetaData["result"],
  options?: Partial<clientTypes.FieldMetaData>,
): clientTypes.FieldMetaData {
  return {
    name,
    type: "normal",
    displayType: "editText",
    result,
    global: false,
    autoEnter: false,
    fourDigitYear: false,
    maxRepeat: 1,
    maxCharacters: 0,
    notEmpty: false,
    numeric: false,
    repetitions: 1,
    timeOfDay: false,
    ...options,
  };
}

/**
 * Helper to create a value list
 */
function valueList(
  name: string,
  values: string[],
  type: "customList" | "byField" = "customList",
): { name: string; type: "customList" | "byField"; values: Array<{ value: string; displayValue: string }> } {
  return {
    name,
    type,
    values: values.map((v) => ({ value: v, displayValue: v })),
  };
}

/**
 * Mock layout metadata fixtures for typegen tests
 */
export const mockLayoutMetadata = {
  /**
   * Basic layout with text and number fields
   */
  "basic-layout": {
    fieldMetaData: [
      field("recordId", "text"),
      field("name", "text"),
      field("email", "text"),
      field("age", "number"),
      field("balance", "number"),
      field("created_at", "timeStamp"),
    ],
    portalMetaData: {},
    valueLists: [],
  } satisfies LayoutMetadata,

  /**
   * Layout with portal data
   */
  "layout-with-portal": {
    fieldMetaData: [field("recordId", "text"), field("customer_name", "text"), field("total_orders", "number")],
    portalMetaData: {
      Orders: [
        field("Orders::order_id", "text"),
        field("Orders::order_date", "date"),
        field("Orders::amount", "number"),
        field("Orders::status", "text"),
      ],
    },
    valueLists: [],
  } satisfies LayoutMetadata,

  /**
   * Layout with value lists
   */
  "layout-with-value-lists": {
    fieldMetaData: [
      field("recordId", "text"),
      field("name", "text"),
      field("status", "text", { valueList: "StatusOptions" }),
      field("priority", "text", { valueList: "PriorityOptions" }),
      field("category", "text", { valueList: "CategoryOptions" }),
    ],
    portalMetaData: {},
    valueLists: [
      valueList("StatusOptions", ["Active", "Inactive", "Pending"]),
      valueList("PriorityOptions", ["High", "Medium", "Low"]),
      valueList("CategoryOptions", ["Type A", "Type B", "Type C"]),
    ],
  } satisfies LayoutMetadata,

  /**
   * Layout with all field types
   */
  "layout-all-field-types": {
    fieldMetaData: [
      field("recordId", "text"),
      field("text_field", "text"),
      field("number_field", "number"),
      field("date_field", "date"),
      field("time_field", "time"),
      field("timestamp_field", "timeStamp"),
      field("container_field", "container"),
      field("calc_field", "text", { type: "calculation" }),
      field("summary_field", "number", { type: "summary" }),
      field("global_field", "text", { global: true }),
    ],
    portalMetaData: {},
    valueLists: [],
  } satisfies LayoutMetadata,

  /**
   * Complex layout with multiple portals and value lists
   */
  "complex-layout": {
    fieldMetaData: [
      field("customer_id", "text"),
      field("first_name", "text"),
      field("last_name", "text"),
      field("email", "text"),
      field("phone", "text"),
      field("status", "text", { valueList: "CustomerStatus" }),
      field("tier", "text", { valueList: "CustomerTier" }),
      field("balance", "number"),
      field("created_at", "timeStamp"),
      field("notes", "text"),
    ],
    portalMetaData: {
      Orders: [
        field("Orders::order_id", "text"),
        field("Orders::order_date", "date"),
        field("Orders::total", "number"),
        field("Orders::status", "text"),
      ],
      Invoices: [
        field("Invoices::invoice_id", "text"),
        field("Invoices::invoice_date", "date"),
        field("Invoices::amount", "number"),
        field("Invoices::paid", "number"),
      ],
    },
    valueLists: [
      valueList("CustomerStatus", ["Active", "Inactive", "Suspended"]),
      valueList("CustomerTier", ["Bronze", "Silver", "Gold", "Platinum"]),
    ],
  } satisfies LayoutMetadata,

  /**
   * Layout simulating "layout" from the E2E test environment
   * (matches the layout used in typegen.test.ts)
   */
  layout: {
    fieldMetaData: [
      field("recordId", "text"),
      field("anything", "text"),
      field("booleanField", "number"),
      field("CreationTimestamp", "timeStamp"),
    ],
    portalMetaData: {
      test: [field("related::related_field", "text"), field("related::recordId", "number")],
    },
    valueLists: [valueList("TestValueList", ["Option 1", "Option 2", "Option 3"])],
  } satisfies LayoutMetadata,

  /**
   * Layout simulating "customer_fieldsMissing" from the E2E test environment
   */
  customer_fieldsMissing: {
    fieldMetaData: [field("name", "text"), field("phone", "text")],
    portalMetaData: {},
    valueLists: [],
  } satisfies LayoutMetadata,
} satisfies Record<string, LayoutMetadata>;

export type MockLayoutMetadataKey = keyof typeof mockLayoutMetadata;
