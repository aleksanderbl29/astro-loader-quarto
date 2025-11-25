/**
 * Parser for Quarto listing configurations
 */

import { join } from "path";
import fg from "fast-glob";
import type { QuartoListing, ResolvedListing } from "../types/quarto.js";

/**
 * Resolve listing content paths to actual .qmd files
 */
export async function resolveListingFiles(
  listing: QuartoListing,
  basePath: string,
): Promise<string[]> {
  const contents = Array.isArray(listing.contents)
    ? listing.contents
    : [listing.contents];

  const allFiles: string[] = [];

  for (const pattern of contents) {
    // Normalize pattern - ensure it's relative to basePath
    const globPattern = pattern.replace(/^\//, "");
    const searchPath = join(basePath, globPattern);

    // Find matching files
    const files = await fg(searchPath, {
      cwd: basePath,
      absolute: true,
      onlyFiles: true,
    });

    allFiles.push(...files);
  }

  // Remove duplicates
  return [...new Set(allFiles)];
}

/**
 * Extract listing-level defaults for field inheritance
 */
export function extractListingDefaults(
  listing: QuartoListing,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  // Common fields that can be set at listing level
  const defaultFields = [
    "author",
    "categories",
    "date-format",
    "image",
    "image-height",
  ];

  for (const field of defaultFields) {
    if (field in listing && listing[field] !== undefined) {
      defaults[field] = listing[field];
    }
  }

  return defaults;
}

/**
 * Resolve a listing with matched files and defaults
 */
export async function resolveListing(
  listing: QuartoListing,
  basePath: string,
): Promise<ResolvedListing> {
  const files = await resolveListingFiles(listing, basePath);
  const defaults = extractListingDefaults(listing);

  return {
    listing,
    files,
    defaults,
  };
}

/**
 * Apply listing sort configuration to entries
 */
export function applySortConfiguration<T extends Record<string, unknown>>(
  entries: T[],
  sortConfig?: string | string[],
): T[] {
  if (!sortConfig) {
    return entries;
  }

  const sorts = Array.isArray(sortConfig) ? sortConfig : [sortConfig];

  return [...entries].sort((a, b) => {
    for (const sortField of sorts) {
      const [field, direction] = sortField.split(" ");
      const desc = direction?.toLowerCase() === "desc";

      const aVal = a[field!];
      const bVal = b[field!];

      // Handle undefined values
      if (aVal === undefined && bVal === undefined) continue;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      }

      if (comparison !== 0) {
        return desc ? -comparison : comparison;
      }
    }

    return 0;
  });
}
