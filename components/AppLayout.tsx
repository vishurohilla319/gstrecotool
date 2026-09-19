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

  const [org, organizations] = await Promise.all([
    user.organizationId
      ? prisma.organization.findUnique({ where: { id: user.organizationId } })
      : null,
    prisma.organization.findMany({
      where:
        user.role === "SUPER_ADMIN"
          ? {}
          : {
              OR: [
                { members: { some: { userId: user.userId } } },
                { id: user.organizationId },
              ],
            },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        gstin: true,
        pan: true,
        currentFy: true,
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={user} />
      <div className="flex-1 pl-64 flex flex-col min-w-0">
        <Navbar user={user} org={org} organizations={organizations} />
        <main className="flex-1 pt-16 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
