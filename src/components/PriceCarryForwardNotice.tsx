import { formatEtTimestamp } from "@/lib/market/session";

type CarryForwardRow = {
  observationId: string;
  asOf: string;
  labels: string[];
};

export function PriceCarryForwardNotice({
  rows,
  title = "Price carry-forward notes",
}: {
  rows: CarryForwardRow[];
  title?: string;
}) {
  const visible = rows.filter((row) => row.labels.length > 0);
  if (visible.length === 0) return null;

  return (
    <aside className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <ul className="mt-3 space-y-3">
        {visible.map((row) => (
          <li key={row.observationId}>
            <p className="font-medium text-[var(--foreground)]">
              {formatEtTimestamp(row.asOf)}
            </p>
            {row.labels.map((label) => (
              <p key={label} className="mt-1">
                {label} The total is still a valid market-close valuation, but one component is
                estimated from its last available close.
              </p>
            ))}
          </li>
        ))}
      </ul>
    </aside>
  );
}
