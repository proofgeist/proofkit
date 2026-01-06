import type { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata = {
  title: "Generic Email Template",

  description: "A generic email template with optional title, description, CTA, and footer.",
  category: "email",

  registryType: "registry:file",
  dependencies: ["@react-email/components"],

  files: [
    {
      sourceFileName: "generic.tsx",
      type: "registry:file",
      destinationPath: "src/emails/generic.tsx",
    },
  ],
};
