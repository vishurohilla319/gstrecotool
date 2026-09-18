import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/gst-utils";
import { Download, UploadCloud } from "lucide-react";

export default async function Gstr2APage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const records = await prisma.gstr2A.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { invoiceDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
            <span>Dynamic Portal Statement</span>
            <span>•</span>
            <span className="text-slate-500">{records.length} Total Invoices</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            GSTR-2A Dynamic Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-populated from suppliers&apos; GSTR-1, GSTR-5, and GSTR-6 filings in real-time
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/export?type=GSTR_2A&format=xlsx"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </a>
          <Link
            href="/import"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Import GSTR-2A
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="px-3 py-3">Supplier GSTIN</th>
                <th className="px-3 py-3">Supplier Name</th>
                <th className="px-3 py-3">Invoice No</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Month</th>
                <th className="px-3 py-3 text-right">Taxable Value</th>
                <th className="px-3 py-3 text-right">IGST</th>
                <th className="px-3 py-3 text-right">CGST</th>
                <th className="px-3 py-3 text-right">SGST</th>
                <th className="px-3 py-3 text-right">Invoice Value</th>
                <th className="px-3 py-3 text-center">Doc Type</th>
                <th className="px-3 py-3 text-center">Amendment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-400">
                    No GSTR-2A data imported. Import file or click &quot;Load Demo Dataset&quot;.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-800">
                      {r.gstin}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{r.supplierName}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{r.invoiceNumber}</td>
                    <td className="px-3 py-2.5 text-slate-600">{formatDate(r.invoiceDate)}</td>
                    <td className="px-3 py-2.5 text-slate-500">{r.month}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                      {formatCurrency(r.taxableValue)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(r.igst)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(r.cgst)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(r.sgst)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                      {formatCurrency(r.invoiceValue)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                        {r.docType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.amendmentStatus ? (
                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {r.amendmentStatus}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
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
