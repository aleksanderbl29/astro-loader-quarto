/**
 * Configuration types for Quarto Loader
 */

import type { z } from 'zod';

/**
 * Asset handling strategy
 */
export type AssetStrategy = 'reference' | 'copy' | 'symlink';

/**
 * Asset handling configuration
 */
export interface AssetConfig {
  strategy?: AssetStrategy;
  publicDir?: string;
  imageResolver?: (imagePath: string, qmdPath: string) => string;
}

/**
 * Schema configuration for validation
 */
export interface SchemaConfig {
  extend?: z.ZodObject<any>;
  override?: z.ZodObject<any>;
}

/**
 * Default field mappings from Quarto to Astro
 */
export const DEFAULT_FIELD_MAPPINGS = {
  'title': 'title',
  'description': 'description',
  'author': 'author',
  'date': 'pubDate',
  'date-modified': 'updatedDate',
  'image': 'heroImage',
  'categories': 'categories',
  'tags': 'tags',
  'draft': 'draft',
} as const;

/**
 * Field mappings type
 */
export type FieldMappings = Record<string, string>;

/**
 * Main loader configuration
 */
export interface QuartoLoaderConfig {
  /**
   * Path to Quarto project source directory
   */
  quartoRoot: string;

  /**
   * Path to rendered output directory (defaults to _site or docs)
   */
  outputDir?: string;

  /**
   * Auto-render Quarto content before loading
   */
  autoRender?: boolean | {
    command?: string;
    args?: string[];
    watch?: boolean;
  };

  /**
   * Which listing(s) to load
   * - string: Single listing ID
   * - string[]: Multiple listing IDs
   * - 'all': Load all listings
   */
  listings?: string | string[] | 'all';

  /**
   * Field mappings from Quarto field names to Astro field names
   * Defaults to match Astro's blog template convention
   */
  fieldMappings?: FieldMappings;

  /**
   * Schema customization
   */
  schema?: SchemaConfig;

  /**
   * Filter function for conditional inclusion
   * Runs after field mapping
   */
  filter?: (entry: Record<string, unknown>) => boolean | Promise<boolean>;

  /**
   * Transform function for custom processing
   * Runs after field mapping and filter
   */
  transform?: (entry: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>;

  /**
   * Asset handling configuration
   */
  assets?: AssetConfig;

  /**
   * Performance options
   */
  cache?: boolean;
  parallel?: boolean;
}

/**
 * Normalization options for metadata processing
 */
export interface NormalizationOptions {
  basePath: string;
  outputDir: string;
  fieldMappings: FieldMappings;
  slugify?: (title: string) => string;
  imageResolver?: (imagePath: string, qmdPath: string) => string;
}

