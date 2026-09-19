import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, itcIneligible, reason } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const existing = await prisma.purchaseBook.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const updated = await prisma.purchaseBook.update({
      where: { id },
      data: {
        itcIneligible: Boolean(itcIneligible),
        itcEligible: !itcIneligible,
      },
    });

    await logActivity({
      organizationId: user.organizationId,
      userId: user.userId,
      action: itcIneligible ? "ITC_REVERSED" : "ITC_RESTORED",
      entity: "PurchaseBook",
      details: `Invoice ${existing.invoiceNumber} ITC ${itcIneligible ? "Reversed" : "Restored"}. Reason: ${reason || "User action"}`,
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to toggle ITC" }, { status: 500 });
  }
}
