# Usage Examples

Comprehensive examples for `astro-loader-quarto`.

## Table of Contents

- [Basic Blog](#basic-blog)
- [Multiple Collections](#multiple-collections)
- [Custom Field Mappings](#custom-field-mappings)
- [Filtering Content](#filtering-content)
- [Transforming Entries](#transforming-entries)
- [Custom Schemas](#custom-schemas)
- [Asset Handling](#asset-handling)
- [Advanced Workflows](#advanced-workflows)

## Basic Blog

### Quarto Setup

```yaml
# quarto/_quarto.yml
project:
  type: website
  output-dir: _site

listing:
  - id: blog-posts
    contents: posts/*.qmd
    sort: "date desc"
    type: grid
    categories: true
```

### Astro Configuration

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

### Usage in Pages

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';
import Layout from '@/layouts/Layout.astro';

const posts = await getCollection('blog');
const sortedPosts = posts.sort((a, b) => 
  b.data.pubDate.getTime() - a.data.pubDate.getTime()
);
---

<Layout title="Blog">
  <h1>Blog Posts</h1>
  <ul>
    {sortedPosts.map(post => (
      <li>
        <a href={`/blog/${post.slug}`}>
          <h2>{post.data.title}</h2>
          <time datetime={post.data.pubDate.toISOString()}>
            {post.data.pubDate.toLocaleDateString()}
          </time>
          <p>{post.data.description}</p>
        </a>
      </li>
    ))}
  </ul>
</Layout>
```

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';
import Layout from '@/layouts/Layout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post }
  }));
}

const { post } = Astro.props;
---

<Layout title={post.data.title}>
  <article>
    {post.data.heroImage && (
      <img src={post.data.heroImage} alt={post.data.title} />
    )}
    <h1>{post.data.title}</h1>
    <div class="meta">
      <time datetime={post.data.pubDate.toISOString()}>
        {post.data.pubDate.toLocaleDateString()}
      </time>
      {post.data.author && <span>by {post.data.author}</span>}
    </div>
    {post.data.description && <p class="description">{post.data.description}</p>}
    {/* Render your content here */}
  </article>
</Layout>
```

## Multiple Collections

### Quarto Configuration

```yaml
# quarto/_quarto.yml
listing:
  - id: blog-posts
    contents: posts/*.qmd
    sort: "date desc"
  
  - id: documentation
    contents: docs/**/*.qmd
    sort: "title"
  
  - id: projects
    contents: projects/*.qmd
    sort: "date desc"
```

### Astro Configuration

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

const projects = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'projects',
    fieldMappings: {
      'date': 'completedDate',
      'client': 'clientName',
      'tech-stack': 'technologies',
    }
  })
});

export const collections = { blog, docs, projects };
```

## Custom Field Mappings

### Scenario: Custom Blog Fields

```yaml
# quarto/posts/tutorial.qmd
---
title: "Getting Started"
subtitle: "A beginner's guide"
date: "2025-11-24"
difficulty: "beginner"
reading-time: 10
prerequisites: ["basic-knowledge"]
video-url: "https://example.com/video.mp4"
---
```

```typescript
// src/content/config.ts
const tutorials = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'tutorials',
    fieldMappings: {
      'date': 'publishedAt',
      'subtitle': 'summary',
      'difficulty': 'level',
      'reading-time': 'readingMinutes',
      'prerequisites': 'requires',
      'video-url': 'videoLink',
    }
  })
});
```

## Filtering Content

### Filter Draft Posts

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    filter: (entry) => {
      // Exclude drafts
      return entry.draft !== true;
    }
  })
});
```

### Filter by Date

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    filter: (entry) => {
      // Only published posts, not scheduled for future
      const now = new Date();
      return !entry.draft && new Date(entry.pubDate) <= now;
    }
  })
});
```

### Filter by Category

```typescript
const techBlog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    filter: (entry) => {
      // Only tech-related posts
      return entry.categories?.includes('Technology');
    }
  })
});
```

### Complex Filtering

```typescript
const featured = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    filter: (entry) => {
      // Featured, published, high-quality posts
      return (
        entry.featured === true &&
        entry.draft !== true &&
        new Date(entry.pubDate) <= new Date() &&
        entry.readingTime >= 5
      );
    }
  })
});
```

### Async Filtering

```typescript
const validated = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    filter: async (entry) => {
      // Validate against external API
      const isValid = await validateContent(entry.id);
      return isValid && !entry.draft;
    }
  })
});
```

## Transforming Entries

### Add Computed Fields

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    transform: (entry) => ({
      ...entry,
      year: new Date(entry.pubDate).getFullYear(),
      month: new Date(entry.pubDate).toLocaleDateString('en', { month: 'long' }),
      excerpt: entry.description || generateExcerpt(entry.content),
    })
  })
});
```

### Process Content

```typescript
import { calculateReadingTime, extractHeadings } from './utils';

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    transform: (entry) => {
      const readingTime = calculateReadingTime(entry.content || '');
      const headings = extractHeadings(entry.content || '');
      
      return {
        ...entry,
        readingTime,
        headings,
        wordCount: (entry.content || '').split(/\s+/).length,
      };
    }
  })
});
```

