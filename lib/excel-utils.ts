import * as XLSX from "xlsx";
import { isValidGstin, normalizeInvoiceNumber, parseDateInput } from "./gst-utils";

export interface ColumnMappingDefinition {
  field: string;
  label: string;
  required: boolean;
  aliases: string[];
}

export const PURCHASE_BOOK_COLUMNS: ColumnMappingDefinition[] = [
  { field: "gstin", label: "Supplier GSTIN", required: true, aliases: ["gstin", "supplier gstin", "party gstin", "vendor gstin", "gstin of supplier"] },
  { field: "supplierName", label: "Supplier Name", required: true, aliases: ["supplier name", "trade name", "legal name", "party name", "vendor name", "supplier"] },
  { field: "invoiceNumber", label: "Invoice Number", required: true, aliases: ["invoice number", "invoice no", "inv no", "bill no", "doc no", "document number"] },
  { field: "invoiceDate", label: "Invoice Date", required: true, aliases: ["invoice date", "inv date", "bill date", "date", "document date"] },
  { field: "taxableValue", label: "Taxable Value", required: true, aliases: ["taxable value", "taxable amount", "taxable amt", "taxable"] },
  { field: "igst", label: "IGST", required: false, aliases: ["igst", "integrated tax", "integrated tax (₹)", "igst amount"] },
  { field: "cgst", label: "CGST", required: false, aliases: ["cgst", "central tax", "central tax (₹)", "cgst amount"] },
  { field: "sgst", label: "SGST", required: false, aliases: ["sgst", "state/ut tax", "state tax", "state tax (₹)", "sgst amount"] },
  { field: "cess", label: "Cess", required: false, aliases: ["cess", "cess (₹)", "cess amount"] },
  { field: "invoiceValue", label: "Invoice Value", required: false, aliases: ["invoice value", "invoice amount", "total value", "total amount", "net amount"] },
  { field: "pos", label: "Place of Supply", required: false, aliases: ["place of supply", "pos", "state of supply"] },
  { field: "rcm", label: "RCM (Y/N)", required: false, aliases: ["rcm", "reverse charge", "reverse charge (y/n)"] },
  { field: "itcEligible", label: "ITC Eligible (Y/N)", required: false, aliases: ["itc eligible", "itc eligibility", "itc available", "itc (y/n)"] },
];

export const GSTR_2A_COLUMNS: ColumnMappingDefinition[] = [
  { field: "gstin", label: "Supplier GSTIN", required: true, aliases: ["gstin", "supplier gstin", "gstin of supplier"] },
  { field: "supplierName", label: "Supplier Name", required: true, aliases: ["supplier name", "legal name", "trade name", "party name"] },
  { field: "invoiceNumber", label: "Invoice Number", required: true, aliases: ["invoice number", "invoice no", "inv no", "document number"] },
  { field: "invoiceDate", label: "Invoice Date", required: true, aliases: ["invoice date", "inv date", "date"] },
  { field: "taxableValue", label: "Taxable Value", required: true, aliases: ["taxable value", "taxable amount", "taxable"] },
  { field: "igst", label: "IGST", required: false, aliases: ["igst", "integrated tax"] },
  { field: "cgst", label: "CGST", required: false, aliases: ["cgst", "central tax"] },
  { field: "sgst", label: "SGST", required: false, aliases: ["sgst", "state tax", "state/ut tax"] },
  { field: "cess", label: "Cess", required: false, aliases: ["cess"] },
  { field: "invoiceValue", label: "Invoice Value", required: false, aliases: ["invoice value", "total value"] },
  { field: "pos", label: "Place of Supply", required: false, aliases: ["place of supply", "pos"] },
  { field: "rcm", label: "Reverse Charge (Y/N)", required: false, aliases: ["reverse charge", "rcm"] },
  { field: "docType", label: "Document Type", required: false, aliases: ["document type", "doc type"] },
  { field: "amendmentStatus", label: "Amendment Status", required: false, aliases: ["amendment status", "amended", "amendment"] },
];

