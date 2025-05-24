import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tabs, Tab } from "fumadocs-ui/components/tabs";

const MANAGERS = [
  { key: "pnpm", label: "pnpm", prefix: "pnpm" },
  { key: "npm", label: "npm", prefix: "npm run" },
  { key: "yarn", label: "yarn", prefix: "yarn" },
];

export function CliCommand({ command }: { command: string }) {
  return (
    <Tabs
      id="package-manager"
      persist
      items={MANAGERS.map((m) => m.label)}
      groupId="package-manager"
    >
      {MANAGERS.map((manager) => (
        <Tab key={manager.key} value={manager.label}>
          <DynamicCodeBlock lang="bash" code={`${manager.prefix} ${command}`} />
        </Tab>
      ))}
    </Tabs>
  );
}

export default CliCommand;
