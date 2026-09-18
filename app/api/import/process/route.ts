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
      return NextResponse.json({ error: "Viewers cannot import data" }, { status: 403 });
    }

    const { fileType, fileName, validRows, errors } = await req.json();

    if (!fileType || !Array.isArray(validRows)) {
      return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });
    }

    const orgId = user.organizationId;

    // Create import batch
    const batch = await prisma.importBatch.create({
      data: {
        organizationId: orgId,
        fileType,
        fileName: fileName || "uploaded_file.xlsx",
        totalRows: validRows.length + (errors?.length || 0),
        validRows: validRows.length,
        errorRows: errors?.length || 0,
        uploadedByUserId: user.userId,
      },
    });

    // Save errors if any
    if (errors && errors.length > 0) {
      for (const err of errors.slice(0, 500)) {
        await prisma.importError.create({
          data: {
            importId: batch.id,
            rowNumber: err.rowNumber,
            rawData: JSON.stringify(err.rowData || {}),
            errorMessage: err.errorMessage,
            errorColumn: err.column || null,
          },
        });
      }
    }

    // Insert records depending on fileType
    if (fileType === "PURCHASE_BOOKS") {
      for (const row of validRows) {
        await prisma.purchaseBook.create({
          data: {
            organizationId: orgId,
            gstin: row.gstin,
            supplierName: row.supplierName,
            invoiceNumber: row.invoiceNumber,
            normalizedInvoiceNumber: row.normalizedInvoiceNumber,
            invoiceDate: new Date(row.invoiceDate),
            fy: row.fy,
            month: row.month,
            taxableValue: row.taxableValue,
            igst: row.igst || 0,
            cgst: row.cgst || 0,
            sgst: row.sgst || 0,
            cess: row.cess || 0,
            totalTax: row.totalTax || 0,
            invoiceValue: row.invoiceValue,
            pos: row.pos,
            rcm: Boolean(row.rcm),
            itcEligible: Boolean(row.itcEligible),
            itcIneligible: Boolean(row.itcIneligible),
            uniqueKey: row.uniqueKey,
            importId: batch.id,
          },
        });
      }
    } else if (fileType === "GSTR_2A") {
      for (const row of validRows) {
        await prisma.gstr2A.create({
          data: {
            organizationId: orgId,
            gstin: row.gstin,
            supplierName: row.supplierName,
            invoiceNumber: row.invoiceNumber,
            normalizedInvoiceNumber: row.normalizedInvoiceNumber,
            invoiceDate: new Date(row.invoiceDate),
            fy: row.fy,
            month: row.month,
            taxableValue: row.taxableValue,
            igst: row.igst || 0,
            cgst: row.cgst || 0,
            sgst: row.sgst || 0,
            cess: row.cess || 0,
            invoiceValue: row.invoiceValue,
            pos: row.pos,
            rcm: Boolean(row.rcm),
            docType: row.docType || "INV",
            amendmentStatus: row.amendmentStatus || null,
            uniqueKey: row.uniqueKey,
            importId: batch.id,
          },
        });
      }
    } else if (fileType === "GSTR_2B") {
      for (const row of validRows) {
        await prisma.gstr2B.create({
          data: {
            organizationId: orgId,
            gstin: row.gstin,
            supplierName: row.supplierName,
            invoiceNumber: row.invoiceNumber,
            normalizedInvoiceNumber: row.normalizedInvoiceNumber,
            invoiceDate: new Date(row.invoiceDate),
            fy: row.fy,
            month: row.month,
            taxableValue: row.taxableValue,
            igst: row.igst || 0,
            cgst: row.cgst || 0,
            sgst: row.sgst || 0,
            cess: row.cess || 0,
            invoiceValue: row.invoiceValue,
            itcAvailability: row.itcAvailability || "Y",
            itcEligible: Boolean(row.itcEligible),
            itcIneligible: Boolean(row.itcIneligible),
            docType: row.docType || "INV",
            rcm: Boolean(row.rcm),
            amendmentStatus: row.amendmentStatus || null,
            uniqueKey: row.uniqueKey,
            importId: batch.id,
          },
        });
      }
    } else if (fileType === "GSTR_3B") {
      for (const row of validRows) {
        const fy = "2026-27";
        await prisma.gstr3B.upsert({
          where: {
            organizationId_fy_month: {
              organizationId: orgId,
              fy,
              month: row.month,
            },
          },
          update: {
            igstClaimed: row.igstClaimed || 0,
            cgstClaimed: row.cgstClaimed || 0,
            sgstClaimed: row.sgstClaimed || 0,
            cessClaimed: row.cessClaimed || 0,
            totalClaimed: row.totalClaimed || 0,
            itcReversed: row.itcReversed || 0,
            netItc: row.netItc || 0,
            remarks: row.remarks || null,
          },
          create: {
            organizationId: orgId,
            fy,
            month: row.month,
            igstClaimed: row.igstClaimed || 0,
            cgstClaimed: row.cgstClaimed || 0,
            sgstClaimed: row.sgstClaimed || 0,
            cessClaimed: row.cessClaimed || 0,
            totalClaimed: row.totalClaimed || 0,
            itcReversed: row.itcReversed || 0,
            netItc: row.netItc || 0,
            remarks: row.remarks || null,
          },
        });
      }
    }

    await logActivity({
      organizationId: orgId,
      userId: user.userId,
      action: "IMPORT_DATA",
      entity: fileType,
      details: `Imported ${validRows.length} valid rows from '${fileName}' (${errors?.length || 0} errors)`,
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      importedCount: validRows.length,
      errorCount: errors?.length || 0,
    });
  } catch (error: any) {
    console.error("Import processing error:", error);
    return NextResponse.json({ error: error.message || "Failed to process import" }, { status: 500 });
  }
}
