# astro-loader-quarto

> THIS PROJECT IS WORK IN PROGRESS. DO NOT USE.

> Astro Loader for Quarto content collections with full type safety and field mapping

[![npm version](https://badge.fury.io/js/astro-loader-quarto.svg)](https://www.npmjs.com/package/astro-loader-quarto)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Enable your Astro projects to use [Quarto](https://quarto.org/) Listings as Content Collections through a custom Astro Loader. Author content in Quarto (`.qmd` files) and consume it seamlessly in Astro with full type safety and schema validation.

## Features

- 🚀 **Zero-config setup** - Works out of the box with sensible defaults
- 🎯 **Type-safe** - Full TypeScript support with auto-generated Zod schemas
- 🔄 **Field mapping** - Seamlessly map Quarto field names to Astro conventions
- 🎨 **Flexible** - Support for multiple listings, custom filters, and transforms
- ⚡ **Fast** - Parallel parsing with intelligent caching
- 🔥 **Hot reload** - File watching for development
- 📦 **Multiple listings** - Load different content types from one Quarto project

## Requirements

- **Astro**: 4.0 or higher (required for Loader API)
- **Quarto**: 1.3 or higher
- **Node.js**: 18 or higher

## Installation

```bash
npm install astro-loader-quarto
```

## Quick Start

### 1. Set up your Quarto project

Create a Quarto project with a listing in `_quarto.yml`:

```yaml
# quarto/_quarto.yml
project:
  type: website
  output-dir: _site

format: gfm  # REQUIRED: GitHub Flavored Markdown for Astro compatibility

listing:
  - id: blog-posts
    contents: posts/*.qmd
    sort: "date desc"
    type: grid
```

Create some `.qmd` files:

```yaml
---
# quarto/posts/my-first-post.qmd
title: "My First Post"
description: "An introduction to my blog"
author: "Jane Doe"
date: "2025-11-24"
image: "featured.jpg"
categories: ["Technology"]
tags: ["astro", "quarto"]
---

# My First Post

Your content here...
```

### 2. Configure Astro content collection

```typescript
// src/content/config.ts
import { defineCollection } from 'astro:content';
import { quartoLoader } from 'astro-loader-quarto';

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
  })
});

export const collections = { blog };
```

### 3. Render Quarto content

```bash
cd quarto && quarto render
```

### 4. Use in your Astro pages

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post }
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();  // Render markdown content
---

<article>
  {post.data.heroImage && (
    <img src={post.data.heroImage} alt={post.data.title} />
  )}
  <h1>{post.data.title}</h1>
  <time datetime={post.data.pubDate.toISOString()}>
    {post.data.pubDate.toLocaleDateString()}
  </time>
  <Content />  <!-- Rendered Quarto markdown content -->
</article>
```

## Default Field Mappings

The loader applies these mappings by default to match Astro's blog template conventions:

| Quarto Field | Astro Field | Type |
|-------------|-------------|------|
| `date` | `pubDate` | Date |
| `date-modified` | `updatedDate` | Date (optional) |
| `image` | `heroImage` | string (optional) |
| `title` | `title` | string |
| `description` | `description` | string (optional) |
| `author` | `author` | string \| string[] (optional) |
| `categories` | `categories` | string[] (optional) |
| `tags` | `tags` | string[] (optional) |
| `draft` | `draft` | boolean |

All other fields pass through with their original Quarto names.

## Custom Field Mappings

You can customize field mappings to match your needs:

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    fieldMappings: {
      'date': 'publishedAt',      // Override default
      'date-modified': 'updatedAt', // Override default
      'image': 'coverImage',        // Override default
      'reading-time': 'readingMinutes', // Custom field
    }
  })
});
```

## Advanced Usage

### Multiple Listings

Load different content types from multiple listings:

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
  })
});

const docs = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'documentation',
    fieldMappings: {
      'date': 'lastModified',
      'version': 'version',
    }
  })
});

export const collections = { blog, docs };
```

### Filtering Entries

Filter entries based on custom logic:

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    filter: (entry) => {
      // Only published posts, not in the future
      return !entry.draft && new Date(entry.pubDate) <= new Date();
    }
  })
});
```

### Transforming Entries

Add computed fields or modify entries:

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    transform: (entry) => ({
      ...entry,
      year: new Date(entry.pubDate).getFullYear(),
      excerpt: entry.description || generateExcerpt(entry.content),
    })
  })
});
```

### Custom Schema

Extend or override the auto-generated schema:

```typescript
import { z } from 'zod';

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    schema: {
      extend: z.object({
        readingTime: z.number().optional(),
        featured: z.boolean().default(false),
      })
    }
  })
});
```

## Development Workflow

### Option 1: Manual Render (Recommended)

Run Quarto and Astro separately:

```bash
# Terminal 1: Quarto preview (auto-renders on save)
cd quarto && quarto preview

# Terminal 2: Astro dev server
npm run dev
```

### Option 2: Auto-Render (Good for CI/CD)

Let the loader automatically render Quarto content:

```typescript
// src/content/config.ts
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    autoRender: true,  // Automatically runs 'quarto render'
  })
});
```

Then just run:

```bash
npm run dev
```

### Option 3: Parallel with npm-run-all

```json
{
  "scripts": {
    "dev:quarto": "cd quarto && quarto preview",
    "dev:astro": "astro dev",
    "dev": "npm-run-all --parallel dev:quarto dev:astro"
  }
}
```

## Production Build

```bash
# 1. Render Quarto content
cd quarto && quarto render && cd ..

# 2. Build Astro site
npm run build
```

## Configuration Options

See [docs/api.md](./docs/api.md) for complete API documentation.

```typescript
interface QuartoLoaderConfig {
  quartoRoot: string;              // Required: Path to Quarto project
  outputDir?: string;               // Output directory (default: _site)
  listings?: string | string[] | 'all'; // Which listing(s) to load
  fieldMappings?: FieldMappings;    // Custom field name mappings
  filter?: (entry) => boolean;      // Filter entries
  transform?: (entry) => any;       // Transform entries
  schema?: SchemaConfig;            // Schema customization
  cache?: boolean;                  // Enable caching (default: true)
  parallel?: boolean;               // Parallel processing (default: true)
}
```

## Documentation

- [API Documentation](./docs/api.md) - Complete configuration reference
- [Field Mappings Guide](./docs/field-mappings.md) - Detailed field mapping examples
- [Examples](./docs/examples.md) - More usage examples

## Example Project

See [examples/basic-blog](./examples/basic-blog) for a complete working example.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

GPL-3.0 - See [LICENSE](./LICENSE) for details.

## Acknowledgments

- Built for [Astro](https://astro.build/) and [Quarto](https://quarto.org/)
- Inspired by the need to combine scientific publishing with modern web development

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/aleksanderbl29/astro-loader-quarto/issues)
- 💬 [Discussions](https://github.com/aleksanderbl29/astro-loader-quarto/discussions)

