import type { MetadataRoute } from "next";
import { loadSiteConfig } from "@/lib/data/load";

export default function robots(): MetadataRoute.Robots {
  const site = loadSiteConfig();
  const base = site.canonicalBaseUrl.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
