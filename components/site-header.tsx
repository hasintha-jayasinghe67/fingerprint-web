"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { useAuth, isAdminOrAbove, isSuperuser } from "@/lib/AuthContext";
import { DESKTOP_NAV } from "@/lib/nav";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import HeaderMenu, {
  HeaderMenuLayoutContext,
  headerMenuItemClass,
} from "@/components/HeaderMenu";
import {
  IconMenu,
  IconClose,
  IconArrowLeft,
  IconSettings,
  IconLogs,
} from "@/components/icons";
import ThemeToggle from "@/components/ThemeToggle";

interface SiteHeaderProps {
  title: string;
  subtitle?: string;
  /** Route for the back button. Pass "back" to use the browser's history. */
  backTo?: string | "back";
  /**
   * Page-specific controls (Save, Add, Refresh…). Destination links live in
   * the shared Navigate menu (desktop) and the phone bottom tab bar.
   */
  actions?: ReactNode;
  /**
   * "menu" collapses actions behind a hamburger on phones (default).
   * "wrap" keeps them inline on phones — use for one essential CTA.
   * On md+ the header always collapses to the hamburger when the full
   * control row no longer fits on one line, regardless of this flag.
   */
  actionsLayout?: "menu" | "wrap";
  /** When false, omit the shared Navigate disclosure (rare). */
  showNavigate?: boolean;
  maxWidth?: "3xl" | "5xl" | "7xl";
}

/** Logo + gaps + enough title that the page name still reads. */
const MIN_BRAND_PX = 220;
const HEADER_GAP_PX = 12;
/** Always-visible theme icon, plus the gap before it. */
const THEME_TOGGLE_PX = 44 + 8;

