"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#F7931A", "#E8E2D6", "#7A8494", "#3D9B6E", "#C44C4C", "#A67C52"];

type SeriesPoint = Record<string, string | number | null>;

function ChartFrame({
  title,
  explanation,
  children,
  empty,
}: {
  title: string;
  explanation: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="text-sm font-medium text-[var(--foreground)]">{title}</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">{explanation}</p>
      <div className="mt-4 h-64 w-full">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            Insufficient data to chart yet.
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function PortfolioValueChart({
  data,
  usingLive = false,
}: {
  data: { label: string; value: number | null }[];
  usingLive?: boolean;
}) {
  const hasPoints = data.some((d) => d.value != null);
  return (
    <ChartFrame
      title={usingLive ? "Portfolio value (open / close / live)" : "Portfolio value (open / close)"}
      explanation={
        usingLive
          ? "Historical open/close marks stay as published. The latest point is the live regular-session mark."
          : "Append-only regular-session marks. Historical values are stored as published and are not recomputed from current prices."
      }
      empty={!hasPoints}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" stroke="#7A8494" fontSize={12} />
          <YAxis stroke="#7A8494" fontSize={12} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Portfolio"]}
            contentStyle={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              color: "#F5F1EA",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#F7931A"
            fill="rgba(247,147,26,0.15)"
            name="Portfolio ($)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function AllocationChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <ChartFrame
      title="Current allocation"
      explanation={
        total > 0
          ? "Derived from position market values when prices are available."
          : "Share counts are known; dollar allocation awaits confirmed prices."
      }
      empty={data.length === 0 || total === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              color: "#F5F1EA",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function BenchmarkReturnChart({
  data,
  seriesKeys,
}: {
  data: SeriesPoint[];
  seriesKeys: { key: string; label: string; color: string }[];
}) {
  const hasSeries = seriesKeys.some((series) =>
    data.some((row) => row[series.key] != null),
  );
  return (
    <ChartFrame
      title="Contribution-adjusted returns vs benchmarks"
      explanation="Portfolio return is contribution-adjusted. BTC/SPY/GLD percentage legs appear only when confirmed open/close prices exist in valuation history."
      empty={!hasSeries}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" stroke="#7A8494" fontSize={12} />
          <YAxis stroke="#7A8494" fontSize={12} tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} />
          <Tooltip
            formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`]}
            contentStyle={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              color: "#F5F1EA",
            }}
          />
          <Legend />
          {seriesKeys.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function CashFlowMatchedChart({
  data,
  usingLive = false,
}: {
  data: {
    label: string;
    portfolio: number | null;
    btc: number | null;
    spy: number | null;
    gld: number | null;
  }[];
  usingLive?: boolean;
}) {
  const hasPoints = data.some(
    (d) => d.portfolio != null || d.btc != null || d.spy != null || d.gld != null,
  );
  return (
    <ChartFrame
      title="Cash-flow-matched benchmark values"
      explanation={
        usingLive
          ? "Historical points use confirmed session prices. The latest point marks the live portfolio and scales benchmark legs from the prior close using live quotes."
          : "Hypothetical: same external cash flows allocated entirely to each benchmark at confirmed session prices. Not actual portfolio holdings."
      }
      empty={!hasPoints}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" stroke="#7A8494" fontSize={12} />
          <YAxis stroke="#7A8494" fontSize={12} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              color: "#F5F1EA",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="portfolio"
            name="Portfolio"
            stroke="#F7931A"
            dot={{ r: 3 }}
            connectNulls={false}
          />
          <Line type="monotone" dataKey="btc" name="Bitcoin" stroke="#E8E2D6" dot={{ r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="spy" name="SPY" stroke="#7A8494" dot={{ r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="gld" name="GLD" stroke="#A67C52" dot={{ r: 3 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ReserveGrowthChart({
  data,
}: {
  data: { label: string; sats: number }[];
}) {
  return (
    <ChartFrame
      title="WSB Bitcoin Reserve growth"
      explanation="Actual reserve balance in sats over time. Separate from securities portfolio performance."
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" stroke="#7A8494" fontSize={12} />
          <YAxis stroke="#7A8494" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              color: "#F5F1EA",
            }}
          />
          <Area type="monotone" dataKey="sats" stroke="#F7931A" fill="rgba(247,147,26,0.2)" name="Sats" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function IncomeProgressChart({
  data,
}: {
  data: { label: string; monthly: number }[];
}) {
  return (
    <ChartFrame
      title="Modeled monthly income over time"
      explanation="Hypothetical gross monthly income if the portfolio were converted into the income model at each valuation."
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" stroke="#7A8494" fontSize={12} />
          <YAxis stroke="#7A8494" fontSize={12} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              color: "#F5F1EA",
            }}
          />
          <Bar dataKey="monthly" fill="#F7931A" name="Monthly $" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function LookThroughChart({
  data,
}: {
  data: { label: string; sats: number | null }[];
}) {
  return (
    <ChartFrame
      title="Look-through BTC exposure by holding"
      explanation="Derived analytical estimate using diluted sats per share × shares × ADR ratio. Not direct ownership of issuer Bitcoin. Separate from portfolio market value and the WSB Bitcoin Reserve."
      empty={data.every((d) => d.sats == null)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" stroke="#7A8494" fontSize={12} />
          <YAxis stroke="#7A8494" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              color: "#F5F1EA",
            }}
          />
          <Line type="monotone" dataKey="sats" stroke="#F7931A" name="Look-through sats" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
