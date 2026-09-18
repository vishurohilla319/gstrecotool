import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/gst-utils";
import { Download } from "lucide-react";

export default async function MonthWiseReportPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const orgId = user.organizationId;

  const [books, gstr2a, gstr2b, gstr3b, items] = await Promise.all([
    prisma.purchaseBook.findMany({ where: { organizationId: orgId } }),
    prisma.gstr2A.findMany({ where: { organizationId: orgId } }),
    prisma.gstr2B.findMany({ where: { organizationId: orgId } }),
    prisma.gstr3B.findMany({ where: { organizationId: orgId } }),
    prisma.reconciliationItem.findMany({ where: { organizationId: orgId } }),
  ]);

  const allMonths = [
    "April 2026",
    "May 2026",
    "June 2026",
    "July 2026",
    "August 2026",
    "September 2026",
    "October 2026",
    "November 2026",
    "December 2026",
    "January 2027",
    "February 2027",
    "March 2027",
  ];

  const monthRows = allMonths
    .map((m) => {
      const bRows = books.filter((b) => b.month === m);
      const aRows = gstr2a.filter((a) => a.month === m);
      const b2Rows = gstr2b.filter((b) => b.month === m);
      const r3b = gstr3b.find((r) => r.month === m);

      const booksTaxable = bRows.reduce((acc, b) => acc + (b.taxableValue || 0), 0);
      const booksItc = bRows.reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);
      const aItc = aRows.reduce((acc, a) => acc + (a.igst || 0) + (a.cgst || 0) + (a.sgst || 0), 0);
      const b2Itc = b2Rows
        .filter((b) => b.itcEligible !== false && b.itcAvailability !== "N")
        .reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);

      const r3bClaimed = r3b ? (r3b.netItc || r3b.totalClaimed) : 0;

      const diff = r3bClaimed - b2Itc;
      const unclaimed = diff < 0 ? Math.abs(diff) : 0;
      const excess = diff > 0 ? diff : 0;

      return {
        month: m,
        booksTaxable,
        booksItc,
        aItc,
        b2Itc,
        r3bClaimed,
        unclaimed,
        excess,
        difference: diff,
        hasData: bRows.length > 0 || b2Rows.length > 0 || r3b !== undefined,
      };
    })
    .filter((r) => r.hasData);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <span>Audit Trail</span>
            <span>•</span>
            <span className="text-slate-500">FY 2026-27 Monthly Matrix</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Month-wise Reconciliation Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-checking monthly progression across Purchase Books, 2A, 2B, and Form 3B
          </p>
        </div>

        <a
          href="/api/export?type=FULL_RECONCILIATION&format=xlsx"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export Matrix
        </a>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Books Taxable</th>
                <th className="px-4 py-3 text-right">Books ITC</th>
                <th className="px-4 py-3 text-right">2A ITC</th>
                <th className="px-4 py-3 text-right">2B Eligible ITC</th>
                <th className="px-4 py-3 text-right">3B Net Claimed</th>
                <th className="px-4 py-3 text-right">Unclaimed ITC</th>
                <th className="px-4 py-3 text-right">Potential Excess</th>
                <th className="px-4 py-3 text-right">Variance (3B - 2B)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No monthly data found. Import registers to generate matrix.
                  </td>
                </tr>
              ) : (
                monthRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.month}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(r.booksTaxable)}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">{formatCurrency(r.booksItc)}</td>
                    <td className="px-4 py-3 text-right text-purple-700">{formatCurrency(r.aItc)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(r.b2Itc)}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700">{formatCurrency(r.r3bClaimed)}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(r.unclaimed)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">{formatCurrency(r.excess)}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        r.difference > 1
                          ? "text-red-600"
                          : r.difference < -1
                          ? "text-blue-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(r.difference)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
