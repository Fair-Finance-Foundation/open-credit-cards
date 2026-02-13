import { describe, expect, test } from "bun:test";
import { loadData } from "./data.js";

describe("loadData", () => {
  const data = loadData();

  test("loads the credit card schema", () => {
    expect(data.schema).not.toBeNull();
    expect(data.schema!.title).toBe("Credit Card Product");
    expect(data.schema!.$defs).toBeDefined();
  });

  test("loads all 5 sample credit cards", () => {
    expect(data.cards).toHaveLength(5);
    const ids = data.cards.map((c) => c.id).sort();
    expect(ids).toEqual([
      "midtier-cashback",
      "premium-travel",
      "secured-credit-builder",
      "store-deferred-interest",
      "student-starter",
    ]);
  });

  test("each card has a valid card_identity", () => {
    for (const card of data.cards) {
      const ci = card.raw.card_identity as Record<string, unknown>;
      expect(ci).toBeDefined();
      expect(typeof ci.issuer_name).toBe("string");
      expect(typeof ci.card_name).toBe("string");
    }
  });

  test("each card has schema_version 1.0.0", () => {
    for (const card of data.cards) {
      expect(card.raw.schema_version).toBe("1.0.0");
    }
  });

  test("allFiles includes both schema and card files", () => {
    expect(data.allFiles.length).toBeGreaterThanOrEqual(6); // 1 schema + 5 cards
    const paths = data.allFiles.map((f) => f.path);
    expect(paths).toContain("schemas/credit-card.schema.json");
    expect(paths.some((p) => p.startsWith("sample-credit-cards/"))).toBe(true);
  });

  test("all embedded file content is valid JSON", () => {
    for (const file of data.allFiles) {
      expect(() => JSON.parse(file.content)).not.toThrow();
    }
  });
});
