# API Documentation

Complete reference for `astro-loader-quarto` configuration and types.

## Main Function

### `quartoLoader(config: QuartoLoaderConfig): Loader`

Creates an Astro Loader for Quarto content.

## Configuration

### `QuartoLoaderConfig`

Main configuration interface for the loader.

```typescript
interface QuartoLoaderConfig {
  quartoRoot: string;
  outputDir?: string;
  listings?: string | string[] | 'all';
  fieldMappings?: FieldMappings;
  schema?: SchemaConfig;
  filter?: (entry: Record<string, unknown>) => boolean | Promise<boolean>;
  transform?: (entry: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>;
  assets?: AssetConfig;
  cache?: boolean;
  parallel?: boolean;
}
```

#### Properties

##### `quartoRoot` (required)

**Type:** `string`

Path to the Quarto project source directory (where `_quarto.yml` is located).

```typescript
{
  quartoRoot: './quarto'
}
```

##### `outputDir`

**Type:** `string`  
**Default:** Value from `project.output-dir` in `_quarto.yml` or `'_site'`

Path to the rendered Quarto output directory.

```typescript
{
  outputDir: '_site'
}
```

##### `listings`

**Type:** `string | string[] | 'all'`  
**Default:** All listings from `_quarto.yml`

Specifies which listing(s) to load from the Quarto project.

```typescript
// Single listing
{ listings: 'blog-posts' }

// Multiple listings
{ listings: ['blog-posts', 'tutorials'] }

// All listings
{ listings: 'all' }
```

##### `fieldMappings`

**Type:** `FieldMappings` (Record<string, string>)  
**Default:** `DEFAULT_FIELD_MAPPINGS`

Maps Quarto field names to Astro field names.

```typescript
{
  fieldMappings: {
    'date': 'publishedAt',
    'date-modified': 'updatedAt',
    'image': 'coverImage',
    'custom-field': 'mappedField'
  }
}
```

**Default Mappings:**

```typescript
const DEFAULT_FIELD_MAPPINGS = {
  'date': 'pubDate',
  'date-modified': 'updatedDate',
  'image': 'heroImage',
  'title': 'title',
  'description': 'description',
  'author': 'author',
  'categories': 'categories',
  'tags': 'tags',
  'draft': 'draft',
}
```

##### `schema`

**Type:** `SchemaConfig`

Customize the auto-generated Zod schema.

```typescript
interface SchemaConfig {
  extend?: z.ZodObject<any>;   // Merge with base schema
  override?: z.ZodObject<any>; // Replace base schema completely
}
```

**Example:**

```typescript
import { z } from 'zod';

{
  schema: {
    extend: z.object({
      readingTime: z.number().optional(),
      featured: z.boolean().default(false),
    })
  }
}
```

##### `filter`

**Type:** `(entry: Record<string, unknown>) => boolean | Promise<boolean>`

Filter function for conditional inclusion of entries. Runs after field mapping.

```typescript
{
  filter: (entry) => {
    // Only include published posts
    return !entry.draft && new Date(entry.pubDate) <= new Date();
  }
}
```

**Async Example:**

```typescript
{
  filter: async (entry) => {
    const isValid = await validateEntry(entry);
    return isValid;
  }
}
```

##### `transform`

**Type:** `(entry: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>`

Transform function for custom processing. Runs after field mapping and filter.

```typescript
{
  transform: (entry) => ({
    ...entry,
    year: new Date(entry.pubDate).getFullYear(),
    excerpt: entry.description || generateExcerpt(entry.content),
  })
}
```

**Async Example:**

```typescript
{
  transform: async (entry) => {
    const readingTime = await calculateReadingTime(entry.content);
    return { ...entry, readingTime };
  }
}
```

##### `assets`

**Type:** `AssetConfig`

Configuration for asset handling.

