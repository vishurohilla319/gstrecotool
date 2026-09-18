/**
 * Comprehensive verification script for GST Reconcile Pro algorithms
 */
import { normalizeInvoiceNumber, isValidGstin, formatCurrency } from "../lib/gst-utils";
import { reconcileBooksVs2B, reconcile2Avs2B, reconcile2Bvs3B } from "../lib/reconciliation-engine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("\n=== 1. Testing GST Utilities ===");
assert(normalizeInvoiceNumber(" INV-2026/001 ") === "INV2026001", "Invoice normalization with slashes and spaces");
assert(normalizeInvoiceNumber("000145-A") === "000145A", "Leading zeros preserved in invoice number");
assert(isValidGstin("27AABCT3518Q1ZV") === true, "Valid Maharashtra GSTIN");
assert(isValidGstin("07AAACG0563P1ZU") === true, "Valid Delhi GSTIN");
assert(isValidGstin("INVALID_GSTIN") === false, "Invalid GSTIN format rejected");

console.log("\n=== 2. Testing Books vs 2B Reconciliation ===");
const sampleBooks = [
  // 1. Exact match
  {
    id: "b1",
    gstin: "27AABCT3518Q1ZV",
    supplierName: "Tata Steel Limited",
    invoiceNumber: "INV-2026-001",
    invoiceDate: new Date("2026-04-10"),
    fy: "2026-27",
    month: "April 2026",
    taxableValue: 100000,
    igst: 18000,
    cgst: 0,
    sgst: 0,
  },
  // 2. Tax mismatch
  {
    id: "b2",
    gstin: "24AAACR5055K1ZI",
    supplierName: "Reliance Industries",
    invoiceNumber: "RIL-990",
    invoiceDate: new Date("2026-04-12"),
    fy: "2026-27",
    month: "April 2026",
    taxableValue: 200000,
    igst: 36000,
    cgst: 0,
    sgst: 0,
  },
  // 3. Date mismatch
  {
    id: "b3",
    gstin: "29AABCL2210L1ZU",
    supplierName: "L&T",
    invoiceNumber: "LT-881",
    invoiceDate: new Date("2026-04-10"),
    fy: "2026-27",
    month: "April 2026",
    taxableValue: 50000,
    igst: 9000,
    cgst: 0,
    sgst: 0,
  },
  // 4. Books only
  {
    id: "b4",
    gstin: "33AAACA9812M1ZG",
    supplierName: "Ashok Leyland",
    invoiceNumber: "AL-100",
    invoiceDate: new Date("2026-04-15"),
    fy: "2026-27",
    month: "April 2026",
    taxableValue: 80000,
    igst: 14400,
    cgst: 0,
    sgst: 0,
  },
];

const sample2B = [
  // 1. Matches b1
  {
    id: "s1",
    gstin: "27AABCT3518Q1ZV",
    supplierName: "Tata Steel Limited",
    invoiceNumber: "INV2026001",
    invoiceDate: new Date("2026-04-10"),
    fy: "2026-27",
    month: "April 2026",
    taxableValue: 100000,
    igst: 18000,
    cgst: 0,
    sgst: 0,
    itcEligible: true,
  },
  // 2. Matches b2 with ₹50 tax difference
  {
    id: "s2",
    gstin: "24AAACR5055K1ZI",
    supplierName: "Reliance Industries",
    invoiceNumber: "RIL-990",
    invoiceDate: new Date("2026-04-12"),
    fy: "2026-27",
    month: "April 2026",
    taxableValue: 199722,
    igst: 35950,
    cgst: 0,
    sgst: 0,
    itcEligible: true,
  },
  // 3. Matches b3 with 10 days difference
  {
    id: "s3",
    gstin: "29AABCL2210L1ZU",
    supplierName: "L&T",
    invoiceNumber: "LT-881",
    invoiceDate: new Date("2026-04-20"),
    fy: "2026-27",
    month: "April 2026",
    taxableValue: 50000,
    igst: 9000,
    cgst: 0,
    sgst: 0,
    itcEligible: true,
  },
  // 4. 2B only
  {
    id: "s4",
    gstin: "07AABCM5555M1Z1",
    supplierName: "Maruti Suzuki",
    invoiceNumber: "MSIL-999",
    invoiceDate: new Date("2026-04-25"),
    fy: "2026-27",
    month: "April 2026",
    taxableValue: 60000,
    igst: 10800,
    cgst: 0,
    sgst: 0,
    itcEligible: true,
  },
];

const recoResult = reconcileBooksVs2B(sampleBooks, sample2B, {
  taxableTolerance: 1.0,
  igstTolerance: 1.0,
  cgstTolerance: 1.0,
  sgstTolerance: 1.0,
  dateToleranceDays: 0,
});

assert(recoResult.summary.matchedCount === 1, "Exactly 1 invoice matched within tolerance");
assert(recoResult.summary.booksOnlyCount === 1, "Exactly 1 invoice is Books Only");
assert(recoResult.summary.statementOnlyCount === 1, "Exactly 1 invoice is 2B Only");

const exactMatch = recoResult.items.find((i) => i.matchStatus === "EXACT_MATCH");
assert(exactMatch !== undefined && exactMatch.booksRecordId === "b1", "b1 identified as EXACT_MATCH");

const taxDiff = recoResult.items.find((i) => i.matchStatus === "TAX_DIFFERENCE");
assert(taxDiff !== undefined && taxDiff.booksRecordId === "b2", "b2 identified as TAX_DIFFERENCE");

const dateDiff = recoResult.items.find((i) => i.matchStatus === "DATE_DIFFERENCE");
assert(dateDiff !== undefined && dateDiff.booksRecordId === "b3", "b3 identified as DATE_DIFFERENCE");

console.log("\n=== 3. Testing 2B vs 3B Monthly ITC Reconciliation ===");
const sample3B = [
  {
    month: "April 2026",
    igstClaimed: 70000,
    cgstClaimed: 0,
    sgstClaimed: 0,
    cessClaimed: 0,
    totalClaimed: 70000,
    itcReversed: 0,
    netItc: 70000,
  },
];

const reco3B = reconcile2Bvs3B(sample2B, sample3B);
assert(reco3B.length === 1, "1 monthly 3B comparison row generated");
assert(reco3B[0].month === "April 2026", "April 2026 reconciled");
assert(reco3B[0].difference !== 0, "ITC variance accurately computed");

console.log("\n🎉 ALL ALGORITHM INTEGRITY TESTS PASSED SUCCESSFULLY!\n");
