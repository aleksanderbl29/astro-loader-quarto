# Working with Custom Fields
Jane Doe
2025-11-24

# Custom Fields

This post includes custom fields that can be mapped and used in your
Astro site.

## Custom Metadata

- **Reading Time**: 5 minutes
- **Difficulty**: Intermediate

These custom fields can be:

1.  Passed through with their original names
2.  Mapped to different names in your Astro configuration
3.  Used in filters and transforms
4.  Validated with custom schemas

## Example Configuration

``` typescript
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: './quarto',
    listings: 'blog-posts',
    fieldMappings: {
      'reading-time': 'readingMinutes',
      'difficulty': 'level',
    }
  })
});
```

Now your Astro pages can access these as `readingMinutes` and `level`!
