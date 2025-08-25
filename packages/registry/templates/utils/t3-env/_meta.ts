import { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata={
    category:"utility",
    title:"T3 Env Validation",
    description:"A utility to validate environment variables",
    registryType:"registry:lib",
    type:"static",
    dependencies:["@t3-oss/env-nextjs", "zod"],
    docs:"Be sure to import the env.ts file into your next.config.ts to validate at build time.",
    files:[
        {
            type:"registry:lib",
            sourceFileName:"env.ts",
            
        }
    ]
}