import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import matter from "gray-matter";
import fg from "fast-glob";
import type { Loader, LoaderContext } from "astro/loaders";
import type { QuartoLoaderConfig } from "./types/loader-config.js";
import { inside, selectSources, sourceMetadata, yamlFile } from "./source.js";
import { assetPublisher } from "./assets.js";
import {
  normalizeAutoRenderConfig,
  renderQuarto,
} from "./utils/quarto-renderer.js";

type Entry = Parameters<LoaderContext["store"]["set"]>[0];
export function quartoLoader(options: QuartoLoaderConfig): Loader {
  let detach: (() => void) | undefined;
  return {
    name: "quarto-loader",
    async load(context) {
      detach?.();
      const root = resolve(
        fileURLToPath(context.config.root),
        options.quartoRoot,
      );
      const publicAssets = resolve(
        fileURLToPath(context.config.publicDir),
        options.assets?.publicDir ?? "quarto-assets",
      );
      if (options.assets?.strategy === "symlink")
        throw new Error(
          "assets.strategy symlink is unsupported; use copy for portable deployment.",
        );
      let revision = 0;
      let running: Promise<void> | undefined;
      let disposed = false;
      let output = resolve(root, options.outputDir ?? "_site");
      let renderArtifacts: string[] = [];
      async function prepare(): Promise<Entry[]> {
        const project = await yamlFile(join(root, "_quarto.yml"));
        const projectOptions = project.project;
        const defaultOutput =
          typeof projectOptions === "object" &&
          projectOptions !== null &&
          "output-dir" in projectOptions &&
          typeof projectOptions["output-dir"] === "string"
            ? projectOptions["output-dir"]
            : "_site";
        output = resolve(root, options.outputDir ?? defaultOutput);
        if (!inside(root, output) || output === root)
          throw new Error("outputDir must be a directory within quartoRoot.");
        const renderOptions = normalizeAutoRenderConfig(options.autoRender);
        if (renderOptions.enabled) {
          if (renderOptions.format !== "gfm")
            throw new Error("autoRender requires format gfm.");
          const sources = await fg("**/*.qmd", {
            cwd: root,
            absolute: true,
            ignore: [
              relative(root, output).split("\\").join("/") + "/**",
              ".quarto/**",
              "_freeze/**",
            ],
          });
          renderArtifacts = sources.flatMap((path) => [
            path.replace(/\.qmd$/, ".quarto_ipynb"),
            path.replace(/\.qmd$/, ".md"),
            path.replace(/\.qmd$/, ".knit.md"),
            path.replace(/\.qmd$/, ".utf8.md"),
            path.replace(/\.qmd$/, "_files"),
            path.replace(/\.qmd$/, "_cache"),
          ]);
          await renderQuarto(root, {
            ...renderOptions,
            args: [
              ...(renderOptions.args ?? ["render"]),
              "--output-dir",
              relative(root, output),
            ],
          });
        }
        const publisher = assetPublisher({
          root,
          outputDir: output,
          publicDir: fileURLToPath(context.config.publicDir),
          base: context.config.base,
          collection: context.collection,
          config: options,
        });
        const entries: Entry[] = [];
        const ids = new Map<string, string>();
        const documents = [];
        for (const { path, defaults } of await selectSources(
          options,
          root,
          project,
        )) {
          const document = await sourceMetadata(
            path,
            root,
            project,
            defaults,
            options,
          );
          const previous = ids.get(document.id);
          if (previous)
            throw new Error(
              `Duplicate ID '${document.id}': ${previous} and ${path}. Set distinct explicit slugs.`,
            );
          ids.set(document.id, path);
          documents.push({ path, document });
        }
        for (const { path, document } of documents) {
          if (options.filter && !(await options.filter(document.data)))
            continue;
          let data = options.transform
            ? await options.transform(document.data)
            : document.data;
          const hero = data.heroImage;
          if (typeof hero === "string") {
            const resolved = options.assets?.imageResolver
              ? options.assets.imageResolver(hero, path)
              : hero;
            data = {
              ...data,
              heroImage: await publisher.url(
                resolved,
                document.origins.get("heroImage") ?? dirname(path),
                path,
              ),
            };
          }
          const generated = join(
            output,
            relative(root, path).replace(/\.qmd$/, ".md"),
          );
          let body: string;
          try {
            body = matter(await readFile(generated, "utf8")).content;
          } catch (error) {
            throw new Error(
              `${path}: missing/unreadable generated GFM ${generated}. Run quarto render --to gfm and commit the output for autoRender:false. ${String(error)}`,
              { cause: error },
            );
          }
          body = await publisher.markdown(body, generated, path);
          const parsed = await context.parseData({
            id: document.id,
            data,
            filePath: path,
          });
          const rendered = await context.renderMarkdown(body, {
            fileURL: pathToFileURL(generated),
          });
          rendered.html = await publisher.html(
            rendered.html,
            dirname(generated),
            path,
          );
          entries.push({
            id: document.id,
            data: parsed,
            body,
            rendered,
            filePath: relative(fileURLToPath(context.config.root), generated),
            digest: context.generateDigest({ data: parsed, body, rendered }),
            assetImports: rendered.metadata?.imagePaths,
          });
        }
        return entries;
      }
      async function drain() {
        let seen: number;
        do {
          seen = revision;
          let entries: Entry[];
          try {
            entries = await prepare();
          } catch (error) {
            if (!disposed && seen !== revision) continue;
            throw error;
          }
          if (disposed) return;
          if (seen !== revision) continue;
          const ids = new Set(entries.map((entry) => entry.id));
          for (const entry of entries) context.store.set(entry);
          for (const id of context.store.keys())
            if (!ids.has(id)) context.store.delete(id);
        } while (seen !== revision);
      }
      function request() {
        revision++;
        if (!running)
          running = drain().finally(() => {
            running = undefined;
          });
        return running;
      }
      // Attach before the initial pass so edits during rendering invalidate it.
      const watcher = context.watcher;
      if (watcher) {
        const callback = (path: string) => {
          if (!inside(root, resolve(path))) return;
          if (
            inside(publicAssets, resolve(path)) ||
            path.split(/[\\/]/).includes(".quarto")
          )
            return;
          // Quarto's own output events must not recursively invoke autoRender.
          if (
            normalizeAutoRenderConfig(options.autoRender).enabled &&
            (inside(output, resolve(path)) ||
              inside(join(root, "_freeze"), resolve(path)) ||
              renderArtifacts.some((artifact) =>
                inside(artifact, resolve(path)),
              ))
          )
            return;
          void request().catch((error) =>
            context.logger.error(
              `Quarto reload failed; keeping previous entries: ${String(error)}`,
            ),
          );
        };
        watcher.add(root);
        for (const event of ["add", "change", "unlink", "addDir", "unlinkDir"])
          watcher.on(event, callback);
        detach = () => {
          disposed = true;
          for (const event of [
            "add",
            "change",
            "unlink",
            "addDir",
            "unlinkDir",
          ])
            watcher.off(event, callback);
        };
      }
      try {
        await request();
      } catch (error) {
        detach?.();
        throw error;
      }
    },
  };
}
