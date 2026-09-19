/**
 * GST Utility functions for GST Reconcile Pro
 */

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(gstin?: string | null): boolean {
  if (!gstin) return false;
  const cleaned = gstin.trim().toUpperCase();
  return GSTIN_REGEX.test(cleaned);
}

export function normalizeGstin(gstin?: string | null): string {
  if (!gstin) return "";
  return gstin.trim().toUpperCase();
}

/**
 * Normalizes invoice numbers strictly as TEXT:
 * - Trims whitespace
 * - Converts to uppercase
 * - Removes leading / trailing symbols and internal spaces/slashes
 * - Preserves leading zeros (e.g., "0014" != "14")
 * - Treats invoice number as pure string (never parsed as date or float)
 */
export function normalizeInvoiceNumber(invoiceNo?: string | number | null): string {
  if (invoiceNo === undefined || invoiceNo === null) return "";
  const str = String(invoiceNo).trim().toUpperCase();
  // Remove special separator characters that differ across accounting software (e.g. / - _ space)
  return str.replace(/[^A-Z0-9]/g, "");
}

/**
 * Format Indian Currency INR (e.g. ₹1,23,456.78)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format Date to DD-MM-YYYY
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "-";
  }
}

/**
 * Parse date strings in common Indian formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
 */
export function parseDateInput(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // Handle Excel serial date numbers (e.g., 44927)
  if (typeof value === "number") {
    // Excel epoch begins 1900-01-01 (with leap year bug offset ~25569 for 1970)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) return date;
  }

  const str = String(value).trim();
  
  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  // YYYY-MM-DD
  const yyyymmddMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
};

export function getStateNameFromGstin(gstin?: string | null): string {
  if (!gstin || gstin.length < 2) return "Unknown";
  const code = gstin.substring(0, 2);
  return STATE_CODES[code] || "Other State";
}

export const FINANCIAL_YEAR_MONTH_NAMES = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

/**
 * Returns all 12 financial year months (April - March) with respective years.
 * e.g., for "2026-27": April 2026 ... March 2027
 */
export function getMonthsForFinancialYear(fy: string = "2026-27"): string[] {
  const startYear = parseInt(fy.split("-")[0], 10) || 2026;
  const endYear = startYear + 1;
  return [
    `April ${startYear}`,
    `May ${startYear}`,
    `June ${startYear}`,
    `July ${startYear}`,
    `August ${startYear}`,
    `September ${startYear}`,
    `October ${startYear}`,
    `November ${startYear}`,
    `December ${startYear}`,
    `January ${endYear}`,
    `February ${endYear}`,
    `March ${endYear}`,
  ];
}
