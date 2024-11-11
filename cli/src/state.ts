import { z } from "zod";

const schema = z
  .object({
    ci: z.boolean().default(false),
    debug: z.boolean().default(false),
    projectDir: z.string().default(process.cwd()),
    authType: z.enum(["clerk", "proofkit"]).optional(),
    emailProvider: z.enum(["plunk", "resend", "none"]).optional(),
  })
  .passthrough();

type ProgramState = z.infer<typeof schema>;
export let state: ProgramState = schema.parse({});

export function initProgramState(args: unknown) {
  const parsed = schema.safeParse(args);
  if (parsed.success) {
    state = { ...state, ...parsed.data };
  }
}
