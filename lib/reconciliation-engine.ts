import { normalizeGstin, normalizeInvoiceNumber } from "./gst-utils";

export interface Tolerances {
  taxableTolerance: number;
  igstTolerance: number;
  cgstTolerance: number;
  sgstTolerance: number;
  dateToleranceDays: number;
}

export const DEFAULT_TOLERANCES: Tolerances = {
  taxableTolerance: 1.0,
  igstTolerance: 1.0,
  cgstTolerance: 1.0,
  sgstTolerance: 1.0,
  dateToleranceDays: 0,
};

export interface ReconciledItemResult {
  matchStatus:
    | "EXACT_MATCH"
    | "TAX_DIFFERENCE"
    | "DATE_DIFFERENCE"
    | "BOOKS_ONLY"
    | "STATEMENT_ONLY"
    | "DUPLICATE"
    | "ITC_INELIGIBLE"
    | "RCM"
    | "AMENDMENT"
    | "MANUAL_REVIEW"
    | "MANUAL_MATCHED";
  booksRecordId?: string;
  statementRecordId?: string;
  booksGstin?: string;
  booksSupplier?: string;
  booksInvoiceNo?: string;
  booksDate?: Date;
  booksTaxable?: number;
  booksIgst?: number;
  booksCgst?: number;
  booksSgst?: number;
  booksCess?: number;
  stmtGstin?: string;
  stmtSupplier?: string;
  stmtInvoiceNo?: string;
  stmtDate?: Date;
  stmtTaxable?: number;
  stmtIgst?: number;
  stmtCgst?: number;
  stmtSgst?: number;
  stmtCess?: number;
  diffTaxable: number;
  diffIgst: number;
  diffCgst: number;
  diffSgst: number;
  diffTotal: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  actionRequired?: string;
  remarks?: string;
}

export function daysBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Levenshtein distance for fuzzy matching
export function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  const m = s1.length;
  const n = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[m][n];
  const maxLen = Math.max(m, n);
  return (maxLen - distance) / maxLen;
}

/**
 * Reconcile Purchase Books vs GSTR-2B
 */
