import type { Database, Field, Metadata } from "@proofkit/fmodata";
import { isFMODataError, isODataError } from "@proofkit/fmodata";
import type { DBFieldAttribute } from "better-auth/db";
import chalk from "chalk";

/** Schema type returned by better-auth's getSchema function */
type BetterAuthSchema = Record<string, { fields: Record<string, DBFieldAttribute>; order: number }>;

function normalizeBetterAuthFieldType(fieldType: unknown): string {
  if (typeof fieldType === "string") {
    return fieldType;
  }
  if (Array.isArray(fieldType)) {
    return fieldType.map(String).join("|");
  }
  return String(fieldType);
}

export async function getMetadata(db: Database): Promise<Metadata | null> {
  try {
    const metadata = await db.getMetadata({ format: "json" });
    return metadata;
  } catch (err) {
    console.error(chalk.red("Failed to get metadata:"), formatError(err));
    return null;
  }
}

/** Map a better-auth field type string to an fmodata Field type */
function mapFieldType(t: string): "string" | "numeric" | "timestamp" {
  if (t.includes("boolean") || t.includes("number")) {
    return "numeric";
  }
  if (t.includes("date")) {
    return "timestamp";
  }
  return "string";
}

export async function planMigration(db: Database, betterAuthSchema: BetterAuthSchema): Promise<MigrationPlan> {
  const metadata = await getMetadata(db);

  // Build a map from entity set name to entity type key
  const entitySetToType: Record<string, string> = {};
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value.$Kind === "EntitySet" && value.$Type) {
        // $Type is like 'betterauth_test.fmp12.proofkit_user_'
        const typeKey = value.$Type.split(".").pop(); // e.g., 'proofkit_user_'
        entitySetToType[key] = typeKey || key;
      }
    }
  }

  const existingTables = metadata
    ? Object.entries(entitySetToType).reduce(
        (acc, [entitySetName, entityTypeKey]) => {
          const entityType = metadata[entityTypeKey];
          if (!entityType) {
            return acc;
          }
          const fields = Object.entries(entityType)
            .filter(
              ([_fieldKey, fieldValue]) =>
                typeof fieldValue === "object" && fieldValue !== null && "$Type" in fieldValue,
            )
            .map(([fieldKey, fieldValue]) => {
              let type = "string";
              if (fieldValue.$Type === "Edm.String") {
                type = "string";
              } else if (fieldValue.$Type === "Edm.DateTimeOffset") {
                type = "timestamp";
              } else if (
                fieldValue.$Type === "Edm.Decimal" ||
                fieldValue.$Type === "Edm.Int32" ||
                fieldValue.$Type === "Edm.Int64"
              ) {
                type = "numeric";
              }
              return {
                name: fieldKey,
                type,
              };
            });
          acc[entitySetName] = fields;
          return acc;
        },
        {} as Record<string, { name: string; type: string }[]>,
      )
    : {};

  const baTables = Object.entries(betterAuthSchema)
    .sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
    .map(([key, value]) => ({
      ...value,
      modelName: key,
    }));

  const migrationPlan: MigrationPlan = [];

  for (const baTable of baTables) {
    const fields: FmField[] = Object.entries(baTable.fields).map(([key, field]) => {
      const t = normalizeBetterAuthFieldType(field.type);
      const type = mapFieldType(t);
      return {
        name: field.fieldName ?? key,
        type,
      };
    });

    const tableExists = baTable.modelName in existingTables;

    if (tableExists) {
      const existingFields = (existingTables[baTable.modelName] || []).map((f) => f.name);
      const existingFieldMap = (existingTables[baTable.modelName] || []).reduce(
        (acc, f) => {
          acc[f.name] = f.type;
          return acc;
        },
        {} as Record<string, string>,
      );
      for (const field of fields) {
        if (existingFields.includes(field.name) && existingFieldMap[field.name] !== field.type) {
          console.warn(
            `⚠️ WARNING: Field '${field.name}' in table '${baTable.modelName}' exists but has type '${existingFieldMap[field.name]}' (expected '${field.type}'). Change the field type in FileMaker to avoid potential errors.`,
          );
        }
      }
      const fieldsToAdd = fields.filter((f) => !existingFields.includes(f.name));
      if (fieldsToAdd.length > 0) {
        migrationPlan.push({
          tableName: baTable.modelName,
          operation: "update",
          fields: fieldsToAdd,
        });
      }
    } else {
      migrationPlan.push({
        tableName: baTable.modelName,
        operation: "create",
        fields: [
          {
            name: "id",
            type: "string",
            primary: true,
            unique: true,
          },
          ...fields,
        ],
      });
    }
  }

  return migrationPlan;
}

