/**
 * Common Quarto field definitions using Zod schemas
 * Field names are Astro-friendly (after default mapping)
 */

import { z } from "zod";

/**
 * Common field schemas for Astro content collections
 * These use the mapped field names (e.g., pubDate instead of date)
 */
export const commonFields = {
  // Core content fields
  title: z.string(),
  description: z.string().optional(),

  // Author field - can be string or array
  author: z.union([z.string(), z.array(z.string())]).optional(),

  // Date fields (using Astro blog naming convention)
  pubDate: z.date(),
  updatedDate: z.date().optional(),

  // Image field (heroImage per Astro blog convention)
  heroImage: z.string().optional(),

  // Taxonomy fields
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  // Publishing control
  draft: z.boolean().default(false),
} as const;

/**
 * Base schema with all common fields
 */
export const baseSchema = z.object(commonFields);

/**
 * Minimal required schema (only title and pubDate required)
 */
export const minimalSchema = z.object({
  title: commonFields.title,
  pubDate: commonFields.pubDate,
});

/**
 * Type helper to get schema for a field name
 */
export function getFieldSchema(
  fieldName: string,
): z.ZodType<unknown> | undefined {
  return (commonFields as Record<string, z.ZodType<unknown>>)[fieldName];
}
