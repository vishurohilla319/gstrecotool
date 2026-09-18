import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/SettingsClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const [settings, org] = await Promise.all([
    prisma.settings.findUnique({ where: { organizationId: user.organizationId } }),
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Settings & Tolerance Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure reconciliation tolerance thresholds and firm profile details
        </p>
      </div>

      <SettingsClient initialSettings={settings} initialOrg={org} />
    </div>
  );
}
