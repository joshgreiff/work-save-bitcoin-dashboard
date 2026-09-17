import { IncomeModelLab } from "@/components/income/IncomeModelLab";
import { Disclaimer, SectionIntro } from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export const metadata = {
  title: "Fiat Freedom Income Model",
  description:
    "Hypothetical income calculator and Scenario Lab for Bitcoin-linked preferred allocations. Separate from actual portfolio performance.",
};

export default function IncomeModelPage() {
  const data = buildPublicDashboard();

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Hypothetical conversion"
        title="Fiat Freedom Income Model"
        description="Interactive Income Today calculator and Scenario Lab. Uses the actual securities portfolio’s deployable value as an input only — it never alters portfolio history, the Bitcoin Reserve, or reported investment performance."
      />

      <IncomeModelLab data={data} />

      <Disclaimer>
        Gross income estimates use indicated distributions and user assumptions. They do not account
        for taxes (beyond optional simple haircuts), spreads, slippage, suspended dividends, calls,
        dilution, or refinancing. Not investment advice.
      </Disclaimer>
    </div>
  );
}
