"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import MobileBottomNav from "@/components/MobileBottomNav";

/**
 * App shell chrome: mounts the phone bottom tab bar when signed in, and
 * reserves space under page content so the bar does not cover the ledger.
 */
export default function AppChrome({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const pathname = usePathname() || "/";
  const showBottomNav = authenticated && pathname !== "/login";

  return (
    <>
      <div
        className={
          showBottomNav
            ? "flex-1 flex flex-col pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0"
            : "flex-1 flex flex-col"
        }
      >
        {children}
      </div>
      {showBottomNav ? <MobileBottomNav /> : null}
    </>
  );
}
