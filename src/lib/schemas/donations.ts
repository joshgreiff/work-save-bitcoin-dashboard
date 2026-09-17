import { z } from "zod";
import {
  isoDateTimeSchema,
  nonNegativeCentsSchema,
  nonNegativeSatsSchema,
} from "./common";

export const bitcoinDonationSchema = z.object({
  id: z.string().min(1),
  timestamp: isoDateTimeSchema,
  displayName: z.string().min(1),
  sats: nonNegativeSatsSchema,
  reserveTransactionId: z.string().min(1),
  publicNote: z.string().optional(),
});

export const fiatDonationSchema = z.object({
  id: z.string().min(1),
  timestamp: isoDateTimeSchema,
  displayName: z.string().min(1),
  amountCents: nonNegativeCentsSchema,
  portfolioTransactionId: z.string().optional(),
  publicNote: z.string().optional(),
});

export const donationsFileSchema = z
  .object({
    bitcoin: z.array(bitcoinDonationSchema),
    fiat: z.array(fiatDonationSchema),
  })
  .superRefine((data, ctx) => {
    const btcIds = new Set<string>();
    for (const row of data.bitcoin) {
      if (btcIds.has(row.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate bitcoin donation id: ${row.id}` });
      }
      btcIds.add(row.id);
    }
    const fiatIds = new Set<string>();
    for (const row of data.fiat) {
      if (fiatIds.has(row.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate fiat donation id: ${row.id}` });
      }
      fiatIds.add(row.id);
    }
  });

export type BitcoinDonation = z.infer<typeof bitcoinDonationSchema>;
export type FiatDonation = z.infer<typeof fiatDonationSchema>;
export type DonationsData = z.infer<typeof donationsFileSchema>;

/** Ranked leaderboard rows aggregated by display name. */
export function buildBitcoinLeaderboard(donations: BitcoinDonation[]) {
  const byName = new Map<string, { displayName: string; sats: number; contributionCount: number }>();
  for (const donation of donations) {
    const existing = byName.get(donation.displayName) ?? {
      displayName: donation.displayName,
      sats: 0,
      contributionCount: 0,
    };
    existing.sats += donation.sats;
    existing.contributionCount += 1;
    byName.set(donation.displayName, existing);
  }
  return [...byName.values()]
    .sort((a, b) => b.sats - a.sats || a.displayName.localeCompare(b.displayName))
    .map((row, index) => ({ rank: index + 1, ...row }));
}

export function buildFiatLeaderboard(donations: FiatDonation[]) {
  const byName = new Map<
    string,
    { displayName: string; amountCents: number; contributionCount: number }
  >();
  for (const donation of donations) {
    const existing = byName.get(donation.displayName) ?? {
      displayName: donation.displayName,
      amountCents: 0,
      contributionCount: 0,
    };
    existing.amountCents += donation.amountCents;
    existing.contributionCount += 1;
    byName.set(donation.displayName, existing);
  }
  return [...byName.values()]
    .sort((a, b) => b.amountCents - a.amountCents || a.displayName.localeCompare(b.displayName))
    .map((row, index) => ({ rank: index + 1, ...row }));
}
