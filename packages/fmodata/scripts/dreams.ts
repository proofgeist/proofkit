// Example of the new ORM-style API for fmodata
// This demonstrates the Drizzle-inspired syntax with field builders and operators

import {
  fmTableOccurrence,
  textField,
  numberField,
  dateField,
  timeField,
  timestampField,
  containerField,
  calcField,
  eq,
  gt,
  and,
  or,
  contains,
} from "../src/orm";
import { FMServerConnection } from "../src";
import { z } from "zod/v4";

// Helper function for boolean fields (FileMaker stores as 0/1)
const booleanField = () =>
  numberField()
    // Parses the number to a boolean when reading from the database
    .outputValidator(z.coerce.boolean())
    // Allows the user to pass a boolean when inserting or updating, converting it back to number
    .inputValidator(z.boolean().transform((val) => (val ? 1 : 0)));

// Define table with field builders
// All fields nullable by default, unless primary key or "notNull" is set
export const users = fmTableOccurrence(
  "users", // table name on the graph
  {
    id: textField().primaryKey().entityId("FMFID:1"),
    CreationTimestamp: timestampField().readOnly().entityId("FMFID:2"),
    CreatedBy: textField().readOnly().entityId("FMFID:3"),
    ModificationTimestamp: timestampField().readOnly().entityId("FMFID:4"),
    ModifiedBy: textField().readOnly().entityId("FMFID:5"),
    name: textField().notNull().entityId("FMFID:6"),
    active: booleanField().entityId("FMFID:7"),
    id_customer: textField().entityId("FMFID:8"),
    hobby: textField()
      .outputValidator(z.enum(["reading", "writing", "coding"]))
      .entityId("FMFID:9"),
  },
  {
    entityId: "FMTID:100",
    defaultSelect: "schema",
    navigationPaths: ["contacts"], // Runtime validation when expanding
  },
);

// @ts-expect-error should not be able to see property
users._entityId;

// @ts-expect-error should not be able to see symbols
users[FMTableBaseTableConfig];

// Example contacts table
export const contacts = fmTableOccurrence(
  "contacts",
  {
    id: textField().primaryKey().entityId("FMFID:10"),
    name: textField().notNull().entityId("FMFID:11"),
    email: textField().entityId("FMFID:12"),
    id_user: textField().entityId("FMFID:13"),
  },
  {
    entityId: "FMTID:101",
    defaultSelect: "schema",
    navigationPaths: ["users"],
  },
);

const connection = new FMServerConnection({
  serverUrl: "https://api.example.com",
  auth: { apiKey: "test-api-key" },
});

const db = connection.database("MyDatabase.fmp12");

// Expand with FMTable object (validated against navigationPaths)
db.from(users).list().expand(contacts);

// Navigate with FMTable object (validated against navigationPaths)
db.from(users).navigate(contacts).list();

// ============================================================================
// Query Examples - New ORM-style API
// ============================================================================

// Select with typed strings (original style)
db.from(users).list().select(users.id);

// Select with Column references (new capability)
db.from(users)
  .list()
  .select({ id: users.id, name: users.name, hobby: users.hobby });

// Filter with operators - "reading" autocompletes based on enum
db.from(users)
  .list()
  .select(users.id, users.name)
  .where(eq(users.hobby, "reading"));

// Complex filters with logical operators
db.from(users)
  .list()
  .select("id", "name")
  .where(
    and(
      eq(users.active, true),
      or(eq(users.hobby, "reading"), eq(users.hobby, "coding")),
    ),
  );

// String operators
db.from(users)
  .list()
  .select("name", "email")
  .where(contains(users.name, "John"));

// // Cross-table column comparison
// db.from(users).select("id", "name").where(eq(users.id, contacts.id_user));

// OrderBy with Column references
db.from(users).list().select("id", "name").orderBy([users.name, "asc"]);

// OrderBy with strings (still supported)
db.from(users)
  .list()
  .select(users.id, users.name)
  .orderBy([
    ["name", "asc"],
    ["CreationTimestamp", "desc"],
  ]);

// ============================================================================
// Note: Insert/Update/Delete APIs remain unchanged
// ============================================================================

// Insert (existing API)
// db.from(users).insert({ name: "John", hobby: "reading" });

// Update (existing API)
// db.from(users).update({ name: "Jane" }).where(eq(users.id, "123"));

// Delete (existing API)
// db.from(users).delete().where(eq(users.id, "123"));

// ============================================================================
// Type inference examples
// ============================================================================

// users.id is Column<string, "id">
// users.name is Column<string, "name">
// users.hobby is Column<"reading" | "writing" | "coding", "hobby">
// users.active is Column<boolean, "active">

type UserId = typeof users.id; // Column<string, "id">
type UserHobby = typeof users.hobby; // Column<"reading" | "writing" | "coding", "hobby">
