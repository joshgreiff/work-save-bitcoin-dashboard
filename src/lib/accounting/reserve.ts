import type { ReserveTransaction } from "@/lib/schemas/reserve";

export type ReserveSummary = {
  totalSatsReceived: number;
  totalSatsSent: number;
  totalNetworkFees: number;
  netSatsRetained: number;
  currentReserveSats: number;
  contributionCount: number;
  progressToTargets: {
    targetSats: number;
    label: string;
    progress: number;
  }[];
};

const TARGETS = [
  { label: "0.01 BTC", targetSats: 1_000_000 },
  { label: "0.1 BTC", targetSats: 10_000_000 },
  { label: "1 BTC", targetSats: 100_000_000 },
];

/**
 * Current reserve sats = total sats received - sats sent - network fees
 */
export function summarizeReserve(transactions: ReserveTransaction[]): ReserveSummary {
  let totalSatsReceived = 0;
  let totalSatsSent = 0;
  let totalNetworkFees = 0;
  let contributionCount = 0;

  for (const tx of transactions) {
    if (tx.affectsPortfolioPerformance) {
      throw new Error(
        `Reserve transaction ${tx.id} incorrectly affects portfolio performance`,
      );
    }
    switch (tx.category) {
      case "contribution_received":
        totalSatsReceived += tx.sats;
        contributionCount += 1;
        break;
      case "sats_sent":
        totalSatsSent += tx.sats;
        break;
      case "network_fee":
        totalNetworkFees += tx.sats;
        break;
      case "correction":
        // Signed corrections: positive adds to received semantics via note discipline.
        totalSatsReceived += tx.sats;
        break;
      default:
        break;
    }
  }

  const currentReserveSats = totalSatsReceived - totalSatsSent - totalNetworkFees;
  if (currentReserveSats < 0) {
    throw new Error("Reserve balance cannot be negative");
  }

  return {
    totalSatsReceived,
    totalSatsSent,
    totalNetworkFees,
    netSatsRetained: currentReserveSats,
    currentReserveSats,
    contributionCount,
    progressToTargets: TARGETS.map((target) => ({
      ...target,
      progress: Math.min(1, currentReserveSats / target.targetSats),
    })),
  };
}

export function reserveHistoryByDate(transactions: ReserveTransaction[]): {
  date: string;
  cumulativeSats: number;
}[] {
  const sorted = [...transactions].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  let cumulative = 0;
  const points: { date: string; cumulativeSats: number }[] = [];
  for (const tx of sorted) {
    if (tx.category === "contribution_received" || tx.category === "correction") {
      cumulative += tx.sats;
    } else if (tx.category === "sats_sent" || tx.category === "network_fee") {
      cumulative -= tx.sats;
    }
    points.push({
      date: tx.timestamp.slice(0, 10),
      cumulativeSats: cumulative,
    });
  }
  return points;
}
