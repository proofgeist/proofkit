import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateODataTypes, parseMetadataFromFile } from "../../src/fmodata";
import type { FmodataConfig } from "../../src/types";

// Helper to read fixture files
const fixturesDir = path.resolve(__dirname, "../fixtures");
const outputDir = path.resolve(__dirname, "fmodata-output");

/**
 * Runs TypeScript type checking on generated files
 */
function runTypeCheck(): void {
  const tscCommand = "pnpm tsc --noEmit -p packages/typegen/tsconfig.json";
  execSync(tscCommand, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../../.."), // Execute from monorepo root
  });
}

/**
 * Cleans up the output directory
 */
async function cleanupOutput(): Promise<void> {
  await fs.rm(outputDir, { recursive: true, force: true });
}

/**
 * Normalizes content by removing whitespace for comparison
 */
function normalizeContent(content: string): string {
  return content.replace(/\s+/g, " ");
}

describe("fmodata typegen - parseMetadata", () => {
  it("parses sample XML metadata correctly", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    // Check namespace
    expect(metadata.namespace).toBe("com.filemaker.odata.TestDB.fmp12");

    // Check entity types
    expect(metadata.entityTypes.size).toBe(3);
    expect(metadata.entityTypes.has("Customers_")).toBe(true);
    expect(metadata.entityTypes.has("Orders_")).toBe(true);
    expect(metadata.entityTypes.has("LineItems_")).toBe(true);

    // Check entity sets
    expect(metadata.entitySets.size).toBe(3);
    expect(metadata.entitySets.has("Customers")).toBe(true);
    expect(metadata.entitySets.has("Orders")).toBe(true);
    expect(metadata.entitySets.has("LineItems")).toBe(true);
  });

  it("parses Customers entity type correctly", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const customers = metadata.entityTypes.get("Customers_");
    expect(customers).toBeDefined();

    // Check table-level properties
    expect(customers?.["@TableID"]).toBe("FMTID:1000001");
    expect(customers?.["@FMComment"]).toBe("Customer records");
    expect(customers?.$Key).toEqual(["customer_id"]);

    // Check field count
    expect(customers?.Properties.size).toBe(13);

    // Check various field types
    const customerId = customers?.Properties.get("customer_id");
    expect(customerId?.$Type).toBe("Edm.String");
    expect(customerId?.$Nullable).toBe(false);
    expect(customerId?.["@FieldID"]).toBe("FMFID:100001");

    const age = customers?.Properties.get("age");
    expect(age?.$Type).toBe("Edm.Decimal");

    const birthDate = customers?.Properties.get("birth_date");
    expect(birthDate?.$Type).toBe("Edm.Date");

    const createdAt = customers?.Properties.get("created_at");
    expect(createdAt?.$Type).toBe("Edm.DateTimeOffset");
    expect(createdAt?.$Nullable).toBe(false);

    const fullName = customers?.Properties.get("full_name");
    // The key thing is it should be marked as read-only based on permissions
    expect(fullName?.["@Org.OData.Core.V1.Permissions"]).toContain("Read");

    const notes = customers?.Properties.get("notes");
    // @Global should be set and permissions should include Read (which makes it read-only)
    expect(notes?.["@Org.OData.Core.V1.Permissions"]).toContain("Read");

    const photo = customers?.Properties.get("photo");
    expect(photo?.$Type).toBe("Edm.Binary");
  });

  it("parses navigation properties correctly", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const customers = metadata.entityTypes.get("Customers_");
    expect(customers?.NavigationProperties).toHaveLength(1);
    expect(customers?.NavigationProperties[0]?.Name).toBe("Orders");
    expect(customers?.NavigationProperties[0]?.Type).toContain("Orders_");

    const orders = metadata.entityTypes.get("Orders_");
    expect(orders?.NavigationProperties).toHaveLength(2);
    expect(orders?.NavigationProperties.map((n) => n.Name)).toContain("Customer");
    expect(orders?.NavigationProperties.map((n) => n.Name)).toContain("LineItems");
  });
});

