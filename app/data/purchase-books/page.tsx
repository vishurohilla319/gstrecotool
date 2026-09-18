import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/gst-utils";
import { Download, UploadCloud, Search, Plus, Filter } from "lucide-react";
import { PurchaseBooksTableClient } from "@/components/PurchaseBooksTableClient";

export default async function PurchaseBooksPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const records = await prisma.purchaseBook.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { invoiceDate: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <span>Inward Register</span>
            <span>•</span>
            <span className="text-slate-500">{records.length} Total Invoices</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Purchase Books / Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal accounting purchase entries from ERP/Tally/SAP for claiming Input Tax Credit
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/export?type=PURCHASE_BOOKS&format=xlsx"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </a>
          <a
            href="/api/export?type=PURCHASE_BOOKS&format=csv"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
          <Link
            href="/import"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Import Excel
          </Link>
        </div>
      </div>

      {/* Interactive Table Client */}
      <PurchaseBooksTableClient initialRecords={records} />
    </div>
  );
}
