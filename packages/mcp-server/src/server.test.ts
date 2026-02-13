import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";

let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const server = createServer();
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  client = new Client({ name: "test-client", version: "0.1.0" });
  await client.connect(clientTransport);

  cleanup = async () => {
    await client.close();
    await server.close();
  };
});

afterAll(async () => {
  await cleanup();
});

describe("MCP server", () => {
  test("server info is correct", async () => {
    const info = client.getServerVersion();
    expect(info?.name).toBe("Open Credit Cards");
    expect(info?.version).toBe("0.1.0");
  });

  test("lists all 5 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_all_data_files",
      "get_credit_card",
      "get_schema",
      "list_credit_cards",
      "search_credit_cards",
    ]);
  });

  test("each tool has a description and input schema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });
});

describe("list_credit_cards", () => {
  test("returns all 5 cards", async () => {
    const result = await client.callTool({
      name: "list_credit_cards",
      arguments: {},
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const cards = JSON.parse(content[0].text);
    expect(cards).toHaveLength(5);
  });

  test("each card summary has expected fields", async () => {
    const result = await client.callTool({
      name: "list_credit_cards",
      arguments: {},
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const cards = JSON.parse(content[0].text);
    for (const card of cards) {
      expect(card).toHaveProperty("id");
      expect(card).toHaveProperty("issuer");
      expect(card).toHaveProperty("name");
      expect(card).toHaveProperty("network");
      expect(card).toHaveProperty("type");
      expect(card).toHaveProperty("credit_tier");
    }
  });
});

describe("get_credit_card", () => {
  test("returns full card data for a valid ID", async () => {
    const result = await client.callTool({
      name: "get_credit_card",
      arguments: { card_id: "midtier-cashback" },
    });
    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const card = JSON.parse(content[0].text);
    expect(card.schema_version).toBe("1.0.0");
    expect(card.card_identity.card_name).toBe("Sample Cashback Plus Card");
  });

  test("returns error for unknown card ID", async () => {
    const result = await client.callTool({
      name: "get_credit_card",
      arguments: { card_id: "nonexistent" },
    });
    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toContain("Card not found");
  });

  test("returns different data for each card", async () => {
    const ids = [
      "midtier-cashback",
      "premium-travel",
      "secured-credit-builder",
      "store-deferred-interest",
      "student-starter",
    ];
    const names = new Set<string>();
    for (const id of ids) {
      const result = await client.callTool({
        name: "get_credit_card",
        arguments: { card_id: id },
      });
      const content = result.content as Array<{ type: string; text: string }>;
      const card = JSON.parse(content[0].text);
      names.add(card.card_identity.card_name);
    }
    expect(names.size).toBe(5);
  });
});

describe("get_schema", () => {
  test("returns the JSON schema", async () => {
    const result = await client.callTool({
      name: "get_schema",
      arguments: {},
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const schema = JSON.parse(content[0].text);
    expect(schema.title).toBe("Credit Card Product");
    expect(schema.$defs).toBeDefined();
    expect(schema.properties.card_identity).toBeDefined();
  });
});

describe("search_credit_cards", () => {
  test("filters by issuer (partial match)", async () => {
    const result = await client.callTool({
      name: "search_credit_cards",
      arguments: { issuer: "National" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.count).toBeGreaterThanOrEqual(1);
    for (const card of data.cards) {
      expect(card.issuer.toLowerCase()).toContain("national");
    }
  });

  test("filters by card_type", async () => {
    const result = await client.callTool({
      name: "search_credit_cards",
      arguments: { card_type: "consumer_secured" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.count).toBe(1);
    expect(data.cards[0].type).toBe("consumer_secured");
  });

  test("filters by network", async () => {
    const result = await client.callTool({
      name: "search_credit_cards",
      arguments: { network: "Visa" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.count).toBeGreaterThanOrEqual(1);
    for (const card of data.cards) {
      expect(card.network).toBe("Visa");
    }
  });

  test("filters by credit_tier", async () => {
    const result = await client.callTool({
      name: "search_credit_cards",
      arguments: { credit_tier: "excellent" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.count).toBe(1);
    expect(data.cards[0].credit_tier).toBe("excellent");
  });

  test("returns empty results for no matches", async () => {
    const result = await client.callTool({
      name: "search_credit_cards",
      arguments: { issuer: "zzz-no-match" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.count).toBe(0);
    expect(data.cards).toEqual([]);
  });

  test("combines multiple filters", async () => {
    const result = await client.callTool({
      name: "search_credit_cards",
      arguments: { network: "Visa", credit_tier: "excellent" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.count).toBe(1);
    expect(data.cards[0].id).toBe("premium-travel");
  });

  test("is case-insensitive", async () => {
    const result = await client.callTool({
      name: "search_credit_cards",
      arguments: { network: "visa" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.count).toBeGreaterThanOrEqual(1);
  });

  test("returns all cards with no filters", async () => {
    const result = await client.callTool({
      name: "search_credit_cards",
      arguments: {},
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.count).toBe(5);
  });
});

describe("get_all_data_files", () => {
  test("returns all data files with paths and parsed content", async () => {
    const result = await client.callTool({
      name: "get_all_data_files",
      arguments: {},
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const files = JSON.parse(content[0].text);
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const file of files) {
      expect(file).toHaveProperty("path");
      expect(file).toHaveProperty("content");
      expect(typeof file.content).toBe("object"); // parsed JSON, not string
    }
  });

  test("includes the schema file", async () => {
    const result = await client.callTool({
      name: "get_all_data_files",
      arguments: {},
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const files = JSON.parse(content[0].text);
    const schemaFile = files.find(
      (f: { path: string }) => f.path === "schemas/credit-card.schema.json"
    );
    expect(schemaFile).toBeDefined();
    expect(schemaFile.content.title).toBe("Credit Card Product");
  });
});
