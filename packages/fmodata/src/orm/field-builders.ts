import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Branded type for container field's database type.
 * This allows TypeScript to distinguish container fields from regular string fields
 * at the type level, enabling compile-time exclusion from select operations.
 */
export type ContainerDbType = string & { readonly __container: true };

const FILEMAKER_LIST_DELIMITER = "\r";
const FILEMAKER_NEWLINE_REGEX = /\r\n|\n/g;

type ValidationResult<T> = { value: T } | { issues: readonly StandardSchemaV1.Issue[] };

export interface ListFieldOptions<TItem = string, TAllowNull extends boolean = false> {
  itemValidator?: StandardSchemaV1<unknown, TItem>;
  allowNull?: TAllowNull;
}

function normalizeFileMakerNewlines(value: string): string {
  return value.replace(FILEMAKER_NEWLINE_REGEX, FILEMAKER_LIST_DELIMITER);
}

function splitFileMakerList(value: string): string[] {
  const normalized = normalizeFileMakerNewlines(value);
  if (normalized === "") {
    return [];
  }
  return normalized.split(FILEMAKER_LIST_DELIMITER);
}

function issue(message: string): StandardSchemaV1.Issue {
  return { message };
}

function validateItemsWithSchema<TItem>(
  items: string[],
  itemValidator: StandardSchemaV1<unknown, TItem>,
): ValidationResult<TItem[]> | Promise<ValidationResult<TItem[]>> {
  const validations = items.map((item) => itemValidator["~standard"].validate(item));
  const hasAsyncValidation = validations.some((result) => result instanceof Promise);

  const finalize = (results: Array<{ value: TItem } | { issues: readonly StandardSchemaV1.Issue[] }>) => {
    const transformed: TItem[] = [];
    const issues: StandardSchemaV1.Issue[] = [];

    results.forEach((result, index) => {
      if ("issues" in result && result.issues) {
        for (const validationIssue of result.issues) {
          issues.push({
            ...validationIssue,
            path: validationIssue.path ? [index, ...validationIssue.path] : [index],
          });
        }
        return;
      }
      if ("value" in result) {
        transformed.push(result.value);
      }
    });

    if (issues.length > 0) {
      return { issues };
    }

    return { value: transformed };
  };

  if (hasAsyncValidation) {
    return Promise.all(validations).then((results) => finalize(results));
  }

  return finalize(validations as Array<{ value: TItem } | { issues: readonly StandardSchemaV1.Issue[] }>);
}

/**
 * FieldBuilder provides a fluent API for defining table fields with type-safe metadata.
 * Supports chaining methods to configure primary keys, nullability, read-only status, entity IDs, and validators.
 *
 * @template TOutput - The output type after applying outputValidator (what you get when reading)
 * @template TInput - The input type after applying inputValidator (what you pass when writing)
 * @template TDbType - The database type (what FileMaker stores/expects)
 * @template TReadOnly - Whether this field is read-only (for type-level exclusion from insert/update)
 */
// biome-ignore lint/suspicious/noExplicitAny: Default type parameter for flexibility
export class FieldBuilder<TOutput = any, TInput = TOutput, TDbType = TOutput, TReadOnly extends boolean = false> {
  private _primaryKey = false;
  private _notNull = false;
  private _readOnly = false;
  private _entityId?: `FMFID:${string}`;
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  private _outputValidator?: StandardSchemaV1<any, TOutput>;
  // biome-ignore lint/suspicious/noExplicitAny: Required for type inference with infer
  private _inputValidator?: StandardSchemaV1<TInput, any>;
  private readonly _fieldType: string;
  private _comment?: string;

  constructor(fieldType: string) {
    this._fieldType = fieldType;
  }

  /**
   * Mark this field as the primary key for the table.
   * Primary keys are automatically read-only and non-nullable.
   */
  primaryKey(): FieldBuilder<NonNullable<TOutput>, NonNullable<TInput>, NonNullable<TDbType>, true> {
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion for internal class mutation
    const builder = this._clone() as any;
    builder._primaryKey = true;
    builder._notNull = true; // Primary keys are automatically non-nullable
    builder._readOnly = true; // Primary keys are automatically read-only
    return builder;
  }

