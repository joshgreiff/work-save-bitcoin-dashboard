import { SectionIntro, Disclaimer } from "@/components/ui/primitives";

export const metadata = {
  title: "Methodology & Disclosures",
  description: "How the Fiat Freedom Portfolio dashboard calculates and presents figures.",
};

export default function MethodologyPage() {
  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Transparency"
        title="Methodology and disclosures"
        description="Plain-language rules for how this dashboard treats the securities portfolio, Bitcoin Reserve, and income model."
      />

      <div className="prose-invert space-y-6 text-sm leading-relaxed text-[var(--muted-foreground)]">
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">What the portfolio is</h2>
          <p>
            A real securities portfolio documented for the Work Save Bitcoin Fiat Freedom Portfolio
            series. It may hold Bitcoin treasury equities and preferred securities for growth,
            experimentation, education, and eventual fiat-income generation.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">What it is not</h2>
          <p>
            It is not a recommendation, not a managed product for viewers, and not combined with the
            WSB Strategic Bitcoin Reserve. Viewer support does not create ownership of either ledger.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Contribution categories</h2>
          <p>
            External cash flows include initial funding, personal deposits, channel-income
            contributions, and viewer-support contributions into the securities account. Only
            transactions marked <code>externalCashFlow: true</code> affect contribution-adjusted
            performance. Dividends, options premiums, interest, and trading P&amp;L are investment
            results, not contributions.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Investment performance</h2>
          <p>
            Total investment profit or loss = current portfolio value + investment-related
            withdrawals − total external contributions. A deposit raises account value without
            creating investment profit.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Benchmarks</h2>
          <p>
            Bitcoin (BTC/USD), SPY, and GLD are compared using the portfolio valuation timestamp
            convention (prior 4:00 p.m. Eastern). Percentage view normalizes to 0% at inception using
            contribution-adjusted portfolio performance. Cash-flow-matched view mirrors external
            cash flows into each benchmark.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Bitcoin-per-share exposure</h2>
          <p>
            Look-through sats = shares owned × diluted sats per share. Diluted sats per share is the
            primary metric. Preferreds, ETFs, cash, and issuers without usable disclosures are
            excluded or marked unavailable.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Bitcoin Reserve separation</h2>
          <p>
            Reserve sats = sats received − sats sent − network fees. Reserve dollar changes never
            appear as securities-portfolio performance.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Modeled income</h2>
          <p>
            Deployable value equals securities portfolio value minus excluded cash. Each modeled
            security receives target allocation capital; modeled shares = capital ÷ price; annual
            income = shares × distribution per share. Monthly income = annual ÷ 12.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Data update frequency</h2>
          <p>
            Version 1 is manually maintained JSON updated around episode publications. Figures show
            explicit as-of timestamps. Stale data is never labeled live.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Known limitations</h2>
          <p>
            Episode 1 seed omits confirmed security prices, cost basis, benchmark prices, and issuer
            Bitcoin-per-share metrics. Income model securities are unconfigured until confirmed.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Disclosures</h2>
          <p>
            Position ownership: the series documents a portfolio associated with the Work Save
            Bitcoin channel operator. Affiliate links, when present, are listed on Resources and may
            generate channel revenue that can later be contributed—and labeled—as channel-income
            contributions. Educational content only; not investment, tax, or legal advice.
          </p>
        </section>
      </div>

      <Disclaimer>
        Always prefer primary company IR releases and SEC filings for Bitcoin treasury metrics.
        Secondary dashboards are used only when primary data is unavailable, and are cited.
      </Disclaimer>
    </div>
  );
}
