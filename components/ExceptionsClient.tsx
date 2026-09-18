"use client";

import React, { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/gst-utils";
import { Search, Download, AlertTriangle, Filter, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function ExceptionsClient({ initialItems }: { initialItems: any[] }) {
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [issueFilter, setIssueFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = initialItems.filter((i) => {
    const matchesPriority = priorityFilter === "ALL" || i.priority === priorityFilter;
    const matchesIssue = issueFilter === "ALL" || i.matchStatus === issueFilter;
    const matchesSearch =
      !search ||
      (i.booksSupplier && i.booksSupplier.toLowerCase().includes(search.toLowerCase())) ||
      (i.stmtSupplier && i.stmtSupplier.toLowerCase().includes(search.toLowerCase())) ||
      (i.booksInvoiceNo && i.booksInvoiceNo.toLowerCase().includes(search.toLowerCase())) ||
      (i.stmtInvoiceNo && i.stmtInvoiceNo.toLowerCase().includes(search.toLowerCase()));

    return matchesPriority && matchesIssue && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor or invoice..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-500">Priority:</span>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  priorityFilter === p
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <a
          href="/api/export?type=EXCEPTIONS&format=xlsx"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
        >
          <Download className="w-3.5 h-3.5" /> Export Exceptions Excel
        </a>
      </div>

      {/* Exceptions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="px-3 py-3 text-center">Priority</th>
                <th className="px-3 py-3">Supplier Name</th>
                <th className="px-3 py-3">GSTIN</th>
                <th className="px-3 py-3">Invoice Number</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Issue Type</th>
                <th className="px-3 py-3 text-right">Books Tax</th>
                <th className="px-3 py-3 text-right">2B Tax</th>
                <th className="px-3 py-3 text-right font-bold text-red-700">Tax Diff</th>
                <th className="px-3 py-3">Recommended Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No exceptions found for selected filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.priority === "CRITICAL"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : item.priority === "HIGH"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900 max-w-xs truncate">
                      {item.booksSupplier || item.stmtSupplier || "Unknown"}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                      {item.booksGstin || item.stmtGstin}
                    </td>
                    <td className="px-3 py-3 font-mono font-medium text-slate-800">
                      {item.booksInvoiceNo || item.stmtInvoiceNo}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatDate(item.booksDate || item.stmtDate)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        {item.matchStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-slate-800">
                      {item.booksTaxable !== null
                        ? formatCurrency((item.booksIgst || 0) + (item.booksCgst || 0) + (item.booksSgst || 0))
                        : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-slate-800">
                      {item.stmtTaxable !== null
                        ? formatCurrency((item.stmtIgst || 0) + (item.stmtCgst || 0) + (item.stmtSgst || 0))
                        : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-red-600">
                      {formatCurrency(Math.abs(item.diffTotal || 0))}
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-medium text-[11px] max-w-sm">
                      {item.actionRequired || item.remarks || "Verify invoice"}
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
