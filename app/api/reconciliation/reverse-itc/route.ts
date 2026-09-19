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
      itemIds,
      booksRecordId,
      statementRecordId,
      action = "REVERSE", // "REVERSE" or "RESTORE"
      reversalReason = "Section 17(5) Blocked Credit",
      reversalAmount,
      remarks,
    } = await req.json();

    const idsToProcess: string[] =
      Array.isArray(itemIds) && itemIds.length > 0
        ? itemIds
        : itemId
        ? [itemId]
        : [];

    if (idsToProcess.length === 0) {
      return NextResponse.json({ error: "Item ID(s) required" }, { status: 400 });
    }

    const existingItems = await prisma.reconciliationItem.findMany({
      where: {
        id: { in: idsToProcess },
        organizationId: user.organizationId,
      },
    });

    if (existingItems.length === 0) {
      return NextResponse.json({ error: "No matching items found" }, { status: 404 });
    }

    const isReversing = action === "REVERSE";
    const amountStr = reversalAmount ? `₹${Number(reversalAmount).toFixed(2)}` : "Full Tax";
    const note = isReversing
      ? `ITC Reversed: ${reversalReason}${idsToProcess.length === 1 ? ` (${amountStr})` : ""}${
          remarks ? ` - ${remarks}` : ""
        }`
      : `ITC Reversal cancelled by ${user.name}`;

    // 1. Update Reconciliation Items
    if (isReversing) {
      await prisma.reconciliationItem.updateMany({
        where: { id: { in: existingItems.map((i) => i.id) } },
        data: {
          matchStatus: "ITC_INELIGIBLE",
          priority: "LOW",
          actionRequired: `Reversed in Books / 3B (${reversalReason})`,
          remarks: note,
        },
      });
    } else {
      for (const it of existingItems) {
        const restoredStatus =
          it.booksRecordId && it.statementRecordId
            ? "EXACT_MATCH"
            : it.booksRecordId
            ? "BOOKS_ONLY"
            : "STATEMENT_ONLY";
        await prisma.reconciliationItem.update({
          where: { id: it.id },
          data: {
            matchStatus: restoredStatus,
            priority: "LOW",
            actionRequired: null,
            remarks: "ITC Restored as eligible",
          },
        });
      }
    }

    // 2. Update Purchase Books if linked
    const booksIds = existingItems
      .map((i) => i.booksRecordId)
      .filter((id): id is string => Boolean(id));
    if (booksRecordId && !booksIds.includes(booksRecordId)) {
      booksIds.push(booksRecordId);
    }
    if (booksIds.length > 0) {
      await prisma.purchaseBook
        .updateMany({
          where: { id: { in: booksIds } },
          data: {
            itcEligible: !isReversing,
            itcIneligible: isReversing,
          },
        })
        .catch((e) => console.warn("Could not update purchaseBook:", e));
    }

    // 3. Update GSTR-2B if linked
    const stmtIds = existingItems
      .map((i) => i.statementRecordId)
      .filter((id): id is string => Boolean(id));
    if (statementRecordId && !stmtIds.includes(statementRecordId)) {
      stmtIds.push(statementRecordId);
    }
    if (stmtIds.length > 0) {
      await prisma.gstr2B
        .updateMany({
          where: { id: { in: stmtIds } },
          data: {
            itcEligible: !isReversing,
            itcIneligible: isReversing,
          },
        })
        .catch((e) => console.warn("Could not update gstr2b:", e));
    }

    // 4. Log Audit Trail
    await logActivity({
      organizationId: user.organizationId,
      userId: user.userId,
      action: isReversing ? "ITC_REVERSED" : "ITC_RESTORED",
      entity: "ReconciliationItem",
      details: `${isReversing ? "Reversed ITC" : "Restored ITC"} for ${
        existingItems.length
      } invoice(s). Reason: ${reversalReason}`,
    });

    return NextResponse.json({
      success: true,
      count: existingItems.length,
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