  /**
   * Mark this field as non-nullable.
   * Updates the type to exclude null/undefined.
   */
  notNull(): FieldBuilder<NonNullable<TOutput>, NonNullable<TInput>, NonNullable<TDbType>, TReadOnly> {
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion for internal class mutation
    const builder = this._clone() as any;
    builder._notNull = true;
    return builder;
  }

  /**
   * Mark this field as read-only.
   * Read-only fields are excluded from insert and update operations.
   */
  readOnly(): FieldBuilder<TOutput, TInput, TDbType, true> {
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion for internal class mutation
    const builder = this._clone() as any;
    builder._readOnly = true;
    return builder;
  }

  /**
   * Assign a FileMaker field ID (FMFID) to this field.
   * When useEntityIds is enabled, this ID will be used in API requests instead of the field name.
   */
  entityId(id: `FMFID:${string}`): FieldBuilder<TOutput, TInput, TDbType, TReadOnly> {
    const builder = this._clone();
    builder._entityId = id;
    return builder;
  }

  /**
   * Set a validator for the output (reading from database).
   * The output validator transforms/validates data coming FROM the database in list or get operations.
   *
   * @example
   * numberField().readValidator(z.coerce.boolean())
   * // FileMaker returns 0/1, you get true/false
   */
  readValidator<O, VInput = TDbType>(
    validator: StandardSchemaV1<VInput, O>,
  ): FieldBuilder<O, TInput, TDbType, TReadOnly> {
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion for internal class mutation
    const builder = this._clone() as any;
    builder._outputValidator = validator;
    return builder;
  }

  /**
   * Set a validator for the input (writing to database).
   * The input validator transforms/validates data going TO the database in insert, update, and filter operations.
   *
   * @example
   * numberField().writeValidator(z.boolean().transform(v => v ? 1 : 0))
   * // You pass true/false, FileMaker gets 1/0
   */
  writeValidator<I>(validator: StandardSchemaV1<I, TDbType>): FieldBuilder<TOutput, I, TDbType, TReadOnly> {
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion for internal class mutation
    const builder = this._clone() as any;
    builder._inputValidator = validator;
    return builder;
  }

  /**
   * Add a comment to this field for metadata purposes.
   * This helps future developers understand the purpose of the field.
   *
   * @example
   * textField().comment("Account name of the user who last modified each record")
   */
  comment(comment: string): FieldBuilder<TOutput, TInput, TDbType, TReadOnly> {
    const builder = this._clone();
    builder._comment = comment;
    return builder;
  }

  /**
   * Get the metadata configuration for this field.
   * @internal Used by fmTableOccurrence to extract field configuration
   */
  _getConfig() {
    return {
      fieldType: this._fieldType,
      primaryKey: this._primaryKey,
      notNull: this._notNull,
      readOnly: this._readOnly,
      entityId: this._entityId,
      outputValidator: this._outputValidator,
      inputValidator: this._inputValidator,
      comment: this._comment,
    };
  }

  /**
   * Clone this builder to allow immutable chaining.
   * @private
   */
  private _clone(): FieldBuilder<TOutput, TInput, TDbType, TReadOnly> {
    const builder = new FieldBuilder<TOutput, TInput, TDbType, TReadOnly>(this._fieldType);
    builder._primaryKey = this._primaryKey;
    builder._notNull = this._notNull;
    builder._readOnly = this._readOnly;
    builder._entityId = this._entityId;
    builder._outputValidator = this._outputValidator;
    builder._inputValidator = this._inputValidator;
    builder._comment = this._comment;
    return builder;
  }
}

/**
 * Create a text field (Edm.String in FileMaker OData).
 * By default, text fields are nullable.
 *
 * @example
 * textField()                    // string | null
 * textField().notNull()          // string
 * textField().entityId("FMFID:1") // with entity ID
 */
export function textField(): FieldBuilder<string | null, string | null, string | null, false> {
  return new FieldBuilder<string | null, string | null, string | null, false>("text");
}

