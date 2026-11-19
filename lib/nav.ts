/**
 * Shared app destinations for the sidebar (desktop rail + mobile drawer).
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
  | "/events"
  | "/prefects/suspend";

export interface NavItem {
  href: NavHref;
  label: string;
  /** Match nested routes (e.g. /attendance/2026-01-01). */
  match?: "exact" | "prefix";
  /** Only show for admin / superuser. */
  adminOnly?: boolean;
  /** Only show for superuser. */
  superuserOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/** Grouped destinations shown in the sidebar. */
export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Overview",
    items: [{ href: "/", label: "Home", match: "exact" }],
  },
  {
    id: "attendance",
    label: "Attendance",
    items: [
      { href: "/attendance", label: "Daily attendance", match: "prefix" },
      { href: "/events", label: "Events", match: "prefix" },
      { href: "/gate-sheet", label: "Gate sheet", match: "prefix" },
      { href: "/tie-duties", label: "Tie duties", match: "prefix" },
      { href: "/excuses", label: "Excuses", match: "prefix" },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { href: "/prefects", label: "Prefects", match: "prefix" },
      { href: "/prefects/suspend", label: "Suspensions", match: "prefix" },
      { href: "/batches", label: "Batches", match: "prefix" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      { href: "/settings", label: "Settings", match: "prefix", adminOnly: true },
      { href: "/users", label: "Users", match: "prefix", adminOnly: true },
      { href: "/logs", label: "Logs", match: "prefix", superuserOnly: true },
    ],
  },
];

/** Flat list (all sidebar destinations). */
export const SIDEBAR_NAV: NavItem[] = SIDEBAR_GROUPS.flatMap((g) => g.items);

/** @deprecated Prefer SIDEBAR_NAV — kept for any leftover imports. */
export const DESKTOP_NAV: NavItem[] = SIDEBAR_NAV.filter((i) => i.href !== "/");

/** @deprecated Phone bottom tabs removed in favour of the sidebar drawer. */
export const PRIMARY_TABS: NavItem[] = [
  { href: "/", label: "Home", match: "exact" },
  { href: "/attendance", label: "Attendance", match: "prefix" },
  { href: "/prefects", label: "Prefects", match: "prefix" },
  { href: "/batches", label: "Batches", match: "prefix" },
];

/** @deprecated */
export const MORE_LINKS: NavItem[] = SIDEBAR_NAV.filter(
  (i) => !PRIMARY_TABS.some((t) => t.href === i.href)
);

export function navItemActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  // Prefects list must not light up on /prefects/suspend
  if (item.href === "/prefects") {
    return (
      pathname === "/prefects" ||
      (pathname.startsWith("/prefects/") &&
        !pathname.startsWith("/prefects/suspend"))
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** True when a secondary “more” destination is active (legacy). */
export function moreTabActive(pathname: string): boolean {
  return MORE_LINKS.some((item) => navItemActive(pathname, item));
}

export function filterNavItems(
  items: NavItem[],
  canAdmin: boolean,
  superuser: boolean
): NavItem[] {
  return items.filter((item) => {
    if (item.superuserOnly) return superuser;
    if (item.adminOnly) return canAdmin;
    return true;
  });
}
