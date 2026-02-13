/**
 * Loads generated data into a typed store. Schema and cards come from
 * generated-data.ts (types + sampleCreditCards).
 */
import {
  creditCardSchema,
  sampleCreditCardPaths,
  sampleCreditCards,
  type CreditCard,
} from "./generated-data.js";

export type { CreditCard };

export interface CardEntry {
  id: string;
  raw: CreditCard;
}

export interface DataStore {
  schema: typeof creditCardSchema;
  cards: CardEntry[];
}

function pathToId(path: string): string {
  return path.replace(/^sample-credit-cards\//, "").replace(/\.json$/, "");
}

export function loadData(): DataStore {
  const cards: CardEntry[] = sampleCreditCards.map((raw, i) => ({
    id: pathToId(sampleCreditCardPaths[i] ?? ""),
    raw,
  }));

  return {
    schema: creditCardSchema,
    cards,
  };
}
