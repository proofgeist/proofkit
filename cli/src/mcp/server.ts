import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getVersion } from "~/utils/getProofKitVersion.js";

interface ScaffoldPageParams {
  name: string;
  path: string;
  techStack?: string;
  template?: string;
}

interface ScaffoldProjectParams {
  name: string;
  path: string;
  techStack?: string;
  template?: string;
}

export function makeServer() {
  const server = new McpServer({
    name: "proofkit",
    version: getVersion(),
  });

  server.tool(
    "init",
    "description",
    { name: z.string(), type: z.enum(["browser", "wv"]) },
    ({ name, type }) => {
      console.log("create new project", name, type);
      return { content: [{ type: "text", text: "Project created" }] };
    }
  );

  server.resource(
    "project-info",
    new ResourceTemplate("proofkit://info?path={path}", { list: undefined }),
    async (uri, { path }) => {
      return {
        contents: [{ uri: uri.href, text: `Project info for ${path}` }],
      };
    }
  );

  return server;
}
