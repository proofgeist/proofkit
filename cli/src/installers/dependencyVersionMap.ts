import { getVersion } from "~/utils/getProofKitVersion.js";

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
  tailwindcss: "^3.4.3",
  postcss: "^8.4.39",
  prettier: "^3.3.2",
  "prettier-plugin-tailwindcss": "^0.6.5",

  // tRPC
  "@trpc/client": "^11.0.0-rc.446",
  "@trpc/server": "^11.0.0-rc.446",
  "@trpc/react-query": "^11.0.0-rc.446",
  "@trpc/next": "^11.0.0-rc.446",
  superjson: "^2.2.1",
  "server-only": "^0.0.1",

  // Clerk
  "@clerk/nextjs": "^5.6.0",
  "@clerk/themes": "^2.1.33",

  // FileMaker Data API
  "@proofgeist/fmdapi": "^4.2.0",

  // ProofKit
  "@proofgeist/kit": getVersion(),

  // Tanstack Query
  "@tanstack/react-query": "^5.59.0",
  "@tanstack/react-query-devtools": "^5.59.0",
  "@tanstack/eslint-plugin-query": "^5.59.1",

  // ProofKit Auth
  "@node-rs/argon2": "^2.0.0",
  "@oslojs/binary": "^1.0.0",
  "@oslojs/crypto": "^1.0.1",
  "@oslojs/encoding": "^1.1.0",

  // React Email
  "@react-email/components": "^0.0.28",
  "@react-email/render": "1.0.2",
  "@plunk/node": "^3.0.3",
  "react-email": "^3.0.2",
  resend: "^4.0.0",
  "@sendgrid/mail": "^8.1.4",
} as const;
export type AvailableDependencies = keyof typeof dependencyVersionMap;
