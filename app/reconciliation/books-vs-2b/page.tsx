import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BooksVs2BClient } from "@/components/BooksVs2BClient";

export default async function BooksVs2BPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const orgId = user.organizationId;

  const [settings, latestRun] = await Promise.all([
    prisma.settings.findUnique({ where: { organizationId: orgId } }),
    prisma.reconciliationRun.findFirst({
      where: { organizationId: orgId, runType: "BOOKS_VS_2B" },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const items = latestRun?.items || [];
  const summary = latestRun || {
    totalRecords: 0,
    matchedCount: 0,
    mismatchCount: 0,
    booksOnlyCount: 0,
    statementOnlyCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
          <span>Core Reconciliation</span>
          <span>•</span>
          <span className="text-slate-500">Section 16(2)(aa) Matching</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Purchase Books vs GSTR-2B Reconciliation
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Side-by-side comparison with normalized invoice keys, precision tolerances, and audit trail
        </p>
      </div>

      <BooksVs2BClient
        initialItems={items}
        summary={summary}
        tolerances={settings}
      />
    </div>
  );
}
