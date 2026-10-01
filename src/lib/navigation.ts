export type NavItem = { href: string; label: string };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/learn", label: "Learn" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/bitcoin-exposure", label: "BTC Exposure" },
];

export const MORE_NAV: NavItem[] = [
  { href: "/episodes", label: "Episodes" },
  { href: "/reserve", label: "Reserve" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/income-model", label: "Income Model" },
  { href: "/methodology", label: "Methodology" },
  { href: "/resources", label: "Resources" },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
