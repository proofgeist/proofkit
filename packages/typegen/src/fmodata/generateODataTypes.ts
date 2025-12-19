import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import fs from "fs-extra";
import {
  Project,
  SourceFile,
  CallExpression,
  ObjectLiteralExpression,
  PropertyAssignment,
} from "ts-morph";
import type { ParsedMetadata, EntityType } from "./parseMetadata";
import { FmodataConfig } from "../types";
import { formatAndSaveSourceFiles } from "../formatting";

interface GeneratedTO {
  varName: string;
  code: string;
  navigation: string[];
  usedFieldBuilders: Set<string>;
  needsZod: boolean;
  entitySetName: string;
  entityType: EntityType;
  tableOverride?: NonNullable<FmodataConfig["tables"]>[number];
}

/**
 * Maps type override enum values to field builder functions from @proofkit/fmodata
 */
function mapTypeOverrideToFieldBuilder(
  typeOverride:
    | "text"
    | "number"
    | "boolean"
    | "fmBooleanNumber"
    | "date"
    | "timestamp"
    | "container",
): string {
  switch (typeOverride) {
    case "text":
      return "textField()";
    case "number":
      return "numberField()";
    case "boolean":
    case "fmBooleanNumber":
      return "numberField().outputValidator(z.coerce.boolean())";
    case "date":
      return "dateField()";
    case "timestamp":
      return "timestampField()";
    case "container":
      return "containerField()";
  }
}

/**
 * Maps OData types to field builder functions from @proofkit/fmodata
 */
function mapODataTypeToFieldBuilder(
  edmType: string,
  typeOverride?:
    | "text"
    | "number"
    | "boolean"
    | "fmBooleanNumber"
    | "date"
    | "timestamp"
    | "container",
): string {
  // If typeOverride is provided, use it instead of the inferred type
  if (typeOverride) {
    return mapTypeOverrideToFieldBuilder(typeOverride);
  }

  switch (edmType) {
    case "Edm.String":
      return "textField()";
    case "Edm.Decimal":
    case "Edm.Int32":
    case "Edm.Int64":
    case "Edm.Double":
      return "numberField()";
    case "Edm.Boolean":
      return "numberField().outputValidator(z.coerce.boolean())";
    case "Edm.Date":
      return "dateField()"; // ISO date string
    case "Edm.DateTimeOffset":
      return "timestampField()"; // ISO datetime string
    case "Edm.Binary":
      return "containerField()"; // base64 encoded
    default:
      return "textField()"; // Default to textField for unknown types
  }
}

/**
 * Extracts entity type name from Type string like "Collection(com.filemaker.odata.WebData.fmp12.Work_Orders_)"
 * Returns "Work_Orders_"
 */
function extractEntityTypeNameFromType(typeString: string): string | null {
  // Pattern: Collection(namespace.EntityTypeName) -> extract EntityTypeName
  const collectionMatch = typeString.match(/Collection\(([^)]+)\)/);
  if (collectionMatch && collectionMatch[1]) {
    const fullType = collectionMatch[1];
    // Extract the last part after the last dot
    const parts = fullType.split(".");
    return parts[parts.length - 1] ?? null;
  }
  // Try without Collection wrapper - extract last part after last dot
  const parts = typeString.split(".");
  return parts.length > 0 ? (parts[parts.length - 1] ?? null) : null;
}

/**
 * Generates a table occurrence definition for a single entity set
 */