type ListOutput<TItem, TAllowNull extends boolean> = TAllowNull extends true ? TItem[] | null : TItem[];
type ListInput<TItem, TAllowNull extends boolean> = TAllowNull extends true ? TItem[] | null : TItem[];

/**
 * Create a text-backed FileMaker return-delimited list field.
 * By default, null/empty input is normalized to an empty array (`allowNull: false`).
 *
 * @example
 * listField() // output: string[], input: string[]
 * listField({ allowNull: true }) // output/input: string[] | null
 * listField({ itemValidator: z.coerce.number().int() }) // output/input: number[]
 */
export function listField(): FieldBuilder<string[], string[], string | null, false>;
export function listField<TAllowNull extends boolean = false>(
  options: ListFieldOptions<string, TAllowNull>,
): FieldBuilder<ListOutput<string, TAllowNull>, ListInput<string, TAllowNull>, string | null, false>;
export function listField<TItem, TAllowNull extends boolean = false>(options: {
  itemValidator: StandardSchemaV1<unknown, TItem>;
  allowNull?: TAllowNull;
}): FieldBuilder<ListOutput<TItem, TAllowNull>, ListInput<TItem, TAllowNull>, string | null, false>;
export function listField<TItem = string, TAllowNull extends boolean = false>(
  options?: ListFieldOptions<TItem, TAllowNull>,
): FieldBuilder<ListOutput<TItem, TAllowNull>, ListInput<TItem, TAllowNull>, string | null, false> {
  const allowNull = options?.allowNull ?? false;
  const itemValidator = options?.itemValidator as StandardSchemaV1<unknown, TItem> | undefined;

  const readListSchema: StandardSchemaV1<string | null, ListOutput<TItem, TAllowNull>> = {
    "~standard": {
      version: 1,
      vendor: "proofkit",
      validate(input) {
        if (input === null || input === undefined || input === "") {
          return { value: (allowNull ? null : []) as ListOutput<TItem, TAllowNull> };
        }

        if (typeof input !== "string") {
          return { issues: [issue("Expected a FileMaker list string or null")] };
        }

        const items = splitFileMakerList(input);
        if (!itemValidator) {
          return { value: items as ListOutput<TItem, TAllowNull> };
        }

        const validatedItems = validateItemsWithSchema(items, itemValidator);
        if (validatedItems instanceof Promise) {
          return validatedItems.then((result) => {
            if ("issues" in result) {
              return result;
            }
            return { value: result.value as ListOutput<TItem, TAllowNull> };
          });
        }

        if ("issues" in validatedItems) {
          return validatedItems;
        }

        return { value: validatedItems.value as ListOutput<TItem, TAllowNull> };
      },
    },
  };

  const writeListSchema: StandardSchemaV1<ListInput<TItem, TAllowNull>, string | null> = {
    "~standard": {
      version: 1,
      vendor: "proofkit",
      validate(input) {
        if (input === null || input === undefined) {
          return { value: allowNull ? null : "" };
        }

        if (!Array.isArray(input)) {
          return { issues: [issue("Expected an array for FileMaker list field input")] };
        }

        if (!itemValidator) {
          const nonStringItem = input.find((item) => typeof item !== "string");
          if (nonStringItem !== undefined) {
            return { issues: [issue("Expected all list items to be strings without an itemValidator")] };
          }
          const serialized = input.map((item) => normalizeFileMakerNewlines(item)).join(FILEMAKER_LIST_DELIMITER);
          return { value: serialized };
        }

        const validateInputItems = input.map((item) => itemValidator["~standard"].validate(item));
        const hasAsyncValidation = validateInputItems.some((result) => result instanceof Promise);

        const serializeValidated = (
          results: Array<{ value: TItem } | { issues: readonly StandardSchemaV1.Issue[] }>,
        ): { value: string } | { issues: readonly StandardSchemaV1.Issue[] } => {
          const validatedItems: TItem[] = [];
          const issues: StandardSchemaV1.Issue[] = [];

          results.forEach((result, index) => {
            if ("issues" in result && result.issues) {
              for (const validationIssue of result.issues) {
                issues.push({
                  ...validationIssue,
                  path: validationIssue.path ? [index, ...validationIssue.path] : [index],
                });
              }
              return;
            }

            if ("value" in result) {
              validatedItems.push(result.value);
            }
          });

          if (issues.length > 0) {
            return { issues };
          }

          const serialized = validatedItems
            .map((item) => normalizeFileMakerNewlines(typeof item === "string" ? item : String(item)))
            .join(FILEMAKER_LIST_DELIMITER);
          return { value: serialized };
        };

        if (hasAsyncValidation) {
          return Promise.all(validateInputItems).then((results) => serializeValidated(results));
        }

        return serializeValidated(
          validateInputItems as Array<{ value: TItem } | { issues: readonly StandardSchemaV1.Issue[] }>,
        );
      },
    },
  };

  return textField().readValidator(readListSchema).writeValidator(writeListSchema);
}

