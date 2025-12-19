import { createMDX } from "fumadocs-mdx/next";
import { type NextConfig } from "next";
import { validateRegistry } from "@proofkit/registry";
import { source } from "./src/lib/source";

const withMDX = createMDX();
// validateRegistry();

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["typescript", "twoslash", "shiki"],
  transpilePackages: ["@proofkit/fmdapi", "@proofkit/registry", "@proofkit/typegen"],
  webpack: (config, { isServer }) => {
    // Resolve @proofkit/typegen/config to source files for development
    config.resolve.alias = {
      ...config.resolve.alias,
      "@proofkit/typegen/config": require.resolve("@proofkit/typegen/src/types.ts"),
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: "/registry/:path*",
        destination: "/r/:path*",
        permanent: true,
      },
      { source: "/docs", destination: "/docs/cli", permanent: false },
    ];
  },
};

export default withMDX(config);
