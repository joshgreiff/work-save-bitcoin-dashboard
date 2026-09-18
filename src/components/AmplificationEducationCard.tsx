export function AmplificationEducationCard() {
  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-medium">
        Why can MSTR move more than Bitcoin when sats per share is unchanged?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
        Diluted sats per share measures the quantity of Bitcoin associated with each diluted share.
        Its dollar value still changes when Bitcoin’s price changes. MSTR common equity is also the
        residual claim after debt and preferred obligations, while its market price may trade above
        or below common net asset value. MSTR can therefore amplify Bitcoin’s movement even when the
        quantity of Bitcoin per share has not changed.
      </p>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <article className="border border-[var(--border)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Gross BTC value / diluted share</p>
          <p className="mt-2 font-mono text-xs">BTC/share × BTC/USD</p>
        </article>
        <article className="border border-[var(--border)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Illustrative common NAV</p>
          <p className="mt-2 font-mono text-xs">Assets − net senior claims</p>
        </article>
        <article className="border border-[var(--border)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Illustrative market value</p>
          <p className="mt-2 font-mono text-xs">Common NAV × mNAV</p>
        </article>
      </div>

      <div className="mt-5 space-y-2 text-sm text-[var(--muted-foreground)]">
        <p className="font-medium text-[var(--foreground)]">
          Simplified educational example (not a Strategy valuation model)
        </p>
        <p>Bitcoin and other assets: $100 · Net senior claims: $20 · Common NAV: $80</p>
        <p>If assets rise 10% → Assets $110 · Claims $20 · NAV $90 · Common NAV return +12.5%</p>
        <p>If assets fall 10% → Assets $90 · Claims $20 · NAV $70 · Common NAV return −12.5%</p>
        <p>
          The asset moved by $10, but common shareholders began with an $80 residual claim. A $10
          movement relative to $80 equals 12.5%.
        </p>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
        This simplified example illustrates residual common-equity sensitivity. It is not a
        prediction that MSTR will move by a fixed multiple of Bitcoin. Actual MSTR performance also
        reflects changes in mNAV, capital-market expectations, options and equity-market flows, debt
        and preferred terms, cash and reserves, software and other assets, trading-hour differences,
        and future dilution or accretion. Secondary mNAV dashboards are not published here.
      </p>
    </section>
  );
}
