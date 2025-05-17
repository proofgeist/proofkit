import { typegenConfig } from "@proofkit/typegen/config";
import { z } from "zod";

export const GET = async () => {
  return Response.json(z.toJSONSchema(typegenConfig, { reused: "ref" }));
};
