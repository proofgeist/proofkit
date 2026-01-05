// Import ONLY the config schema. Importing from the root entrypoint would
// pull in the node-only generator code (and its dependencies) in the browser.
export { typegenConfigSingle as configSchema } from "@proofkit/typegen/types";
