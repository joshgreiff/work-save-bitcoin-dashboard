import { loadLearnLessons, loadResearchNotes, loadSiteConfig } from "@/lib/data/load";

export const dynamic = "force-static";

export async function GET() {
  const site = loadSiteConfig();
  const base = site.canonicalBaseUrl.replace(/\/$/, "");
  const entries = [
    ...loadLearnLessons().lessons.map((lesson) => ({
      title: lesson.title,
      path: `/learn/${lesson.slug}`,
      publishedAt: lesson.publishedAt,
      summary: lesson.summary,
    })),
    ...loadResearchNotes().notes.flatMap((note) =>
      note.publishedAt
        ? [
            {
              title: note.title,
              path: `/learn/research/${note.slug}`,
              publishedAt: note.publishedAt,
              summary: note.summary,
            },
          ]
        : [],
    ),
  ].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const items = entries
    .map(
      (entry) => `
    <item>
      <title><![CDATA[${entry.title}]]></title>
      <link>${base}${entry.path}</link>
      <guid>${base}${entry.path}</guid>
      <pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${entry.summary}]]></description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Work Save Bitcoin — Learn</title>
    <link>${base}/learn</link>
    <description>Research and practical tools for understanding how money, institutions, Bitcoin, and technology affect the value of your time.</description>
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
