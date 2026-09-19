// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require("pdf-parse");

export interface ParsedGstr3B {
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  fy: string;
  month: string;
  igstClaimed: number;
  cgstClaimed: number;
  sgstClaimed: number;
  cessClaimed: number;
  totalClaimed: number;
  itcReversed: number;
  netItc: number;
  rawSummary?: string;
}

function parseIndianNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

const MONTH_NAMES = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

export async function parseGstr3BPdf(buffer: Buffer): Promise<ParsedGstr3B> {
  let text = "";
  try {
    if (pdf && pdf.PDFParse) {
      const parser = new pdf.PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result?.text || (typeof result === "string" ? result : "");
    } else if (typeof pdf === "function") {
      const result = await pdf(buffer);
      text = result?.text || "";
    } else if (typeof pdf?.default === "function") {
      const result = await pdf.default(buffer);
      text = result?.text || "";
    } else {
      throw new Error("PDF parser module is not initialized");
    }
  } catch (err: any) {
    console.error("PDF parse error:", err);
    throw new Error("Failed to extract text from PDF: " + err.message);
  }

  // 1. Extract GSTIN
  const gstinMatch = text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/);
  const gstin = gstinMatch ? gstinMatch[1] : undefined;

  // 2. Extract FY (e.g. 2026-27 or 2025-26)
  const fyMatch =
    text.match(/(?:Financial\s*Year|FY|Year)[\s:]*([0-9]{4}\s*-\s*[0-9]{2,4})/i) ||
    text.match(/\b(202[0-9]-[0-9]{2})\b/);
  const fy = fyMatch ? fyMatch[1].replace(/\s+/g, "") : "2026-27";

  // 3. Extract Month
  let month = "";
  for (const m of MONTH_NAMES) {
    const reg = new RegExp(`\\b${m}\\b`, "i");
    if (reg.test(text)) {
      month = m;
      break;
    }
  }

  if (!month) {
    const periodMatch = text.match(/(?:Tax\s*Period|Period|Month)[\s:]*([0-9]{2})\/([0-9]{4})/i);
    if (periodMatch) {
      const monthNum = parseInt(periodMatch[1], 10);
      const monthMap: Record<number, string> = {
        1: "January",
        2: "February",
        3: "March",
        4: "April",
        5: "May",
        6: "June",
        7: "July",
        8: "August",
        9: "September",
        10: "October",
        11: "November",
        12: "December",
      };
      month = monthMap[monthNum] || "Unknown";
    }
  }

  if (!month) month = "May";

  // 4. Extract Table 4 ITC numbers
  let igstClaimed = 0;
  let cgstClaimed = 0;
  let sgstClaimed = 0;
  let cessClaimed = 0;
  let totalClaimed = 0;
  let itcReversed = 0;
  let netItc = 0;

  const netItcMatch = text.match(
    /(?:Net\s*ITC\s*Available|\(C\)\s*Net\s*ITC)[\s\S]*?([0-9,]+\.[0-9]{2})[\s\S]*?([0-9,]+\.[0-9]{2})[\s\S]*?([0-9,]+\.[0-9]{2})/i
  );
  const allOtherItcMatch = text.match(
    /(?:\(5\)\s*All\s*other\s*ITC|All\s*other\s*ITC)[\s\S]*?([0-9,]+\.[0-9]{2})[\s\S]*?([0-9,]+\.[0-9]{2})[\s\S]*?([0-9,]+\.[0-9]{2})/i
  );
  const reversedMatch = text.match(
    /(?:\(B\)\s*ITC\s*Reversed|ITC\s*Reversed)[\s\S]*?([0-9,]+\.[0-9]{2})[\s\S]*?([0-9,]+\.[0-9]{2})[\s\S]*?([0-9,]+\.[0-9]{2})/i
  );

  if (allOtherItcMatch) {
    igstClaimed = parseIndianNumber(allOtherItcMatch[1]);
    cgstClaimed = parseIndianNumber(allOtherItcMatch[2]);
    sgstClaimed = parseIndianNumber(allOtherItcMatch[3]);
    totalClaimed = Math.round((igstClaimed + cgstClaimed + sgstClaimed + cessClaimed) * 100) / 100;
  }

  if (reversedMatch) {
    const revIgst = parseIndianNumber(reversedMatch[1]);
    const revCgst = parseIndianNumber(reversedMatch[2]);
    const revSgst = parseIndianNumber(reversedMatch[3]);
    itcReversed = Math.round((revIgst + revCgst + revSgst) * 100) / 100;
  }

  if (netItcMatch) {
    const netIgst = parseIndianNumber(netItcMatch[1]);
    const netCgst = parseIndianNumber(netItcMatch[2]);
    const netSgst = parseIndianNumber(netItcMatch[3]);
    netItc = Math.round((netIgst + netCgst + netSgst) * 100) / 100;
  } else {
    netItc = Math.round((totalClaimed - itcReversed) * 100) / 100;
  }

  if (totalClaimed === 0 && netItc > 0) {
    totalClaimed = Math.round((netItc + itcReversed) * 100) / 100;
  }

  return {
    gstin,
    fy,
    month,
    igstClaimed,
    cgstClaimed,
    sgstClaimed,
    cessClaimed,
    totalClaimed,
    itcReversed,
    netItc,
    rawSummary: text.substring(0, 1000),
  };
}
