"use client";

import { formatWhen } from "./format";
import { StackedValues } from "./StackedValues";
import type { SignInSummary } from "./types";

/** How often each account signed in, and from where. */
export function SignInSummaryTable({
  signInsCapped,
  signInsError,
  signInsLoading,
  signIns,
}: {
  signInsCapped: boolean;
  signInsError: string | null;
  signInsLoading: boolean;
  signIns: SignInSummary[];
}) {
  return (
    <>
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Website sign-ins
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              How many times each account signed in. Area is the city and
              region estimated from the IP address. Device is read from the
              browser.
              {signInsCapped ? " Showing the latest 5,000 successful sign-ins." : ""}
            </p>
          </div>
          {signInsError && (
            <div
              role="alert"
              className="mx-4 sm:mx-5 mt-4 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700"
            >
              {signInsError}
            </div>
          )}
          {signInsLoading ? (
            <p className="p-6 text-sm text-slate-600">Loading sign-ins…</p>
          ) : signIns.length === 0 && !signInsError ? (
            <p className="p-6 text-sm text-slate-600">
              No successful sign-ins recorded yet.
            </p>
          ) : signIns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">
                      User
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">
                      Logins
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">
                      Area
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">
                      Device
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                      Last sign-in
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {signIns.map((row) => (
                    <tr key={row.username}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.username}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {row.count}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        <StackedValues values={row.areas} />
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        <StackedValues values={row.devices} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-700">
                        {formatWhen(row.lastAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
    </>
  );
}
