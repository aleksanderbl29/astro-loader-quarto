import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { quartoLoader } from '../../src/index.js';

describe('Content Rendering Integration', () => {
  const testDir = join(process.cwd(), 'test-content-rendering');
  const quartoRoot = join(testDir, 'quarto');
  const outputDir = '_site';

  beforeEach(async () => {
    await mkdir(join(quartoRoot, 'posts'), { recursive: true });
    await mkdir(join(quartoRoot, outputDir, 'posts'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should include body field with markdown content', async () => {
    // Setup Quarto config
    const quartoYaml = `
project:
  type: website
  output-dir: _site

format: gfm

listing:
  - id: blog
    contents: posts/*.qmd
`;
    await writeFile(join(quartoRoot, '_quarto.yml'), quartoYaml);

    // Create source .qmd file
    const qmdContent = `---
title: "Test Post"
date: "2024-01-15"
---

# Hello World

This is the **markdown content** from Quarto.

- Item 1
- Item 2
`;
    await writeFile(join(quartoRoot, 'posts', 'test.qmd'), qmdContent);

    // Create rendered .md file (simulating quarto render output)
    const mdContent = `# Hello World

This is the **markdown content** from Quarto.

- Item 1
- Item 2
`;
    await writeFile(join(quartoRoot, outputDir, 'posts', 'test.md'), mdContent);

    // Create mock store
    const entries: Array<{ id: string; data: any; body?: string }> = [];
    const mockStore = {
      set: (entry: { id: string; data: any; body?: string }) => {
        entries.push(entry);
      },
      clear: () => {},
    };

    // Load content
    const loader = quartoLoader({ quartoRoot, listings: 'blog' });
    await loader.load({ store: mockStore as any, meta: {} as any, logger: console, parseData: async (data: any) => data });

    // Verify body field is included
    expect(entries.length).toBeGreaterThan(0);
    const entry = entries[0]!;
    expect(entry.body).toBeDefined();
    expect(entry.body).toContain('# Hello World');
    expect(entry.body).toContain('markdown content');
    expect(entry.body).not.toContain('---'); // Frontmatter should be stripped
    expect(entry.body).not.toContain('title: "Test Post"');
  });

  it('should handle missing rendered markdown gracefully', async () => {
    // Setup Quarto config
    const quartoYaml = `
project:
  type: website
  output-dir: _site

format: gfm

listing:
  - id: blog
    contents: posts/*.qmd
`;
    await writeFile(join(quartoRoot, '_quarto.yml'), quartoYaml);

    // Create source .qmd file WITHOUT corresponding .md file
    const qmdContent = `---
title: "Test Post"
date: "2024-01-15"
---

# Content
`;
    await writeFile(join(quartoRoot, 'posts', 'test.qmd'), qmdContent);
    // Note: NOT creating the .md file

    // Create mock store
    const entries: Array<{ id: string; data: any; body?: string }> = [];
    const mockStore = {
      set: (entry: { id: string; data: any; body?: string }) => {
        entries.push(entry);
      },
      clear: () => {},
    };

    // Load content
    const loader = quartoLoader({ quartoRoot, listings: 'blog' });
    await loader.load({ store: mockStore as any, meta: {} as any, logger: console, parseData: async (data: any) => data });

    // Should still create entry with empty body
    expect(entries.length).toBeGreaterThan(0);
    const entry = entries[0]!;
    expect(entry.body).toBe(''); // Empty body when .md file missing
    expect(entry.data.title).toBe('Test Post'); // Metadata still works
  });

  it('should validate GFM format configuration', async () => {
    // Setup Quarto config WITHOUT GFM format
    const quartoYaml = `
project:
  type: website
  output-dir: _site

listing:
  - id: blog
    contents: posts/*.qmd
`;
    await writeFile(join(quartoRoot, '_quarto.yml'), quartoYaml);

    // Create minimal content
    await writeFile(
      join(quartoRoot, 'posts', 'test.qmd'),
      '---\ntitle: "Test"\ndate: "2024-01-15"\n---\n\nContent'
    );
    await writeFile(
      join(quartoRoot, outputDir, 'posts', 'test.md'),
      'Content'
    );

    // Create mock store and logger
    const entries: any[] = [];
    const warnings: string[] = [];
    const mockStore = {
      set: (entry: any) => entries.push(entry),
      clear: () => {},
    };
    const mockLogger = {
      ...console,
      warn: (msg: string) => warnings.push(msg),
    };

    // Load content
    const loader = quartoLoader({ quartoRoot, listings: 'blog' });
    await loader.load({ 
      store: mockStore as any, 
      meta: {} as any, 
      logger: mockLogger as any,
      parseData: async (data: any) => data 
    });

    // Should warn about missing GFM format
    expect(warnings.some(w => w.includes('format') && w.includes('gfm'))).toBe(true);
  });
});


