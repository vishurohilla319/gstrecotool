import * as XLSX from "xlsx";
import { isValidGstin, normalizeInvoiceNumber, parseDateInput } from "./gst-utils";

export interface ColumnMappingDefinition {
  field: string;
  label: string;
  required: boolean;
  aliases: string[];
}

export const PURCHASE_BOOK_COLUMNS: ColumnMappingDefinition[] = [
  { field: "gstin", label: "Supplier GSTIN", required: true, aliases: ["gstin", "supplier gstin", "party gstin", "vendor gstin", "gstin of supplier", "gstin/uin", "gstin / uin", "party gstin/uin", "gst no", "gst no.", "gst number", "gstin no", "gstin_uin", "gst", "party's gstin/uin"] },
  { field: "supplierName", label: "Supplier Name", required: true, aliases: ["supplier name", "trade name", "legal name", "party name", "vendor name", "supplier", "particulars", "party", "ledger name", "account name", "name of supplier", "name of party", "name of the supplier", "trade/legal name", "party's name"] },
  { field: "invoiceNumber", label: "Invoice Number", required: true, aliases: ["invoice number", "invoice no", "invoice no.", "inv no", "inv no.", "bill no", "bill no.", "bill number", "doc no", "doc no.", "document number", "vch no", "vch no.", "voucher no", "voucher no.", "ref no", "ref no.", "supplier invoice no", "reference no", "invoice number/document number"] },
  { field: "invoiceDate", label: "Invoice Date", required: true, aliases: ["invoice date", "inv date", "bill date", "date", "document date", "vch date", "voucher date", "inv. date", "invoice dt", "doc date", "voucher dt"] },
  { field: "taxableValue", label: "Taxable Value", required: true, aliases: ["taxable value", "taxable amount", "taxable amt", "taxable", "assessable value", "assessable amt", "taxable value (₹)", "taxable value(₹)", "basic amount", "basic value", "taxable val", "taxable amt."] },
  { field: "igst", label: "IGST", required: false, aliases: ["igst", "integrated tax", "integrated tax (₹)", "integrated tax(₹)", "igst amount", "igst amt", "igst (₹)", "i.g.s.t", "integrated tax amt"] },
  { field: "cgst", label: "CGST", required: false, aliases: ["cgst", "central tax", "central tax (₹)", "central tax(₹)", "cgst amount", "cgst amt", "cgst (₹)", "c.g.s.t", "central tax amt"] },
  { field: "sgst", label: "SGST", required: false, aliases: ["sgst", "state/ut tax", "state tax", "state tax (₹)", "state/ut tax (₹)", "state/ut tax(₹)", "sgst amount", "sgst amt", "sgst (₹)", "s.g.s.t", "utgst", "state tax amt"] },
  { field: "cess", label: "Cess", required: false, aliases: ["cess", "cess (₹)", "cess(₹)", "cess amount", "cess amt"] },
  { field: "invoiceValue", label: "Invoice Value", required: false, aliases: ["invoice value", "invoice amount", "total value", "total amount", "net amount", "gross total", "bill amount", "total", "grand total", "inv value", "invoice value (₹)", "total amt"] },
  { field: "pos", label: "Place of Supply", required: false, aliases: ["place of supply", "pos", "state of supply", "state"] },
  { field: "rcm", label: "RCM (Y/N)", required: false, aliases: ["rcm", "reverse charge", "reverse charge (y/n)"] },
  { field: "itcEligible", label: "ITC Eligible (Y/N)", required: false, aliases: ["itc eligible", "itc eligibility", "itc available", "itc (y/n)"] },
];

