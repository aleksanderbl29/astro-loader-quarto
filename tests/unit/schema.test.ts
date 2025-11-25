/**
 * Unit tests for schema generation and validation
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  inferFieldType,
  generateSchema,
  applySchemaConfig,
} from "../../src/schema/generator.js";
import { validateEntry } from "../../src/schema/validator.js";
import { commonFields } from "../../src/schema/common-fields.js";

describe("Schema Generator", () => {
  describe("inferFieldType", () => {
    it("should use common field schema if available", () => {
      const schema = inferFieldType("title", ["Post 1", "Post 2"]);
      expect(schema).toBe(commonFields.title);
    });

    it("should infer string type", () => {
      const schema = inferFieldType("customField", ["value1", "value2"]);
      const result = schema.safeParse("test");
      expect(result.success).toBe(true);
    });

    it("should infer number type", () => {
      const schema = inferFieldType("count", [1, 2, 3]);
      const result = schema.safeParse(5);
      expect(result.success).toBe(true);
    });

    it("should infer date type", () => {
      const schema = inferFieldType("pubDate", [
        new Date("2025-11-24"),
        new Date("2025-11-24"),
      ]);
      const result = schema.safeParse(new Date());
      expect(result.success).toBe(true);
    });

    it("should infer array type", () => {
      const schema = inferFieldType("tags", [["tag1", "tag2"], ["tag3"]]);
      const result = schema.safeParse(["test"]);
      expect(result.success).toBe(true);
    });

    it("should make optional if not all entries have field", () => {
      const schema = inferFieldType("optional", ["value", undefined, "value2"]);
      const result1 = schema.safeParse("test");
      const result2 = schema.safeParse(undefined);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe("generateSchema", () => {
    it("should generate schema from documents", () => {
      const docs = [
        { title: "Post 1", pubDate: new Date(), tags: ["tech"] },
        { title: "Post 2", pubDate: new Date(), tags: ["web"] },
      ];

      const listing = { id: "posts", contents: "*.qmd" };
      const schema = generateSchema(docs, listing);

      expect(schema.shape.title).toBeDefined();
      expect(schema.shape.pubDate).toBeDefined();
      expect(schema.shape.tags).toBeDefined();
    });

    it("should use custom field schemas", () => {
      const docs = [{ title: "Test", level: 5 }];
      const listing = { id: "test", contents: "*.qmd" };
      const customSchema = z.enum(["beginner", "intermediate", "advanced"]);

      const schema = generateSchema(docs, listing, {
        customFields: { level: customSchema },
      });

      expect(schema.shape.level).toBe(customSchema);
    });

    it("should ensure minimum required fields", () => {
      const docs = [{ description: "Test" }];
      const listing = { id: "test", contents: "*.qmd" };

      const schema = generateSchema(docs, listing);

      expect(schema.shape.title).toBeDefined();
      expect(schema.shape.pubDate).toBeDefined();
    });
  });

  describe("applySchemaConfig", () => {
    it("should return base schema when no config", () => {
      const baseSchema = z.object({ title: z.string() });
      const result = applySchemaConfig(baseSchema);
      expect(result).toBe(baseSchema);
    });

    it("should apply override config", () => {
      const baseSchema = z.object({ title: z.string() });
      const override = z.object({ name: z.string() });

      const result = applySchemaConfig(baseSchema, { override });
      expect(result).toBe(override);
    });

    it("should extend base schema", () => {
      const baseSchema = z.object({ title: z.string() });
      const extend = z.object({ extra: z.number() });

      const result = applySchemaConfig(baseSchema, { extend });

      expect(result.shape.title).toBeDefined();
      expect(result.shape.extra).toBeDefined();
    });
  });
});

describe("Schema Validator", () => {
  describe("validateEntry", () => {
    it("should validate valid entry", () => {
      const schema = z.object({
        title: z.string(),
        pubDate: z.date(),
      });

      const entry = {
        title: "Test Post",
        pubDate: new Date(),
      };

      const result = validateEntry(entry, schema);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(entry);
    });

    it("should return errors for invalid entry", () => {
      const schema = z.object({
        title: z.string(),
        pubDate: z.date(),
      });

      const entry = {
        title: 123, // Should be string
        // pubDate missing
      };

      const result = validateEntry(entry as any, schema);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("should include field paths in errors", () => {
      const schema = z.object({
        title: z.string(),
      });

      const entry = { title: 123 };

      const result = validateEntry(entry as any, schema);
      expect(result.errors?.[0]?.field).toBe("title");
    });
  });
});