function generateTableOccurrence(
  entitySetName: string,
  entityType: EntityType,
  entityTypeToSetMap: Map<string, string>,
  tableOverride?: NonNullable<FmodataConfig["tables"]>[number],
  existingFields?: ParsedTableOccurrence,
  alwaysOverrideFieldNames?: boolean,
): GeneratedTO {
  const fmtId = entityType["@TableID"];
  const keyFields = entityType.$Key || [];
  const fields = entityType.Properties;
  const readOnlyFields: string[] = [];
  const navigationTargets: string[] = [];
  const usedFieldBuilders = new Set<string>();
  let needsZod = false;

  // Process navigation properties
  for (const navProp of entityType.NavigationProperties) {
    const targetEntityTypeName = extractEntityTypeNameFromType(navProp.Type);
    if (targetEntityTypeName) {
      const targetEntitySet = entityTypeToSetMap.get(targetEntityTypeName);
      if (targetEntitySet) {
        navigationTargets.push(targetEntitySet);
      }
    }
  }

  // Determine read-only fields
  for (const [fieldName, metadata] of fields.entries()) {
    if (
      metadata["@Calculation"] ||
      metadata["@Global"] ||
      metadata["@Org.OData.Core.V1.Permissions"]?.includes("Read")
    ) {
      readOnlyFields.push(fieldName);
    }
  }

  // Determine the id field (for reference, not used in generation)
  let idField: string;
  if (keyFields.length > 0) {
    // Use the first key field
    const firstKey = keyFields[0];
    if (!firstKey) {
      throw new Error("Key fields array is empty but length check passed");
    }
    idField = firstKey;
  } else {
    // Find a suitable ID field: look for auto-generated fields or fields with "id" in the name
    const fieldNames = Array.from(fields.keys());
    const autoGenField = fieldNames.find(
      (name) => fields.get(name)?.["@AutoGenerated"],
    );
    const idFieldName = fieldNames.find(
      (name) =>
        name.toLowerCase().includes("_id") ||
        name.toLowerCase().endsWith("id") ||
        name.toLowerCase() === "id",
    );
    const firstFieldName = fieldNames[0];
    if (!firstFieldName) {
      throw new Error("No fields found in entity type");
    }
    idField = autoGenField ?? idFieldName ?? firstFieldName;
  }

  // Build a field overrides map from the array for easier lookup
  type FieldOverrideType = Exclude<
    NonNullable<NonNullable<FmodataConfig["tables"]>[number]>["fields"],
    undefined
  >[number];
  const fieldOverridesMap = new Map<string, FieldOverrideType>();
  if (tableOverride?.fields) {
    for (const fieldOverride of tableOverride.fields) {
      if (fieldOverride?.fieldName) {
        fieldOverridesMap.set(fieldOverride.fieldName, fieldOverride);
      }
    }
  }

  // Generate field builder definitions
  const fieldLines: string[] = [];
  const fieldEntries = Array.from(fields.entries());

  // Filter out excluded fields and collect valid entries
  const validFieldEntries: Array<
    [string, typeof fields extends Map<infer K, infer V> ? V : never]
  > = [];
  for (const entry of fieldEntries) {
    if (!entry) continue;
    const [fieldName] = entry;
    const fieldOverride = fieldOverridesMap.get(fieldName);

    // Skip excluded fields
    if (fieldOverride?.exclude === true) {
      continue;
    }

    validFieldEntries.push(entry);
  }

  for (let i = 0; i < validFieldEntries.length; i++) {
    const entry = validFieldEntries[i];
    if (!entry) continue;
    const [fieldName, metadata] = entry;
    const fieldOverride = fieldOverridesMap.get(fieldName);

    // Try to match existing field: first by entity ID, then by name
    let matchedExistingField: ParsedField | null = null;
    let finalFieldName = fieldName;

    if (existingFields) {
      // Try matching by entity ID first
      if (metadata["@FieldID"]) {
        matchedExistingField = matchFieldByEntityId(
          existingFields.fieldsByEntityId,
          metadata["@FieldID"],
        );
        if (matchedExistingField) {
          // Use existing field name unless alwaysOverrideFieldNames is true
          if (!alwaysOverrideFieldNames) {
            finalFieldName = matchedExistingField.fieldName;
          }
        }
      }

      // If no match by entity ID, try matching by name
      if (!matchedExistingField) {
        matchedExistingField = matchFieldByName(
          existingFields.fields,
          fieldName,
        );
      }
    }

    // Apply typeOverride if provided, otherwise use inferred type
    const fieldBuilder = mapODataTypeToFieldBuilder(
      metadata.$Type,
      fieldOverride?.typeOverride as
        | "text"
        | "number"
        | "boolean"
        | "fmBooleanNumber"
        | "date"
        | "timestamp"
        | "container"
        | undefined,
    );

    // Track which field builders are used
    if (fieldBuilder.includes("textField()")) {
      usedFieldBuilders.add("textField");
    } else if (fieldBuilder.includes("numberField()")) {
      usedFieldBuilders.add("numberField");
    } else if (fieldBuilder.includes("dateField()")) {
      usedFieldBuilders.add("dateField");
    } else if (fieldBuilder.includes("timestampField()")) {
      usedFieldBuilders.add("timestampField");
    } else if (fieldBuilder.includes("containerField()")) {
      usedFieldBuilders.add("containerField");
    }

    // Track if z.coerce.boolean() is used
    if (fieldBuilder.includes("z.coerce.boolean()")) {
      needsZod = true;
    }

    const isKeyField = keyFields.includes(fieldName);
    // Only add .notNull() if explicitly marked as Nullable="false" in XML
    // metadata.$Nullable is false only if Nullable="false" was in XML, otherwise it's true (nullable by default)
    const isExplicitlyNotNullable = metadata.$Nullable === false;
    const isReadOnly = readOnlyFields.includes(fieldName);
    const isLastField = i === validFieldEntries.length - 1;

    let line = `    ${JSON.stringify(finalFieldName)}: ${fieldBuilder}`;

    // Chain methods: primaryKey, readOnly, notNull, entityId, comment
    if (isKeyField) {
      line += ".primaryKey()";
    }
    if (isReadOnly) {
      line += ".readOnly()";
    }
    // Only add .notNull() if explicitly marked as Nullable="false" in XML
    // Key fields are handled by primaryKey() which already makes them not null
    if (isExplicitlyNotNullable && !isKeyField) {
      line += ".notNull()";
    }
    if (metadata["@FieldID"]) {
      line += `.entityId(${JSON.stringify(metadata["@FieldID"])})`;
    }
    if (metadata["@FMComment"]) {
      line += `.comment(${JSON.stringify(metadata["@FMComment"])})`;
    }

    // Preserve user customizations from existing field
    if (matchedExistingField) {
      line = preserveUserCustomizations(matchedExistingField, line);
    }

    // Add comma if not the last field
    if (!isLastField) {
      line += ",";
    }

    fieldLines.push(line);
  }

  // Apply variableName override if provided, otherwise generate from entitySetName
  let varName = tableOverride?.variableName
    ? tableOverride.variableName.replace(/[^a-zA-Z0-9_]/g, "_")
    : entitySetName.replace(/[^a-zA-Z0-9_]/g, "_");
  // Prefix with underscore if name starts with a digit (invalid JavaScript identifier)
  if (/^\d/.test(varName)) {
    varName = `_${varName}`;
  }

  // Build options object
  const optionsParts: string[] = [];
  if (fmtId) {
    optionsParts.push(`entityId: ${JSON.stringify(fmtId)}`);
  }
  if (entityType["@FMComment"]) {
    optionsParts.push(`comment: ${JSON.stringify(entityType["@FMComment"])}`);
  }
  // Always include navigationPaths, even if empty
  const navPaths = navigationTargets.map((n) => JSON.stringify(n)).join(", ");
  optionsParts.push(`navigationPaths: [${navPaths}]`);

  const optionsSection =
    optionsParts.length > 0
      ? `, {\n${optionsParts.map((p) => `  ${p}`).join(",\n")}\n}`
      : "";

  const code = `export const ${varName} = fmTableOccurrence(${JSON.stringify(entitySetName)}, {
${fieldLines.join("\n")}
}${optionsSection});`;

  return {
    varName,
    code,
    navigation: navigationTargets,
    usedFieldBuilders,
    needsZod,
    entitySetName,
    entityType,
    tableOverride,
  };
}

