import type { TemplateMetadata } from "../../lib/types";

export const meta: TemplateMetadata = {
  type: "dynamic",
  title: "BetterAuth",
  description: "A better auth library for Next.js",
  category: "utility",
  registryType: "registry:block",
  dependencies: ["@daveyplate/better-auth-ui", "@proofkit/better-auth"],
  registryDependencies: ["{proofkit}/r/react-email"],
  files: [],
};

/**
 * add to css
 * @source "../../../node_modules/@daveyplate/better-auth-ui";
 *
 * package.json script
 * "better-auth:migrate": "pnpm dlx @proofkit/better-auth@latest migrate"
 *
 *
 *
 */
