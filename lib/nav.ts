/**
 * Shared app destinations for the desktop Navigate menu and the phone
 * bottom tab bar (Instagram / WhatsApp style).
 */

export type NavHref =
  | "/"
  | "/attendance"
  | "/prefects"
  | "/batches"
  | "/gate-sheet"
  | "/tie-duties"
  | "/excuses"
  | "/settings"
  | "/users"
  | "/logs"
  | "/prefects/suspend";

export interface NavItem {
  href: NavHref;
  label: string;
  /** Short label under a bottom-tab icon (defaults to label). */
  tabLabel?: string;
  /** Match nested routes (e.g. /attendance/2026-01-01). */
  match?: "exact" | "prefix";
  /** Only show for admin / superuser. */
  adminOnly?: boolean;
  /** Only show for superuser. */
  superuserOnly?: boolean;
}

/** Primary destinations shown as bottom tabs on phones. */
export const PRIMARY_TABS: NavItem[] = [
  { href: "/", label: "Home", tabLabel: "Home", match: "exact" },
  { href: "/attendance", label: "Attendance", tabLabel: "Attend", match: "prefix" },
  { href: "/prefects", label: "Prefects", tabLabel: "Prefects", match: "prefix" },
  { href: "/batches", label: "Batches", tabLabel: "Batches", match: "prefix" },
];

/** Secondary destinations behind the phone "More" tab. */
export const MORE_LINKS: NavItem[] = [
  { href: "/gate-sheet", label: "Gate Sheet", match: "prefix" },
  { href: "/tie-duties", label: "Tie Duties", match: "prefix" },
  { href: "/excuses", label: "Excuses", match: "prefix" },
  { href: "/prefects/suspend", label: "Suspensions", match: "prefix" },
  { href: "/settings", label: "Settings", match: "prefix", adminOnly: true },
  { href: "/users", label: "Users", match: "prefix", adminOnly: true },
  { href: "/logs", label: "Logs", match: "prefix", superuserOnly: true },
];

/** Full list for the desktop Navigate disclosure. */
export const DESKTOP_NAV: NavItem[] = [
  { href: "/attendance", label: "Attendance", match: "prefix" },
  { href: "/prefects", label: "Prefects", match: "prefix" },
  { href: "/prefects/suspend", label: "Suspensions", match: "prefix" },
  { href: "/batches", label: "Batches", match: "prefix" },
  { href: "/gate-sheet", label: "Gate Sheet", match: "prefix" },
  { href: "/tie-duties", label: "Tie Duties", match: "prefix" },
  { href: "/excuses", label: "Excuses", match: "prefix" },
  { href: "/settings", label: "Settings", match: "prefix", adminOnly: true },
  { href: "/logs", label: "Logs", match: "prefix", superuserOnly: true },
];

export function navItemActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** True when the phone "More" tab should look selected. */
export function moreTabActive(pathname: string): boolean {
  return MORE_LINKS.some((item) => navItemActive(pathname, item));
}