export function reconcileBooksVs2B(
  books: any[],
  gstr2b: any[],
  tolerances: Tolerances = DEFAULT_TOLERANCES
): {
  items: ReconciledItemResult[];
  summary: {
    totalRecords: number;
    matchedCount: number;
    mismatchCount: number;
    booksOnlyCount: number;
    statementOnlyCount: number;
    itcReversedCount?: number;
    itcReversedAmount?: number;
  };
} {
  const items: ReconciledItemResult[] = [];
  const matched2BIds = new Set<string>();
  const matchedBookIds = new Set<string>();

  // Check for duplicate invoices in Books
  const booksKeyMap = new Map<string, any[]>();
  for (const b of books) {
    const key = `${normalizeGstin(b.gstin)}_${normalizeInvoiceNumber(b.invoiceNumber)}_${b.fy}`;
    if (!booksKeyMap.has(key)) booksKeyMap.set(key, []);
    booksKeyMap.get(key)!.push(b);
  }

  // Check for duplicate invoices in 2B
  const stmt2BKeyMap = new Map<string, any[]>();
  for (const s of gstr2b) {
    const key = `${normalizeGstin(s.gstin)}_${normalizeInvoiceNumber(s.invoiceNumber)}_${s.fy}`;
    if (!stmt2BKeyMap.has(key)) stmt2BKeyMap.set(key, []);
    stmt2BKeyMap.get(key)!.push(s);
  }

  // Phase 1: Direct & Exact Matching
  for (const b of books) {
    const normGstin = normalizeGstin(b.gstin);
    const normInv = normalizeInvoiceNumber(b.invoiceNumber);
    const key = `${normGstin}_${normInv}_${b.fy}`;

    // Duplicate in books
    if (booksKeyMap.get(key)!.length > 1 && !matchedBookIds.has(b.id)) {
      items.push({
        matchStatus: "DUPLICATE",
        booksRecordId: b.id,
        booksGstin: b.gstin,
        booksSupplier: b.supplierName,
        booksInvoiceNo: b.invoiceNumber,
        booksDate: new Date(b.invoiceDate),
        booksTaxable: b.taxableValue,
        booksIgst: b.igst,
        booksCgst: b.cgst,
        booksSgst: b.sgst,
        booksCess: b.cess,
        diffTaxable: b.taxableValue,
        diffIgst: b.igst,
        diffCgst: b.cgst,
        diffSgst: b.sgst,
        diffTotal: (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0),
        priority: "HIGH",
        actionRequired: "Investigate duplicate entry in Purchase Register",
        remarks: "Duplicate invoice found in Books for same GSTIN, Invoice Number and FY",
      });
      matchedBookIds.add(b.id);
      continue;
    }

    const matching2bCandidates = stmt2BKeyMap.get(key)?.filter((s) => !matched2BIds.has(s.id)) || [];

    if (matching2bCandidates.length > 0) {
      // Found candidate in 2B
      const s = matching2bCandidates[0];
      matched2BIds.add(s.id);
      matchedBookIds.add(b.id);

      const diffTaxable = Math.round(((b.taxableValue || 0) - (s.taxableValue || 0)) * 100) / 100;
      const diffIgst = Math.round(((b.igst || 0) - (s.igst || 0)) * 100) / 100;
      const diffCgst = Math.round(((b.cgst || 0) - (s.cgst || 0)) * 100) / 100;
      const diffSgst = Math.round(((b.sgst || 0) - (s.sgst || 0)) * 100) / 100;
      const diffTotalTax = Math.round((diffIgst + diffCgst + diffSgst) * 100) / 100;

      const booksDate = new Date(b.invoiceDate);
      const stmtDate = new Date(s.invoiceDate);
      const dateDiffDays = daysBetween(booksDate, stmtDate);

      // Check special conditions first (ITC Ineligible / Reversed in 2B or in Books)
      if (s.itcEligible === false || s.itcAvailability === "N" || b.itcEligible === false || b.itcIneligible === true) {
        const isReversedInBooks = b.itcEligible === false || b.itcIneligible === true;
        items.push({
          matchStatus: "ITC_INELIGIBLE",
          booksRecordId: b.id,
          statementRecordId: s.id,
          booksGstin: b.gstin,
          booksSupplier: b.supplierName,
          booksInvoiceNo: b.invoiceNumber,
          booksDate,
          booksTaxable: b.taxableValue,
          booksIgst: b.igst,
          booksCgst: b.cgst,
          booksSgst: b.sgst,
          booksCess: b.cess,
          stmtGstin: s.gstin,
          stmtSupplier: s.supplierName,
          stmtInvoiceNo: s.invoiceNumber,
          stmtDate,
          stmtTaxable: s.taxableValue,
          stmtIgst: s.igst,
          stmtCgst: s.cgst,
          stmtSgst: s.sgst,
          stmtCess: s.cess,
          diffTaxable,
          diffIgst,
          diffCgst,
          diffSgst,
          diffTotal: diffTotalTax,
          priority: "LOW",
          actionRequired: isReversedInBooks
            ? "ITC Reversed in Books / Form 3B"
            : "Reverse ITC or verify Section 17(5) blockage",
          remarks: isReversedInBooks
            ? "ITC marked as Reversed in Purchase Books"
            : "Invoice present in 2B but marked as Ineligible ITC",
        });
      } else if (s.rcm || b.rcm) {
        items.push({
          matchStatus: "RCM",
          booksRecordId: b.id,
          statementRecordId: s.id,
          booksGstin: b.gstin,
          booksSupplier: b.supplierName,
          booksInvoiceNo: b.invoiceNumber,
          booksDate,
          booksTaxable: b.taxableValue,
          booksIgst: b.igst,
          booksCgst: b.cgst,
          booksSgst: b.sgst,
          booksCess: b.cess,
          stmtGstin: s.gstin,
          stmtSupplier: s.supplierName,
          stmtInvoiceNo: s.invoiceNumber,
          stmtDate,
          stmtTaxable: s.taxableValue,
          stmtIgst: s.igst,
          stmtCgst: s.cgst,
          stmtSgst: s.sgst,
          stmtCess: s.cess,
          diffTaxable,
          diffIgst,
          diffCgst,
          diffSgst,
          diffTotal: diffTotalTax,
          priority: "MEDIUM",
          actionRequired: "Pay tax under RCM in cash before claiming ITC",
          remarks: "Reverse Charge Mechanism applicable",
        });
      } else if (
        Math.abs(diffTaxable) > tolerances.taxableTolerance ||
        Math.abs(diffIgst) > tolerances.igstTolerance ||
        Math.abs(diffCgst) > tolerances.cgstTolerance ||
        Math.abs(diffSgst) > tolerances.sgstTolerance
      ) {
        items.push({
          matchStatus: "TAX_DIFFERENCE",
          booksRecordId: b.id,
          statementRecordId: s.id,
          booksGstin: b.gstin,
          booksSupplier: b.supplierName,
          booksInvoiceNo: b.invoiceNumber,
          booksDate,
          booksTaxable: b.taxableValue,
          booksIgst: b.igst,
          booksCgst: b.cgst,
          booksSgst: b.sgst,
          booksCess: b.cess,
          stmtGstin: s.gstin,
          stmtSupplier: s.supplierName,
          stmtInvoiceNo: s.invoiceNumber,
          stmtDate,
          stmtTaxable: s.taxableValue,
          stmtIgst: s.igst,
          stmtCgst: s.cgst,
          stmtSgst: s.sgst,
          stmtCess: s.cess,
          diffTaxable,
          diffIgst,
          diffCgst,
          diffSgst,
          diffTotal: diffTotalTax,
          priority: Math.abs(diffTotalTax) > 1000 ? "HIGH" : "MEDIUM",
          actionRequired: "Contact supplier to issue credit/debit note or amend return",
          remarks: `Tax difference exceeds configured tolerance (Diff: ₹${diffTotalTax})`,
        });
      } else if (dateDiffDays > tolerances.dateToleranceDays) {
        items.push({
          matchStatus: "DATE_DIFFERENCE",
          booksRecordId: b.id,
          statementRecordId: s.id,
          booksGstin: b.gstin,
          booksSupplier: b.supplierName,
          booksInvoiceNo: b.invoiceNumber,
          booksDate,
          booksTaxable: b.taxableValue,
          booksIgst: b.igst,
          booksCgst: b.cgst,
          booksSgst: b.sgst,
          booksCess: b.cess,
          stmtGstin: s.gstin,
          stmtSupplier: s.supplierName,
          stmtInvoiceNo: s.invoiceNumber,
          stmtDate,
          stmtTaxable: s.taxableValue,
          stmtIgst: s.igst,
          stmtCgst: s.cgst,
          stmtSgst: s.sgst,
          stmtCess: s.cess,
          diffTaxable,
          diffIgst,
          diffCgst,
          diffSgst,
          diffTotal: diffTotalTax,
          priority: "LOW",
          actionRequired: "Verify invoice date mismatch with original tax invoice",
          remarks: `Invoice date differs by ${dateDiffDays} days`,
        });
      } else {
        items.push({
          matchStatus: "EXACT_MATCH",
          booksRecordId: b.id,
          statementRecordId: s.id,
          booksGstin: b.gstin,
          booksSupplier: b.supplierName,
          booksInvoiceNo: b.invoiceNumber,
          booksDate,
          booksTaxable: b.taxableValue,
          booksIgst: b.igst,
          booksCgst: b.cgst,
          booksSgst: b.sgst,
          booksCess: b.cess,
          stmtGstin: s.gstin,
          stmtSupplier: s.supplierName,
          stmtInvoiceNo: s.invoiceNumber,
          stmtDate,
          stmtTaxable: s.taxableValue,
          stmtIgst: s.igst,
          stmtCgst: s.cgst,
          stmtSgst: s.sgst,
          stmtCess: s.cess,
          diffTaxable,
          diffIgst,
          diffCgst,
          diffSgst,
          diffTotal: diffTotalTax,
          priority: "LOW",
          remarks: "Invoice perfectly matched within tolerance",
        });
      }
    }
  }

  // Phase 2: Fuzzy / Potential Matching for Unmatched Books Items
  const unmatchedBooks = books.filter((b) => !matchedBookIds.has(b.id));
  const unmatched2B = gstr2b.filter((s) => !matched2BIds.has(s.id));

  for (const b of unmatchedBooks) {
    const normGstin = normalizeGstin(b.gstin);
    const normInv = normalizeInvoiceNumber(b.invoiceNumber);

    // Look for same GSTIN + similar invoice number (similarity >= 0.8) or exact taxable amount
    let bestMatch: any = null;
    let highestSim = 0;

    for (const s of unmatched2B) {
      if (matched2BIds.has(s.id)) continue;
      if (normalizeGstin(s.gstin) === normGstin) {
        const sNormInv = normalizeInvoiceNumber(s.invoiceNumber);
        const sim = stringSimilarity(normInv, sNormInv);
        const amountMatch = Math.abs((b.taxableValue || 0) - (s.taxableValue || 0)) <= tolerances.taxableTolerance;

        if (sim >= 0.8 || (sim >= 0.5 && amountMatch)) {
          if (sim > highestSim) {
            highestSim = sim;
            bestMatch = s;
          }
        }
      }
    }

    if (bestMatch) {
      matched2BIds.add(bestMatch.id);
      matchedBookIds.add(b.id);

      const diffTaxable = Math.round(((b.taxableValue || 0) - (bestMatch.taxableValue || 0)) * 100) / 100;
      const diffIgst = Math.round(((b.igst || 0) - (bestMatch.igst || 0)) * 100) / 100;
      const diffCgst = Math.round(((b.cgst || 0) - (bestMatch.cgst || 0)) * 100) / 100;
      const diffSgst = Math.round(((b.sgst || 0) - (bestMatch.sgst || 0)) * 100) / 100;
      const diffTotalTax = Math.round((diffIgst + diffCgst + diffSgst) * 100) / 100;

      items.push({
        matchStatus: "MANUAL_REVIEW",
        booksRecordId: b.id,
        statementRecordId: bestMatch.id,
        booksGstin: b.gstin,
        booksSupplier: b.supplierName,
        booksInvoiceNo: b.invoiceNumber,
        booksDate: new Date(b.invoiceDate),
        booksTaxable: b.taxableValue,
        booksIgst: b.igst,
        booksCgst: b.cgst,
        booksSgst: b.sgst,
        booksCess: b.cess,
        stmtGstin: bestMatch.gstin,
        stmtSupplier: bestMatch.supplierName,
        stmtInvoiceNo: bestMatch.invoiceNumber,
        stmtDate: new Date(bestMatch.invoiceDate),
        stmtTaxable: bestMatch.taxableValue,
        stmtIgst: bestMatch.igst,
        stmtCgst: bestMatch.cgst,
        stmtSgst: bestMatch.sgst,
        stmtCess: bestMatch.cess,
        diffTaxable,
        diffIgst,
        diffCgst,
        diffSgst,
        diffTotal: diffTotalTax,
        priority: "MEDIUM",
        actionRequired: "Review potential invoice number mismatch and confirm match",
        remarks: `Probable match (Invoice similarity: ${Math.round(highestSim * 100)}%)`,
      });
    }
  }

  // Phase 3: Remaining Books Only
  for (const b of books) {
    if (!matchedBookIds.has(b.id)) {
      const isReversedInBooks = b.itcEligible === false || b.itcIneligible === true;
      items.push({
        matchStatus: isReversedInBooks ? "ITC_INELIGIBLE" : "BOOKS_ONLY",
        booksRecordId: b.id,
        booksGstin: b.gstin,
        booksSupplier: b.supplierName,
        booksInvoiceNo: b.invoiceNumber,
        booksDate: new Date(b.invoiceDate),
        booksTaxable: b.taxableValue,
        booksIgst: b.igst,
        booksCgst: b.cgst,
        booksSgst: b.sgst,
        booksCess: b.cess,
        diffTaxable: b.taxableValue,
        diffIgst: b.igst,
        diffCgst: b.cgst,
        diffSgst: b.sgst,
        diffTotal: (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0),
        priority: isReversedInBooks ? "LOW" : "CRITICAL",
        actionRequired: isReversedInBooks
          ? "ITC Reversed in Books / 3B"
          : "Follow up with supplier to file GSTR-1 for ITC eligibility",
        remarks: isReversedInBooks
          ? "ITC marked as Reversed in Purchase Books"
          : "Invoice recorded in Purchase Books but not reflected in GSTR-2B",
      });
    }
  }

  // Phase 4: Remaining 2B Only
  for (const s of gstr2b) {
    if (!matched2BIds.has(s.id)) {
      items.push({
        matchStatus: "STATEMENT_ONLY",
        statementRecordId: s.id,
        stmtGstin: s.gstin,
        stmtSupplier: s.supplierName,
        stmtInvoiceNo: s.invoiceNumber,
        stmtDate: new Date(s.invoiceDate),
        stmtTaxable: s.taxableValue,
        stmtIgst: s.igst,
        stmtCgst: s.cgst,
        stmtSgst: s.sgst,
        stmtCess: s.cess,
        diffTaxable: -(s.taxableValue || 0),
        diffIgst: -(s.igst || 0),
        diffCgst: -(s.cgst || 0),
        diffSgst: -(s.sgst || 0),
        diffTotal: -((s.igst || 0) + (s.cgst || 0) + (s.sgst || 0)),
        priority: "HIGH",
        actionRequired: "Check if invoice is missing from Purchase register or pertains to another period",
        remarks: "Invoice present in GSTR-2B but missing from Purchase Books",
      });
    }
  }

  const matchedCount = items.filter((i) => i.matchStatus === "EXACT_MATCH").length;
  const booksOnlyCount = items.filter((i) => i.matchStatus === "BOOKS_ONLY").length;
  const statementOnlyCount = items.filter((i) => i.matchStatus === "STATEMENT_ONLY").length;
  const itcReversedCount = items.filter((i) => i.matchStatus === "ITC_INELIGIBLE").length;
  const itcReversedAmount = items
    .filter((i) => i.matchStatus === "ITC_INELIGIBLE")
    .reduce((acc, i) => acc + (i.booksIgst || 0) + (i.booksCgst || 0) + (i.booksSgst || 0), 0);
  const mismatchCount = items.length - matchedCount - booksOnlyCount - statementOnlyCount - itcReversedCount;

  return {
    items,
    summary: {
      totalRecords: items.length,
      matchedCount,
      mismatchCount,
      booksOnlyCount,
      statementOnlyCount,
      itcReversedCount,
      itcReversedAmount: Math.round(itcReversedAmount * 100) / 100,
    },
  };
}