export const GSTR_2B_COLUMNS: ColumnMappingDefinition[] = [
  { field: "gstin", label: "Supplier GSTIN", required: true, aliases: ["gstin", "supplier gstin", "gstin of supplier", "gstin_uin"] },
  { field: "supplierName", label: "Supplier Name", required: true, aliases: ["supplier name", "trade name", "legal name", "party name"] },
  { field: "invoiceNumber", label: "Invoice Number", required: true, aliases: ["invoice number", "invoice no", "inv no", "document number"] },
  { field: "invoiceDate", label: "Invoice Date", required: true, aliases: ["invoice date", "inv date", "date"] },
  { field: "taxableValue", label: "Taxable Value", required: true, aliases: ["taxable value", "taxable amount", "taxable"] },
  { field: "igst", label: "IGST", required: false, aliases: ["igst", "integrated tax"] },
  { field: "cgst", label: "CGST", required: false, aliases: ["cgst", "central tax"] },
  { field: "sgst", label: "SGST", required: false, aliases: ["sgst", "state tax", "state/ut tax"] },
  { field: "cess", label: "Cess", required: false, aliases: ["cess"] },
  { field: "invoiceValue", label: "Invoice Value", required: false, aliases: ["invoice value", "total value"] },
  { field: "itcAvailability", label: "ITC Availability (Y/N)", required: false, aliases: ["itc availability", "itc available", "itc availability (y/n)"] },
  { field: "docType", label: "Document Type", required: false, aliases: ["document type", "doc type"] },
  { field: "rcm", label: "Reverse Charge (Y/N)", required: false, aliases: ["reverse charge", "rcm"] },
  { field: "amendmentStatus", label: "Amendment Status", required: false, aliases: ["amendment status", "amended"] },
];

export const GSTR_3B_COLUMNS: ColumnMappingDefinition[] = [
  { field: "month", label: "Month", required: true, aliases: ["month", "return period", "period"] },
  { field: "igstClaimed", label: "IGST ITC Claimed", required: false, aliases: ["igst claimed", "igst itc", "igst"] },
  { field: "cgstClaimed", label: "CGST ITC Claimed", required: false, aliases: ["cgst claimed", "cgst itc", "cgst"] },
  { field: "sgstClaimed", label: "SGST ITC Claimed", required: false, aliases: ["sgst claimed", "sgst itc", "sgst"] },
  { field: "cessClaimed", label: "Cess ITC Claimed", required: false, aliases: ["cess claimed", "cess itc", "cess"] },
  { field: "itcReversed", label: "ITC Reversed", required: false, aliases: ["itc reversed", "reversed itc", "reversal"] },
  { field: "remarks", label: "Remarks", required: false, aliases: ["remarks", "notes"] },
];

export function getDefinitionsForType(fileType: string): ColumnMappingDefinition[] {
  switch (fileType) {
    case "PURCHASE_BOOKS":
      return PURCHASE_BOOK_COLUMNS;
    case "GSTR_2A":
      return GSTR_2A_COLUMNS;
    case "GSTR_2B":
      return GSTR_2B_COLUMNS;
    case "GSTR_3B":
      return GSTR_3B_COLUMNS;
    default:
      return PURCHASE_BOOK_COLUMNS;
  }
}

/**
 * Auto-detect mapping between detected file headers and required definitions
 */
export function autoMapColumns(
  detectedHeaders: string[],
  definitions: ColumnMappingDefinition[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const def of definitions) {
    for (const header of detectedHeaders) {
      const cleanHeader = header.trim().toLowerCase();
      if (cleanHeader === def.field.toLowerCase() || cleanHeader === def.label.toLowerCase() || def.aliases.includes(cleanHeader)) {
        mapping[def.field] = header;
        break;
      }
    }
  }

  return mapping;
}

export interface ValidationErrorItem {
  rowNumber: number;
  column?: string;
  errorMessage: string;
  rowData: Record<string, any>;
}

/**
 * Validate a set of rows mapped from Excel/CSV
 */
