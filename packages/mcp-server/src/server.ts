/**
 * MCP Server — registers 4 tools over the credit card dataset.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Tool input schemas use zod/v3 so inputSchema satisfies the SDK's AnySchema
// (z3 | z4) without type assertions; types are derived from these schemas.
import { z } from "zod/v3";
import { loadData, type CardEntry } from "./data.js";

const data = loadData();

//----------------------
//#region Input schemas
//----------------------

const GetCreditCardInputSchema = z.object({
  card_id: z
    .string()
    .describe("The card ID (e.g. 'midtier-cashback')"),
});
type GetCreditCardInput = z.infer<typeof GetCreditCardInputSchema>;

const SearchCreditCardsInputSchema = z.object({
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
});
type SearchCreditCardsInput = z.infer<typeof SearchCreditCardsInputSchema>;

//#endregion

function cardSummary(card: CardEntry) {
  const ci = card.raw.card_identity;
  return {
    id: card.id,
    issuer: ci?.issuer_name ?? "Unknown",
    name: ci?.card_name ?? "Unknown",
    network: ci?.network ?? "Unknown",
    type: ci?.card_type ?? "Unknown",
    credit_tier: ci?.credit_score_required?.tier ?? "unknown",
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Open Credit Cards",
    version: "0.1.0",
  });

  server.registerTool(
    "list_credit_cards",
    {
      description:
        "List all credit cards in the dataset with summary info (id, issuer, name, network, type, credit tier).",
    },
    async () => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data.cards.map(cardSummary), null, 2),
        },
      ],
    })
  );

  server.registerTool(
    "get_credit_card",
    {
      description: "Get the full data for a single credit card by its ID.",
      inputSchema: GetCreditCardInputSchema,
    },
    async ({ card_id }: GetCreditCardInput) => {
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

  server.registerTool(
    "get_schema",
    {
      description:
        "Get the JSON Schema that defines the credit card data structure.",
    },
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

  server.registerTool(
    "search_credit_cards",
    {
      description:
        "Search credit cards by issuer, card type, network, or credit tier. All filters are optional and case-insensitive.",
      inputSchema: SearchCreditCardsInputSchema,
    },
    async ({ issuer, card_type, network, credit_tier }: SearchCreditCardsInput) => {
      let results = data.cards;

      if (issuer) {
        const q = issuer.toLowerCase();
        results = results.filter((c) =>
          c.raw.card_identity?.issuer_name?.toLowerCase().includes(q)
        );
      }

      if (card_type) {
        const q = card_type.toLowerCase();
        results = results.filter(
          (c) => c.raw.card_identity?.card_type?.toLowerCase() === q
        );
      }

      if (network) {
        const q = network.toLowerCase();
        results = results.filter(
          (c) => c.raw.card_identity?.network?.toLowerCase() === q
        );
      }

      if (credit_tier) {
        const q = credit_tier.toLowerCase();
        results = results.filter(
          (c) =>
            c.raw.card_identity?.credit_score_required?.tier?.toLowerCase() ===
            q
        );
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

  return server;
}
