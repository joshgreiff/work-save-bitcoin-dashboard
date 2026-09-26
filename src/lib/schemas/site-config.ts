import { z } from "zod";

export const siteConfigSchema = z.object({
  siteName: z.string().min(1),
  siteTitle: z.string().min(1),
  siteDescription: z.string().min(1),
  canonicalBaseUrl: z.string().url(),
  timezone: z.literal("America/New_York"),
  youtubeChannelUrl: z.string().url().nullable(),
  substackUrl: z.string().url().nullable().default(null),
  xUrl: z.string().url().nullable(),
  contactEmail: z.string().email().nullable(),
  bitcoinSupportAddress: z.string().nullable(),
  bitcoinSupportQrUrl: z.string().url().nullable(),
  paypalSupportUrl: z.string().url().nullable(),
  referralLinks: z.array(
    z.object({
      label: z.string(),
      url: z.string().url(),
      note: z.string().optional(),
    }),
  ),
  educationalResources: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      note: z.string().optional(),
    }),
  ),
  supportDisclaimer: z.string().min(1),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
