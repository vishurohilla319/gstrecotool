"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Layers,
  FileCheck,
  Building2,
  Calendar,
  AlertTriangle,
  UploadCloud,
  FileDown,
  Users,
  Settings,
  History,
  LogOut,
  ChevronDown,
  Database,
  Sparkles,
} from "lucide-react";
import { getMonthsForFinancialYear } from "@/lib/gst-utils";

export function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [recoOpen, setRecoOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight block">
            GST Reconcile <span className="text-blue-400">Pro</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">
            Enterprise Tax Suite
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive("/dashboard")
              ? "bg-blue-600 text-white shadow-sm"
              : "hover:bg-slate-800 hover:text-white text-slate-300"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>

        {/* GST Reconciliation Section */}
        <div className="pt-2">
          <button
            onClick={() => setRecoOpen(!recoOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white"
          >
            <span>GST Reconciliation</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${recoOpen ? "rotate-180" : ""}`} />
          </button>
          {recoOpen && (
            <div className="mt-1 pl-2 space-y-1">
              <Link
                href="/data/purchase-books"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/data/purchase-books")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                Purchase Books
              </Link>
              <Link
                href="/data/gstr-2a"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/data/gstr-2a")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                GSTR-2A Register
              </Link>
              <Link
                href="/data/gstr-2b"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/data/gstr-2b")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                GSTR-2B Statement
              </Link>
              <Link
                href="/data/gstr-3b"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/data/gstr-3b")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                GSTR-3B Returns
              </Link>
              <Link
                href="/reconciliation/books-vs-2b"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/reconciliation/books-vs-2b")
                    ? "bg-blue-600 text-white font-semibold"
                    : "hover:bg-slate-800 hover:text-white text-slate-300"
                }`}
              >
                Books vs 2B (Primary)
              </Link>
              <Link
                href="/reconciliation/2a-vs-2b"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/reconciliation/2a-vs-2b")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                2A vs 2B Variance
              </Link>
              <Link
                href="/reconciliation/2b-vs-3b"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/reconciliation/2b-vs-3b")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                2B vs 3B ITC Compare
              </Link>
            </div>
          )}
        </div>

        {/* Reports Section */}
        <div className="pt-2">
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white"
          >
            <span>Audit Reports</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${reportsOpen ? "rotate-180" : ""}`} />
          </button>
          {reportsOpen && (
            <div className="mt-1 pl-2 space-y-1">
              <Link
                href="/reports/supplier"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/reports/supplier")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Supplier Report
              </Link>
              <Link
                href="/reports/monthly"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/reports/monthly")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Month-wise Report
              </Link>
              <Link
                href="/reports/exceptions"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/reports/exceptions")
                    ? "bg-red-950/50 text-red-300 font-semibold border-l-2 border-red-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Exception Report
              </Link>
              <Link
                href="/reports/itc"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive("/reports/itc")
                    ? "bg-blue-600/30 text-blue-300 font-semibold border-l-2 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                ITC Eligibility Report
              </Link>
            </div>
          )}
        </div>

        {/* Tools & Settings */}
        <div className="pt-3 border-t border-slate-800 space-y-1">
          <Link
            href="/import"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/import")
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-800 hover:text-white text-slate-300"
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            Data Import Wizard
          </Link>
          <Link
            href="/templates"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/templates")
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-800 hover:text-white text-slate-300"
            }`}
          >
            <FileDown className="w-4 h-4" />
            Excel Templates
          </Link>
          <Link
            href="/users"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/users")
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-800 hover:text-white text-slate-300"
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/settings")
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-800 hover:text-white text-slate-300"
            }`}
          >
            <Settings className="w-4 h-4" />
            Tolerances & Settings
          </Link>
          <Link
            href="/activity"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/activity")
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-800 hover:text-white text-slate-300"
            }`}
          >
            <History className="w-4 h-4" />
            Activity & Audit Log
          </Link>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-semibold text-xs shrink-0">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || "Accountant"}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded font-mono font-medium">
                  {user?.role || "ACCOUNTANT"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            title="Sign Out"
            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Navbar({ user, org }: { user: any; org?: any }) {
  const router = useRouter();
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [selectedFy, setSelectedFy] = useState(org?.currentFy || "2026-27");
  const [selectedPeriod, setSelectedPeriod] = useState("All");

  const months = getMonthsForFinancialYear(selectedFy);

  const handleSeedDemo = async () => {
    if (!confirm("Load Indian GST sample dataset (Purchase Books, 2A, 2B, 3B) for instant reconciliation testing?")) {
      return;
    }
    setLoadingSeed(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Demo GST data loaded successfully! Refreshing dashboard...");
        router.refresh();
      } else {
        alert("Failed to load demo data: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoadingSeed(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-20 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-100 py-1 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-900">{org?.name || "Apex Enterprises Pvt Ltd"}</span>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-slate-500">{org?.gstin || "27AABCA1234C1Z5"}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">FY:</span>
          <select
            value={selectedFy}
            onChange={(e) => {
              setSelectedFy(e.target.value);
              setSelectedPeriod("All");
            }}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="2026-27">2026-27</option>
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Months (Apr - Mar)</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Cloud Synced badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Synced</span>
        </div>

        {/* 1-Click Demo Seed Button */}
        <button
          onClick={handleSeedDemo}
          disabled={loadingSeed}
          className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loadingSeed ? "Loading..." : "Load Demo Dataset"}
        </button>

        {/* User initials */}
        <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs flex items-center justify-center">
          {user?.name ? user.name[0].toUpperCase() : "U"}
        </div>
      </div>
    </header>
  );
}
