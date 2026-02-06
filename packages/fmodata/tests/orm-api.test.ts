import {
  and,
  type Column,
  contains,
  eq,
  FMTable,
  fmTableOccurrence,
  gt,
  isColumn,
  isColumnFunction,
  matchesPattern,
  numberField,
  or,
  textField,
  timestampField,
  tolower,
  toupper,
  trim,
} from "@proofkit/fmodata";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

describe("ORM API", () => {
  describe("Field Builders", () => {
    it("should create a text field", () => {
      const field = textField();

      const config = field._getConfig();
      expect(config.fieldType).toBe("text");
      expect(config.notNull).toBe(false);
      expect(config.primaryKey).toBe(false);
    });

    it("should chain methods correctly", () => {
      const field = textField().notNull().entityId("FMFID:1");
      const config = field._getConfig();
      expect(config.notNull).toBe(true);
      expect(config.entityId).toBe("FMFID:1");
    });

    it("should mark primary key as read-only", () => {
      const field = textField().primaryKey();
      const config = field._getConfig();
      expect(config.primaryKey).toBe(true);
      expect(config.readOnly).toBe(true);
    });

    it("should support output validator", () => {
      const validator = z.enum(["a", "b", "c"]);
      const field = textField().readValidator(validator);
      const config = field._getConfig();
      expect(config.outputValidator).toBe(validator);
    });

    it("should support input validator", () => {
      const validator = z.boolean().transform((v) => (v ? 1 : 0));
      const field = numberField().writeValidator(validator);
      const config = field._getConfig();
      expect(config.inputValidator).toBe(validator);
    });

    it("should support both read and write validators", () => {
      const readValidator = z.coerce.boolean();
      const writeValidator = z.boolean().transform((v) => (v ? 1 : 0));
      const field = numberField().readValidator(readValidator).writeValidator(writeValidator);
      const config = field._getConfig();
      expect(config.outputValidator).toBe(readValidator);
      expect(config.inputValidator).toBe(writeValidator);
    });
  });

  describe("Table Definition", () => {
    it("should create a table occurrence", () => {
      const users = fmTableOccurrence(
        "users",
        {
          id: textField().primaryKey().entityId("FMFID:1"),
          name: textField().notNull().entityId("FMFID:2"),
          email: textField().entityId("FMFID:3"),
        },
        {
          entityId: "FMTID:100",
          defaultSelect: "schema",
          navigationPaths: ["contacts"],
        },
      );

      expect((users as any)[FMTable.Symbol.Name]).toBe("users");
      expect((users as any)[FMTable.Symbol.EntityId]).toBe("FMTID:100");
      expect((users as any)[FMTable.Symbol.NavigationPaths]).toEqual(["contacts"]);
    });

    it("should create column references", () => {
      const users = fmTableOccurrence(
        "users",
        {
          id: textField().primaryKey().entityId("FMFID:1"),
          name: textField().notNull().entityId("FMFID:2"),
        },
        { entityId: "FMTID:100" },
      );

      expect(isColumn(users.id)).toBe(true);
      expect(users.id.fieldName).toBe("id");
      expect(users.id.entityId).toBe("FMFID:1");
      expect(users.id.tableName).toBe("users");
      expect(users.id.tableEntityId).toBe("FMTID:100");
    });

    it("should extract metadata correctly", () => {
      const users = fmTableOccurrence(
        "users",
        {
          id: textField().primaryKey().entityId("FMFID:1"),
          name: textField().notNull().entityId("FMFID:2"),
          email: textField().entityId("FMFID:3"),
          createdAt: timestampField().readOnly().entityId("FMFID:4"),
        },
        { entityId: "FMTID:100" },
      );

      const config = (users as any)[FMTable.Symbol.BaseTableConfig];
      expect(config.idField).toBe("id");
      expect(config.required).toContain("name");
      expect(config.readOnly).toContain("id"); // primary key
      expect(config.readOnly).toContain("createdAt");
      expect(config.fmfIds).toEqual({
        id: "FMFID:1",
        name: "FMFID:2",
        email: "FMFID:3",
        createdAt: "FMFID:4",
      });
    });

    it("should store inputSchema when writeValidators are present", () => {
      const writeValidator = z.boolean().transform((v) => (v ? 1 : 0));
      const users = fmTableOccurrence(
        "users",
        {
          id: textField().primaryKey(),
          active: numberField().writeValidator(writeValidator),
          name: textField(),
        },
        {},
      );

      const config = (users as any)[FMTable.Symbol.BaseTableConfig];
      expect(config.inputSchema).toBeDefined();
      expect(config.inputSchema?.active).toBe(writeValidator);
      expect(config.inputSchema?.name).toBeUndefined(); // No writeValidator for name
    });

    it("should not store inputSchema when no writeValidators are present", () => {
      const users = fmTableOccurrence(
        "users",
        {
          id: textField().primaryKey(),
          name: textField(),
        },
        {},
      );

      const config = (users as any)[FMTable.Symbol.BaseTableConfig];
      expect(config.inputSchema).toBeUndefined();
    });
  });

  describe("Column References", () => {
    it("should identify columns", () => {
      const users = fmTableOccurrence("users", { id: textField(), name: textField() }, {});

      expect(isColumn(users.id)).toBe(true);
      expect(isColumn(users.name)).toBe(true);
      expect(isColumn("not a column")).toBe(false);
    });

    it("should get field identifier", () => {
      const users = fmTableOccurrence("users", { id: textField().entityId("FMFID:1") }, {});

      expect(users.id.getFieldIdentifier(false)).toBe("id");
      expect(users.id.getFieldIdentifier(true)).toBe("FMFID:1");
    });

    it("should check table membership", () => {
      const users = fmTableOccurrence("users", { id: textField() }, {});

      expect(users.id.isFromTable("users")).toBe(true);
      expect(users.id.isFromTable("contacts")).toBe(false);
    });
  });

  describe("Filter Operators", () => {
    const users = fmTableOccurrence(
      "users",
      {
        id: textField().entityId("FMFID:1"),
        name: textField().entityId("FMFID:2"),
        age: numberField().entityId("FMFID:3"),
      },
      { entityId: "FMTID:100" },
    );

    it("should create eq operator", () => {
      const expr = eq(users.name, "John");
      expect(expr.operator).toBe("eq");
      expect(expr.toODataFilter(false)).toBe("name eq 'John'");
    });

    it("should create gt operator", () => {
      const expr = gt(users.age, 18);
      expect(expr.operator).toBe("gt");
      expect(expr.toODataFilter(false)).toBe("age gt 18");
    });

    it("should create contains operator", () => {
      const expr = contains(users.name, "John");
      expect(expr.operator).toBe("contains");
      expect(expr.toODataFilter(false)).toBe("contains(name, 'John')");
    });

    it("should support column-to-column comparison", () => {
      const contacts = fmTableOccurrence("contacts", { id_user: textField() }, {});
      const expr = eq(users.id, contacts.id_user);
      expect(expr.toODataFilter(false)).toBe('"id" eq "id_user"');
    });

    it("should use entity IDs when enabled", () => {
      const expr = eq(users.name, "John");
      expect(expr.toODataFilter(true)).toBe("FMFID:2 eq 'John'");
    });

    it("should create and operator", () => {
      const expr = and(eq(users.name, "John"), gt(users.age, 18));
      expect(expr.operator).toBe("and");
      expect(expr.toODataFilter(false)).toBe("name eq 'John' and age gt 18");
    });

    it("should create or operator", () => {
      const expr = or(eq(users.name, "John"), eq(users.name, "Jane"));
      expect(expr.operator).toBe("or");
      expect(expr.toODataFilter(false)).toBe("name eq 'John' or name eq 'Jane'");
    });

    it("should handle nested logical operators", () => {
      const expr = and(eq(users.name, "John"), or(gt(users.age, 18), eq(users.age, 18)));
      expect(expr.toODataFilter(false)).toBe("name eq 'John' and (age gt 18 or age eq 18)");
    });

    it("should escape single quotes in strings", () => {
      const expr = eq(users.name, "O'Brien");
      expect(expr.toODataFilter(false)).toBe("name eq 'O''Brien'");
    });

    it("should create matchesPattern operator", () => {
      const expr = matchesPattern(users.name, "^A.*e$");
      expect(expr.operator).toBe("matchesPattern");
      expect(expr.toODataFilter(false)).toBe("matchesPattern(name, '^A.*e$')");
    });

    it("should create tolower column function", () => {
      const col = tolower(users.name);
      expect(isColumnFunction(col)).toBe(true);
      expect(isColumn(col)).toBe(true);
      expect(col.toFilterString(false)).toBe("tolower(name)");

      const expr = eq(col, "john");
      expect(expr.toODataFilter(false)).toBe("tolower(name) eq 'john'");
    });

    it("should serialize nested column functions", () => {
      const col = tolower(trim(users.name));
      expect(col.toFilterString(false)).toBe("tolower(trim(name))");

      const expr = eq(col, "john");
      expect(expr.toODataFilter(false)).toBe("tolower(trim(name)) eq 'john'");
    });

    it("should use entity IDs in column functions", () => {
      const col = toupper(users.name);
      expect(col.toFilterString(true)).toBe("toupper(FMFID:2)");
    });
  });

  describe("Type Safety", () => {
    it("should infer output types from validators", () => {
      const users = fmTableOccurrence(
        "users",
        {
          status: textField().readValidator(z.enum(["active", "pending", "inactive"])),
        },
        {},
      );

      // Type test - the column type matches the validator output type
      // Since the field is nullable by default, the type includes null
      const col: Column<"active" | "pending" | "inactive" | null, "status"> = users.status as any; // Type assertion needed due to nullable field inference
      expect(col.fieldName).toBe("status");
    });

    it("should handle nullable fields", () => {
      const users = fmTableOccurrence(
        "users",
        {
          email: textField(), // nullable by default
          name: textField().notNull(), // not null
        },
        {},
      );

      // Type test
      const emailCol: Column<string | null, string | null, "users", false> = users.email;
      const nameCol: Column<string | null, string | null, "users", false> = users.name;

      expect(emailCol.fieldName).toBe("email");
      expect(nameCol.fieldName).toBe("name");
    });
  });
});
