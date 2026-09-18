import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExceptionsClient } from "@/components/ExceptionsClient";

export default async function ExceptionReportPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const items = await prisma.reconciliationItem.findMany({
    where: {
      organizationId: user.organizationId,
      matchStatus: { not: "EXACT_MATCH" },
    },
    orderBy: [
      { priority: "asc" },
      { diffTotal: "desc" },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
          <span>Audit Exception Management</span>
          <span>•</span>
          <span className="text-slate-500">{items.length} Actionable Items</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          GST Exception & Notice Risk Report
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Problematic invoices prioritized by financial exposure (Books-only, 2B-only, Tax mismatches, Ineligible ITC)
        </p>
      </div>

      <ExceptionsClient initialItems={items} />
    </div>
  );
}
