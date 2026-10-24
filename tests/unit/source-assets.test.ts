import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { entryId, selectSources, sourceMetadata } from "../../src/source.js";
import { assetPublisher } from "../../src/assets.js";
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "quarto-unit-"));
  await mkdir(join(root, "guides/a"), { recursive: true });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
const config = { quartoRoot: "." };
describe("source identity and metadata", () => {
  it("keeps nested/index IDs, dates and Unicode; explicit slugs own identity", () => {
    expect(entryId(join(root, "guides/a/index.qmd"), root, undefined)).toBe(
      "guides/a",
    );
    expect(entryId(join(root, "guides/b/index.qmd"), root, undefined)).toBe(
      "guides/b",
    );
    expect(entryId(join(root, "2025-01-01-æøå.qmd"), root, undefined)).toBe(
      "2025-01-01-æøå",
    );
    expect(entryId(join(root, "index.qmd"), root, undefined)).toBe("index");
    expect(entryId(join(root, "guides/a/index.qmd"), root, "my-guide")).toBe(
      "my-guide",
    );
    for (const slug of ["../escape", "/root", "x?y", "x#y", "a//b", ""])
      expect(() => entryId(join(root, "a.qmd"), root, slug)).toThrow();
  });
  it("inherits root and nested metadata; preserves custom fields and dates", async () => {
    await writeFile(join(root, "_metadata.yml"), "author: Root metadata\n");
    await writeFile(
      join(root, "guides/_metadata.yml"),
      "author: Nested author\nimage: cover.png\n",
    );
    const source = join(root, "guides/a/index.qmd");
    await writeFile(
      source,
      "---\ntitle: Guide\ndate: 2025-01-02\nlast-modified: 2025-02-03\ncustom: [one, two]\n---\n",
    );
    const document = await sourceMetadata(
      source,
      root,
      { author: "Project author", description: "Root description" },
      {},
      config,
    );
    expect(document.data).toMatchObject({
      author: "Nested author",
      description: "Root description",
      custom: ["one", "two"],
      heroImage: "cover.png",
      pubDate: new Date("2025-01-02"),
      updatedDate: new Date("2025-02-03"),
    });
    expect(document.origins.get("heroImage")).toBe(join(root, "guides"));
  });
  it("rejects all alias collisions and invalid dates instead of picking an order", async () => {
    const source = join(root, "guides/a/index.qmd");
    for (const fields of [
      "date: 2025-01-01\npubDate: 2025-01-01",
      "date-modified: 2025-01-01\nlast-modified: 2025-01-01",
      "image: a.png\nheroImage: b.png",
    ]) {
      await writeFile(source, `---\n${fields}\n---\n`);
      await expect(
        sourceMetadata(source, root, {}, {}, config),
      ).rejects.toThrow("conflicting aliases");
    }
    await writeFile(source, "---\ndate: nonsense\n---");
    await expect(sourceMetadata(source, root, {}, {}, config)).rejects.toThrow(
      "invalid date",
    );
  });
  it("keeps listing selection including directory contents and empty inventories", async () => {
    await writeFile(join(root, "guides/a/index.qmd"), "---\ntitle: A\n---");
    expect(
      await selectSources({ quartoRoot: ".", listings: "posts" }, root, {
        listing: { id: "posts", contents: "guides", author: "Listing Author" },
      }),
    ).toEqual([
      {
        path: join(root, "guides/a/index.qmd"),
        defaults: { author: "Listing Author" },
      },
    ]);
    expect(
      await selectSources(
        { quartoRoot: ".", pattern: "missing/**/*.qmd" },
        root,
        {},
      ),
    ).toEqual([]);
    await expect(
      selectSources({ quartoRoot: ".", listings: "missing" }, root, {}),
    ).rejects.toThrow("not found");
  });
});
describe("portable static resources", () => {
  it("preserves Quarto math escapes while publishing files without extensions", async () => {
    const source = join(root, "guides/a/index.qmd");
    await writeFile(join(root, "guides/a/DOWNLOAD"), "content");
    const assets = assetPublisher({
      root,
      publicDir: join(root, "public"),
      base: "/",
      collection: "guides",
      config,
    });
    const math = String.raw`\left\{x_i\right\}`;
    const body = await assets.markdown(
      `$$\n${math}\n$$\n\n[Download](DOWNLOAD?query#fragment)\n`,
      source.replace(".qmd", ".md"),
      source,
    );
    expect(body).toContain(math);
    expect(body).toContain("/quarto-assets/");
    expect(body).toContain("/DOWNLOAD?query#fragment");
  });
  it("preserves external/root URLs, query/fragment suffixes, parses HTML and rejects missing resources/QMD links", async () => {
    const source = join(root, "guides/a/index.qmd");
    await writeFile(join(root, "guides/a/picture.png"), "png");
    await writeFile(join(root, "guides/a/file.csv"), "a,b");
    const assets = assetPublisher({
      root,
      publicDir: join(root, "public"),
      base: "/base/",
      collection: "guides",
      config,
    });
    for (const url of [
      "https://example.com/a?x#y",
      "//cdn.test/a",
      "/public/a.png",
      "#section",
      "data:image/png;base64,AA",
    ])
      expect(await assets.url(url, root, source)).toBe(url);
    const html = await assets.html(
      '<img src="picture.png?x=1#anchor"><a href="file.csv?download#first">download</a><pre>&lt;img src="missing.png"&gt;</pre>',
      join(root, "guides/a"),
      source,
    );
    expect(html).toContain("/base/quarto-assets/");
    expect(html).toContain("?x=1#anchor");
    expect(html).toContain("?download#first");
    expect(html).toContain('&lt;img src="missing.png"&gt;');
    await expect(assets.url("missing.png", root, source)).rejects.toThrow(
      "relative resource",
    );
    await expect(assets.url("other.qmd#part", root, source)).rejects.toThrow(
      "resolveLink",
    );
    await expect(
      assets.html('<script src="widget.js"></script>', root, source),
    ).rejects.toThrow("static GFM");
    await expect(
      assets.html('<iframe src="widget.html"></iframe>', root, source),
    ).rejects.toThrow("static GFM");
  });
  it("uses explicit crosslink resolver", async () => {
    const assets = assetPublisher({
      root,
      publicDir: join(root, "public"),
      base: "/",
      collection: "guides",
      config: {
        ...config,
        resolveLink: (href) =>
          `/guides/other${href.includes("#") ? "#part" : ""}`,
      },
    });
    expect(
      await assets.url("other.qmd#part", root, join(root, "index.qmd"), "link"),
    ).toBe("/guides/other#part");
  });
});
