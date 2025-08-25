import type { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata = {
  title: "Mode Toggle",

  description: "A toggle button to switch between light and dark mode.",
  category: "component",

  registryType: "registry:component",
  dependencies: ["next-themes"],
  registryDependencies: ["dropdown-menu", "button"],

  files: [
    {
      sourceFileName: "mode-toggle.tsx",
      type: "registry:component",
    },
  ],
};
