import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/layout/shell";
import { loadNewsletterConfig, loadSiteConfig } from "@/lib/data/load";
import "./globals.css";

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const site = loadSiteConfig();
const newsletter = loadNewsletterConfig();

export const metadata: Metadata = {
  metadataBase: new URL(site.canonicalBaseUrl),
  title: {
    default: site.siteTitle,
    template: `%s | ${site.siteName}`,
  },
  description: site.siteDescription,
  openGraph: {
    title: site.siteTitle,
    description: site.siteDescription,
    type: "website",
    siteName: site.siteName,
    url: site.canonicalBaseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: site.siteTitle,
    description: site.siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:py-10">{children}</main>
        <SiteFooter newsletter={newsletter} />
      </body>
    </html>
  );
}