export async function executeMigration(db: Database, migrationPlan: MigrationPlan) {
  for (const step of migrationPlan) {
    // Convert plan fields to fmodata Field type
    const fmodataFields: Field[] = step.fields.map((f) => ({
      name: f.name,
      type: f.type,
      ...(f.primary ? { primary: true } : {}),
      ...(f.unique ? { unique: true } : {}),
    }));

    if (step.operation === "create") {
      console.log("Creating table:", step.tableName);
      try {
        await db.schema.createTable(step.tableName, fmodataFields);
      } catch (error) {
        throw migrationError("create", step.tableName, error);
      }
    } else if (step.operation === "update") {
      console.log("Adding fields to table:", step.tableName);
      try {
        await db.schema.addFields(step.tableName, fmodataFields);
      } catch (error) {
        throw migrationError("update", step.tableName, error);
      }
    }
  }
}

interface FmField {
  name: string;
  type: "string" | "numeric" | "timestamp";
  primary?: boolean;
  unique?: boolean;
}

const migrationStepTypes = ["create", "update"] as const;
interface MigrationStep {
  tableName: string;
  operation: (typeof migrationStepTypes)[number];
  fields: FmField[];
}

export type MigrationPlan = MigrationStep[];

function formatError(error: unknown): string {
  if (isODataError(error)) {
    const code = error.code ? ` (${error.code})` : "";
    return `${error.message}${code}`;
  }
  if (isFMODataError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function migrationError(operation: string, tableName: string, error: unknown): Error {
  const action = operation === "create" ? "create table" : "update table";
  const base = `Failed to ${action} "${tableName}"`;

  if (isODataError(error) && error.code === "207") {
    console.error(
      chalk.red(`\n${base}: Cannot modify schema.`),
      chalk.yellow("\nThe account used does not have schema modification privileges."),
      chalk.gray(
        "\nUse --username and --password to provide Full Access credentials, or grant schema modification privileges to the current account.",
      ),
    );
  } else {
    console.error(chalk.red(`\n${base}:`), formatError(error));
  }
  return new Error(`Migration failed: ${formatError(error)}`);
}

export function prettyPrintMigrationPlan(
  migrationPlan: MigrationPlan,
  target?: { serverUrl?: string; fileName?: string },
) {
  if (!migrationPlan.length) {
    console.log("No changes to apply. Database is up to date.");
    return;
  }
  console.log(chalk.bold.green("Migration plan:"));
  if (target?.serverUrl || target?.fileName) {
    const parts: string[] = [];
    if (target.fileName) parts.push(chalk.cyan(target.fileName));
    if (target.serverUrl) parts.push(chalk.gray(target.serverUrl));
    console.log(`  Target: ${parts.join(" @ ")}`);
  }
  for (const step of migrationPlan) {
    const emoji = step.operation === "create" ? "✅" : "✏️";
    console.log(
      `\n${emoji} ${step.operation === "create" ? chalk.bold.green("Create table") : chalk.bold.yellow("Update table")}: ${step.tableName}`,
    );
    if (step.fields.length) {
      for (const field of step.fields) {
        let fieldDesc = `    - ${field.name} (${field.type}`;
        if (field.primary) {
          fieldDesc += ", primary";
        }
        if (field.unique) {
          fieldDesc += ", unique";
        }
        fieldDesc += ")";
        console.log(fieldDesc);
      }
    } else {
      console.log("    (No fields to add)");
    }
  }
  console.log("");
}
