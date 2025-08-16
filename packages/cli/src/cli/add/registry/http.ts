import { createFetch, createSchema } from "@better-fetch/fetch";
import { templateMetadataSchema } from "@proofkit/registry";
import { z } from "zod/v4";

import { getRegistryUrl } from "~/helpers/shadcn-cli.js";

createSchema({
  "@get/meta/:name": {
    input: z.object({
      name: z.string(),
    }),
    output: templateMetadataSchema,
  },
  "@get/": {
    output: z.any(),
  },
});

export const registryFetch = createFetch({ baseURL: `${getRegistryUrl()}/r` });
