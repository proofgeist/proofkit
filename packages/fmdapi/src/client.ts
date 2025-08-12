import type { Adapter, ExecuteScriptOptions } from "./adapters/core.js";
import type {
  CreateParams,
  CreateResponse,
  DeleteParams,
  DeleteResponse,
  FMRecord,
  FieldData,
  GenericPortalData,
  GetParams,
  GetResponse,
  GetResponseOne,
  ListParams,
  PortalsWithIds,
  Query,
  UpdateParams,
  UpdateResponse,
} from "./client-types.js";
import { FileMakerError } from "./index.js";
import type { StandardSchemaV1 } from "@standard-schema/spec";

function asNumber(input: string | number): number {
  return typeof input === "string" ? parseInt(input) : input;
}

export type ClientObjectProps = {
  /**
   * The layout to use by default for all requests. Can be overrridden on each request.
   */
  layout: string;
  schema?: {
    /**
     * The schema for the field data.
     */
    fieldData: StandardSchemaV1<FieldData>;
    /**
     * The schema for the portal data.
     */
    portalData?: Record<string, StandardSchemaV1<FieldData>>;
  };
};

type FetchOptions = {
  fetch?: RequestInit;
};

function DataApi<
  Fd extends FieldData = FieldData,
  Pd extends GenericPortalData = GenericPortalData,
  Opts extends ClientObjectProps = ClientObjectProps,
  Adp extends Adapter = Adapter,
