import type { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata = {
  type: "static",
  title: "Auth Code Email",

  description:
    "A email template for sending a one-time code to the user's email address.",
  category: "email",

  registryType: "registry:file",
  dependencies: ["@react-email/components"],

  files: [
    {
      sourceFileName: "auth-code.tsx",
      type: "registry:file",
      destinationPath: "src/emails/auth-code.tsx",
    },
  ],
};
