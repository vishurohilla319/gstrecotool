import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/gst-utils";
import { History, ShieldAlert, User, Activity } from "lucide-react";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const logs = await prisma.activityLog.findMany({
    where: { organizationId: user.organizationId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
          <span>Compliance & Security</span>
          <span>•</span>
          <span className="text-slate-500">Immutable Audit Trail</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          System Activity & Audit Log
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Complete historical record of logins, uploads, reconciliation executions, and manual adjustments
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Event Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No activity logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px] font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {log.user?.name || "System"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{log.entity}</td>
                  <td className="px-4 py-3 text-slate-700 text-[11px]">{log.details || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
