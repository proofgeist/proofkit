import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import fs from "fs-extra";
import {
  type CallExpression,
  type ObjectLiteralExpression,
  Project,
  type PropertyAssignment,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import { formatAndSaveSourceFiles } from "../formatting";
import type { FmodataConfig } from "../types";
import type { EntityType, ParsedMetadata } from "./parseMetadata";

// Regex patterns defined at top level for performance
const REGEX_COLLECTION = /Collection\(([^)]+)\)/;
const REGEX_STARTS_WITH_DIGIT = /^\d/;
const REGEX_IDENT_CHAR = /[A-Za-z0-9_$]/;
const REGEX_WHITESPACE = /\s/;
const REGEX_ENTITY_ID = /\.entityId\(['"]([^'"]+)['"]\)/;
const REGEX_FROM_MODULE = /from\s+['"]([^'"]+)['"]/;
const REGEX_NAMED_IMPORTS = /\{([^}]+)\}/;
const REGEX_IMPORT_ALIAS = /^(\w+)(?:\s+as\s+\w+)?$/;

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
  typeOverride: "text" | "number" | "boolean" | "fmBooleanNumber" | "date" | "timestamp" | "container",
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
    default:
      return "textField()";
  }
}

/**
 * Applies import aliases to a field builder expression
 * e.g., "textField()" with alias "textField" -> "tf" becomes "tf()"
 */
function applyAliasToFieldBuilder(fieldBuilder: string, importAliases: Map<string, string> | undefined): string {
  if (!importAliases || importAliases.size === 0) {
    return fieldBuilder;
  }

  // Map of field builder function names to their import names
  const fieldBuilderMap = new Map([
    ["textField", "textField"],
    ["numberField", "numberField"],
    ["dateField", "dateField"],
    ["timestampField", "timestampField"],
    ["containerField", "containerField"],
  ]);

  // Try to find and replace each field builder with its alias
  let result = fieldBuilder;
  for (const [baseName, _importName] of fieldBuilderMap) {
    const alias = importAliases.get(baseName);
    if (alias) {
      // Replace "baseName(" with "alias("
      result = result.replace(new RegExp(`\\b${baseName}\\(`, "g"), `${alias}(`);
    }
  }

  return result;
}

/**
 * Maps OData types to field builder functions from @proofkit/fmodata
 */
