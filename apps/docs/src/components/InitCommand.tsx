import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tabs, Tab } from "fumadocs-ui/components/tabs";

const MANAGERS = [
  { key: "pnpm", label: "pnpm", command: "pnpm create proofkit@latest" },
  { key: "npm", label: "npm", command: "npx create-proofkit@latest" },
  { key: "yarn", label: "yarn", command: "yarn create proofkit@latest" },
];

export function InitCommand() {
  return (
    <Tabs
      id="package-manager"
      persist
      items={MANAGERS.map((m) => m.label)}
      groupId="package-manager"
    >
      {MANAGERS.map((manager) => (
        <Tab key={manager.key} value={manager.label}>
          <DynamicCodeBlock lang="bash" code={`${manager.command}`} />
        </Tab>
      ))}
    </Tabs>
  );
}

export default InitCommand;
