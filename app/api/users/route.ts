import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId },
      include: { user: true },
      orderBy: { joinedAt: "desc" },
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

    return NextResponse.json({ members: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only administrators can invite users" }, { status: 403 });
    }

    const { name, email, role, password } = await req.json();

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    let targetUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!targetUser) {
      const passwordHash = await hashPassword(password);
      targetUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
          role: role as any,
          activeOrgId: user.organizationId,
        },
      });
    }

    // Link membership
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId: targetUser.id,
        },
      },
      update: { role: role as any },
      create: {
        organizationId: user.organizationId,
        userId: targetUser.id,
        role: role as any,
      },
    });

    await logActivity({
      organizationId: user.organizationId,
      userId: user.userId,
      action: "INVITE_USER",
      entity: "User",
      details: `Added ${cleanEmail} as ${role}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
