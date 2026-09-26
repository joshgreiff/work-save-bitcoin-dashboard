import { z } from "zod";
import { isoDateTimeSchema } from "@/lib/schemas/common";

export const substackPostSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  summary: z.string().nullable(),
  publishedAt: isoDateTimeSchema,
});

export const substackFeedResultSchema = z.object({
  publicationTitle: z.string().min(1),
  publicationUrl: z.string().url(),
  posts: z.array(substackPostSchema),
  retrievedAt: isoDateTimeSchema,
  freshness: z.enum(["live", "unavailable"]),
});

export type SubstackPost = z.infer<typeof substackPostSchema>;
export type SubstackFeedResult = z.infer<typeof substackFeedResultSchema>;
