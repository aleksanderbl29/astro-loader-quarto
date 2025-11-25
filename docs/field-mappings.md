# Field Mappings Guide

Comprehensive guide to field mapping in `astro-loader-quarto`.

## Overview

Field mappings allow you to seamlessly transform Quarto field names into Astro-friendly names. This is especially useful for:

- Matching existing Astro blog conventions
- Adapting to your organization's naming standards
- Renaming fields without modifying Quarto source files
- Supporting multiple collections with different naming schemes

## Default Mappings

The loader applies these mappings by default to match Astro's blog template:

| Quarto Field    | Astro Field   | Type               | Notes                    |
| --------------- | ------------- | ------------------ | ------------------------ |
| `date`          | `pubDate`     | Date               | Publication date         |
| `date-modified` | `updatedDate` | Date               | Last modified date       |
| `image`         | `heroImage`   | string             | Featured image           |
| `title`         | `title`       | string             | No change (pass-through) |
| `description`   | `description` | string             | No change (pass-through) |
| `author`        | `author`      | string \| string[] | No change (pass-through) |
| `categories`    | `categories`  | string[]           | No change (pass-through) |
| `tags`          | `tags`        | string[]           | No change (pass-through) |
| `draft`         | `draft`       | boolean            | No change (pass-through) |

### Example Transformation

**Quarto Source (.qmd):**

```yaml
---
title: "My Post"
date: "2025-11-24"
date-modified: "2025-11-24"
image: "cover.jpg"
author: "Jane Doe"
categories: ["Tech"]
---
```

**Resulting Astro Entry:**

```typescript
{
  id: "my-post",
  slug: "my-post",
  data: {
    title: "My Post",
    pubDate: Date("2025-11-24"),      // Mapped from 'date'
    updatedDate: Date("2025-11-24"),  // Mapped from 'date-modified'
    heroImage: "cover.jpg",           // Mapped from 'image'
    author: "Jane Doe",
    categories: ["Tech"]
  }
}
```

## Custom Mappings

### Basic Custom Mapping

Override default mappings or add new ones:

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "posts",
    fieldMappings: {
      date: "publishedAt", // Override default
      "date-modified": "modified", // Override default
      image: "coverImage", // Override default
    },
  }),
});
```

### Keep Original Quarto Names

To disable default mappings and keep Quarto field names:

```typescript
const docs = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "documentation",
    fieldMappings: {
      date: "date", // Keep as 'date'
      "date-modified": "date-modified", // Keep as 'date-modified'
      image: "image", // Keep as 'image'
    },
  }),
});
```

### Map Custom Quarto Fields

Map your custom Quarto fields:

```typescript
const tutorials = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "tutorials",
    fieldMappings: {
      difficulty: "level", // Custom field
      "reading-time": "readingMinutes", // Custom field
      prerequisites: "requires", // Custom field
      "video-url": "videoLink", // Custom field
    },
  }),
});
```

**Quarto Source:**

```yaml
---
title: "Advanced Tutorial"
difficulty: "advanced"
reading-time: 15
prerequisites: ["basics", "intermediate"]
video-url: "https://example.com/video.mp4"
---
```

**Result:**

```typescript
{
  data: {
    title: "Advanced Tutorial",
    level: "advanced",           // Mapped from 'difficulty'
    readingMinutes: 15,          // Mapped from 'reading-time'
    requires: ["basics", "intermediate"], // Mapped from 'prerequisites'
    videoLink: "https://example.com/video.mp4", // Mapped from 'video-url'
  }
}
```

## Multiple Collections, Different Mappings

Each collection can have its own field mappings:

```typescript
// Blog collection - uses Astro conventions
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "blog-posts",
    fieldMappings: {
      date: "pubDate",
      "date-modified": "updatedDate",
      image: "heroImage",
    },
  }),
});

// Documentation - uses different conventions
const docs = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "documentation",
    fieldMappings: {
      date: "lastModified",
      version: "docVersion",
      chapter: "section",
    },
  }),
});

// Projects - custom fields
const projects = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "projects",
    fieldMappings: {
      date: "completedDate",
      client: "clientName",
      "tech-stack": "technologies",
      "project-url": "liveUrl",
    },
  }),
});

export const collections = { blog, docs, projects };
```

## Unmapped Fields

Fields not specified in `fieldMappings` pass through with their original Quarto names:

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "posts",
    fieldMappings: {
      date: "pubDate",
    },
  }),
});
```

**Quarto:**

```yaml
---
title: "Post"
date: "2025-11-24"
custom-field: "value"
another-field: 123
---
```

**Result:**

```typescript
{
  data: {
    title: "Post",           // Pass-through
    pubDate: Date(...),      // Mapped
    "custom-field": "value", // Pass-through (original name)
    "another-field": 123,    // Pass-through (original name)
  }
}
```

## Field Mapping Conflicts

### What is a Conflict?

A conflict occurs when:

1. You map a Quarto field to a target name
2. The target name already exists in the Quarto frontmatter