/**
 * Generates import statements based on which field builders are used
 */
function generateImports(
  usedFieldBuilders: Set<string>,
  needsZod: boolean,
): string {
  const fieldBuilderImports: string[] = [];

  // Always need fmTableOccurrence
  fieldBuilderImports.push("fmTableOccurrence");

  // Add only the field builders that are actually used
  if (usedFieldBuilders.has("textField")) {
    fieldBuilderImports.push("textField");
  }
  if (usedFieldBuilders.has("numberField")) {
    fieldBuilderImports.push("numberField");
  }
  if (usedFieldBuilders.has("dateField")) {
    fieldBuilderImports.push("dateField");
  }
  if (usedFieldBuilders.has("timestampField")) {
    fieldBuilderImports.push("timestampField");
  }
  if (usedFieldBuilders.has("containerField")) {
    fieldBuilderImports.push("containerField");
  }

  const imports = [
    `import { ${fieldBuilderImports.join(", ")} } from "@proofkit/fmodata"`,
  ];

  if (needsZod) {
    imports.push(`import { z } from "zod/v4"`);
  }

  return imports.join(";\n") + ";\n";
}

/**
 * Sanitizes a name to be a safe filename
 */
function sanitizeFileName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
  // Prefix with underscore if name starts with a digit (invalid JavaScript identifier)
  return /^\d/.test(sanitized) ? `_${sanitized}` : sanitized;
}

