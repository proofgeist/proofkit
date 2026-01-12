import type { TemplateMetadata } from "@proofkit/registry";

export const meta: TemplateMetadata = {
  title: "@proofkit/fmdapi",
  category: "utility",
  registryType: "registry:lib",
  dependencies: ["@proofkit/fmdapi"],
  // registryDependencies: ["{proofkit}/r/utils/t3-env"],
  files: [
    {
      sourceFileName: "proofkit-typegen.config.jsonc",
      type: "registry:file",
      destinationPath: "~/proofkit-typegen.config.jsonc",
    },
  ],
  postInstall: [
    {
      action: "env",
      data: {
        envs: [
          {
            name: "FM_SERVER",
            type: "server",
            zodValue: "z.string().startsWith('https://')",
          },
          {
            name: "FM_DATABASE",
            type: "server",
            zodValue: "z.string().endsWith('.fmp12')",
          },
          {
            name: "OTTO_API_KEY",
            type: "server",
            zodValue: "z.string().startsWith('dk_')",
          },
        ],
      },
    },
  ],
};
