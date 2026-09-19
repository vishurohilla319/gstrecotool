"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate, getMonthsForFinancialYear } from "@/lib/gst-utils";
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

export function PurchaseBooksTableClient({ initialRecords }: { initialRecords: any[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const pageSize = 15;

  // All 12 FY months plus any custom months present in records
  const months = useMemo(() => {
    const fyMonths = getMonthsForFinancialYear("2026-27");
    const set = new Set<string>(fyMonths);
    records.forEach((r) => r.month && set.add(r.month));
    return Array.from(set);
  }, [records]);

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !search ||
        (r.gstin && r.gstin.toLowerCase().includes(search.toLowerCase())) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(search.toLowerCase())) ||
        (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(search.toLowerCase()));

      const matchesMonth = selectedMonth === "ALL" || r.month === selectedMonth;

      return matchesSearch && matchesMonth;
    });
  }, [records, search, selectedMonth]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Totals
  const totalTaxable = filtered.reduce((acc, r) => acc + (r.taxableValue || 0), 0);
  const totalGrossTax = filtered.reduce((acc, r) => acc + (r.totalTax || 0), 0);
  
  const totalReversedTax = filtered
    .filter((r) => r.itcEligible === false || r.itcIneligible === true)
    .reduce((acc, r) => acc + (r.totalTax || 0), 0);
  const reversedCount = filtered.filter((r) => r.itcEligible === false || r.itcIneligible === true).length;
  
  const netClaimableTax = totalGrossTax - totalReversedTax;

  const handleToggleItc = async (id: string, currentEligible: boolean) => {
    setLoadingId(id);
    try {
      const nextEligible = !currentEligible;
      const res = await fetch("/api/purchase-books/toggle-itc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, itcEligible: nextEligible }),
      });
      if (res.ok) {
        setRecords((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, itcEligible: nextEligible, itcIneligible: !nextEligible }
              : item
          )
        );
      } else {
        alert("Failed to update ITC status. Please try again.");
      }
    } catch (err) {
      alert("Error updating ITC status");
    } finally {
      setLoadingId(null);
    }
  };

  if (records.length === 0) {
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
      {/* ITC Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Books ITC</span>
          <div className="text-base font-bold text-slate-900 mt-0.5">{formatCurrency(totalGrossTax)}</div>
          <div className="text-[10px] text-slate-500">{filtered.length} total invoices</div>
        </div>
        <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">(-) ITC Reversed / Ineligible</span>
          <div className="text-base font-bold text-purple-800 mt-0.5">{formatCurrency(totalReversedTax)}</div>
          <div className="text-[10px] text-purple-600">{reversedCount} reversed invoices</div>
        </div>
        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">(=) Net Claimable ITC</span>
          <div className="text-base font-bold text-emerald-800 mt-0.5">{formatCurrency(netClaimableTax)}</div>
          <div className="text-[10px] text-emerald-600">{filtered.length - reversedCount} eligible invoices</div>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Taxable Turnover</span>
          <div className="text-base font-bold text-slate-800 mt-0.5">{formatCurrency(totalTaxable)}</div>
          <div className="text-[10px] text-slate-500">Filtered purchases</div>
        </div>
      </div>

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
                <th className="px-3 py-3 text-center">ITC Status</th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((r) => {
                const isReversed = r.itcEligible === false || r.itcIneligible === true;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-800">
                      {r.gstin && r.gstin !== "URD" ? (
                        r.gstin
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          URD / No GSTIN
                        </span>
                      )}
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
                      {!isReversed ? (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Eligible
                        </span>
                      ) : (
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          ITC Reversed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => handleToggleItc(r.id, !isReversed)}
                        disabled={loadingId === r.id}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          !isReversed
                            ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        {loadingId === r.id ? "..." : !isReversed ? "Reverse ITC" : "Restore ITC"}
                      </button>
                    </td>
                  </tr>
                );
              })}
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
                  {formatCurrency(totalGrossTax)}
                </td>
                <td colSpan={4}></td>
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
