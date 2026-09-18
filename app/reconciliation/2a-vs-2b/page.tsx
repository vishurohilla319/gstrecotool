import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcile2Avs2B } from "@/lib/reconciliation-engine";
import { formatCurrency, formatDate } from "@/lib/gst-utils";
import { Download } from "lucide-react";

export default async function TwoAvsTwoBPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const [gstr2a, gstr2b] = await Promise.all([
    prisma.gstr2A.findMany({ where: { organizationId: user.organizationId } }),
    prisma.gstr2B.findMany({ where: { organizationId: user.organizationId } }),
  ]);

  const results = reconcile2Avs2B(gstr2a, gstr2b);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
            <span>Variance Analysis</span>
            <span>•</span>
            <span className="text-slate-500">Live 2A vs Static 2B</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            GSTR-2A vs GSTR-2B Variance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify late uploaded invoices, supplier return cut-off variances, and credit/debit note differences
          </p>
        </div>

        <a
          href="/api/export?type=FULL_RECONCILIATION&format=xlsx"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export Variance Report
        </a>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="px-3 py-3">Supplier GSTIN</th>
                <th className="px-3 py-3">Supplier Name</th>
                <th className="px-3 py-3">Invoice Number</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">2A Taxable</th>
                <th className="px-3 py-3 text-right">2A Tax</th>
                <th className="px-3 py-3 text-right">2B Taxable</th>
                <th className="px-3 py-3 text-right">2B Tax</th>
                <th className="px-3 py-3 text-right">Tax Diff</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No 2A/2B data available for comparison.
                  </td>
                </tr>
              ) : (
                results.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-800">
                      {r.gstin}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{r.supplier}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{r.invoiceNumber}</td>
                    <td className="px-3 py-2.5 text-slate-600">{formatDate(r.invoiceDate)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {formatCurrency(r.taxableValueA)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700">
                      {formatCurrency((r.igstA || 0) + (r.cgstA || 0) + (r.sgstA || 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {formatCurrency(r.taxableValueB)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700">
                      {formatCurrency((r.igstB || 0) + (r.cgstB || 0) + (r.sgstB || 0))}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold ${
                        Math.abs(r.diffTax) > 0.01 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(Math.abs(r.diffTax))}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === "Present in Both"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "Tax Difference"
                            ? "bg-amber-100 text-amber-800"
                            : r.status === "2A Only"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {r.status}
                      </span>
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
