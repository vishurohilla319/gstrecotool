import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcile2Bvs3B } from "@/lib/reconciliation-engine";
import { formatCurrency } from "@/lib/gst-utils";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";

export default async function TwoBvsThreeBPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const [gstr2b, gstr3b] = await Promise.all([
    prisma.gstr2B.findMany({ where: { organizationId: user.organizationId } }),
    prisma.gstr3B.findMany({ where: { organizationId: user.organizationId } }),
  ]);

  const results = reconcile2Bvs3B(gstr2b, gstr3b);

  const total2B = results.reduce((acc, r) => acc + (r.bTotalItc || 0), 0);
  const total3BGross = results.reduce((acc, r) => acc + (r.totalClaimed || 0), 0);
  const total3BReversed = results.reduce((acc, r) => acc + (r.itcReversed || 0), 0);
  const total3BNet = results.reduce((acc, r) => acc + (r.netItc || 0), 0);
  const totalDiff = Math.round((total3BNet - total2B) * 100) / 100;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <span>Return Audit</span>
            <span>•</span>
            <span className="text-slate-500">Monthly ITC Variance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            GSTR-2B vs GSTR-3B Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare eligible ITC auto-populated in 2B with actual Input Tax Credit claimed & reversed in Form 3B returns
          </p>
        </div>

        <a
          href="/api/export?type=FULL_RECONCILIATION&format=xlsx"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export Report
        </a>
      </div>

      {/* Reconciled Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">1. GSTR-2B Eligible ITC</span>
          <div className="text-lg font-bold text-emerald-800 mt-1">{formatCurrency(total2B)}</div>
          <div className="text-[10px] text-slate-500">Auto-drafted by suppliers</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">2. 3B Gross Claimed</span>
          <div className="text-lg font-bold text-blue-800 mt-1">{formatCurrency(total3BGross)}</div>
          <div className="text-[10px] text-slate-500">Table 4(A) ITC Available</div>
        </div>
        <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">3. (-) 3B ITC Reversed</span>
          <div className="text-lg font-bold text-purple-800 mt-1">{formatCurrency(total3BReversed)}</div>
          <div className="text-[10px] text-purple-600">Table 4(B) Reversals</div>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">4. (=) Net 3B Claimed</span>
          <div className="text-lg font-bold text-blue-900 mt-1">{formatCurrency(total3BNet)}</div>
          <div className="text-[10px] text-blue-600">Table 4(C) Net ITC</div>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${
          Math.abs(totalDiff) <= 1
            ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
            : totalDiff > 1
            ? "bg-red-50/80 border-red-300 text-red-900"
            : "bg-amber-50/80 border-amber-300 text-amber-900"
        }`}>
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {Math.abs(totalDiff) <= 1 ? "Reconciled Status" : "Net ITC Variance"}
          </span>
          <div className="text-lg font-bold mt-1">
            {Math.abs(totalDiff) <= 1 ? "Fully Matched (₹0)" : formatCurrency(totalDiff)}
          </div>
          <div className="text-[10px] opacity-80">
            {Math.abs(totalDiff) <= 1 ? "Net 3B matches 2B" : totalDiff > 1 ? "Excess Claimed in 3B" : "Unclaimed 2B Credit"}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold divide-x divide-slate-200">
                <th rowSpan={2} className="px-4 py-3">Return Period</th>
                <th colSpan={4} className="bg-emerald-50/80 px-4 py-2 text-center text-emerald-900">
                  GSTR-2B Eligible Available ITC (Portal)
                </th>
                <th colSpan={6} className="bg-blue-50/80 px-4 py-2 text-center text-blue-900">
                  GSTR-3B Input Tax Credit (Table 4)
                </th>
                <th rowSpan={2} className="px-4 py-3 text-right">Net Diff (3B - 2B)</th>
                <th rowSpan={2} className="px-4 py-3">Audit Finding / Exposure</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="px-3 py-1.5 text-right">IGST</th>
                <th className="px-3 py-1.5 text-right">CGST</th>
                <th className="px-3 py-1.5 text-right">SGST</th>
                <th className="px-3 py-1.5 text-right font-bold text-emerald-800">Total 2B ITC</th>

                <th className="px-3 py-1.5 text-right">IGST</th>
                <th className="px-3 py-1.5 text-right">CGST</th>
                <th className="px-3 py-1.5 text-right">SGST</th>
                <th className="px-3 py-1.5 text-right font-medium text-slate-700">Gross 4(A)</th>
                <th className="px-3 py-1.5 text-right font-semibold text-purple-700 bg-purple-50/50">(-) Rev 4(B)</th>
                <th className="px-3 py-1.5 text-right font-bold text-blue-800 bg-blue-50/50">Net 4(C)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                    No 2B or 3B data available.
                  </td>
                </tr>
              ) : (
                results.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.month}</td>

                    {/* 2B values */}
                    <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(r.bIgst)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(r.bCgst)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(r.bSgst)}</td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700">
                      {formatCurrency(r.bTotalItc)}
                    </td>

                    {/* 3B values */}
                    <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(r.claimedIgst)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(r.claimedCgst)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(r.claimedSgst)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(r.totalClaimed)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-purple-700 bg-purple-50/30">
                      {formatCurrency(r.itcReversed)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-blue-700 bg-blue-50/30">
                      {formatCurrency(r.netItc)}
                    </td>

                    {/* Difference */}
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        r.difference > 1
                          ? "text-red-600"
                          : r.difference < -1
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(r.difference)}
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-3">
                      {r.potentialExcess > 1 ? (
                        <div className="flex items-center gap-1.5 text-red-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Potential Excess Claimed (₹{r.potentialExcess.toFixed(0)})</span>
                        </div>
                      ) : r.unclaimedItc > 1 ? (
                        <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Unclaimed Eligible ITC (₹{r.unclaimedItc.toFixed(0)})</span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-medium">Reconciled within ₹1</span>
                      )}
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
