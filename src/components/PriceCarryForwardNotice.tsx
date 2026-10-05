import { Expandable } from "@/components/ui/primitives";
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
    <Expandable
      title={title}
      description={`${visible.length} ${visible.length === 1 ? "close uses" : "closes use"} a carried-forward price for at least one component`}
    >
      <p className="text-sm text-[var(--muted-foreground)]">
        Each total is still a valid market-close valuation, but the listed components are estimated
        from their last available close. See the methodology for the known Sept. 25 – Oct. 1 timing
        limitation.
      </p>
      <ul className="space-y-3 text-sm text-[var(--muted-foreground)]">
        {visible.map((row) => (
          <li key={row.observationId}>
            <p className="font-medium text-[var(--foreground)]">{formatEtTimestamp(row.asOf)}</p>
            {row.labels.map((label) => (
              <p key={label} className="mt-1">
                {label}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </Expandable>
  );
}
