import type { Metadata } from "next";
import { SectionIntro } from "@/components/ui/primitives";
import { NewsletterSignup } from "@/components/learn/NewsletterSignup";
import { loadLearnResources, loadNewsletterConfig } from "@/lib/data/load";
import type { LearnResource } from "@/lib/schemas/learn";

export const metadata: Metadata = {
  title: "Learn resources",
  description: "Curated Bitcoin tools and education links with clear referral disclosures.",
  alternates: { canonical: "/learn/resources" },
};

const CATEGORY_ORDER = [
  "buying_bitcoin",
  "wallets_self_custody",
  "bitcoin_nodes",
  "home_mining",
  "monetary_education",
  "books_podcasts",
] as const;

const CATEGORY_LABEL: Record<(typeof CATEGORY_ORDER)[number], string> = {
  buying_bitcoin: "Buying Bitcoin",
  wallets_self_custody: "Wallets and self-custody",
  bitcoin_nodes: "Bitcoin nodes",
  home_mining: "Home mining",
  monetary_education: "Monetary education",
  books_podcasts: "Books and podcasts",
};

export default function LearnResourcesPage() {
  const file = loadLearnResources();
  const newsletter = loadNewsletterConfig();

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Learn"
        title="Resources"
        description="Curated starting points. Referral links are labeled. Pending URLs stay unavailable until confirmed."
      />

      {CATEGORY_ORDER.map((category) => {
        const resources = file.resources.filter((r) => r.category === category);
        if (resources.length === 0) return null;
        return (
          <section key={category} className="space-y-3">
            <h2 className="text-xl font-medium">{CATEGORY_LABEL[category]}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </section>
        );
      })}

      <NewsletterSignup config={newsletter} sourcePage="/learn/resources" />
    </div>
  );
}

function ResourceCard({ resource }: { resource: LearnResource }) {
  return (
    <article className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="font-medium text-[var(--foreground)]">{resource.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
        {resource.summary}
      </p>
      {resource.pendingUrlConfirmation || resource.url == null ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          {resource.pendingNote ?? "URL pending confirmation."}
        </p>
      ) : (
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Visit resource →
        </a>
      )}
      {resource.referral ? (
        <p className="mt-3 text-xs text-[var(--muted)]" data-testid="referral-disclosure">
          {resource.referralDisclosure ?? "Affiliate / referral link."}
        </p>
      ) : null}
    </article>
  );
}
