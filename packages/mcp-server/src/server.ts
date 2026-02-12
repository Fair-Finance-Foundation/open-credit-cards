/**
 * MCP Server — registers 5 tools over the credit card dataset.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadData, type CreditCard } from "./data.js";

const data = loadData();

function cardSummary(card: CreditCard) {
  const ci = card.raw.card_identity as Record<string, unknown> | undefined;
  return {
    id: card.id,
    issuer: ci?.issuer_name ?? "Unknown",
    name: ci?.card_name ?? "Unknown",
    network: ci?.network ?? "Unknown",
    type: ci?.card_type ?? "Unknown",
    credit_tier:
      (ci?.credit_score_required as Record<string, unknown> | undefined)
        ?.tier ?? "unknown",
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Open Credit Cards",
    version: "0.1.0",
  });

  // Tool 1: List all credit cards (summary)
  server.tool(
    "list_credit_cards",
    "List all credit cards in the dataset with summary info (id, issuer, name, network, type, credit tier).",
    {},
    async () => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data.cards.map(cardSummary), null, 2),
        },
      ],
    })
  );

  // Tool 2: Get full data for a single card
  server.tool(
    "get_credit_card",
    "Get the full data for a single credit card by its ID.",
    { card_id: z.string().describe("The card ID (e.g. 'midtier-cashback')") },
    async ({ card_id }) => {
      const card = data.cards.find((c) => c.id === card_id);
      if (!card) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Card not found: ${card_id}. Use list_credit_cards to see available IDs.`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(card.raw, null, 2) },
        ],
      };
    }
  );

  // Tool 3: Get the JSON schema
  server.tool(
    "get_schema",
    "Get the JSON Schema that defines the credit card data structure.",
    {},
    async () => ({
      content: [
        {
          type: "text" as const,
          text: data.schema
            ? JSON.stringify(data.schema, null, 2)
            : "Schema not found.",
        },
      ],
    })
  );

  // Tool 4: Search/filter credit cards
  server.tool(
    "search_credit_cards",
    "Search credit cards by issuer, card type, network, or credit tier. All filters are optional and case-insensitive.",
    {
      issuer: z
        .string()
        .optional()
        .describe("Filter by issuer name (partial match)"),
      card_type: z
        .string()
        .optional()
        .describe(
          "Filter by card type (e.g. consumer_rewards, consumer_secured)"
        ),
      network: z
        .string()
        .optional()
        .describe("Filter by network (Visa, Mastercard, etc.)"),
      credit_tier: z
        .string()
        .optional()
        .describe("Filter by credit tier (excellent, good, fair, poor, etc.)"),
    },
    async ({ issuer, card_type, network, credit_tier }) => {
      let results = data.cards;

      if (issuer) {
        const q = issuer.toLowerCase();
        results = results.filter((c) => {
          const ci = c.raw.card_identity as Record<string, unknown> | undefined;
          return (ci?.issuer_name as string)?.toLowerCase().includes(q);
        });
      }

      if (card_type) {
        const q = card_type.toLowerCase();
        results = results.filter((c) => {
          const ci = c.raw.card_identity as Record<string, unknown> | undefined;
          return (ci?.card_type as string)?.toLowerCase() === q;
        });
      }

      if (network) {
        const q = network.toLowerCase();
        results = results.filter((c) => {
          const ci = c.raw.card_identity as Record<string, unknown> | undefined;
          return (ci?.network as string)?.toLowerCase() === q;
        });
      }

      if (credit_tier) {
        const q = credit_tier.toLowerCase();
        results = results.filter((c) => {
          const ci = c.raw.card_identity as Record<string, unknown> | undefined;
          const csr = ci?.credit_score_required as
            | Record<string, unknown>
            | undefined;
          return (csr?.tier as string)?.toLowerCase() === q;
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: results.length,
                cards: results.map(cardSummary),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool 5: Get all raw data files
  server.tool(
    "get_all_data_files",
    "Get every raw data file in the dataset (schemas and credit cards). Returns file paths and their JSON content.",
    {},
    async () => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            data.allFiles.map((f) => ({
              path: f.path,
              content: JSON.parse(f.content),
            })),
            null,
            2
          ),
        },
      ],
    })
  );

  return server;
}
