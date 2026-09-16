import { IncomeProgressChart } from "@/components/charts/Charts";
import {
  AsOf,
  DataTable,
  Disclaimer,
  EmptyState,
  formatPercent,
  formatShares,
  formatUsdFromCents,
  MetricCard,
  SectionIntro,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export const metadata = {
  title: "Fiat Freedom Income Model",
  description: "Hypothetical income if the securities portfolio were converted into the target allocation today.",
};

export default function IncomeModelPage() {
  const data = buildPublicDashboard();
  const result = data.incomeModel.result;

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Hypothetical conversion"
        title="Fiat Freedom Income Model"
        description="Estimates gross income the actual securities portfolio could generate if converted into a defined income allocation today. Not a paper-trading portfolio."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Deployable portfolio value"
          value={formatUsdFromCents(result.deployableValueCents)}
          asOf={data.incomeModel.asOf}
          hint="Excludes WSB Bitcoin Reserve"
        />
        <MetricCard
          label="Expected annual gross income"
          value={formatUsdFromCents(result.annualIncomeCents)}
          asOf={data.incomeModel.asOf}
        />
        <MetricCard
          label="Expected monthly gross income"
          value={formatUsdFromCents(result.monthlyIncomeCents)}
          asOf={data.incomeModel.asOf}
        />
        <MetricCard
          label="Blended indicated yield"
          value={formatPercent(result.blendedIndicatedYield)}
          asOf={data.incomeModel.asOf}
        />
      </div>

      {!result.configured ? (
        <EmptyState message="Income model securities are not configured yet. Add target allocations totaling 100% in data/income-model.json." />
      ) : (
        <DataTable
          headers={[
            "Ticker",
            "Allocation",
            "Price",
            "Annual dist./share",
            "Indicated yield",
            "Allocated capital",
            "Modeled shares",
            "Annual income",
          ]}
          rows={result.securities.map((s) => [
            s.ticker,
            formatPercent(s.targetAllocationBps / 10000),
            formatUsdFromCents(s.priceCents),
            formatUsdFromCents(s.annualDistributionCentsPerShare),
            formatPercent(s.indicatedYield),
            formatUsdFromCents(s.allocatedCapitalCents),
            s.modeledShares == null ? "—" : formatShares(s.modeledShares),
            formatUsdFromCents(s.projectedAnnualIncomeCents),
          ])}
        />
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {result.milestones.map((m) => (
          <article key={m.monthlyCents} className="border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Milestone {formatUsdFromCents(m.monthlyCents)} / mo
            </p>
            <p className="mt-2 text-2xl tabular-nums">
              {m.progress == null ? "—" : formatPercent(m.progress)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {m.achieved ? "Achieved (modeled)" : "Not yet achieved"}
            </p>
          </article>
        ))}
      </section>

      <IncomeProgressChart
        data={
          result.monthlyIncomeCents == null
            ? []
            : [{ label: "Current", monthly: result.monthlyIncomeCents / 100 }]
        }
      />

      <Disclaimer>
        This model estimates gross income using current prices and indicated distributions. It does
        not account for taxes, spreads, slippage, changing dividend rates, suspended distributions,
        call provisions, reinvestment, or future market prices. Distributions are not guaranteed.
      </Disclaimer>
      <AsOf value={data.incomeModel.asOf} />
    </div>
  );
}
