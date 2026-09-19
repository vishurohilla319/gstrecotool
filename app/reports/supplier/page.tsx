import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SupplierReportClient } from "@/components/SupplierReportClient";

export default async function SupplierReportPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const orgId = user.organizationId;

  // Fetch all items from latest run + books and 2B
  const [items, books, gstr2b] = await Promise.all([
    prisma.reconciliationItem.findMany({ where: { organizationId: orgId } }),
    prisma.purchaseBook.findMany({ where: { organizationId: orgId } }),
    prisma.gstr2B.findMany({ where: { organizationId: orgId } }),
  ]);

  // Aggregate by GSTIN
  const supplierMap = new Map<string, any>();

  // From books
  for (const b of books) {
    const key = b.gstin && b.gstin !== "URD" ? b.gstin : `URD_${b.supplierName || "Unknown"}`;
    if (!supplierMap.has(key)) {
      supplierMap.set(key, {
        gstin: b.gstin && b.gstin !== "URD" ? b.gstin : "URD",
        name: b.supplierName,
        booksCount: 0,
        stmtCount: 0,
        booksTax: 0,
        stmtTax: 0,
        diffTax: 0,
        matchedCount: 0,
        mismatchCount: 0,
        booksOnlyCount: 0,
        stmtOnlyCount: 0,
        invoices: [],
      });
    }
    const sup = supplierMap.get(key)!;
    sup.booksCount++;
    sup.booksTax += (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0);
  }

  // From 2B
  for (const s of gstr2b) {
    if (!supplierMap.has(s.gstin)) {
      supplierMap.set(s.gstin, {
        gstin: s.gstin,
        name: s.supplierName,
        booksCount: 0,
        stmtCount: 0,
        booksTax: 0,
        stmtTax: 0,
        diffTax: 0,
        matchedCount: 0,
        mismatchCount: 0,
        booksOnlyCount: 0,
        stmtOnlyCount: 0,
        invoices: [],
      });
    }
    const sup = supplierMap.get(s.gstin)!;
    sup.stmtCount++;
    sup.stmtTax += (s.igst || 0) + (s.cgst || 0) + (s.sgst || 0);
  }

  // Add items into supplier aggregates
  for (const item of items) {
    const gstin = item.booksGstin || item.stmtGstin;
    if (gstin && supplierMap.has(gstin)) {
      const sup = supplierMap.get(gstin)!;
      sup.invoices.push(item);
      if (item.matchStatus === "EXACT_MATCH") sup.matchedCount++;
      else if (item.matchStatus === "BOOKS_ONLY") sup.booksOnlyCount++;
      else if (item.matchStatus === "STATEMENT_ONLY") sup.stmtOnlyCount++;
      else sup.mismatchCount++;
    }
  }

  // Compute total diff
  for (const sup of Array.from(supplierMap.values())) {
    sup.diffTax = Math.round((sup.booksTax - sup.stmtTax) * 100) / 100;
  }

  const suppliers = Array.from(supplierMap.values());

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
          <span>Supplier Reconciliation</span>
          <span>•</span>
          <span className="text-slate-500">{suppliers.length} Vendors</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Supplier-wise Reconciliation Report
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Consolidated supplier-level ITC differences with drill-down into specific tax invoices
        </p>
      </div>

      <SupplierReportClient suppliers={suppliers} />
    </div>
  );
}
