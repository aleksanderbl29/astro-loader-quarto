# Content Rendering with Astro
Jane Doe
2024-01-20

# Content Rendering

This post demonstrates how Quarto content is rendered in Astro.

## The Process

1.  Write your content in `.qmd` files
2.  Quarto renders to GitHub Flavored Markdown (`.md`)
3.  The loader reads both metadata and content
4.  Astro’s `render()` method displays the markdown

## Code Example

``` typescript
const { post } = Astro.props;
const { Content } = await post.render();
```

## Markdown Features

All standard markdown features work:

- **Bold text**
- *Italic text*
- `Code inline`
- [Links](https://astro.build)

### Code Blocks

``` javascript
function hello() {
  console.log("Hello from Quarto!");
}
```

### Lists

1.  First item
2.  Second item
3.  Third item

### Blockquotes

> This is a blockquote from Quarto content.

## Math Support

When using Quarto with math extensions, you can include:

$$
E = mc^2
$$

(Requires appropriate remark plugins in Astro)
