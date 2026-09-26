import type { MetadataRoute } from "next";
import { loadSiteConfig, loadEpisodes, loadLearnLessons } from "@/lib/data/load";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = loadSiteConfig();
  const base = site.canonicalBaseUrl.replace(/\/$/, "");
  const episodes = loadEpisodes().episodes;
  const lessons = loadLearnLessons().lessons;

  const staticRoutes = [
    "",
    "/learn",
    "/learn/glossary",
    "/learn/resources",
    "/privacy",
    "/portfolio",
    "/episodes",
    "/bitcoin-exposure",
    "/reserve",
    "/leaderboard",
    "/income-model",
    "/methodology",
    "/resources",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route || "/"}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : route.startsWith("/learn") ? 0.85 : 0.7,
    })),
    ...lessons.map((lesson) => ({
      url: `${base}/learn/${lesson.slug}`,
      lastModified: new Date(lesson.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...episodes.map((ep) => ({
      url: `${base}/episodes/${ep.slug}`,
      lastModified: new Date(ep.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
