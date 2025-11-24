/**
 * TypeScript types for Quarto structures
 */

/**
 * Quarto project configuration from _quarto.yml
 */
export interface QuartoConfig {
  project?: {
    type?: string;
    'output-dir'?: string;
  };
  website?: {
    title?: string;
    navbar?: unknown;
    sidebar?: unknown;
  };
  listing?: QuartoListing | QuartoListing[];
  [key: string]: unknown;
}

/**
 * Quarto listing configuration
 */
export interface QuartoListing {
  id: string;
  contents: string | string[];
  type?: 'default' | 'table' | 'grid';
  sort?: string | string[];
  'sort-ui'?: boolean | string[];
  'filter-ui'?: boolean | string[];
  categories?: boolean | 'numbered' | 'unnumbered';
  fields?: string[];
  'field-display-names'?: Record<string, string>;
  'field-required'?: string[];
  date?: string;
  image?: string;
  'image-height'?: string;
  'max-items'?: number;
  'page-size'?: number;
  [key: string]: unknown;
}

/**
 * Parsed .qmd document with frontmatter
 */
export interface QmdDocument {
  path: string;
  frontmatter: Record<string, unknown>;
  content: string;
  rawFrontmatter: string;
}

/**
 * Parsed metadata from Quarto document frontmatter
 */
export interface ParsedMetadata {
  // Standard Quarto fields
  title?: string;
  description?: string;
  author?: string | string[];
  date?: string | Date;
  'date-modified'?: string | Date;
  image?: string;
  categories?: string[];
  tags?: string[];
  draft?: boolean;

  // Listing-specific
  listing?: string | string[];

  // Custom fields
  [key: string]: unknown;
}

/**
 * Normalized entry ready for Astro content collection
 */
export interface NormalizedEntry extends Record<string, unknown> {
  id: string;
  slug: string;
  data: Record<string, unknown>;
}

/**
 * Resolved listing with matched files
 */
export interface ResolvedListing {
  listing: QuartoListing;
  files: string[];
  defaults: Record<string, unknown>;
}

