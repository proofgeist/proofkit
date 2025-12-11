import { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * BaseTable defines the schema and configuration for a table.
 * Use `defineBaseTable()` to create instances with proper type inference.
 *
 * @template Schema - Record of field names to StandardSchemaV1 validators
 * @template IdField - The name of the primary key field (optional, automatically read-only)
 * @template Required - Additional field names to require on insert (beyond auto-inferred required fields)
 * @template ReadOnly - Field names that cannot be modified via insert/update (idField is automatically read-only)
 *
 * @example Basic table with auto-inferred required fields
 * ```ts
 * import { z } from "zod";
 * import { defineBaseTable } from "@proofkit/fmodata";
 *
 * const usersTable = defineBaseTable({
 *   schema: {
 *     id: z.string(),               // Auto-required (not nullable), auto-readOnly (idField)
 *     name: z.string(),             // Auto-required (not nullable)
 *     email: z.string().nullable(), // Optional (nullable)
 *   },
 *   idField: "id",
 * });
 * // On insert: name is required, email is optional (id is excluded - readOnly)
 * // On update: name and email available (id is excluded - readOnly)
 * ```
 *
 * @example Table with additional required and readOnly fields
 * ```ts
 * import { z } from "zod";
 * import { defineBaseTable } from "@proofkit/fmodata";
 *
 * const usersTable = defineBaseTable({
 *   schema: {
 *     id: z.string(),                    // Auto-required, auto-readOnly (idField)
 *     createdAt: z.string(),             // Read-only system field
 *     name: z.string(),                  // Auto-required
 *     email: z.string().nullable(),      // Optional by default...
 *     legacyField: z.string().nullable(), // Optional by default...
 *   },
 *   idField: "id",
 *   required: ["legacyField"],  // Make legacyField required for new inserts
 *   readOnly: ["createdAt"],    // Exclude from insert/update
 * });
 * // On insert: name and legacyField required; email optional (id and createdAt excluded)
 * // On update: all fields optional (id and createdAt excluded)
 * ```
 *
 * @example Table with multiple read-only fields
 * ```ts
 * import { z } from "zod";
 * import { defineBaseTable } from "@proofkit/fmodata";
 *
 * const usersTable = defineBaseTable({
 *   schema: {
 *     id: z.string(),
 *     createdAt: z.string(),
 *     modifiedAt: z.string(),
 *     createdBy: z.string(),
 *     notes: z.string().nullable(),
 *   },
 *   idField: "id",
 *   readOnly: ["createdAt", "modifiedAt", "createdBy"],
 * });
 * // On insert/update: only notes is available (id and system fields excluded)
 * ```
 */
export class BaseTable<
  Schema extends Record<string, StandardSchemaV1> = any,
  IdField extends keyof Schema | undefined = undefined,
  Required extends readonly (keyof Schema | (string & {}))[] = readonly [],
  ReadOnly extends readonly (keyof Schema | (string & {}))[] = readonly [],
> {
  public readonly schema: Schema;
  public readonly idField?: IdField;
  public readonly required?: Required;
  public readonly readOnly?: ReadOnly;
  public readonly fmfIds?: Record<
    keyof Schema | (string & {}),
    `FMFID:${string}`
  >;

  constructor(config: {
    schema: Schema;
    idField?: IdField;
    required?: Required;
    readOnly?: ReadOnly;
    fmfIds?: Record<string, `FMFID:${string}`>;
  }) {
    this.schema = config.schema;
    this.idField = config.idField;
    this.required = config.required;
    this.readOnly = config.readOnly;
    this.fmfIds = config.fmfIds as
      | Record<keyof Schema, `FMFID:${string}`>
      | undefined;
  }

  /**
   * Returns the FileMaker field ID (FMFID) for a given field name, or the field name itself if not using IDs.
   * @param fieldName - The field name to get the ID for
   * @returns The FMFID string or the original field name
   */
  getFieldId(fieldName: keyof Schema): string {
    if (this.fmfIds && fieldName in this.fmfIds) {
      return this.fmfIds[fieldName];
    }
    return String(fieldName);
  }

  /**
   * Returns the field name for a given FileMaker field ID (FMFID), or the ID itself if not found.
   * @param fieldId - The FMFID to get the field name for
   * @returns The field name or the original ID
   */
  getFieldName(fieldId: string): string {
    if (this.fmfIds) {
      // Search for the field name that corresponds to this FMFID
      for (const [fieldName, fmfId] of Object.entries(this.fmfIds)) {
        if (fmfId === fieldId) {
          return fieldName;
        }
      }
    }
    return fieldId;
  }

  /**
   * Returns true if this BaseTable is using FileMaker field IDs.
   */
  isUsingFieldIds(): boolean {
    return this.fmfIds !== undefined;
  }
}

/**
 * Creates a BaseTable with proper TypeScript type inference.
 *
 * Use this function to create BaseTable instances with full type safety.
 *
 * @example Without entity IDs
 * ```ts
 * const users = defineBaseTable({
 *   schema: { id: z.string(), name: z.string() },
 *   idField: "id",
 * });
 * ```
 *
 * @example With entity IDs (FileMaker field IDs)
 * ```ts
 * const products = defineBaseTable({
 *   schema: { id: z.string(), name: z.string() },
 *   idField: "id",
 *   fmfIds: { id: "FMFID:1", name: "FMFID:2" },
 * });
 * ```
 */
export function defineBaseTable<
  const Schema extends Record<string, StandardSchemaV1>,
  IdField extends keyof Schema | undefined = undefined,
  const Required extends readonly (
    | keyof Schema
    | (string & {})
  )[] = readonly [],
  const ReadOnly extends readonly (
    | keyof Schema
    | (string & {})
  )[] = readonly [],
>(config: {
  schema: Schema;
  idField?: IdField;
  required?: Required;
  readOnly?: ReadOnly;
  fmfIds?: { [K in keyof Schema | (string & {})]: `FMFID:${string}` };
}): BaseTable<Schema, IdField, Required, ReadOnly> {
  return new BaseTable(config);
}
