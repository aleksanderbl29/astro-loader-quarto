/**
 * Parser for rendered markdown content from Quarto output
 */

import { readFile } from 'fs/promises';
import { join, relative } from 'path';
import matter from 'gray-matter';

/**
 * Read rendered markdown content from a .md file
 * Strips frontmatter if present (Quarto may include it in GFM output)
 */
export async function readRenderedMarkdown(mdPath: string): Promise<string> {
  try {
    const content = await readFile(mdPath, 'utf-8');
    
    // Check if the file has frontmatter
    // Quarto GFM output may include frontmatter, we want just the content
    if (content.startsWith('---')) {
      const { content: body } = matter(content);
      return body;
    }
    
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Rendered markdown file not found: ${mdPath}\n` +
        `Make sure to run 'quarto render' before building with Astro.\n` +
        `Also verify that Quarto is configured with 'format: gfm' in _quarto.yml`
      );
    }
    throw error;
  }
}

/**
 * Convert a .qmd source path to its corresponding .md output path
 * 
 * @param qmdPath - Path to source .qmd file (e.g., "quarto/posts/my-post.qmd")
 * @param quartoRoot - Root directory of Quarto project (e.g., "quarto")
 * @param outputDir - Quarto output directory (e.g., "_site")
 * @returns Path to rendered .md file (e.g., "quarto/_site/posts/my-post.md")
 */
export function matchQmdToMd(
  qmdPath: string,
  quartoRoot: string,
  outputDir: string
): string {
  // qmdPath is typically an absolute path from glob
  // Get the relative path from quartoRoot to the .qmd file
  const relPath = relative(quartoRoot, qmdPath);
  
  // Replace .qmd extension with .md
  const mdFileName = relPath.replace(/\.qmd$/, '.md');
  
  // outputDir can be either absolute or relative
  // If it's absolute (starts with / or contains :\ for Windows), use it directly
  // Otherwise, join it with quartoRoot
  const absoluteOutputDir = outputDir.startsWith('/') || outputDir.includes(':\\')
    ? outputDir
    : join(quartoRoot, outputDir);
  
  // Construct the full path in the output directory
  return join(absoluteOutputDir, mdFileName);
}

/**
 * Resolve both source and output paths for a .qmd file
 */
export interface ResolvedContentPaths {
  qmdPath: string;  // Source .qmd file
  mdPath: string;   // Rendered .md file
}

export function resolveContentPaths(
  qmdPath: string,
  quartoRoot: string,
  outputDir: string
): ResolvedContentPaths {
  return {
    qmdPath,
    mdPath: matchQmdToMd(qmdPath, quartoRoot, outputDir),
  };
}

/**
 * Check if a rendered .md file exists for a given .qmd file
 */
export async function checkRenderedFileExists(
  qmdPath: string,
  quartoRoot: string,
  outputDir: string
): Promise<boolean> {
  const mdPath = matchQmdToMd(qmdPath, quartoRoot, outputDir);
  try {
    await readFile(mdPath);
    return true;
  } catch {
    return false;
  }
}

