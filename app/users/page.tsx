import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "@/components/UsersClient";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: user.organizationId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const formatted = members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    mobile: m.user.mobile,
    role: m.role,
    joinedAt: m.joinedAt,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          User & Role-Based Access Control
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Define granular permissions for Admins, Accountants, and Audit Viewers
        </p>
      </div>

      <UsersClient initialMembers={formatted} />
    </div>
  );
}
