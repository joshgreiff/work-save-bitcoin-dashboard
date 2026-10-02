import { ResearchMethodology } from "@/components/learn/ResearchMethodology";
import { SectionIntro, Disclaimer } from "@/components/ui/primitives";

export const metadata = {
  title: "Methodology & Disclosures",
  description:
    "How the Fiat Freedom Portfolio dashboard calculates and presents figures, and how Work Save Bitcoin research notes are sourced.",
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
          <p>
            Contributions are matched to the valuation they belong to. An official close counts only
            contributions recorded at or before that close, so a deposit made after the latest close
            is listed as recorded after it and enters official value and P&amp;L together at the next
            close. Live marks include every recorded contribution because they already include the
            holdings those contributions bought. Earlier valuation-history points are never restated
            by later deposits.
          </p>
          <p>
            The contribution totals on the Portfolio page list every recorded external deposit and
            withdrawal, dated by the latest one. &ldquo;Starting value + added capital&rdquo; is the
            inception value plus net external capital added after inception, on the same basis as
            the P&amp;L beside it: through the official close when the official close is shown, and
            through now when a live mark is shown. Current value minus this figure equals investment
            P&amp;L, so added capital is never shown as a gain.
          </p>
          <p>
            Day-over-day and normalized portfolio returns exclude new money: each close-to-close
            return is (ending value − net external cash flow in the window) ÷ starting value − 1, and
            the normalized line chain-links those returns. Cash-flow-matched benchmarks only buy units
            with contributions made on or before each valuation point.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Benchmarks</h2>
          <p>
            Bitcoin (BTC/USD), SPY, and GLD are compared at confirmed regular-session open and close
            marks stored in valuation history (9:30 a.m. / 4:00 p.m. Eastern). Percentage view uses
            contribution-adjusted portfolio performance; benchmark legs appear only when prices are
            confirmed. Cash-flow-matched view mirrors external cash flows into each benchmark.
            After-hours marks are informational only.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Live quotes</h2>
          <p>
            During regular U.S. equity hours, overview ending values, portfolio marks, and the
            trailing tip on open/close charts use live quotes. Those live marks are informational
            only: they never replace official 4:00 p.m. Eastern closes in valuation history, and
            never update episode snapshots without confirmation. Historical chart points stay as
            published.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Bitcoin-per-share exposure</h2>
          <p>
            Look-through sats = shares owned × diluted sats per share. Diluted sats per share is the
            primary metric. Preferreds, ETFs, cash, and issuers without usable disclosures are
            excluded or marked unavailable. Only actual portfolio holdings enter look-through
            totals; research examples discussed in Learn notes do not.
          </p>
          <p>
            SPCX (SpaceX), held since October 2, 2026, is an operating-company allocation and is
            excluded from look-through totals. Its reported Bitcoin was about 0.05% of its June 30,
            2026 market value, so the position is not treated as a Bitcoin-amplification holding.
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
          <p>
            The automated official closes from September 25 through October 1, 2026 stored the
            previous session’s closes for MSTR, ASST, SPY, and GLD, because the job ran before the
            day’s daily bar was published. Those stored values are shown unchanged pending a
            correction. From October 2, the job uses the session’s regular-market close when the
            daily bar is not yet available and carries a prior close forward only when the session
            has no print.
          </p>
        </section>
        <section id="research-notes" className="scroll-mt-24 space-y-3">
          <h2 className="text-xl font-medium text-[var(--foreground)]">Research notes</h2>
          <ResearchMethodology />
          <p>
            Research notes are stored as validated data in <code>data/learn/research-notes.json</code>.
            Every claim carries one of six labels: <em>established fact</em>,{" "}
            <em>company target</em>, <em>speculative</em>, <em>interpretation</em>,{" "}
            <em>disputed</em>, or <em>open question</em>. An established fact must cite at least one
            primary, academic, official-data, or market-data source. A company target must cite the
            company’s own primary source, and a speculative scenario must cite who proposed it. The
            build fails otherwise. Podcasts, social posts, and creator commentary may be listed as
            commentary but are never used as primary evidence.
          </p>
          <p>
            Some notes use research-only issuer snapshots stored in{" "}
            <code>data/learn/research-snapshots.json</code>. Derived figures are calculated in a
            shared utility: basic sats per share = Bitcoin held × 100,000,000 ÷ reported common
            shares; diluted sats per share adds potentially dilutive awards; conditional performance
            awards are disclosed separately. Bitcoin value per share = reported Bitcoin fair value ÷
            reported common shares. Approximate market value applies one closing price to all
            reported common shares. These snapshots never value a Fiat Freedom Portfolio holding or
            enter valuation history, market observations, or look-through totals, and any allocation
            illustration is hypothetical. A company discussed in a note that is later bought is valued
            only from official closes, like every other holding.
          </p>
          <p>
            A note may also include a shareholder-value overview that summarizes each business line
            in one card and links it to the evidence section below. Each card’s evidence line is
            labeled and sourced under the same rules as any other claim, restates only figures that
            appear in the note’s cited claims, and shows its as-of date. Any accompanying
            shareholder-return equation is an interpretive framework, not a calculation.
          </p>
          <p>
            Each note shows its status (question, researching, published, or needs editorial review),
            publication and update dates, and a working thesis that is labeled as a working
            conclusion rather than a settled fact. Notes are revised by appending dated entries to the
            revision history; earlier revisions are not silently rewritten.
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
