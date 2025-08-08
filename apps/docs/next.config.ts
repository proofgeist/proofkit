import { createMDX } from "fumadocs-mdx/next";
import { type NextConfig } from "next";
import { validateRegistry } from "@proofkit/registry";

const withMDX = createMDX();
// validateRegistry();

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["typescript", "twoslash", "shiki"],
  transpilePackages: ["@proofkit/fmdapi", "@proofkit/registry"],
  async redirects() {
    return [
      {
        source: "/registry/:path*",
        destination: "/r/:path*",
        permanent: true,
      },
    ];
  },
};

export default withMDX(config);
