import { FileMakerError } from "./client-types.js";
import { DataApi } from "./client.js";

export { DataApi, FileMakerError };
export * from "./utils.js";
export * as clientTypes from "./client-types.js";

export { FetchAdapter } from "./adapters/fetch.js";
export { OttoAdapter, type OttoAPIKey } from "./adapters/otto.js";

export default DataApi;
