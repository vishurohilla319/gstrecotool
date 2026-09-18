import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, hashPassword, signSessionToken } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { fullName, firmName, email, mobile, password } = await req.json();

    if (!fullName || !firmName || !email || !password) {
      return NextResponse.json(
        { error: "Full Name, Firm Name, Email, and Password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create Org, User, Member and Default Settings in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: firmName.trim(),
          currentFy: "2026-27",
        },
      });

      const user = await tx.user.create({
        data: {
          name: fullName.trim(),
          email: cleanEmail,
          mobile: mobile ? mobile.trim() : null,
          passwordHash,
          role: "ADMIN", // Firm creator is ADMIN
          isVerified: true,
          activeOrgId: org.id,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "ADMIN",
        },
      });

      await tx.settings.create({
        data: {
          organizationId: org.id,
          taxableTolerance: 1.0,
          igstTolerance: 1.0,
          cgstTolerance: 1.0,
          sgstTolerance: 1.0,
          dateToleranceDays: 0,
          defaultFy: "2026-27",
        },
      });

      return { user, org };
    });

    await logActivity({
      organizationId: result.org.id,
      userId: result.user.id,
      action: "REGISTER",
      entity: "User",
      details: `New firm workspace '${firmName}' and admin account '${cleanEmail}' created`,
    });

    const token = await signSessionToken({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      organizationId: result.org.id,
      organizationName: result.org.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.org.id,
        organizationName: result.org.name,
      },
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete registration" },
      { status: 500 }
    );
  }
}
