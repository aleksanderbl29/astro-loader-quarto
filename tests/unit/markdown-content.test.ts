import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readRenderedMarkdown,
  matchQmdToMd,
  resolveContentPaths,
  checkRenderedFileExists,
} from "../../src/parsers/markdown-content.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

describe("markdown-content", () => {
  const testDir = join(process.cwd(), "test-output-md");
  const quartoRoot = join(testDir, "quarto");
  const outputDir = "_site";

  beforeEach(async () => {
    await mkdir(join(quartoRoot, outputDir, "posts"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("readRenderedMarkdown", () => {
    it("should read markdown content without frontmatter", async () => {
      const mdPath = join(quartoRoot, outputDir, "post.md");
      const content = "# Hello\n\nThis is content.";
      await writeFile(mdPath, content);

      const result = await readRenderedMarkdown(mdPath);
      expect(result).toBe(content);
    });

    it("should strip frontmatter from markdown", async () => {
      const mdPath = join(quartoRoot, outputDir, "post.md");
      const content = "---\ntitle: Test\n---\n# Hello\n\nContent here.";
      await writeFile(mdPath, content);

      const result = await readRenderedMarkdown(mdPath);
      expect(result).toBe("# Hello\n\nContent here.");
      expect(result).not.toContain("title: Test");
    });

    it("should throw error with helpful message if file not found", async () => {
      const mdPath = join(quartoRoot, outputDir, "missing.md");

      await expect(readRenderedMarkdown(mdPath)).rejects.toThrow(
        /Rendered markdown file not found/,
      );
      await expect(readRenderedMarkdown(mdPath)).rejects.toThrow(
        /quarto render/,
      );
    });
  });

  describe("matchQmdToMd", () => {
    it("should convert .qmd path to .md in output directory", () => {
      const qmdPath = join(quartoRoot, "posts", "my-post.qmd");
      const result = matchQmdToMd(qmdPath, quartoRoot, outputDir);

      expect(result).toBe(join(quartoRoot, outputDir, "posts", "my-post.md"));
    });

    it("should handle nested directories", () => {
      const qmdPath = join(quartoRoot, "posts", "2024", "my-post.qmd");
      const result = matchQmdToMd(qmdPath, quartoRoot, outputDir);

      expect(result).toBe(
        join(quartoRoot, outputDir, "posts", "2024", "my-post.md"),
      );
    });

    it("should handle files in root directory", () => {
      const qmdPath = join(quartoRoot, "index.qmd");
      const result = matchQmdToMd(qmdPath, quartoRoot, outputDir);

      expect(result).toBe(join(quartoRoot, outputDir, "index.md"));
    });
  });

  describe("resolveContentPaths", () => {
    it("should return both qmd and md paths", () => {
      const qmdPath = join(quartoRoot, "posts", "my-post.qmd");
      const result = resolveContentPaths(qmdPath, quartoRoot, outputDir);

      expect(result.qmdPath).toBe(qmdPath);
      expect(result.mdPath).toBe(
        join(quartoRoot, outputDir, "posts", "my-post.md"),
      );
    });
  });

  describe("checkRenderedFileExists", () => {
    it("should return true if rendered file exists", async () => {
      const qmdPath = join(quartoRoot, "posts", "my-post.qmd");
      const mdPath = join(quartoRoot, outputDir, "posts", "my-post.md");
      await writeFile(mdPath, "# Content");

      const result = await checkRenderedFileExists(
        qmdPath,
        quartoRoot,
        outputDir,
      );
      expect(result).toBe(true);
    });

    it("should return false if rendered file does not exist", async () => {
      const qmdPath = join(quartoRoot, "posts", "my-post.qmd");

      const result = await checkRenderedFileExists(
        qmdPath,
        quartoRoot,
        outputDir,
      );
      expect(result).toBe(false);
    });
  });
});
