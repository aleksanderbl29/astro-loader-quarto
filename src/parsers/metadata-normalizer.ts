/**
 * Metadata normalizer with field mapping and conflict detection
 */

import { basename, dirname, join } from 'path';
import type { ParsedMetadata, NormalizedEntry } from '../types/quarto.js';
import type { NormalizationOptions, FieldMappings } from '../types/loader-config.js';
import { DEFAULT_FIELD_MAPPINGS } from '../types/loader-config.js';
import { FieldMappingConflictError } from '../utils/errors.js';

/**
 * Apply field mappings to metadata
 * Throws FieldMappingConflictError if a mapped field name already exists
 */
export function applyFieldMappings(
  metadata: Record<string, unknown>,
  mappings: FieldMappings,
  filePath: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const appliedMappings = new Set<string>();
  
  for (const [key, value] of Object.entries(metadata)) {
    const mappedKey = mappings[key];
    
    if (mappedKey && mappedKey !== key) {
      // Check for conflict: mapped name already exists in source
      if (key !== mappedKey && metadata[mappedKey] !== undefined) {
        throw new FieldMappingConflictError(key, mappedKey, mappedKey, filePath);
      }
      
      result[mappedKey] = value;
      appliedMappings.add(key);
    } else {
      // Pass through unmapped fields
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Merge field mappings with defaults
 */
export function mergeFieldMappings(custom?: FieldMappings): FieldMappings {
  if (!custom) {
    return { ...DEFAULT_FIELD_MAPPINGS };
  }
  
  // Start with defaults, then apply custom mappings
  return { ...DEFAULT_FIELD_MAPPINGS, ...custom };
}

/**
 * Inherit listing-level defaults into entry metadata
 * Only applies defaults for fields that are undefined in the entry
 */
export function inheritListingDefaults(
  metadata: Record<string, unknown>,
  defaults: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...metadata };
  
  for (const [key, value] of Object.entries(defaults)) {
    if (result[key] === undefined) {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Generate a slug from filename or title
 */
export function generateSlug(
  filePath: string,
  title?: string,
  slugify?: (title: string) => string
): string {
  if (slugify && title) {
    return slugify(title);
  }
  
  // Use filename without extension
  const filename = basename(filePath, '.qmd');
  
  // Remove date prefix if present (e.g., "2025-11-24-my-post" -> "my-post")
  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  
  // Convert to lowercase and replace spaces/special chars
  return slug
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolve image path based on asset strategy
 */
export function resolveImagePath(
  imagePath: string | undefined,
  qmdPath: string,
  options: NormalizationOptions
): string | undefined {
  if (!imagePath) {
    return undefined;
  }
  
  // Use custom resolver if provided
  if (options.imageResolver) {
    return options.imageResolver(imagePath, qmdPath);
  }
  
  // Default: Return relative path from qmdPath
  // For absolute URLs, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // For relative paths, resolve relative to the .qmd file location
  if (!imagePath.startsWith('/')) {
    const qmdDir = dirname(qmdPath);
    return join(qmdDir, imagePath);
  }
  
  return imagePath;
}

/**
 * Normalize metadata and apply all transformations
 */
export function normalizeMetadata(
  raw: ParsedMetadata,
  filePath: string,
  options: NormalizationOptions,
  listingDefaults?: Record<string, unknown>
): NormalizedEntry {
  // 1. Inherit listing defaults first
  let metadata = listingDefaults 
    ? inheritListingDefaults(raw as Record<string, unknown>, listingDefaults)
    : { ...raw };
  
  // 2. Apply field mappings
  metadata = applyFieldMappings(metadata, options.fieldMappings, filePath);
  
  // 3. Resolve image path (after mapping, so we check the mapped field)
  const imageFieldName = options.fieldMappings['image'] || 'image';
  if (metadata[imageFieldName]) {
    metadata[imageFieldName] = resolveImagePath(
      metadata[imageFieldName] as string,
      filePath,
      options
    );
  }
  
  // 4. Generate ID and slug
  const id = generateSlug(filePath, metadata.title as string | undefined, options.slugify);
  const slug = id;
  
  // 5. Ensure draft field exists
  if (metadata.draft === undefined) {
    metadata.draft = false;
  }
  
  return {
    id,
    slug,
    data: metadata,
  };
}


