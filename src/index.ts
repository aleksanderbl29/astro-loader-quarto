/**
 * Astro Loader for Quarto content collections
 *
 * @example
 * ```typescript
 * import { defineCollection } from 'astro:content';
 * import { quartoLoader } from 'astro-loader-quarto';
 *
 * const blog = defineCollection({
 *   loader: quartoLoader({
 *     quartoRoot: './quarto',
 *     listings: 'posts',
 *   })
 * });
 *
 * export const collections = { blog };
 * ```
 */

export { quartoLoader } from "./loader.js";

// Export types
export type {
  QuartoLoaderConfig,
  QuartoConfig,
  QuartoListing,
  AssetStrategy,
  AssetConfig,
  SchemaConfig,
  FieldMappings,
  QmdDocument,
  ParsedMetadata,
  NormalizedEntry,
} from "./types/index.js";

// Export default field mappings constant
export { DEFAULT_FIELD_MAPPINGS } from "./types/index.js";

// Export error classes
export {
  QuartoLoaderError,
  QuartoConfigError,
  QmdParseError,
  FieldMappingConflictError,
  ValidationError,
  ListingNotFoundError,
} from "./types/index.js";
