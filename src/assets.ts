import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parseFragment, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkStringify from "remark-stringify";
import { visit } from "unist-util-visit";
import type { QuartoLoaderConfig } from "./types/loader-config.js";
import { inside } from "./source.js";

type HtmlNode = DefaultTreeAdapterMap["node"];
export function assetPublisher(options: {
  root: string;
  outputDir?: string;
  publicDir: string;
  base: string;
  collection: string;
  config: QuartoLoaderConfig;
}) {
  const namespace = options.config.assets?.publicDir ?? "quarto-assets";
  if (
    !namespace ||
    namespace.split("/").some((p) => !p || p === ".." || p === ".") ||
    namespace.includes("\\")
  )
    throw new Error("assets.publicDir must be a relative public namespace.");
  const owner = createHash("sha256")
    .update(options.collection)
    .digest("hex")
    .slice(0, 16);
  async function url(
    href: string,
    baseDir: string,
    source: string,
    kind: "resource" | "link" = "resource",
  ): Promise<string> {
    if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(href)) return href;
    const suffixAt = href.search(/[?#]/);
    const path = suffixAt === -1 ? href : href.slice(0, suffixAt);
    const suffix = suffixAt === -1 ? "" : href.slice(suffixAt);
    const decoded = decodeURIComponent(path);
    if (/\.qmd$/i.test(decoded)) {
      if (!options.config.resolveLink)
        throw new Error(
          `${source}: unresolved QMD link '${href}'. Use an explicit public URL or configure resolveLink(href, sourcePath).`,
        );
      const result = await options.config.resolveLink(href, source);
      if (
        !/^(?:https?:\/\/|\/)/.test(result) ||
        /\.qmd(?:[?#]|$)/i.test(result)
      )
        throw new Error(
          `${source}: resolveLink must return a public URL for ${href}`,
        );
      return result;
    }
    if (href.startsWith("/")) return href;
    if (!decoded) return href;
    if (/\.(?:html?|js|css)$/i.test(decoded))
      throw new Error(
        `${source}: local HTML/script/style dependency '${href}' is outside static GFM support; publish it separately and use an absolute URL.`,
      );
    let file = resolve(baseDir, decoded);
    let bytes: Buffer;
    try {
      let actual: string;
      try {
        actual = await realpath(file);
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          ) ||
          !options.outputDir ||
          !inside(options.outputDir, baseDir)
        )
          throw error;
        file = resolve(
          options.root,
          relative(options.outputDir, baseDir),
          decoded,
        );
        actual = await realpath(file);
      }
      if (!inside(options.root, actual))
        throw new Error("resource escapes quartoRoot");
      bytes = await readFile(actual);
    } catch (error) {
      throw new Error(
        `${source}: missing or unsafe relative resource '${href}' (resolved ${file}): ${String(error)}${kind === "link" ? "; use an explicit public URL for site routes" : ""}`,
        { cause: error },
      );
    }
    const hash = createHash("sha256").update(bytes).digest("hex");
    const name = basename(file);
    const resource = `${namespace}/${owner}/${hash}/${name}`;
    const destination = join(options.publicDir, resource);
    await mkdir(dirname(destination), { recursive: true });
    try {
      await writeFile(destination, bytes, { flag: "wx" });
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "EEXIST")
      )
        throw error;
    }
    return `${options.base.replace(/\/$/, "")}/${resource.split("/").map(encodeURIComponent).join("/")}${suffix}`;
  }
  async function html(
    content: string,
    base: string,
    source: string,
  ): Promise<string> {
    const tree = parseFragment(content);
    async function walk(node: HtmlNode): Promise<void> {
      if ("tagName" in node) {
        for (const attr of node.attrs) {
          if (
            attr.name === "srcset" &&
            !/^(?:https?:|data:|\/)/.test(attr.value)
          )
            throw new Error(
              `${source}: relative srcset is unsupported; use explicit public URLs.`,
            );
          if (["src", "href", "poster", "data"].includes(attr.name)) {
            if (
              ["script", "iframe", "object", "embed", "link"].includes(
                node.tagName,
              ) &&
              !/^(?:https?:|\/|#)/.test(attr.value)
            )
              throw new Error(
                `${source}: local ${node.tagName} dependency '${attr.value}' is outside static GFM support.`,
              );
            attr.value = await url(
              attr.value,
              base,
              source,
              node.tagName === "a" ? "link" : "resource",
            );
          }
        }
      }
      if ("childNodes" in node)
        for (const child of node.childNodes) await walk(child);
      if ("tagName" in node && node.tagName === "template" && "content" in node)
        await walk(node.content);
    }
    await walk(tree);
    return serialize(tree);
  }
  async function markdown(
    body: string,
    generated: string,
    source: string,
  ): Promise<string> {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkStringify);
    const tree = processor.parse(body);
    const tasks: Promise<void>[] = [];
    visit(tree, (node) => {
      if (
        node.type === "image" ||
        node.type === "link" ||
        node.type === "definition"
      )
        tasks.push(
          url(
            node.url,
            dirname(generated),
            source,
            node.type === "image" ? "resource" : "link",
          ).then((value) => {
            node.url = value;
          }),
        );
    });
    await Promise.all(tasks);
    return processor.stringify(tree);
  }
  return { url, html, markdown };
}