function mapODataTypeToFieldBuilder(
  edmType: string,
  typeOverride?: "text" | "number" | "boolean" | "fmBooleanNumber" | "date" | "timestamp" | "container",
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
  const collectionMatch = typeString.match(REGEX_COLLECTION);
  if (collectionMatch?.[1]) {
    const fullType = collectionMatch[1];
    // Extract the last part after the last dot
    const parts = fullType.split(".");
    return parts.at(-1) ?? null;
  }
  // Try without Collection wrapper - extract last part after last dot
  const parts = typeString.split(".");
  return parts.length > 0 ? (parts.at(-1) ?? null) : null;
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
  importAliases?: Map<string, string>, // Map base name -> alias (e.g., "textField" -> "tf")
  includeAllFieldsByDefault?: boolean,
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
  let _idField: string;
  if (keyFields.length > 0) {
    // Use the first key field
    const firstKey = keyFields[0];
    if (!firstKey) {
      throw new Error("Key fields array is empty but length check passed");
    }
    _idField = firstKey;
  } else {
    // Find a suitable ID field: look for auto-generated fields or fields with "id" in the name
    const fieldNames = Array.from(fields.keys());
    const autoGenField = fieldNames.find((name) => fields.get(name)?.["@AutoGenerated"]);
    const idFieldName = fieldNames.find(
      (name) => name.toLowerCase().includes("_id") || name.toLowerCase().endsWith("id") || name.toLowerCase() === "id",
    );
    const firstFieldName = fieldNames[0];
    if (!firstFieldName) {
      throw new Error("No fields found in entity type");
    }
    _idField = autoGenField ?? idFieldName ?? firstFieldName;
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

  // Determine includeAllFieldsByDefault: table-level override takes precedence, then top-level, default to true
  const effectiveIncludeAllFieldsByDefault =
    tableOverride?.includeAllFieldsByDefault ?? includeAllFieldsByDefault ?? true;

  // Generate field builder definitions
  const fieldLines: string[] = [];
  const fieldEntries = Array.from(fields.entries());

  // Filter out excluded fields and collect valid entries
  const validFieldEntries: [string, typeof fields extends Map<unknown, infer V> ? V : never][] = [];
  for (const entry of fieldEntries) {
    if (!entry) {
      continue;
    }
    const [fieldName] = entry;
    const fieldOverride = fieldOverridesMap.get(fieldName);

    // Skip excluded fields
    if (fieldOverride?.exclude === true) {
      continue;
    }

    // If includeAllFieldsByDefault is false, only include fields explicitly listed
    if (!(effectiveIncludeAllFieldsByDefault || fieldOverride)) {
      continue;
    }

    validFieldEntries.push(entry);
  }

  for (let i = 0; i < validFieldEntries.length; i++) {
    const entry = validFieldEntries[i];
    if (!entry) {
      continue;
    }
    const [fieldName, metadata] = entry;
    const fieldOverride = fieldOverridesMap.get(fieldName);

    // Try to match existing field: first by entity ID, then by name
    let matchedExistingField: ParsedField | null = null;
    let finalFieldName = fieldName;

    if (existingFields) {
      // Try matching by entity ID first
      if (metadata["@FieldID"]) {
        matchedExistingField = matchFieldByEntityId(existingFields.fieldsByEntityId, metadata["@FieldID"]);
        if (matchedExistingField && !alwaysOverrideFieldNames) {
          // Use existing field name unless alwaysOverrideFieldNames is true
          finalFieldName = matchedExistingField.fieldName;
        }
      }

      // If no match by entity ID, try matching by name
      if (!matchedExistingField) {
        matchedExistingField = matchFieldByName(existingFields.fields, fieldName);
      }
    }

    // Apply typeOverride if provided, otherwise use inferred type
    let fieldBuilder = mapODataTypeToFieldBuilder(
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

    // Apply import aliases if present
    fieldBuilder = applyAliasToFieldBuilder(fieldBuilder, importAliases);

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
  if (REGEX_STARTS_WITH_DIGIT.test(varName)) {
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

  const optionsSection = optionsParts.length > 0 ? `, {\n${optionsParts.map((p) => `  ${p}`).join(",\n")}\n}` : "";

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
function generateImports(usedFieldBuilders: Set<string>, needsZod: boolean): string {
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

  const imports = [`import { ${fieldBuilderImports.join(", ")} } from "@proofkit/fmodata"`];

  if (needsZod) {
    imports.push(`import { z } from "zod/v4"`);
  }

  return `${imports.join(";\n")};\n`;
}

/**
 * Sanitizes a name to be a safe filename
 */
function sanitizeFileName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
  // Prefix with underscore if name starts with a digit (invalid JavaScript identifier)
  return REGEX_STARTS_WITH_DIGIT.test(sanitized) ? `_${sanitized}` : sanitized;
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
  importAliases: Map<string, string>; // Map base name -> alias (e.g., "textField" -> "tf")
}

/**
 * Extracts user customizations (like .inputValidator() and .outputValidator()) from a method chain
 */
function extractUserCustomizations(chainText: string, baseChainEnd: number): string {
  // We want to preserve user-added chained calls even if they were placed:
  // - before a standard method (e.g. textField().inputValidator(...).entityId(...))
  // - on fields that have no standard methods at all (possible when reduceMetadata is true)
  //
  // `baseChainEnd` should point to the end of the generator-owned "base builder chain"
  // (e.g. `textField()` or `numberField().outputValidator(z.coerce.boolean())`).
  // Everything after that may contain standard methods *and* user customizations.
  // We extract only the non-standard chained calls and return them as a string
  // that can be appended to the regenerated chain.

  const standardMethodNames = new Set(["primaryKey", "readOnly", "notNull", "entityId", "comment"]);

  const start = Math.max(0, Math.min(baseChainEnd, chainText.length));
  const tail = chainText.slice(start);
  if (!tail.includes(".")) {
    return "";
  }

  function isIdentChar(c: string): boolean {
    return REGEX_IDENT_CHAR.test(c);
  }

  function skipWhitespace(s: string, idx: number): number {
    let currentIdx = idx;
    while (currentIdx < s.length && REGEX_WHITESPACE.test(s[currentIdx] ?? "")) {
      currentIdx++;
    }
    return currentIdx;
  }

  // Best-effort scanning helpers: handle nested parentheses and quoted strings.
  function scanString(s: string, idx: number, quote: string): number {
    // idx points at opening quote
    let currentIdx = idx + 1;
    while (currentIdx < s.length) {
      const ch = s[currentIdx];
      if (ch === "\\") {
        currentIdx += 2;
        continue;
      }
      if (ch === quote) {
        return currentIdx + 1;
      }
      currentIdx++;
    }
    return currentIdx;
  }

  function scanTemplateLiteral(s: string, idx: number): number {
    // idx points at opening backtick
    let currentIdx = idx + 1;
    while (currentIdx < s.length) {
      const ch = s[currentIdx];
      if (ch === "\\") {
        currentIdx += 2;
        continue;
      }
      if (ch === "`") {
        return currentIdx + 1;
      }
      if (ch === "$" && s[currentIdx + 1] === "{") {
        currentIdx += 2; // skip ${
        let braceDepth = 1;
        while (currentIdx < s.length && braceDepth > 0) {
          const c = s[currentIdx];
          if (c === "'" || c === '"') {
            currentIdx = scanString(s, currentIdx, c);
            continue;
          }
          if (c === "`") {
            currentIdx = scanTemplateLiteral(s, currentIdx);
            continue;
          }
          if (c === "{") {
            braceDepth++;
          } else if (c === "}") {
            braceDepth--;
          }
          currentIdx++;
        }
        continue;
      }
      currentIdx++;
    }
    return currentIdx;
  }

  function scanAngleBrackets(s: string, idx: number): number {
    // idx points at '<'
    let currentIdx = idx;
    let depth = 0;
    while (currentIdx < s.length) {
      const ch = s[currentIdx];
      if (ch === "'" || ch === '"') {
        currentIdx = scanString(s, currentIdx, ch);
        continue;
      }
      if (ch === "`") {
        currentIdx = scanTemplateLiteral(s, currentIdx);
        continue;
      }
      if (ch === "<") {
        depth++;
      }
      if (ch === ">") {
        depth--;
        currentIdx++;
        if (depth === 0) {
          return currentIdx;
        }
        continue;
      }
      currentIdx++;
    }
    return currentIdx;
  }

  function scanParens(s: string, idx: number): number {
    // idx points at '('
    let currentIdx = idx;
    let depth = 0;
    while (currentIdx < s.length) {
      const ch = s[currentIdx];
      if (ch === "'" || ch === '"') {
        currentIdx = scanString(s, currentIdx, ch);
        continue;
      }
      if (ch === "`") {
        currentIdx = scanTemplateLiteral(s, currentIdx);
        continue;
      }
      if (ch === "(") {
        depth++;
      }
      if (ch === ")") {
        depth--;
        currentIdx++;
        if (depth === 0) {
          return currentIdx;
        }
        continue;
      }
      currentIdx++;
    }
    return currentIdx;
  }

  const keptSegments: string[] = [];
  let i = 0;
  while (i < tail.length) {
    const dot = tail.indexOf(".", i);
    if (dot === -1) {
      break;
    }

    let j = dot + 1;
    if (j >= tail.length) {
      break;
    }
    if (!isIdentChar(tail[j] ?? "")) {
      i = j;
      continue;
    }

    const nameStart = j;
    while (j < tail.length && isIdentChar(tail[j] ?? "")) {
      j++;
    }
    const methodName = tail.slice(nameStart, j);

    j = skipWhitespace(tail, j);

    // Optional generic type args: .foo<...>(...)
    if (tail[j] === "<") {
      j = scanAngleBrackets(tail, j);
      j = skipWhitespace(tail, j);
    }

    // Method call args: (...)
    if (tail[j] === "(") {
      const end = scanParens(tail, j);
      const segment = tail.slice(dot, end);
      if (!standardMethodNames.has(methodName)) {
        keptSegments.push(segment);
      }
      i = end;
      continue;
    }

    // Property access or malformed chain segment: keep it if it's not standard.
    // Capture up to the next '.' or end.
    const nextDot = tail.indexOf(".", j);
    const end = nextDot === -1 ? tail.length : nextDot;
    const segment = tail.slice(dot, end);
    if (!standardMethodNames.has(methodName)) {
      keptSegments.push(segment);
    }
    i = end;
  }

  return keptSegments.join("");
}

/**
 * Parses an existing table occurrence file and extracts field definitions
 */
function parseExistingTableFile(sourceFile: SourceFile): ParsedTableOccurrence | null {
  // Find the fmTableOccurrence call by searching all call expressions
  let callExpr: CallExpression | null = null;

  sourceFile.forEachDescendant((node) => {
    if (node.getKindName() === "CallExpression") {
      const expr = node as CallExpression;
      const expression = expr.getExpression();
      if (expression.getKindName() === "Identifier" && expression.getText() === "fmTableOccurrence") {
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
      const varDecl = parent as unknown as VariableDeclaration;
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
        const value = (entityIdProp as PropertyAssignment).getInitializer()?.getText();
        if (value) {
          tableEntityId = value.replace(/['"]/g, "");
        }
      }
    }
  }

  // Extract existing imports and build alias map
  const existingImports: string[] = [];
  const importAliases = new Map<string, string>(); // base name -> alias
  const importDeclarations = sourceFile.getImportDeclarations();
  for (const importDecl of importDeclarations) {
    const importText = importDecl.getFullText();
    if (importText.trim()) {
      existingImports.push(importText.trim());
    }

    // Extract aliases from named imports
    const namedImports = importDecl.getNamedImports();
    for (const namedImport of namedImports) {
      const name = namedImport.getName(); // The original name
      const aliasNode = namedImport.getAliasNode();
      if (aliasNode) {
        const alias = aliasNode.getText(); // The alias
        importAliases.set(name, alias);
      }
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
    const entityIdMatch = chainText.match(REGEX_ENTITY_ID);
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
    importAliases,
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
function matchFieldByName(existingFields: Map<string, ParsedField>, fieldName: string): ParsedField | null {
  return existingFields.get(fieldName) || null;
}

/**
 * Preserves user customizations from an existing field chain
 */
function preserveUserCustomizations(existingField: ParsedField | undefined, newChain: string): string {
  if (!existingField) {
    return newChain;
  }

  const standardMethods = [".primaryKey()", ".readOnly()", ".notNull()", ".entityId(", ".comment("];

  // Determine where the generator-owned base builder chain ends in the new chain
  // (before any standard methods added by the generator).
  let baseChainEnd = newChain.length;
  for (const method of standardMethods) {
    const idx = newChain.indexOf(method);
    if (idx !== -1 && idx < baseChainEnd) {
      baseChainEnd = idx;
    }
  }

  const baseBuilderPrefix = newChain.slice(0, baseChainEnd);
  const existingChainText = existingField.fullChainText;
  const existingBaseEnd = existingChainText.startsWith(baseBuilderPrefix) ? baseBuilderPrefix.length : 0;

  const userCustomizations = extractUserCustomizations(existingChainText, existingBaseEnd);

  if (!userCustomizations) {
    return newChain;
  }

  // Append extracted user customizations to the regenerated chain
  return newChain + userCustomizations;
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
    formatCommand?: string;
  },
): Promise<void> {
  const { entityTypes, entitySets } = metadata;
  const {
    path,
    clearOldFiles = true,
    tables,
    alwaysOverrideFieldNames = true,
    includeAllFieldsByDefault = true,
    formatCommand,
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
  const tableOverridesMap = new Map<string, NonNullable<FmodataConfig["tables"]>[number]>();
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
      const tableAlwaysOverrideFieldNames = tableOverride?.alwaysOverrideFieldNames ?? alwaysOverrideFieldNames;

      // First generate without existing fields to get the structure
      // We'll regenerate with existing fields later if the file exists
      const generated = generateTableOccurrence(
        entitySetName,
        entityType,
        entityTypeToSetMap,
        tableOverride,
        undefined,
        tableAlwaysOverrideFieldNames,
        undefined,
        includeAllFieldsByDefault,
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
    const tableAlwaysOverrideFieldNames = generated.tableOverride?.alwaysOverrideFieldNames ?? alwaysOverrideFieldNames;

    // Regenerate with existing fields merged in if file exists
    const regenerated = existingFields
      ? generateTableOccurrence(
          generated.entitySetName,
          generated.entityType,
          entityTypeToSetMap,
          generated.tableOverride,
          existingFields,
          tableAlwaysOverrideFieldNames,
          existingFields.importAliases,
          includeAllFieldsByDefault,
        )
      : generated;

    // Track removed fields (fields in existing but not in metadata)
    const removedFields: ParsedField[] = [];
    if (existingFields) {
      for (const existingField of existingFields.fields.values()) {
        // Check if this field is still in metadata
        const stillExists = Array.from(generated.entityType.Properties.keys()).some((metaFieldName) => {
          const metaField = generated.entityType.Properties.get(metaFieldName);
          if (!metaField) {
            return false;
          }

          // Match by entity ID or name
          if (existingField.entityId && metaField["@FieldID"] === existingField.entityId) {
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
    const requiredImports = generateImports(regenerated.usedFieldBuilders, regenerated.needsZod);

    // Parse import statements to extract module and named imports
    function parseImport(importText: string): {
      module: string;
      namedImports: string[]; // Base names only (for comparison)
      fullNamedImports: string[]; // Full specifiers including aliases (e.g., "x as y")
      fullText: string;
    } | null {
      const trimmed = importText.trim();
      if (!trimmed.startsWith("import")) {
        return null;
      }

      // Extract module specifier using regex
      const moduleMatch = trimmed.match(REGEX_FROM_MODULE);
      if (!moduleMatch?.[1]) {
        return null;
      }
      const module = moduleMatch[1];

      // Extract named imports
      const namedImports: string[] = []; // Base names for comparison
      const fullNamedImports: string[] = []; // Full specifiers with aliases preserved
      const namedMatch = trimmed.match(REGEX_NAMED_IMPORTS);
      if (namedMatch?.[1]) {
        const importsList = namedMatch[1];
        // Split by comma and clean up
        for (const imp of importsList.split(",")) {
          const cleaned = imp.trim();
          if (cleaned) {
            // Preserve the full import specifier (including alias)
            fullNamedImports.push(cleaned);

            // Extract base name for comparison (e.g., "x as y" -> "x")
            const aliasMatch = cleaned.match(REGEX_IMPORT_ALIAS);
            if (aliasMatch?.[1]) {
              namedImports.push(aliasMatch[1]);
            } else {
              namedImports.push(cleaned);
            }
          }
        }
      }

      return { module, namedImports, fullNamedImports, fullText: trimmed };
    }

    // If file exists, preserve existing imports and merge with required ones
    let finalImports = requiredImports;
    if (existingFields && existingFields.existingImports.length > 0) {
      // Parse all existing imports by module
      const existingImportsByModule = new Map<
        string,
        {
          namedImports: Set<string>; // Base names for comparison
          fullNamedImports: Map<string, string>; // Map base name -> full specifier (preserves aliases)
          fullText: string;
        }
      >();

      for (const existingImport of existingFields.existingImports) {
        const parsed = parseImport(existingImport);
        if (parsed) {
          const existing = existingImportsByModule.get(parsed.module);
          if (existing) {
            // Merge named imports from duplicate imports
            for (const imp of parsed.namedImports) {
              existing.namedImports.add(imp);
            }
            // Preserve full import specifiers (with aliases)
            for (const fullSpec of parsed.fullNamedImports) {
              const baseName = fullSpec.match(REGEX_IMPORT_ALIAS)?.[1] || fullSpec;
              existing.fullNamedImports.set(baseName, fullSpec);
            }
          } else {
            const fullNamedImportsMap = new Map<string, string>();
            for (const fullSpec of parsed.fullNamedImports) {
              const baseName = fullSpec.match(REGEX_IMPORT_ALIAS)?.[1] || fullSpec;
              fullNamedImportsMap.set(baseName, fullSpec);
            }
            existingImportsByModule.set(parsed.module, {
              namedImports: new Set(parsed.namedImports),
              fullNamedImports: fullNamedImportsMap,
              fullText: parsed.fullText,
            });
          }
        }
      }

      // Parse required imports
      const requiredImportLines = requiredImports.split("\n").filter((line) => line.trim());
      const requiredImportsByModule = new Map<string, Set<string>>();

      for (const requiredLine of requiredImportLines) {
        const parsed = parseImport(requiredLine);
        if (parsed) {
          const existing = requiredImportsByModule.get(parsed.module);
          if (existing) {
            for (const imp of parsed.namedImports) {
              existing.add(imp);
            }
          } else {
            requiredImportsByModule.set(parsed.module, new Set(parsed.namedImports));
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
        if (parsed?.module) {
          // Skip if we've already processed this module (deduplicate)
          if (processedModules.has(parsed.module)) {
            continue;
          }
          processedModules.add(parsed.module);

          // Use the merged named imports from existingImportsByModule
          const existing = existingImportsByModule.get(parsed.module);
          const allExistingImports = existing ? Array.from(existing.namedImports) : parsed.namedImports;

          const required = requiredImportsByModule.get(parsed.module);
          if (required) {
            // Check if we need to add any missing named imports
            const missingImports = Array.from(required).filter((imp) => !allExistingImports.includes(imp));
            if (missingImports.length > 0) {
              // Build import list: use preserved full specifiers (with aliases) for existing,
              // and base names for new required imports
              const importSpecs: string[] = [];

              // Add existing imports using their preserved full specifiers (with aliases)
              if (existing) {
                for (const baseName of allExistingImports) {
                  const fullSpec = existing.fullNamedImports.get(baseName);
                  if (fullSpec) {
                    importSpecs.push(fullSpec);
                  } else {
                    importSpecs.push(baseName);
                  }
                }
              } else {
                // Fallback to parsed full named imports
                for (const fullSpec of parsed.fullNamedImports) {
                  importSpecs.push(fullSpec);
                }
              }

              // Add missing required imports (apply aliases if they exist)
              for (const missingImport of missingImports) {
                const alias = existingFields.importAliases.get(missingImport);
                if (alias) {
                  importSpecs.push(`${missingImport} as ${alias}`);
                } else {
                  importSpecs.push(missingImport);
                }
              }

              // Sort imports (but preserve aliases)
              importSpecs.sort();

              finalImportLines.push(`import { ${importSpecs.join(", ")} } from "${parsed.module}";`);
            } else {
              // Keep existing import format with preserved aliases
              const importSpecs: string[] = [];
              if (existing) {
                for (const baseName of allExistingImports) {
                  const fullSpec = existing.fullNamedImports.get(baseName);
                  if (fullSpec) {
                    importSpecs.push(fullSpec);
                  } else {
                    importSpecs.push(baseName);
                  }
                }
              } else {
                for (const fullSpec of parsed.fullNamedImports) {
                  importSpecs.push(fullSpec);
                }
              }
              importSpecs.sort();
              finalImportLines.push(`import { ${importSpecs.join(", ")} } from "${parsed.module}";`);
            }
            handledModules.add(parsed.module);
            requiredImportsByModule.delete(parsed.module);
          } else {
            // Keep existing import (not in required imports - user added it)
            // Preserve aliases from existing imports
            const importSpecs: string[] = [];
            if (existing) {
              for (const baseName of allExistingImports) {
                const fullSpec = existing.fullNamedImports.get(baseName);
                if (fullSpec) {
                  importSpecs.push(fullSpec);
                } else {
                  importSpecs.push(baseName);
                }
              }
            } else {
              for (const fullSpec of parsed.fullNamedImports) {
                importSpecs.push(fullSpec);
              }
            }
            importSpecs.sort();
            finalImportLines.push(`import { ${importSpecs.join(", ")} } from "${parsed.module}";`);
          }
        } else {
          // Keep non-import lines as-is (comments, etc.)
          finalImportLines.push(existingImport);
        }
      }

      // Add any required imports that don't exist yet
      for (const [module, namedImports] of requiredImportsByModule.entries()) {
        if (module && !handledModules.has(module)) {
          // Apply aliases to new imports if they exist
          const importSpecs: string[] = [];
          for (const importName of Array.from(namedImports).sort()) {
            const alias = existingFields.importAliases.get(importName);
            if (alias) {
              importSpecs.push(`${importName} as ${alias}`);
            } else {
              importSpecs.push(importName);
            }
          }
          const importsList = importSpecs.join(", ");
          if (importsList) {
            finalImportLines.push(`import { ${importsList} } from "${module}";`);
          }
        }
      }

      finalImports = `${finalImportLines.join("\n")}\n`;
    }

    // Build file content with removed fields commented out
    let fileContent = `${finalImports}\n`;

    if (removedFields.length > 0) {
      fileContent += "// ============================================================================\n";
      fileContent += "// Removed fields (not found in metadata)\n";
      fileContent += "// ============================================================================\n";
      for (const removedField of removedFields) {
        const matchInfo = removedField.entityId ? ` (was matched by entityId ${removedField.entityId})` : "";
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
    exportStatements.push(`export { ${regenerated.varName} } from "./${sanitizeFileName(regenerated.varName)}";`);
  }

  // Only use built-in prettier formatting if no custom format command is provided
  if (formatCommand) {
    // Just save without formatting - the custom command will format
    await project.save();
  } else {
    await formatAndSaveSourceFiles(project);
  }

  // Generate index.ts file that exports all table occurrences
  const indexContent = `// ============================================================================
// Auto-generated index file - exports all table occurrences
// ============================================================================

${exportStatements.join("\n")}
`;

  const indexPath = join(resolvedOutputPath, "index.ts");
  await writeFile(indexPath, indexContent, "utf-8");
}
