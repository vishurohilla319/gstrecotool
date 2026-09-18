"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  RefreshCw,
  Sparkles,
  Check,
  X,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import {
  getDefinitionsForType,
  autoMapColumns,
  validateRows,
  ColumnMappingDefinition,
  ValidationErrorItem,
} from "@/lib/excel-utils";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state: 1 to 6
  const [currentStep, setCurrentStep] = useState(1);
  const [fileType, setFileType] = useState<string>("PURCHASE_BOOKS");
  const [fileName, setFileName] = useState<string>("");
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validRows, setValidRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importCompleted, setImportCompleted] = useState(false);

  const definitions: ColumnMappingDefinition[] = getDefinitionsForType(fileType);

  // Step 2: Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (jsonData.length === 0) {
          alert("Uploaded sheet is empty!");
          return;
        }

        const headers = Object.keys(jsonData[0] as object);
        setDetectedHeaders(headers);
        setRawRows(jsonData);

        // Step 4: Auto map columns
        const mapping = autoMapColumns(headers, definitions);
        setColumnMapping(mapping);

        // Advance to Preview / Mapping
        setCurrentStep(3);
      } catch (err: any) {
        alert("Error parsing file: " + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Step 4 to Step 5: Run validation
  const runValidation = () => {
    const { validRows: valid, errors } = validateRows(rawRows, columnMapping, fileType);
    setValidRows(valid);
    setValidationErrors(errors);
    setCurrentStep(5);
  };

  // Step 6: Commit to Database
  const handleCommitImport = async () => {
    setIsImporting(true);
    setImportProgress(25);

    try {
      setImportProgress(50);
      const res = await fetch("/api/import/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType,
          fileName,
          validRows,
          errors: validationErrors,
        }),
      });

      setImportProgress(85);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process import");

      // Auto trigger reconciliation run
      if (fileType === "PURCHASE_BOOKS" || fileType === "GSTR_2B") {
        await fetch("/api/reconciliation/run", { method: "POST" });
      }

      setImportProgress(100);
      setImportCompleted(true);
      setCurrentStep(6);
    } catch (err: any) {
      alert("Import error: " + err.message);
      setIsImporting(false);
    }
  };

  // Download error report
  const downloadErrorReport = () => {
    if (validationErrors.length === 0) return;
    const errorSheetData = validationErrors.map((err) => ({
      "Row Number": err.rowNumber,
      "Column": err.column || "-",
      "Error Message": err.errorMessage,
      "Raw Data": JSON.stringify(err.rowData),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(errorSheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Import_Errors");
    XLSX.writeFile(wb, `${fileName}_Validation_Errors.xlsx`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Data Import Wizard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Import Excel or CSV registers with intelligent column mapping and GST integrity validation
          </p>
        </div>

        <a
          href={`/api/export?type=${fileType}&format=xlsx`}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
        >
          <Download className="w-3.5 h-3.5" />
          Download Sample Template
        </a>
      </div>

      {/* Wizard Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-6 gap-2 text-center text-xs">
          {[
            { step: 1, label: "1. Select Type" },
            { step: 2, label: "2. Upload File" },
            { step: 3, label: "3. Preview" },
            { step: 4, label: "4. Map Columns" },
            { step: 5, label: "5. Validate" },
            { step: 6, label: "6. Complete" },
          ].map((s) => (
            <div
              key={s.step}
              className={`py-2 rounded-lg font-semibold transition-colors ${
                currentStep === s.step
                  ? "bg-blue-600 text-white shadow-xs"
                  : currentStep > s.step
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-50 text-slate-400"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Select Type */}
      {currentStep === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Step 1: Choose Dataset to Import</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                id: "PURCHASE_BOOKS",
                title: "Purchase Books / Register",
                desc: "Inward invoices recorded in ERP/Tally/SAP for claiming ITC",
                badge: "Primary Source",
              },
              {
                id: "GSTR_2B",
                title: "GSTR-2B Statement",
                desc: "Static monthly auto-drafted ITC statement downloaded from GST Portal",
                badge: "Legal Basis for ITC",
              },
              {
                id: "GSTR_2A",
                title: "GSTR-2A Dynamic Register",
                desc: "Live dynamic view of supplier return filings (GSTR-1/IFF)",
                badge: "Dynamic View",
              },
              {
                id: "GSTR_3B",
                title: "GSTR-3B Monthly Return",
                desc: "Summary ITC claimed and reversed in Table 4 of Form 3B",
                badge: "Return ITC",
              },
            ].map((t) => (
              <div
                key={t.id}
                onClick={() => setFileType(t.id)}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  fileType === t.id
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-sm">{t.title}</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {t.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{t.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Continue to Upload <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Upload File */}
      {currentStep === 2 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Step 2: Upload {fileType.replace(/_/g, " ")} File
            </h2>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-12 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Click to browse or drag and drop spreadsheet
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Maximum file size: 50MB
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Preview */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 3: File Preview & Statistics</h2>
              <p className="text-xs text-slate-500">File: {fileName}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Re-upload
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Proceed to Column Mapping <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Rows Detected</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{rawRows.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Detected Columns</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{detectedHeaders.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Mapped System Fields</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {Object.keys(columnMapping).length} / {definitions.length}
              </p>
            </div>
          </div>

          {/* Raw Table Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700">
              First 5 Rows Preview
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    {detectedHeaders.map((h, i) => (
                      <th key={i} className="px-3 py-2 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rawRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {detectedHeaders.map((h, i) => (
                        <td key={i} className="px-3 py-2 whitespace-nowrap text-slate-700">
                          {String(row[h] || "-")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Column Mapping */}
      {currentStep === 4 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 4: Map Spreadsheet Columns</h2>
              <p className="text-xs text-slate-500">
                Match each required system field to the corresponding header in your uploaded file
              </p>
            </div>

            <button
              onClick={runValidation}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Validate Mapped Data <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">System Field</th>
                  <th className="px-4 py-3">Required?</th>
                  <th className="px-4 py-3">Uploaded Header Mapping</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {definitions.map((def) => {
                  const isMapped = Boolean(columnMapping[def.field]);
                  return (
                    <tr key={def.field} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{def.label}</td>
                      <td className="px-4 py-3">
                        {def.required ? (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={columnMapping[def.field] || ""}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, [def.field]: e.target.value })
                          }
                          className="w-64 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">-- Do Not Map --</option>
                          {detectedHeaders.map((h, i) => (
                            <option key={i} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {isMapped ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <Check className="w-3.5 h-3.5" /> Mapped
                          </span>
                        ) : def.required ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                            <AlertCircle className="w-3.5 h-3.5" /> Missing
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unmapped</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 5: Validation Results */}
      {currentStep === 5 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 5: Validation & Integrity Check</h2>
              <p className="text-xs text-slate-500">
                Verified GSTIN formats, dates, required values and invoice uniqueness
              </p>
            </div>

            <div className="flex items-center gap-3">
              {validationErrors.length > 0 && (
                <button
                  onClick={downloadErrorReport}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100"
                >
                  <Download className="w-3.5 h-3.5" /> Download Error Report
                </button>
              )}
              <button
                onClick={handleCommitImport}
                disabled={validRows.length === 0 || isImporting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
              >
                {isImporting ? "Processing..." : `Import ${validRows.length} Valid Records`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Rows Checked</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{rawRows.length}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium">Valid Ready to Import</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{validRows.length}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <span className="text-xs text-red-800 font-medium">Rows with Errors</span>
              <p className="text-2xl font-bold text-red-600 mt-1">{validationErrors.length}</p>
            </div>
          </div>

          {/* Validation Errors Table if any */}
          {validationErrors.length > 0 && (
            <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/20">
              <div className="bg-red-100/70 px-4 py-2 text-xs font-bold text-red-900 flex items-center justify-between">
                <span>Validation Errors ({validationErrors.length} detected)</span>
                <span className="text-[11px] font-normal">Errors will not be imported</span>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-red-50 font-bold text-red-800">
                    <tr>
                      <th className="px-4 py-2">Row #</th>
                      <th className="px-4 py-2">Error Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {validationErrors.slice(0, 10).map((err, i) => (
                      <tr key={i} className="hover:bg-red-50/50">
                        <td className="px-4 py-2 font-mono font-bold text-red-700">{err.rowNumber}</td>
                        <td className="px-4 py-2 text-red-900 font-medium">{err.errorMessage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: Import Completed */}
      {currentStep === 6 && (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Data Import Completed!</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Successfully parsed and stored <span className="font-bold text-slate-800">{validRows.length}</span> records into your organization workspace. The reconciliation engine has been refreshed.
          </p>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/reconciliation/books-vs-2b")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              View Books vs 2B Reconciliation
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