describe("fmodata typegen - generateODataTypes", () => {
  beforeEach(async () => {
    await cleanupOutput();
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    await cleanupOutput();
  });

  it("generates types for a single table", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    // Check that the file was created
    const customersPath = path.join(outputDir, "Customers.ts");
    const exists = await fs
      .access(customersPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    // Check file content
    const content = await fs.readFile(customersPath, "utf-8");
    expect(content).toContain("fmTableOccurrence");
    expect(content).toContain("Customers");
    expect(content).toContain("customer_id");
    expect(content).toContain("textField");
    expect(content).toContain("numberField");
    expect(content).toContain("dateField");
    expect(content).toContain("timestampField");
    expect(content).toContain("containerField");
  });

  it("generates types for multiple tables", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }, { tableName: "Orders" }, { tableName: "LineItems" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    // Check that all files were created
    for (const table of ["Customers", "Orders", "LineItems"]) {
      const filePath = path.join(outputDir, `${table}.ts`);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    }

    // Check that index.ts was created with all exports
    const indexPath = path.join(outputDir, "index.ts");
    const indexContent = await fs.readFile(indexPath, "utf-8");
    expect(indexContent).toContain('export { Customers } from "./Customers"');
    expect(indexContent).toContain('export { Orders } from "./Orders"');
    expect(indexContent).toContain('export { LineItems } from "./LineItems"');
  });

  it("generates correct field builders for different types", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "Customers.ts"), "utf-8");
    const normalized = normalizeContent(content);

    // String fields -> textField()
    expect(normalized).toContain("first_name: textField()");
    expect(normalized).toContain("last_name: textField()");

    // Number fields -> numberField()
    expect(normalized).toContain("age: numberField()");
    expect(normalized).toContain("balance: numberField()");

    // Boolean fields -> numberField() with read/write validators
    expect(normalized).toContain("is_active: numberField() .readValidator(z.coerce.boolean())");
    expect(normalized).toContain(".writeValidator(z.boolean().transform((v) => (v ? 1 : 0)))");

    // Date fields -> dateField()
    expect(normalized).toContain("birth_date: dateField()");

    // DateTimeOffset fields -> timestampField()
    expect(normalized).toContain("created_at: timestampField()");

    // Binary fields -> containerField()
    expect(normalized).toContain("photo: containerField()");
  });

  it("generates correct modifiers for field properties", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "Customers.ts"), "utf-8");
    const normalized = normalizeContent(content);

    // Primary key field
    expect(normalized).toContain("customer_id: textField().primaryKey()");

    // Not null fields
    expect(normalized).toContain("created_at: timestampField().notNull()");

    // Read-only fields (calculated or global)
    expect(normalized).toContain("full_name: textField().readOnly()");
    expect(normalized).toContain("notes: textField().readOnly()");

    // Entity IDs
    expect(content).toContain('entityId("FMFID:100001")');

    // Comments
    expect(content).toContain('comment("Customer first name")');
  });

  it("generates navigation paths correctly", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }, { tableName: "Orders" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const customersContent = await fs.readFile(path.join(outputDir, "Customers.ts"), "utf-8");
    expect(customersContent).toContain('navigationPaths: ["Orders"]');

    const ordersContent = await fs.readFile(path.join(outputDir, "Orders.ts"), "utf-8");
    expect(ordersContent).toContain("navigationPaths:");
    // Check that both navigation targets are present
    expect(ordersContent).toContain('"Customers"');
    expect(ordersContent).toContain('"LineItems"');
  });

  it("respects variableName override", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers", variableName: "CustomerTable" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    // File should be named after variableName
    const filePath = path.join(outputDir, "CustomerTable.ts");
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toContain("export const CustomerTable = fmTableOccurrence");
    // But the entity set name should still be "Customers"
    // Note: formatted across multiple lines so check separately
    expect(content).toContain('"Customers"');
  });

  it("respects field exclusions", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [
        {
          tableName: "Customers",
          fields: [
            { fieldName: "notes", exclude: true },
            { fieldName: "photo", exclude: true },
          ],
        },
      ],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "Customers.ts"), "utf-8");
    // Excluded fields should not appear as field definitions
    expect(content).not.toContain("notes:");
    expect(content).not.toContain("photo:");
    // Other fields should still be present
    expect(content).toContain("customer_id:");
    expect(content).toContain("first_name:");
  });

  it("respects typeOverride in field configuration", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [
        {
          tableName: "Customers",
          fields: [
            { fieldName: "age", typeOverride: "text" }, // Override number to text
          ],
        },
      ],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "Customers.ts"), "utf-8");
    const normalized = normalizeContent(content);
    // age should now be textField instead of numberField
    expect(normalized).toContain("age: textField()");
  });

  it("respects includeAllFieldsByDefault = false", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [
        {
          tableName: "Customers",
          includeAllFieldsByDefault: false,
          fields: [{ fieldName: "customer_id" }, { fieldName: "first_name" }, { fieldName: "last_name" }],
        },
      ],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "Customers.ts"), "utf-8");
    // Only specified fields should be present
    expect(content).toContain("customer_id:");
    expect(content).toContain("first_name:");
    expect(content).toContain("last_name:");
    // Other fields should NOT be present
    expect(content).not.toContain("email:");
    expect(content).not.toContain("age:");
    expect(content).not.toContain("photo:");
  });

  it("generates valid TypeScript that passes type checking", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }, { tableName: "Orders" }, { tableName: "LineItems" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    // Run tsc to verify generated code compiles
    expect(() => runTypeCheck()).not.toThrow();
  }, 30_000);
});

