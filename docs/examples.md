# Configure common workflows

## Use committed output without Quarto on deployment

```ts
quartoLoader({
  quartoRoot: "./quarto",
  outputDir: "_rendered",
  pattern: "guides/**/index.qmd",
  autoRender: false,
  assets: { strategy: "copy" },
});
```

Render locally, commit the generated Markdown and resources, and run the Astro
build on deployment. Add a project-specific source/dependency digest check if
stale artifact detection is required.

## Select existing listings

```ts
quartoLoader({ quartoRoot: "./quarto", listings: ["posts", "notes"] });
```

This reads listing IDs from root `_quarto.yml`. Use `pattern` for content whose
listing is defined in a QMD page, or when no listing exists.

## Render while authoring

```ts
quartoLoader({
  quartoRoot: "./quarto",
  pattern: "posts/**/*.qmd",
  autoRender: { enabled: true, command: "quarto", args: ["render", "--quiet"] },
});
```

The authoring environment must supply the Quarto CLI and the computational
engines/packages the documents need. Keep generated output inside `quartoRoot`
and exclude it from source discovery patterns.

## Resolve QMD links

```ts
const links = new Map([
  ["../other/index.qmd#results", "/guides/other#results"],
]);
quartoLoader({
  quartoRoot: "./quarto",
  pattern: "guides/**/index.qmd",
  resolveLink(href, sourcePath) {
    const publicURL = links.get(href);
    if (!publicURL)
      throw new Error(`No public URL for ${href} in ${sourcePath}`);
    return publicURL;
  },
});
```

Use a separate `glob()` collection for native Markdown and MDX. Query both
collections to build a shared index or feed, and check IDs for collisions in
that application-level union.
