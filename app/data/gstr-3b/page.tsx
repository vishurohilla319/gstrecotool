import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/gst-utils";
import { UploadCloud, Plus } from "lucide-react";

export default async function Gstr3BPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const records = await prisma.gstr3B.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <span>Summary Returns</span>
            <span>•</span>
            <span className="text-slate-500">{records.length} Filed Returns</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            GSTR-3B Monthly Returns
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Table 4 summary of eligible Input Tax Credit claimed, reversed, and net credited
          </p>
        </div>

        <Link
          href="/import"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          Import 3B Returns
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="px-4 py-3">Return Period / Month</th>
                <th className="px-4 py-3 text-right">IGST Claimed</th>
                <th className="px-4 py-3 text-right">CGST Claimed</th>
                <th className="px-4 py-3 text-right">SGST Claimed</th>
                <th className="px-4 py-3 text-right">Cess Claimed</th>
                <th className="px-4 py-3 text-right">Total Claimed</th>
                <th className="px-4 py-3 text-right">ITC Reversed</th>
                <th className="px-4 py-3 text-right font-bold text-blue-800">Net ITC Availed</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No GSTR-3B return data imported yet.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.month}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.igstClaimed)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.cgstClaimed)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.sgstClaimed)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.cessClaimed)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatCurrency(r.totalClaimed)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      {formatCurrency(r.itcReversed)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {formatCurrency(r.netItc)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.remarks || "-"}</td>
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
