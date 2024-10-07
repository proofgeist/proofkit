import React from "react";
import { Code, TabItem, Tabs } from "@astrojs/starlight/components";

export function CliCommand({ command }: { command?: string }) {
  return (
    <Tabs syncKey="packageManager">
      <TabItem label="pnpm">
        <Code code="pnpx @proofgeist/kit" lang="bash" frame="terminal" />
      </TabItem>
      <TabItem label="npm">
        <Code code="npx @proofgeist/kit" lang="bash" frame="terminal" />
      </TabItem>
      <TabItem label="yarn">
        <Code code="yarn dlx @proofgeist/kit" lang="bash" frame="terminal" />
      </TabItem>
    </Tabs>
  );
}

export function installCommand() {}
