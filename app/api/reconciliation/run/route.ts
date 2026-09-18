import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcileBooksVs2B, DEFAULT_TOLERANCES } from "@/lib/reconciliation-engine";
import { logActivity } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.organizationId;
    const body = await req.json().catch(() => ({}));
    const fy = body.fy || "2026-27";
    const month = body.month || null;

    // Fetch tolerances
    const settings = await prisma.settings.findUnique({
      where: { organizationId: orgId },
    });

    const tolerances = settings
      ? {
          taxableTolerance: settings.taxableTolerance,
          igstTolerance: settings.igstTolerance,
          cgstTolerance: settings.cgstTolerance,
          sgstTolerance: settings.sgstTolerance,
          dateToleranceDays: settings.dateToleranceDays,
        }
      : DEFAULT_TOLERANCES;

    // Fetch records
    const booksWhere: any = { organizationId: orgId };
    const stmtWhere: any = { organizationId: orgId };

    if (fy) {
      booksWhere.fy = fy;
      stmtWhere.fy = fy;
    }
    if (month && month !== "All") {
      booksWhere.month = month;
      stmtWhere.month = month;
    }

    const [books, gstr2b] = await Promise.all([
      prisma.purchaseBook.findMany({ where: booksWhere }),
      prisma.gstr2B.findMany({ where: stmtWhere }),
    ]);

    const result = reconcileBooksVs2B(books, gstr2b, tolerances);

    // Save Run and items
    const run = await prisma.reconciliationRun.create({
      data: {
        organizationId: orgId,
        runType: "BOOKS_VS_2B",
        fy,
        month,
        status: "COMPLETED",
        totalRecords: result.summary.totalRecords,
        matchedCount: result.summary.matchedCount,
        mismatchCount: result.summary.mismatchCount,
        booksOnlyCount: result.summary.booksOnlyCount,
        statementOnlyCount: result.summary.statementOnlyCount,
        runByUserId: user.userId,
      },
    });

    // Bulk insert items
    for (const item of result.items) {
      await prisma.reconciliationItem.create({
        data: {
          runId: run.id,
          organizationId: orgId,
          matchStatus: item.matchStatus,
          booksRecordId: item.booksRecordId || null,
          statementRecordId: item.statementRecordId || null,
          booksGstin: item.booksGstin || null,
          booksSupplier: item.booksSupplier || null,
          booksInvoiceNo: item.booksInvoiceNo || null,
          booksDate: item.booksDate || null,
          booksTaxable: item.booksTaxable || null,
          booksIgst: item.booksIgst || null,
          booksCgst: item.booksCgst || null,
          booksSgst: item.booksSgst || null,
          booksCess: item.booksCess || null,
          stmtGstin: item.stmtGstin || null,
          stmtSupplier: item.stmtSupplier || null,
          stmtInvoiceNo: item.stmtInvoiceNo || null,
          stmtDate: item.stmtDate || null,
          stmtTaxable: item.stmtTaxable || null,
          stmtIgst: item.stmtIgst || null,
          stmtCgst: item.stmtCgst || null,
          stmtSgst: item.stmtSgst || null,
          stmtCess: item.stmtCess || null,
          diffTaxable: item.diffTaxable,
          diffIgst: item.diffIgst,
          diffCgst: item.diffCgst,
          diffSgst: item.diffSgst,
          diffTotal: item.diffTotal,
          priority: item.priority,
          actionRequired: item.actionRequired || null,
          remarks: item.remarks || null,
        },
      });
    }

    await logActivity({
      organizationId: orgId,
      userId: user.userId,
      action: "RUN_RECONCILIATION",
      entity: "ReconciliationRun",
      details: `Reconciliation executed for FY ${fy}: ${result.summary.matchedCount} matched, ${result.summary.mismatchCount} mismatches, ${result.summary.booksOnlyCount} books-only, ${result.summary.statementOnlyCount} 2B-only`,
    });

    return NextResponse.json({
      success: true,
      runId: run.id,
      summary: result.summary,
    });
  } catch (error: any) {
    console.error("Reconciliation run error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute reconciliation" }, { status: 500 });
  }
}
