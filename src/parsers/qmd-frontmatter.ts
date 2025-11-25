/**
 * Parser for .qmd files with YAML frontmatter
 */

import { readFile } from "fs/promises";
import matter from "gray-matter";
import type { QmdDocument, ParsedMetadata } from "../types/quarto.js";
import { QmdParseError } from "../utils/errors.js";

/**
 * Parse a .qmd file and extract frontmatter
 */
export async function parseQmdFile(path: string): Promise<QmdDocument> {
  try {
    const content = await readFile(path, "utf-8");
    const { data, content: body, matter: rawFrontmatter } = matter(content);

    return {
      path,
      frontmatter: data as Record<string, unknown>,
      content: body,
      rawFrontmatter: rawFrontmatter || "",
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new QmdParseError(`File not found`, path);
    }

    throw new QmdParseError((error as Error).message, path);
  }
}

/**
 * Extract and normalize metadata from frontmatter
 */
export function extractMetadata(
  frontmatter: Record<string, unknown>,
): ParsedMetadata {
  const metadata: ParsedMetadata = {};

  // Copy all fields
  for (const [key, value] of Object.entries(frontmatter)) {
    metadata[key] = value;
  }

  // Normalize specific fields
  if (metadata.date) {
    metadata.date = normalizeDate(metadata.date);
  }

  if (metadata["date-modified"]) {
    metadata["date-modified"] = normalizeDate(metadata["date-modified"]);
  }

  if (metadata.author !== undefined) {
    metadata.author = normalizeAuthor(metadata.author);
  }

  if (metadata.categories !== undefined) {
    metadata.categories = normalizeArray(metadata.categories);
  }

  if (metadata.tags !== undefined) {
    metadata.tags = normalizeArray(metadata.tags);
  }

  if (metadata.draft !== undefined) {
    metadata.draft = Boolean(metadata.draft);
  }

  return metadata;
}

/**
 * Normalize date field to Date object
 * Supports: YYYY-MM-DD, ISO 8601, Date objects
 */
export function normalizeDate(date: unknown): Date | string {
  if (date instanceof Date) {
    return date;
  }

  if (typeof date === "string") {
    // Try to parse as date
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Return as-is if can't parse (will be caught in validation)
  return date as string;
}

/**
 * Normalize author field to string or array
 */
function normalizeAuthor(author: unknown): string | string[] {
  if (typeof author === "string") {
    return author;
  }

  if (Array.isArray(author)) {
    return author.map((a) => String(a));
  }

  return String(author);
}

/**
 * Normalize array fields
 */
function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }

  if (typeof value === "string") {
    // Handle comma-separated strings
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [String(value)];
}
