# Development

Run every project command through `devenv shell -- <command>`. The pinned shell
provides Node 22, pnpm, Quarto, and Python/Jupyter for the computational fixture.
Do not use global tools or install undeclared dependencies.

Use `pnpm install --frozen-lockfile`, `pnpm run typecheck`, `pnpm run lint`,
`pnpm test`, and `pnpm run build` inside that shell. Tests render genuine GFM
with Quarto and build an Astro 6 site. Native Markdown/MDX belongs in separate
Astro collections; this loader owns its entire collection store.
