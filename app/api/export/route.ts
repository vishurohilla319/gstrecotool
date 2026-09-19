import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { logActivity } from "@/lib/audit";
import { formatDate } from "@/lib/gst-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "FULL_RECONCILIATION";
    const format = (searchParams.get("format") || "xlsx").toLowerCase();
    const orgId = user.organizationId;

    let sheetData: any[] = [];
    let filename = `GST_Report_${reportType}`;

    if (reportType === "FULL_RECONCILIATION") {
      filename = "GST_Reconciliation_Books_vs_2B";
      const items = await prisma.reconciliationItem.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
      });

      sheetData = items.map((i) => ({
        "Match Status": i.matchStatus.replace(/_/g, " "),
        "Priority": i.priority,
        "Books GSTIN": i.booksGstin || "-",
        "Books Supplier": i.booksSupplier || "-",
        "Books Invoice No": i.booksInvoiceNo || "-",
        "Books Invoice Date": formatDate(i.booksDate),
        "Books Taxable": i.booksTaxable ?? "-",
        "Books IGST": i.booksIgst ?? "-",
        "Books CGST": i.booksCgst ?? "-",
        "Books SGST": i.booksSgst ?? "-",
        "2B GSTIN": i.stmtGstin || "-",
        "2B Supplier": i.stmtSupplier || "-",
        "2B Invoice No": i.stmtInvoiceNo || "-",
        "2B Invoice Date": formatDate(i.stmtDate),
        "2B Taxable": i.stmtTaxable ?? "-",
        "2B IGST": i.stmtIgst ?? "-",
        "2B CGST": i.stmtCgst ?? "-",
        "2B SGST": i.stmtSgst ?? "-",
        "Diff Taxable": i.diffTaxable,
        "Diff Total Tax": i.diffTotal,
        "Action Required": i.actionRequired || "-",
        "Remarks": i.remarks || "-",
      }));
    } else if (reportType === "PURCHASE_BOOKS") {
      filename = "Purchase_Register_Books";
      const books = await prisma.purchaseBook.findMany({
        where: { organizationId: orgId },
        orderBy: { invoiceDate: "desc" },
      });
      sheetData = books.map((b) => ({
        "GSTIN": b.gstin,
        "Supplier Name": b.supplierName,
        "Invoice Number": b.invoiceNumber,
        "Invoice Date": formatDate(b.invoiceDate),
        "Month": b.month,
        "FY": b.fy,
        "Taxable Value": b.taxableValue,
        "IGST": b.igst,
        "CGST": b.cgst,
        "SGST": b.sgst,
        "Cess": b.cess,
        "Total Tax": b.totalTax,
        "Invoice Value": b.invoiceValue,
        "POS": b.pos || "-",
        "RCM": b.rcm ? "Yes" : "No",
        "ITC Eligible": b.itcEligible ? "Yes" : "No",
      }));
    } else if (reportType === "GSTR_2B") {
      filename = "GSTR_2B_Statement";
      const gstr2b = await prisma.gstr2B.findMany({
        where: { organizationId: orgId },
        orderBy: { invoiceDate: "desc" },
      });
      sheetData = gstr2b.map((b) => ({
        "GSTIN": b.gstin,
        "Supplier Name": b.supplierName,
        "Invoice Number": b.invoiceNumber,
        "Invoice Date": formatDate(b.invoiceDate),
        "Month": b.month,
        "Taxable Value": b.taxableValue,
        "IGST": b.igst,
        "CGST": b.cgst,
        "SGST": b.sgst,
        "Cess": b.cess,
        "Invoice Value": b.invoiceValue,
        "ITC Availability": b.itcAvailability,
        "RCM": b.rcm ? "Yes" : "No",
      }));
    } else if (reportType === "EXCEPTIONS") {
      filename = "GST_Exception_Report";
      const items = await prisma.reconciliationItem.findMany({
        where: {
          organizationId: orgId,
          matchStatus: { not: "EXACT_MATCH" },
        },
        orderBy: { priority: "asc" },
      });
      sheetData = items.map((i) => ({
        "Priority": i.priority,
        "Issue Type": i.matchStatus.replace(/_/g, " "),
        "Supplier": i.booksSupplier || i.stmtSupplier || "-",
        "GSTIN": i.booksGstin || i.stmtGstin || "-",
        "Invoice Number": i.booksInvoiceNo || i.stmtInvoiceNo || "-",
        "Date": formatDate(i.booksDate || i.stmtDate),
        "Diff Taxable": i.diffTaxable,
        "Diff Tax": i.diffTotal,
        "Action Required": i.actionRequired || "-",
        "Remarks": i.remarks || "-",
      }));
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    await logActivity({
      organizationId: orgId,
      userId: user.userId,
      action: "EXPORT_REPORT",
      entity: reportType,
      details: `Exported ${reportType} report in ${format.toUpperCase()} format (${sheetData.length} records)`,
    });

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new Response(Buffer.from(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: error.message || "Failed to export report" }, { status: 500 });
  }
}
