"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/SidebarContext";

/**
 * App shell: college sidebar (rail on lg+, drawer on phones) plus page content.
 */
export default function AppChrome({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const pathname = usePathname() || "/";
  const showSidebar = authenticated && pathname !== "/login";

  return (
    <SidebarProvider>
      {showSidebar ? <AppSidebar /> : null}
      <div
        className={
          showSidebar
            ? "flex-1 flex flex-col min-w-0 lg:pl-64"
            : "flex-1 flex flex-col min-w-0"
        }
      >
        {children}
      </div>
    </SidebarProvider>
  );
}
