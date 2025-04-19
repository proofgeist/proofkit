import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { program } from "commander";

import { makeServer } from "./server.js";

export function makeMcpCommand() {
  return program.command("mcp").action(async () => {
    const server = makeServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await new Promise(() => {}); // keep the process running
  });
}
