import {
  getFmdapiVersion,
  getNodeMajorVersion,
  getVersion,
} from "~/utils/getProofKitVersion.js";

/*
 * This maps the necessary packages to a version.
 * This improves performance significantly over fetching it from the npm registry.
 */
export const dependencyVersionMap = {
  // NextAuth.js
  "next-auth": "beta",
  "next-auth-adapter-filemaker": "beta",

  "@auth/prisma-adapter": "^1.6.0",
  "@auth/drizzle-adapter": "^1.1.0",

  // Prisma
  prisma: "^5.14.0",
  "@prisma/client": "^5.14.0",
  "@prisma/adapter-planetscale": "^5.14.0",

  // Drizzle
  "drizzle-orm": "^0.30.10",
  "drizzle-kit": "^0.21.4",
  "eslint-plugin-drizzle": "^0.2.3",
  mysql2: "^3.9.7",
  "@planetscale/database": "^1.18.0",
  postgres: "^3.4.4",
  "@libsql/client": "^0.6.0",

  // TailwindCSS
  tailwindcss: "^4.1.10",
  postcss: "^8.4.41",
  prettier: "^3.5.3",
  "prettier-plugin-tailwindcss": "^0.6.12",
  "@tailwindcss/postcss": "^4.1.10",
  "class-variance-authority": "^0.7.1",
  clsx: "^2.1.1",
  "tailwind-merge": "^3.3.1",
  "tw-animate-css": "^1.3.4",

  // tRPC
  "@trpc/client": "^11.0.0-rc.446",
  "@trpc/server": "^11.0.0-rc.446",
  "@trpc/react-query": "^11.0.0-rc.446",
  "@trpc/next": "^11.0.0-rc.446",
  superjson: "^2.2.1",
  "server-only": "^0.0.1",

  // Clerk
  "@clerk/nextjs": "^6.3.1",
  "@clerk/themes": "^2.1.33",

  // FileMaker Data API
  "@proofkit/fmdapi": `^${getFmdapiVersion()}`,

  // ProofKit
  "@proofkit/cli": `^${getVersion()}`,

  // Tanstack Query
  "@tanstack/react-query": "^5.59.0",
  "@tanstack/react-query-devtools": "^5.59.0",
  "@tanstack/eslint-plugin-query": "^5.59.1",

  // ProofKit Auth
  "@node-rs/argon2": "^2.0.2",
  "@oslojs/binary": "^1.0.0",
  "@oslojs/crypto": "^1.0.1",
  "@oslojs/encoding": "^1.1.0",
  "js-cookie": "^3.0.5",
  "@types/js-cookie": "^3.0.6",

  // React Email
  "@react-email/components": "^0.0.28",
  "@react-email/render": "1.0.2",
  "@plunk/node": "^3.0.3",
  "react-email": "^3.0.2",
  resend: "^4.0.0",
  "@sendgrid/mail": "^8.1.4",

  // Node
  "@types/node": `^${getNodeMajorVersion()}`,

  // Radix (for shadcn/ui)
  "@radix-ui/react-slot": "^1.2.3",

  // Icons (for shadcn/ui)
  "lucide-react": "^0.518.0",

  // Mantine UI
  "@mantine/core": "^7.15.0",
  "@mantine/dates": "^7.15.0",
  "@mantine/hooks": "^7.15.0",
  "@mantine/modals": "^7.15.0",
  "@mantine/notifications": "^7.15.0",
  "mantine-react-table": "^2.0.0",

  // Theme utilities
  "next-themes": "^0.4.6",
} as const;
export type AvailableDependencies = keyof typeof dependencyVersionMap;
