import type { SubstackFeedResult, SubstackPost } from "@/lib/schemas/substack";

export const DEFAULT_SUBSTACK_FEED_URL = "https://joshgreiff.substack.com/feed";
export const DEFAULT_SUBSTACK_PUBLICATION_URL = "https://joshgreiff.substack.com";

type CacheEntry = {
  value: SubstackFeedResult;
  cachedAtMs: number;
};

let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .trim();
}

function stripTags(value: string): string {
  return decodeXmlEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(block: string, pattern: RegExp): string | null {
  const match = block.match(pattern);
  if (!match?.[1]) return null;
  return decodeXmlEntities(match[1]);
}

function pubDateToIso(pubDate: string): string | null {
  const ms = Date.parse(pubDate);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/** Parse Substack (RSS 2.0) XML into title/link/summary/date rows. */
export function parseSubstackRss(xml: string): {
  publicationTitle: string;
  publicationUrl: string;
  posts: SubstackPost[];
} {
  const channel = xml.match(/<channel>([\s\S]*?)<item>/)?.[1] ?? xml;
  const publicationTitle =
    firstMatch(channel, /<title>([\s\S]*?)<\/title>/) ?? "Work, Save, Bitcoin";
  const publicationUrl =
    firstMatch(channel, /<link>([^<]+)<\/link>/) ?? DEFAULT_SUBSTACK_PUBLICATION_URL;

  const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => m[1] ?? "")
    .map((item): SubstackPost | null => {
      const title = firstMatch(item, /<title>([\s\S]*?)<\/title>/);
      const url = firstMatch(item, /<link>([^<]+)<\/link>/);
      const pubDate = firstMatch(item, /<pubDate>([^<]+)<\/pubDate>/);
      const rawSummary = firstMatch(item, /<description>([\s\S]*?)<\/description>/);
      if (!title || !url || !pubDate) return null;
      const publishedAt = pubDateToIso(pubDate);
      if (!publishedAt) return null;
      const summary = rawSummary ? stripTags(rawSummary) : null;
      return {
        title,
        url,
        summary: summary && summary.length > 0 ? summary.slice(0, 280) : null,
        publishedAt,
      };
    })
    .filter((row): row is SubstackPost => row != null);

  return { publicationTitle, publicationUrl, posts };
}

export async function fetchSubstackFeed(args?: {
  feedUrl?: string;
  limit?: number;
  fetchImpl?: typeof fetch;
  nowMs?: number;
}): Promise<SubstackFeedResult> {
  const feedUrl = args?.feedUrl ?? DEFAULT_SUBSTACK_FEED_URL;
  const limit = args?.limit ?? 6;
  const fetchImpl = args?.fetchImpl ?? fetch;
  const nowMs = args?.nowMs ?? Date.now();

  if (memoryCache && nowMs - memoryCache.cachedAtMs < CACHE_TTL_MS) {
    return {
      ...memoryCache.value,
      posts: memoryCache.value.posts.slice(0, limit),
    };
  }

  try {
    const response = await fetchImpl(feedUrl, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Substack feed HTTP ${response.status}`);
    }
    const xml = await response.text();
    const parsed = parseSubstackRss(xml);
    const value: SubstackFeedResult = {
      publicationTitle: parsed.publicationTitle,
      publicationUrl: parsed.publicationUrl,
      posts: parsed.posts.slice(0, Math.max(limit, 12)),
      retrievedAt: new Date(nowMs).toISOString(),
      freshness: "live",
    };
    memoryCache = { value, cachedAtMs: nowMs };
    return {
      ...value,
      posts: value.posts.slice(0, limit),
    };
  } catch {
    return {
      publicationTitle: "Work, Save, Bitcoin",
      publicationUrl: DEFAULT_SUBSTACK_PUBLICATION_URL,
      posts: [],
      retrievedAt: new Date(nowMs).toISOString(),
      freshness: "unavailable",
    };
  }
}

export function clearSubstackFeedCache(): void {
  memoryCache = null;
}
