# GST Reconcile Pro

Enterprise GST Reconciliation & Audit Web Application for Indian Chartered Accountants, Tax Practitioners, CFOs, and Enterprises.

Designed specifically for reconciling:
1. **Purchase Books / Register** (Inward invoices from ERP/Tally/SAP)
2. **GSTR-2A** (Dynamic live supplier filings)
3. **GSTR-2B** (Static monthly auto-drafted ITC statement under Section 16(2)(aa))
4. **GSTR-3B** (Summary return filed under Table 4 for ITC claimed and reversed)

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server & Client Components)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS, Lucide Icons
- **Database**: PostgreSQL / **Neon Serverless PostgreSQL** via Prisma ORM
- **Authentication**: Signed JWT session cookies (HTTP-only, SameSite), bcrypt password hashing, Role-Based Access Control (`SUPER_ADMIN`, `ADMIN`, `ACCOUNTANT`, `VIEWER`), and organization data isolation
- **Spreadsheet Engine**: SheetJS (`xlsx`) for parsing `.xlsx`, `.xls`, `.csv`, column auto-mapping, data validation, and export
- **Charts & Analytics**: Recharts (Monthly ITC comparison, reconciliation status donut)

---

## Quick Start Guide

### 1. Database Connection (Neon PostgreSQL)

1. Create a free PostgreSQL project at [Neon Console](https://console.neon.tech).
2. Copy your connection string. It will look like:
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sweet-glade-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   ```
3. Open or create `.env` in the project root:
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sweet-glade-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   JWT_SECRET="gst-reconcile-pro-jwt-secret-key-32chars-min-enterprise!!"
   NEXT_PUBLIC_APP_NAME="GST Reconcile Pro"
   ```
4. Push the schema to your Neon database:
   ```bash
   npx prisma db push
   ```

### 2. Launch Development Server

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Instant Demo Mode & Credentials

To test the application immediately with realistic Indian GST data, launch the app and log in using the pre-configured credentials:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@gstreconcile.com` | `Admin@1234` | Full workspace management, tolerances, user invitations |
| **Accountant** | `accountant@gstreconcile.com` | `Accountant@1234` | Uploads, reconciliation runs, manual matches, reports |
| **Auditor (Viewer)** | `viewer@gstreconcile.com` | `Viewer@1234` | Read-only access to dashboard and reports |

Once logged in, click the **"Load Demo Dataset"** button on the top navigation bar to populate:
- 9 Purchase Register invoices (Tata Steel, Infosys, Reliance, L&T, Havells, Maruti Suzuki, VRL Logistics, etc.)
- GSTR-2A live entries with amendments and credit notes
- GSTR-2B monthly statement with exact matches, ₹50 tax differences, date mismatches, duplicate entries, Section 17(5) blocked credits, and RCM transactions
- GSTR-3B monthly return filings

---

## Core Features & Workflow

### 1. Multi-Step Data Import Wizard (`/import`)
- **Step 1**: Choose dataset (Purchase Books, 2A, 2B, 3B).
- **Step 2**: Drag-and-drop `.xlsx`, `.xls`, or `.csv` files.
- **Step 3**: Pre-import preview of row count and detected columns.
- **Step 4**: Dynamic column mapping with intelligent alias auto-detection.
- **Step 5**: GST integrity validation (15-character GSTIN format, valid date parsing, duplicate invoice detection, negative numbers). Downloadable error spreadsheet.
- **Step 6**: Batch database insertion under organization multi-tenancy.

### 2. Reconciliation Engine (`/reconciliation/books-vs-2b`)
- **Normalized Keys**: Invoice numbers are normalized as text (spaces trimmed, slashes/dashes handled, leading zeros strictly preserved).
- **Matching Levels**:
  - `EXACT_MATCH`: Invoice found in both Books and 2B within configured tolerances.
  - `TAX_DIFFERENCE`: Invoice matches by GSTIN + Number, but tax differs by > configured tolerance (e.g. ₹1.00).
  - `DATE_DIFFERENCE`: Invoice found within tax tolerance, but invoice date differs by > date tolerance.
  - `BOOKS_ONLY`: Recorded in Books but missing from 2B (vendor failed to file GSTR-1).
  - `STATEMENT_ONLY`: In 2B but missing from Books (unbooked inward supply).
  - `DUPLICATE`: Multiple entries in Books or 2B.
  - `ITC_INELIGIBLE`: Ineligible credit under Section 17(5) (e.g., motor vehicles, food & beverages).
  - `RCM`: Reverse Charge Mechanism transactions requiring cash payment before credit.
  - `MANUAL_REVIEW`: Fuzzy match candidate (similarity $\ge 80\%$ or amount match under same vendor).
  - `MANUAL_MATCHED`: User confirmed match with audit trail.

### 3. Precision Tolerances (`/settings`)
- Configurable Taxable Value Tolerance (default ₹1.00).
- Configurable IGST, CGST, and SGST tolerances (default ₹1.00).
- Configurable Date tolerance (0 days, 3 days, 7 days, 30 days).

### 4. 2A vs 2B & 2B vs 3B Comparison
- **2A vs 2B (`/reconciliation/2a-vs-2b`)**: Audits vendor filing timing differences and credit/debit notes.
- **2B vs 3B (`/reconciliation/2b-vs-3b`)**: Compares monthly eligible 2B credit with actual 3B availed credit to identify **Unclaimed ITC** and **Potential Excess ITC Claimed** under Section 16(2)(aa).

### 5. Audit & Exception Reports (`/reports`)
- **Supplier Report**: Vendor-wise aggregation with click-to-drilldown modal showing invoice-level reconciliation.
- **Month-wise Report**: Monthly matrix across all 4 GST sources.
- **Exception Report**: Prioritized list (Critical, High, Medium, Low) of actionable variances.
- **ITC Eligibility Report**: Section 17(5) blocked credit breakdown.
- **Export**: Universal Excel (.xlsx) and CSV (.csv) export for all registers and reports.

### 6. Activity & Audit Trail (`/activity`)
- Immutable log tracking logins, file imports, reconciliation runs, manual matches, settings changes, and user management.

---

## Deployment to Vercel

1. Push your repository to GitHub / GitLab.
2. In Vercel, import the repository.
3. Configure the Environment Variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `JWT_SECRET`: A secure 32+ character random secret string.
   - `NEXT_PUBLIC_APP_NAME`: `GST Reconcile Pro`
4. Deploy! The build command `npm run build` runs `prisma generate && next build` automatically.
