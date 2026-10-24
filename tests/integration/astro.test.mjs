import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const repo = process.cwd();
const cli = join(repo, "node_modules/astro/bin/astro.mjs");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=",
  "base64",
);
const qmd = `---
title: Computed guide
slug: computed
date: 2025-01-02
---

## Actual computation

\`\`\`{python}
from IPython.display import display, Image
import base64
print("COMPUTED", sum(range(10)))
display(Image(data=base64.b64decode("${png.toString("base64")}")))
\`\`\`

![Markdown image](manual.png?size=1#markdown)

<img src="manual.png?raw=1#html" alt="Raw image">

[Download data](data.csv?download=1#sample)
`;
let site;
const build = () =>
  exec(process.execPath, [cli, "build", "--root", site], {
    cwd: repo,
    maxBuffer: 4e6,
  });
const quarto = () =>
  exec("quarto", ["render", "--to", "gfm"], {
    cwd: join(site, "quarto"),
    maxBuffer: 4e6,
  });
const write = async (path, content) => {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, content);
};
async function errorFromBuild() {
  try {
    await build();
    throw new Error("Expected Astro build failure");
  } catch (error) {
    return `${error.stdout ?? ""}\n${error.stderr ?? ""}\n${error.message}`;
  }
}
async function inventory(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await inventory(path)));
    else found.push(path);
  }
  return found;
}
beforeAll(async () => {
  await mkdir(join(repo, "tests/.work"), { recursive: true });
  site = await mkdtemp(join(repo, "tests/.work/site-"));
  await write(
    join(site, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: { astro: "6.0.4", "@astrojs/mdx": "5.0.0" },
    }),
  );
  await write(
    join(site, "astro.config.mjs"),
    `import { defineConfig } from 'astro/config'; import mdx from '@astrojs/mdx'; export default defineConfig({base:'/journal', integrations:[mdx()], vite:{server:{watch:{usePolling:true,interval:80}}}});`,
  );
  await write(
    join(site, "src/content.config.ts"),
    `import {defineCollection,z} from 'astro:content'; import {glob} from 'astro/loaders'; import {quartoLoader} from '${join(repo, "dist/index.js")}';
export const collections={guides:defineCollection({loader:quartoLoader({quartoRoot:'./quarto',outputDir:'_rendered',pattern:'guides/**/index.qmd',autoRender:false,assets:{strategy:'copy'}}),schema:z.object({title:z.string(),author:z.string(),pubDate:z.date(),heroImage:z.string(),draft:z.boolean().default(false),custom:z.string().default('SCHEMA DEFAULT')})}), native:defineCollection({loader:glob({base:'./src/native',pattern:'**/*.{md,mdx}'}),schema:z.object({title:z.string()})})};`,
  );
  await write(
    join(site, "src/pages/index.astro"),
    `---
import {getCollection, render} from 'astro:content';
const entries=[...await getCollection('guides'),...await getCollection('native')];
const rendered=await Promise.all(entries.map(async entry=>({entry, ...await render(entry)})));
---
<html><body>{rendered.map(({entry,Content})=><article data-id={entry.id}><h1>{entry.data.title}</h1><p>{entry.data.author} {entry.data.custom}</p><img class="hero" src={entry.data.heroImage}/><Content/></article>)}</body></html>`,
  );
  await write(
    join(site, "src/native/component.mdx"),
    '---\ntitle: Native MDX\n---\nimport Component from "../components/Example.astro";\n\n<Component/>',
  );
  await write(
    join(site, "src/components/Example.astro"),
    "<p>NATIVE COMPONENT</p>",
  );
  await write(
    join(site, "src/native/plain.md"),
    "---\ntitle: Native markdown\n---\nORDINARY MARKDOWN",
  );
  await write(
    join(site, "quarto/_quarto.yml"),
    'project:\n  type: default\n  output-dir: _rendered\n  render: ["guides/**/index.qmd"]\nformat:\n  gfm:\n    toc: false\n    template: body-only.template\njupyter: python3\nexecute:\n  cache: false\nauthor: Root Author\n',
  );
  await write(join(site, "quarto/body-only.template"), "$body$\n");
  await write(
    join(site, "quarto/guides/_metadata.yml"),
    "author: Inherited Author\nimage: cover.png\n",
  );
  await write(join(site, "quarto/guides/cover.png"), png);
  await write(join(site, "quarto/guides/sample/index.qmd"), qmd);
  await write(join(site, "quarto/guides/sample/manual.png"), png);
  await write(join(site, "quarto/guides/sample/data.csv"), "a,b\n1,2\n");
  await quarto();
}, 120000);
afterAll(async () => {
  if (site) await rm(site, { recursive: true, force: true });
});

