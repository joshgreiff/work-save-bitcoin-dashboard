import {
  AsOf,
  DataTable,
  Disclaimer,
  EmptyState,
  formatBtcFromSats,
  formatSats,
  formatUsdFromCents,
  MetricCard,
  SectionIntro,
  TextLink,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export const metadata = {
  title: "Donation Leaderboards",
  description:
    "Public Bitcoin and fiat support leaderboards for Work Save Bitcoin. Support never buys ownership.",
};

export default function LeaderboardPage() {
  const data = buildPublicDashboard();
  const btcBoard = data.donations.bitcoinLeaderboard;
  const fiatBoard = data.donations.fiatLeaderboard;
  const totalBtcSats = data.donations.bitcoin.reduce((sum, row) => sum + row.sats, 0);
  const totalFiatCents = data.donations.fiat.reduce((sum, row) => sum + row.amountCents, 0);

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Voluntary support"
        title="Donation leaderboards"
        description="Bitcoin support funds the WSB Strategic Bitcoin Reserve. Fiat viewer support, when recorded, is tracked separately as portfolio contributions. Neither grants ownership or returns."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Bitcoin support received"
          value={formatSats(totalBtcSats)}
          hint={formatBtcFromSats(totalBtcSats)}
          asOf={data.reserve.asOf}
          tone="accent"
        />
        <MetricCard
          label="Fiat viewer support received"
          value={formatUsdFromCents(totalFiatCents)}
          hint={fiatBoard.length === 0 ? "No fiat donations recorded yet" : undefined}
          asOf={data.portfolio.currentValuationAt}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Bitcoin reserve leaderboard</h2>
        {btcBoard.length === 0 ? (
          <EmptyState message="No Bitcoin donations recorded yet." />
        ) : (
          <DataTable
            headers={["Rank", "Supporter", "Sats", "BTC", "Contributions"]}
            rows={btcBoard.map((row) => [
              row.rank,
              row.displayName,
              formatSats(row.sats),
              formatBtcFromSats(row.sats),
              row.contributionCount,
            ])}
          />
        )}
        <AsOf value={data.reserve.asOf} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Fiat support leaderboard</h2>
        {fiatBoard.length === 0 ? (
          <EmptyState message="No public fiat donations recorded yet." />
        ) : (
          <DataTable
            headers={["Rank", "Supporter", "Amount", "Contributions"]}
            rows={fiatBoard.map((row) => [
              row.rank,
              row.displayName,
              formatUsdFromCents(row.amountCents),
              row.contributionCount,
            ])}
          />
        )}
      </section>

      <section className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
        <p>
          Lightning / Bitcoin support:{" "}
          <span className="tabular-nums text-[var(--foreground)]">
            {data.reserve.publicSupportAddress ?? "Not published"}
          </span>
        </p>
        <div className="mt-3">
          <TextLink href="/reserve">View WSB Bitcoin Reserve →</TextLink>
        </div>
      </section>

      <Disclaimer>
        Leaderboard names are published only with consent or as Anonymous. Support does not provide
        ownership, returns, voting rights, or any financial claim on the reserve or securities
        portfolio.
      </Disclaimer>
    </div>
  );
}
