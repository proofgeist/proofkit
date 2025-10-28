import { type FFetchOptions } from "@fetchkit/ffetch";
import type { StandardSchemaV1 } from "@standard-schema/spec";

export type Auth = { username: string; password: string } | { apiKey: string };

export interface ExecutableBuilder<T> {
  execute(): Promise<Result<T>>;
  getRequestConfig(): { method: string; url: string; body?: any };

  /**
   * Convert this builder to a native Request object for batch processing.
   * @param baseUrl - The base URL for the OData service
   * @param options - Optional execution options (e.g., includeODataAnnotations)
   * @returns A native Request object
   */
  toRequest(baseUrl: string, options?: ExecuteOptions): Request;

  /**
   * Process a raw Response object into a typed Result.
   * This allows builders to apply their own validation and transformation logic.
   * @param response - The native Response object from the batch operation
   * @param options - Optional execution options (e.g., skipValidation, includeODataAnnotations)
   * @returns A typed Result with the builder's expected return type
   */
  processResponse(
    response: Response,
    options?: ExecuteOptions,
  ): Promise<Result<T>>;
}

export interface ExecutionContext {
  _makeRequest<T>(
    url: string,
    options?: RequestInit & FFetchOptions & { useEntityIds?: boolean },
  ): Promise<Result<T>>;
  _setUseEntityIds?(useEntityIds: boolean): void;
  _getUseEntityIds?(): boolean;
  _getBaseUrl?(): string;
}

export type InferSchemaType<Schema extends Record<string, StandardSchemaV1>> = {
  [K in keyof Schema]: Schema[K] extends StandardSchemaV1<any, infer Output>
    ? Output
    : never;
};

export type WithSystemFields<T> =
  T extends Record<string, any>
    ? T & {
        ROWID: number;
        ROWMODID: number;
      }
    : never;

// Helper type to exclude system fields from a union of keys
export type ExcludeSystemFields<T extends keyof any> = Exclude<
  T,
  "ROWID" | "ROWMODID"
>;

// Helper type to omit system fields from an object type
export type OmitSystemFields<T> = Omit<T, "ROWID" | "ROWMODID">;

// OData record metadata fields (present on each record)
export type ODataRecordMetadata = {
  "@id": string;
  "@editLink": string;
};

// OData response wrapper (top-level, internal use only)
export type ODataListResponse<T> = {
  "@context": string;
  value: (T & ODataRecordMetadata)[];
};

export type ODataSingleResponse<T> = T &
  ODataRecordMetadata & {
    "@context": string;
  };

// OData response for single field values
export type ODataFieldResponse<T> = {
  "@context": string;
  value: T;
};

// Result pattern for execute responses
export type Result<T, E = import("./errors").FMODataErrorType> =
  | { data: T; error: undefined }
  | { data: undefined; error: E };

// Make specific keys required, rest optional
export type MakeFieldsRequired<T, Keys extends keyof T> = Partial<T> &
  Required<Pick<T, Keys>>;

// Extract keys from schema where validator doesn't allow null/undefined (auto-required fields)
export type AutoRequiredKeys<Schema extends Record<string, StandardSchemaV1>> =
  {
    [K in keyof Schema]: Extract<
      StandardSchemaV1.InferOutput<Schema[K]>,
      null | undefined
    > extends never
      ? K
      : never;
  }[keyof Schema];

// Helper type to compute excluded fields (readOnly fields + idField)
export type ExcludedFields<
  IdField extends keyof any | undefined,
  ReadOnly extends readonly any[],
> = IdField extends keyof any ? IdField | ReadOnly[number] : ReadOnly[number];

// Helper type for InsertData computation
type ComputeInsertData<
  Schema extends Record<string, StandardSchemaV1>,
  IdField extends keyof Schema | undefined,
  Required extends readonly any[],
  ReadOnly extends readonly any[],
> = [Required[number]] extends [keyof InferSchemaType<Schema>]
  ? Required extends readonly (keyof InferSchemaType<Schema>)[]
    ? MakeFieldsRequired<
        Omit<InferSchemaType<Schema>, ExcludedFields<IdField, ReadOnly>>,
        Exclude<
          AutoRequiredKeys<Schema> | Required[number],
          ExcludedFields<IdField, ReadOnly>
        >
      >
    : MakeFieldsRequired<
        Omit<InferSchemaType<Schema>, ExcludedFields<IdField, ReadOnly>>,
        Exclude<AutoRequiredKeys<Schema>, ExcludedFields<IdField, ReadOnly>>
      >
  : MakeFieldsRequired<
      Omit<InferSchemaType<Schema>, ExcludedFields<IdField, ReadOnly>>,
      Exclude<AutoRequiredKeys<Schema>, ExcludedFields<IdField, ReadOnly>>
    >;

// Extract insert data type from BaseTable
// Auto-infers required fields from validator nullability + user-specified required fields
// Excludes readOnly fields and idField
export type InsertData<BT> = BT extends import("./client/base-table").BaseTable<
  any,
  any,
  any,
  any
