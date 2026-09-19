import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, requireUser, signSessionToken } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { organizationId } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: "Client / Organization not found" }, { status: 404 });
    }

    // Ensure user has membership or is super_admin
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.userId,
        },
      },
    });

    if (!membership && user.role !== "SUPER_ADMIN") {
      // Add membership if user is an accountant switching or admin
      await prisma.organizationMember.create({
        data: {
          userId: user.userId,
          organizationId: org.id,
          role: "ACCOUNTANT",
        },
      });
    }

    // Update activeOrgId
    await prisma.user.update({
      where: { id: user.userId },
      data: { activeOrgId: org.id },
    });

    // Create new token
    const token = await signSessionToken({
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: org.id,
      organizationName: org.name,
    });

    await logActivity({
      organizationId: org.id,
      userId: user.userId,
      action: "SWITCH_CLIENT",
      entity: "Organization",
      details: `Switched active client workspace to ${org.name}`,
    });

    const response = NextResponse.json({
      success: true,
      organizationId: org.id,
      organizationName: org.name,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/organizations/switch error:", error);
    return NextResponse.json({ error: error.message || "Failed to switch client" }, { status: 500 });
  }
}
