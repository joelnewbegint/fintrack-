import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { downloadEMICsvTemplate, parseEMIImportFile } from '../../utils/emiCsvTemplate';
import { formatINR, formatDDMMYYYY } from '../../utils/emiCalculator';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';

export const ImportEMICSVModal = ({ isOpen, onClose, onSuccess }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedRowNumbers, setSelectedRowNumbers] = useState(new Set());
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    setFileName('');
    setRows([]);
    setSelectedRowNumbers(new Set());
    setParsing(false);
    setImporting(false);
    setProgress({ current: 0, total: 0 });
    setError('');
    setResults(null);

    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleFileChange = async (file) => {
    if (!file) return;
    setError('');
    setResults(null);
    setParsing(true);
    setFileName(file.name);

    try {
      let existingLoans = [];
      try {
        const res = await api.getEMILoans({});
        if (res?.success && Array.isArray(res.loans)) {
          existingLoans = res.loans;
        }
      } catch {}

      const parsed = await parseEMIImportFile(file, existingLoans);
      setRows(parsed);

      const defaultSelected = new Set(
        parsed.filter((r) => r.valid && !r.isDuplicate).map((r) => r.rowNumber)
      );
      setSelectedRowNumbers(defaultSelected);
    } catch (err) {
      setRows([]);
      setSelectedRowNumbers(new Set());
      setError(err.message || 'Could not parse CSV/Excel file');
    } finally {
      setParsing(false);
    }
  };

  const toggleRowSelection = (rowNumber, isValid) => {
    if (!isValid || importing) return;
    setSelectedRowNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const handleImportSelected = async () => {
    const targets = rows.filter((r) => r.valid && selectedRowNumbers.has(r.rowNumber));
    if (targets.length === 0 || importing) return;

    setImporting(true);
    setError('');
    setProgress({ current: 0, total: targets.length });

    const imported = [];
    const failed = [];

    for (let i = 0; i < targets.length; i += 1) {
      const row = targets[i];
      setProgress({ current: i + 1, total: targets.length });

      try {
        const res = await api.createEMILoan(row.payload);
        const createdLoan = res?.loan;

        if (createdLoan?._id && row.paidInstallments > 0 && Array.isArray(createdLoan.schedule)) {
          const prePaidAmount = createdLoan.schedule
            .slice(0, row.paidInstallments)
            .reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);

          if (prePaidAmount > 0) {
            await api.recordEMIPayment({
              emiLoanId: createdLoan._id,
              amount: prePaidAmount,
              mode: row.paidPaymentMode || 'cash',
              paymentDate: row.startDate,
              notes: `Opening pre-paid (${row.paidInstallments} EMI(s)) from CSV import`,
            });
          }
        }

        imported.push({ rowNumber: row.rowNumber, customerName: row.customerName, emiNo: createdLoan?.emiNo || '' });
      } catch (err) {
        failed.push({
          rowNumber: row.rowNumber,
          customerName: row.customerName,
          reason: err.message || 'Import failed',
        });
      }
    }

    setImporting(false);
    setResults({ imported, failed });

    if (imported.length > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fintrack:toast', {
          detail: {
            type: 'saved',
            title: `Imported ${imported.length} EMI loan(s) ✅`,
            message: failed.length > 0 ? `${failed.length} row(s) had errors` : 'All selected rows added cleanly',
          },
        })
      );
      window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
      if (onSuccess) onSuccess();
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;
  const dupCount = rows.filter((r) => r.isDuplicate).length;
  const selectedCount = rows.filter((r) => r.valid && selectedRowNumbers.has(r.rowNumber)).length;

  const modalNode = (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4 bg-[#183653]/60 backdrop-blur-sm"
      onClick={() => !importing && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Import EMI Data from CSV"
    >
      <div
        className="w-full max-w-[900px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-[#D5E9FA] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-[#D5E9FA] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white flex items-center justify-center shadow-sm shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#183653] leading-tight">
                Import EMI Data (CSV / Excel) · EMI தரவு பதிவேற்றம்
              </h2>
              <p className="text-xs text-[#647C95]">
                Download template, fill borrower &amp; product rows, and bulk add EMI accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadEMICsvTemplate}
              className="h-9 px-3 rounded-xl bg-[#EAF5FF] hover:bg-[#DCEEFF] border border-[#BFE0FB] text-xs font-extrabold text-[#0A4FA3] flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template CSV</span>
            </button>
            <button
              type="button"
              onClick={() => !importing && onClose()}
              className="w-9 h-9 rounded-full bg-[#F3F9FF] hover:bg-[#EAF5FF] text-[#647C95] hover:text-[#183653] flex items-center justify-center transition"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-[#F9FBFE]">
          {/* Instructions + Upload Box */}
          <div className="rounded-2xl bg-white border border-[#D5E9FA] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-bold text-[#183653]">
                Required columns: <span className="text-[#0878D1] font-mono text-[11px]">customerName, customerPhone, customerArea, productName, productPrice, tenureMonths, startDate</span>
              </div>
              <span className="text-[11px] text-[#647C95]">
                Supports .csv, .xlsx, .xls · Delete sample rows before uploading real data
              </span>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0];
                if (f) handleFileChange(f);
              }}
              className="border-2 border-dashed border-[#BFE0FB] hover:border-[#0878D1] rounded-2xl bg-[#F3F9FF]/70 p-5 text-center space-y-2 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              <Upload className="w-7 h-7 text-[#0878D1] mx-auto" />
              <div className="text-xs font-extrabold text-[#183653]">
                {fileName ? `Selected: ${fileName}` : 'Drop your filled CSV / Excel file here or click below to choose'}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={parsing || importing}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white text-xs font-bold shadow-xs hover:brightness-105 transition disabled:opacity-60"
                >
                  {parsing ? 'Reading file...' : fileName ? 'Choose Another File' : 'Select CSV / Excel File'}
                </button>
                {rows.length > 0 && !importing && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileName('');
                      setRows([]);
                      setSelectedRowNumbers(new Set());
                      setError('');
                      setResults(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="h-9 px-3 rounded-xl bg-white border border-[#D5E9FA] text-xs font-bold text-[#647C95] hover:text-rose-600 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {results && (
            <div className="rounded-2xl bg-white border border-[#D5E9FA] p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#183653]">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>
                  Import Complete: {results.imported.length} added
                  {results.failed.length > 0 ? `, ${results.failed.length} failed` : ''}
                </span>
              </div>
              {results.failed.length > 0 && (
                <ul className="text-xs text-rose-700 space-y-1 pl-5 list-disc">
                  {results.failed.map((f) => (
                    <li key={f.rowNumber}>
                      Row {f.rowNumber} ({f.customerName || 'Unknown'}): {f.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Preview Table */}
          {rows.length > 0 && (
            <div className="rounded-2xl bg-white border border-[#D5E9FA] overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-[#F3F9FF] border-b border-[#D5E9FA] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#D5E9FA] text-[#183653]">
                    Total: {rows.length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    Valid: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                      Invalid: {invalidCount}
                    </span>
                  )}
                  {dupCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                      Possible Duplicates: {dupCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-[#0878D1]">
                  {selectedCount} row(s) checked for import
                </span>
              </div>

              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-white border-b border-[#D5E9FA] text-[10px] font-black uppercase text-[#647C95]">
                    <tr>
                      <th className="py-2.5 px-3">Pick</th>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Product &amp; Finance</th>
                      <th className="py-2.5 px-3">EMI Terms</th>
                      <th className="py-2.5 px-3 text-right">Monthly EMI</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAF5FF]">
                    {rows.map((r) => {
                      const checked = selectedRowNumbers.has(r.rowNumber);
                      return (
                        <tr key={r.rowNumber} className={!r.valid ? 'bg-rose-50/40' : r.isDuplicate ? 'bg-amber-50/40' : ''}>
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              disabled={!r.valid || importing}
                              checked={checked}
                              onChange={() => toggleRowSelection(r.rowNumber, r.valid)}
                              className="w-4 h-4 accent-[#0878D1] cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-[#647C95]">#{r.rowNumber}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-[#183653]">{r.customerName || '-'}</div>
                            <div className="text-[11px] text-[#647C95]">
                              {r.customerPhone || 'No phone'} · {r.customerArea || 'No area'}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-[#183653]">{r.productName || '-'}</div>
                            <div className="text-[11px] text-[#647C95] tabular-nums">
                              Price {formatINR(r.productPrice)} · Fin {formatINR(r.financeAmount)}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-[#183653]">
                              {r.tenureMonths}m ·{' '}
                              {r.interestMode === 'amount'
                                ? `Fixed ${formatINR(r.interestAmount)}`
                                : `${r.rate}% (${r.method})`}
                            </div>
                            <div className="text-[11px] text-[#647C95]">
                              Start: {formatDDMMYYYY(r.startDate)}
                              {r.paidInstallments > 0 ? ` · Pre-paid: ${r.paidInstallments}` : ''}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-[#0A4FA3] tabular-nums">
                            {r.valid ? formatINR(r.monthlyEMI) : '-'}
                          </td>
                          <td className="py-2 px-3">
                            {!r.valid ? (
                              <span className="inline-flex items-start gap-1 text-[11px] font-bold text-rose-700">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{r.errors.join(', ')}</span>
                              </span>
                            ) : r.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                                <AlertTriangle className="w-3 h-3" />
                                Duplicate?
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                                <CheckCircle className="w-3 h-3" />
                                Ready
                              </span>
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
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-[#D5E9FA] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            className="h-10 px-4 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653] transition disabled:opacity-50"
          >
            {results ? 'Close / மூடு' : 'Cancel / ரத்து'}
          </button>

          <button
            type="button"
            disabled={selectedCount === 0 || importing}
            onClick={handleImportSelected}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:brightness-105 text-xs sm:text-sm font-extrabold text-white shadow-md flex items-center gap-2 transition disabled:opacity-50"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {importing
                ? `Importing ${progress.current} of ${progress.total}...`
                : `Import ${selectedCount} EMI Loan(s) / பதிவேற்று`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default ImportEMICSVModal;

