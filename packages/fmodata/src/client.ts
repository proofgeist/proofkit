import type { Adapter } from "./adapters/core.js";
import type {
  ODataRecord,
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
  RequestOptions,
} from "./client-types.js";
import type {
  ODataResponse,
  ODataEntityResponse,
  ODataMetadata,
  ODataTable,
} from "./client-types.js";

/**
 * Options for creating an OData client
 */
export type ODataClientOptions<Adp extends Adapter = Adapter> = {
  adapter: Adp;
};

/**
 * OData API client factory function
 * Similar to DataApi in fmdapi, but for OData endpoints
 */
export function ODataApi<Adp extends Adapter = Adapter>(
  options: ODataClientOptions<Adp>,
) {
  const adapter = options.adapter;

  /**
   * Get list of tables in the database
   */
  async function getTables(
    opts?: RequestOptions,
  ): Promise<ODataResponse<ODataTable>> {
    return adapter.getTables(opts);
  }

  /**
   * Get OData metadata ($metadata endpoint)
   */
  async function getMetadata(opts?: RequestOptions): Promise<ODataMetadata> {
    return adapter.getMetadata(opts);
  }

  /**
   * Query records from a table with optional filters and query options
   */
  async function getRecords<T extends ODataRecord = ODataRecord>(
    table: string,
    options?: GetRecordsOptions,
  ): Promise<ODataResponse<T>> {
    return adapter.getRecords<T>(table, options);
  }

  /**
   * Get a single record by primary key
   */
  async function getRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    options?: GetRecordOptions,
  ): Promise<ODataEntityResponse<T>> {
    return adapter.getRecord<T>(table, key, options);
  }

  /**
   * Get the count of records matching a filter
   */
  async function getRecordCount(
    table: string,
    options?: GetRecordCountOptions,
  ): Promise<number> {
    return adapter.getRecordCount(table, options);
  }

  /**
   * Get a specific field value from a record
   */
  async function getFieldValue(
    table: string,
    key: string | number,
    field: string,
    options?: GetFieldValueOptions,
  ): Promise<unknown> {
    return adapter.getFieldValue(table, key, field, options);
  }

  /**
   * Create a new record in a table
   */
  async function createRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    options: CreateRecordOptions<T>,
  ): Promise<ODataEntityResponse<T>> {
    return adapter.createRecord<T>(table, options);
  }

  /**
   * Update an existing record by primary key
   */
  async function updateRecord<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    options: UpdateRecordOptions<T>,
  ): Promise<ODataEntityResponse<T>> {
    return adapter.updateRecord<T>(table, key, options);
  }

  /**
   * Delete a record by primary key
   */
  async function deleteRecord(
    table: string,
    key: string | number,
    options?: DeleteRecordOptions,
  ): Promise<void> {
    return adapter.deleteRecord(table, key, options);
  }

  /**
   * Update record references (relationships)
   */
  async function updateRecordReferences<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    navigation: string,
    options: UpdateRecordReferencesOptions<T>,
  ): Promise<void> {
    return adapter.updateRecordReferences<T>(table, key, navigation, options);
  }

  /**
   * Navigate related records through a navigation property
   */
  async function navigateRelated<T extends ODataRecord = ODataRecord>(
    table: string,
    key: string | number,
    navigation: string,
    options?: NavigateRelatedOptions,
  ): Promise<ODataResponse<T>> {
    return adapter.navigateRelated<T>(table, key, navigation, options);
  }

  /**
   * Perform a cross-join query between multiple tables
   */
  async function crossJoin<T extends ODataRecord = ODataRecord>(
    tables: string[],
    options?: CrossJoinOptions,
  ): Promise<ODataResponse<T>> {
    return adapter.crossJoin<T>(tables, options);
  }

  /**
   * Execute a batch request with multiple operations
   */
  async function batchRequests(options: BatchOptions): Promise<unknown[]> {
    return adapter.batchRequests(options);
  }

  /**
   * Create a new table (schema modification)
   */
  async function createTable(options: CreateTableOptions): Promise<void> {
    return adapter.createTable(options);
  }

  /**
   * Add fields to an existing table (schema modification)
   */
  async function addFields(
    table: string,
    options: AddFieldsOptions,
  ): Promise<void> {
    return adapter.addFields(table, options);
  }

  /**
   * Delete a table (schema modification)
   */
  async function deleteTable(
    table: string,
    options?: DeleteTableOptions,
  ): Promise<void> {
    return adapter.deleteTable(table, options);
  }

  /**
   * Delete a field from a table (schema modification)
   */
  async function deleteField(
    table: string,
    field: string,
    options?: DeleteFieldOptions,
  ): Promise<void> {
    return adapter.deleteField(table, field, options);
  }

  /**
   * Run a FileMaker script
   */
  async function runScript(
    table: string,
    options: RunScriptOptions,
  ): Promise<unknown> {
    return adapter.runScript(table, options);
  }

  /**
   * Upload container data to a container field (deferred)
   */
  async function uploadContainer(
    table: string,
    key: string | number,
    field: string,
    options: UploadContainerOptions,
  ): Promise<void> {
    return adapter.uploadContainer(table, key, field, options);
  }

  return {
    getTables,
    getMetadata,
    getRecords,
    getRecord,
    getRecordCount,
    getFieldValue,
    createRecord,
    updateRecord,
    deleteRecord,
    updateRecordReferences,
    navigateRelated,
    crossJoin,
    batchRequests,
    createTable,
    addFields,
    deleteTable,
    deleteField,
    runScript,
    uploadContainer,
  };
}

// Export the return type of ODataApi factory function
// Using a type helper since ODataApi is generic
type ODataApiInstance = ReturnType<
  typeof ODataApi<import("./adapters/core.js").Adapter>
>;
export type ODataApiClient = ODataApiInstance;

export default ODataApi;

