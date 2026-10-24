# Loader options

`quartoLoader(options)` returns an Astro 6 object loader. The caller owns the
collection schema. No loader-level inferred schema or `schema.extend/override`
option is used.

| Option                 | Type                                              | Default and behavior                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quartoRoot`           | `string`                                          | Required. Relative to Astro `config.root`. Must contain `_quarto.yml`.                                                                                                                |
| `outputDir`            | `string`                                          | `_quarto.yml`'s `project.output-dir`, otherwise `_site`. Must be a subdirectory of `quartoRoot`.                                                                                      |
| `pattern`              | `string \| string[]`                              | Explicit QMD discovery relative to `quartoRoot`. Mutually exclusive with `listings`.                                                                                                  |
| `listings`             | `string \| string[]`                              | Root `_quarto.yml` listing IDs. Omitted or `all` selects all root listings. Directory `contents` recursively selects QMD.                                                             |
| `autoRender`           | `boolean \| object`                               | `false`. Object fields: `enabled`, `command`, `args`, `format`. Enabled rendering requires `gfm`; default command `quarto`, args `["render"]`. Output directory is passed explicitly. |
| `fieldMappings`        | `Record<string, string>`                          | Extends default aliases. Conflicting aliases fail.                                                                                                                                    |
| `filter`               | `(data) => boolean \| Promise<boolean>`           | Runs after metadata normalization, before schema parsing.                                                                                                                             |
| `transform`            | `(data) => data \| Promise<data>`                 | Runs after filtering, before schema parsing.                                                                                                                                          |
| `assets.strategy`      | `copy \| reference \| symlink`                    | `copy`. Legacy `reference` also copies local resources for portable URLs. `symlink` is rejected.                                                                                      |
| `assets.publicDir`     | `string`                                          | `quarto-assets`. Relative namespace below Astro `config.publicDir`, with a collection hash beneath it.                                                                                |
| `assets.imageResolver` | `(imagePath, qmdPath) => string`                  | Optional hero-image URL override, followed by resource publication.                                                                                                                   |
| `resolveLink`          | `(href, sourcePath) => string \| Promise<string>` | Resolves QMD crosslinks to root-relative or HTTP(S) public URLs. Without it, QMD links fail.                                                                                          |
| `cache`, `parallel`    | `boolean`                                         | Retained compatibility hints. Full reconciliation always reads fresh inputs.                                                                                                          |

Listing sort/display settings belong to Quarto's listing UI. Sort Astro results
in the application. QMD `output-file` overrides are rejected; generated Markdown
must mirror the source path with `.md` replacing `.qmd`.

The loader stores `body`, `rendered`, `digest`, the generated `filePath`, and
Astro's returned `assetImports`. It uses `renderMarkdown(body, { fileURL })` and
Astro's provided watcher. No Quarto process is started with `autoRender: false`.

See the [Astro Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/)
for the framework contract.
