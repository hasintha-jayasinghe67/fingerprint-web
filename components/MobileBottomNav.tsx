"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import {
  MORE_LINKS,
  PRIMARY_TABS,
  moreTabActive,
  navItemActive,
  type NavHref,
  type NavItem,
} from "@/lib/nav";
import {
  IconCalendar,
  IconClose,
  IconGate,
  IconHome,
  IconLayers,
  IconMoreHorizontal,
  IconPeople,
  IconSettings,
} from "@/components/icons";

const tabIcon: Record<string, (props: { className?: string }) => ReactNode> = {
  "/": (p) => <IconHome {...p} />,
  "/attendance": (p) => <IconCalendar {...p} />,
  "/prefects": (p) => <IconPeople {...p} />,
  "/batches": (p) => <IconLayers {...p} />,
  "/gate-sheet": (p) => <IconGate {...p} />,
  "/settings": (p) => <IconSettings {...p} />,
};

function TabIcon({ href, className }: { href: string; className?: string }) {
  const Icon = tabIcon[href];
  if (!Icon) return <IconMoreHorizontal className={className} />;
  return <>{Icon({ className })}</>;
}

function filterAdmin(items: NavItem[], canAdmin: boolean): NavItem[] {
  return items.filter((item) => !item.adminOnly || canAdmin);
}

/**
 * Phone-only bottom tab bar (hidden from md up). Primary destinations sit
 * as equal tabs; secondary links open in a paper sheet above the bar.
 */
export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { authenticated, user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const canAdmin = isAdminOrAbove(user);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  // Visibility is gated by AppChrome; keep a hard stop here too.
  if (!authenticated || pathname === "/login") return null;

  const tabs = filterAdmin(PRIMARY_TABS, canAdmin);
  const moreLinks = filterAdmin(MORE_LINKS, canAdmin);
  const moreActive = moreTabActive(pathname);

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" role="presentation">
          <button
            type="button"
            aria-label="Dismiss more menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More destinations"
            className="absolute inset-x-0 bottom-0 rounded-t-xl border border-slate-200 bg-white shadow-lg pb-[calc(4.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <nav className="p-2 max-h-[55vh] overflow-y-auto">
              <ul className="flex flex-col gap-0.5">
                {moreLinks.map((item) => {
                  const active = navItemActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-brand-50 text-brand-800"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <span
                          className={
                            active ? "text-brand-700" : "text-slate-500"
                          }
                        >
                          <TabIcon href={item.href} className="w-5 h-5" />
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}

      <nav
        aria-label="Primary"
        className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 h-[3.75rem]">
          {tabs.map((item) => {
            const active = navItemActive(pathname, item);
            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href as NavHref}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium transition-colors ${
                    active
                      ? "text-brand-700"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <TabIcon
                    href={item.href}
                    className={`w-5 h-5 ${active ? "text-brand-700" : ""}`}
                  />
                  <span className="truncate max-w-full leading-none">
                    {item.tabLabel || item.label}
                  </span>
                  <span
                    className={`h-0.5 w-5 rounded-full ${
                      active ? "bg-brand-700" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-label="More destinations"
              className={`flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium transition-colors ${
                moreActive || moreOpen
                  ? "text-brand-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <IconMoreHorizontal className="w-5 h-5" />
              <span>More</span>
              <span
                className={`h-0.5 w-5 rounded-full ${
                  moreActive || moreOpen ? "bg-brand-700" : "bg-transparent"
                }`}
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
