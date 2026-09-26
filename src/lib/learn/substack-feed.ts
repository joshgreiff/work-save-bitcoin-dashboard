import type { SubstackFeedResult, SubstackPost } from "@/lib/schemas/substack";

export const DEFAULT_SUBSTACK_FEED_URL = "https://joshgreiff.substack.com/feed";
export const DEFAULT_SUBSTACK_PUBLICATION_URL = "https://joshgreiff.substack.com";
/** Plain-text summary length after tag stripping (consistent clamp). */
export const SUBSTACK_SUMMARY_MAX_CHARS = 160;

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

/** Strip markup and normalize whitespace for safe plain-text display. */
export function sanitizeSubstackPlainText(value: string): string {
  return decodeXmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clampSubstackSummary(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = sanitizeSubstackPlainText(value);
  if (!cleaned) return null;
  if (cleaned.length <= SUBSTACK_SUMMARY_MAX_CHARS) return cleaned;
  const truncated = cleaned.slice(0, SUBSTACK_SUMMARY_MAX_CHARS - 1).trimEnd();
  return `${truncated}…`;
}

export function isSafeSubstackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return host === "substack.com" || host.endsWith(".substack.com");
  } catch {
    return false;
  }
}

function firstMatch(block: string, pattern: RegExp): string | null {
  const match = block.match(pattern);
  if (!match?.[1]) return null;
  return match[1];
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
    sanitizeSubstackPlainText(firstMatch(channel, /<title>([\s\S]*?)<\/title>/) ?? "") ||
    "Work, Save, Bitcoin";
  const rawPublicationUrl = firstMatch(channel, /<link>([^<]+)<\/link>/)?.trim();
  const publicationUrl =
    rawPublicationUrl && isSafeSubstackUrl(rawPublicationUrl)
      ? rawPublicationUrl
      : DEFAULT_SUBSTACK_PUBLICATION_URL;

  const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => m[1] ?? "")
    .map((item): SubstackPost | null => {
      const title = sanitizeSubstackPlainText(firstMatch(item, /<title>([\s\S]*?)<\/title>/) ?? "");
      const url = firstMatch(item, /<link>([^<]+)<\/link>/)?.trim() ?? "";
      const pubDate = firstMatch(item, /<pubDate>([^<]+)<\/pubDate>/)?.trim() ?? "";
      const rawSummary = firstMatch(item, /<description>([\s\S]*?)<\/description>/);
      if (!title || !url || !pubDate) return null;
      if (!isSafeSubstackUrl(url)) return null;
      const publishedAt = pubDateToIso(pubDate);
      if (!publishedAt) return null;
      return {
        title,
        url,
        summary: clampSubstackSummary(rawSummary),
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
