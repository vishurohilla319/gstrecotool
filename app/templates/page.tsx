import React from "react";
import { Download, FileSpreadsheet, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function TemplatesPage() {
  const templates = [
    {
      id: "PURCHASE_BOOKS",
      title: "Purchase Books / Register Template",
      desc: "Standard inward register format with Supplier GSTIN, Invoice Number, Invoice Date, Taxable Value, IGST, CGST, SGST, Cess, and RCM flags.",
      ext: ".xlsx",
      badge: "Standard Accounting Format",
    },
    {
      id: "GSTR_2B",
      title: "GSTR-2B Statement Template",
      desc: "Static monthly auto-drafted ITC statement matching GST Portal structure with ITC availability flags and RCM status.",
      ext: ".xlsx",
      badge: "GST Portal Format",
    },
    {
      id: "GSTR_2A",
      title: "GSTR-2A Dynamic Register Template",
      desc: "Dynamic live register format including document types (INV, CRN, DBN) and amendment status fields.",
      ext: ".xlsx",
      badge: "Dynamic View",
    },
    {
      id: "GSTR_3B",
      title: "GSTR-3B Monthly Return Template",
      desc: "Monthly return summary for recording IGST, CGST, SGST credit availed, reversed, and net ITC claimed under Table 4.",
      ext: ".xlsx",
      badge: "Monthly Return",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Excel & CSV Reconciliation Templates
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Download standardized Excel templates pre-configured with headers and sample records to ensure 100% error-free imports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {t.badge}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-slate-400">Format: {t.ext}</span>
              <a
                href={`/api/templates/download?type=${t.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download Template
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Ready to import your populated files?</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Use the 6-step Import Wizard to automatically map columns and validate GSTINs
          </p>
        </div>
        <Link
          href="/import"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          Open Import Wizard <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
