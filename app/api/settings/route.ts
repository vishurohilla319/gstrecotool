import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [settings, org] = await Promise.all([
      prisma.settings.findUnique({ where: { organizationId: user.organizationId } }),
      prisma.organization.findUnique({ where: { id: user.organizationId } }),
    ]);

    return NextResponse.json({ settings, org });
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

    if (user.role === "VIEWER") {
      return NextResponse.json({ error: "Viewers cannot change settings" }, { status: 403 });
    }

    const {
      taxableTolerance,
      igstTolerance,
      cgstTolerance,
      sgstTolerance,
      dateToleranceDays,
      orgName,
      gstin,
      pan,
      address,
      phone,
    } = await req.json();

    const [updatedSettings, updatedOrg] = await prisma.$transaction([
      prisma.settings.upsert({
        where: { organizationId: user.organizationId },
        update: {
          taxableTolerance: Number(taxableTolerance) || 1.0,
          igstTolerance: Number(igstTolerance) || 1.0,
          cgstTolerance: Number(cgstTolerance) || 1.0,
          sgstTolerance: Number(sgstTolerance) || 1.0,
          dateToleranceDays: Number(dateToleranceDays) || 0,
        },
        create: {
          organizationId: user.organizationId,
          taxableTolerance: Number(taxableTolerance) || 1.0,
          igstTolerance: Number(igstTolerance) || 1.0,
          cgstTolerance: Number(cgstTolerance) || 1.0,
          sgstTolerance: Number(sgstTolerance) || 1.0,
          dateToleranceDays: Number(dateToleranceDays) || 0,
        },
      }),
      prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          name: orgName ? orgName.trim() : undefined,
          gstin: gstin ? gstin.trim().toUpperCase() : undefined,
          pan: pan ? pan.trim().toUpperCase() : undefined,
          address: address ? address.trim() : undefined,
          phone: phone ? phone.trim() : undefined,
        },
      }),
    ]);

    await logActivity({
      organizationId: user.organizationId,
      userId: user.userId,
      action: "UPDATE_SETTINGS",
      entity: "Settings",
      details: `Updated tolerances (Tax: ₹${taxableTolerance}, Date: ${dateToleranceDays} days) and org profile`,
    });

    return NextResponse.json({ success: true, settings: updatedSettings, org: updatedOrg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
