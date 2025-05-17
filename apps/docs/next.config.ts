import { createMDX } from "fumadocs-mdx/next";
import { type NextConfig } from "next";

const withMDX = createMDX();

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["typescript", "twoslash"],
  transpilePackages: ["@proofkit/fmdapi"],
};

export default withMDX(config);