export default function SiteHeader({
  title,
  subtitle,
  backTo,
  actions,
  actionsLayout = "menu",
  showNavigate = true,
  maxWidth = "7xl",
}: SiteHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [isMd, setIsMd] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const canWrite = isAdminOrAbove(user);
  const superuser = isSuperuser(user);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navigateMenu = showNavigate ? (
    <HeaderMenu label="Navigate">
      {DESKTOP_NAV.filter((item) => {
        if (item.superuserOnly) return superuser;
        if (item.adminOnly) return canWrite;
        return true;
      }).map((item) => (
        <Link key={item.href} href={item.href} className={headerMenuItemClass}>
          {item.href === "/settings" ? (
            <>
              <IconSettings className="w-3 h-3" />
              {item.label}
            </>
          ) : item.href === "/logs" ? (
            <>
              <IconLogs className="w-3 h-3" />
              {item.label}
            </>
          ) : (
            item.label
          )}
        </Link>
      ))}
    </HeaderMenu>
  ) : null;

  const accountMenu = (
    <HeaderMenu label={user?.username ?? "Account"}>
      {canWrite && (
        <Link href="/users" className={headerMenuItemClass}>
          Users
        </Link>
      )}
      {superuser && (
        <Link href="/logs" className={headerMenuItemClass}>
          Logs
        </Link>
      )}
      <button
        type="button"
        onClick={() => setChangePasswordOpen(true)}
        className={headerMenuItemClass}
      >
        Change password
      </button>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className={`${headerMenuItemClass} text-red-700 hover:bg-red-50 hover:text-red-800`}
      >
        Log out
      </button>
    </HeaderMenu>
  );

  const accountControlsFlat = (
    <>
      {canWrite && (
        <Link
          href="/users"
          className="min-h-11 px-3 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
        >
          Users
        </Link>
      )}
      {superuser && (
        <Link
          href="/logs"
          className="min-h-11 px-3 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
        >
          Logs
        </Link>
      )}
      <button
        type="button"
        onClick={() => setChangePasswordOpen(true)}
        className="min-h-11 px-3 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
      >
        Change password
      </button>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className="min-h-11 px-3 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
      >
        Log out
      </button>
    </>
  );

  const desktopControls = (
    <>
      {navigateMenu}
      {actions}
      {accountMenu}
    </>
  );

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsMd(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const measure = measureRef.current;
    if (!bar || !measure || !isMd) {
      setOverflows(false);
      return;
    }

    const update = () => {
      const needed =
        MIN_BRAND_PX +
        (backTo ? 44 + 8 : 0) +
        HEADER_GAP_PX +
        THEME_TOGGLE_PX +
        measure.scrollWidth;
      setOverflows(needed > bar.clientWidth);
    };

    const ro = new ResizeObserver(update);
    ro.observe(bar);
    ro.observe(measure);
    update();
    return () => ro.disconnect();
  }, [isMd, backTo, actions, user, showNavigate, canWrite, superuser]);

  useEffect(() => {
    if (!overflows) setMenuOpen(false);
  }, [overflows]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const containerWidth =
    maxWidth === "3xl"
      ? "max-w-3xl"
      : maxWidth === "5xl"
        ? "max-w-5xl"
        : "max-w-7xl";

  const showPhoneHamburger = actionsLayout === "menu" && Boolean(actions);
  const showDesktopHamburger = overflows;
  const showHamburger = showPhoneHamburger || showDesktopHamburger;

  const hamburgerVisibility = showDesktopHamburger
    ? showPhoneHamburger
      ? "relative shrink-0"
      : "relative shrink-0 hidden md:block"
    : "relative shrink-0 md:hidden";

  const brand = (
    <>
      <Link
        href="/"
        aria-label="House Prefect Affairs home"
        className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-md overflow-hidden ring-1 ring-slate-200 hover:ring-slate-300 transition-shadow"
      >
        <Image
          src="/ICON.jpeg"
          alt=""
          width={44}
          height={44}
          className="w-full h-full object-cover"
          priority
        />
      </Link>
      {backTo && (
        <button
          type="button"
          onClick={() =>
            backTo === "back" ? router.back() : router.push(backTo)
          }
          aria-label="Go back"
          className="min-h-11 min-w-11 md:min-h-9 md:min-w-9 shrink-0 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight text-slate-900 leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="hidden sm:block text-xs text-slate-500 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <div
          className={`${containerWidth} mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5`}
        >
          <div
            ref={barRef}
            className="relative flex items-center justify-between gap-2 sm:gap-3"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {brand}
            </div>

            {/* Natural width of the full desktop control row — not displayed. */}
            <div
              aria-hidden="true"
              inert
              className="pointer-events-none absolute left-0 top-0 h-0 overflow-hidden opacity-0"
            >
              <div
                ref={measureRef}
                className="flex w-max items-center gap-2 whitespace-nowrap"
              >
                {desktopControls}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 justify-end shrink-0">
              <div
                className={
                  showDesktopHamburger
                    ? "hidden"
                    : "hidden md:flex items-center gap-2 flex-nowrap justify-end"
                }
              >
                {desktopControls}
              </div>

              {actions && actionsLayout === "wrap" && (
                <div className="md:hidden flex items-center gap-1.5 flex-wrap justify-end max-w-[55vw]">
                  {actions}
                </div>
              )}

              {actionsLayout === "wrap" && !showDesktopHamburger && (
                <div className="md:hidden flex items-center">{accountMenu}</div>
              )}

              {showHamburger && (
                <div className={hamburgerVisibility}>
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
                    className="min-h-11 min-w-11 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                  >
                    {menuOpen ? (
                      <IconClose className="w-4 h-4" />
                    ) : (
                      <IconMenu className="w-5 h-5" />
                    )}
                  </button>
                  {menuOpen && (
                    <div
                      ref={panelRef}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("[data-header-menu-trigger]")) {
                          return;
                        }
                        if (target.closest("a[href], button")) {
                          setMenuOpen(false);
                        }
                      }}
                      className="absolute right-0 top-full mt-2 z-30 w-[min(18rem,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg flex flex-col gap-1.5 [&>*]:w-full [&>*]:justify-center"
                    >
                      <HeaderMenuLayoutContext.Provider value="inline">
                        {showDesktopHamburger ? navigateMenu : null}
                        {actions}
                        {accountControlsFlat}
                      </HeaderMenuLayoutContext.Provider>
                    </div>
                  )}
                </div>
              )}

              {!actions && actionsLayout === "menu" && !showDesktopHamburger && (
                <div className="md:hidden flex items-center">{accountMenu}</div>
              )}

              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </>
  );
}
