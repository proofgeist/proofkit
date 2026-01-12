"use client";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { cliVersion } from "@/lib/constants";

const MANAGERS = [
  { key: "npm", label: "npm", prefix: "npm install" },
  { key: "pnpm", label: "pnpm", prefix: "pnpm add" },
  { key: "yarn", label: "yarn", prefix: "yarn add" },
  { key: "bun", label: "bun", prefix: "bun add" },
];

const WHITESPACE_RE = /\s+/;

/**
 * Renders a tabbed package install command.
 * Automatically appends @{cliVersion} to @proofkit/* packages unless version is already specified.
 */
export function PackageInstall({ packages }: { packages: string }) {
  const pkgs = packages
    .trim()
    .split(WHITESPACE_RE)
    .map((pkg) => {
      // If it's a @proofkit package without a version, append the cliVersion
      if (pkg.startsWith("@proofkit/") && !pkg.includes("@", 1)) {
        return `${pkg}@${cliVersion}`;
      }
      return pkg;
    })
    .join(" ");

  return (
    <Tabs groupId="package-manager" id="package-manager" items={MANAGERS.map((m) => m.label)} persist>
      {MANAGERS.map((manager) => (
        <Tab key={manager.key} value={manager.label}>
          <DynamicCodeBlock code={`${manager.prefix} ${pkgs}`} lang="bash" />
        </Tab>
      ))}
    </Tabs>
  );
}

export default PackageInstall;
