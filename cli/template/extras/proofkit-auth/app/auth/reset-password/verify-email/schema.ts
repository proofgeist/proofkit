import { z } from "zod";

export const verifyEmailSchema = z.object({
  code: z.string().length(8),
});
