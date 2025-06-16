import { typegenConfig } from "@proofkit/typegen/config";
import { z } from "zod/v4";

export const GET = async () => {
  return Response.json(z.toJSONSchema(typegenConfig, { reused: "ref" }));
};
