import type { MetadataRoute } from "next";
import { loadSiteConfig } from "@/lib/data/load";
import { loadEpisodes } from "@/lib/data/load";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = loadSiteConfig();
  const base = site.canonicalBaseUrl.replace(/\/$/, "");
  const episodes = loadEpisodes().episodes;

  const staticRoutes = [
    "",
    "/portfolio",
    "/episodes",
    "/bitcoin-exposure",
    "/reserve",
    "/income-model",
    "/methodology",
    "/resources",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route || "/"}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...episodes.map((ep) => ({
      url: `${base}/episodes/${ep.slug}`,
      lastModified: new Date(ep.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
