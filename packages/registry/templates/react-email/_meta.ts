import type { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata = {
  title: "React Email",
  description: "Build and send emails using React and TypeScript.",
  author: "https://react.email/docs",
  category: "utility",
  registryType: "registry:lib",
  dependencies: ["@react-email/components", "react", "react-dom"],
  devDependencies: ["react-email"],
  files: [],
  postInstall: [
    {
      action: "package.json script",
      data: {
        scriptName: "email:preview",
        scriptCommand: "email dev",
      },
    },
  ],
};
