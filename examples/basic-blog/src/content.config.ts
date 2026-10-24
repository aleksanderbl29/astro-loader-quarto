import { defineCollection } from "astro:content";
import { quartoLoader } from "astro-loader-quarto";

/**
 * Blog collection using Quarto content with default field mappings
 * - Quarto 'date' maps to Astro 'pubDate'
 * - Quarto 'date-modified' maps to Astro 'updatedDate'
 * - Quarto 'image' maps to Astro 'heroImage'
 */
const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "blog-posts",
    // Optional: Filter out draft posts
    filter: (entry) => entry.draft !== true,
  }),
});

export const collections = { blog };
