"use client";

import { useMemo, useState } from "react";
import {
  inflationCalculator,
  nominalEarnings,
  purchasingPowerDifference,
  satsFromRecurringPurchase,
} from "@/lib/learn/calculators";
import { ClaimBadge } from "@/components/learn/ClaimBadge";

function money(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function pct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

export function WorkToMoneyFlow() {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        {["Time", "Labor", "Dollars", "Future purchasing power"].map((step, index) => (
          <span key={step} className="inline-flex items-center gap-2">
            <span className="border border-[var(--accent)] px-3 py-2 text-[var(--accent)]">
              {step}
            </span>
            {index < 3 ? <span className="text-[var(--muted)]" aria-hidden>→</span> : null}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        A nominal wage can stay unchanged in dollars while the goods and services those dollars buy
        change. Purchasing power — not the printed number on a paycheck — is what carries your time
        forward.
      </p>
      <div className="mt-3">
        <ClaimBadge kind="illustration" />
      </div>
    </div>
  );
}

export function WagePurchasingPowerCalculator() {
  const [hourlyWage, setHourlyWage] = useState(20);
  const [hoursWorked, setHoursWorked] = useState(2000);
  const [inflation, setInflation] = useState(0.03);
  const [years, setYears] = useState(10);

  const result = useMemo(() => {
    const nominal = nominalEarnings(hourlyWage, hoursWorked);
    const pp = purchasingPowerDifference({
      nominalAmount: nominal,
      annualInflationRate: inflation,
      years,
    });
    return { nominal, ...pp };
  }, [hourlyWage, hoursWorked, inflation, years]);

  return (
    <section className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium">Hourly-wage example</h3>
        <ClaimBadge kind="illustration" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="wage"
          label="Hourly wage ($)"
          value={hourlyWage}
          onChange={setHourlyWage}
          min={0}
          step={0.5}
        />
        <Field
          id="hours"
          label="Hours worked"
          value={hoursWorked}
          onChange={setHoursWorked}
          min={0}
          step={1}
        />
        <Field
          id="infl"
          label="Annual inflation assumption"
          value={inflation}
          onChange={setInflation}
          min={-0.05}
          max={0.5}
          step={0.001}
          displayValue={`${(inflation * 100).toFixed(1)}%`}
          transform={(n) => n / 100}
          inverse={(n) => n * 100}
        />
        <Field
          id="years"
          label="Years"
          value={years}
          onChange={setYears}
          min={0}
          max={50}
          step={1}
        />
      </div>
      <dl className="grid gap-3 sm:grid-cols-3 text-sm">
        <Stat label="Nominal earnings" value={money(result.nominal)} />
        <Stat label="Purchasing power (today’s $)" value={money(result.purchasingPower)} />
        <Stat label="Purchasing-power difference" value={money(result.difference)} />
      </dl>
      <p className="text-xs text-[var(--muted)]">
        Illustrative estimate, not a forecast. Assumes a constant annual inflation rate.
      </p>
    </section>
  );
}

export function InflationCalculatorTool() {
  const [starting, setStarting] = useState(100);
  const [inflation, setInflation] = useState(0.02);
  const [years, setYears] = useState(10);

  const result = useMemo(
    () =>
      inflationCalculator({
        startingAmount: starting,
        annualInflationRate: inflation,
        years,
      }),
    [starting, inflation, years],
  );

  return (
    <section className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium">Inflation calculator</h3>
        <ClaimBadge kind="illustration" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="start" label="Starting amount ($)" value={starting} onChange={setStarting} min={0} step={1} />
        <Field
          id="rate"
          label="Inflation rate"
          value={inflation}
          onChange={setInflation}
          min={-0.05}
          max={0.5}
          step={0.001}
          displayValue={`${(inflation * 100).toFixed(1)}%`}
          transform={(n) => n / 100}
          inverse={(n) => n * 100}
        />
        <Field id="yrs" label="Years" value={years} onChange={setYears} min={0} max={100} step={1} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-3 text-sm">
        <Stat label="Future price of today’s basket" value={money(result.futureBasketPrice)} />
        <Stat label="Purchasing power of unchanged cash" value={money(result.cashPurchasingPower)} />
        <Stat label="Total percentage change (basket)" value={pct(result.totalPercentChange)} />
      </dl>
      <p className="text-xs text-[var(--muted)]">
        Default example: $100 at 2% for 10 years. Illustrative estimate, not a forecast.
      </p>
    </section>
  );
}

export function SatsCalculator(props: {
  btcUsdPrice: number | null;
  priceAsOf: string | null;
  sourceName: string | null;
}) {
  const [usd, setUsd] = useState(5);
  const [frequency, setFrequency] = useState<"one_time" | "weekly" | "monthly">("weekly");

  const result = useMemo(() => {
    if (props.btcUsdPrice == null) {
      return { satsToday: null, monthlyContributionUsd: null };
    }
    return satsFromRecurringPurchase({
      usdAmount: usd,
      frequency,
      btcUsdPrice: props.btcUsdPrice,
    });
  }, [usd, frequency, props.btcUsdPrice]);

  return (
    <section className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium">Small-budget sats calculator</h3>
        <ClaimBadge kind="illustration" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="usd" label="Dollar amount ($)" value={usd} onChange={setUsd} min={0} step={1} />
        <div>
          <label htmlFor="freq" className="text-sm text-[var(--foreground)]">
            Frequency
          </label>
          <select
            id="freq"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as typeof frequency)}
            className="mt-1 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="one_time">One time</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
      {props.btcUsdPrice == null ? (
        <p className="text-sm text-[var(--muted)]">
          Live BTC/USD is unavailable right now. No sats estimate is shown rather than inventing a
          price.
        </p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <Stat
            label="Approximate sats purchasable today"
            value={result.satsToday == null ? "—" : result.satsToday.toLocaleString("en-US")}
          />
          <Stat
            label="Monthly contribution amount"
            value={
              frequency === "one_time"
                ? "One-time purchase"
                : money(result.monthlyContributionUsd ?? NaN)
            }
          />
        </dl>
      )}
      <p className="text-xs text-[var(--muted)]">
        Price:{" "}
        {props.btcUsdPrice == null
          ? "unavailable"
          : money(props.btcUsdPrice)}
        {props.priceAsOf ? ` · as of ${props.priceAsOf}` : null}
        {props.sourceName ? ` · ${props.sourceName}` : null}. Does not project future Bitcoin prices
        or investment returns.
      </p>
    </section>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  displayValue?: string;
  transform?: (input: number) => number;
  inverse?: (stored: number) => number;
}) {
  const shown =
    props.displayValue ??
    (props.inverse ? String(props.inverse(props.value)) : String(props.value));
  return (
    <div>
      <label htmlFor={props.id} className="text-sm text-[var(--foreground)]">
        {props.label}
      </label>
      <input
        id={props.id}
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.inverse ? props.inverse(props.value) : props.value}
        onChange={(e) => {
          const raw = Number(e.target.value);
          props.onChange(props.transform ? props.transform(raw) : raw);
        }}
        aria-describedby={props.displayValue ? `${props.id}-shown` : undefined}
        className="mt-1 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--accent)]"
      />
      {props.displayValue ? (
        <p id={`${props.id}-shown`} className="mt-1 text-xs text-[var(--muted)]">
          {shown}
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] p-3">
      <dt className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-2 text-lg font-medium tabular-nums text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
