import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, requireUser, signSessionToken } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireUser();

    // Get all organizations user is a member of, or all if SUPER_ADMIN
    const orgs = await prisma.organization.findMany({
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
        createdAt: true,
      },
    });

    return NextResponse.json({ organizations: orgs, activeOrgId: user.organizationId });
  } catch (error: any) {
    console.error("GET /api/organizations error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { name, gstin, address, email, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Client / Company name is required" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanGstin = gstin ? gstin.trim().toUpperCase() : null;
    const cleanPan = cleanGstin && cleanGstin.length >= 12 ? cleanGstin.substring(2, 12) : null;

    // Create the organization
    const org = await prisma.organization.create({
      data: {
        name: cleanName,
        gstin: cleanGstin,
        pan: cleanPan,
        address: address?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        currentFy: "2026-27",
        settings: {
          create: {
            taxableTolerance: 1.0,
            igstTolerance: 1.0,
            cgstTolerance: 1.0,
            sgstTolerance: 1.0,
            dateToleranceDays: 0,
            defaultFy: "2026-27",
          },
        },
        members: {
          create: {
            userId: user.userId,
            role: "ADMIN",
          },
        },
      },
    });

    // Update activeOrgId on user
    await prisma.user.update({
      where: { id: user.userId },
      data: { activeOrgId: org.id },
    });

    // Generate new session token pointing to the newly created client
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
      action: "CREATE",
      entity: "Organization",
      details: `Created new client / organization: ${org.name} (${cleanGstin || "No GSTIN"})`,
    });

    const response = NextResponse.json({
      success: true,
      organization: org,
      message: `Switched to client: ${org.name}`,
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
    console.error("POST /api/organizations error:", error);
    return NextResponse.json({ error: error.message || "Failed to create client" }, { status: 500 });
  }
}