### Normalize Data

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    transform: (entry) => ({
      ...entry,
      // Ensure author is always an array
      authors: Array.isArray(entry.author) ? entry.author : [entry.author],
      // Normalize tags to lowercase
      tags: entry.tags?.map(tag => tag.toLowerCase()),
      // Add default image if none provided
      heroImage: entry.heroImage || '/images/default-hero.jpg',
    })
  })
});
```

### Async Transformations

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    transform: async (entry) => {
      // Fetch additional data from API
      const authorInfo = await fetchAuthorInfo(entry.author);
      const relatedPosts = await findRelatedPosts(entry.categories);
      
      return {
        ...entry,
        authorBio: authorInfo.bio,
        authorAvatar: authorInfo.avatar,
        relatedPosts: relatedPosts.map(p => p.id),
      };
    }
  })
});
```

## Custom Schemas

### Extend Base Schema

```typescript
import { z } from 'zod';

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    schema: {
      extend: z.object({
        readingTime: z.number().min(1),
        featured: z.boolean().default(false),
        seoTitle: z.string().max(60).optional(),
        seoDescription: z.string().max(160).optional(),
      })
    }
  })
});
```

### Strict Schema

```typescript
import { z } from 'zod';

const tutorials = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'tutorials',
    schema: {
      extend: z.object({
        level: z.enum(['beginner', 'intermediate', 'advanced']),
        readingMinutes: z.number().int().positive(),
        requires: z.array(z.string()).min(1),
        videoLink: z.string().url().optional(),
      })
    }
  })
});
```

### Override Schema Completely

```typescript
import { z } from 'zod';

const custom = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'custom',
    schema: {
      override: z.object({
        // Completely custom schema
        id: z.string(),
        name: z.string(),
        value: z.number(),
        active: z.boolean(),
      })
    }
  })
});
```

## Asset Handling

### Reference Original Paths (Default)

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    assets: {
      strategy: 'reference',
    }
  })
});
```

### Custom Image Resolver

```typescript
import { basename } from 'path';

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    assets: {
      strategy: 'reference',
      imageResolver: (imagePath, qmdPath) => {
        // Move all images to /images/blog/
        return `/images/blog/${basename(imagePath)}`;
      }
    }
  })
});
```

### CDN Integration

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    assets: {
      imageResolver: (imagePath, qmdPath) => {
        // Use CDN for all images
        if (!imagePath.startsWith('http')) {
          return `https://cdn.example.com/blog/${imagePath}`;
        }
        return imagePath;
      }
    }
  })
});
```

## Advanced Workflows

### Combining Filter and Transform

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    
    // First: filter
    filter: (entry) => {
      return !entry.draft && new Date(entry.pubDate) <= new Date();
    },
    
    // Then: transform
    transform: (entry) => ({
      ...entry,
      readingTime: calculateReadingTime(entry.content),
      year: new Date(entry.pubDate).getFullYear(),
    }),
    
    // Finally: extend schema for new fields
    schema: {
      extend: z.object({
        readingTime: z.number(),
        year: z.number(),
      })
    }
  })
});
```

### Multi-Language Content

```typescript
const blogEn = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-en',
    transform: (entry) => ({
      ...entry,
      lang: 'en',
      locale: 'en-US',
    })
  })
});

const blogEs = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-es',
    transform: (entry) => ({
      ...entry,
      lang: 'es',
      locale: 'es-ES',
    })
  })
});

export const collections = { blogEn, blogEs };
```

### Paginated Collections

```astro
---
// src/pages/blog/[...page].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths({ paginate }) {
  const posts = await getCollection('blog');
  const sortedPosts = posts.sort((a, b) => 
    b.data.pubDate.getTime() - a.data.pubDate.getTime()
  );
  
  return paginate(sortedPosts, { pageSize: 10 });
}

const { page } = Astro.props;
---

<div>
  {page.data.map(post => (
    <article>
      <h2>{post.data.title}</h2>
      <!-- Post content -->
    </article>
  ))}
</div>
```

### Category Pages

```astro
---
// src/pages/categories/[category].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  
  // Get all unique categories
  const categories = [...new Set(
    posts.flatMap(post => post.data.categories || [])
  )];
  
  return categories.map(category => ({
    params: { category: category.toLowerCase() },
    props: {
      category,
      posts: posts.filter(post => 
        post.data.categories?.includes(category)
      )
    }
  }));
}

const { category, posts } = Astro.props;
---

<h1>Category: {category}</h1>
<ul>
  {posts.map(post => (
    <li><a href={`/blog/${post.slug}`}>{post.data.title}</a></li>
  ))}
</ul>
```

### RSS Feed

```typescript
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  
  return rss({
    title: 'My Blog',
    description: 'A blog built with Astro and Quarto',
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
    })),
  });
}
```

## Complete Example

See [examples/basic-blog](../examples/basic-blog) for a fully working example project.

