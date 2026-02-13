import { describe, expect, test } from "bun:test";
import worker from "./index.js";

function req(path: string, options?: RequestInit): Request {
  return new Request(`http://localhost${path}`, options);
}

describe("Worker routing", () => {
  test("GET / returns health check", async () => {
    const res = await worker.fetch(req("/"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.mcp_endpoint).toBe("/mcp");
  });

  test("GET /health returns health check", async () => {
    const res = await worker.fetch(req("/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("GET /unknown returns 404", async () => {
    const res = await worker.fetch(req("/unknown"));
    expect(res.status).toBe(404);
  });

  test("POST /mcp with initialize succeeds", async () => {
    const res = await worker.fetch(
      req("/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "0.1.0" },
          },
          id: 1,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("Open Credit Cards");
    expect(body.result.capabilities.tools).toBeDefined();
  });

  test("POST /mcp lists tools", async () => {
    const res = await worker.fetch(
      req("/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          params: {},
          id: 2,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.tools).toHaveLength(5);
  });

  test("POST /mcp calls a tool", async () => {
    const res = await worker.fetch(
      req("/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "list_credit_cards",
            arguments: {},
          },
          id: 3,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const cards = JSON.parse(body.result.content[0].text);
    expect(cards).toHaveLength(5);
  });
});