export function validateRows(
  rows: any[],
  mapping: Record<string, string>,
  fileType: string
): {
  validRows: any[];
  errors: ValidationErrorItem[];
} {
  const validRows: any[] = [];
  const errors: ValidationErrorItem[] = [];
  const seenUniqueKeys = new Set<string>();

  rows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // +1 for 1-based, +1 for header row
    const rowErrors: string[] = [];

    // Extract values according to mapping
    const getVal = (field: string) => {
      const header = mapping[field];
      return header ? rawRow[header] : undefined;
    };

    if (fileType === "GSTR_3B") {
      const month = getVal("month");
      if (!month) {
        rowErrors.push("Month / Return Period is required");
      }

      if (rowErrors.length > 0) {
        errors.push({
          rowNumber: rowNum,
          column: "Month",
          errorMessage: rowErrors.join("; "),
          rowData: rawRow,
        });
      } else {
        const igst = Number(getVal("igstClaimed") || 0);
        const cgst = Number(getVal("cgstClaimed") || 0);
        const sgst = Number(getVal("sgstClaimed") || 0);
        const cess = Number(getVal("cessClaimed") || 0);
        const reversed = Number(getVal("itcReversed") || 0);
        const totalClaimed = igst + cgst + sgst + cess;
        const netItc = totalClaimed - reversed;

        validRows.push({
          month: String(month).trim(),
          igstClaimed: isNaN(igst) ? 0 : igst,
          cgstClaimed: isNaN(cgst) ? 0 : cgst,
          sgstClaimed: isNaN(sgst) ? 0 : sgst,
          cessClaimed: isNaN(cess) ? 0 : cess,
          totalClaimed,
          itcReversed: isNaN(reversed) ? 0 : reversed,
          netItc,
          remarks: getVal("remarks") ? String(getVal("remarks")).trim() : null,
        });
      }
      return;
    }

    // Invoice rows (Books, 2A, 2B)
    const rawGstin = getVal("gstin");
    const rawInvNo = getVal("invoiceNumber");
    const rawDate = getVal("invoiceDate");
    const rawTaxable = getVal("taxableValue");

    if (!rawGstin) {
      rowErrors.push("Blank or missing Supplier GSTIN");
    } else if (!isValidGstin(String(rawGstin))) {
      rowErrors.push(`Invalid GSTIN format: '${rawGstin}'`);
    }

    if (!rawInvNo || String(rawInvNo).trim() === "") {
      rowErrors.push("Invoice number cannot be blank");
    }

    const parsedDate = parseDateInput(rawDate);
    if (!parsedDate) {
      rowErrors.push(`Invalid or unparseable invoice date: '${rawDate}'`);
    }

    const taxable = Number(rawTaxable);
    if (rawTaxable === undefined || rawTaxable === null || isNaN(taxable)) {
      rowErrors.push("Invalid Taxable Value");
    }

    const normGstin = rawGstin ? String(rawGstin).trim().toUpperCase() : "";
    const normInvNo = normalizeInvoiceNumber(rawInvNo);
    const key = `${normGstin}_${normInvNo}_${parsedDate ? parsedDate.getFullYear() : "YEAR"}`;

    if (seenUniqueKeys.has(key)) {
      rowErrors.push(`Duplicate row in import sheet for Invoice: ${rawInvNo} and GSTIN: ${normGstin}`);
    } else {
      seenUniqueKeys.add(key);
    }

    if (rowErrors.length > 0) {
      errors.push({
        rowNumber: rowNum,
        errorMessage: rowErrors.join("; "),
        rowData: rawRow,
      });
    } else {
      const igst = Number(getVal("igst") || 0);
      const cgst = Number(getVal("cgst") || 0);
      const sgst = Number(getVal("sgst") || 0);
      const cess = Number(getVal("cess") || 0);
      const totalTax = (isNaN(igst) ? 0 : igst) + (isNaN(cgst) ? 0 : cgst) + (isNaN(sgst) ? 0 : sgst) + (isNaN(cess) ? 0 : cess);
      const invoiceVal = Number(getVal("invoiceValue") || taxable + totalTax);

      // Extract month name (e.g. "April 2026")
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = parsedDate ? `${monthNames[parsedDate.getMonth()]} ${parsedDate.getFullYear()}` : "Unknown";

      // FY determination (Indian FY April to March)
      const yr = parsedDate!.getFullYear();
      const fy = parsedDate!.getMonth() >= 3 ? `${yr}-${String(yr + 1).slice(-2)}` : `${yr - 1}-${String(yr).slice(-2)}`;

      const rcmVal = String(getVal("rcm") || "").toUpperCase();
      const isRcm = rcmVal === "Y" || rcmVal === "YES" || rcmVal === "TRUE" || rcmVal === "1";

      const itcEligVal = String(getVal("itcEligible") || getVal("itcAvailability") || "Y").toUpperCase();
      const isItcEligible = !(itcEligVal === "N" || itcEligVal === "NO" || itcEligVal === "FALSE" || itcEligVal === "0" || itcEligVal === "INELIGIBLE");

      validRows.push({
        gstin: normGstin,
        supplierName: String(getVal("supplierName") || "Unknown Supplier").trim(),
        invoiceNumber: String(rawInvNo).trim(),
        normalizedInvoiceNumber: normInvNo,
        invoiceDate: parsedDate,
        fy,
        month,
        taxableValue: taxable,
        igst: isNaN(igst) ? 0 : igst,
        cgst: isNaN(cgst) ? 0 : cgst,
        sgst: isNaN(sgst) ? 0 : sgst,
        cess: isNaN(cess) ? 0 : cess,
        totalTax,
        invoiceValue: isNaN(invoiceVal) ? taxable + totalTax : invoiceVal,
        pos: getVal("pos") ? String(getVal("pos")).trim() : null,
        rcm: isRcm,
        itcEligible: isItcEligible,
        itcIneligible: !isItcEligible,
        itcAvailability: isItcEligible ? "Y" : "N",
        docType: getVal("docType") ? String(getVal("docType")).trim() : "INV",
        amendmentStatus: getVal("amendmentStatus") ? String(getVal("amendmentStatus")).trim() : null,
        uniqueKey: key,
      });
    }
  });

  return { validRows, errors };
}

