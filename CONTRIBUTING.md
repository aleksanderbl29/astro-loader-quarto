# Develop the loader

The repository uses a pinned devenv shell. Install Nix and devenv using their
supported setup instructions, then run project tools through that shell:

```sh
devenv shell -- pnpm install --frozen-lockfile
devenv shell -- pnpm run typecheck
devenv shell -- pnpm run lint
devenv shell -- pnpm test
devenv shell -- pnpm run build
```

The shell declares Node 22, pnpm, Quarto, and Python with Jupyter/IPython.
`devenv.lock` pins the same nixpkgs lineage as the website while remaining
independent of any sibling checkout. Direnv can enter this shell via `.envrc`.
Local `.devenv`, `.direnv`, `.astro`, and test state are ignored.

`pnpm test` builds the package, executes a Python QMD cell through real Quarto,
and builds an Astro 6 fixture using `render(entry)`. It checks native MDX and
Markdown alongside Quarto, caller schema defaults/errors, emitted resources,
missing output, duplicate IDs, persisted-store deletion, and development
watcher recovery. No mocked renderer replaces the successful integration path.

The example uses committed GFM for ordinary Astro builds:

```sh
devenv shell -- pnpm --dir examples/basic-blog install --frozen-lockfile
devenv shell -- pnpm --dir examples/basic-blog run build
```

Its old R example is optional authoring content. Executing those R cells needs
an explicitly declared R environment and its packages; the loader test suite
uses the declared Python fixture instead.
