"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Building, ShieldCheck, Database, CheckCircle2, Save } from "lucide-react";

export function SettingsClient({ initialSettings, initialOrg }: { initialSettings: any; initialOrg: any }) {
  const router = useRouter();

  // Tolerances
  const [taxableTolerance, setTaxableTolerance] = useState(initialSettings?.taxableTolerance ?? 1.0);
  const [igstTolerance, setIgstTolerance] = useState(initialSettings?.igstTolerance ?? 1.0);
  const [cgstTolerance, setCgstTolerance] = useState(initialSettings?.cgstTolerance ?? 1.0);
  const [sgstTolerance, setSgstTolerance] = useState(initialSettings?.sgstTolerance ?? 1.0);
  const [dateToleranceDays, setDateToleranceDays] = useState(initialSettings?.dateToleranceDays ?? 0);

  // Organization info
  const [orgName, setOrgName] = useState(initialOrg?.name || "");
  const [gstin, setGstin] = useState(initialOrg?.gstin || "");
  const [pan, setPan] = useState(initialOrg?.pan || "");
  const [address, setAddress] = useState(initialOrg?.address || "");
  const [phone, setPhone] = useState(initialOrg?.phone || "");

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxableTolerance,
          igstTolerance,
          cgstTolerance,
          sgstTolerance,
          dateToleranceDays,
          orgName,
          gstin,
          pan,
          address,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings and matching tolerances saved successfully!</span>
        </div>
      )}

      {/* Matching Tolerances Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Reconciliation Precision Tolerances</h2>
            <p className="text-xs text-slate-500">
              Invoices with minor rounding differences within these bounds will be marked as Exact Match
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Taxable Value Tolerance (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={taxableTolerance}
              onChange={(e) => setTaxableTolerance(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Default: ₹1.00 (Standard rounding)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              IGST Tolerance (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={igstTolerance}
              onChange={(e) => setIgstTolerance(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Integrated Tax variance threshold</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              CGST / SGST Tolerance (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={cgstTolerance}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setCgstTolerance(val);
                setSgstTolerance(val);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Central & State tax variance threshold</p>
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Invoice Date Tolerance (Days)
          </label>
          <div className="max-w-xs">
            <select
              value={dateToleranceDays}
              onChange={(e) => setDateToleranceDays(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500"
            >
              <option value="0">0 Days (Exact date match required)</option>
              <option value="3">3 Days (Minor date discrepancies)</option>
              <option value="7">7 Days (Within same week)</option>
              <option value="30">30 Days (Within same month)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Organization Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Organization & Tax Profile</h2>
            <p className="text-xs text-slate-500">Legal entity particulars for reporting headers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Company / Firm Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Company GSTIN
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="27AABCA1234C1Z5"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Permanent Account Number (PAN)
            </label>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value)}
              placeholder="AABCA1234C"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Registered Business Address
          </label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Database Provider Info */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">Cloud PostgreSQL Database Cluster</h3>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict multi-tenant organization isolation enabled with Prisma ORM
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving Changes..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
