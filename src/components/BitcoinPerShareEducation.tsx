export function BitcoinPerShareEducation() {
  return (
    <section className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <h2 className="text-xl font-medium">
          How a company can buy Bitcoin while reducing Bitcoin per share
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Buying more Bitcoin does not automatically increase Bitcoin per share. The company must
          acquire Bitcoin faster than it increases its diluted share count.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="border border-[var(--border)] p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Starting position</p>
          <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">
            {`100 BTC
100 diluted shares
1.00 BTC per share`}
          </pre>
        </article>
        <article className="border border-[var(--border)] p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Accretive issuance</p>
          <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">
            {`Issue 100 new shares
Use proceeds to acquire 150 BTC
250 BTC ÷ 200 shares = 1.25
Bitcoin per share rises 25%`}
          </pre>
        </article>
        <article className="border border-[var(--border)] p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Dilutive issuance</p>
          <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">
            {`Issue 100 new shares
Use proceeds to acquire 50 BTC
150 BTC ÷ 200 shares = 0.75
Bitcoin per share falls 25%`}
          </pre>
        </article>
      </div>

      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        Debt and preferred financing can increase gross Bitcoin per common share without making the
        senior claims disappear. Gross diluted sats per share does not subtract debt, preferred
        liquidation preferences, or other senior obligations.
      </p>
    </section>
  );
}
