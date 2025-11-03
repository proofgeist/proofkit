import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import {
  ODataApi,
  FetchAdapter,
  OttoAdapter,
  isOttoAPIKey,
  type ODataApiClient,
} from "@proofkit/fmodata";
import {
  createQueryTools,
  handleQueryTool,
} from "./tools/query.js";
import {
  createCrudTools,
  handleCrudTool,
} from "./tools/crud.js";
import {
  createSchemaTools,
  handleSchemaTool,
} from "./tools/schema.js";
import {
  createScriptTools,
  handleScriptTool,
} from "./tools/scripts.js";

/**
 * Create and configure MCP server with OData client
 */
export async function createServer(): Promise<Server> {
  // Read configuration from environment variables (trim whitespace and quotes)
  const host = process.env.FMODATA_HOST?.trim().replace(/^["']|["']$/g, "");
  const database = process.env.FMODATA_DATABASE?.trim().replace(/^["']|["']$/g, "");
  const username = process.env.FMODATA_USERNAME?.trim().replace(/^["']|["']$/g, "");
  const password = process.env.FMODATA_PASSWORD?.trim().replace(/^["']|["']$/g, "");
  const ottoApiKey = process.env.FMODATA_OTTO_API_KEY?.trim().replace(/^["']|["']$/g, "");
  const ottoPort = process.env.FMODATA_OTTO_PORT
    ? parseInt(process.env.FMODATA_OTTO_PORT.trim(), 10)
    : undefined;

  // Validate required configuration
  if (!host) {
    throw new Error("FMODATA_HOST environment variable is required");
  }
  if (!database) {
    throw new Error("FMODATA_DATABASE environment variable is required");
  }

  // Initialize OData client based on available auth config
  let client: ODataApiClient;
  if (ottoApiKey && isOttoAPIKey(ottoApiKey)) {
    // Use Otto adapter if API key is provided
    if (ottoApiKey.startsWith("KEY_")) {
      // Otto v3
      client = ODataApi({
        adapter: new OttoAdapter({
          server: host,
          database,
          auth: { apiKey: ottoApiKey as `KEY_${string}`, ottoPort },
        }),
      });
    } else if (ottoApiKey.startsWith("dk_")) {
      // OttoFMS
      client = ODataApi({
        adapter: new OttoAdapter({
          server: host,
          database,
          auth: { apiKey: ottoApiKey as `dk_${string}` },
        }),
      });
    } else {
      throw new Error("Invalid Otto API key format");
    }
  } else if (username && password) {
    // Use Basic Auth adapter
    client = ODataApi({
      adapter: new FetchAdapter({
        server: host,
        database,
        auth: {
          username,
          password,
        },
      }),
    });
  } else {
    throw new Error(
      "Either FMODATA_OTTO_API_KEY or both FMODATA_USERNAME and FMODATA_PASSWORD must be set",
    );
  }

  // Create MCP server
  const server = new Server(
    {
      name: "fmodata-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register all tools
  const allTools = [
    ...createQueryTools(client),
    ...createCrudTools(client),
    ...createSchemaTools(client),
    ...createScriptTools(client),
  ];

  // List available tools
  server.setRequestHandler(
    z.object({ method: z.literal("tools/list") }),
    async () => {
      return {
        tools: allTools,
      };
    },
  );

  // Handle tool execution
  // Use the proper Zod schema for tools/call requests
  server.setRequestHandler(
    z.object({
      method: z.literal("tools/call"),
      params: z.object({
        name: z.string(),
        arguments: z.any().optional(),
      }),
    }),
    async (request) => {
      // With the proper Zod schema, TypeScript should infer the structure correctly
      const params = request.params;
      const name = params.name;
      const args = params.arguments;

    try {
      let result: unknown;

      // Route to appropriate tool handler
      if (name.startsWith("fmodata_list_tables") || 
          name.startsWith("fmodata_get_metadata") ||
          name.startsWith("fmodata_query") ||
          name.startsWith("fmodata_get_record") ||
          name.startsWith("fmodata_get_field_value") ||
          name.startsWith("fmodata_navigate_related") ||
          name.startsWith("fmodata_cross_join")) {
        result = await handleQueryTool(client, name, args);
      } else if (
        name.startsWith("fmodata_create_record") ||
        name.startsWith("fmodata_update_record") ||
        name.startsWith("fmodata_delete_record")
      ) {
        result = await handleCrudTool(client, name, args);
      } else if (
        name.startsWith("fmodata_create_table") ||
        name.startsWith("fmodata_add_fields") ||
        name.startsWith("fmodata_delete_table") ||
        name.startsWith("fmodata_delete_field")
      ) {
        result = await handleSchemaTool(client, name, args);
      } else if (
        name.startsWith("fmodata_run_script") ||
        name.startsWith("fmodata_batch")
      ) {
        result = await handleScriptTool(client, name, args);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Tool execution failed: ${errorMessage}`);
    }
  });

  return server;
}

/**
 * Start the MCP server with Express HTTP transport
 */
export async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Store active sessions (server + transport pairs) by session ID
  const sessions: Record<
    string,
    { server: Server; transport: StreamableHTTPServerTransport }
  > = {};

  // Helper to generate session IDs
  const generateSessionId = () => {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  };

  // Handle MCP requests
  app.all("/mcp", async (req: Request, res: Response) => {
    try {
      // MCP SDK uses "mcp-session-id" header (lowercase, no x- prefix)
      const sessionId =
        (req.headers["mcp-session-id"] as string) ||
        (req.headers["x-mcp-session-id"] as string) ||
        (req.query.sessionId as string) ||
        undefined;

      let session = sessionId ? sessions[sessionId] : undefined;

      // If no session ID, this is the first request - create a new session
      // If session ID exists, try to find existing session
      if (!sessionId) {
        // New session - create server and transport
        const newSessionId = generateSessionId();
        const server = await createServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessioninitialized: (id) => {
            console.log(`Session ${id} initialized`);
          },
          onsessionclosed: (id) => {
            console.log(`Session ${id} closed`);
            delete sessions[id];
          },
        });

        // Connect server to transport
        await server.connect(transport);
        
        // Store session
        session = { server, transport };
        sessions[newSessionId] = session;
      } else {
        // Existing session - look it up
        session = sessions[sessionId];
        if (!session) {
          // Session ID provided but not found - return error
          res.status(404).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: `Session ${sessionId} not found`,
            },
            id: null,
          });
          return;
        }
      }

      // Handle the request (transport handles initialization automatically for first request)
      await session.transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error),
        },
        id: null,
      });
    }
  });

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "fmodata-mcp" });
  });

  // Get port from environment or default to 3000
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.listen(port, () => {
    console.log(`MCP server running on http://localhost:${port}`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
    console.log(`Health check: http://localhost:${port}/health`);
  });
}

