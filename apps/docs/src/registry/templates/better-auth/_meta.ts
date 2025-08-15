import type { TemplateMetadata } from "../../lib/types";

export const meta: TemplateMetadata = {
  type: "dynamic",
  title: "BetterAuth",
  description: "A better auth library for Next.js",
  category: "utility",
  registryType: "registry:block",
  dependencies: ["@daveyplate/better-auth-ui", "@proofkit/better-auth"],
  registryDependencies: [
    "{proofkit}/r/react-email",
    "{proofkit}/r/emails/generic",
  ],
  files: [
    {
      sourceFileName: "main-layout.tsx",
      destinationPath: "src/app/(main)/layout.tsx",
      type: "registry:file",
    },
    {
      sourceFileName: "AuthUIProvider.tsx",
      destinationPath: "src/config/AuthUIProvider.tsx",
      type: "registry:file",
    },
    {
      sourceFileName: "auth-api-route.ts",
      destinationPath: "src/app/api/auth/[...all]/route.ts",
      type: "registry:file",
    },
    {
      sourceFileName: "auth.ts",
      destinationPath: "src/auth.ts",
      type: "registry:file",
    },
    {
      sourceFileName: "auth-client.ts",
      destinationPath: "src/auth-client.ts",
      type: "registry:file",
    },
    {
      sourceFileName: "page.tsx",
      destinationPath: "src/app/auth/[pathname]/page.tsx",
      type: "registry:page",
    },
    {
      sourceFileName: "view.tsx",
      destinationPath: "src/app/auth/[pathname]/view.tsx",
      type: "registry:file",
    },
    {
      sourceFileName: "auth-layout.tsx",
      destinationPath: "src/app/auth/[pathname]/layout.tsx",
      type: "registry:file",
    },
  ],
};

/**
 * add to css
 * @source "../../../node_modules/@daveyplate/better-auth-ui";
 *
 * package.json script
 * "better-auth:migrate": "pnpm dlx @proofkit/better-auth@latest migrate"
 *
 * Wrap the app in AuthUIProvider
 *
 */
