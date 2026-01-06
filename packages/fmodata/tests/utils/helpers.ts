import { z } from "zod/v4";

export const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (err: unknown) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err instanceof Error ? err.message : String(err),
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });
