# astro-loader-quarto

Load Quarto's pre-rendered GitHub Flavored Markdown into Astro 6 content
collections. Astro's `render(entry)` renders the content inside your own pages.

## Use the loader

Install `astro-loader-quarto` with your package manager. Use Node 22.12+ or
Node 24+ and Astro 6.

Configure your Quarto project to emit GFM into a mirrored output directory:

```yaml
# quarto/_quarto.yml
project:
  type: default
  output-dir: _rendered
  render: ["guides/**/index.qmd"]
format:
  gfm:
    toc: false
    template: body-only.template
```

Create `quarto/body-only.template` containing `$body$` to keep title/author/date
blocks in the Astro page shell. Render the project with `quarto render --to gfm`. Commit `_rendered` and its
resources when your deployment does not have Quarto installed.

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { quartoLoader } from "astro-loader-quarto";

const guides = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    outputDir: "_rendered",
    pattern: "guides/**/index.qmd",
    autoRender: false,
    assets: { strategy: "copy" },
  }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});
export const collections = { guides };
```

```astro
---
import { getCollection, render } from 'astro:content';
export async function getStaticPaths() {
  return (await getCollection('guides')).map(entry => ({
    params: { slug: entry.id }, props: { entry },
  }));
}
const { entry } = Astro.props;
const { Content } = await render(entry);
---
<article><h1>{entry.data.title}</h1><Content /></article>
```

Use a `[...slug].astro` route for nested IDs. Set an explicit `slug` in QMD
frontmatter to retain an existing public URL. The fallback ID is the source
path relative to `quartoRoot`, without `.qmd` or a terminal `/index`.
`guides/a/index.qmd` becomes `guides/a`; a root `index.qmd` becomes `index`.
Dates and Unicode in paths are preserved. Duplicate IDs fail the entire load.

Native Markdown and MDX use a separate collection with Astro's `glob()` loader.
Query both collections in your application when you want one listing. This
loader owns its entire collection store.

## Rendering and resources

The loader reads metadata from `_quarto.yml`, ancestor `_metadata.yml` or
`_metadata.yaml` files, and QMD frontmatter, in increasing precedence. Metadata
mappings run before the caller's schema. The loader calls Astro's `parseData`
and stores the result, including schema defaults and transforms.

Local Markdown images, HTML images, downloads, and `heroImage` metadata are
copied into an owned namespace under Astro's `config.publicDir`. Browser URLs
include `config.base`. Query strings and fragments survive. Relative body
resources resolve against generated GFM first, then the corresponding source
directory. Inherited hero images resolve relative to the metadata file that
introduced them. External and root-relative public URLs remain unchanged.
Absolute filesystem paths are never produced for hero images.

Relative `.qmd` crosslinks fail with an actionable error. Replace them with
public URLs, or provide `resolveLink(href, sourcePath)` returning a root-relative
or HTTP(S) URL. The resolver owns query and fragment handling. A relative link
without a matching local file requires an explicit public URL for site routes.

The supported contract is **static GFM**: text, code output, static figures,
tables, citations, and downloads. Quarto HTML widgets and local script, style,
iframe, or HTML dependency graphs are unsupported. Relative `srcset` is rejected;
use public URLs for that attribute. GFM does not preserve every Quarto HTML
feature, and this package does not load Quarto's HTML runtime.

## Development and deployment

`autoRender: true` runs Quarto before each load. The default is `false`; that
mode never invokes the Quarto CLI and works on Vercel with committed artifacts.
Your authoring workflow must render changed sources and dependencies before
committing. The loader checks output/resource existence, but cannot establish
freshness from pre-rendered artifacts alone. Use your project's provenance or
content-digest check when deployment must reject stale output.

In development, Astro's watcher triggers serialized full reconciliations on
source, rendered Markdown, metadata, and dependency changes below `quartoRoot`.
Changes during a load cause a fresh pass before publishing. A failed background
load logs the error and keeps the last successful collection; the next valid
edit retries. Deleting the final QMD removes all entries on the next successful
load. Missing output, invalid data, missing assets, and duplicate IDs fail an
initial build rather than silently dropping posts.

Copied assets have content-hashed paths. The loader leaves previous files in
its owned public namespace so an in-flight page can keep using its assets.
To reclaim unused files, remove that namespace before a fresh build. Do not put
handwritten assets inside it.

[API reference](docs/api.md) · [Field mappings](docs/field-mappings.md) ·
[Examples](docs/examples.md) · [Development setup](CONTRIBUTING.md)