**Example Conflict:**

```yaml
---
date: "2025-11-24"
pubDate: "2024-01-10" # Conflict! We want to map 'date' -> 'pubDate'
---
```

```typescript
{
  fieldMappings: {
    'date': 'pubDate',  // ERROR: pubDate already exists!
  }
}
```

### Error Handling

The loader will throw a `FieldMappingConflictError` with a clear message:

```
FieldMappingConflictError: Field mapping conflict in my-post.qmd:
Cannot map 'date' to 'pubDate' because 'pubDate' already exists in the source data.
Please choose a different mapping or remove the conflicting field.
```

### Resolving Conflicts

**Option 1:** Remove the conflicting field from Quarto source

```yaml
---
date: "2025-11-24"
# Remove pubDate
---
```

**Option 2:** Use a different mapping target

```typescript
{
  fieldMappings: {
    'date': 'publishedDate',  // Different target
  }
}
```

**Option 3:** Keep original names

```typescript
{
  fieldMappings: {
    'date': 'date',  // No mapping
  }
}
```

## Edge Cases and Solutions

### Multiple Date Fields

**Scenario:** Content has multiple date fields with different meanings

```typescript
const events = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "events",
    fieldMappings: {
      date: "publishedDate", // When published
      "event-date": "eventDate", // When event occurs
      "registration-deadline": "deadline", // Registration cutoff
    },
  }),
});
```

### Author Variations

**Scenario:** Different author field formats

```yaml
---
# Simple string
author: "John Doe"

# Array of names
author: ["John Doe", "Jane Smith"]

# Complex object (not recommended, but possible)
author:
  name: "John Doe"
  email: "john@example.com"
---
```

The loader normalizes to `string | string[]`:

```typescript
{
  fieldMappings: {
    'author': 'authors',  // Will work with both formats
  }
}
```

### Nested Fields

**Scenario:** Nested Quarto metadata

```yaml
---
seo:
  title: "SEO Title"
  description: "SEO Description"
---
```

Flatten with transform:

```typescript
{
  transform: (entry) => ({
    ...entry,
    seoTitle: entry.seo?.title,
    seoDescription: entry.seo?.description,
  });
}
```

### Array Fields

**Scenario:** Comma-separated vs array

```yaml
# Option 1: Array
tags: ["javascript", "typescript"]

# Option 2: Comma-separated string
tags: "javascript, typescript"
```

Both are normalized to `string[]` automatically.

## Type Considerations

### Mapping Affects Schema Generation

Field mappings happen **before** schema generation, so schemas use mapped names:

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "posts",
    fieldMappings: {
      date: "publishedAt",
    },
  }),
});

// In your code:
const posts = await getCollection("blog");
posts[0].data.publishedAt; // ? Correct
posts[0].data.date; // ? Wrong (field was mapped)
```

### Custom Schema with Mapped Names

Use **mapped names** in custom schemas:

```typescript
{
  fieldMappings: {
    'reading-time': 'readingMinutes',
  },
  schema: {
    extend: z.object({
      readingMinutes: z.number().min(1),  // Use mapped name!
    })
  }
}
```

## Best Practices

### 1. Be Consistent

Use the same mappings across related collections:

```typescript
const commonMappings = {
  date: "pubDate",
  "date-modified": "updatedDate",
  image: "heroImage",
};

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "blog",
    fieldMappings: commonMappings,
  }),
});

const news = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "news",
    fieldMappings: commonMappings,
  }),
});
```

### 2. Document Custom Mappings

Add comments for clarity:

```typescript
{
  fieldMappings: {
    'difficulty': 'level',        // Tutorial difficulty level
    'est-time': 'duration',        // Estimated completion time
    'prereqs': 'requirements',     // Prerequisites list
  }
}
```

### 3. Test Mappings

Verify mappings work as expected:

```typescript
import { getCollection } from "astro:content";

const posts = await getCollection("blog");
console.log(posts[0].data); // Check actual field names
```

### 4. Avoid Conflicts

Review Quarto frontmatter before adding mappings to avoid conflicts.

## Migration Guide

### Migrating from Pure Quarto

If you're migrating from a Quarto-only site:

```typescript
// Start with no mappings (keep Quarto names)
{
  fieldMappings: {
    'date': 'date',
    'image': 'image',
    // etc.
  }
}

// Then gradually adopt Astro conventions
{
  fieldMappings: {
    'date': 'pubDate',  // Start mapping
    'image': 'heroImage',
  }
}
```

### Migrating to Organization Standards

```typescript
// Phase 1: Default Astro conventions
{
  fieldMappings: DEFAULT_FIELD_MAPPINGS
}

// Phase 2: Customize for your organization
{
  fieldMappings: {
    ...DEFAULT_FIELD_MAPPINGS,
    'date': 'createdAt',      // Your standard
    'author': 'contributor',  // Your standard
  }
}
```

## Examples

See [examples.md](./examples.md) for complete working examples.
