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

    if (user.role === "VIEWER") {
      return NextResponse.json({ error: "Viewers cannot modify reconciliation data" }, { status: 403 });
    }

    const { itemId, booksRecordId, statementRecordId, reason } = await req.json();

    if (!itemId || !reason) {
      return NextResponse.json({ error: "Item ID and matching reason are required" }, { status: 400 });
    }

    const existingItem = await prisma.reconciliationItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem || existingItem.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const originalStatus = existingItem.matchStatus;

    // Update item to MANUAL_MATCHED
    const updated = await prisma.reconciliationItem.update({
      where: { id: itemId },
      data: {
        matchStatus: "MANUAL_MATCHED",
        priority: "LOW",
        actionRequired: null,
        remarks: `Manually matched by ${user.name}: ${reason}`,
      },
    });

    // Record in manual_matches
    await prisma.manualMatch.create({
      data: {
        organizationId: user.organizationId,
        booksRecordId: booksRecordId || existingItem.booksRecordId || "",
        statementRecordId: statementRecordId || existingItem.statementRecordId || "",
        originalStatus,
        newStatus: "MANUAL_MATCHED",
        reason,
        matchedByUserId: user.userId,
      },
    });

    await logActivity({
      organizationId: user.organizationId,
      userId: user.userId,
      action: "MANUAL_MATCH",
      entity: "ReconciliationItem",
      details: `Invoice manually matched (Original: ${originalStatus}). Reason: ${reason}`,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error("Manual match error:", error);
    return NextResponse.json({ error: error.message || "Failed to manually match" }, { status: 500 });
  }
}
