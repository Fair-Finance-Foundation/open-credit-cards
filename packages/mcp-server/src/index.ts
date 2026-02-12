/**
 * Cloudflare Worker entry point.
 * Routes /mcp to the MCP server via Streamable HTTP transport, / to a health check.
 */
import { createServer } from "./server.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        status: "ok",
        mcp_endpoint: "/mcp",
      });
    }

    if (url.pathname === "/mcp") {
      const server = createServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode for Workers
        enableJsonResponse: true,
      });

      await server.connect(transport);
      return transport.handleRequest(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