>(options: Opts & { adapter: Adp }) {
  type InferredFieldData = Opts["schema"] extends object
    ? StandardSchemaV1.InferOutput<Opts["schema"]["fieldData"]>
    : Fd;
  type InferredPortalData = Opts["schema"] extends object
    ? Opts["schema"]["portalData"] extends object
      ? {
          [K in keyof Opts["schema"]["portalData"]]: StandardSchemaV1.InferOutput<
            Opts["schema"]["portalData"][K]
          >;
        }
      : Pd
    : Pd;

  if ("zodValidators" in options) {
    throw new Error(
      "zodValidators is no longer supported. Use schema instead, or re-run the typegen command",
    );
  }

  const schema = options.schema;
  const layout = options.layout;
  const {
    create,
    delete: _adapterDelete,
    find,
    get,
    list,
    update,
    layoutMetadata,
    containerUpload,
    executeScript,
    ...otherMethods
  } = options.adapter;

  type CreateArgs<
    T extends InferredFieldData = InferredFieldData,
    U extends InferredPortalData = InferredPortalData,
  > = CreateParams<U> & {
    fieldData: Partial<T>;
  };
  type GetArgs<U extends InferredPortalData = InferredPortalData> =
    GetParams<U> & {
      recordId: number | string;
    };
  type UpdateArgs<
    T extends InferredFieldData = InferredFieldData,
    U extends InferredPortalData = InferredPortalData,
  > = UpdateParams<U> & {
    fieldData: Partial<T>;
    recordId: number | string;
  };
  type ContainerUploadArgs<T extends InferredFieldData = InferredFieldData> = {
    containerFieldName: keyof T;
    containerFieldRepetition?: string | number;
    file: Blob;
    recordId: number | string;
    modId?: number;
    timeout?: number;
  };
  type DeleteArgs = DeleteParams & {
    recordId: number | string;
  };
  type IgnoreEmptyResult = {
    /**
     * If true, a find that returns no results will retun an empty array instead of throwing an error.
     * @default false
     */
    ignoreEmptyResult?: boolean;
  };
  type FindArgs<
    T extends FieldData = InferredFieldData,
    U extends InferredPortalData = InferredPortalData,
  > = ListParams<T, U> & {
    query: Query<T> | Array<Query<T>>;
    timeout?: number;
  };

  type ExecuteScriptArgs = Omit<ExecuteScriptOptions, "layout">;

  /**
   * List all records from a given layout, no find criteria applied.
   */
  async function _list(): Promise<
    GetResponse<InferredFieldData, InferredPortalData>
  >;
  async function _list(
    args: ListParams<InferredFieldData, InferredPortalData> & FetchOptions,
  ): Promise<GetResponse<InferredFieldData, InferredPortalData>>;
  async function _list(
    args?: ListParams<InferredFieldData, InferredPortalData> & FetchOptions,
  ): Promise<GetResponse<InferredFieldData, InferredPortalData>> {
    const { fetch, timeout, ...params } = args ?? {};

    // rename and refactor limit, offset, and sort keys for this request
    if ("limit" in params && params.limit !== undefined)
      delete Object.assign(params, { _limit: params.limit })["limit"];
    if ("offset" in params && params.offset !== undefined) {
      if (params.offset <= 1) delete params.offset;
      else delete Object.assign(params, { _offset: params.offset })["offset"];
    }
    if ("sort" in params && params.sort !== undefined)
      delete Object.assign(params, {
        _sort: Array.isArray(params.sort) ? params.sort : [params.sort],
      })["sort"];

    const result = await list({
      layout,
      data: params,
      fetch,
      timeout,
    });

    if (result.dataInfo.foundCount > result.dataInfo.returnedCount) {
      // more records found than returned
      if (args?.limit === undefined && args?.offset === undefined) {
        // and the user didn't specify a limit or offset, so we should warn them
        console.warn(
          `🚨 @proofkit/fmdapi: Loaded only ${result.dataInfo.returnedCount} of the ${result.dataInfo.foundCount} records from your "${layout}" layout. Use the "listAll" method to automatically paginate through all records, or specify a "limit" and "offset" to handle pagination yourself.`,
        );
      }
    }

    return await runSchemaValidationAndTransform(
      schema,
      result as GetResponse<InferredFieldData, InferredPortalData>,
    );
  }

  /**
   * Paginate through all records from a given layout, no find criteria applied.
   * ⚠️ WARNING: Use this method with caution, as it can be slow with large datasets
   */
  async function listAll<
    T extends FieldData = InferredFieldData,
    U extends InferredPortalData = InferredPortalData,
  >(): Promise<FMRecord<T, U>[]>;
  async function listAll<
    T extends FieldData = InferredFieldData,
    U extends InferredPortalData = InferredPortalData,
  >(args: ListParams<T, U> & FetchOptions): Promise<FMRecord<T, U>[]>;
  async function listAll<
    T extends FieldData = InferredFieldData,
    U extends InferredPortalData = InferredPortalData,
  >(args?: ListParams<T, U> & FetchOptions): Promise<FMRecord<T, U>[]> {
    let runningData: GetResponse<T, U>["data"] = [];
    const limit = args?.limit ?? 100;
    let offset = args?.offset ?? 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = (await _list({
        ...args,
        offset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)) as unknown as GetResponse<T, U>;
      runningData = [...runningData, ...data.data];
      if (runningData.length >= data.dataInfo.foundCount) break;
      offset = offset + limit;
    }
    return runningData;
  }

  /**
   * Create a new record in a given layout
   */
  async function _create<
    T extends InferredFieldData = InferredFieldData,
    U extends InferredPortalData = InferredPortalData,
  >(args: CreateArgs<T, U> & FetchOptions): Promise<CreateResponse> {
    const { fetch, timeout, ...params } = args ?? {};
    return await create({
      layout,
      data: params,
      fetch,
      timeout,
    });
  }

  /**
   * Get a single record by Internal RecordId
   */
  async function _get(
    args: GetArgs<InferredPortalData> & FetchOptions,
  ): Promise<GetResponse<InferredFieldData, InferredPortalData>> {
    args.recordId = asNumber(args.recordId);
    const { recordId, fetch, timeout, ...params } = args;

    const result = await get({
      layout,
      data: { ...params, recordId },
      fetch,
      timeout,
    });
    return await runSchemaValidationAndTransform(
      schema,
      result as GetResponse<InferredFieldData, InferredPortalData>,
    );
  }

  /**
   * Update a single record by internal RecordId
   */
  async function _update(
    args: UpdateArgs<InferredFieldData, InferredPortalData> & FetchOptions,
  ): Promise<UpdateResponse> {
    args.recordId = asNumber(args.recordId);
    const { recordId, fetch, timeout, ...params } = args;
    return await update({
      layout,
      data: { ...params, recordId },
      fetch,
      timeout,
    });
  }

  /**
   * Delete a single record by internal RecordId
   */
  async function deleteRecord(
    args: DeleteArgs & FetchOptions,
  ): Promise<DeleteResponse> {
    args.recordId = asNumber(args.recordId);
    const { recordId, fetch, timeout, ...params } = args;

    return _adapterDelete({
      layout,
      data: { ...params, recordId },
      fetch,
      timeout,
    });
  }

  /**
   * Find records in a given layout
   */
  async function _find(
    args: FindArgs<InferredFieldData, InferredPortalData> &
      IgnoreEmptyResult &
      FetchOptions,
  ): Promise<GetResponse<InferredFieldData, InferredPortalData>> {
    const {
      query: queryInput,
      ignoreEmptyResult = false,
      timeout,
      fetch,
      ...params
    } = args;
    const query = !Array.isArray(queryInput) ? [queryInput] : queryInput;

    // rename and refactor limit, offset, and sort keys for this request
    if ("offset" in params && params.offset !== undefined) {
      if (params.offset <= 1) delete params.offset;
    }
    if ("dateformats" in params && params.dateformats !== undefined) {
      // reassign dateformats to match FileMaker's expected values
      // @ts-expect-error FM wants a string, so this is fine
      params.dateformats = (
        params.dateformats === "US"
          ? 0
          : params.dateformats === "file_locale"
            ? 1
            : params.dateformats === "ISO8601"
              ? 2
              : 0
      ).toString();
    }
    const result = (await find({
      data: { ...params, query },
      layout,
      fetch,
      timeout,
    }).catch((e: unknown) => {
      if (ignoreEmptyResult && e instanceof FileMakerError && e.code === "401")
        return { data: [], dataInfo: { foundCount: 0, returnedCount: 0 } };
      throw e;
    })) as GetResponse<InferredFieldData, InferredPortalData>;

    if (result.dataInfo.foundCount > result.dataInfo.returnedCount) {
      // more records found than returned
      if (args?.limit === undefined && args?.offset === undefined) {
        console.warn(
          `🚨 @proofkit/fmdapi: Loaded only ${result.dataInfo.returnedCount} of the ${result.dataInfo.foundCount} records from your "${layout}" layout. Use the "findAll" method to automatically paginate through all records, or specify a "limit" and "offset" to handle pagination yourself.`,
        );
      }
    }

    return await runSchemaValidationAndTransform(schema, result);
  }

  /**
   * Helper method for `find`. Will only return the first result or throw error if there is more than 1 result.
   */
  async function findOne(
    args: FindArgs<InferredFieldData, InferredPortalData> & FetchOptions,
  ): Promise<GetResponseOne<InferredFieldData, InferredPortalData>> {
    const result = await _find(args);
    if (result.data.length !== 1)
      throw new Error(
        `${result.data.length} records found; expecting exactly 1`,
      );
    const transformedResult = await runSchemaValidationAndTransform(
      schema,
      result,
    );
    if (!transformedResult.data[0]) throw new Error("No data found");
    return { ...transformedResult, data: transformedResult.data[0] };
  }

  /**
   * Helper method for `find`. Will only return the first result instead of an array.
   */
  async function findFirst(
    args: FindArgs<InferredFieldData, InferredPortalData> &
      IgnoreEmptyResult &
      FetchOptions,
  ): Promise<GetResponseOne<InferredFieldData, InferredPortalData>> {
    const result = await _find(args);
    const transformedResult = await runSchemaValidationAndTransform(
      schema,
      result,
    );

    if (!transformedResult.data[0]) throw new Error("No data found");
    return { ...transformedResult, data: transformedResult.data[0] };
  }

  /**
   * Helper method for `find`. Will return the first result or null if no results are found.
   */
  async function maybeFindFirst(
    args: FindArgs<InferredFieldData, InferredPortalData> &
      IgnoreEmptyResult &
      FetchOptions,
  ): Promise<GetResponseOne<InferredFieldData, InferredPortalData> | null> {
    const result = await _find({ ...args, ignoreEmptyResult: true });
    const transformedResult = await runSchemaValidationAndTransform(
      schema,
      result,
    );
    if (!transformedResult.data[0]) return null;
    return { ...transformedResult, data: transformedResult.data[0] };
  }

  /**
   * Helper method for `find` to page through all found results.
   * ⚠️ WARNING: Use with caution as this can be a slow operation with large datasets
   */
  async function findAll(
    args: FindArgs<InferredFieldData, InferredPortalData> & FetchOptions,
  ): Promise<FMRecord<InferredFieldData, InferredPortalData>[]> {
    let runningData: GetResponse<
      InferredFieldData,
      InferredPortalData
    >["data"] = [];
    const limit = args.limit ?? 100;
    let offset = args.offset ?? 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await _find({
        ...args,
        offset,
        ignoreEmptyResult: true,
      });
      runningData = [...runningData, ...data.data];
      if (
        runningData.length === 0 ||
        runningData.length >= data.dataInfo.foundCount
      )
        break;
      offset = offset + limit;
    }
    return runningData;
  }

  async function _layoutMetadata(args?: { timeout?: number } & FetchOptions) {
    const { ...restArgs } = args ?? {};
    // Explicitly define the type for params based on FetchOptions
    const params: FetchOptions & { timeout?: number } = restArgs;

    return await layoutMetadata({
      layout,
      fetch: params.fetch, // Now should correctly resolve to undefined if not present
      timeout: params.timeout, // Now should correctly resolve to undefined if not present
    });
  }

  async function _containerUpload<
    T extends InferredFieldData = InferredFieldData,
  >(args: ContainerUploadArgs<T> & FetchOptions) {
    const { ...params } = args;
    return await containerUpload({
      layout,
      data: {
        ...params,
        containerFieldName: params.containerFieldName as string,
        repetition: params.containerFieldRepetition,
      },
      fetch: params.fetch,
      timeout: params.timeout,
    });
  }

  async function runSchemaValidationAndTransform(
    schema: ClientObjectProps["schema"],
    result: GetResponse<InferredFieldData, InferredPortalData>,
  ): Promise<GetResponse<InferredFieldData, InferredPortalData>> {
    const fieldDataIssues: StandardSchemaV1.Issue[] = [];
    const portalDataIssues: StandardSchemaV1.Issue[] = [];

    if (!schema) return result;
    const transformedData: FMRecord<InferredFieldData, InferredPortalData>[] =
      [];
    for (const record of result.data) {
      let fieldResult = schema.fieldData["~standard"].validate(
        record.fieldData,
      );
      if (fieldResult instanceof Promise) fieldResult = await fieldResult;
      if ("value" in fieldResult) {
        record.fieldData = fieldResult.value as InferredFieldData;
      } else {
        fieldDataIssues.push(...fieldResult.issues);
      }

      if (schema.portalData) {
        for (const [portalName, portalRecords] of Object.entries(
          record.portalData,
        )) {
          const validatedPortalRecords: PortalsWithIds<GenericPortalData>[] =
            [];
          for (const portalRecord of portalRecords) {
            let portalResult =
              schema.portalData[portalName]?.["~standard"].validate(
                portalRecord,
              );
            if (portalResult instanceof Promise)
              portalResult = await portalResult;
            if (portalResult && "value" in portalResult) {
              validatedPortalRecords.push({
                ...portalResult.value,
                recordId: portalRecord.recordId,
                modId: portalRecord.modId,
              });
            } else {
              portalDataIssues.push(...(portalResult?.issues ?? []));
            }
          }
          // @ts-expect-error We know portalName is a valid key, but can't figure out the right assertions
          record.portalData[portalName] = validatedPortalRecords;
        }
      }

      transformedData.push(record);
    }
    result.data = transformedData;

    if (fieldDataIssues.length > 0 || portalDataIssues.length > 0) {
      console.error(
        `🚨 @proofkit/fmdapi: Validation issues for layout "${layout}". Run the typegen command again to generate the latest field definitions from your layout.`,
        {
          fieldDataIssues,
          portalDataIssues,
        },
      );
      throw new Error("Schema validation issues");
    }

    return result;
  }

  async function _executeScript(args: ExecuteScriptArgs & FetchOptions) {
    return await executeScript({
      ...args,
      layout,
    });
  }

  return {
    ...otherMethods,
    layout: options.layout as Opts["layout"],
    list: _list,
    listAll,
    create: _create,
    get: _get,
    update: _update,
    delete: deleteRecord,
    find: _find,
    findOne,
    findFirst,
    maybeFindFirst,
    findAll,
    layoutMetadata: _layoutMetadata,
    containerUpload: _containerUpload,
    executeScript: _executeScript,
  };
}

export default DataApi;
export { DataApi };