describe("fmodata typegen - snapshot tests", () => {
  beforeEach(async () => {
    await cleanupOutput();
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    await cleanupOutput();
  });

  it("generates expected Customers table output", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "Customers.ts"), "utf-8");
    await expect(content).toMatchFileSnapshot(path.join(__dirname, "../__snapshots__", "fmodata-customers.snap.ts"));
  });

  it("generates expected Orders table output", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }, { tableName: "Orders" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "Orders.ts"), "utf-8");
    await expect(content).toMatchFileSnapshot(path.join(__dirname, "../__snapshots__", "fmodata-orders.snap.ts"));
  });

  it("generates expected index file output", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [{ tableName: "Customers" }, { tableName: "Orders" }, { tableName: "LineItems" }],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "index.ts"), "utf-8");
    await expect(content).toMatchFileSnapshot(path.join(__dirname, "../__snapshots__", "fmodata-index.snap.ts"));
  });

  it("generates expected output with all typeOverride transformations", async () => {
    const xmlPath = path.join(fixturesDir, "sample-odata-metadata.xml");
    const metadata = await parseMetadataFromFile(xmlPath);

    const config: FmodataConfig = {
      type: "fmodata",
      path: outputDir,
      tables: [
        {
          tableName: "Customers",
          fields: [
            { fieldName: "first_name", typeOverride: "number" },
            { fieldName: "last_name", typeOverride: "date" },
            { fieldName: "email", typeOverride: "timestamp" },
            { fieldName: "age", typeOverride: "boolean" },
            { fieldName: "balance", typeOverride: "boolean" },
            { fieldName: "birth_date", typeOverride: "text" },
            { fieldName: "notes", typeOverride: "container" },
          ],
        },
      ],
      clearOldFiles: true,
    };

    await generateODataTypes(metadata, config);

    const content = await fs.readFile(path.join(outputDir, "Customers.ts"), "utf-8");
    await expect(content).toMatchFileSnapshot(
      path.join(__dirname, "../__snapshots__", "fmodata-type-overrides.snap.ts"),
    );
  });
});