export const GSTR_2A_COLUMNS: ColumnMappingDefinition[] = [
  { field: "gstin", label: "Supplier GSTIN", required: true, aliases: ["gstin", "supplier gstin", "gstin of supplier", "gstin_uin", "gstin/uin", "gstin/uin of supplier", "gstin of the supplier"] },
  { field: "supplierName", label: "Supplier Name", required: true, aliases: ["supplier name", "legal name", "trade name", "party name", "trade/legal name", "legal/trade name", "legal name of supplier", "trade/ legal name", "supplier trade/legal name"] },
  { field: "invoiceNumber", label: "Invoice Number", required: true, aliases: ["invoice number", "invoice no", "inv no", "document number", "invoice no.", "doc no", "invoice number/document number"] },
  { field: "invoiceDate", label: "Invoice Date", required: true, aliases: ["invoice date", "inv date", "date", "invoice date(dd/mm/yyyy)", "invoice date (dd-mm-yyyy)", "invoice dt"] },
  { field: "taxableValue", label: "Taxable Value", required: true, aliases: ["taxable value", "taxable amount", "taxable", "taxable value (₹)", "taxable value(₹)", "taxable val"] },
  { field: "igst", label: "IGST", required: false, aliases: ["igst", "integrated tax", "integrated tax (₹)", "integrated tax(₹)", "integrated tax amount"] },
  { field: "cgst", label: "CGST", required: false, aliases: ["cgst", "central tax", "central tax (₹)", "central tax(₹)", "central tax amount"] },
  { field: "sgst", label: "SGST", required: false, aliases: ["sgst", "state tax", "state/ut tax", "state/ut tax (₹)", "state/ut tax(₹)", "state tax (₹)", "state tax amount"] },
  { field: "cess", label: "Cess", required: false, aliases: ["cess", "cess (₹)", "cess(₹)", "cess amount"] },
  { field: "invoiceValue", label: "Invoice Value", required: false, aliases: ["invoice value", "total value", "invoice value (₹)", "invoice value(₹)", "invoice amount", "total amount"] },
  { field: "pos", label: "Place of Supply", required: false, aliases: ["place of supply", "pos", "state"] },
  { field: "rcm", label: "Reverse Charge (Y/N)", required: false, aliases: ["reverse charge", "rcm", "supply attract reverse charge", "supply attracts reverse charge"] },
  { field: "docType", label: "Document Type", required: false, aliases: ["document type", "doc type", "invoice type"] },
  { field: "amendmentStatus", label: "Amendment Status", required: false, aliases: ["amendment status", "amended", "amendment"] },
];

