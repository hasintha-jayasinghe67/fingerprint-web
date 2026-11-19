"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth, isAdminOrAbove, isSuperuser } from "@/lib/AuthContext";
import {
  SIDEBAR_GROUPS,
  filterNavItems,
  navItemActive,
  type NavHref,
} from "@/lib/nav";
import { useSidebar } from "@/components/SidebarContext";
import {
  IconCalendar,
  IconClose,
  IconFlag,
  IconGate,
  IconHome,
  IconLayers,
  IconLogs,
  IconPeople,
  IconSettings,
  IconShield,
  IconClipboard,
  IconTie,
  IconUsers,
} from "@/components/icons";

const iconFor: Record<
  string,
  (props: { className?: string }) => ReactNode
> = {
  "/": (p) => <IconHome {...p} />,
  "/attendance": (p) => <IconCalendar {...p} />,
  "/events": (p) => <IconFlag {...p} />,
  "/gate-sheet": (p) => <IconGate {...p} />,
  "/tie-duties": (p) => <IconTie {...p} />,
  "/excuses": (p) => <IconClipboard {...p} />,
  "/prefects": (p) => <IconPeople {...p} />,
  "/prefects/suspend": (p) => <IconShield {...p} />,
  "/batches": (p) => <IconLayers {...p} />,
  "/settings": (p) => <IconSettings {...p} />,
  "/users": (p) => <IconUsers {...p} />,
  "/logs": (p) => <IconLogs {...p} />,
};

function NavIcon({ href, className }: { href: string; className?: string }) {
  const Icon = iconFor[href];
  if (!Icon) return <IconHome className={className} />;
  return <>{Icon({ className })}</>;
}

/**
 * College-blue sidebar: fixed rail from lg up, slide-over drawer below.
 * Every destination is listed — no nested “More” menus.
 */
export default function AppSidebar() {
  const pathname = usePathname() || "/";
  const { authenticated, user } = useAuth();
  const { open, closeSidebar } = useSidebar();
  const canAdmin = isAdminOrAbove(user);
  const superuser = isSuperuser(user);

  if (!authenticated || pathname === "/login") return null;

  const groups = SIDEBAR_GROUPS.map((group) => ({
    ...group,
    items: filterNavItems(group.items, canAdmin, superuser),
  })).filter((group) => group.items.length > 0);

  const panel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-white/10">
        <Link
          href="/"
          onClick={closeSidebar}
          aria-label="House Prefect Affairs home"
          className="w-10 h-10 shrink-0 rounded-md overflow-hidden ring-1 ring-white/20"
        >
          <Image
            src="/ICON.jpeg"
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-cover"
            priority
          />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sidebar-ink leading-tight truncate">
            House Prefect Affairs
          </p>
          <p className="text-[11px] text-sidebar-muted leading-snug truncate">
            S. Thomas&apos; College, Mount Lavinia
          </p>
        </div>
        <button
          type="button"
          onClick={closeSidebar}
          aria-label="Close menu"
          className="lg:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>

      <nav
        aria-label="Main"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
      >
        {groups.map((group) => (
          <div key={group.id}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = navItemActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href as NavHref}
                      onClick={closeSidebar}
                      aria-current={active ? "page" : undefined}
                      className={`group flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                        active
                          ? "bg-sidebar-active text-sidebar-ink shadow-[inset_3px_0_0_0_var(--accent)]"
                          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
                      }`}
                    >
                      <span
                        className={
                          active ? "text-accent" : "text-sidebar-muted group-hover:text-sidebar-ink"
                        }
                      >
                        <NavIcon href={item.href} className="w-5 h-5" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="text-[11px] text-sidebar-muted leading-snug">
          Esto Perpetua
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="sidebar-panel hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-sidebar text-sidebar-ink"
        aria-label="Sidebar"
      >
        {panel}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Dismiss menu"
          tabIndex={open ? 0 : -1}
          onClick={closeSidebar}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          id="app-sidebar-drawer"
          className={`sidebar-panel absolute inset-y-0 left-0 w-[min(18rem,calc(100vw-2.5rem))] bg-sidebar text-sidebar-ink shadow-xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Sidebar"
          aria-hidden={!open}
        >
          {panel}
        </aside>
      </div>
    </>
  );
}
