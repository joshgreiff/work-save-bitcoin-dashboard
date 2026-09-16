import { Disclaimer, SectionIntro, TextLink } from "@/components/ui/primitives";
import { loadSiteConfig } from "@/lib/data/load";

export const metadata = {
  title: "Resources & Support",
  description: "Educational links, channel links, and voluntary support options.",
};

export default function ResourcesPage() {
  const site = loadSiteConfig();

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Channel"
        title="Resources and support"
        description="Educational references and voluntary support options. Support never buys ownership of the reserve or portfolio."
      />

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Channel links</h2>
        <ul className="space-y-2 text-sm">
          {site.youtubeChannelUrl ? (
            <li>
              <a
                className="text-[var(--accent)] hover:underline"
                href={site.youtubeChannelUrl}
                target="_blank"
                rel="noreferrer"
              >
                YouTube — Work. Save. Bitcoin
              </a>
            </li>
          ) : null}
          {site.xUrl ? (
            <li>
              <a className="text-[var(--accent)] hover:underline" href={site.xUrl} target="_blank" rel="noreferrer">
                X — @worksavebitcoin
              </a>
            </li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Bitcoin education</h2>
        <ul className="space-y-3 text-sm">
          {site.educationalResources.map((resource) => (
            <li key={resource.url} className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <a
                className="text-[var(--accent)] hover:underline"
                href={resource.url}
                target="_blank"
                rel="noreferrer"
              >
                {resource.title}
              </a>
              {resource.note ? <p className="mt-1 text-[var(--muted)]">{resource.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Referral links</h2>
        {site.referralLinks.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No referral links configured.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {site.referralLinks.map((link) => (
              <li key={link.url} className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <a className="text-[var(--accent)] hover:underline" href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
                {link.note ? <p className="mt-1 text-[var(--muted)]">{link.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Voluntary support</h2>
        {site.bitcoinSupportAddress ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Bitcoin / Lightning:{" "}
            <span className="tabular-nums text-[var(--foreground)]">{site.bitcoinSupportAddress}</span>
          </p>
        ) : null}
        {site.paypalSupportUrl ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            PayPal:{" "}
            <a
              className="text-[var(--accent)] hover:underline"
              href={site.paypalSupportUrl}
              target="_blank"
              rel="noreferrer"
            >
              Support via PayPal
            </a>
          </p>
        ) : null}
        <TextLink href="/reserve">View Bitcoin Reserve tracking →</TextLink>
      </section>

      <Disclaimer>{site.supportDisclaimer}</Disclaimer>
    </div>
  );
}
