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
  Calendar,
} from "lucide-react";

const FY_MONTHS = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

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
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [runningReco, setRunningReco] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Manual Match Modal State
  const [modalItem, setModalItem] = useState<any | null>(null);
  const [matchReason, setMatchReason] = useState("");
  const [matchingLoading, setMatchingLoading] = useState(false);

  // ITC Reversal Modal State (Single & Bulk)
  const [reverseModalItem, setReverseModalItem] = useState<any | null>(null);
  const [isBulkModal, setIsBulkModal] = useState(false);
  const [reversalReason, setReversalReason] = useState("Section 17(5) Blocked Credit");
  const [reversalAmount, setReversalAmount] = useState("");
  const [reversalRemarks, setReversalRemarks] = useState("");
  const [reversalLoading, setReversalLoading] = useState(false);

  const getItemMonthName = (dateVal: any): string => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString("en-US", { month: "long" });
    } catch {
      return "";
    }
  };

  const getItemTax = (item: any) =>
    (item.booksTaxable !== null && item.booksTaxable !== undefined
      ? (item.booksIgst || 0) + (item.booksCgst || 0) + (item.booksSgst || 0)
      : (item.stmtIgst || 0) + (item.stmtCgst || 0) + (item.stmtSgst || 0)) || 0;

  const selectedItems = items.filter((it) => selectedIds.has(it.id));
  const selectedTaxTotal = selectedItems.reduce((sum, it) => sum + getItemTax(it), 0);

  const openReverseModal = (item: any) => {
    setIsBulkModal(false);
    setReverseModalItem(item);
    const taxAmt = getItemTax(item);
    setReversalAmount(taxAmt > 0 ? String(taxAmt.toFixed(2)) : "0.00");
    setReversalReason("Section 17(5) Blocked Credit");
    setReversalRemarks("");
  };

  const openBulkReverseModal = () => {
    if (selectedIds.size === 0) return;
    setIsBulkModal(true);
    setReverseModalItem(null);
    setReversalAmount(selectedTaxTotal > 0 ? String(selectedTaxTotal.toFixed(2)) : "0.00");
    setReversalReason("Section 17(5) Blocked Credit");
    setReversalRemarks("");
  };

  const handleReverseItcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBulkModal && !reverseModalItem) return;
    if (isBulkModal && selectedIds.size === 0) return;

    setReversalLoading(true);
    try {
      if (isBulkModal) {
        const ids = Array.from(selectedIds);
        const res = await fetch("/api/reconciliation/reverse-itc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemIds: ids,
            action: "REVERSE",
            reversalReason,
            reversalAmount: Number(reversalAmount) || 0,
            remarks: reversalRemarks,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reverse ITC");

        setItems((prev) =>
          prev.map((i) =>
            selectedIds.has(i.id)
              ? {
                  ...i,
                  matchStatus: "ITC_INELIGIBLE",
                  priority: "LOW",
                  actionRequired: `Reversed in Books / 3B (${reversalReason})`,
                  remarks: `ITC Reversed: ${reversalReason}${
                    reversalRemarks ? ` - ${reversalRemarks}` : ""
                  }`,
                }
              : i
          )
        );

        setSelectedIds(new Set());
        setIsBulkModal(false);
      } else {
        const res = await fetch("/api/reconciliation/reverse-itc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: reverseModalItem.id,
            booksRecordId: reverseModalItem.booksRecordId,
            statementRecordId: reverseModalItem.statementRecordId,
            action: "REVERSE",
            reversalReason,
            reversalAmount: Number(reversalAmount) || 0,
            remarks: reversalRemarks,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reverse ITC");

        setItems((prev) =>
          prev.map((i) =>
            i.id === reverseModalItem.id
              ? {
                  ...i,
                  matchStatus: "ITC_INELIGIBLE",
                  priority: "LOW",
                  actionRequired: `Reversed in Books / 3B (${reversalReason})`,
                  remarks: `ITC Reversed: ${reversalReason} (₹${reversalAmount})${
                    reversalRemarks ? ` - ${reversalRemarks}` : ""
                  }`,
                }
              : i
          )
        );

        setReverseModalItem(null);
      }
      setReversalRemarks("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setReversalLoading(false);
    }
  };

  const handleBulkRestoreItc = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Restore ITC as eligible for ${selectedIds.size} selected invoices?`)) return;

    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/reconciliation/reverse-itc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: ids,
          action: "RESTORE",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore ITC");

      setItems((prev) =>
        prev.map((i) =>
          selectedIds.has(i.id)
            ? {
                ...i,
                matchStatus:
                  i.booksRecordId && i.statementRecordId
                    ? "EXACT_MATCH"
                    : i.booksRecordId
                    ? "BOOKS_ONLY"
                    : "STATEMENT_ONLY",
                actionRequired: null,
                remarks: "ITC Restored as eligible",
              }
            : i
        )
      );
      setSelectedIds(new Set());
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleRestoreItc = async (item: any) => {
    if (!confirm(`Restore ITC for Invoice ${item.booksInvoiceNo || item.stmtInvoiceNo}?`)) return;

    try {
      const res = await fetch("/api/reconciliation/reverse-itc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          booksRecordId: item.booksRecordId,
          statementRecordId: item.statementRecordId,
          action: "RESTORE",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore ITC");

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                matchStatus:
                  i.booksRecordId && i.statementRecordId
                    ? "EXACT_MATCH"
                    : i.booksRecordId
                    ? "BOOKS_ONLY"
                    : "STATEMENT_ONLY",
                actionRequired: null,
                remarks: "ITC Restored as eligible",
              }
            : i
        )
      );
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

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

  // Live ITC calculations for matching with Books
  const totalBooksTax = items.reduce(
    (acc, i) =>
      acc +
      (i.booksTaxable !== null && i.booksTaxable !== undefined
        ? (i.booksIgst || 0) + (i.booksCgst || 0) + (i.booksSgst || 0)
        : 0),
    0
  );

  const reversedItems = items.filter(
    (i) =>
      i.matchStatus === "ITC_INELIGIBLE" ||
      (i.remarks && i.remarks.toLowerCase().includes("itc reversed")) ||
      (i.actionRequired && i.actionRequired.toLowerCase().includes("reversed"))
  );

  const totalReversedTax = reversedItems.reduce(
    (acc, i) =>
      acc +
      ((i.booksTaxable !== null && i.booksTaxable !== undefined
        ? (i.booksIgst || 0) + (i.booksCgst || 0) + (i.booksSgst || 0)
        : (i.stmtIgst || 0) + (i.stmtCgst || 0) + (i.stmtSgst || 0)) || 0),
    0
  );

  const netEligibleBooksTax = Math.max(0, totalBooksTax - totalReversedTax);

  const total2bEligibleTax = items.reduce(
    (acc, i) =>
      acc +
      (i.stmtTaxable !== null &&
      i.stmtTaxable !== undefined &&
      i.matchStatus !== "ITC_INELIGIBLE" &&
      (!i.remarks || !i.remarks.toLowerCase().includes("ineligible"))
        ? (i.stmtIgst || 0) + (i.stmtCgst || 0) + (i.stmtSgst || 0)
        : 0),
    0
  );

  const netItcDifference = Math.round((netEligibleBooksTax - total2bEligibleTax) * 100) / 100;
  const isItcMatched = Math.abs(netItcDifference) <= (tolerances?.taxableTolerance ?? 1.0);

  const filteredItems = items.filter((item) => {
    const isItemReversed =
      item.matchStatus === "ITC_INELIGIBLE" ||
      (item.remarks && item.remarks.toLowerCase().includes("itc reversed")) ||
      (item.actionRequired && item.actionRequired.toLowerCase().includes("reversed"));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ITC_REVERSED" ? isItemReversed : item.matchStatus === statusFilter);

    const matchesMonth =
      selectedMonth === "ALL" ||
      getItemMonthName(item.booksDate) === selectedMonth ||
      getItemMonthName(item.stmtDate) === selectedMonth;

    const matchesSearch =
      !search ||
      (item.booksSupplier && item.booksSupplier.toLowerCase().includes(search.toLowerCase())) ||
      (item.stmtSupplier && item.stmtSupplier.toLowerCase().includes(search.toLowerCase())) ||
      (item.booksGstin && item.booksGstin.toLowerCase().includes(search.toLowerCase())) ||
      (item.stmtGstin && item.stmtGstin.toLowerCase().includes(search.toLowerCase())) ||
      (item.booksInvoiceNo && item.booksInvoiceNo.toLowerCase().includes(search.toLowerCase())) ||
      (item.stmtInvoiceNo && item.stmtInvoiceNo.toLowerCase().includes(search.toLowerCase()));

    return matchesStatus && matchesSearch && matchesMonth;
  });

  const isAllFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((it) => selectedIds.has(it.id));

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((it) => next.delete(it.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((it) => next.add(it.id));
        return next;
      });
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string, item?: any) => {
    const isReversed =
      status === "ITC_INELIGIBLE" ||
      (item?.remarks && item.remarks.toLowerCase().includes("itc reversed")) ||
      (item?.actionRequired && item.actionRequired.toLowerCase().includes("reversed"));

    if (isReversed) {
      return (
        <span className="bg-purple-100 text-purple-900 border border-purple-300 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span> ITC Reversed
        </span>
      );
    }

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
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 font-bold px-2 py-0.5 rounded text-[10px]">ITC Reversed</span>;
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
      {/* Live ITC Matching Summary with Books */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl border border-slate-700 shadow-md text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              ITC Reconciliation & Reversal Summary (Books vs GSTR-2B)
            </h2>
          </div>
          <div className="text-[11px] font-medium text-slate-300">
            {isItcMatched ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-600/40 px-2.5 py-1 rounded-full font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Net Books ITC & 2B Reconciled (₹0 Variance)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-950/60 border border-amber-600/40 px-2.5 py-1 rounded-full font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Net ITC Variance: {formatCurrency(Math.abs(netItcDifference))}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[11px] font-semibold text-slate-400">1. Gross Books ITC</span>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(totalBooksTax)}</p>
            <span className="text-[10px] text-slate-400">Total in Purchase Register</span>
          </div>

          <div className="bg-purple-950/40 p-3 rounded-xl border border-purple-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-300">2. (-) ITC Reversed</span>
              <span className="text-[10px] font-bold bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded">
                {reversedItems.length} inv
              </span>
            </div>
            <p className="text-lg font-bold text-purple-300 mt-1">{formatCurrency(totalReversedTax)}</p>
            <span className="text-[10px] text-purple-400/80">Sec 17(5) / Rule 37, 42, 43</span>
          </div>

          <div className="bg-blue-950/40 p-3 rounded-xl border border-blue-800/50">
            <span className="text-[11px] font-semibold text-blue-300">3. (=) Net Books ITC</span>
            <p className="text-lg font-bold text-blue-300 mt-1">{formatCurrency(netEligibleBooksTax)}</p>
            <span className="text-[10px] text-blue-400/80">Gross Books (-) Reversed</span>
          </div>

          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/50">
            <span className="text-[11px] font-semibold text-emerald-300">4. GSTR-2B Available ITC</span>
            <p className="text-lg font-bold text-emerald-300 mt-1">{formatCurrency(total2bEligibleTax)}</p>
            <span className="text-[10px] text-emerald-400/80">Eligible on GST Portal</span>
          </div>

          <div
            className={`p-3 rounded-xl border col-span-2 md:col-span-1 ${
              isItcMatched
                ? "bg-emerald-950/50 border-emerald-700/60 text-emerald-300"
                : "bg-rose-950/50 border-rose-700/60 text-rose-300"
            }`}
          >
            <span className="text-[11px] font-semibold">
              {isItcMatched ? "5. Net Status" : "5. Net Variance"}
            </span>
            <p className="text-lg font-bold mt-1">
              {formatCurrency(Math.abs(netItcDifference))}
            </p>
            <span className="text-[10px] opacity-80">
              {netItcDifference > 0
                ? "Excess in Books"
                : netItcDifference < 0
                ? "Available in 2B"
                : "100% Reconciled"}
            </span>
          </div>
        </div>
      </div>

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
          { key: "ITC_REVERSED", label: `ITC Reversed (${reversedItems.length})` },
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

      {/* Search & Month Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64 sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor, GSTIN, invoice..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedIds(new Set());
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">All FY Months (Full Year)</option>
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {selectedMonth !== "ALL" && (
            <button
              onClick={() => setSelectedMonth("ALL")}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
            >
              Reset Month
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={openBulkReverseModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Bulk Reverse ({selectedIds.size})
            </button>
          )}

          <a
            href="/api/export?type=FULL_RECONCILIATION&format=xlsx"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </a>
        </div>
      </div>

      {/* Side-by-Side Dual Table with Compact Row Height */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800 font-bold divide-x divide-slate-200">
                <th
                  rowSpan={2}
                  className="px-2 py-1 text-center bg-slate-100 border-b border-r border-slate-200 w-8"
                  title={isAllFilteredSelected ? "Deselect All" : "Select All Filtered Bills"}
                >
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th colSpan={4} className="bg-blue-50/70 px-3 py-1.5 text-blue-900 uppercase tracking-wider text-[10px]">
                  Purchase Register (Books)
                </th>
                <th colSpan={4} className="bg-emerald-50/70 px-3 py-1.5 text-emerald-900 uppercase tracking-wider text-[10px]">
                  GSTR-2B Statement (Portal)
                </th>
                <th colSpan={4} className="bg-slate-100 px-3 py-1.5 text-slate-900 uppercase tracking-wider text-[10px]">
                  Variance & Audit Action
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px]">
                <th className="px-2.5 py-1.5">Supplier</th>
                <th className="px-2 py-1.5">Invoice #</th>
                <th className="px-2 py-1.5">Date</th>
                <th className="px-2.5 py-1.5 text-right">Tax (₹)</th>

                <th className="px-2.5 py-1.5 border-l border-slate-200">Supplier</th>
                <th className="px-2 py-1.5">Invoice #</th>
                <th className="px-2 py-1.5">Date</th>
                <th className="px-2.5 py-1.5 text-right">Tax (₹)</th>

                <th className="px-2 py-1.5 border-l border-slate-200">Status</th>
                <th className="px-2.5 py-1.5 text-right">Tax Diff</th>
                <th className="px-2.5 py-1.5">Remarks / Reason</th>
                <th className="px-2 py-1.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No records found matching current month or filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isReversed =
                    item.matchStatus === "ITC_INELIGIBLE" ||
                    (item.remarks && item.remarks.toLowerCase().includes("itc reversed")) ||
                    (item.actionRequired && item.actionRequired.toLowerCase().includes("reversed"));
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/50 transition-colors ${
                        isSelected ? "bg-blue-50/70" : ""
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="px-2 py-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Books Side */}
                      <td className="px-2.5 py-1">
                        <div className="font-semibold text-slate-900 max-w-[140px] truncate leading-tight text-[11px]">
                          {item.booksSupplier || "-"}
                        </div>
                        <div className="font-mono text-[9px] text-slate-500 leading-none mt-0.5">{item.booksGstin || "-"}</div>
                      </td>
                      <td className="px-2 py-1 font-mono text-slate-700 text-[11px] whitespace-nowrap">{item.booksInvoiceNo || "-"}</td>
                      <td className="px-2 py-1 text-slate-600 text-[10px] whitespace-nowrap">{formatDate(item.booksDate)}</td>
                      <td className="px-2.5 py-1 text-right font-medium text-slate-900 text-[11px] whitespace-nowrap">
                        {item.booksTaxable !== null && item.booksTaxable !== undefined
                          ? formatCurrency((item.booksIgst || 0) + (item.booksCgst || 0) + (item.booksSgst || 0))
                          : "-"}
                      </td>

                      {/* 2B Side */}
                      <td className="px-2.5 py-1 border-l border-slate-200">
                        <div className="font-semibold text-slate-900 max-w-[140px] truncate leading-tight text-[11px]">
                          {item.stmtSupplier || "-"}
                        </div>
                        <div className="font-mono text-[9px] text-slate-500 leading-none mt-0.5">{item.stmtGstin || "-"}</div>
                      </td>
                      <td className="px-2 py-1 font-mono text-slate-700 text-[11px] whitespace-nowrap">{item.stmtInvoiceNo || "-"}</td>
                      <td className="px-2 py-1 text-slate-600 text-[10px] whitespace-nowrap">{formatDate(item.stmtDate)}</td>
                      <td className="px-2.5 py-1 text-right font-medium text-slate-900 text-[11px] whitespace-nowrap">
                        {item.stmtTaxable !== null && item.stmtTaxable !== undefined
                          ? formatCurrency((item.stmtIgst || 0) + (item.stmtCgst || 0) + (item.stmtSgst || 0))
                          : "-"}
                      </td>

                      {/* Variance & Audit */}
                      <td className="px-2 py-1 border-l border-slate-200 whitespace-nowrap">
                        {getStatusBadge(item.matchStatus, item)}
                      </td>
                      <td
                        className={`px-2.5 py-1 text-right font-bold text-[11px] whitespace-nowrap ${
                          Math.abs(item.diffTotal || 0) > 0.01 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(Math.abs(item.diffTotal || 0))}
                      </td>
                      <td className="px-2.5 py-1 text-slate-600 max-w-[160px] truncate text-[10px]" title={item.actionRequired || item.remarks || ""}>
                        {item.actionRequired || item.remarks || "-"}
                      </td>
                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* ITC Reverse / Restore Button */}
                          {isReversed ? (
                            <button
                              onClick={() => handleRestoreItc(item)}
                              className="px-1.5 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-semibold border border-purple-200 cursor-pointer"
                              title="Restore ITC as eligible"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => openReverseModal(item)}
                              className="px-1.5 py-0.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded text-[10px] font-semibold border border-amber-200 cursor-pointer"
                              title="Reverse ITC in Books / 3B"
                            >
                              Reverse ITC
                            </button>
                          )}

                          {/* Manual Match Button if applicable */}
                          {(item.matchStatus === "MANUAL_REVIEW" ||
                            item.matchStatus === "TAX_DIFFERENCE" ||
                            item.matchStatus === "DATE_DIFFERENCE") && (
                            <button
                              onClick={() => {
                                setModalItem(item);
                                setMatchReason("Verified tax invoice and confirmed genuine match");
                              }}
                              className="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-semibold border border-blue-200 cursor-pointer"
                            >
                              Match
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-6 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-bottom-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-full font-bold text-xs text-white">
              {selectedIds.size}
            </span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{selectedIds.size} Invoice{selectedIds.size > 1 ? "s" : ""} Selected</span>
                {selectedMonth !== "ALL" && (
                  <span className="text-[10px] bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded-full border border-blue-700">
                    Month: {selectedMonth}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300">
                Total Tax to Reverse:{" "}
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(selectedTaxTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openBulkReverseModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> 1-Click Bulk Reverse ITC ({selectedIds.size} bills)
            </button>

            <button
              type="button"
              onClick={handleBulkRestoreItc}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-600 transition-all cursor-pointer"
            >
              Restore ITC
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Manual Match Confirmation Modal */}
      {modalItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Confirm Manual Invoice Match</h3>
              <button
                onClick={() => setModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={matchingLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {matchingLoading ? "Matching..." : "Confirm & Save Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITC Reversal Modal (Single or Bulk) */}
      {(reverseModalItem || isBulkModal) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isBulkModal
                    ? `Bulk Reverse ITC (${selectedIds.size} Invoices)`
                    : "Mark ITC as Reversed"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isBulkModal
                    ? `Exclude credit for all ${selectedIds.size} selected bills to reconcile with Books & Form 3B`
                    : "Exclude this ITC to reconcile Net Eligible Credit with Books & Form 3B"}
                </p>
              </div>
              <button
                onClick={() => {
                  setReverseModalItem(null);
                  setIsBulkModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-slate-200">
              {isBulkModal ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Invoices:</span>
                    <span className="font-bold text-slate-900">{selectedIds.size} bills</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Tax Credit to Reverse:</span>
                    <span className="font-bold font-mono text-purple-700 text-sm">
                      {formatCurrency(selectedTaxTotal)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                      {reverseModalItem?.booksSupplier || reverseModalItem?.stmtSupplier || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Number:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {reverseModalItem?.booksInvoiceNo || reverseModalItem?.stmtInvoiceNo || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Tax Amount:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(
                        (reverseModalItem?.booksTaxable !== null && reverseModalItem?.booksTaxable !== undefined
                          ? (reverseModalItem?.booksIgst || 0) + (reverseModalItem?.booksCgst || 0) + (reverseModalItem?.booksSgst || 0)
                          : (reverseModalItem?.stmtIgst || 0) + (reverseModalItem?.stmtCgst || 0) + (reverseModalItem?.stmtSgst || 0)) || 0
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={handleReverseItcSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for ITC Reversal:
                </label>
                <select
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Section 17(5) Blocked Credit">
                    Section 17(5) - Ineligible / Blocked Credit (Motor Vehicles, Food, Club, etc.)
                  </option>
                  <option value="Rule 37 (180 Days Non-payment)">
                    Rule 37 - 180 Days Supplier Payment Not Made
                  </option>
                  <option value="Rule 42/43 (Exempt/Personal Supply)">
                    Rule 42/43 - Inputs/Capital Goods Used for Exempt/Personal Supply
                  </option>
                  <option value="Reversed in GSTR-3B Table 4(B)">
                    Table 4(B) - Reversed in Form GSTR-3B Return
                  </option>
                  <option value="Debit Note / Purchase Return">
                    Debit Note / Purchase Return / Rate Difference Adjustment
                  </option>
                  <option value="Other Reversal">Other Reversal / Manual Audit Adjustment</option>
                </select>
              </div>

              {!isBulkModal && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Reversal Amount (₹):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={reversalAmount}
                    onChange={(e) => setReversalAmount(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Remarks / Audit Justification (Optional):
                </label>
                <input
                  type="text"
                  value={reversalRemarks}
                  onChange={(e) => setReversalRemarks(e.target.value)}
                  placeholder="e.g. Reversed in Table 4(B)(2) of May 2026 return"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReverseModalItem(null);
                    setIsBulkModal(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversalLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {reversalLoading
                    ? "Saving..."
                    : isBulkModal
                    ? `Confirm Reversal (${selectedIds.size} Bills)`
                    : "Confirm ITC Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
