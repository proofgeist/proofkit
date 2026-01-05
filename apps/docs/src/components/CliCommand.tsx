"use client";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
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
    <Tabs groupId="package-manager" id="package-manager" items={MANAGERS.map((m) => m.label)} persist>
      {MANAGERS.map((manager) => (
        <Tab key={manager.key} value={manager.label}>
          <DynamicCodeBlock
            code={`${exec ? `${manager.execPrefix} ${execPackage}` : manager.prefix} ${command}`}
            lang="bash"
          />
        </Tab>
      ))}
    </Tabs>
  );
}

export default CliCommand;
