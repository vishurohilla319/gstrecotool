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
      return NextResponse.json(
        { error: "Viewers cannot modify reconciliation data" },
        { status: 403 }
      );
    }

    const {
      itemId,
      booksRecordId,
      statementRecordId,
      action = "REVERSE", // "REVERSE" or "RESTORE"
      reversalReason = "Section 17(5) Blocked Credit",
      reversalAmount,
      remarks,
    } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const existingItem = await prisma.reconciliationItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem || existingItem.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const isReversing = action === "REVERSE";
    const amountStr = reversalAmount ? `₹${Number(reversalAmount).toFixed(2)}` : "Full Tax";
    const note = isReversing
      ? `ITC Reversed: ${reversalReason} (${amountStr})${remarks ? ` - ${remarks}` : ""}`
      : `ITC Reversal cancelled by ${user.name}`;

    // 1. Update Reconciliation Item
    const updatedItem = await prisma.reconciliationItem.update({
      where: { id: itemId },
      data: {
        matchStatus: isReversing ? "ITC_INELIGIBLE" : "EXACT_MATCH",
        priority: isReversing ? "LOW" : "LOW",
        actionRequired: isReversing ? `Reversed in Books / 3B (${reversalReason})` : null,
        remarks: note,
      },
    });

    // 2. Update Purchase Book if linked
    const targetBooksId = booksRecordId || existingItem.booksRecordId;
    if (targetBooksId) {
      await prisma.purchaseBook.update({
        where: { id: targetBooksId },
        data: {
          itcEligible: !isReversing,
          itcIneligible: isReversing,
        },
      }).catch((e) => console.warn("Could not update purchaseBook:", e));
    }

    // 3. Update GSTR-2B if linked
    const targetStmtId = statementRecordId || existingItem.statementRecordId;
    if (targetStmtId) {
      await prisma.gstr2B.update({
        where: { id: targetStmtId },
        data: {
          itcEligible: !isReversing,
          itcIneligible: isReversing,
        },
      }).catch((e) => console.warn("Could not update gstr2b:", e));
    }

    // 4. Log Audit Trail
    await logActivity({
      organizationId: user.organizationId,
      userId: user.userId,
      action: isReversing ? "ITC_REVERSED" : "ITC_RESTORED",
      entity: "ReconciliationItem",
      details: `${isReversing ? "Reversed ITC" : "Restored ITC"} for Invoice ${
        existingItem.booksInvoiceNo || existingItem.stmtInvoiceNo || itemId
      }. Reason: ${reversalReason}`,
    });

    return NextResponse.json({
      success: true,
      item: updatedItem,
      action: isReversing ? "REVERSED" : "RESTORED",
    });
  } catch (error: any) {
    console.error("Reverse ITC error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update ITC reversal status" },
      { status: 500 }
    );
  }
}