/**
 * Reconcile GSTR-2A vs GSTR-2B
 */
export function reconcile2Avs2B(
  gstr2a: any[],
  gstr2b: any[],
  tolerances: Tolerances = DEFAULT_TOLERANCES
) {
  const results: any[] = [];
  const matched2BIds = new Set<string>();

  const bMap = new Map<string, any[]>();
  for (const b of gstr2b) {
    const key = `${normalizeGstin(b.gstin)}_${normalizeInvoiceNumber(b.invoiceNumber)}_${b.fy}`;
    if (!bMap.has(key)) bMap.set(key, []);
    bMap.get(key)!.push(b);
  }

  for (const a of gstr2a) {
    const key = `${normalizeGstin(a.gstin)}_${normalizeInvoiceNumber(a.invoiceNumber)}_${a.fy}`;
    const candidates = bMap.get(key)?.filter((b) => !matched2BIds.has(b.id)) || [];

    if (candidates.length > 0) {
      const b = candidates[0];
      matched2BIds.add(b.id);

      const diffTaxable = Math.round(((a.taxableValue || 0) - (b.taxableValue || 0)) * 100) / 100;
      const diffTax = Math.round((((a.igst || 0) + (a.cgst || 0) + (a.sgst || 0)) - ((b.igst || 0) + (b.cgst || 0) + (b.sgst || 0))) * 100) / 100;

      let status = "Present in Both";
      if (a.amendmentStatus || b.amendmentStatus) {
        status = "Amended";
      } else if (a.docType === "CRN" || a.docType === "CN" || b.docType === "CRN") {
        status = "Credit Note";
      } else if (a.docType === "DBN" || a.docType === "DN" || b.docType === "DBN") {
        status = "Debit Note";
      } else if (Math.abs(diffTaxable) > tolerances.taxableTolerance || Math.abs(diffTax) > tolerances.igstTolerance) {
        status = "Tax Difference";
      }

      results.push({
        gstin: a.gstin,
        supplier: a.supplierName || b.supplierName,
        invoiceNumber: a.invoiceNumber,
        invoiceDate: a.invoiceDate,
        taxableValueA: a.taxableValue,
        taxableValueB: b.taxableValue,
        igstA: a.igst,
        cgstA: a.cgst,
        sgstA: a.sgst,
        igstB: b.igst,
        cgstB: b.cgst,
        sgstB: b.sgst,
        diffTax,
        status,
      });
    } else {
      results.push({
        gstin: a.gstin,
        supplier: a.supplierName,
        invoiceNumber: a.invoiceNumber,
        invoiceDate: a.invoiceDate,
        taxableValueA: a.taxableValue,
        taxableValueB: 0,
        igstA: a.igst,
        cgstA: a.cgst,
        sgstA: a.sgst,
        igstB: 0,
        cgstB: 0,
        sgstB: 0,
        diffTax: (a.igst || 0) + (a.cgst || 0) + (a.sgst || 0),
        status: "2A Only",
      });
    }
  }

  for (const b of gstr2b) {
    if (!matched2BIds.has(b.id)) {
      results.push({
        gstin: b.gstin,
        supplier: b.supplierName,
        invoiceNumber: b.invoiceNumber,
        invoiceDate: b.invoiceDate,
        taxableValueA: 0,
        taxableValueB: b.taxableValue,
        igstA: 0,
        cgstA: 0,
        sgstA: 0,
        igstB: b.igst,
        cgstB: b.cgst,
        sgstB: b.sgst,
        diffTax: -((b.igst || 0) + (b.cgst || 0) + (b.sgst || 0)),
        status: "2B Only",
      });
    }
  }

  return results;
}

