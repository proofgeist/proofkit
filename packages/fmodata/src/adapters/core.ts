import type {
  ODataResponse,
  ODataEntityResponse,
  ODataMetadata,
  ODataTable,
  ODataRecord,
  QueryOptions,
  CreateRecordOptions,
  UpdateRecordOptions,
  DeleteRecordOptions,
  GetRecordsOptions,
  GetRecordOptions,
  GetRecordCountOptions,
  GetFieldValueOptions,
  NavigateRelatedOptions,
  CrossJoinOptions,
  UpdateRecordReferencesOptions,
  BatchOptions,
  CreateTableOptions,
  AddFieldsOptions,
  DeleteTableOptions,
  DeleteFieldOptions,
  RunScriptOptions,
  UploadContainerOptions,
} from "../client-types.js";

/**
 * Base request options common to all adapter methods
 */
export type BaseRequestOptions = {
  fetch?: RequestInit;
  timeout?: number;
};

/**
 * Adapter interface defining all OData operations
 * All adapters must implement this interface
 */
export interface Adapter {
  /**
   * Get list of tables in the database
   */
  getTables(options?: BaseRequestOptions): Promise<ODataResponse<ODataTable>>;

  /**
   * Get OData metadata ($metadata endpoint)
   */
  getMetadata(options?: BaseRequestOptions): Promise<ODataMetadata>;

  /**
   * Query records from a table with optional filters and query options
   */
  getRecords<T extends ODataRecord = ODataRecord>(
    table: string,
    options?: GetRecordsOptions,
  ): Promise<ODataResponse<T>>;

  /**
   * Get a single record by primary key
   */
  getRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    options?: GetRecordOptions,
  ): Promise<ODataEntityResponse<T>>;

  /**
   * Get the count of records matching a filter
   */
  getRecordCount(table: string, options?: GetRecordCountOptions): Promise<number>;

  /**
   * Get a specific field value from a record
   */
  getFieldValue(
    table: string,
    key: string | number,
    field: string,
    options?: GetFieldValueOptions,
  ): Promise<unknown>;

  /**
   * Create a new record in a table
   */
  createRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    options: CreateRecordOptions<T>,
  ): Promise<ODataEntityResponse<T>>;

  /**
   * Update an existing record by primary key
   */
  updateRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    options: UpdateRecordOptions<T>,
  ): Promise<ODataEntityResponse<T>>;

  /**
   * Delete a record by primary key
   */
  deleteRecord(table: string, key: string | number, options?: DeleteRecordOptions): Promise<void>;

  /**
   * Update record references (relationships)
   */
  updateRecordReferences<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    navigation: string,
    options: UpdateRecordReferencesOptions<T>,
  ): Promise<void>;

  /**
   * Navigate related records through a navigation property
   */
  navigateRelated<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    navigation: string,
    options?: NavigateRelatedOptions,
  ): Promise<ODataResponse<T>>;

  /**
   * Perform a cross-join query between multiple tables
   */
  crossJoin<T extends ODataRecord = ODataRecord>(
    tables: string[],
    options?: CrossJoinOptions,
  ): Promise<ODataResponse<T>>;

  /**
   * Execute a batch request with multiple operations
   */
  batchRequests(options: BatchOptions): Promise<unknown[]>;

  /**
   * Create a new table (schema modification)
   */
  createTable(options: CreateTableOptions): Promise<void>;

  /**
   * Add fields to an existing table (schema modification)
   */
  addFields(table: string, options: AddFieldsOptions): Promise<void>;

  /**
   * Delete a table (schema modification)
   */
  deleteTable(table: string, options?: DeleteTableOptions): Promise<void>;

  /**
   * Delete a field from a table (schema modification)
   */
  deleteField(table: string, field: string, options?: DeleteFieldOptions): Promise<void>;

  /**
   * Run a FileMaker script
   */
  runScript(table: string, options: RunScriptOptions): Promise<unknown>;

  /**
   * Upload container data to a container field (deferred, interface planned)
   */
  uploadContainer(
    table: string,
    key: string | number,
    field: string,
    options: UploadContainerOptions,
  ): Promise<void>;
}

