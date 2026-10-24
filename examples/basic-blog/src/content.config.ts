import { defineCollection, z } from "astro:content";
import { quartoLoader } from "astro-loader-quarto";

const blog = defineCollection({
  loader: quartoLoader({
    quartoRoot: "./quarto",
    listings: "blog-posts",
    autoRender: false,
    filter: (entry) => entry.draft !== true,
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    author: z.union([z.string(), z.array(z.string())]).optional(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    heroImage: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});
export const collections = { blog };