/**
 * Reconcile GSTR-2B vs GSTR-3B (Monthly)
 */
export function reconcile2Bvs3B(gstr2b: any[], gstr3b: any[]) {
  // Aggregate 2B by month
  const monthly2b = new Map<string, { igst: number; cgst: number; sgst: number; cess: number; total: number }>();
  
  for (const b of gstr2b) {
    const m = b.month || "Unknown";
    if (!monthly2b.has(m)) {
      monthly2b.set(m, { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 });
    }
    // Only add if ITC is eligible
    if (b.itcEligible !== false && b.itcAvailability !== "N") {
      const cur = monthly2b.get(m)!;
      cur.igst += b.igst || 0;
      cur.cgst += b.cgst || 0;
      cur.sgst += b.sgst || 0;
      cur.cess += b.cess || 0;
      cur.total += (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0) + (b.cess || 0);
    }
  }

  // All distinct months
  const allMonths = Array.from(new Set([...Array.from(monthly2b.keys()), ...gstr3b.map((r) => r.month)])).filter(Boolean);

  const results = allMonths.map((m) => {
    const bData = monthly2b.get(m) || { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 };
    const r3b = gstr3b.find((r) => r.month === m);

    const igstClaimed = r3b?.igstClaimed || 0;
    const cgstClaimed = r3b?.cgstClaimed || 0;
    const sgstClaimed = r3b?.sgstClaimed || 0;
    const cessClaimed = r3b?.cessClaimed || 0;
    const totalClaimed = r3b?.totalClaimed || (igstClaimed + cgstClaimed + sgstClaimed + cessClaimed);
    const itcReversed = r3b?.itcReversed || 0;
    const netItc = r3b?.netItc || (totalClaimed - itcReversed);

    const diff = Math.round((netItc - bData.total) * 100) / 100;
    const unclaimedItc = diff < 0 ? Math.abs(diff) : 0;
    const potentialExcess = diff > 0 ? diff : 0;

    let remarks = "Reconciled";
    if (potentialExcess > 1) {
      remarks = `Potential excess ITC claimed in 3B by ₹${potentialExcess.toFixed(2)}`;
    } else if (unclaimedItc > 1) {
      remarks = `Unclaimed eligible ITC available in 2B by ₹${unclaimedItc.toFixed(2)}`;
    }

    return {
      month: m,
      bIgst: Math.round(bData.igst * 100) / 100,
      bCgst: Math.round(bData.cgst * 100) / 100,
      bSgst: Math.round(bData.sgst * 100) / 100,
      bTotalItc: Math.round(bData.total * 100) / 100,
      claimedIgst: Math.round(igstClaimed * 100) / 100,
      claimedCgst: Math.round(cgstClaimed * 100) / 100,
      claimedSgst: Math.round(sgstClaimed * 100) / 100,
      totalClaimed: Math.round(totalClaimed * 100) / 100,
      itcReversed: Math.round(itcReversed * 100) / 100,
      netItc: Math.round(netItc * 100) / 100,
      difference: diff,
      unclaimedItc,
      potentialExcess,
      remarks,
    };
  });

  return results;
}
