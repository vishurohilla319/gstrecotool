import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar, Navbar } from "./Navbar";

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const org = user.organizationId
    ? await prisma.organization.findUnique({ where: { id: user.organizationId } })
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={user} />
      <div className="flex-1 pl-64 flex flex-col min-w-0">
        <Navbar user={user} org={org} />
        <main className="flex-1 pt-16 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
