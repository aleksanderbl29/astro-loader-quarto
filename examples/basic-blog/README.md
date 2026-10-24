# Basic Quarto blog

Run from the repository root after building the loader:

```sh
devenv shell -- pnpm --dir examples/basic-blog install --frozen-lockfile
devenv shell -- pnpm --dir examples/basic-blog run build
devenv shell -- pnpm --dir examples/basic-blog run dev
```

The example consumes committed `_site` GFM without invoking Quarto. Its caller
schema is in `src/content.config.ts`, and article pages call Astro's
`render(entry)`. The retained R source is optional authoring material; executing
it requires a declared R environment with its packages. The root integration
tests exercise computational content with the declared Python/Jupyter shell.

Set an explicit `slug` when a post needs an ID independent of its source path.
The default includes the path below `quartoRoot`, for example
`posts/2025-11-24-welcome`.
