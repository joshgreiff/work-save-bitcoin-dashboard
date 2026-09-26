import type { TreasuryDebtObservation } from "@/lib/schemas/learn";

const TREASURY_URL =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page%5Bsize%5D=1";

type CacheEntry = {
  value: TreasuryDebtObservation;
  cachedAtMs: number;
};

let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function fetchTreasuryDebt(args?: {
  fetchImpl?: typeof fetch;
  fallback: TreasuryDebtObservation;
  nowMs?: number;
}): Promise<TreasuryDebtObservation> {
  const fetchImpl = args?.fetchImpl ?? fetch;
  const nowMs = args?.nowMs ?? Date.now();
  const fallback = args!.fallback;

  if (memoryCache && nowMs - memoryCache.cachedAtMs < CACHE_TTL_MS) {
    return memoryCache.value;
  }

  try {
    const response = await fetchImpl(TREASURY_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Treasury HTTP ${response.status}`);
    }
    const json = (await response.json()) as {
      data?: Array<{
        record_date?: string;
        tot_pub_debt_out_amt?: string;
        debt_held_public_amt?: string;
        intragov_hold_amt?: string;
      }>;
    };
    const row = json.data?.[0];
    const total = Number(row?.tot_pub_debt_out_amt);
    const recordDate = row?.record_date;
    if (!recordDate || !Number.isFinite(total) || total <= 0) {
      throw new Error("Treasury response missing usable debt fields");
    }
    const observation: TreasuryDebtObservation = {
      recordDate,
      totalPublicDebtUsd: total,
      debtHeldByPublicUsd: Number.isFinite(Number(row?.debt_held_public_amt))
        ? Number(row?.debt_held_public_amt)
        : null,
      intragovernmentalUsd: Number.isFinite(Number(row?.intragov_hold_amt))
        ? Number(row?.intragov_hold_amt)
        : null,
      sourceName: "U.S. Treasury Fiscal Data — Debt to the Penny",
      sourceUrl:
        "https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny",
      retrievedAt: new Date(nowMs).toISOString(),
      freshness: "live",
    };
    memoryCache = { value: observation, cachedAtMs: nowMs };
    return observation;
  } catch {
    return {
      ...fallback,
      freshness: "last_verified",
    };
  }
}

export function clearTreasuryDebtCache(): void {
  memoryCache = null;
}

export { TREASURY_URL };
