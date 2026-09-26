import { loadLearnLessons, loadSiteConfig } from "@/lib/data/load";

export const dynamic = "force-static";

export async function GET() {
  const site = loadSiteConfig();
  const base = site.canonicalBaseUrl.replace(/\/$/, "");
  const lessons = [...loadLearnLessons().lessons].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );

  const items = lessons
    .map(
      (lesson) => `
    <item>
      <title><![CDATA[${lesson.title}]]></title>
      <link>${base}/learn/${lesson.slug}</link>
      <guid>${base}/learn/${lesson.slug}</guid>
      <pubDate>${new Date(lesson.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${lesson.summary}]]></description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Work Save Bitcoin — Learn</title>
    <link>${base}/learn</link>
    <description>Bitcoin education for protecting your time and energy.</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
