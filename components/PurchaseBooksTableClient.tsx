"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/gst-utils";
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

export function PurchaseBooksTableClient({ initialRecords }: { initialRecords: any[] }) {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Distinct months
  const months = useMemo(() => {
    const set = new Set<string>();
    initialRecords.forEach((r) => r.month && set.add(r.month));
    return Array.from(set);
  }, [initialRecords]);

  // Filtered records
  const filtered = useMemo(() => {
    return initialRecords.filter((r) => {
      const matchesSearch =
        !search ||
        r.gstin.toLowerCase().includes(search.toLowerCase()) ||
        r.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        r.invoiceNumber.toLowerCase().includes(search.toLowerCase());

      const matchesMonth = selectedMonth === "ALL" || r.month === selectedMonth;

      return matchesSearch && matchesMonth;
    });
  }, [initialRecords, search, selectedMonth]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Totals
  const totalTaxable = filtered.reduce((acc, r) => acc + (r.taxableValue || 0), 0);
  const totalTax = filtered.reduce((acc, r) => acc + (r.totalTax || 0), 0);

  if (initialRecords.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Purchase Books data imported yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Upload your purchase register or click &quot;Load Demo Dataset&quot; from the top bar to test immediately.
        </p>
        <Link
          href="/import"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
        >
          Import Purchase Books
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Supplier, GSTIN, Invoice #..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> of{" "}
          <span className="font-bold text-slate-800">{initialRecords.length}</span> records
        </div>
      </div>

      {/* Table */}
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
                <th className="px-3 py-3 text-right">Total Tax</th>
                <th className="px-3 py-3 text-right">Invoice Total</th>
                <th className="px-3 py-3 text-center">RCM</th>
                <th className="px-3 py-3 text-center">ITC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-800">
                    {r.gstin}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-900 max-w-xs truncate">
                    {r.supplierName}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{r.invoiceNumber}</td>
                  <td className="px-3 py-2.5 text-slate-600">{formatDate(r.invoiceDate)}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.month}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                    {formatCurrency(r.taxableValue)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(r.igst)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(r.cgst)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(r.sgst)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-blue-700">
                    {formatCurrency(r.totalTax)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                    {formatCurrency(r.invoiceValue)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.rcm ? (
                      <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        RCM
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.itcEligible ? (
                      <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        Eligible
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        Ineligible
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals footer */}
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-800">
              <tr>
                <td colSpan={5} className="px-3 py-2.5 text-right">
                  Filtered Page Totals:
                </td>
                <td className="px-3 py-2.5 text-right text-slate-900">
                  {formatCurrency(totalTaxable)}
                </td>
                <td colSpan={3}></td>
                <td className="px-3 py-2.5 text-right text-blue-700">
                  {formatCurrency(totalTax)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded bg-white border border-slate-300 text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded bg-white border border-slate-300 text-slate-600 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
