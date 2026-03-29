import { defineCollection, z } from "astro:content";

const help = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(["getting-started", "buyers", "owners", "billing", "account", "updates"]),
    audience: z.array(z.enum(["buyer", "owner", "admin", "public"])).default(["public"]),
    order: z.number().default(0),
    updatedAt: z.string(),
  }),
});

export const collections = { help };