describe.sequential("real Quarto → Astro 6 render(entry)", () => {
  it("executes Python, applies schema defaults/inheritance and publishes Markdown/HTML/download/hero assets with base and suffixes", async () => {
    const renderedGfm = await readFile(
      join(site, "quarto/_rendered/guides/sample/index.md"),
      "utf8",
    );
    expect(renderedGfm).toContain("COMPUTED 45");
    expect(renderedGfm).not.toContain("# Computed guide");
    await build();
    const html = await readFile(join(site, "dist/index.html"), "utf8");
    for (const expected of [
      "COMPUTED 45",
      "SCHEMA DEFAULT",
      "Inherited Author",
      "NATIVE COMPONENT",
      "ORDINARY MARKDOWN",
      'data-id="computed"',
      'id="actual-computation"',
    ])
      expect(html).toContain(expected);
    expect(html).not.toContain(site);
    expect(html).toContain("?size=1#markdown");
    expect(html).toContain("?raw=1#html");
    expect(html).toContain("?download=1#sample");
    const urls = [
      ...html.matchAll(/(?:src|href)="(\/journal\/quarto-assets\/[^\"]+)"/g),
    ].map((m) => m[1]);
    expect(urls.length).toBeGreaterThanOrEqual(5);
    for (const url of urls)
      expect(
        await readFile(
          join(
            site,
            "dist",
            decodeURIComponent(url.replace("/journal/", "").split(/[?#]/)[0]),
          ),
        ),
      ).not.toHaveLength(0);
    expect(
      (await inventory(join(site, "dist/quarto-assets"))).some((p) =>
        p.endsWith("data.csv"),
      ),
    ).toBe(true);
  }, 120000);
  it("fails the build on caller schema errors", async () => {
    const source = join(site, "quarto/guides/sample/index.qmd");
    await writeFile(source, qmd.replace("title: Computed guide", "title: 123"));
    expect(await errorFromBuild()).toMatch(
      /title|Expected string|expected string/,
    );
    await writeFile(source, qmd);
  }, 60000);
  it("fails missing GFM rather than producing an empty body", async () => {
    const md = join(site, "quarto/_rendered/guides/sample/index.md");
    const content = await readFile(md);
    await rm(md);
    expect(await errorFromBuild()).toContain(
      "missing/unreadable generated GFM",
    );
    await writeFile(md, content);
  }, 60000);
  it("fails duplicates before publishing a partial inventory", async () => {
    await write(join(site, "quarto/guides/duplicate/index.qmd"), qmd);
    expect(await errorFromBuild()).toContain("Duplicate ID 'computed'");
    await rm(join(site, "quarto/guides/duplicate"), { recursive: true });
  }, 60000);
  it("reconciles persisted store after deleting the final source", async () => {
    const source = join(site, "quarto/guides/sample/index.qmd");
    await rm(source);
    await build();
    const html = await readFile(join(site, "dist/index.html"), "utf8");
    expect(html).not.toContain('data-id="computed"');
    expect(html).toContain("NATIVE COMPONENT");
    await writeFile(source, qmd);
  }, 60000);
  it("optionally auto-renders real Quarto into the configured output directory", async () => {
    const configPath = join(site, "src/content.config.ts");
    const original = await readFile(configPath, "utf8");
    try {
      await writeFile(
        configPath,
        original.replace("autoRender:false", "autoRender:true"),
      );
      await rm(join(site, "quarto/_rendered"), {
        recursive: true,
        force: true,
      });
      await build();
      expect(await readFile(join(site, "dist/index.html"), "utf8")).toContain(
        "COMPUTED 45",
      );
    } finally {
      await writeFile(configPath, original);
    }
  }, 120000);
  it("watches add/edit/delete/metadata and recovers after a failed reload", async () => {
    let log = "";
    const server = spawn(
      process.execPath,
      [cli, "dev", "--root", site, "--host", "127.0.0.1", "--port", "4439"],
      { cwd: repo, stdio: ["ignore", "pipe", "pipe"] },
    );
    server.stdout.on("data", (d) => {
      log += d;
    });
    server.stderr.on("data", (d) => {
      log += d;
    });
    async function waitFor(check) {
      const deadline = Date.now() + 40000;
      while (Date.now() < deadline) {
        try {
          const html = await (
            await fetch("http://127.0.0.1:4439/journal/")
          ).text();
          if (check(html)) return html;
        } catch {}
        await new Promise((r) => setTimeout(r, 150));
      }
      throw new Error(`Dev state did not converge. ${log.slice(-6000)}`);
    }
    try {
      await waitFor((html) => html.includes("COMPUTED 45"));
      await write(
        join(site, "quarto/_rendered/guides/added/index.md"),
        "## Watched add\n\nADDED BODY",
      );
      await write(
        join(site, "quarto/guides/added/index.qmd"),
        "---\ntitle: Added\ndate: 2025-01-02\n---\n",
      );
      await waitFor((html) => html.includes("ADDED BODY"));
      await write(
        join(site, "quarto/_rendered/guides/added/index.md"),
        "## Watched edit\n\nEDITED BODY",
      );
      await waitFor((html) => html.includes("EDITED BODY"));
      await write(
        join(site, "quarto/guides/_metadata.yml"),
        "author: Changed Author\nimage: cover.png\n",
      );
      await waitFor((html) => html.includes("Changed Author"));
      const current = await waitFor((html) => html.includes("Raw image"));
      const assetURL = current.match(/src="([^\"]+\?raw=1#html)"/)[1];
      await write(
        join(site, "quarto/guides/sample/manual.png"),
        Buffer.concat([png, Buffer.from("changed")]),
      );
      await waitFor(
        (html) => html.includes("Raw image") && !html.includes(assetURL),
      );
      const generated = join(site, "quarto/_rendered/guides/added/index.md");
      await rm(generated);
      const missingDeadline = Date.now() + 10000;
      while (
        !log.includes("missing/unreadable generated GFM") &&
        Date.now() < missingDeadline
      )
        await new Promise((r) => setTimeout(r, 100));
      expect(log).toContain("missing/unreadable generated GFM");
      await write(generated, "## Recovered output\n\nRECOVERED OUTPUT");
      await waitFor((html) => html.includes("RECOVERED OUTPUT"));
      log = "";
      await write(
        join(site, "quarto/guides/added/index.qmd"),
        "---\ntitle: 123\ndate: 2025-01-02\n---\n",
      );
      const failureDeadline = Date.now() + 10000;
      while (
        !log.includes("Quarto reload failed") &&
        Date.now() < failureDeadline
      )
        await new Promise((r) => setTimeout(r, 100));
      expect(log).toContain("Quarto reload failed");
      expect(log).toContain("title");
      await waitFor((html) => html.includes("RECOVERED OUTPUT"));
      await write(
        join(site, "quarto/guides/added/index.qmd"),
        "---\ntitle: Recovered\nslug: recovered\ndate: 2025-01-02\n---\n",
      );
      await waitFor((html) => html.includes('data-id="recovered"'));
      await rm(join(site, "quarto/guides/added/index.qmd"));
      await waitFor(
        (html) =>
          !html.includes("RECOVERED OUTPUT") && html.includes("COMPUTED 45"),
      );
      await rm(join(site, "quarto/guides/sample/index.qmd"));
      await waitFor(
        (html) =>
          !html.includes("COMPUTED 45") && html.includes("NATIVE COMPONENT"),
      );
    } finally {
      if (server.exitCode === null && server.signalCode === null) {
        server.kill("SIGTERM");
        await new Promise((r) => server.once("exit", r));
      }
    }
  }, 120000);
  it("watches actual auto-rendered computational edits and coalesces later metadata edits", async () => {
    const configPath = join(site, "src/content.config.ts");
    const original = await readFile(configPath, "utf8");
    await writeFile(
      configPath,
      original.replace("autoRender:false", "autoRender:true"),
    );
    await write(join(site, "quarto/guides/sample/index.qmd"), qmd);
    let log = "";
    const server = spawn(
      process.execPath,
      [cli, "dev", "--root", site, "--host", "127.0.0.1", "--port", "4439"],
      { cwd: repo, stdio: ["ignore", "pipe", "pipe"] },
    );
    server.stdout.on("data", (data) => {
      log += data;
    });
    server.stderr.on("data", (data) => {
      log += data;
    });
    async function waitFor(check) {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        try {
          const response = await fetch("http://127.0.0.1:4439/journal/");
          const html = await response.text();
          if (response.ok && check(html)) return html;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      throw new Error(
        `Auto-render dev state did not converge. ${log.slice(-6000)}`,
      );
    }
    try {
      await waitFor((html) => html.includes("COMPUTED 45"));
      await write(
        join(site, "quarto/guides/sample/index.qmd"),
        qmd.replace("sum(range(10))", "sum(range(11))"),
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      await write(
        join(site, "quarto/guides/_metadata.yml"),
        "author: Latest Author\nimage: cover.png\n",
      );
      await waitFor(
        (html) =>
          html.includes("COMPUTED 55") &&
          html.includes("Latest Author") &&
          html.includes("NATIVE COMPONENT"),
      );
      expect(log).not.toContain("Quarto reload failed");
    } finally {
      if (server.exitCode === null && server.signalCode === null) {
        server.kill("SIGTERM");
        await new Promise((resolve) => server.once("exit", resolve));
      }
      await writeFile(configPath, original);
    }
  }, 120000);
  it("ignores knitr cache and intermediate files during R auto-rendering", async () => {
    const configPath = join(site, "src/content.config.ts");
    const projectPath = join(site, "quarto/_quarto.yml");
    const originalConfig = await readFile(configPath, "utf8");
    const originalProject = await readFile(projectPath, "utf8");
    await writeFile(
      configPath,
      originalConfig.replace("autoRender:false", "autoRender:true"),
    );
    await writeFile(
      projectPath,
      originalProject.replace("jupyter: python3\n", ""),
    );
    const source = join(site, "quarto/guides/sample/index.qmd");
    const document = `---
title: R cache guide
slug: computed
date: 2025-01-02
execute:
  cache: true
---

\`\`\`{r}
cat("R-COMPUTED", sum(1:10))
\`\`\`
`;
    await writeFile(source, document);
    let log = "";
    const server = spawn(
      process.execPath,
      [cli, "dev", "--root", site, "--host", "127.0.0.1", "--port", "4439"],
      { cwd: repo, stdio: ["ignore", "pipe", "pipe"] },
    );
    server.stdout.on("data", (data) => {
      log += data;
    });
    server.stderr.on("data", (data) => {
      log += data;
    });
    async function waitFor(text) {
      const deadline = Date.now() + 40000;
      while (Date.now() < deadline) {
        try {
          const response = await fetch("http://127.0.0.1:4439/journal/");
          if (response.ok && (await response.text()).includes(text)) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw new Error(`R auto-render did not converge: ${log.slice(-6000)}`);
    }
    try {
      await waitFor("R-COMPUTED 55");
      expect(
        (await readdir(join(site, "quarto/guides/sample/index_cache"))).length,
      ).toBeGreaterThan(0);
      await writeFile(source, document.replace("1:10", "1:11"));
      await waitFor("R-COMPUTED 66");
      expect(log).not.toContain("Quarto reload failed");
    } finally {
      if (server.exitCode === null && server.signalCode === null) {
        server.kill("SIGTERM");
        await new Promise((resolve) => server.once("exit", resolve));
      }
      await writeFile(configPath, originalConfig);
      await writeFile(projectPath, originalProject);
    }
  }, 120000);
});