```typescript
interface AssetConfig {
  strategy?: 'reference' | 'copy' | 'symlink';
  publicDir?: string;
  imageResolver?: (imagePath: string, qmdPath: string) => string;
}
```

**Example:**

```typescript
{
  assets: {
    strategy: 'reference', // Default
    imageResolver: (imagePath, qmdPath) => {
      // Custom image path resolution
      return `/images/${basename(imagePath)}`;
    }
  }
}
```

##### `cache`

**Type:** `boolean`  
**Default:** `true`

Enable/disable caching of parsed files.

```typescript
{
  cache: true
}
```

##### `parallel`

**Type:** `boolean`  
**Default:** `true`

Enable/disable parallel processing of files.

```typescript
{
  parallel: true
}
```

## Types

### `FieldMappings`

```typescript
type FieldMappings = Record<string, string>;
```

Maps source field names to target field names.

### `AssetStrategy`

```typescript
type AssetStrategy = 'reference' | 'copy' | 'symlink';
```

- `'reference'`: Keep original paths (default)
- `'copy'`: Copy assets to Astro public directory
- `'symlink'`: Create symlinks to assets

## Constants

### `DEFAULT_FIELD_MAPPINGS`

Default field mappings that match Astro blog template conventions:

```typescript
export const DEFAULT_FIELD_MAPPINGS = {
  'date': 'pubDate',
  'date-modified': 'updatedDate',
  'image': 'heroImage',
  'title': 'title',
  'description': 'description',
  'author': 'author',
  'categories': 'categories',
  'tags': 'tags',
  'draft': 'draft',
} as const;
```

## Error Classes

### `QuartoLoaderError`

Base error class for all loader errors.

### `QuartoConfigError`

Thrown when Quarto configuration is invalid or cannot be parsed.

```typescript
class QuartoConfigError extends QuartoLoaderError {
  configPath?: string;
}
```

### `QmdParseError`

Thrown when a `.qmd` file cannot be parsed.

```typescript
class QmdParseError extends QuartoLoaderError {
  filePath: string;
  lineNumber?: number;
}
```

### `FieldMappingConflictError`

Thrown when a field mapping creates a conflict.

```typescript
class FieldMappingConflictError extends QuartoLoaderError {
  quartoField: string;
  mappedField: string;
  existingField: string;
  filePath: string;
}
```

### `ValidationError`

Thrown when entry validation fails.

```typescript
class ValidationError extends QuartoLoaderError {
  filePath?: string;
  errors?: Array<{ field: string; message: string }>;
}
```

### `ListingNotFoundError`

Thrown when a specified listing doesn't exist.

```typescript
class ListingNotFoundError extends QuartoLoaderError {
  listingId: string;
  availableListings: string[];
}
```

## Usage Examples

### Basic Configuration

```typescript
import { quartoLoader } from 'astro-loader-quarto';

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'posts',
  })
});
```

### Full Configuration

```typescript
import { quartoLoader } from 'astro-loader-quarto';
import { z } from 'zod';

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    outputDir: '_site',
    listings: ['posts', 'tutorials'],
    
    fieldMappings: {
      'date': 'publishedAt',
      'date-modified': 'updatedAt',
      'image': 'thumbnail',
      'reading-time': 'readingMinutes',
    },
    
    filter: (entry) => !entry.draft,
    
    transform: (entry) => ({
      ...entry,
      year: new Date(entry.publishedAt).getFullYear(),
    }),
    
    schema: {
      extend: z.object({
        year: z.number(),
        readingMinutes: z.number().optional(),
      })
    },
    
    assets: {
      strategy: 'reference',
    },
    
    cache: true,
    parallel: true,
  })
});
```

## Type Exports

All types are exported from the main package:

```typescript
import type {
  QuartoLoaderConfig,
  QuartoConfig,
  QuartoListing,
  FieldMappings,
  AssetStrategy,
  AssetConfig,
  SchemaConfig,
  // ... and more
} from 'astro-loader-quarto';
```

