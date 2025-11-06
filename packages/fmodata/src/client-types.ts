/**
 * FileMaker OData API Client Types
 */

/**
 * OData response wrapper containing an array of entities
 */
export type ODataResponse<T> = {
  value: T[];
  "@odata.context"?: string;
  "@odata.count"?: number;
};

/**
 * OData single entity response (for single record operations)
 */
export type ODataEntityResponse<T> = T & {
  "@odata.context"?: string;
};

/**
 * OData metadata response
 */
export type ODataMetadata = {
  "@odata.context": string;
  value?: Array<{
    name: string;
    kind: string;
    url: string;
  }>;
  $Version?: string;
  [key: string]: unknown;
};

/**
 * OData table information
 */
export type ODataTable = {
  name: string;
  kind?: string;
  url?: string;
};

/**
 * OData record (entity) - generic record structure
 */
export type ODataRecord = Record<string, unknown>;

/**
 * OData query options for filtering, selecting, sorting, etc.
 */
export type QueryOptions = {
  /** OData filter expression string */
  $filter?: string;
  /** Comma-separated list of fields to select */
  $select?: string;
  /** Navigation properties to expand */
  $expand?: string;
  /** Order by clause */
  $orderby?: string;
  /** Maximum number of records to return */
  $top?: number;
  /** Number of records to skip */
  $skip?: number;
  /** Include total count in response */
  $count?: boolean;
  /** Response format: json, atom, or xml */
  $format?: "json" | "atom" | "xml";
  /** For JSON: return Int64/Decimal as strings */
  IEEE754Compatible?: boolean;
};

/**
 * Request options for HTTP calls
 */
export type RequestOptions = {
  fetch?: RequestInit;
  timeout?: number;
};

/**
 * Options for creating a record
 */
export type CreateRecordOptions<T extends ODataRecord = ODataRecord> = {
  data: T;
} & RequestOptions;

/**
 * Options for updating a record
 */
export type UpdateRecordOptions<T extends ODataRecord = ODataRecord> = {
  data: Partial<T>;
} & RequestOptions;

/**
 * Options for deleting a record
 */
export type DeleteRecordOptions = RequestOptions;

/**
 * Options for getting records with query options
 */
export type GetRecordsOptions = QueryOptions & RequestOptions;

/**
 * Options for getting a single record
 */
export type GetRecordOptions = QueryOptions & RequestOptions;

/**
 * Options for getting record count
 */
export type GetRecordCountOptions = {
  $filter?: string;
} & RequestOptions;

/**
 * Options for getting a field value
 */
export type GetFieldValueOptions = RequestOptions;

/**
 * Options for navigating related records
 */
export type NavigateRelatedOptions = QueryOptions & RequestOptions;

/**
 * Options for cross-join query
 */
export type CrossJoinOptions = QueryOptions & RequestOptions;

/**
 * Options for updating record references (relationships)
 */
export type UpdateRecordReferencesOptions<T extends ODataRecord = ODataRecord> = {
  data: T | T[];
  method?: "POST" | "PATCH" | "DELETE";
} & RequestOptions;

/**
 * Options for batch requests
 */
export type BatchRequest = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export type BatchOptions = {
  requests: BatchRequest[];
} & RequestOptions;

/**
 * Valid field types for FileMaker_Tables schema modifications
 * These are the only types accepted by the FileMaker OData API
 */
export type FileMakerFieldType =
  | "NUMERIC"
  | "DECIMAL"
  | "INT"
  | "DATE"
  | "TIME"
  | "TIMESTAMP"
  | "VARCHAR"
  | "CHARACTER VARYING"
  | "BLOB"
  | "VARBINARY"
  | "LONGVARBINARY"
  | "BINARY VARYING";

/**
 * Array of valid field types (for runtime validation)
 */
export const VALID_FIELD_TYPES: readonly FileMakerFieldType[] = [
  "NUMERIC",
  "DECIMAL",
  "INT",
  "DATE",
  "TIME",
  "TIMESTAMP",
  "VARCHAR",
  "CHARACTER VARYING",
  "BLOB",
  "VARBINARY",
  "LONGVARBINARY",
  "BINARY VARYING",
] as const;

/**
 * Field definition for schema modifications
 */
export type FieldDefinition = {
  name: string;
  type: FileMakerFieldType;
  nullable?: boolean;
  defaultValue?: unknown;
};

/**
 * Options for creating a table (schema modification)
 */
export type CreateTableOptions = {
  tableName: string;
  fields: Array<FieldDefinition>;
} & RequestOptions;

/**
 * Options for adding fields to a table
 */
export type AddFieldsOptions = {
  fields: Array<FieldDefinition>;
} & RequestOptions;

/**
 * Options for deleting a table
 */
export type DeleteTableOptions = RequestOptions;

/**
 * Options for deleting a field
 */
export type DeleteFieldOptions = RequestOptions;

/**
 * Options for running a script
 */
export type RunScriptOptions = {
  script: string;
  param?: string;
} & RequestOptions;

/**
 * Options for uploading container data (deferred)
 */
export type UploadContainerOptions = {
  data: string | Blob;
  format?: "base64" | "binary";
} & RequestOptions;

/**
 * Error response from FileMaker OData API
 */
export type ODataError = {
  error: {
    code: string;
    message: string;
    target?: string;
    details?: Array<{
      code: string;
      message: string;
      target?: string;
    }>;
  };
};

/**
 * Custom error class for FileMaker OData errors
 */
export class FileMakerODataError extends Error {
  public readonly code: string;
  public readonly target?: string;
  public readonly details?: ODataError["error"]["details"];

  public constructor(code: string, message: string, target?: string, details?: ODataError["error"]["details"]) {
    super(message);
    this.name = "FileMakerODataError";
    this.code = code;
    this.target = target;
    this.details = details;
  }

  /**
   * Create an error from an OData error response
   */
  public static fromODataError(error: ODataError): FileMakerODataError {
    const { code, message, target, details } = error.error;
    return new FileMakerODataError(code, message, target, details);
  }
}

