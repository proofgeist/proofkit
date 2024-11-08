import { z } from "zod";

export const emailVerificationSchema = z.object({
  code: z.string().length(8),
});
