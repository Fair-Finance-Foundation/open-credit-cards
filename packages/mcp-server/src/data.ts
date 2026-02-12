/**
 * Parses embedded data files into typed structures.
 * Thin wrapper — no transformation beyond parsing.
 */
import { embeddedFiles, type EmbeddedFile } from "./generated-data.js";

export interface CreditCard {
  id: string;
  raw: Record<string, unknown>;
}

export interface DataStore {
  schema: Record<string, unknown> | null;
  cards: CreditCard[];
  allFiles: EmbeddedFile[];
}

export function loadData(): DataStore {
  let schema: Record<string, unknown> | null = null;
  const cards: CreditCard[] = [];

  for (const file of embeddedFiles) {
    const parsed = JSON.parse(file.content);

    if (file.path.startsWith("schemas/")) {
      schema = parsed;
    } else if (file.path.startsWith("sample-credit-cards/")) {
      const id = file.path
        .replace("sample-credit-cards/", "")
        .replace(".json", "");
      cards.push({ id, raw: parsed });
    }
  }

  return { schema, cards, allFiles: embeddedFiles };
}
