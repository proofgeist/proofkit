import { type BetterAuthDbSchema } from "better-auth/db";
import { Database, type Field as FmField } from "fm-odata-client";
import chalk from "chalk";
import z from "zod/v4";

export async function planMigration(
  db: Database,
  betterAuthSchema: BetterAuthDbSchema,
): Promise<MigrationPlan> {
  const metadata = await db.getMetadata().catch((error) => {
    console.error("Failed to get metadata from database", error);
    return null;
  });

  // Build a map from entity set name to entity type key
  let entitySetToType: Record<string, string> = {};
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
          if (!entityType) return acc;
          const fields = Object.entries(entityType)
            .filter(
              ([fieldKey, fieldValue]) =>
                typeof fieldValue === "object" &&
                fieldValue !== null &&
                "$Type" in fieldValue,
            )
            .map(([fieldKey, fieldValue]) => ({
              name: fieldKey,
              type:
                fieldValue.$Type === "Edm.String"
                  ? "string"
                  : fieldValue.$Type === "Edm.DateTimeOffset"
                    ? "timestamp"
                    : fieldValue.$Type === "Edm.Decimal" ||
                        fieldValue.$Type === "Edm.Int32" ||
                        fieldValue.$Type === "Edm.Int64"
                      ? "numeric"
                      : "string",
            }));
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
      keyName: key,
    }));

  const migrationPlan: MigrationPlan = [];

  for (const baTable of baTables) {
    const fields: FmField[] = Object.entries(baTable.fields).map(
      ([key, field]) => ({
        name: field.fieldName ?? key,
        type:
          field.type === "boolean" || field.type.includes("number")
            ? "numeric"
            : field.type === "date"
              ? "timestamp"
              : "string",
      }),
    );

    // get existing table or create it
    const tableExists = Object.prototype.hasOwnProperty.call(
      existingTables,
      baTable.modelName,
    );

    if (!tableExists) {
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
    } else {
      const existingFields = (existingTables[baTable.modelName] || []).map(
        (f) => f.name,
      );
      const existingFieldMap = (existingTables[baTable.modelName] || []).reduce(
        (acc, f) => {
          acc[f.name] = f.type;
          return acc;
        },
        {} as Record<string, string>,
      );
      // Warn about type mismatches (optional, not in plan)
      fields.forEach((field) => {
        if (
          existingFields.includes(field.name) &&
          existingFieldMap[field.name] !== field.type
        ) {
          console.warn(
            `⚠️ WARNING: Field '${field.name}' in table '${baTable.modelName}' exists but has type '${existingFieldMap[field.name]}' (expected '${field.type}'). Change the field type in FileMaker to avoid potential errors.`,
          );
        }
      });
      const fieldsToAdd = fields.filter(
        (f) => !existingFields.includes(f.name),
      );
      if (fieldsToAdd.length > 0) {
        migrationPlan.push({
          tableName: baTable.modelName,
          operation: "update",
          fields: fieldsToAdd,
        });
      }
    }
  }

  return migrationPlan;
}

export async function executeMigration(
  db: Database,
  migrationPlan: MigrationPlan,
) {
  for (const step of migrationPlan) {
    if (step.operation === "create") {
      console.log("Creating table:", step.tableName);
      await db.schemaManager().createTable(step.tableName, step.fields);
    } else if (step.operation === "update") {
      console.log("Adding fields to table:", step.tableName);
      await db.schemaManager().addFields(step.tableName, step.fields);
    }
  }
}

const genericFieldSchema = z.object({
  name: z.string(),
  nullable: z.boolean().optional(),
  primary: z.boolean().optional(),
  unique: z.boolean().optional(),
  global: z.boolean().optional(),
  repetitions: z.number().optional(),
});

const stringFieldSchema = genericFieldSchema.extend({
  type: z.literal("string"),
  maxLength: z.number().optional(),
  default: z.enum(["USER", "USERNAME", "CURRENT_USER"]).optional(),
});

const numericFieldSchema = genericFieldSchema.extend({
  type: z.literal("numeric"),
});

const dateFieldSchema = genericFieldSchema.extend({
  type: z.literal("date"),
  default: z.enum(["CURRENT_DATE", "CURDATE"]).optional(),
});

const timeFieldSchema = genericFieldSchema.extend({
  type: z.literal("time"),
  default: z.enum(["CURRENT_TIME", "CURTIME"]).optional(),
});

const timestampFieldSchema = genericFieldSchema.extend({
  type: z.literal("timestamp"),
  default: z.enum(["CURRENT_TIMESTAMP", "CURTIMESTAMP"]).optional(),
});

const containerFieldSchema = genericFieldSchema.extend({
  type: z.literal("container"),
  externalSecurePath: z.string().optional(),
});

const fieldSchema = z.discriminatedUnion("type", [
  stringFieldSchema,
  numericFieldSchema,
  dateFieldSchema,
  timeFieldSchema,
  timestampFieldSchema,
  containerFieldSchema,
]);

export const migrationPlanSchema = z
  .object({
    tableName: z.string(),
    operation: z.enum(["create", "update"]),
    fields: z.array(fieldSchema),
  })
  .array();

export type MigrationPlan = z.infer<typeof migrationPlanSchema>;

export function prettyPrintMigrationPlan(migrationPlan: MigrationPlan) {
  if (!migrationPlan.length) {
    console.log("No changes to apply. Database is up to date.");
    return;
  }
  console.log(chalk.bold.green("Migration plan:"));
  for (const step of migrationPlan) {
    const emoji = step.operation === "create" ? "✅" : "✏️";
    console.log(
      `\n${emoji} ${step.operation === "create" ? chalk.bold.green("Create table") : chalk.bold.yellow("Update table")}: ${step.tableName}`,
    );
    if (step.fields.length) {
      for (const field of step.fields) {
        let fieldDesc = `    - ${field.name} (${field.type}`;
        if (field.primary) fieldDesc += ", primary";
        if (field.unique) fieldDesc += ", unique";
        fieldDesc += ")";
        console.log(fieldDesc);
      }
    } else {
      console.log("    (No fields to add)");
    }
  }
  console.log("");
}
