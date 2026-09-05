"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { IconShield } from "@/components/icons";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
            <div className="w-11 h-11 mx-auto mb-4 bg-brand-500 rounded-md flex items-center justify-center text-white">
              <IconShield className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              House Prefect Affairs
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Sign in to continue
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="px-8 py-6 space-y-5">
            {state?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {state.error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="Enter your username"
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full px-4 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {pending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
