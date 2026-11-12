import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  User,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import {
  downloadCustomerStatementPDF,
  exportCustomerStatementCSV,
  filterLoansByStatementType,
} from '../../utils/schedule';

export const StatementDownloadModal = ({
  isOpen,
  onClose,
  customer,
  loans = [],
  payments = [],
  onOpenStatementSheet,
}) => {
  const { lang } = useLanguage();
  const [generatingType, setGeneratingType] = useState(null); // 'active' | 'settled' | 'complete'
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !customer) return null;

  const parsedName = parseCustomerName(customer.name || 'Customer');

  // Compute breakdown for badges & counts
  const activeData = filterLoansByStatementType(loans, payments, 'active');
  const settledData = filterLoansByStatementType(loans, payments, 'settled');
  const completeData = filterLoansByStatementType(loans, payments, 'complete');

  const activeLoansCount = activeData.filteredLoans.length;
  const settledLoansCount = settledData.filteredLoans.length;
  const totalLoansCount = completeData.filteredLoans.length;

  const activeBalance = activeData.filteredLoans.reduce((sum, l) => {
    const rem = Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0;
    return sum + rem;
  }, 0);

  const settledRepaid = settledData.filteredLoans.reduce((sum, l) => {
    return sum + (Number(l.totalCollected || l.totalPaid) || 0);
  }, 0);

  const totalBorrowed = completeData.filteredLoans.reduce((sum, l) => {
    return sum + (Number(l.principal) || 0);
  }, 0);

  const handleDownload = async (statementType, format = 'pdf') => {
    setErrorMessage('');
    setSuccessMessage('');
    setGeneratingType(`${statementType}_${format}`);

    try {
      // Allow UI thread to display loading spinner
      await new Promise((resolve) => setTimeout(resolve, 80));

      if (format === 'csv') {
        exportCustomerStatementCSV(customer, loans, payments, statementType);
        setSuccessMessage(
          statementType === 'active'
            ? 'Active Loans CSV exported successfully!'
            : statementType === 'settled'
            ? 'Settled Loans CSV exported successfully!'
            : 'Complete Statement CSV exported successfully!'
        );
      } else {
        const result = downloadCustomerStatementPDF(customer, loans, payments, statementType);
        const typeLabel =
          statementType === 'active'
            ? 'Active Loans Statement PDF'
            : statementType === 'settled'
            ? 'Settled Loans Statement PDF'
            : 'Complete Loan Statement PDF';
        setSuccessMessage(`${typeLabel} downloaded successfully!`);
      }

      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err) {
      console.error('Error generating statement:', err);
      setErrorMessage(err.message || 'Failed to generate statement.');
    } finally {
      setGeneratingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-sky-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span>Download Statement</span>
                <span className="text-xs text-sky-600 dark:text-sky-400 font-bold">
                  கணக்கு அறிக்கை
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Choose loan category statement to download as official PDF or Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Info Card */}
        <div className="my-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            {customer.photoUrl ? (
              <img
                src={customer.photoUrl}
                alt={customer.name}
                className="w-10 h-10 rounded-xl object-cover border border-sky-300 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 font-black text-sm flex items-center justify-center shrink-0">
                {parsedName.primary?.[0] || 'C'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {parsedName.primary}
                {parsedName.secondary && (
                  <span className="text-[10.5px] text-sky-600 dark:text-sky-400 ml-1 font-semibold">
                    ({parsedName.secondary})
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                ID: {String(customer._id || 'N/A').slice(-8)} • {customer.phone} {customer.area ? `• ${customer.area}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 pl-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300/60">
              {activeLoansCount} Active
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300/60">
              {settledLoansCount} Settled
            </span>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mb-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold flex items-center space-x-2 animate-fade-in shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 3 Separate Option Cards Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          {/* ========================================================
              OPTION 1: ACTIVE LOANS STATEMENT
          ======================================================== */}
          <div
            className={`p-4 rounded-2xl border transition ${
              activeLoansCount > 0
                ? 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-amber-950/30 dark:via-slate-800/60 dark:to-slate-900 border-amber-200 dark:border-amber-900/60 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-black text-xs text-slate-900 dark:text-white">
                      1. Active Loans Statement
                    </h4>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.2 rounded-full">
                      நடைமுறை கடன்கள்
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Download only currently active, ongoing & overdue loans. Excludes settled loans.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10.5px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Accounts: <strong className="text-slate-900 dark:text-white">{activeLoansCount}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      Pending Balance: {formatCurrency(activeBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                Loan Start Date & Expected End Date included
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownload('active', 'csv')}
                  disabled={activeLoansCount === 0 || generatingType !== null}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold disabled:opacity-40 flex items-center space-x-1"
                  title="Export Active Loans to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('active', 'pdf')}
                  disabled={activeLoansCount === 0 || generatingType !== null}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition disabled:opacity-40 flex items-center space-x-1.5"
                >
                  {generatingType === 'active_pdf' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Active Loans PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================
              OPTION 2: SETTLED LOANS STATEMENT
          ======================================================== */}
          <div
            className={`p-4 rounded-2xl border transition ${
              settledLoansCount > 0
                ? 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 dark:from-emerald-950/30 dark:via-slate-800/60 dark:to-slate-900 border-emerald-200 dark:border-emerald-900/60 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-black text-xs text-slate-900 dark:text-white">
                      2. Settled Loans Statement
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.2 rounded-full">
                      முடிவடைந்த கடன்கள்
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Download only 100% fully paid and closed loans. Excludes active loans.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10.5px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Settled Accounts: <strong className="text-slate-900 dark:text-white">{settledLoansCount}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Total Repaid: {formatCurrency(settledRepaid)} (Balance ₹0)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                Loan Start Date & Actual Settlement Date included
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownload('settled', 'csv')}
                  disabled={settledLoansCount === 0 || generatingType !== null}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold disabled:opacity-40 flex items-center space-x-1"
                  title="Export Settled Loans to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('settled', 'pdf')}
                  disabled={settledLoansCount === 0 || generatingType !== null}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition disabled:opacity-40 flex items-center space-x-1.5"
                >
                  {generatingType === 'settled_pdf' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Settled Loans PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================
              OPTION 3: COMPLETE LOAN STATEMENT
          ======================================================== */}
          <div
            className={`p-4 rounded-2xl border transition ${
              totalLoansCount > 0
                ? 'bg-gradient-to-br from-sky-50/70 via-white to-sky-50/30 dark:from-sky-950/30 dark:via-slate-800/60 dark:to-slate-900 border-sky-200 dark:border-sky-900/60 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-600/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-black text-xs text-slate-900 dark:text-white">
                      3. Complete Loan Statement
                    </h4>
                    <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.2 rounded-full">
                      முழு கடன் கணக்கு
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Download all loan records (both active and settled) with consolidated ledger trail.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10.5px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Total Loans: <strong className="text-slate-900 dark:text-white">{totalLoansCount}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">
                      Total Disbursed: {formatCurrency(totalBorrowed)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-sky-200/60 dark:border-sky-900/40 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                Full chronological loan portfolio
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownload('complete', 'csv')}
                  disabled={totalLoansCount === 0 || generatingType !== null}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold disabled:opacity-40 flex items-center space-x-1"
                  title="Export Complete Statement to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('complete', 'pdf')}
                  disabled={totalLoansCount === 0 || generatingType !== null}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-xs shadow-md shadow-sky-600/20 active:scale-95 transition disabled:opacity-40 flex items-center space-x-1.5"
                >
                  {generatingType === 'complete_pdf' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Complete Statement PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          {onOpenStatementSheet ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStatementSheet();
              }}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
            >
              <span>View Online Statement Sheet</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="text-[10.5px] text-slate-400 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Official ERP Generated Statements</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatementDownloadModal;
