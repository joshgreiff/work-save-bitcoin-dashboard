import type { Metadata } from "next";
import { SectionIntro } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Work Save Bitcoin handles newsletter signup and public dashboard data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Legal"
        title="Privacy policy"
        description="Short policy for this public educational dashboard and optional newsletter."
      />
      <div className="prose-invert max-w-3xl space-y-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        <p>
          Work Save Bitcoin publishes educational content and a public portfolio dashboard. We do
          not operate user accounts for this release.
        </p>
        <p>
          If you join the newsletter, we process the email address you submit, your consent, and the
          page you signed up from. Delivery may use a third-party email provider configured via
          environment variables. Where supported, confirmation uses double opt-in.
        </p>
        <p>
          Do not submit seed phrases, private keys, passwords, or brokerage credentials anywhere on
          this site. Public portfolio figures come from validated data files and documented
          calculations.
        </p>
        <p>
          Referral links (such as River or Strike) may compensate the channel at no additional cost
          to you and are labeled where shown.
        </p>
      </div>
    </div>
  );
}
