# Astro + Quarto Blog Example

A working example demonstrating how to use `astro-loader-quarto` to build a blog with Quarto content and Astro.

## Project Structure

```
basic-blog/
├── quarto/                   # Quarto source
│   ├── _quarto.yml          # Quarto configuration
│   └── posts/               # Blog posts in .qmd format
├── src/
│   ├── content/
│   │   └── config.ts        # Astro content collection config
│   └── pages/
│       ├── index.astro      # Blog index
│       └── blog/
│           └── [...slug].astro  # Individual post pages
├── astro.config.mjs
└── package.json
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Render Quarto content:

```bash
cd quarto
quarto render
cd ..
```

Note: This step is required because autoRender is disabled by default. The Quarto project is configured with `format: gfm` to generate GitHub Flavored Markdown that Astro can render.

3. Start Astro dev server:

```bash
npm run dev
```

## Development Workflow

### Option 1: Separate Terminals

```bash
# Terminal 1: Quarto preview
npm run dev:quarto

# Terminal 2: Astro dev
npm run dev
```

### Option 2: Manual Render

```bash
# Render Quarto when needed
cd quarto && quarto render && cd ..

# Run Astro dev
npm run dev
```

## Building for Production

```bash
npm run build
```

This will:
1. Render Quarto content with `quarto render quarto`
2. Build the Astro site with `astro build`

## Features Demonstrated

- ✅ Basic Quarto → Astro integration
- ✅ Default field mappings (`date` → `pubDate`, etc.)
- ✅ Multiple authors support
- ✅ Categories and tags
- ✅ Custom fields
- ✅ Draft filtering
- ✅ Type-safe content collections

## Customization

### Change Field Mappings

Edit `src/content/config.ts`:

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    fieldMappings: {
      'date': 'publishedAt',      // Custom mapping
      'reading-time': 'duration',  // Map custom field
    }
  })
});
```

### Add Filtering

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    filter: (entry) => {
      // Only published, not in future
      return !entry.draft && new Date(entry.pubDate) <= new Date();
    }
  })
});
```

### Add Transforms

```typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    transform: (entry) => ({
      ...entry,
      year: new Date(entry.pubDate).getFullYear(),
    })
  })
});
```

## Learn More

- [Main Documentation](../../README.md)
- [API Reference](../../docs/api.md)
- [Field Mappings Guide](../../docs/field-mappings.md)
- [More Examples](../../docs/examples.md)

