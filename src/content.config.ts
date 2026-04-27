import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const work = defineCollection({
  loader: glob({
    base: "./src/content/work",
    pattern: "**/*.{md,mdx}"
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    section: z.enum(["professional", "open-source"]),
    order: z.number().int().nonnegative(),
    summary: z.string(),
    icon: z.enum([
      "balto",
      "gtreasury",
      "kuali",
      "materialPalettes",
      "tintsAndShades",
      "txst"
    ]).optional(),
    logoImage: z.string().optional(),
    logoClass: z.string().optional(),
    cards: z.object({
      role: z.string(),
      problem: z.string(),
      outcome: z.string()
    }).optional(),
    thumb: z.object({
      name: z.string(),
      ext: z.enum(["png", "jpg"]),
      alt: z.string()
    }),
    visuals: z.array(z.object({
      name: z.string(),
      ext: z.enum(["png", "jpg"]),
      alt: z.string(),
      class: z.string().optional()
    })).min(1)
  })
});

export const collections = { work };