/**
 * Represents a parsed field from an existing file
 */
interface ParsedField {
  fieldName: string;
  entityId?: string;
  fullChainText: string;
  userCustomizations: string; // Everything after the base chain (e.g., .inputValidator(...).outputValidator(...))
}

/**
 * Represents a parsed table occurrence from an existing file
 */
interface ParsedTableOccurrence {
  varName: string;
  entitySetName: string;
  tableEntityId?: string;
  fields: Map<string, ParsedField>; // keyed by field name
  fieldsByEntityId: Map<string, ParsedField>; // keyed by entity ID
  existingImports: string[]; // All existing import statements as strings
}

/**
 * Extracts user customizations (like .inputValidator() and .outputValidator()) from a method chain
 */
function extractUserCustomizations(
  chainText: string,
  baseChainEnd: number,
): string {
  // Find where the base chain ends (after entityId, comment, etc.)
  // User customizations are everything after the standard methods
  // Standard methods: primaryKey(), readOnly(), notNull(), entityId(), comment()
  // User methods: inputValidator(), outputValidator(), and any other custom methods

  // For now, we'll extract everything after the last standard method
  // This is a simple approach - we could make it more sophisticated
  const standardMethods = [
    ".primaryKey()",
    ".readOnly()",
    ".notNull()",
    ".entityId(",
    ".comment(",
  ];

  let lastStandardMethodIndex = -1;
  for (const method of standardMethods) {
    const index = chainText.lastIndexOf(method);
    if (index > lastStandardMethodIndex) {
      lastStandardMethodIndex = index;
    }
  }

  if (lastStandardMethodIndex === -1) {
    return "";
  }

  // Find the end of the last standard method call
  let endIndex = lastStandardMethodIndex;
  let parenCount = 0;
  let inString = false;
  let stringChar = "";

  for (let i = lastStandardMethodIndex; i < chainText.length; i++) {
    const char = chainText[i];

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar) {
      inString = false;
    } else if (!inString) {
      if (char === "(") {
        parenCount++;
      } else if (char === ")") {
        parenCount--;
        if (parenCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }

  // Extract everything after the last standard method
  return chainText.substring(endIndex);
}

/**
 * Parses an existing table occurrence file and extracts field definitions
 */
function parseExistingTableFile(
  sourceFile: SourceFile,
): ParsedTableOccurrence | null {
  // Find the fmTableOccurrence call by searching all call expressions
  let callExpr: CallExpression | null = null;

  sourceFile.forEachDescendant((node) => {
    if (node.getKindName() === "CallExpression") {
      const expr = node as CallExpression;
      const expression = expr.getExpression();
      if (
        expression.getKindName() === "Identifier" &&
        expression.getText() === "fmTableOccurrence"
      ) {
        callExpr = expr;
      }
    }
  });

  if (!callExpr) {
    return null;
  }

  // TypeScript needs explicit type here
  const call: CallExpression = callExpr;

  // Extract variable name from the containing variable declaration
  let varName = "";
  let parent = call.getParent();
  while (parent) {
    if (parent.getKindName() === "VariableDeclaration") {
      // TypeScript needs explicit cast here
      const varDecl = parent as any;
      varName = varDecl.getName();
      break;
    }
    parent = parent.getParent() ?? undefined;
  }

  if (!varName) {
    // Try to find from export declaration
    const exportDecl = sourceFile.getExportDeclarations().find((decl) => {
      const namedExports = decl.getNamedExports();
      return namedExports.length > 0;
    });
    if (exportDecl) {
      const namedExports = exportDecl.getNamedExports();
      if (namedExports.length > 0) {
        const firstExport = namedExports[0];
        if (firstExport) {
          varName = firstExport.getName();
        }
      }
    }
  }

  // Get arguments to fmTableOccurrence
  const args = call.getArguments();
  if (args.length < 2) {
    return null;
  }

  const entitySetNameArg = args[0];
  if (!entitySetNameArg) {
    return null;
  }
  const entitySetName = entitySetNameArg.getText().replace(/['"]/g, "");

  // Get the fields object (second argument)
  const fieldsArg = args[1];
  if (!fieldsArg || fieldsArg.getKindName() !== "ObjectLiteralExpression") {
    return null;
  }
  const fieldsObject = fieldsArg as ObjectLiteralExpression;

  // Get options object (third argument, if present)
  let tableEntityId: string | undefined;
  if (args.length >= 3) {
    const optionsArg = args[2];
    if (optionsArg && optionsArg.getKindName() === "ObjectLiteralExpression") {
      const optionsObject = optionsArg as ObjectLiteralExpression;
      const entityIdProp = optionsObject.getProperty("entityId");
      if (entityIdProp && entityIdProp.getKindName() === "PropertyAssignment") {
        const value = (entityIdProp as PropertyAssignment)
          .getInitializer()
          ?.getText();
        if (value) {
          tableEntityId = value.replace(/['"]/g, "");
        }
      }
    }
  }

  // Extract existing imports
  const existingImports: string[] = [];
  const importDeclarations = sourceFile.getImportDeclarations();
  for (const importDecl of importDeclarations) {
    const importText = importDecl.getFullText();
    if (importText.trim()) {
      existingImports.push(importText.trim());
    }
  }

  // Parse each field
  const fields = new Map<string, ParsedField>();
  const fieldsByEntityId = new Map<string, ParsedField>();

  const properties = fieldsObject.getProperties();
  for (const prop of properties) {
    if (prop.getKindName() !== "PropertyAssignment") {
      continue;
    }
    const fieldProp = prop as PropertyAssignment;
    const fieldNameNode = fieldProp.getNameNode();
    const fieldName = fieldNameNode.getText().replace(/['"]/g, "");

    const initializer = fieldProp.getInitializer();
    if (!initializer) {
      continue;
    }

    const chainText = initializer.getText();

    // Extract entity ID from .entityId() call
    let entityId: string | undefined;
    const entityIdMatch = chainText.match(/\.entityId\(['"]([^'"]+)['"]\)/);
    if (entityIdMatch) {
      entityId = entityIdMatch[1];
    }

    // Extract user customizations (everything after standard methods)
    const userCustomizations = extractUserCustomizations(chainText, 0);

    const parsedField: ParsedField = {
      fieldName,
      entityId,
      fullChainText: chainText,
      userCustomizations,
    };

    fields.set(fieldName, parsedField);
    if (entityId) {
      fieldsByEntityId.set(entityId, parsedField);
    }
  }

  return {
    varName,
    entitySetName,
    tableEntityId,
    fields,
    fieldsByEntityId,
    existingImports,
  };
}

/**
 * Matches a field from metadata to an existing field by entity ID
 */
function matchFieldByEntityId(
  existingFields: Map<string, ParsedField>,
  metadataEntityId: string | undefined,
): ParsedField | null {
  if (!metadataEntityId) {
    return null;
  }
  return existingFields.get(metadataEntityId) || null;
}

/**
 * Matches a field from metadata to an existing field by name
 */
function matchFieldByName(
  existingFields: Map<string, ParsedField>,
  fieldName: string,
): ParsedField | null {
  return existingFields.get(fieldName) || null;
}

/**
 * Preserves user customizations from an existing field chain
 */
function preserveUserCustomizations(
  existingField: ParsedField | undefined,
  newChain: string,
): string {
  if (!existingField || !existingField.userCustomizations) {
    return newChain;
  }

  // Append user customizations to the new chain
  return newChain + existingField.userCustomizations;
}

/**
 * Generates TypeScript table occurrence files from parsed OData metadata.
 *
 * @param metadata - The parsed OData metadata
 * @param options - Generation options including output path
 * @returns Promise that resolves when all files have been generated
 */
export async function generateODataTypes(
  metadata: ParsedMetadata,
  config: FmodataConfig & {
    alwaysOverrideFieldNames?: boolean;
  },
): Promise<void> {
  const { entityTypes, entitySets } = metadata;
  const {
    path,
    clearOldFiles = true,
    tables,
    alwaysOverrideFieldNames = true,
  } = config;
  const outputPath = path ?? "schema";

  // Build a map from entity type name to entity set name
  const entityTypeToSetMap = new Map<string, string>();
  for (const [entitySetName, entitySet] of entitySets.entries()) {
    entityTypeToSetMap.set(entitySet.EntityType, entitySetName);
  }

  // Build a set of allowed table names from config
  const allowedTableNames = new Set<string>();
  if (tables) {
    for (const tableOverride of tables) {
      if (tableOverride?.tableName) {
        allowedTableNames.add(tableOverride.tableName);
      }
    }
  }

  // Build a table overrides map from the array for easier lookup
  const tableOverridesMap = new Map<
    string,
    NonNullable<FmodataConfig["tables"]>[number]
  >();
  if (tables) {
    for (const tableOverride of tables) {
      if (tableOverride?.tableName) {
        tableOverridesMap.set(tableOverride.tableName, tableOverride);
      }
    }
  }

  // Generate table occurrences for entity sets
  const generatedTOs: GeneratedTO[] = [];

  for (const [entitySetName, entitySet] of entitySets.entries()) {
    // Only generate types for tables specified in config
    if (allowedTableNames.size > 0 && !allowedTableNames.has(entitySetName)) {
      continue;
    }

    // Get table override config if it exists
    const tableOverride = tableOverridesMap.get(entitySetName);

    const entityType = entityTypes.get(entitySet.EntityType);
    if (entityType) {
      // Determine alwaysOverrideFieldNames: table-level override takes precedence
      const tableAlwaysOverrideFieldNames =
        tableOverride?.alwaysOverrideFieldNames ?? alwaysOverrideFieldNames;

      // First generate without existing fields to get the structure
      // We'll regenerate with existing fields later if the file exists
      const generated = generateTableOccurrence(
        entitySetName,
        entityType,
        entityTypeToSetMap,
        tableOverride,
        undefined,
        tableAlwaysOverrideFieldNames,
      );
      generatedTOs.push({
        ...generated,
        entitySetName,
        entityType,
        tableOverride,
      });
    }
  }

  // Resolve and create output directory
  const resolvedOutputPath = resolve(outputPath);
  await mkdir(resolvedOutputPath, { recursive: true });

  if (clearOldFiles) {
    // Clear the directory if requested (but keep the directory itself)
    fs.emptyDirSync(resolvedOutputPath);
  }

  // Create ts-morph project for file manipulation
  const project = new Project({});

  // Generate one file per table occurrence
  const exportStatements: string[] = [];

  for (const generated of generatedTOs) {
    const fileName = `${sanitizeFileName(generated.varName)}.ts`;
    const filePath = join(resolvedOutputPath, fileName);

    // Check if file exists and parse it
    let existingFields: ParsedTableOccurrence | undefined;
    if (fs.existsSync(filePath) && !clearOldFiles) {
      try {
        const existingSourceFile = project.addSourceFileAtPath(filePath);
        const parsed = parseExistingTableFile(existingSourceFile);
        if (parsed) {
          existingFields = parsed;
        }
      } catch (error) {
        // If parsing fails, continue without existing fields
        console.warn(`Failed to parse existing file ${filePath}:`, error);
      }
    }

    // Determine alwaysOverrideFieldNames: table-level override takes precedence
    const tableAlwaysOverrideFieldNames =
      generated.tableOverride?.alwaysOverrideFieldNames ??
      alwaysOverrideFieldNames;

    // Regenerate with existing fields merged in if file exists
    const regenerated = existingFields
      ? generateTableOccurrence(
          generated.entitySetName,
          generated.entityType,
          entityTypeToSetMap,
          generated.tableOverride,
          existingFields,
          tableAlwaysOverrideFieldNames,
        )
      : generated;

    // Track removed fields (fields in existing but not in metadata)
    const removedFields: ParsedField[] = [];
    if (existingFields) {
      for (const existingField of existingFields.fields.values()) {
        // Check if this field is still in metadata
        const stillExists = Array.from(
          generated.entityType.Properties.keys(),
        ).some((metaFieldName) => {
          const metaField = generated.entityType.Properties.get(metaFieldName);
          if (!metaField) return false;

          // Match by entity ID or name
          if (
            existingField.entityId &&
            metaField["@FieldID"] === existingField.entityId
          ) {
            return true;
          }
          if (metaFieldName === existingField.fieldName) {
            return true;
          }
          return false;
        });

        if (!stillExists) {
          removedFields.push(existingField);
        }
      }
    }

    // Generate required imports based on what's actually used in this file
    const requiredImports = generateImports(
      regenerated.usedFieldBuilders,
      regenerated.needsZod,
    );

    // Parse import statements to extract module and named imports
    function parseImport(importText: string): {
      module: string;
      namedImports: string[];
      fullText: string;
    } | null {
      const trimmed = importText.trim();
      if (!trimmed.startsWith("import")) {
        return null;
      }

      // Extract module specifier using regex
      const moduleMatch = trimmed.match(/from\s+['"]([^'"]+)['"]/);
      if (!moduleMatch || !moduleMatch[1]) {
        return null;
      }
      const module = moduleMatch[1];

      // Extract named imports
      const namedImports: string[] = [];
      const namedMatch = trimmed.match(/\{([^}]+)\}/);
      if (namedMatch && namedMatch[1]) {
        const importsList = namedMatch[1];
        // Split by comma and clean up
        importsList.split(",").forEach((imp) => {
          const cleaned = imp.trim();
          if (cleaned) {
            // Handle aliased imports (e.g., "x as y")
            const aliasMatch = cleaned.match(/^(\w+)(?:\s+as\s+\w+)?$/);
            if (aliasMatch && aliasMatch[1]) {
              namedImports.push(aliasMatch[1]);
            } else {
              namedImports.push(cleaned);
            }
          }
        });
      }

      return { module, namedImports, fullText: trimmed };
    }

    // If file exists, preserve existing imports and merge with required ones
    let finalImports = requiredImports;
    if (existingFields && existingFields.existingImports.length > 0) {
      // Parse all existing imports by module
      const existingImportsByModule = new Map<
        string,
        {
          namedImports: Set<string>;
          fullText: string;
        }
      >();

      for (const existingImport of existingFields.existingImports) {
        const parsed = parseImport(existingImport);
        if (parsed) {
          const existing = existingImportsByModule.get(parsed.module);
          if (existing) {
            // Merge named imports from duplicate imports
            parsed.namedImports.forEach((imp) =>
              existing.namedImports.add(imp),
            );
          } else {
            existingImportsByModule.set(parsed.module, {
              namedImports: new Set(parsed.namedImports),
              fullText: parsed.fullText,
            });
          }
        }
      }

      // Parse required imports
      const requiredImportLines = requiredImports
        .split("\n")
        .filter((line) => line.trim());
      const requiredImportsByModule = new Map<string, Set<string>>();

      for (const requiredLine of requiredImportLines) {
        const parsed = parseImport(requiredLine);
        if (parsed) {
          const existing = requiredImportsByModule.get(parsed.module);
          if (existing) {
            parsed.namedImports.forEach((imp) => existing.add(imp));
          } else {
            requiredImportsByModule.set(
              parsed.module,
              new Set(parsed.namedImports),
            );
          }
        }
      }

      // Build final imports: preserve existing, update if needed, add missing
      const finalImportLines: string[] = [];
      const handledModules = new Set<string>();
      const processedModules = new Set<string>();

      // Process existing imports - deduplicate by module
      for (const existingImport of existingFields.existingImports) {
        const parsed = parseImport(existingImport);
        if (parsed && parsed.module) {
          // Skip if we've already processed this module (deduplicate)
          if (processedModules.has(parsed.module)) {
            continue;
          }
          processedModules.add(parsed.module);

          // Use the merged named imports from existingImportsByModule
          const existing = existingImportsByModule.get(parsed.module);
          const allExistingImports = existing
            ? Array.from(existing.namedImports)
            : parsed.namedImports;

          const required = requiredImportsByModule.get(parsed.module);
          if (required) {
            // Check if we need to add any missing named imports
            const missingImports = Array.from(required).filter(
              (imp) => !allExistingImports.includes(imp),
            );
            if (missingImports.length > 0) {
              // Update the existing import to include missing named imports
              const allImports = [
                ...allExistingImports,
                ...missingImports,
              ].sort();
              finalImportLines.push(
                `import { ${allImports.join(", ")} } from "${parsed.module}";`,
              );
            } else {
              // Keep existing import format but use merged imports
              const importsList = allExistingImports.sort().join(", ");
              finalImportLines.push(
                `import { ${importsList} } from "${parsed.module}";`,
              );
            }
            handledModules.add(parsed.module);
            requiredImportsByModule.delete(parsed.module);
          } else {
            // Keep existing import (not in required imports - user added it)
            // Use merged imports to avoid duplicates
            const importsList = allExistingImports.sort().join(", ");
            finalImportLines.push(
              `import { ${importsList} } from "${parsed.module}";`,
            );
          }
        } else {
          // Keep non-import lines as-is (comments, etc.)
          finalImportLines.push(existingImport);
        }
      }

      // Add any required imports that don't exist yet
      for (const [module, namedImports] of requiredImportsByModule.entries()) {
        if (module && !handledModules.has(module)) {
          const importsList = Array.from(namedImports).sort().join(", ");
          if (importsList) {
            finalImportLines.push(
              `import { ${importsList} } from "${module}";`,
            );
          }
        }
      }

      finalImports = finalImportLines.join("\n") + "\n";
    }

    // Build file content with removed fields commented out
    let fileContent = finalImports + "\n";

    if (removedFields.length > 0) {
      fileContent +=
        "// ============================================================================\n";
      fileContent += "// Removed fields (not found in metadata)\n";
      fileContent +=
        "// ============================================================================\n";
      for (const removedField of removedFields) {
        const matchInfo = removedField.entityId
          ? ` (was matched by entityId ${removedField.entityId})`
          : "";
        fileContent += `// @removed: Field not found in metadata${matchInfo}\n`;
        fileContent += `// ${JSON.stringify(removedField.fieldName)}: ${removedField.fullChainText},\n\n`;
      }
    }

    fileContent += regenerated.code;

    // Create or update source file
    project.createSourceFile(filePath, fileContent, {
      overwrite: true,
    });

    // Collect export statement for index file
    exportStatements.push(
      `export { ${regenerated.varName} } from "./${sanitizeFileName(regenerated.varName)}";`,
    );
  }

  // Format and save all files
  await formatAndSaveSourceFiles(project);

  // Generate index.ts file that exports all table occurrences
  const indexContent = `// ============================================================================
// Auto-generated index file - exports all table occurrences
// ============================================================================

${exportStatements.join("\n")}
`;

  const indexPath = join(resolvedOutputPath, "index.ts");
  await writeFile(indexPath, indexContent, "utf-8");
}