>
  ? BT extends {
      schema: infer Schema;
      idField?: infer IdField;
      required?: infer Required;
      readOnly?: infer ReadOnly;
    }
    ? Schema extends Record<string, StandardSchemaV1>
      ? IdField extends keyof Schema | undefined
        ? Required extends readonly any[]
          ? ReadOnly extends readonly any[]
            ? ComputeInsertData<
                Schema,
                Extract<IdField, keyof Schema | undefined>,
                Required,
                ReadOnly
              >
            : Partial<Record<string, any>>
          : Partial<Record<string, any>>
        : Partial<Record<string, any>>
      : Partial<Record<string, any>>
    : Partial<Record<string, any>>
  : Partial<Record<string, any>>;

// Extract update data type from BaseTable
// All fields are optional for updates, excludes readOnly fields and idField
export type UpdateData<BT> = BT extends import("./client/base-table").BaseTable<
  any,
  any,
  any,
  any
>
  ? BT extends {
      schema: infer Schema;
      idField?: infer IdField;
      readOnly?: infer ReadOnly;
    }
    ? Schema extends Record<string, StandardSchemaV1>
      ? IdField extends keyof Schema | undefined
        ? ReadOnly extends readonly any[]
          ? Partial<
              Omit<
                InferSchemaType<Schema>,
                ExcludedFields<
                  Extract<IdField, keyof Schema | undefined>,
                  ReadOnly
                >
              >
            >
          : Partial<Record<string, any>>
        : Partial<Record<string, any>>
      : Partial<Record<string, any>>
    : Partial<Record<string, any>>
  : Partial<Record<string, any>>;

export type ExecuteOptions = {
  includeODataAnnotations?: boolean;
  skipValidation?: boolean;
  /**
   * Overrides the default behavior of the database to use entity IDs (rather than field names) in THIS REQUEST ONLY
   */
  useEntityIds?: boolean;
};

/**
 * Get the Accept header value based on includeODataAnnotations option
 * @param includeODataAnnotations - Whether to include OData annotations
 * @returns Accept header value
 */
export function getAcceptHeader(includeODataAnnotations?: boolean): string {
  return includeODataAnnotations === true
    ? "application/json"
    : "application/json;odata.metadata=none";
}

export type ConditionallyWithODataAnnotations<
  T,
  IncludeODataAnnotations extends boolean,
> = IncludeODataAnnotations extends true
  ? T & {
      "@id": string;
      "@editLink": string;
    }
  : T;

// Helper type to extract schema from a TableOccurrence
export type ExtractSchemaFromOccurrence<Occ> = Occ extends {
  baseTable: { schema: infer S };
}
  ? S extends Record<string, StandardSchemaV1>
    ? S
    : Record<string, StandardSchemaV1>
  : Record<string, StandardSchemaV1>;

export type GenericFieldMetadata = {
  $Nullable?: boolean;
  "@Index"?: boolean;
  "@Calculation"?: boolean;
  "@Summary"?: boolean;
  "@Global"?: boolean;
  "@Org.OData.Core.V1.Permissions"?: "Org.OData.Core.V1.Permission@Read";
};

export type StringFieldMetadata = GenericFieldMetadata & {
  $Type: "Edm.String";
  $DefaultValue?: "USER" | "USERNAME" | "CURRENT_USER";
  $MaxLength?: number;
};

export type DecimalFieldMetadata = GenericFieldMetadata & {
  $Type: "Edm.Decimal";
  "@AutoGenerated"?: boolean;
};

export type DateFieldMetadata = GenericFieldMetadata & {
  $Type: "Edm.Date";
  $DefaultValue?: "CURDATE" | "CURRENT_DATE";
};

export type TimeOfDayFieldMetadata = GenericFieldMetadata & {
  $Type: "Edm.TimeOfDay";
  $DefaultValue?: "CURTIME" | "CURRENT_TIME";
};

export type DateTimeOffsetFieldMetadata = GenericFieldMetadata & {
  $Type: "Edm.Date";
  $DefaultValue?: "CURTIMESTAMP" | "CURRENT_TIMESTAMP";
  "@VersionId"?: boolean;
};

export type StreamFieldMetadata = {
  $Type: "Edm.Stream";
  $Nullable?: boolean;
  "@EnclosedPath": string;
  "@ExternalOpenPath": string;
  "@ExternalSecurePath"?: string;
};

export type FieldMetadata =
  | StringFieldMetadata
  | DecimalFieldMetadata
  | DateFieldMetadata
  | TimeOfDayFieldMetadata
  | DateTimeOffsetFieldMetadata
  | StreamFieldMetadata;

export type EntityType = {
  $Kind: "EntityType";
  $Key: string[];
} & Record<string, FieldMetadata>;

export type EntitySet = {
  $Kind: "EntitySet";
  $Type: string;
};

export type Metadata = Record<string, EntityType | EntitySet>;
