"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateIncomeModel,
  resolveAnnualDistributionCentsPerShare,
} from "@/lib/accounting/income-model";
import { projectBitcoinPrices } from "@/lib/accounting/scenario-btc";
import { amplifyCommonEquity, projectMstrNav } from "@/lib/accounting/scenario-mstr";
import {
  frequencyToPeriodsPerYear,
  projectPreferredTotalReturn,
} from "@/lib/accounting/scenario-preferred";
import {
  calculateRiskMetrics,
  periodTotalReturnsFromPrices,
} from "@/lib/accounting/risk-metrics";
import {
  formatPercent,
  formatShares,
  formatUsdFromCents,
} from "@/lib/accounting/format";
import type { PublicDashboard } from "@/lib/data/public-dashboard";
import type { LiveQuotesResponse } from "@/lib/quotes/types";

type TabId = "income" | "scenario" | "compare";

type AllocationRow = {
  ticker: string;
  name?: string;
  targetAllocationBps: number;
  priceCents: number | null;
  annualDistributionCentsPerShare: number | null;
  note?: string;
};

function ChartShell({
  title,
  kind,
  children,
  empty,
}: {
  title: string;
  kind: "projected" | "historical";
  children?: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <span
          className={`text-[10px] uppercase tracking-[0.12em] ${
            kind === "projected" ? "text-[var(--accent)]" : "text-[var(--muted)]"
          }`}
        >
          {kind === "projected" ? "Projected / assumed" : "Historical"}
        </span>
      </div>
      <div className="mt-4 h-56 w-full">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            Insufficient history.
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  edited,
  onReset,
}: {
  label: string;
  children: React.ReactNode;
  edited?: boolean;
  onReset?: () => void;
}) {
  return (
    <label className="block text-sm">
      <span className="flex items-center gap-2 text-[var(--muted)]">
        {label}
        {edited ? (
          <span className="text-[10px] uppercase tracking-wide text-[var(--accent)]">
            Edited
          </span>
        ) : null}
        {edited && onReset ? (
          <button
            type="button"
            className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] underline"
            onClick={onReset}
          >
            Reset
          </button>
        ) : null}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums text-[var(--foreground)]";

export function IncomeModelLab({ data }: { data: PublicDashboard }) {
  const income = data.incomeModel;
  const officialDeployable = income.result.deployableValueCents;

  const [tab, setTab] = useState<TabId>("income");
  const [wholeSharesOnly, setWholeSharesOnly] = useState(income.wholeSharesOnly);
  const [deployableOverride, setDeployableOverride] = useState<string>("");
  const [allocations, setAllocations] = useState<AllocationRow[]>(
    income.allocation.map((s) => ({ ...s })),
  );
  const [quotes, setQuotes] = useState<LiveQuotesResponse | null>(null);

  const [presetId, setPresetId] = useState(
    income.scenarioPresets.find((p) => p.id === "base")?.id ??
      income.scenarioPresets[0]?.id ??
      "base",
  );
  const activePreset =
    income.scenarioPresets.find((p) => p.id === presetId) ??
    income.scenarioPresets[0];

  const [horizonYears, setHorizonYears] = useState(income.defaultHorizonYears);
  const [bitcoinStartUsd, setBitcoinStartUsd] = useState("");
  const [bitcoinCagr, setBitcoinCagr] = useState(activePreset?.bitcoinCagr ?? 0.2);
  const [btcPerShareGrowth, setBtcPerShareGrowth] = useState(
    activePreset?.annualBtcPerShareGrowth ?? 0.05,
  );
  const [startingMnav, setStartingMnav] = useState(activePreset?.startingMnav ?? 1.8);
  const [terminalMnav, setTerminalMnav] = useState(activePreset?.terminalMnav ?? 1.8);
  const [startingBtcPerShare, setStartingBtcPerShare] = useState("0.001");
  const [seniorClaimsPerShare, setSeniorClaimsPerShare] = useState("50");
  const [cashPerShare, setCashPerShare] = useState("5");
  const [softwarePerShare, setSoftwarePerShare] = useState("10");
  const [reinvest, setReinvest] = useState(true);
  const [afterTax, setAfterTax] = useState(false);
  const [taxRate, setTaxRate] = useState(0.24);
  const [inflationRate, setInflationRate] = useState(income.defaultInflationRate);
  const [riskFreeRate, setRiskFreeRate] = useState(income.defaultRiskFreeRate);
  const [preferredRequiredYield, setPreferredRequiredYield] = useState(
    activePreset?.preferredTerminalRequiredYield ?? 0.1,
  );
  const [callActivated, setCallActivated] = useState(false);
  const [dividendStress, setDividendStress] = useState(
    activePreset?.dividendStress ?? false,
  );
  const [strcRateBps, setStrcRateBps] = useState(1200);

  useEffect(() => {
    let cancelled = false;
    async function loadQuotes() {
      try {
        const response = await fetch("/api/live-quotes", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as LiveQuotesResponse;
        if (!cancelled) {
          setQuotes(payload);
          const btc = payload.quotes.find((q) => q.symbol === "BTCUSD");
          if (btc) {
            setBitcoinStartUsd((prev) =>
              prev === "" ? (btc.priceCents / 100).toFixed(2) : prev,
            );
          }
        }
      } catch {
        // Live quotes are optional for the calculator.
      }
    }
    void loadQuotes();
    const id = window.setInterval(loadQuotes, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  function applyPreset(id: string) {
    const preset = income.scenarioPresets.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setBitcoinCagr(preset.bitcoinCagr);
    setBtcPerShareGrowth(preset.annualBtcPerShareGrowth);
    setStartingMnav(preset.startingMnav);
    setTerminalMnav(preset.terminalMnav);
    setPreferredRequiredYield(preset.preferredTerminalRequiredYield);
    setDividendStress(preset.dividendStress);
  }

  const catalogByTicker = useMemo(
    () => new Map(income.catalog.securities.map((s) => [s.ticker, s])),
    [income.catalog.securities],
  );

  const pricedAllocations = useMemo(() => {
    return allocations.map((row) => {
      if (row.ticker === "CASH") return row;
      const quote = quotes?.quotes.find((q) => q.symbol === row.ticker);
      if (!quote) return row;
      return { ...row, priceCents: quote.priceCents };
    });
  }, [allocations, quotes]);

  const modelForCalc = useMemo(() => {
    const securities = pricedAllocations.map((row) => {
      if (row.ticker === "STRC") {
        const catalog = catalogByTicker.get("STRC");
        const dist = resolveAnnualDistributionCentsPerShare({
          annualDistributionCentsPerShare: null,
          statedAmountCents: catalog?.statedAmountCents ?? 10000,
          annualDistributionRateBps: strcRateBps,
        });
        return {
          ...row,
          annualDistributionCentsPerShare: dist,
        };
      }
      return row;
    });
    return {
      asOf: income.asOf,
      wholeSharesOnly,
      excludedCashCents: income.excludedCashCents,
      milestonesMonthlyCents: income.milestonesMonthlyCents,
      securities,
      illustrativePreset: income.illustrativePreset,
      scenarioPresets: income.scenarioPresets,
      notes: income.notes,
      defaultHorizonYears: income.defaultHorizonYears,
      defaultRiskFreeRate: income.defaultRiskFreeRate,
      defaultInflationRate: income.defaultInflationRate,
      minHistoryObservations: income.minHistoryObservations,
    };
  }, [
    pricedAllocations,
    catalogByTicker,
    income,
    wholeSharesOnly,
    strcRateBps,
  ]);

  const overrideCents =
    deployableOverride.trim() === ""
      ? null
      : Math.round(Number(deployableOverride) * 100);

  const liveResult = useMemo(
    () =>
      calculateIncomeModel({
        portfolioValueCents: data.portfolio.currentPortfolioValueCents,
        model: modelForCalc,
        catalogByTicker,
        deployableValueOverrideCents: overrideCents,
      }),
    [
      catalogByTicker,
      data.portfolio.currentPortfolioValueCents,
      modelForCalc,
      overrideCents,
    ],
  );

  const allocationTotalBps = allocations.reduce(
    (sum, row) => sum + row.targetAllocationBps,
    0,
  );

  const btcStartCents = Math.round(Number(bitcoinStartUsd || "0") * 100);
  const btcPath = useMemo(
    () =>
      projectBitcoinPrices({
        startingPriceCents: Math.max(1, btcStartCents || 1),
        horizonYears,
        cagr: bitcoinCagr,
        inflationRate,
      }),
    [btcStartCents, horizonYears, bitcoinCagr, inflationRate],
  );

  const mstrPath = useMemo(
    () =>
      projectMstrNav({
        horizonYears,
        bitcoinPricesCents: btcPath.map((p) => p.priceCents),
        startingBtcPerDilutedShare: Number(startingBtcPerShare) || 0,
        annualBtcPerShareGrowth: btcPerShareGrowth,
        startingNetSeniorClaimsPerShareCents: Math.round(
          Number(seniorClaimsPerShare || "0") * 100,
        ),
        annualSeniorClaimsGrowth: 0,
        startingCashPerShareCents: Math.round(Number(cashPerShare || "0") * 100),
        startingSoftwareValuePerShareCents: Math.round(
          Number(softwarePerShare || "0") * 100,
        ),
        startingMnav,
        terminalMnav,
      }),
    [
      horizonYears,
      btcPath,
      startingBtcPerShare,
      btcPerShareGrowth,
      seniorClaimsPerShare,
      cashPerShare,
      softwarePerShare,
      startingMnav,
      terminalMnav,
    ],
  );

  const preferredPaths = useMemo(() => {
    return ["STRF", "STRC"]
      .filter((ticker) => catalogByTicker.get(ticker)?.projectionsEnabled !== false)
      .map((ticker) => {
      const catalog = catalogByTicker.get(ticker);
      const row = pricedAllocations.find((a) => a.ticker === ticker);
      const price = row?.priceCents ?? 10000;
      const annualDist =
        ticker === "STRC"
          ? resolveAnnualDistributionCentsPerShare({
              statedAmountCents: 10000,
              annualDistributionRateBps: strcRateBps,
            })
          : (row?.annualDistributionCentsPerShare ??
            resolveAnnualDistributionCentsPerShare({
              annualDistributionCentsPerShare:
                catalog?.annualDistributionCentsPerShare ?? null,
              statedAmountCents: catalog?.statedAmountCents ?? null,
              annualDistributionRateBps: catalog?.annualDistributionRateBps ?? null,
            }) ?? 0);
      const projected = projectPreferredTotalReturn({
        horizonYears,
        startingPriceCents: price ?? 10000,
        annualDistributionCentsPerShare: annualDist ?? 0,
        distributionFrequencyPerYear: frequencyToPeriodsPerYear(
          catalog?.distributionFrequency ?? "quarterly",
        ),
        terminalRequiredYield: preferredRequiredYield,
        reinvestDistributions: reinvest,
        ordinaryCallable: catalog?.ordinaryCallable ?? false,
        ordinaryCallActivated: callActivated,
        ordinaryCallPriceCents: catalog?.ordinaryCallPriceCents ?? null,
        dividendStressHaircut: dividendStress ? 0.5 : 0,
      });
      return { ticker, ...projected };
    });
  }, [
    pricedAllocations,
    callActivated,
    catalogByTicker,
    dividendStress,
    horizonYears,
    preferredRequiredYield,
    reinvest,
    strcRateBps,
  ]);

  const growthOf1000 = useMemo(() => {
    return Array.from({ length: horizonYears + 1 }, (_, year) => {
      const btc = btcPath[year]!;
      const mstr = mstrPath[year]!;
      const row: Record<string, number | string> = {
        year: `Y${year}`,
        BTC: Math.round(1000 * (btc.priceCents / btcPath[0]!.priceCents)),
        MSTR:
          mstrPath[0]?.projectedPriceCents && mstr.projectedPriceCents
            ? Math.round(
                1000 *
                  (mstr.projectedPriceCents / mstrPath[0].projectedPriceCents),
              )
            : 0,
      };
      for (const pref of preferredPaths) {
        const start = pref.points[0]?.portfolioValueCents || 1;
        row[pref.ticker] = Math.round(
          1000 * ((pref.points[year]?.portfolioValueCents || 0) / start),
        );
      }
      return row;
    });
  }, [btcPath, horizonYears, mstrPath, preferredPaths]);

  const incomeBySecurityChart = liveResult.securities.map((s) => ({
    label: s.ticker,
    annual: (s.projectedAnnualIncomeCents ?? 0) / 100,
  }));

  const comparisonRows = income.catalog.securities
    .filter((s) => s.role === "preferred" || s.ticker === "IBIT" || s.ticker === "MSTR")
    .map((security) => {
      const series = income.history.series.find((s) => s.ticker === security.ticker);
      const prices = series?.points.map((p) => p.priceCents) ?? [];
      const dists = series?.points.map((p) => p.distributionCents) ?? [];
      const periodReturns = periodTotalReturnsFromPrices({
        pricesCents: prices,
        distributionsCents: dists,
      });
      const allocation = pricedAllocations.find((a) => a.ticker === security.ticker);
      const annualDist =
        security.ticker === "STRC"
          ? resolveAnnualDistributionCentsPerShare({
              statedAmountCents: security.statedAmountCents,
              annualDistributionRateBps: strcRateBps,
            })
          : resolveAnnualDistributionCentsPerShare({
              annualDistributionCentsPerShare:
                allocation?.annualDistributionCentsPerShare ??
                security.annualDistributionCentsPerShare,
              statedAmountCents: security.statedAmountCents,
              annualDistributionRateBps: security.annualDistributionRateBps,
            });
      const price = allocation?.priceCents ?? null;
      const yieldNow =
        annualDist != null && price
          ? annualDist / price
          : null;
      const metrics = calculateRiskMetrics({
        periodReturns,
        wealthPath: prices,
        minObservations: income.minHistoryObservations,
        riskFreeRate,
        currentIndicatedYield: yieldNow,
        seriesKind: "historical",
      });
      return { security, metrics, yieldNow, annualDist, price };
    });

  const amplificationUp = amplifyCommonEquity({
    assetValueCents: 20000,
    fixedSeniorClaimsCents: 5000,
  });
  const amplificationDown = amplifyCommonEquity({
    assetValueCents: 8000,
    fixedSeniorClaimsCents: 5000,
  });

  const tabs: { id: TabId; label: string }[] = [
    { id: "income", label: "Income Today" },
    { id: "scenario", label: "Scenario Lab" },
    { id: "compare", label: "Security Comparison" },
  ];

  return (
    <div className="space-y-6">
      <aside className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        The Scenario Lab produces hypothetical results from user-selected assumptions. It is not a
        forecast and does not account for every feature of Strategy’s capital structure, taxes,
        liquidity, spreads, dividend changes, dilution, refinancing, calls, defaults or market
        sentiment.
        <span className="mt-2 block">
          Preferred dividends are not guaranteed. Bitcoin appreciation does not automatically
          increase preferred-security distributions or prices.
        </span>
      </aside>

      {income.illustrativePreset ? (
        <p className="text-sm text-[var(--accent)]">
          Starting allocation is an <strong>illustrative only</strong> preset and is fully
          editable. It is not a recommendation.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-2 text-sm ${
              tab === item.id
                ? "border border-[var(--accent)] text-[var(--accent)]"
                : "border border-[var(--border)] text-[var(--muted-foreground)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "income" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Deployable capital override (USD)">
              <input
                className={inputClass}
                inputMode="decimal"
                placeholder={(officialDeployable / 100).toFixed(2)}
                value={deployableOverride}
                onChange={(e) => setDeployableOverride(e.target.value)}
              />
            </Field>
            <Field label="Share modeling">
              <select
                className={inputClass}
                value={wholeSharesOnly ? "whole" : "fractional"}
                onChange={(e) => setWholeSharesOnly(e.target.value === "whole")}
              >
                <option value="fractional">Fractional shares</option>
                <option value="whole">Whole shares only</option>
              </select>
            </Field>
            <Field
              label="STRC rate (bps, dated/editable)"
              edited={strcRateBps !== 1200}
              onReset={() => setStrcRateBps(1200)}
            >
              <input
                className={inputClass}
                type="number"
                value={strcRateBps}
                onChange={(e) => setStrcRateBps(Number(e.target.value))}
              />
            </Field>
            <div className="border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Observed deployable (official close)
              </p>
              <p className="mt-2 text-xl tabular-nums">
                {formatUsdFromCents(officialDeployable)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Excludes WSB Bitcoin Reserve. Override never mutates the actual portfolio.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Ticker</th>
                  <th className="py-2 pr-3">Alloc %</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Ann. dist/sh</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {pricedAllocations.map((row, index) => (
                  <tr key={row.ticker} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-3">{row.ticker}</td>
                    <td className="py-2 pr-3">
                      <input
                        className={`${inputClass} max-w-24`}
                        type="number"
                        value={(row.targetAllocationBps / 100).toFixed(2)}
                        onChange={(e) => {
                          const pct = Number(e.target.value);
                          setAllocations((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    targetAllocationBps: Math.round(pct * 100),
                                  }
                                : item,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatUsdFromCents(row.priceCents)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatUsdFromCents(
                        row.ticker === "STRC"
                          ? resolveAnnualDistributionCentsPerShare({
                              statedAmountCents: 10000,
                              annualDistributionRateBps: strcRateBps,
                            })
                          : row.annualDistributionCentsPerShare,
                      )}
                    </td>
                    <td className="py-2 text-[var(--muted)]">{row.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            className={`text-sm ${
              allocationTotalBps === 10000
                ? "text-[var(--positive)]"
                : "text-[var(--negative)]"
            }`}
          >
            Allocations total {(allocationTotalBps / 100).toFixed(2)}%{" "}
            {allocationTotalBps === 10000 ? "(valid)" : "(must equal 100%)"}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Deployable value used"
              value={formatUsdFromCents(liveResult.deployableValueCents)}
            />
            <Metric
              label="Projected annual gross income"
              value={formatUsdFromCents(liveResult.annualIncomeCents)}
            />
            <Metric
              label="Projected monthly gross income"
              value={formatUsdFromCents(liveResult.monthlyIncomeCents)}
            />
            <Metric
              label="Blended indicated yield"
              value={formatPercent(liveResult.blendedIndicatedYield)}
            />
          </div>

          {wholeSharesOnly ? (
            <p className="text-sm text-[var(--muted)]">
              Whole-share residual cash modeled:{" "}
              {formatUsdFromCents(liveResult.residualCashCents)}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Ticker</th>
                  <th className="py-2 pr-3">Yield</th>
                  <th className="py-2 pr-3">Capital</th>
                  <th className="py-2 pr-3">Shares</th>
                  <th className="py-2 pr-3">Annual</th>
                  <th className="py-2">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {liveResult.securities.map((s) => (
                  <tr key={s.ticker} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-3">{s.ticker}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatPercent(s.indicatedYield)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatUsdFromCents(s.allocatedCapitalCents)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {s.modeledShares == null ? "—" : formatShares(s.modeledShares)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatUsdFromCents(s.projectedAnnualIncomeCents)}
                    </td>
                    <td className="py-2 tabular-nums">
                      {formatUsdFromCents(s.projectedMonthlyIncomeCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liveResult.milestones.map((m) => (
              <article
                key={m.monthlyCents}
                className="border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Milestone {formatUsdFromCents(m.monthlyCents)} / mo
                </p>
                <p className="mt-2 text-2xl tabular-nums">
                  {m.progress == null ? "—" : formatPercent(m.progress)}
                </p>
              </article>
            ))}
          </div>

          <ChartShell title="Annual income by security" kind="projected">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incomeBySecurityChart}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#7A8494" fontSize={12} />
                <YAxis stroke="#7A8494" fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="annual"
                  stroke="#F7931A"
                  fill="rgba(247,147,26,0.2)"
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartShell>
        </div>
      ) : null}

      {tab === "scenario" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {income.scenarioPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`border px-3 py-2 text-sm ${
                  presetId === preset.id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]"
                }`}
              >
                {preset.name} · {preset.label}
              </button>
            ))}
          </div>
          {activePreset ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
              {activePreset.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Horizon (years)">
              <input
                className={inputClass}
                type="number"
                min={1}
                max={10}
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
              />
            </Field>
            <Field label="Starting Bitcoin price (USD)">
              <input
                className={inputClass}
                value={bitcoinStartUsd}
                onChange={(e) => setBitcoinStartUsd(e.target.value)}
              />
            </Field>
            <Field label="Assumed Bitcoin CAGR">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                value={bitcoinCagr}
                onChange={(e) => setBitcoinCagr(Number(e.target.value))}
              />
            </Field>
            <Field label="BTC per diluted share (start)">
              <input
                className={inputClass}
                value={startingBtcPerShare}
                onChange={(e) => setStartingBtcPerShare(e.target.value)}
              />
            </Field>
            <Field label="Assumed annual BTC/share growth">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                value={btcPerShareGrowth}
                onChange={(e) => setBtcPerShareGrowth(Number(e.target.value))}
              />
            </Field>
            <Field label="Starting mNAV">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                value={startingMnav}
                onChange={(e) => setStartingMnav(Number(e.target.value))}
              />
            </Field>
            <Field label="Terminal mNAV">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                value={terminalMnav}
                onChange={(e) => setTerminalMnav(Number(e.target.value))}
              />
            </Field>
            <Field label="Net senior claims / share (USD)">
              <input
                className={inputClass}
                value={seniorClaimsPerShare}
                onChange={(e) => setSeniorClaimsPerShare(e.target.value)}
              />
            </Field>
            <Field label="Cash / share (USD)">
              <input
                className={inputClass}
                value={cashPerShare}
                onChange={(e) => setCashPerShare(e.target.value)}
              />
            </Field>
            <Field label="Software / other value per share (USD)">
              <input
                className={inputClass}
                value={softwarePerShare}
                onChange={(e) => setSoftwarePerShare(e.target.value)}
              />
            </Field>
            <Field label="Preferred terminal required yield">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                value={preferredRequiredYield}
                onChange={(e) => setPreferredRequiredYield(Number(e.target.value))}
              />
            </Field>
            <Field label="Inflation (real-return display)">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
              />
            </Field>
            <Field label="Risk-free rate">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(Number(e.target.value))}
              />
            </Field>
            <Field label="Reinvest distributions">
              <select
                className={inputClass}
                value={reinvest ? "yes" : "no"}
                onChange={(e) => setReinvest(e.target.value === "yes")}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
            <Field label="Tax mode">
              <select
                className={inputClass}
                value={afterTax ? "after" : "pre"}
                onChange={(e) => setAfterTax(e.target.value === "after")}
              >
                <option value="pre">Pre-tax</option>
                <option value="after">After-tax (simple haircut)</option>
              </select>
            </Field>
            {afterTax ? (
              <Field label="Tax rate">
                <input
                  className={inputClass}
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </Field>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={callActivated}
                onChange={(e) => setCallActivated(e.target.checked)}
              />
              Activate ordinary call cap (STRC $101 — not STRF)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dividendStress}
                onChange={(e) => setDividendStress(e.target.checked)}
              />
              Dividend-stress haircut (preferred)
            </label>
          </div>

          <p className="text-sm text-[var(--muted)]">
            Amplification illustration (assets − fixed senior claims): up{" "}
            {formatUsdFromCents(amplificationUp)} vs down{" "}
            {formatUsdFromCents(amplificationDown)}. Not a forecast that MSTR moves by a fixed
            Bitcoin multiple.
          </p>

          {mstrPath.some((p) => p.negativeNav) ? (
            <p className="text-sm text-[var(--negative)]">
              Warning: common NAV is zero or negative in one or more years; projected MSTR price is
              floored at $0 for those years.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartShell title="Projected value of $1,000" kind="projected">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthOf1000}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" stroke="#7A8494" fontSize={12} />
                  <YAxis stroke="#7A8494" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="BTC" stroke="#E8E2D6" strokeDasharray="5 4" dot={false} />
                  <Line dataKey="MSTR" stroke="#F7931A" strokeDasharray="5 4" dot={false} />
                  <Line dataKey="STRF" stroke="#7A8494" strokeDasharray="5 4" dot={false} />
                  <Line dataKey="STRC" stroke="#A67C52" strokeDasharray="5 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="BTC price path" kind="projected">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={btcPath.map((p) => ({
                    year: `Y${p.year}`,
                    price: p.priceCents / 100,
                    real: (p.realPriceCents ?? 0) / 100,
                  }))}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" stroke="#7A8494" fontSize={12} />
                  <YAxis stroke="#7A8494" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="price" name="Nominal" stroke="#F7931A" strokeDasharray="4 3" />
                  <Line dataKey="real" name="Inflation-adj." stroke="#7A8494" strokeDasharray="2 3" />
                </LineChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="MSTR common NAV bridge" kind="projected">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mstrPath.map((p) => ({
                    year: `Y${p.year}`,
                    nav: p.commonNavPerShareCents / 100,
                    price: (p.projectedPriceCents ?? 0) / 100,
                    btcPerShare: p.btcPerDilutedShare,
                  }))}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" stroke="#7A8494" fontSize={12} />
                  <YAxis stroke="#7A8494" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="nav" name="Common NAV/sh" stroke="#E8E2D6" strokeDasharray="4 3" />
                  <Line dataKey="price" name="Proj. price" stroke="#F7931A" strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="BTC per diluted share path" kind="projected">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mstrPath.map((p) => ({
                    year: `Y${p.year}`,
                    btcPerShare: p.btcPerDilutedShare,
                  }))}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" stroke="#7A8494" fontSize={12} />
                  <YAxis stroke="#7A8494" fontSize={12} />
                  <Tooltip />
                  <Line
                    dataKey="btcPerShare"
                    stroke="#F7931A"
                    strokeDasharray="4 3"
                    name="BTC / diluted share"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartShell>
          </div>

          <p className="text-xs text-[var(--muted)]">
            After-tax mode currently applies only as a display reminder ({(taxRate * 100).toFixed(0)}
            % assumption) — scenario chart values remain pre-tax gross paths unless you haircut
            inputs yourself.
          </p>
        </div>
      ) : null}

      {tab === "compare" ? (
        <div className="space-y-6">
          <p className="text-sm text-[var(--muted-foreground)]">
            Historical risk metrics require verified total-return history. Projected Scenario Lab
            assumptions never appear in these historical columns.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Ticker</th>
                  <th className="py-2 pr-3">Indicated yield</th>
                  <th className="py-2 pr-3">Ann. total return</th>
                  <th className="py-2 pr-3">Vol</th>
                  <th className="py-2 pr-3">Sharpe</th>
                  <th className="py-2 pr-3">Sortino</th>
                  <th className="py-2 pr-3">Max DD</th>
                  <th className="py-2 pr-3">Income/vol</th>
                  <th className="py-2 pr-3">Cumulative</th>
                  <th className="py-2 pr-3">Seniority</th>
                  <th className="py-2">Sources</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ security, metrics, yieldNow }) => (
                  <tr key={security.ticker} className="border-t border-[var(--border)] align-top">
                    <td className="py-2 pr-3">{security.ticker}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatPercent(yieldNow)}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {metrics.available
                        ? formatPercent(metrics.annualizedTotalReturn)
                        : "Insufficient history"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {metrics.available
                        ? formatPercent(metrics.annualizedVolatility)
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {metrics.sharpeRatio == null
                        ? "—"
                        : metrics.sharpeRatio.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {metrics.sortinoRatio == null
                        ? "—"
                        : metrics.sortinoRatio.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {metrics.maximumDrawdown == null
                        ? "—"
                        : formatPercent(metrics.maximumDrawdown)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {metrics.incomeToVolatilityRatio == null
                        ? "—"
                        : metrics.incomeToVolatilityRatio.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3">{security.cumulativeKind}</td>
                    <td className="py-2 pr-3">{security.seniorityLabel ?? "—"}</td>
                    <td className="py-2 text-xs text-[var(--muted)]">
                      {security.sources[0]?.sourceName ?? "—"}
                      {security.rateAsOf ? ` · as of ${security.rateAsOf}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-medium">Daniel Hillery risk framework</h3>
            <p className="text-sm text-[var(--muted)]">
              Preferreds are not ranked solely by headline yield. Review seniority, rate type,
              cumulative protections, call risk, coverage, and liquidity qualitatively.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {income.catalog.securities
                .filter((s) => s.role === "preferred")
                .map((security) => (
                  <article
                    key={security.ticker}
                    className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
                  >
                    <h4 className="font-medium">{security.ticker}</h4>
                    <ul className="mt-2 space-y-1 text-[var(--muted-foreground)]">
                      <li>Issuer: {security.issuer ?? "—"}</li>
                      <li>Rate: {security.rateKind}</li>
                      <li>Cumulative: {security.cumulativeKind}</li>
                      <li>Convertible: {security.convertibility}</li>
                      <li>
                        Ordinary callable:{" "}
                        {security.ordinaryCallable
                          ? `yes${
                              security.ordinaryCallPriceCents != null
                                ? ` @ $${(security.ordinaryCallPriceCents / 100).toFixed(2)}`
                                : ""
                            }`
                          : "no"}
                      </li>
                      <li>
                        Other redemptions: clean-up{" "}
                        {security.cleanUpRedemption ? "yes" : "no"} / tax{" "}
                        {security.taxRedemption ? "yes" : "no"} / fund. change{" "}
                        {security.fundamentalChangeRepurchase ? "yes" : "no"}
                      </li>
                      <li>
                        Missed-dividend:{" "}
                        {security.comparisonHints?.missedDividendProtections ?? "—"}
                      </li>
                      <li>
                        Fundamental change:{" "}
                        {security.comparisonHints?.fundamentalChangeProvisions ?? "—"}
                      </li>
                      <li>Liquidity: {security.comparisonHints?.liquidityNote ?? "—"}</li>
                      {security.riskNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </article>
                ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartShell title="Historical total return" kind="historical" empty />
            <ChartShell title="Historical drawdown" kind="historical" empty />
            <ChartShell title="Historical rolling volatility" kind="historical" empty />
            <ChartShell title="Historical rolling Sharpe" kind="historical" empty />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-medium tabular-nums">{value}</p>
    </article>
  );
}
