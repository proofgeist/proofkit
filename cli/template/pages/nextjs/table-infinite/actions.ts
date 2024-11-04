"use server";

import { __CLIENT_NAME__ } from "@/config/schemas/__SOURCE_NAME__/client";
import { __TYPE_NAME__ } from "@/config/schemas/__SOURCE_NAME__/__SCHEMA_NAME__";
import { __ACTION_CLIENT__ } from "@/server/safe-action";
import { ListParams, Query } from "@proofgeist/fmdapi/dist/client-types.js";
import { z } from "zod";
import dayjs from "dayjs";

const limit = 50; // raise or lower this number depending on how your layout performs
export const fetchData = __ACTION_CLIENT__
  .schema(
    z.object({
      offset: z.number().catch(0),
      sorting: z.array(
        z.object({ id: z.string(), desc: z.boolean().default(false) })
      ),
      columnFilters: z.array(z.object({ id: z.string(), value: z.unknown() })),
    })
  )
  .action(async ({ parsedInput: { offset, sorting, columnFilters } }) => {
    const getOptions: ListParams<__TYPE_NAME__, any> & { query: Query<any>[] } = {
      limit,
      offset,
      query: [{ id: "*" }],
    };

    if (sorting.length > 0) {
      getOptions.sort = sorting.map(({ id, desc }) => ({
        fieldName: __FIRST_FIELD_NAME__ as keyof __TYPE_NAME__,
        sortOrder: desc ? "descend" : "ascend",
      }));
    }

    if (columnFilters.length > 0) {
      getOptions.query = columnFilters
        .map(({ id, value }) => {
          if (typeof value === "string") {
            return {
              [id]: value,
            };
          } else if (typeof value === "object" && value instanceof Date) {
            return {
              [id]: dayjs(value).format("YYYY+MM+DD"),
            };
          }
          return null;
        })
        .filter(Boolean) as Query<any>[];
    }

    const data = await __CLIENT_NAME__.find(getOptions);

    return {
      data: data.data,
      hasNextPage: data.dataInfo.foundCount > limit + offset,
      totalCount: data.dataInfo.foundCount,
    };
  });
