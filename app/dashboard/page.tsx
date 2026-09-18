import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/gst-utils";
import {
  ArrowUpRight,
  TrendingUp,
  FileCheck2,
  AlertTriangle,
  FileX,
  FilePlus2,
  RefreshCw,
  UploadCloud,
  FileSpreadsheet,
  Building2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { MonthlyComparisonChart, StatusDonutChart } from "@/components/DashboardCharts";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const orgId = user.organizationId;

  // 1. Fetch live aggregated metrics
  const [
    books,
    gstr2a,
    gstr2b,
    gstr3b,
    latestRun,
    criticalExceptions,
  ] = await Promise.all([
    prisma.purchaseBook.findMany({ where: { organizationId: orgId } }),
    prisma.gstr2A.findMany({ where: { organizationId: orgId } }),
    prisma.gstr2B.findMany({ where: { organizationId: orgId } }),
    prisma.gstr3B.findMany({ where: { organizationId: orgId } }),
    prisma.reconciliationRun.findFirst({
      where: { organizationId: orgId, runType: "BOOKS_VS_2B" },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.reconciliationItem.findMany({
      where: {
        organizationId: orgId,
        priority: { in: ["CRITICAL", "HIGH"] },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Aggregate Books ITC
  const booksItcTotal = books.reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);
  const booksCount = books.length;

  // Aggregate 2A ITC
  const gstr2aItcTotal = gstr2a.reduce((acc, a) => acc + (a.igst || 0) + (a.cgst || 0) + (a.sgst || 0), 0);
  const gstr2aCount = gstr2a.length;

  // Aggregate 2B Eligible ITC
  const gstr2bEligible = gstr2b.filter((b) => b.itcEligible !== false && b.itcAvailability !== "N");
  const gstr2bItcTotal = gstr2bEligible.reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);
  const gstr2bCount = gstr2b.length;

  // Aggregate 3B Claimed ITC
  const gstr3bTotalClaimed = gstr3b.reduce((acc, r) => acc + (r.netItc || r.totalClaimed || 0), 0);
  const gstr3bCount = gstr3b.length;

  // Reconciliation summary
  const items = latestRun?.items || [];
  const matchedItems = items.filter((i) => i.matchStatus === "EXACT_MATCH");
  const matchedCount = matchedItems.length;
  const matchedAmount = matchedItems.reduce((acc, i) => acc + (i.booksIgst || 0) + (i.booksCgst || 0) + (i.booksSgst || 0), 0);

  const unmatchedItems = items.filter((i) => i.matchStatus !== "EXACT_MATCH");
  const unmatchedCount = unmatchedItems.length;
  const unmatchedAmount = unmatchedItems.reduce((acc, i) => acc + Math.abs(i.diffTotal || 0), 0);

  // Unclaimed ITC (2B eligible > 3B claimed or Books Only)
  const unclaimedItc = Math.max(0, gstr2bItcTotal - gstr3bTotalClaimed);
  const potentialExcessItc = Math.max(0, gstr3bTotalClaimed - gstr2bItcTotal);

  // Monthly breakdown for chart
  const monthsList = ["April 2026", "May 2026", "June 2026"];
  const monthlyChartData = monthsList.map((m) => {
    const bMonthItc = books
      .filter((b) => b.month === m)
      .reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);
    const aMonthItc = gstr2a
      .filter((a) => a.month === m)
      .reduce((acc, a) => acc + (a.igst || 0) + (a.cgst || 0) + (a.sgst || 0), 0);
    const b2MonthItc = gstr2b
      .filter((b) => b.month === m && b.itcEligible !== false && b.itcAvailability !== "N")
      .reduce((acc, b) => acc + (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0), 0);
    const r3b = gstr3b.find((r) => r.month === m);
    const r3bMonthItc = r3b ? (r3b.netItc || r3b.totalClaimed) : 0;

    return {
      month: m.split(" ")[0], // "April"
      booksItc: Math.round(bMonthItc),
      gstr2aItc: Math.round(aMonthItc),
      gstr2bItc: Math.round(b2MonthItc),
      gstr3bItc: Math.round(r3bMonthItc),
    };
  });

  // Status donut chart
  const statusCounts = {
    "Exact Match": items.filter((i) => i.matchStatus === "EXACT_MATCH").length,
    "Tax Mismatch": items.filter((i) => i.matchStatus === "TAX_DIFFERENCE").length,
    "Books Only": items.filter((i) => i.matchStatus === "BOOKS_ONLY").length,
    "2B Only": items.filter((i) => i.matchStatus === "STATEMENT_ONLY").length,
    "Duplicate": items.filter((i) => i.matchStatus === "DUPLICATE").length,
    "ITC Ineligible": items.filter((i) => i.matchStatus === "ITC_INELIGIBLE").length,
    "Review / RCM": items.filter((i) => i.matchStatus === "MANUAL_REVIEW" || i.matchStatus === "RCM").length,
  };

  const donutChartData = Object.entries(statusCounts)
    .filter(([_, val]) => val > 0)
    .map(([name, value]) => ({ name, value }));

  const hasData = booksCount > 0 || gstr2bCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <span>Audit Year: 2026-27</span>
            <span>•</span>
            <span className="text-slate-500">Active Period: April 2026 - March 2027</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            GST Reconciliation Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-checking Purchase Register with GST Portal Statements (2A, 2B) & Filed 3B Returns
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/import"
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-slate-600" />
            Import Register
          </Link>
          <Link
            href="/reconciliation/books-vs-2b"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Run Reconciliation
          </Link>
        </div>
      </div>

      {/* Empty State Banner if no data */}
      {!hasData && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-2xl border border-blue-200 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Welcome to GST Reconcile Pro!</h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            You can immediately test the reconciliation engine with our realistic sample dataset (Purchase Books, 2A, 2B, 3B with exact matches, ₹50 tax differences, Books-only, 2B-only, and blocked credits).
          </p>
          <div className="pt-1 flex items-center justify-center gap-3">
            <Link
              href="/import"
              className="px-4 py-2 bg-white text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 hover:bg-blue-50 shadow-xs"
            >
              Upload Your Own Excel / CSV
            </Link>
          </div>
        </div>
      )}

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Books ITC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Purchase Books ITC</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-semibold">
              {booksCount} Invoices
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(booksItcTotal)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span>Total eligible tax recorded in Books</span>
          </div>
        </div>

        {/* KPI 2: GSTR-2A ITC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>GSTR-2A ITC (Dynamic)</span>
            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px] font-semibold">
              {gstr2aCount} Invoices
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(gstr2aItcTotal)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span>Supplier live portal uploads</span>
          </div>
        </div>

        {/* KPI 3: GSTR-2B ITC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>GSTR-2B ITC (Eligible)</span>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-semibold">
              {gstr2bCount} Invoices
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(gstr2bItcTotal)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span>Legally claimable static statement</span>
          </div>
        </div>

        {/* KPI 4: GSTR-3B Claimed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>GSTR-3B ITC Claimed</span>
            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[11px] font-semibold">
              {gstr3bCount} Returns
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(gstr3bTotalClaimed)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span>Net credit claimed in filed returns</span>
          </div>
        </div>

        {/* KPI 5: Matched Invoices */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>Matched Invoices</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
              {matchedCount} Matched
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700 tracking-tight">
            {formatCurrency(matchedAmount)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">
            {items.length > 0 ? `${Math.round((matchedCount / items.length) * 100)}% Match Rate` : "100% Match"}
          </div>
        </div>

        {/* KPI 6: Unmatched / Exceptions */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>Unmatched / Variance</span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-semibold">
              {unmatchedCount} Items
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-amber-700 tracking-tight">
            {formatCurrency(unmatchedAmount)}
          </div>
          <div className="mt-1 text-[11px] text-amber-600 font-medium">
            Includes tax diffs & 1-sided invoices
          </div>
        </div>

        {/* KPI 7: Unclaimed ITC */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-800 font-medium">
            <span>Unclaimed ITC (in 2B)</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-semibold">
              Available
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-blue-700 tracking-tight">
            {formatCurrency(unclaimedItc)}
          </div>
          <div className="mt-1 text-[11px] text-blue-600 font-medium">
            Available to claim in next 3B return
          </div>
        </div>

        {/* KPI 8: Potential Excess ITC */}
        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-red-800 font-medium">
            <span>Potential Excess Claimed</span>
            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[11px] font-semibold">
              Notice Risk
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-red-700 tracking-tight">
            {formatCurrency(potentialExcessItc)}
          </div>
          <div className="mt-1 text-[11px] text-red-600 font-medium">
            Sec 16(2)(aa) audit exposure
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly ITC Comparison */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly ITC Comparison</h2>
              <p className="text-xs text-slate-500">Books vs 2A vs 2B Eligible vs 3B Claimed</p>
            </div>
            <Link
              href="/reports/monthly"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Full Report <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <MonthlyComparisonChart data={monthlyChartData} />
        </div>

        {/* Status Distribution Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Reconciliation Status</h2>
              <p className="text-xs text-slate-500">Invoice Classification</p>
            </div>
            <Link
              href="/reconciliation/books-vs-2b"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <StatusDonutChart data={donutChartData} />
          </div>
        </div>
      </div>

      {/* Critical Exceptions Alert Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">High-Priority Audit Exceptions</h2>
              <p className="text-xs text-slate-500">Invoices requiring immediate action or supplier follow-up</p>
            </div>
          </div>

          <Link
            href="/reports/exceptions"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View Exception Report <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {criticalExceptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No critical exceptions detected. All matched or within tolerance.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {criticalExceptions.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                      item.priority === "CRITICAL"
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {item.priority}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {item.booksSupplier || item.stmtSupplier || "Supplier"}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-xs text-slate-600">
                        {item.booksInvoiceNo || item.stmtInvoiceNo || "No Inv"}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {item.matchStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.actionRequired || item.remarks}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 block">
                    Diff: {formatCurrency(Math.abs(item.diffTotal || 0))}
                  </span>
                  <Link
                    href="/reconciliation/books-vs-2b"
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    Reconcile &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