/**
 * Create a number field (Edm.Decimal in FileMaker OData).
 * By default, number fields are nullable.
 *
 * @example
 * numberField()                   // number | null
 * numberField().notNull()         // number
 * numberField().outputValidator(z.coerce.boolean()) // transform to boolean on read
 */
export function numberField(): FieldBuilder<number | null, number | null, number | null, false> {
  return new FieldBuilder<number | null, number | null, number | null, false>("number");
}

/**
 * Create a date field (Edm.Date in FileMaker OData).
 * By default, date fields are nullable and represented as ISO date strings (YYYY-MM-DD),
 * while accepting either ISO strings or Date objects as input.
 *
 * @example
 * dateField()         // output: string | null (ISO date format), input: string | Date | null
 * dateField().notNull() // string
 */
export function dateField(): FieldBuilder<string | null, string | Date | null, string | null, false> {
  return new FieldBuilder<string | null, string | Date | null, string | null, false>("date");
}

/**
 * Create a time field (Edm.TimeOfDay in FileMaker OData).
 * By default, time fields are nullable and represented as ISO time strings (HH:mm:ss),
 * while accepting either ISO strings or Date objects as input.
 *
 * @example
 * timeField()         // output: string | null (ISO time format), input: string | Date | null
 * timeField().notNull() // string
 */
export function timeField(): FieldBuilder<string | null, string | Date | null, string | null, false> {
  return new FieldBuilder<string | null, string | Date | null, string | null, false>("time");
}

/**
 * Create a timestamp field (Edm.DateTimeOffset in FileMaker OData).
 * By default, timestamp fields are nullable and represented as ISO 8601 strings,
 * while accepting either ISO strings or Date objects as input.
 *
 * @example
 * timestampField()         // output: string | null (ISO 8601 format), input: string | Date | null
 * timestampField().notNull() // string
 * timestampField().readOnly() // typical for CreationTimestamp
 */
export function timestampField(): FieldBuilder<string | null, string | Date | null, string | null, false> {
  return new FieldBuilder<string | null, string | Date | null, string | null, false>("timestamp");
}

/**
 * Create a container field (Edm.Stream in FileMaker OData).
 * Container fields store binary data and are represented as base64 strings in the API.
 * By default, container fields are nullable.
 *
 * Note: Container fields cannot be selected via .select() - they can only be accessed
 * via .getSingleField() due to FileMaker OData API limitations.
 *
 * @example
 * containerField()         // string | null (base64 encoded)
 * containerField().notNull() // string
 */
export function containerField(): FieldBuilder<string | null, string | null, ContainerDbType | null, false> {
  return new FieldBuilder<string | null, string | null, ContainerDbType | null, false>("container");
}

/**
 * Create a calculated field (read-only field computed by FileMaker).
 * Calculated fields are automatically marked as read-only.
 *
 * @example
 * calcField()         // string | null
 * calcField().notNull() // string
 */
export function calcField(): FieldBuilder<string | null, string | null, string | null, true> {
  const builder = new FieldBuilder<string | null, string | null, string | null, false>("calculated");
  return builder.readOnly();
}
