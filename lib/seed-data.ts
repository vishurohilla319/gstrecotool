import { prisma } from "./prisma";
import { hashPassword } from "./auth";
import { reconcileBooksVs2B } from "./reconciliation-engine";

export async function seedDemoData(targetOrgId?: string) {
  // Ensure organization first
  let org;
  if (targetOrgId) {
    org = await prisma.organization.findUnique({ where: { id: targetOrgId } });
  }
  
  if (!org) {
    org = await prisma.organization.findFirst({
      where: { name: "Apex Enterprises Pvt Ltd" },
    });
  }

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Apex Enterprises Pvt Ltd",
        gstin: "27AABCA1234C1Z5",
        pan: "AABCA1234C",
        address: "Unit 402, Nariman Point, Mumbai, Maharashtra 400021",
        email: "finance@apexenterprises.in",
        phone: "+91 22 6677 8899",
        currentFy: "2026-27",
      },
    });
  }

  // 1. GENUINE ADMIN USER
  const adminPasswordHash = await hashPassword("Admin@1234");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@gstreconcile.com" },
    update: { passwordHash: adminPasswordHash, activeOrgId: org.id },
    create: {
      email: "admin@gstreconcile.com",
      name: "CA Rohit Sharma",
      passwordHash: adminPasswordHash,
      mobile: "9876543210",
      role: "ADMIN",
      isVerified: true,
      activeOrgId: org.id,
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: adminUser.id } },
    update: { role: "ADMIN" },
    create: { organizationId: org.id, userId: adminUser.id, role: "ADMIN" },
  });

  // 2. GENUINE ACCOUNTANT USER
  const accountantPasswordHash = await hashPassword("Accountant@1234");
  const accountantUser = await prisma.user.upsert({
    where: { email: "accountant@gstreconcile.com" },
    update: { passwordHash: accountantPasswordHash, activeOrgId: org.id },
    create: {
      email: "accountant@gstreconcile.com",
      name: "Sneha Patel (Accountant)",
      passwordHash: accountantPasswordHash,
      mobile: "9820012345",
      role: "ACCOUNTANT",
      isVerified: true,
      activeOrgId: org.id,
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: accountantUser.id } },
    update: { role: "ACCOUNTANT" },
    create: { organizationId: org.id, userId: accountantUser.id, role: "ACCOUNTANT" },
  });

  // 3. GENUINE AUDITOR / VIEWER USER
  const viewerPasswordHash = await hashPassword("Viewer@1234");
  const viewerUser = await prisma.user.upsert({
    where: { email: "viewer@gstreconcile.com" },
    update: { passwordHash: viewerPasswordHash, activeOrgId: org.id },
    create: {
      email: "viewer@gstreconcile.com",
      name: "Amit Verma (Auditor)",
      passwordHash: viewerPasswordHash,
      mobile: "9811223344",
      role: "VIEWER",
      isVerified: true,
      activeOrgId: org.id,
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: viewerUser.id } },
    update: { role: "VIEWER" },
    create: { organizationId: org.id, userId: viewerUser.id, role: "VIEWER" },
  });

  // 4. GENUINE SUPER ADMIN USER
  const superPasswordHash = await hashPassword("Super@1234");
  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@gstreconcile.com" },
    update: { passwordHash: superPasswordHash, activeOrgId: org.id },
    create: {
      email: "superadmin@gstreconcile.com",
      name: "Vikramaditya Rao (Super Admin)",
      passwordHash: superPasswordHash,
      mobile: "9900112233",
      role: "SUPER_ADMIN",
      isVerified: true,
      activeOrgId: org.id,
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: superAdminUser.id } },
    update: { role: "SUPER_ADMIN" },
    create: { organizationId: org.id, userId: superAdminUser.id, role: "SUPER_ADMIN" },
  });

  // Ensure Settings
  await prisma.settings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      taxableTolerance: 1.0,
      igstTolerance: 1.0,
      cgstTolerance: 1.0,
      sgstTolerance: 1.0,
      dateToleranceDays: 0,
      defaultFy: "2026-27",
    },
  });

  // Clean old records for clean demo run
  await prisma.reconciliationItem.deleteMany({ where: { organizationId: org.id } });
  await prisma.reconciliationRun.deleteMany({ where: { organizationId: org.id } });
  await prisma.purchaseBook.deleteMany({ where: { organizationId: org.id } });
  await prisma.gstr2A.deleteMany({ where: { organizationId: org.id } });
  await prisma.gstr2B.deleteMany({ where: { organizationId: org.id } });
  await prisma.gstr3B.deleteMany({ where: { organizationId: org.id } });

  const fy = "2026-27";
  const mApril = "April 2026";
  const mMay = "May 2026";
  const mJune = "June 2026";

  // 1. PURCHASE BOOKS
  const booksData = [
    // Exact match 1
    {
      gstin: "27AABCT3518Q1ZV",
      supplierName: "Tata Steel Limited",
      invoiceNumber: "TSL/2026/001",
      normalizedInvoiceNumber: "TSL2026001",
      invoiceDate: new Date("2026-04-10"),
      fy,
      month: mApril,
      taxableValue: 500000,
      igst: 90000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 90000,
      invoiceValue: 590000,
      pos: "27-Maharashtra",
      rcm: false,
      itcEligible: true,
      uniqueKey: "27AABCT3518Q1ZV_TSL2026001_2026",
    },
    // Exact match 2
    {
      gstin: "07AAACG0563P1ZU",
      supplierName: "Infosys Technologies",
      invoiceNumber: "INF/26-27/102",
      normalizedInvoiceNumber: "INF2627102",
      invoiceDate: new Date("2026-04-14"),
      fy,
      month: mApril,
      taxableValue: 120000,
      igst: 0,
      cgst: 10800,
      sgst: 10800,
      cess: 0,
      totalTax: 21600,
      invoiceValue: 141600,
      pos: "07-Delhi",
      rcm: false,
      itcEligible: true,
      uniqueKey: "07AAACG0563P1ZU_INF2627102_2026",
    },
    // Tax mismatch: Books tax is 36,000, 2B tax is 35,920 (Diff ₹80)
    {
      gstin: "24AAACR5055K1ZI",
      supplierName: "Reliance Industries Ltd",
      invoiceNumber: "RIL-INV-8891",
      normalizedInvoiceNumber: "RILINV8891",
      invoiceDate: new Date("2026-04-18"),
      fy,
      month: mApril,
      taxableValue: 200000,
      igst: 36000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 36000,
      invoiceValue: 236000,
      pos: "24-Gujarat",
      rcm: false,
      itcEligible: true,
      uniqueKey: "24AAACR5055K1ZI_RILINV8891_2026",
    },
    // Date mismatch: Books date is 2026-04-20, 2B date is 2026-04-25
    {
      gstin: "29AABCL2210L1ZU",
      supplierName: "Larsen & Toubro Ltd",
      invoiceNumber: "LT/BLR/9002",
      normalizedInvoiceNumber: "LTBLR9002",
      invoiceDate: new Date("2026-04-20"),
      fy,
      month: mApril,
      taxableValue: 350000,
      igst: 63000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 63000,
      invoiceValue: 413000,
      pos: "29-Karnataka",
      rcm: false,
      itcEligible: true,
      uniqueKey: "29AABCL2210L1ZU_LTBLR9002_2026",
    },
    // Duplicate in Books
    {
      gstin: "06AAACH1118A1ZH",
      supplierName: "Havells India Ltd",
      invoiceNumber: "HVL-4421",
      normalizedInvoiceNumber: "HVL4421",
      invoiceDate: new Date("2026-04-24"),
      fy,
      month: mApril,
      taxableValue: 80000,
      igst: 14400,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 14400,
      invoiceValue: 94400,
      pos: "06-Haryana",
      rcm: false,
      itcEligible: true,
      uniqueKey: "06AAACH1118A1ZH_HVL4421_2026",
    },
    {
      gstin: "06AAACH1118A1ZH",
      supplierName: "Havells India Ltd",
      invoiceNumber: "HVL-4421",
      normalizedInvoiceNumber: "HVL4421",
      invoiceDate: new Date("2026-04-24"),
      fy,
      month: mApril,
      taxableValue: 80000,
      igst: 14400,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 14400,
      invoiceValue: 94400,
      pos: "06-Haryana",
      rcm: false,
      itcEligible: true,
      uniqueKey: "06AAACH1118A1ZH_HVL4421_2026_DUP",
    },
    // Books Only invoice (Supplier forgot to file GSTR-1)
    {
      gstin: "33AAACA9812M1ZG",
      supplierName: "Ashok Leyland Ltd",
      invoiceNumber: "AL-CHE-7701",
      normalizedInvoiceNumber: "ALCHE7701",
      invoiceDate: new Date("2026-04-28"),
      fy,
      month: mApril,
      taxableValue: 420000,
      igst: 75600,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 75600,
      invoiceValue: 495600,
      pos: "33-Tamil Nadu",
      rcm: false,
      itcEligible: true,
      uniqueKey: "33AAACA9812M1ZG_ALCHE7701_2026",
    },
    // ITC Ineligible (Car purchase / Sec 17(5) blocked credit)
    {
      gstin: "07AABCM5555M1Z1",
      supplierName: "Maruti Suzuki India",
      invoiceNumber: "MSIL-CAR-109",
      normalizedInvoiceNumber: "MSILCAR109",
      invoiceDate: new Date("2026-05-02"),
      fy,
      month: mMay,
      taxableValue: 850000,
      igst: 238000,
      cgst: 0,
      sgst: 0,
      cess: 25500,
      totalTax: 263500,
      invoiceValue: 1113500,
      pos: "07-Delhi",
      rcm: false,
      itcEligible: false,
      itcIneligible: true,
      uniqueKey: "07AABCM5555M1Z1_MSILCAR109_2026",
    },
    // RCM Invoice
    {
      gstin: "27AAACW9988P1Z3",
      supplierName: "VRL Logistics Transport",
      invoiceNumber: "VRL/MUM/339",
      normalizedInvoiceNumber: "VRLMUM339",
      invoiceDate: new Date("2026-05-12"),
      fy,
      month: mMay,
      taxableValue: 40000,
      igst: 2000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 2000,
      invoiceValue: 42000,
      pos: "27-Maharashtra",
      rcm: true,
      itcEligible: true,
      uniqueKey: "27AAACW9988P1Z3_VRLMUM339_2026",
    },
  ];

  for (const b of booksData) {
    await prisma.purchaseBook.create({
      data: { ...b, organizationId: org.id },
    });
  }

  // 2. GSTR-2B
  const gstr2bData = [
    // Match 1
    {
      gstin: "27AABCT3518Q1ZV",
      supplierName: "Tata Steel Limited",
      invoiceNumber: "TSL/2026/001",
      normalizedInvoiceNumber: "TSL2026001",
      invoiceDate: new Date("2026-04-10"),
      fy,
      month: mApril,
      taxableValue: 500000,
      igst: 90000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      invoiceValue: 590000,
      itcAvailability: "Y",
      itcEligible: true,
      rcm: false,
      uniqueKey: "27AABCT3518Q1ZV_TSL2026001_2026",
    },
    // Match 2
    {
      gstin: "07AAACG0563P1ZU",
      supplierName: "Infosys Technologies",
      invoiceNumber: "INF/26-27/102",
      normalizedInvoiceNumber: "INF2627102",
      invoiceDate: new Date("2026-04-14"),
      fy,
      month: mApril,
      taxableValue: 120000,
      igst: 0,
      cgst: 10800,
      sgst: 10800,
      cess: 0,
      invoiceValue: 141600,
      itcAvailability: "Y",
      itcEligible: true,
      rcm: false,
      uniqueKey: "07AAACG0563P1ZU_INF2627102_2026",
    },
    // Tax mismatch: 2B has 35,920 instead of 36,000
    {
      gstin: "24AAACR5055K1ZI",
      supplierName: "Reliance Industries Ltd",
      invoiceNumber: "RIL-INV-8891",
      normalizedInvoiceNumber: "RILINV8891",
      invoiceDate: new Date("2026-04-18"),
      fy,
      month: mApril,
      taxableValue: 199555,
      igst: 35920,
      cgst: 0,
      sgst: 0,
      cess: 0,
      invoiceValue: 235475,
      itcAvailability: "Y",
      itcEligible: true,
      rcm: false,
      uniqueKey: "24AAACR5055K1ZI_RILINV8891_2026",
    },
    // Date mismatch: 2B has 25-04-2026
    {
      gstin: "29AABCL2210L1ZU",
      supplierName: "Larsen & Toubro Ltd",
      invoiceNumber: "LT/BLR/9002",
      normalizedInvoiceNumber: "LTBLR9002",
      invoiceDate: new Date("2026-04-25"),
      fy,
      month: mApril,
      taxableValue: 350000,
      igst: 63000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      invoiceValue: 413000,
      itcAvailability: "Y",
      itcEligible: true,
      rcm: false,
      uniqueKey: "29AABCL2210L1ZU_LTBLR9002_2026",
    },
    // Havells single invoice in 2B
    {
      gstin: "06AAACH1118A1ZH",
      supplierName: "Havells India Ltd",
      invoiceNumber: "HVL-4421",
      normalizedInvoiceNumber: "HVL4421",
      invoiceDate: new Date("2026-04-24"),
      fy,
      month: mApril,
      taxableValue: 80000,
      igst: 14400,
      cgst: 0,
      sgst: 0,
      cess: 0,
      invoiceValue: 94400,
      itcAvailability: "Y",
      itcEligible: true,
      rcm: false,
      uniqueKey: "06AAACH1118A1ZH_HVL4421_2026",
    },
    // ITC Ineligible (Marked N in 2B)
    {
      gstin: "07AABCM5555M1Z1",
      supplierName: "Maruti Suzuki India",
      invoiceNumber: "MSIL-CAR-109",
      normalizedInvoiceNumber: "MSILCAR109",
      invoiceDate: new Date("2026-05-02"),
      fy,
      month: mMay,
      taxableValue: 850000,
      igst: 238000,
      cgst: 0,
      sgst: 0,
      cess: 25500,
      invoiceValue: 1113500,
      itcAvailability: "N",
      itcEligible: false,
      itcIneligible: true,
      rcm: false,
      uniqueKey: "07AABCM5555M1Z1_MSILCAR109_2026",
    },
    // RCM in 2B
    {
      gstin: "27AAACW9988P1Z3",
      supplierName: "VRL Logistics Transport",
      invoiceNumber: "VRL/MUM/339",
      normalizedInvoiceNumber: "VRLMUM339",
      invoiceDate: new Date("2026-05-12"),
      fy,
      month: mMay,
      taxableValue: 40000,
      igst: 2000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      invoiceValue: 42000,
      itcAvailability: "Y",
      itcEligible: true,
      rcm: true,
      uniqueKey: "27AAACW9988P1Z3_VRLMUM339_2026",
    },
    // 2B ONLY Invoice (Vendor uploaded in GSTR-1, but Accountant missed entering in Books!)
    {
      gstin: "27AAACL1966J1ZS",
      supplierName: "Godrej Consumer Products",
      invoiceNumber: "GCPL-INV-9922",
      normalizedInvoiceNumber: "GCPLINV9922",
      invoiceDate: new Date("2026-04-29"),
      fy,
      month: mApril,
      taxableValue: 175000,
      igst: 0,
      cgst: 15750,
      sgst: 15750,
      cess: 0,
      invoiceValue: 206500,
      itcAvailability: "Y",
      itcEligible: true,
      rcm: false,
      uniqueKey: "27AAACL1966J1ZS_GCPLINV9922_2026",
    },
  ];

  for (const s of gstr2bData) {
    await prisma.gstr2B.create({
      data: { ...s, organizationId: org.id },
    });
  }

  // 3. GSTR-2A
  const gstr2aData = [
    {
      gstin: "27AABCT3518Q1ZV",
      supplierName: "Tata Steel Limited",
      invoiceNumber: "TSL/2026/001",
      normalizedInvoiceNumber: "TSL2026001",
      invoiceDate: new Date("2026-04-10"),
      fy,
      month: mApril,
      taxableValue: 500000,
      igst: 90000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      invoiceValue: 590000,
      docType: "INV",
      uniqueKey: "27AABCT3518Q1ZV_TSL2026001_2026_2A",
    },
    {
      gstin: "07AAACG0563P1ZU",
      supplierName: "Infosys Technologies",
      invoiceNumber: "INF/26-27/102",
      normalizedInvoiceNumber: "INF2627102",
      invoiceDate: new Date("2026-04-14"),
      fy,
      month: mApril,
      taxableValue: 120000,
      igst: 0,
      cgst: 10800,
      sgst: 10800,
      cess: 0,
      invoiceValue: 141600,
      docType: "INV",
      uniqueKey: "07AAACG0563P1ZU_INF2627102_2026_2A",
    },
    {
      gstin: "24AAACR5055K1ZI",
      supplierName: "Reliance Industries Ltd",
      invoiceNumber: "RIL-INV-8891",
      normalizedInvoiceNumber: "RILINV8891",
      invoiceDate: new Date("2026-04-18"),
      fy,
      month: mApril,
      taxableValue: 200000,
      igst: 36000,
      cgst: 0,
      sgst: 0,
      cess: 0,
      invoiceValue: 236000,
      docType: "INV",
      amendmentStatus: "Amended in 2B",
      uniqueKey: "24AAACR5055K1ZI_RILINV8891_2026_2A",
    },
    {
      gstin: "27AABCB2020B1Z9",
      supplierName: "Bharat Electronics Ltd",
      invoiceNumber: "BEL/CN/009",
      normalizedInvoiceNumber: "BELCN009",
      invoiceDate: new Date("2026-04-26"),
      fy,
      month: mApril,
      taxableValue: 30000,
      igst: 5400,
      cgst: 0,
      sgst: 0,
      cess: 0,
      invoiceValue: 35400,
      docType: "CRN",
      uniqueKey: "27AABCB2020B1Z9_BELCN009_2026_2A",
    },
  ];

  for (const a of gstr2aData) {
    await prisma.gstr2A.create({
      data: { ...a, organizationId: org.id },
    });
  }

  // 4. GSTR-3B
  const gstr3bData = [
    {
      fy,
      month: mApril,
      igstClaimed: 189000,
      cgstClaimed: 26550,
      sgstClaimed: 26550,
      cessClaimed: 0,
      totalClaimed: 242100,
      itcReversed: 0,
      netItc: 242100,
      remarks: "Filed before due date",
    },
    {
      fy,
      month: mMay,
      igstClaimed: 240000,
      cgstClaimed: 0,
      sgstClaimed: 0,
      cessClaimed: 25500,
      totalClaimed: 265500,
      itcReversed: 263500,
      netItc: 2000,
      remarks: "Sec 17(5) car purchase ITC reversed",
    },
  ];

  for (const t of gstr3bData) {
    await prisma.gstr3B.create({
      data: { ...t, organizationId: org.id },
    });
  }

  // 5. Run Reconciliation Engine and store items
  const loadedBooks = await prisma.purchaseBook.findMany({ where: { organizationId: org.id } });
  const loaded2B = await prisma.gstr2B.findMany({ where: { organizationId: org.id } });

  const reco = reconcileBooksVs2B(loadedBooks, loaded2B, {
    taxableTolerance: 1.0,
    igstTolerance: 1.0,
    cgstTolerance: 1.0,
    sgstTolerance: 1.0,
    dateToleranceDays: 0,
  });

  const run = await prisma.reconciliationRun.create({
    data: {
      organizationId: org.id,
      runType: "BOOKS_VS_2B",
      fy,
      month: mApril,
      totalRecords: reco.summary.totalRecords,
      matchedCount: reco.summary.matchedCount,
      mismatchCount: reco.summary.mismatchCount,
      booksOnlyCount: reco.summary.booksOnlyCount,
      statementOnlyCount: reco.summary.statementOnlyCount,
      runByUserId: adminUser.id,
    },
  });

  for (const item of reco.items) {
    await prisma.reconciliationItem.create({
      data: {
        runId: run.id,
        organizationId: org.id,
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

  return { success: true, organizationId: org.id, runId: run.id };
}
