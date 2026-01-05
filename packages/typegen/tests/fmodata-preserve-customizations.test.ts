import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { generateODataTypes } from "../src/fmodata/generateODataTypes";
import type { ParsedMetadata } from "../src/fmodata/parseMetadata";

function makeMetadata({
  entitySetName,
  entityTypeName,
  fields,
}: {
  entitySetName: string;
  entityTypeName: string;
  fields: Array<{ name: string; type: string; fieldId: string }>;
}): ParsedMetadata {
  const entityTypes = new Map();
  const entitySets = new Map();

  const properties = new Map();
  for (const f of fields) {
    properties.set(f.name, {
      $Type: f.type,
      $Nullable: true,
      "@FieldID": f.fieldId,
    });
  }

  entityTypes.set(entityTypeName, {
    Name: entityTypeName.split(".").at(-1) ?? entityTypeName,
    "@TableID": "T1",
    Properties: properties,
    NavigationProperties: [],
  });

  entitySets.set(entitySetName, {
    Name: entitySetName,
    EntityType: entityTypeName,
  });

  return {
    entityTypes,
    entitySets,
    namespace: "NS",
  };
}

describe("fmodata generateODataTypes preserves user customizations", () => {
  it("preserves custom chained calls even when placed before standard methods", async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "proofkit-fmodata-preserve-"),
    );

    try {
      const entitySetName = "MyTable";
      const entityTypeName = "NS.MyTable";
      const metadata = makeMetadata({
        entitySetName,
        entityTypeName,
        fields: [{ name: "FieldA", type: "Edm.String", fieldId: "F1" }],
      });

      const existingFilePath = path.join(tmpDir, "MyTable.ts");
      await fs.writeFile(
        existingFilePath,
        [
          `import { fmTableOccurrence, textField } from "@proofkit/fmdapi";`,
          `import { z } from "zod/v4";`,
          ``,
          `export const MyTable = fmTableOccurrence("MyTable", {`,
          `  "FieldA": textField().inputValidator(z.string()).entityId("F1"),`,
          `});`,
          ``,
        ].join("\n"),
        "utf8",
      );

      await generateODataTypes(metadata, {
        type: "fmodata",
        path: tmpDir,
        clearOldFiles: false,
        tables: [{ tableName: "MyTable" }],
      });

      const regenerated = await fs.readFile(existingFilePath, "utf8");
      expect(regenerated).toContain(
        `FieldA: textField().entityId("F1").inputValidator(z.string())`,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("preserves custom chained calls when no standard methods exist", async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "proofkit-fmodata-preserve-"),
    );

    try {
      const entitySetName = "MyTable";
      const entityTypeName = "NS.MyTable";
      const metadata = makeMetadata({
        entitySetName,
        entityTypeName,
        // Simulate reduceMetadata: no FieldID => generator won't emit .entityId()
        fields: [{ name: "FieldB", type: "Edm.String", fieldId: "" }],
      });

      const existingFilePath = path.join(tmpDir, "MyTable.ts");
      await fs.writeFile(
        existingFilePath,
        [
          `import { fmTableOccurrence, textField } from "@proofkit/fmdapi";`,
          `import { z } from "zod/v4";`,
          ``,
          `export const MyTable = fmTableOccurrence("MyTable", {`,
          `  "FieldB": textField().inputValidator(z.string()),`,
          `});`,
          ``,
        ].join("\n"),
        "utf8",
      );

      await generateODataTypes(metadata, {
        type: "fmodata",
        path: tmpDir,
        clearOldFiles: false,
        tables: [{ tableName: "MyTable" }],
      });

      const regenerated = await fs.readFile(existingFilePath, "utf8");
      expect(regenerated).toContain(
        `FieldB: textField().inputValidator(z.string())`,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("preserves aliased imports when regenerating files", async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "proofkit-fmodata-preserve-"),
    );

    try {
      const entitySetName = "MyTable";
      const entityTypeName = "NS.MyTable";
      const metadata = makeMetadata({
        entitySetName,
        entityTypeName,
        fields: [{ name: "FieldA", type: "Edm.String", fieldId: "F1" }],
      });

      const existingFilePath = path.join(tmpDir, "MyTable.ts");
      await fs.writeFile(
        existingFilePath,
        [
          `import { fmTableOccurrence, textField as tf } from "@proofkit/fmdapi";`,
          `import { z as zod } from "zod/v4";`,
          ``,
          `export const MyTable = fmTableOccurrence("MyTable", {`,
          `  "FieldA": tf().entityId("F1").inputValidator(zod.string()),`,
          `});`,
          ``,
        ].join("\n"),
        "utf8",
      );

      await generateODataTypes(metadata, {
        type: "fmodata",
        path: tmpDir,
        clearOldFiles: false,
        tables: [{ tableName: "MyTable" }],
      });

      const regenerated = await fs.readFile(existingFilePath, "utf8");
      // Verify aliased imports are preserved
      expect(regenerated).toContain(`textField as tf`);
      expect(regenerated).toContain(`z as zod`);
      // Verify the code still uses the aliases
      expect(regenerated).toContain(`tf().entityId("F1")`);
      expect(regenerated).toContain(`zod.string()`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
