import { createFetch, createSchema } from "@better-fetch/fetch";
import {
  registryIndexSchema,
  templateMetadataSchema,
} from "@proofkit/registry";
import { z } from "zod/v4";

import { getRegistryUrl } from "~/helpers/shadcn-cli.js";

const schema = createSchema({
  "@get/meta/:name": {
    output: templateMetadataSchema,
  },
  "@get/": {
    output: registryIndexSchema,
  },
});

export const registryFetch = createFetch({
  baseURL: `${getRegistryUrl()}/r`,
  schema,
});
