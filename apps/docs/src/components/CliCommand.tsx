"use client";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tabs, Tab } from "fumadocs-ui/components/tabs";
import { cliVersion } from "@/lib/constants";

const MANAGERS = [
  {
    key: "npm",
    label: "npm",
    prefix: "npm run",
    execPrefix: "npx",
  },
  {
    key: "pnpm",
    label: "pnpm",
    prefix: "pnpm",
    execPrefix: "pnpm dlx",
  },
  {
    key: "yarn",
    label: "yarn",
    prefix: "yarn",
    execPrefix: "yarn dlx",
  },
  {
    key: "bun",
    label: "bun",
    prefix: "bun",
    execPrefix: "bunx",
  },
];

export function CliCommand({
  command,
  exec,
  execPackage = `@proofkit/cli@${cliVersion}`,
}: {
  command: string;
  exec?: boolean;
  execPackage?: string;
}) {
  return (
    <Tabs
      id="package-manager"
      persist
      items={MANAGERS.map((m) => m.label)}
      groupId="package-manager"
    >
      {MANAGERS.map((manager) => (
        <Tab key={manager.key} value={manager.label}>
          <DynamicCodeBlock
            lang="bash"
            code={`${exec ? manager.execPrefix + " " + execPackage : manager.prefix} ${command}`}
          />
        </Tab>
      ))}
    </Tabs>
  );
}

export default CliCommand;
