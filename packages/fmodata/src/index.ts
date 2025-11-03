import { ODataApi } from "./client.js";
import { FileMakerODataError } from "./client-types.js";
import { FetchAdapter } from "./adapters/fetch.js";
import {
  OttoAdapter,
  type OttoAPIKey,
  type Otto3APIKey,
  type OttoFMSAPIKey,
  isOttoAPIKey,
  isOtto3APIKey,
  isOttoFMSAPIKey,
  isOttoAuth,
} from "./adapters/otto.js";

export { ODataApi };
export type { ODataApiClient } from "./client.js";
export { FetchAdapter } from "./adapters/fetch.js";
export {
  OttoAdapter,
  type OttoAPIKey,
  type Otto3APIKey,
  type OttoFMSAPIKey,
  isOttoAPIKey,
  isOtto3APIKey,
  isOttoFMSAPIKey,
  isOttoAuth,
} from "./adapters/otto.js";
export * from "./client-types.js";
export * from "./adapters/core.js";
export * from "./utils.js";

export default ODataApi;

