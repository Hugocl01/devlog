import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.date(),
      author: z.string(),
      tags: z.array(z.string()).optional(),
      cover: image().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { posts };