/**
 * Generate Excel Template for downloading
 */
export function generateExcelTemplate(fileType: string): Uint8Array {
  const wb = XLSX.utils.book_new();

  let sampleData: any[] = [];

  if (fileType === "PURCHASE_BOOKS") {
    sampleData = [
      {
        "Supplier GSTIN": "27AABCT3518Q1ZV",
        "Supplier Name": "Tata Steel Limited",
        "Invoice Number": "INV-2026-001",
        "Invoice Date": "15-04-2026",
        "Taxable Value": 100000,
        "IGST": 18000,
        "CGST": 0,
        "SGST": 0,
        "Cess": 0,
        "Invoice Value": 118000,
        "Place of Supply": "27-Maharashtra",
        "RCM": "N",
        "ITC Eligible": "Y",
      },
      {
        "Supplier GSTIN": "07AAACG0563P1ZU",
        "Supplier Name": "Infosys Technologies",
        "Invoice Number": "INF/2026/894",
        "Invoice Date": "22-04-2026",
        "Taxable Value": 50000,
        "IGST": 0,
        "CGST": 4500,
        "SGST": 4500,
        "Cess": 0,
        "Invoice Value": 59000,
        "Place of Supply": "07-Delhi",
        "RCM": "N",
        "ITC Eligible": "Y",
      },
    ];
  } else if (fileType === "GSTR_2A") {
    sampleData = [
      {
        "Supplier GSTIN": "27AABCT3518Q1ZV",
        "Supplier Name": "Tata Steel Limited",
        "Invoice Number": "INV-2026-001",
        "Invoice Date": "15-04-2026",
        "Taxable Value": 100000,
        "IGST": 18000,
        "CGST": 0,
        "SGST": 0,
        "Cess": 0,
        "Invoice Value": 118000,
        "Place of Supply": "27-Maharashtra",
        "Reverse Charge": "N",
        "Document Type": "INV",
        "Amendment Status": "Original",
      },
    ];
  } else if (fileType === "GSTR_2B") {
    sampleData = [
      {
        "Supplier GSTIN": "27AABCT3518Q1ZV",
        "Supplier Name": "Tata Steel Limited",
        "Invoice Number": "INV-2026-001",
        "Invoice Date": "15-04-2026",
        "Taxable Value": 100000,
        "IGST": 18000,
        "CGST": 0,
        "SGST": 0,
        "Cess": 0,
        "Invoice Value": 118000,
        "ITC Availability": "Y",
        "Document Type": "INV",
        "Reverse Charge": "N",
        "Amendment Status": "Original",
      },
    ];
  } else if (fileType === "GSTR_3B") {
    sampleData = [
      {
        "Month": "April 2026",
        "IGST ITC Claimed": 45000,
        "CGST ITC Claimed": 22000,
        "SGST ITC Claimed": 22000,
        "Cess ITC Claimed": 0,
        "ITC Reversed": 1500,
        "Remarks": "Monthly return filed",
      },
      {
        "Month": "May 2026",
        "IGST ITC Claimed": 52000,
        "CGST ITC Claimed": 31000,
        "SGST ITC Claimed": 31000,
        "Cess ITC Claimed": 0,
        "ITC Reversed": 0,
        "Remarks": "Monthly return filed",
      },
    ];
  }

  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
