import { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata = {
  title: "Nuqs",
  description: "A utility for managing query parameters in the URL",
  category: "utility",
  registryType: "registry:internal",
  dependencies: ["nuqs"],
  registryDependencies: [],
  files: [],
  postInstall: [
    {
      action: "wrap provider",
      data: {
        providerOpenTag: "<NuqsAdapter>",
        providerCloseTag: "</NuqsAdapter>",
        imports: [
          // import { NuqsAdapter } from 'nuqs/adapters/next/app';
          {
            moduleSpecifier: "nuqs/adapters/next/app",
            namedImports: ["NuqsAdapter"],
          },
        ],
      },
    },
  ],
};
