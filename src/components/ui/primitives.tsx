import Link from "next/link";
import { formatAsOf, formatUsdFromCents, formatPercent, formatSats, formatBtcFromSats, formatShares } from "@/lib/accounting/format";

export function AsOf({ value }: { value: string | null | undefined }) {
  return (
    <p className="mt-2 text-xs text-[var(--muted)] tabular-nums">{formatAsOf(value)}</p>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  asOf,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  asOf?: string | null;
  tone?: "neutral" | "positive" | "negative" | "accent";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--positive)]"
      : tone === "negative"
        ? "text-[var(--negative)]"
        : tone === "accent"
          ? "text-[var(--accent)]"
          : "text-[var(--foreground)]";

  return (
    <article className="border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-medium tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p> : null}
      {asOf ? <AsOf value={asOf} /> : null}
    </article>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-8 max-w-3xl">
      {eyebrow ? (
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-[var(--muted-foreground)]">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <aside className="border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
      {children}
    </aside>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | null | undefined)[][];
}) {
  return (
    <div className="overflow-x-auto border border-[var(--border)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--surface-elevated)] text-xs uppercase tracking-wide text-[var(--muted)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--border)]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 tabular-nums text-[var(--foreground)]">
                  {cell == null || cell === "" ? "—" : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}

export {
  formatUsdFromCents,
  formatPercent,
  formatSats,
  formatBtcFromSats,
  formatShares,
};
