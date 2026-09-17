import { ReserveGrowthChart } from "@/components/charts/Charts";
import {
  AsOf,
  DataTable,
  Disclaimer,
  formatBtcFromSats,
  formatPercent,
  formatSats,
  formatUsdFromCents,
  MetricCard,
  SectionIntro,
  TextLink,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";
import { reserveHistoryByDate } from "@/lib/accounting/reserve";
import { loadReserve } from "@/lib/data/load";

export const metadata = {
  title: "WSB Strategic Bitcoin Reserve",
  description: "Separate Bitcoin reserve funded by voluntary channel support.",
};

export default function ReservePage() {
  const data = buildPublicDashboard();
  const reserveFile = loadReserve();
  const history = reserveHistoryByDate(reserveFile.transactions).map((point) => ({
    label: point.date,
    sats: point.cumulativeSats,
  }));
  const s = data.reserve.summary;

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Independent ledger"
        title="WSB Strategic Bitcoin Reserve"
        description="Bitcoin accumulated through voluntary channel support. It remains financially separate from the securities portfolio."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Reserve balance" value={formatSats(s.currentReserveSats)} asOf={data.reserve.asOf} tone="accent" />
        <MetricCard label="Reserve balance (BTC)" value={formatBtcFromSats(s.currentReserveSats)} asOf={data.reserve.asOf} />
        <MetricCard
          label="Estimated USD value"
          value={formatUsdFromCents(data.reserve.estimatedValueCents)}
          hint="Requires confirmed BTCUSD price"
          asOf={data.reserve.asOf}
        />
        <MetricCard label="Total sats received" value={formatSats(s.totalSatsReceived)} asOf={data.reserve.asOf} />
        <MetricCard label="Network fees paid" value={formatSats(s.totalNetworkFees)} asOf={data.reserve.asOf} />
        <MetricCard label="Net sats retained" value={formatSats(s.netSatsRetained)} asOf={data.reserve.asOf} />
        <MetricCard label="Contributions" value={String(s.contributionCount)} asOf={data.reserve.asOf} />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {s.progressToTargets.map((target) => (
          <article key={target.label} className="border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Progress to {target.label}</p>
            <p className="mt-2 text-2xl tabular-nums">{formatPercent(target.progress)}</p>
            <div className="mt-3 h-2 bg-[var(--surface-elevated)]">
              <div
                className="h-2 bg-[var(--accent)]"
                style={{ width: `${Math.round(target.progress * 100)}%` }}
              />
            </div>
          </article>
        ))}
      </section>

      <ReserveGrowthChart data={history} />

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Bitcoin donation leaderboard</h2>
        <DataTable
          headers={["Rank", "Supporter", "Sats", "Contributions"]}
          rows={data.donations.bitcoinLeaderboard.map((row) => [
            row.rank,
            row.displayName,
            formatSats(row.sats),
            row.contributionCount,
          ])}
        />
        <TextLink href="/leaderboard">View full donation leaderboards →</TextLink>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Contribution history</h2>
        <DataTable
          headers={["Timestamp", "Supporter", "Category", "Sats", "Episode", "Note"]}
          rows={data.reserve.transactions.map((tx) => [
            tx.timestamp,
            tx.displayName ?? "Anonymous",
            tx.category,
            formatSats(tx.sats),
            tx.episodeNumber ?? "—",
            tx.publicNote ?? "",
          ])}
        />
      </section>

      <section className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-lg font-medium">Public support</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {data.reserve.publicSupportAddress
            ? data.reserve.publicSupportAddress
            : "Public support address not published yet."}
        </p>
      </section>

      <Disclaimer>
        The WSB Strategic Bitcoin Reserve is funded through voluntary channel support. Support does
        not provide ownership, returns, voting rights, or any financial claim on the reserve.
      </Disclaimer>
      <AsOf value={data.reserve.asOf} />
    </div>
  );
}
