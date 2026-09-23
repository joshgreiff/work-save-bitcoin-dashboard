import { z } from "zod";
import { isoDateTimeSchema } from "./common";

export const youtubeFeedVideoSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().min(1),
  youtubeUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  publishedAt: isoDateTimeSchema,
});

export const youtubeFeedFileSchema = z.object({
  channelId: z.string().min(1),
  channelUrl: z.string().url(),
  seriesStartPublishedAt: isoDateTimeSchema,
  retrievedAt: isoDateTimeSchema,
  sourceUrl: z.string().url(),
  videos: z.array(youtubeFeedVideoSchema),
  notes: z.array(z.string()).default([]),
});

export type YoutubeFeedVideo = z.infer<typeof youtubeFeedVideoSchema>;
export type YoutubeFeedFile = z.infer<typeof youtubeFeedFileSchema>;