export const GSTR_2B_COLUMNS: ColumnMappingDefinition[] = [
  { field: "gstin", label: "Supplier GSTIN", required: true, aliases: ["gstin", "supplier gstin", "gstin of supplier", "gstin_uin", "gstin/uin", "gstin/uin of supplier", "gstin of the supplier"] },
  { field: "supplierName", label: "Supplier Name", required: true, aliases: ["supplier name", "trade name", "legal name", "party name", "trade/legal name", "legal/trade name", "legal name of supplier", "trade/ legal name", "supplier trade/legal name"] },
  { field: "invoiceNumber", label: "Invoice Number", required: true, aliases: ["invoice number", "invoice no", "inv no", "document number", "invoice no.", "doc no", "invoice number/document number"] },
  { field: "invoiceDate", label: "Invoice Date", required: true, aliases: ["invoice date", "inv date", "date", "invoice date(dd/mm/yyyy)", "invoice date (dd-mm-yyyy)", "invoice dt"] },
  { field: "taxableValue", label: "Taxable Value", required: true, aliases: ["taxable value", "taxable amount", "taxable", "taxable value (₹)", "taxable value(₹)", "taxable val"] },
  { field: "igst", label: "IGST", required: false, aliases: ["igst", "integrated tax", "integrated tax (₹)", "integrated tax(₹)", "integrated tax amount"] },
  { field: "cgst", label: "CGST", required: false, aliases: ["cgst", "central tax", "central tax (₹)", "central tax(₹)", "central tax amount"] },
  { field: "sgst", label: "SGST", required: false, aliases: ["sgst", "state tax", "state/ut tax", "state/ut tax (₹)", "state/ut tax(₹)", "state tax (₹)", "state tax amount"] },
  { field: "cess", label: "Cess", required: false, aliases: ["cess", "cess (₹)", "cess(₹)", "cess amount"] },
  { field: "invoiceValue", label: "Invoice Value", required: false, aliases: ["invoice value", "total value", "invoice value (₹)", "invoice value(₹)", "invoice amount", "total amount"] },
  { field: "itcAvailability", label: "ITC Availability (Y/N)", required: false, aliases: ["itc availability", "itc available", "itc availability (y/n)", "itc eligibility", "itc available (y/n)"] },
  { field: "docType", label: "Document Type", required: false, aliases: ["document type", "doc type", "invoice type"] },
  { field: "rcm", label: "Reverse Charge (Y/N)", required: false, aliases: ["reverse charge", "rcm", "supply attract reverse charge", "supply attracts reverse charge", "reverse charge (y/n)"] },
  { field: "amendmentStatus", label: "Amendment Status", required: false, aliases: ["amendment status", "amended", "amendment"] },
  { field: "pos", label: "Place of Supply", required: false, aliases: ["place of supply", "pos", "state of supply"] },
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
 * Intelligent auto-mapping with alphanumeric normalization
 */
export function autoMapColumns(
  detectedHeaders: string[],
  definitions: ColumnMappingDefinition[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const def of definitions) {
    for (const header of detectedHeaders) {
      const cleanHeader = header.trim().toLowerCase();
      const normHeader = cleanHeader.replace(/[^a-z0-9]/g, "");

      const candidates = [
        def.field.toLowerCase(),
        def.label.toLowerCase(),
        ...def.aliases.map((a) => a.toLowerCase()),
      ];

      const match = candidates.some((cand) => {
        const normCand = cand.replace(/[^a-z0-9]/g, "");
        return (
          cleanHeader === cand ||
          normHeader === normCand ||
          (normCand.length >= 4 && normHeader.includes(normCand)) ||
          (normHeader.length >= 4 && normCand.includes(normHeader))
        );
      });

      if (match) {
        mapping[def.field] = header;
        break;
      }
    }
  }

  return mapping;
}

export interface ExtractedSheetData {
  sheetName: string;
  availableSheets: string[];
  headers: string[];
  rows: Record<string, any>[];
  autoMapping: Record<string, string>;
  isFullyMapped: boolean;
  detectedHeaderRow: number;
}

/**
 * Detect the best sheet name (e.g. "B2B" for official GSTR-2B or GSTR-2A)
 */
export function findBestSheetName(sheetNames: string[], fileType: string): string {
  if (!sheetNames || sheetNames.length === 0) return "";

  if (fileType === "GSTR_2B" || fileType === "GSTR_2A") {
    // 1. Exact match for "B2B"
    const exactB2b = sheetNames.find((s) => s.trim().toUpperCase() === "B2B");
    if (exactB2b) return exactB2b;

    // 2. Starts with B2B or contains B2B
    const b2bMatch = sheetNames.find((s) => /\bB2B\b/i.test(s) || /^B2B/i.test(s.trim()));
    if (b2bMatch) return b2bMatch;

    // 3. Match 2B or 2A
    const recoMatch = sheetNames.find((s) => /2B/i.test(s) || /2A/i.test(s));
    if (recoMatch) return recoMatch;
  }

  if (fileType === "PURCHASE_BOOKS") {
    const pMatch = sheetNames.find((s) =>
      /purchase|register|books|tally|busy|data|invoices/i.test(s)
    );
    if (pMatch) return pMatch;
  }

  if (fileType === "GSTR_3B") {
    const match3b = sheetNames.find((s) =>
      /3B|GSTR-?3B|table\s*4|itc/i.test(s)
    );
    if (match3b) return match3b;
  }

  return sheetNames[0];
}

/**
 * Smart Sheet Data Extraction:
 * Automatically selects the target sheet (e.g. "B2B"),
 * detects the actual header row (skipping government banners/metadata),
 * parses records, and computes 100% confidence auto-mapping.
 */
export function smartExtractSheetData(
  wb: XLSX.WorkBook,
  targetSheetName: string,
  fileType: string
): ExtractedSheetData {
  const availableSheets = wb.SheetNames || [];
  const sheetName = targetSheetName || findBestSheetName(availableSheets, fileType);
  const ws = wb.Sheets[sheetName] || wb.Sheets[availableSheets[0]];

  if (!ws) {
    return {
      sheetName: "",
      availableSheets,
      headers: [],
      rows: [],
      autoMapping: {},
      isFullyMapped: false,
      detectedHeaderRow: 0,
    };
  }

  // Convert raw sheet to 2D array of rows
  const rawMatrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
  if (rawMatrix.length === 0) {
    return {
      sheetName,
      availableSheets,
      headers: [],
      rows: [],
      autoMapping: {},
      isFullyMapped: false,
      detectedHeaderRow: 0,
    };
  }

  const definitions = getDefinitionsForType(fileType);

  // Scan first 25 rows to detect the true table header row
  let bestHeaderRowIndex = 0;
  let maxScore = -1;

  for (let r = 0; r < Math.min(25, rawMatrix.length); r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    const cleanCells = row.map((c) => String(c ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

    for (const def of definitions) {
      const allAliases = [
        def.field.toLowerCase(),
        def.label.toLowerCase(),
        ...def.aliases.map((a) => a.toLowerCase()),
      ].map((a) => a.replace(/[^a-z0-9]/g, ""));

      if (cleanCells.some((cell) => cell && allAliases.some((alias) => cell === alias || (alias.length >= 5 && cell.includes(alias))))) {
        score++;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestHeaderRowIndex = r;
    }
  }

  // Extract detected headers
  const headerRow = rawMatrix[bestHeaderRowIndex] || [];
  const headers: string[] = [];
  headerRow.forEach((col: any, idx: number) => {
    const colName = String(col ?? "").trim();
    if (colName) {
      headers.push(colName);
    } else {
      headers.push(`Column_${idx + 1}`);
    }
  });

  // Map remaining rows to JSON objects using detected headers
  const rows: Record<string, any>[] = [];
  for (let r = bestHeaderRowIndex + 1; r < rawMatrix.length; r++) {
    const rowArr = rawMatrix[r];
    if (!rowArr || !Array.isArray(rowArr)) continue;

    // Check if entire row is empty
    const hasValues = rowArr.some((c) => String(c ?? "").trim() !== "");
    if (!hasValues) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : "";
    });
    rows.push(rowObj);
  }

  // Auto map columns by header name
  const autoMapping = autoMapColumns(headers, definitions);

  // Deep Content Inspection: If any required column is still missing, inspect row values!
  if (fileType !== "GSTR_3B" && rows.length > 0) {
    const sampleRows = rows.slice(0, 15);
    const mappedHeaders = new Set(Object.values(autoMapping));

    // 1. Detect GSTIN by 15-character GST pattern in row values
    if (!autoMapping["gstin"]) {
      for (const h of headers.filter((x) => !mappedHeaders.has(x))) {
        const matches = sampleRows.filter((r) => isValidGstin(String(r[h] ?? "")));
        if (matches.length >= Math.min(1, sampleRows.length)) {
          autoMapping["gstin"] = h;
          mappedHeaders.add(h);
          break;
        }
      }
    }

    // 2. Detect Invoice Date by parseable date values
    if (!autoMapping["invoiceDate"]) {
      for (const h of headers.filter((x) => !mappedHeaders.has(x))) {
        const matches = sampleRows.filter((r) => parseDateInput(r[h]) !== null);
        if (matches.length >= Math.max(1, Math.floor(sampleRows.length * 0.4))) {
          autoMapping["invoiceDate"] = h;
          mappedHeaders.add(h);
          break;
        }
      }
    }

    // 3. Detect Taxable Value by numeric amount values
    if (!autoMapping["taxableValue"]) {
      for (const h of headers.filter((x) => !mappedHeaders.has(x))) {
        const hasNumbers = sampleRows.some((r) => {
          const v = Number(r[h]);
          return !isNaN(v) && v > 0;
        });
        const headerHint = /tax|taxable|assessable|basic|amt|amount|value/i.test(h);
        if (hasNumbers && (headerHint || headers.filter((x) => !mappedHeaders.has(x)).length <= 3)) {
          autoMapping["taxableValue"] = h;
          mappedHeaders.add(h);
          break;
        }
      }
    }

    // 4. Detect Invoice Number
    if (!autoMapping["invoiceNumber"]) {
      for (const h of headers.filter((x) => !mappedHeaders.has(x))) {
        const hasValues = sampleRows.some((r) => String(r[h] ?? "").trim().length > 0);
        const headerHint = /inv|bill|doc|vch|no|num|ref|voucher/i.test(h);
        if (hasValues && headerHint) {
          autoMapping["invoiceNumber"] = h;
          mappedHeaders.add(h);
          break;
        }
      }
      // If still not mapped, take the first available non-empty column
      if (!autoMapping["invoiceNumber"]) {
        for (const h of headers.filter((x) => !mappedHeaders.has(x))) {
          if (sampleRows.some((r) => String(r[h] ?? "").trim().length > 0)) {
            autoMapping["invoiceNumber"] = h;
            mappedHeaders.add(h);
            break;
          }
        }
      }
    }

    // 5. Detect Supplier / Party Name
    if (!autoMapping["supplierName"]) {
      for (const h of headers.filter((x) => !mappedHeaders.has(x))) {
        const headerHint = /party|supplier|name|particulars|vendor|ledger|account/i.test(h);
        const isText = sampleRows.some((r) => {
          const v = String(r[h] ?? "").trim();
          return v.length > 2 && isNaN(Number(v));
        });
        if (headerHint || isText) {
          autoMapping["supplierName"] = h;
          mappedHeaders.add(h);
          break;
        }
      }
    }
  }

  // Check if all required fields are mapped
  const requiredDefs = definitions.filter((d) => d.required);
  const isFullyMapped =
    requiredDefs.length > 0 &&
    requiredDefs.every((d) => Boolean(autoMapping[d.field]));

  return {
    sheetName,
    availableSheets,
    headers,
    rows,
    autoMapping,
    isFullyMapped,
    detectedHeaderRow: bestHeaderRowIndex + 1,
  };
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
  ignoredCount: number;
} {
  const validRows: any[] = [];
  const errors: ValidationErrorItem[] = [];
  let ignoredCount = 0;
  const seenUniqueKeys = new Set<string>();

  rows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // +1 for 1-based, +1 for header row
    const rowErrors: string[] = [];

    // Extract values according to mapping
    const getVal = (field: string) => {
      const header = mapping[field];
      return header ? rawRow[header] : undefined;
    };

    // 1. Skip completely blank rows
    const rowValues = Object.values(rawRow).map((v) => String(v ?? "").trim());
    const isBlankRow = rowValues.every((v) => v === "");
    if (isBlankRow) {
      ignoredCount++;
      return;
    }

    if (fileType === "GSTR_3B") {
      const month = getVal("month");
      const isMonthTotal = String(month ?? "").trim().toLowerCase().startsWith("total");
      if (isMonthTotal) {
        ignoredCount++;
        return;
      }

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

    // 2. Skip Total / Grand Total / Summary rows commonly found at bottom of accounting exports
    const hasTotalKeyword =
      rowValues.some((v) => /^(total|grand\s*total|sub\s*total|summary|totals?|total\s+amount)$/i.test(v)) ||
      String(rawDate ?? "").trim().toLowerCase().startsWith("total") ||
      String(rawGstin ?? "").trim().toLowerCase().startsWith("total") ||
      String(rawInvNo ?? "").trim().toLowerCase().startsWith("total");

    const isTotalSummaryRow =
      hasTotalKeyword &&
      (!rawInvNo || String(rawInvNo).trim() === "" || !rawGstin || String(rawGstin).trim() === "" || !isValidGstin(String(rawGstin)));

    if (isTotalSummaryRow) {
      ignoredCount++;
      return;
    }

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

  return { validRows, errors, ignoredCount };
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
