"use client";

import React, { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/gst-utils";
import { Search, Building2, Download, X, Eye } from "lucide-react";

export function SupplierReportClient({ suppliers }: { suppliers: any[] }) {
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  const filtered = suppliers.filter((s) => {
    return (
      !search ||
      s.gstin.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Export Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier name or GSTIN..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <a
          href="/api/export?type=FULL_RECONCILIATION&format=xlsx"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
        >
          <Download className="w-3.5 h-3.5" /> Export Supplier Report
        </a>
      </div>

      {/* Main Aggregated Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="px-4 py-3">Supplier GSTIN</th>
                <th className="px-4 py-3">Supplier Legal Name</th>
                <th className="px-3 py-3 text-center">Books Inv</th>
                <th className="px-3 py-3 text-center">2B Inv</th>
                <th className="px-3 py-3 text-right">Books Tax</th>
                <th className="px-3 py-3 text-right">2B Tax</th>
                <th className="px-3 py-3 text-right">ITC Difference</th>
                <th className="px-3 py-3 text-center">Matched</th>
                <th className="px-3 py-3 text-center">Mismatch</th>
                <th className="px-3 py-3 text-center">Books Only</th>
                <th className="px-3 py-3 text-center">2B Only</th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                    No supplier records available.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.gstin} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{s.gstin}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-3 py-3 text-center font-semibold text-blue-700">{s.booksCount}</td>
                    <td className="px-3 py-3 text-center font-semibold text-emerald-700">{s.stmtCount}</td>
                    <td className="px-3 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(s.booksTax)}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(s.stmtTax)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-bold ${
                        Math.abs(s.diffTax) > 0.01 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(s.diffTax)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        {s.matchedCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        {s.mismatchCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        {s.booksOnlyCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        {s.stmtOnlyCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setSelectedSupplier(s)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200"
                      >
                        <Eye className="w-3 h-3" /> Drilldown
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSupplier.name} ({selectedSupplier.gstin})
                </h3>
                <p className="text-xs text-slate-500">Invoice Level Reconciliation Drilldown</p>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Invoice #</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Books Tax</th>
                    <th className="px-3 py-2 text-right">2B Tax</th>
                    <th className="px-3 py-2 text-right">Difference</th>
                    <th className="px-3 py-2 text-center">Match Status</th>
                    <th className="px-3 py-2">Action / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedSupplier.invoices.map((inv: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                        {inv.booksInvoiceNo || inv.stmtInvoiceNo}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {formatDate(inv.booksDate || inv.stmtDate)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inv.booksTaxable !== null ? formatCurrency((inv.booksIgst || 0) + (inv.booksCgst || 0) + (inv.booksSgst || 0)) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inv.stmtTaxable !== null ? formatCurrency((inv.stmtIgst || 0) + (inv.stmtCgst || 0) + (inv.stmtSgst || 0)) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">
                        {formatCurrency(Math.abs(inv.diffTotal || 0))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          {inv.matchStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-[11px]">
                        {inv.actionRequired || inv.remarks || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
