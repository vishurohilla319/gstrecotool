import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/gst-utils";
import { ShieldCheck, Download, AlertOctagon } from "lucide-react";

export default async function ItcReportPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const orgId = user.organizationId;

  const [books, gstr2b] = await Promise.all([
    prisma.purchaseBook.findMany({ where: { organizationId: orgId } }),
    prisma.gstr2B.findMany({ where: { organizationId: orgId } }),
  ]);

  const eligible2b = gstr2b.filter((b) => b.itcEligible !== false && b.itcAvailability !== "N");
  const ineligible2b = gstr2b.filter((b) => b.itcEligible === false || b.itcAvailability === "N");
  const rcm2b = gstr2b.filter((b) => b.rcm);

  const eligibleTax = eligible2b.reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);
  const ineligibleTax = ineligible2b.reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);
  const rcmTax = rcm2b.reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <span>ITC Classification</span>
            <span>•</span>
            <span className="text-slate-500">Section 17(5) Audit</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            ITC Eligibility & Ineligibility Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit classification of claimable credits vs blocked credits under Section 17(5) and RCM obligations
          </p>
        </div>

        <a
          href="/api/export?type=GSTR_2B&format=xlsx"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export ITC Schedule
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Total Claimable ITC (2B)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded">
              {eligible2b.length} Invoices
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(eligibleTax)}</div>
          <p className="text-xs text-emerald-600 mt-1">Legally available for 3B set-off</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-200 bg-red-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-900">Blocked / Ineligible ITC</span>
            <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded">
              {ineligible2b.length} Invoices
            </span>
          </div>
          <div className="text-2xl font-bold text-red-700 mt-2">{formatCurrency(ineligibleTax)}</div>
          <p className="text-xs text-red-600 mt-1">Must not be claimed in 3B (Section 17(5))</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900">RCM Reverse Charge ITC</span>
            <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded">
              {rcm2b.length} Invoices
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">{formatCurrency(rcmTax)}</div>
          <p className="text-xs text-purple-600 mt-1">Pay via electronic cash ledger first</p>
        </div>
      </div>

      {/* Ineligible transactions breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-800">
          Ineligible & Blocked Credit Items (Section 17(5))
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-700">
              <tr>
                <th className="px-4 py-3">Supplier GSTIN</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">Blocked Tax</th>
                <th className="px-4 py-3">Ineligibility Reason / Clause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ineligible2b.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No ineligible ITC items detected in GSTR-2B.
                  </td>
                </tr>
              ) : (
                ineligible2b.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{item.gstin}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.supplierName}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{item.invoiceNumber}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatCurrency(item.taxableValue)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      {formatCurrency((item.igst || 0) + (item.cgst || 0) + (item.sgst || 0))}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      Marked Ineligible in GSTR-2B by supplier / Sec 17(5) Blocked Credit
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
