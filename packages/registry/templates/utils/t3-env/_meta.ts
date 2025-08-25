import { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata = {
  category: "utility",
  title: "T3 Env Validation",
  description: "A utility to validate environment variables",
  registryType: "registry:lib",
  dependencies: ["@t3-oss/env-nextjs", "zod"],
  files: [
    {
      type: "registry:lib",
      sourceFileName: "env.ts",
    },
  ],
  postInstall: [
    {
      action: "next-steps",
      data: {
        message: "Be sure to import the env.ts file into your next.config.ts to validate at build time.",
      },
    },
  ],
};
