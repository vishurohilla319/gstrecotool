"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/gst-utils";
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
} from "lucide-react";

export function BooksVs2BClient({
  initialItems,
  summary,
  tolerances,
}: {
  initialItems: any[];
  summary: any;
  tolerances: any;
}) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>(initialItems);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [runningReco, setRunningReco] = useState(false);

  // Manual Match Modal State
  const [modalItem, setModalItem] = useState<any | null>(null);
  const [matchReason, setMatchReason] = useState("");
  const [matchingLoading, setMatchingLoading] = useState(false);

  const handleRunReconciliation = async () => {
    setRunningReco(true);
    try {
      const res = await fetch("/api/reconciliation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fy: "2026-27" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run reconciliation");

      alert("Reconciliation completed successfully!");
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setRunningReco(false);
    }
  };

  const handleManualMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem || !matchReason) return;

    setMatchingLoading(true);
    try {
      const res = await fetch("/api/reconciliation/manual-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: modalItem.id,
          booksRecordId: modalItem.booksRecordId,
          statementRecordId: modalItem.statementRecordId,
          reason: matchReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to match");

      // Update in state
      setItems((prev) =>
        prev.map((i) =>
          i.id === modalItem.id
            ? { ...i, matchStatus: "MANUAL_MATCHED", remarks: `Manually matched: ${matchReason}` }
            : i
        )
      );

      setModalItem(null);
      setMatchReason("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setMatchingLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === "ALL" || item.matchStatus === statusFilter;
    const matchesSearch =
      !search ||
      (item.booksSupplier && item.booksSupplier.toLowerCase().includes(search.toLowerCase())) ||
      (item.stmtSupplier && item.stmtSupplier.toLowerCase().includes(search.toLowerCase())) ||
      (item.booksGstin && item.booksGstin.toLowerCase().includes(search.toLowerCase())) ||
      (item.stmtGstin && item.stmtGstin.toLowerCase().includes(search.toLowerCase())) ||
      (item.booksInvoiceNo && item.booksInvoiceNo.toLowerCase().includes(search.toLowerCase())) ||
      (item.stmtInvoiceNo && item.stmtInvoiceNo.toLowerCase().includes(search.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "EXACT_MATCH":
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">Exact Match</span>;
      case "TAX_DIFFERENCE":
        return <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">Tax Difference</span>;
      case "DATE_DIFFERENCE":
        return <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">Date Diff</span>;
      case "BOOKS_ONLY":
        return <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">Books Only</span>;
      case "STATEMENT_ONLY":
        return <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px]">2B Only</span>;
      case "DUPLICATE":
        return <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[10px]">Duplicate</span>;
      case "ITC_INELIGIBLE":
        return <span className="bg-red-200 text-red-900 font-bold px-2 py-0.5 rounded text-[10px]">ITC Ineligible</span>;
      case "RCM":
        return <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px]">RCM</span>;
      case "MANUAL_REVIEW":
        return <span className="bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded text-[10px]">Manual Review</span>;
      case "MANUAL_MATCHED":
        return <span className="bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded text-[10px]">Manually Matched</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tolerances Banner */}
      <div className="bg-slate-900 text-slate-300 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Active Matching Tolerances:
          </span>
          <span>Taxable: ₹{tolerances?.taxableTolerance ?? 1.0}</span>
          <span>IGST: ₹{tolerances?.igstTolerance ?? 1.0}</span>
          <span>CGST/SGST: ₹{tolerances?.cgstTolerance ?? 1.0}</span>
          <span>Date: {tolerances?.dateToleranceDays ?? 0} days</span>
        </div>
        <button
          onClick={handleRunReconciliation}
          disabled={runningReco}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${runningReco ? "animate-spin" : ""}`} />
          {runningReco ? "Reconciling..." : "Re-run Engine"}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold">
        {[
          { key: "ALL", label: `All (${items.length})` },
          { key: "EXACT_MATCH", label: "Exact Match" },
          { key: "TAX_DIFFERENCE", label: "Tax Difference" },
          { key: "DATE_DIFFERENCE", label: "Date Diff" },
          { key: "BOOKS_ONLY", label: "Books Only" },
          { key: "STATEMENT_ONLY", label: "2B Only" },
          { key: "ITC_INELIGIBLE", label: "Ineligible" },
          { key: "MANUAL_REVIEW", label: "Fuzzy / Review" },
          { key: "MANUAL_MATCHED", label: "Manually Matched" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === tab.key
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name, GSTIN, invoice..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <a
          href="/api/export?type=FULL_RECONCILIATION&format=xlsx"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
        >
          <Download className="w-3.5 h-3.5" /> Export Reconciliation Excel
        </a>
      </div>

      {/* Side-by-Side Dual Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800 font-bold divide-x divide-slate-200">
                <th colSpan={4} className="bg-blue-50/70 px-4 py-2.5 text-blue-900 uppercase tracking-wider text-[11px]">
                  Purchase Register (Books)
                </th>
                <th colSpan={4} className="bg-emerald-50/70 px-4 py-2.5 text-emerald-900 uppercase tracking-wider text-[11px]">
                  GSTR-2B Statement (Portal)
                </th>
                <th colSpan={4} className="bg-slate-100 px-4 py-2.5 text-slate-900 uppercase tracking-wider text-[11px]">
                  Variance & Audit Action
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Invoice #</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Tax (₹)</th>

                <th className="px-3 py-2 border-l border-slate-200">Supplier</th>
                <th className="px-3 py-2">Invoice #</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Tax (₹)</th>

                <th className="px-3 py-2 border-l border-slate-200">Status</th>
                <th className="px-3 py-2 text-right">Tax Diff</th>
                <th className="px-3 py-2">Remarks / Action</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                    No records found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Books Side */}
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 max-w-[130px] truncate">
                        {item.booksSupplier || "-"}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">{item.booksGstin || "-"}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{item.booksInvoiceNo || "-"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{formatDate(item.booksDate)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                      {item.booksTaxable !== null && item.booksTaxable !== undefined
                        ? formatCurrency((item.booksIgst || 0) + (item.booksCgst || 0) + (item.booksSgst || 0))
                        : "-"}
                    </td>

                    {/* 2B Side */}
                    <td className="px-3 py-2.5 border-l border-slate-200">
                      <div className="font-semibold text-slate-900 max-w-[130px] truncate">
                        {item.stmtSupplier || "-"}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">{item.stmtGstin || "-"}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{item.stmtInvoiceNo || "-"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{formatDate(item.stmtDate)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                      {item.stmtTaxable !== null && item.stmtTaxable !== undefined
                        ? formatCurrency((item.stmtIgst || 0) + (item.stmtCgst || 0) + (item.stmtSgst || 0))
                        : "-"}
                    </td>

                    {/* Variance & Audit */}
                    <td className="px-3 py-2.5 border-l border-slate-200">
                      {getStatusBadge(item.matchStatus)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold ${
                        Math.abs(item.diffTotal || 0) > 0.01 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(Math.abs(item.diffTotal || 0))}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[180px] text-[11px]">
                      {item.actionRequired || item.remarks || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.matchStatus === "MANUAL_REVIEW" ||
                      item.matchStatus === "TAX_DIFFERENCE" ||
                      item.matchStatus === "DATE_DIFFERENCE" ? (
                        <button
                          onClick={() => {
                            setModalItem(item);
                            setMatchReason("Verified tax invoice and confirmed genuine match");
                          }}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold border border-blue-200"
                        >
                          Manual Match
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Match Confirmation Modal */}
      {modalItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Confirm Manual Invoice Match</h3>
              <button
                onClick={() => setModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Books Invoice:</span>
                <span className="font-mono font-bold text-slate-800">{modalItem.booksInvoiceNo || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">2B Invoice:</span>
                <span className="font-mono font-bold text-slate-800">{modalItem.stmtInvoiceNo || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax Variance:</span>
                <span className="font-bold text-red-600">{formatCurrency(modalItem.diffTotal || 0)}</span>
              </div>
            </div>

            <form onSubmit={handleManualMatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Justification / Audit Reason:
                </label>
                <textarea
                  required
                  rows={3}
                  value={matchReason}
                  onChange={(e) => setMatchReason(e.target.value)}
                  placeholder="e.g. Invoice number formatting variation accepted; verified against physical invoice copy"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={matchingLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {matchingLoading ? "Matching..." : "Confirm & Save Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
