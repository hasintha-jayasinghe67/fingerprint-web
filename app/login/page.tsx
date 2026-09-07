"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import PasswordInput from "@/components/PasswordInput";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await login(username, password);
    if (success) {
      router.push("/");
    } else {
      setError("Invalid username or password.");
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
            <div className="w-11 h-11 mx-auto mb-4 rounded-md overflow-hidden ring-1 ring-slate-200">
              <Image
                src="/ICON.jpeg"
                alt="House Prefect Affairs"
                width={44}
                height={44}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              House Prefect Affairs
            </h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
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
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className={fieldClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
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
