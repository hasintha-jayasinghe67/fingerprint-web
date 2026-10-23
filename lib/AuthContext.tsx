"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { mapUsernameToEmail } from "@/lib/emailMap";

export interface UserInfo {
  /** auth.users.id (uuid) — the Supabase Auth account id */
  authId: string;
  /** users.id (BIGINT) — the app-level user row id */
  id: number;
  username: string;
  /** mapped auth email (username@hpa.local), used for re-auth checks */
  email: string;
  role: "superuser" | "admin" | "view-only";
}

export type Role = UserInfo["role"];

export const isAdminOrAbove = (user: UserInfo | null): boolean =>
  user?.role === "admin" || user?.role === "superuser";

export const isSuperuser = (user: UserInfo | null): boolean =>
  user?.role === "superuser";

export type LoginResult = "ok" | "invalid" | "disabled";

interface AuthContextType {
  authenticated: boolean;
  user: UserInfo | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  user: null,
  login: async () => "invalid",
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Look up the app-level user (id/username/email/role) for an authenticated
  // Supabase Auth account. The role ALWAYS comes from the users table, so
  // stale or forged client-side state can never grant extra privileges.
  const resolveUser = async (authId: string): Promise<UserInfo | null> => {
    let { data } = await supabase
      .from("users")
      .select("id, username, email, role, disabled")
      .eq("auth_id", authId)
      .maybeSingle();
    if (!data) {
      const fallback = await supabase
        .from("users")
        .select("id, username, email, role")
        .eq("auth_id", authId)
        .maybeSingle();
      data = fallback.data ? { ...fallback.data, disabled: false } : null;
    }
    if (data && !data.disabled) {
      const resolved: UserInfo = {
        authId,
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role as Role,
      };
      setUser(resolved);
      setAuthenticated(true);
      return resolved;
    }
    // No users row, or the account was disabled — drop the session.
    await supabase.auth.signOut();
    setUser(null);
    setAuthenticated(false);
    return null;
  };

  useEffect(() => {
    // One-time cleanup of the legacy localStorage session key (if any).
    try {
      localStorage.removeItem("user");
    } catch {
      // ignore
    }

    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void resolveUser(session.user.id);
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    });

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active && session?.user) {
        await resolveUser(session.user.id);
      }
      if (active) setHydrated(true);
    })();

    // Re-check the users row so a just-disabled account is signed out even
    // if they sit on one page (proxy also checks on every navigation).
    const poll = window.setInterval(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("users")
        .select("disabled")
        .eq("auth_id", session.user.id)
        .maybeSingle();
      if (data?.disabled) {
        await supabase.auth.signOut();
        setUser(null);
        setAuthenticated(false);
      }
    }, 15_000);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearInterval(poll);
    };
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<LoginResult> => {
    const email = mapUsernameToEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      if (error && /banned/i.test(error.message)) return "disabled";
      return "invalid";
    }
    const resolved = await resolveUser(data.session.user.id);
    return resolved ? "ok" : "disabled";
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ authenticated, user, login, logout }}>
      {hydrated ? children : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
