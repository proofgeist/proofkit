import type { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata = {
  title: "BetterAuth",
  description: "A better auth library for Next.js",
  category: "utility",
  registryType: "registry:block",
  dependencies: ["better-auth", "@daveyplate/better-auth-ui", "@proofkit/better-auth"],
  registryDependencies: ["{proofkit}/r/utils/t3-env", "{proofkit}/r/react-email", "{proofkit}/r/email/generic"],
  css: { '@source "../../node_modules/@daveyplate/better-auth-ui"': {} },
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
      type: "registry:lib",
      handlebars: true,
    },
    {
      sourceFileName: "auth-client.ts",
      type: "registry:lib",
    },
    {
      sourceFileName: "page.tsx",
      destinationPath: "src/app/auth/[pathname]/page.tsx",
      type: "registry:file",
    },
    {
      sourceFileName: "auth-layout.tsx",
      destinationPath: "src/app/auth/[pathname]/layout.tsx",
      type: "registry:file",
    },
  ],
  postInstall: [
    {
      action: "package.json script",
      data: {
        scriptName: "better-auth:migrate",
        scriptCommand: "pnpm dlx @proofkit/better-auth@latest migrate",
      },
    },
    {
      action: "wrap provider",
      data: {
        imports: [
          {
            moduleSpecifier: "@daveyplate/better-auth-ui",
            namedImports: ["AuthUIProvider"],
          },
          {
            moduleSpecifier: "@/lib/auth-client",
            namedImports: ["authClient"],
          },
        ],
        providerOpenTag: "<AuthUIProvider authClient={authClient}>",
        providerCloseTag: "</AuthUIProvider>",
        parentTag: ["ThemeProvider"],
      },
    },
  ],
};
