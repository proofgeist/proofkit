import { typegenConfigForValidation } from "@proofkit/typegen/src/types.ts";
import { z } from "zod/v4";

export const GET = () => {
  return Response.json(
    z.toJSONSchema(typegenConfigForValidation, {
      reused: "ref",
      target: "draft-7",
    }),
  );
};
