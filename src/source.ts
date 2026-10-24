import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import matter from "gray-matter";
import { parse } from "yaml";
import { z } from "zod";
import fg from "fast-glob";
import type { QuartoLoaderConfig } from "./types/loader-config.js";
import { DEFAULT_FIELD_MAPPINGS } from "./types/loader-config.js";

const object = z.record(z.string(), z.unknown());
const listingSchema = z
  .object({
    id: z.string(),
    contents: z.union([z.string(), z.array(z.string())]),
  })
  .passthrough();
export async function yamlFile(
  path: string,
  optional = false,
): Promise<Record<string, unknown>> {
  try {
    return object.parse(parse(await readFile(path, "utf8")) ?? {});
  } catch (error) {
    if (
      optional &&
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return {};
    throw new Error(`Invalid metadata ${path}: ${String(error)}`, {
      cause: error,
    });
  }
}
export function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return (
    rel === "" ||
    (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
  );
}
export function entryId(source: string, root: string, slug: unknown): string {
  const fallback = relative(root, source)
    .split(sep)
    .join("/")
    .replace(/\.qmd$/, "")
    .replace(/\/index$/, "");
  const id = slug === undefined ? fallback : z.string().parse(slug);
  if (
    !id ||
    id.startsWith("/") ||
    /[?#\\%:]/.test(id) ||
    [...id].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    id.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(
      `Unsafe slug/ID '${id}' in ${source}; use an unencoded relative URL path without query, fragment, or traversal.`,
    );
  }
  return id;
}
export async function selectSources(
  config: QuartoLoaderConfig,
  root: string,
  project: Record<string, unknown>,
) {
  if (config.pattern && config.listings)
    throw new Error("Choose pattern or listings, not both.");
  if (config.pattern)
    return (
      await fg(config.pattern, { cwd: root, absolute: true, onlyFiles: true })
    )
      .filter((p) => p.endsWith(".qmd"))
      .sort()
      .map((path) => ({ path, defaults: {} }));
  const listings = z
    .array(listingSchema)
    .parse(
      project.listing === undefined
        ? []
        : Array.isArray(project.listing)
          ? project.listing
          : [project.listing],
    );
  const names =
    config.listings === undefined || config.listings === "all"
      ? listings.map((l) => l.id)
      : typeof config.listings === "string"
        ? [config.listings]
        : config.listings;
  const selected = new Map<
    string,
    { path: string; defaults: Record<string, unknown> }
  >();
  for (const name of names) {
    const listing = listings.find((l) => l.id === name);
    if (!listing)
      throw new Error(
        `Listing '${name}' not found; available: ${listings.map((l) => l.id).join(", ")}`,
      );
    const contents =
      typeof listing.contents === "string"
        ? [listing.contents]
        : listing.contents;
    const patterns = contents.flatMap((p) => [
      p.replace(/^\//, ""),
      `${p.replace(/\/$/, "")}/**/*.qmd`,
    ]);
    const defaults: Record<string, unknown> = {};
    for (const key of ["author", "categories", "image", "date-format"])
      if (listing[key] !== undefined) defaults[key] = listing[key];
    for (const path of await fg(patterns, {
      cwd: root,
      absolute: true,
      onlyFiles: true,
    }))
      if (path.endsWith(".qmd")) selected.set(path, { path, defaults });
  }
  return [...selected.values()].sort((a, b) => a.path.localeCompare(b.path));
}
export async function sourceMetadata(
  source: string,
  root: string,
  project: Record<string, unknown>,
  defaults: Record<string, unknown>,
  config: QuartoLoaderConfig,
) {
  if (!inside(root, source))
    throw new Error(`Source outside quartoRoot: ${source}`);
  let metadata: Record<string, unknown> = {};
  const origins = new Map<string, string>();
  const merge = (layer: Record<string, unknown>, dir: string) => {
    metadata = { ...metadata, ...layer };
    for (const key of Object.keys(layer)) origins.set(key, dir);
  };
  const rootMetadata = Object.fromEntries(
    Object.entries(project).filter(
      ([key]) => !["project", "format", "listing", "website"].includes(key),
    ),
  );
  merge(defaults, root);
  merge(rootMetadata, root);
  let directory = root;
  const dirs = relative(root, dirname(source)).split(sep).filter(Boolean);
  for (const part of ["", ...dirs]) {
    directory = resolve(directory, part);
    for (const name of ["_metadata.yml", "_metadata.yaml"])
      merge(await yamlFile(resolve(directory, name), true), directory);
  }
  const parsed = matter(await readFile(source, "utf8"), {
    engines: { yaml: (text) => object.parse(parse(text) ?? {}) },
  });
  merge(object.parse(parsed.data), dirname(source));
  if (metadata["output-file"] !== undefined)
    throw new Error(
      `${source}: output-file overrides are unsupported; use mirrored .qmd → .md output.`,
    );
  const id = entryId(source, root, metadata.slug);
  const mappings = { ...DEFAULT_FIELD_MAPPINGS, ...config.fieldMappings };
  const data: Record<string, unknown> = {};
  const mappedOrigins = new Map<string, string>();
  for (const [key, raw] of Object.entries(metadata)) {
    const target = Object.hasOwn(mappings, key) ? (mappings[key] ?? key) : key;
    if (Object.hasOwn(data, target))
      throw new Error(
        `${source}: conflicting aliases for '${target}' (including '${key}'); keep one field or change fieldMappings.`,
      );
    let value = raw;
    if (
      [
        "date",
        "pubDate",
        "date-modified",
        "last-modified",
        "updatedDate",
      ].includes(key) &&
      typeof raw === "string"
    ) {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime()))
        throw new Error(`${source}: invalid date '${raw}' in ${key}`);
      value = date;
    }
    data[target] = value;
    mappedOrigins.set(target, origins.get(key) ?? dirname(source));
  }
  return { id, data, origins: mappedOrigins };
}
