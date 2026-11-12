import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import {
  generateLoanSchedule,
  buildCustomerFullLedger,
  exportCustomerStatementCSV,
  downloadCustomerStatementPDF,
} from '../../utils/schedule';
import StatementDownloadModal from './StatementDownloadModal';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  MapPin,
  Shield,
  Layers,
  Receipt,
} from 'lucide-react';

export const CustomerStatementModal = ({ customer, loans = [], payments = [], onClose }) => {
  if (!customer) return null;

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'schedule'
  const [selectedLoanId, setSelectedLoanId] = useState(loans[0]?._id || null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const parsedName = parseCustomerName(customer.name);
  const totalLent = loans.reduce((acc, l) => acc + (Number(l.principal) || 0), 0);
  const totalPayable = loans.reduce((acc, l) => acc + (Number(l.totalPayable || l.principal) || 0), 0);
  const totalRepaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue' || (l.remainingBalance || 0) > 0);
  const totalOutstanding = activeLoans.reduce((acc, l) => acc + (Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0), 0);

  const ledger = buildCustomerFullLedger(customer, loans, payments);

  const selectedLoan = loans.find((l) => String(l._id) === String(selectedLoanId)) || loans[0];
  const selectedLoanPayments = payments.filter((p) => String(p.loanId?._id || p.loanId) === String(selectedLoan?._id));
  const currentLoanSchedule = selectedLoan ? generateLoanSchedule(selectedLoan, selectedLoanPayments) : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none">
        {/* Action Header Bar (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Customer Statement & Payment Schedule
              </h2>
              <p className="text-[11px] text-slate-500">
                முழு கணக்கு அறிக்கை, தவணை அட்டவணை & ரசீது வரலாறு
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* 1. Download Options Modal */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition"
              title="Download Statement Options (Active / Settled / Complete)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Statement</span>
            </button>

            {/* Direct Quick PDF Option: Active Loans */}
            <button
              onClick={() => downloadCustomerStatementPDF(customer, loans, payments, 'active')}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center space-x-1 shadow-xs active:scale-95 transition"
              title="Download only Active & Ongoing Loans PDF"
            >
              <Clock className="w-3 h-3" />
              <span>Active PDF</span>
            </button>

            {/* Direct Quick PDF Option: Settled Loans */}
            <button
              onClick={() => downloadCustomerStatementPDF(customer, loans, payments, 'settled')}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs active:scale-95 transition"
              title="Download only Settled & Closed Loans PDF"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Settled PDF</span>
            </button>

            {/* Direct Quick PDF Option: Complete */}
            <button
              onClick={() => downloadCustomerStatementPDF(customer, loans, payments, 'complete')}
              className="px-2.5 py-1.5 rounded-xl border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center space-x-1 hover:bg-sky-50 active:scale-95 transition"
              title="Download Complete Loans Statement PDF"
            >
              <FileText className="w-3 h-3" />
              <span>Complete PDF</span>
            </button>

            {/* 2. Download Excel / CSV */}
            <button
              onClick={() => exportCustomerStatementCSV(customer, loans, payments)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1 transition"
              title="Export complete payment schedule to Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            {/* 3. Print / Save as PDF */}
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-xl glass border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1 active:scale-95 transition"
              title="Print statement or save as PDF via system dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Toggle Tabs (Hidden in Print) */}
        <div className="flex items-center space-x-2 pt-3 pb-2 print:hidden">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition ${
              activeTab === 'ledger'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'glass text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Complete Payment Receipts ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition ${
              activeTab === 'schedule'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'glass text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Installment Schedule by Loan ({loans.length} Loans)</span>
          </button>
        </div>

        {/* Printable Statement Document Content */}
        <div id="printable-customer-statement" className="space-y-4 pt-2">
          {/* Company Letterhead Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  VK BANKER'S & FINANCE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30">
                  வி.கே. பேங்கர்ஸ்
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Daily Thandal, Weekly & Monthly Microfinance • Coimbatore Circle
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                📍 45, Cross Cut Road, Gandhipuram, Coimbatore - 641012 | 📞 +91 98421 12345
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-300 font-mono space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700">
              <p className="font-bold text-white text-sm">BORROWER STATEMENT</p>
              <p>Date: {formatDate(new Date())}</p>
              <p>Total Records: {payments.length} Receipts</p>
            </div>
          </div>

          {/* Customer Profile & Financial Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Customer Details Box */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {parsedName.primary}
                  </h3>
                  {parsedName.secondary && (
                    <p className="text-xs text-slate-400">{parsedName.secondary}</p>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  {customer.idProofType}: {customer.idProofNumber || 'Verified'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>+91 {customer.phone}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>{customer.area}</span>
                </span>
              </div>

              <p className="text-[11px] text-slate-500 truncate" title={customer.address}>
                Address: {customer.address || customer.area}
              </p>

              {customer.guarantor?.name && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  Guarantor: {customer.guarantor.name} ({customer.guarantor.relationship}) • 📱 {customer.guarantor.phone || 'N/A'}
                </p>
              )}
            </div>

            {/* Quick Financial Totals Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-800/60 dark:to-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Account Balances
              </span>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Borrowed:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalLent)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Total Repaid:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRepaid)}</span>
                </div>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">Total Due:</span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400">{formatCurrency(totalOutstanding)}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                {loans.length} Loans ({activeLoans.length} Active)
              </p>
            </div>
          </div>

          {/* Registered Loans Portfolio Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800/70 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                1. Registered Loans Portfolio / வாடிக்கையாளர் கடன் கணக்குகள் ({loans.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Loan No</th>
                    <th className="py-2 px-3">Scheme</th>
                    <th className="py-2 px-3">Principal</th>
                    <th className="py-2 px-3">Total Payable</th>
                    <th className="py-2 px-3">Repaid</th>
                    <th className="py-2 px-3">Remaining Due</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Start Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {loans.map((l) => (
                    <tr
                      key={l._id}
                      onClick={() => {
                        setSelectedLoanId(l._id);
                        setActiveTab('schedule');
                      }}
                      className="hover:bg-sky-50/50 dark:hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-2 px-3 font-bold text-sky-600 dark:text-sky-400">{l.loanNo}</td>
                      <td className="py-2 px-3 uppercase text-[10px]">{l.financeType}</td>
                      <td className="py-2 px-3 font-semibold">{formatCurrency(l.principal)}</td>
                      <td className="py-2 px-3">{formatCurrency(l.totalPayable || l.principal)}</td>
                      <td className="py-2 px-3 text-emerald-600 font-bold">{formatCurrency(l.totalCollected || 0)}</td>
                      <td className="py-2 px-3 font-black text-amber-600">{formatCurrency(l.remainingBalance || 0)}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          l.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">{formatDate(l.startDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TAB 1: Complete Repayment Receipts & Audit Ledger */}
          {(activeTab === 'ledger' || typeof window === 'undefined') && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800/70 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                  2. Complete Repayment Receipts Schedule / முழு ரசீது பட்டியல் ({ledger.length} Receipts)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Total Repaid: {formatCurrency(totalRepaid)}
                </span>
              </div>

              {ledger.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400">No payment receipts registered yet.</p>
              ) : (
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Receipt No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Loan Account</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Amount Paid</th>
                        <th className="py-2 px-3">Remaining Balance</th>
                        <th className="py-2 px-3">Collected By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {ledger.map((item) => (
                        <tr key={item.receiptNo + item.index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-slate-400">{item.index}</td>
                          <td className="py-2 px-3 font-bold text-sky-600 dark:text-sky-400">{item.receiptNo}</td>
                          <td className="py-2 px-3">{formatDate(item.date)}</td>
                          <td className="py-2 px-3 font-semibold">{item.loanNo}</td>
                          <td className="py-2 px-3 uppercase text-[10px] font-bold">{item.mode}</td>
                          <td className="py-2 px-3 font-bold text-emerald-600">{formatCurrency(item.amount)}</td>
                          <td className="py-2 px-3 text-amber-600 font-semibold">{formatCurrency(item.runningBalance)}</td>
                          <td className="py-2 px-3 text-slate-500 font-sans text-[11px]">{item.collector}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Detailed Installment Schedule for Selected Loan */}
          {activeTab === 'schedule' && selectedLoan && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
              <div className="bg-slate-100 dark:bg-slate-800/70 p-3 sm:px-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                    Loan Schedule Explorer:
                  </span>
                  <select
                    value={selectedLoanId}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold outline-none cursor-pointer"
                  >
                    {loans.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.loanNo} ({formatCurrency(l.principal)} • {l.financeType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  {selectedLoan.loanNo} • Installment: {formatCurrency(selectedLoan.installmentAmount)} • Balance: {formatCurrency(selectedLoan.remainingBalance)}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3">Expected Amount</th>
                      <th className="py-2 px-3">Paid Date</th>
                      <th className="py-2 px-3">Receipt No</th>
                      <th className="py-2 px-3">Amount Paid</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {currentLoanSchedule.map((inst) => (
                      <tr key={inst.installmentNo} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-slate-500">{inst.installmentNo}</td>
                        <td className="py-2 px-3">{formatDate(inst.dueDate)}</td>
                        <td className="py-2 px-3 font-semibold">{formatCurrency(inst.amount)}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{inst.paidDate ? formatDate(inst.paidDate) : '-'}</td>
                        <td className="py-2 px-3 text-sky-600 font-bold">{inst.receiptNo || '-'}</td>
                        <td className="py-2 px-3 font-bold text-emerald-600">{inst.paidAmount > 0 ? formatCurrency(inst.paidAmount) : '-'}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            inst.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inst.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : inst.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {inst.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Official Signatures Block */}
          <div className="pt-6 pb-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end text-xs text-slate-500">
            <div className="space-y-1">
              <div className="w-44 border-b border-slate-400 dark:border-slate-600 pb-1" />
              <p className="font-semibold text-[11px]">Customer / Borrower Signature</p>
              <p className="text-[10px] text-slate-400">வாடிக்கையாளர் கையொப்பம்</p>
            </div>

            <div className="space-y-1 text-right">
              <div className="w-44 border-b border-slate-400 dark:border-slate-600 pb-1 ml-auto" />
              <p className="font-semibold text-[11px]">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400">VK BANKER'S & FINANCE</p>
            </div>
          </div>
        </div>
      </div>

      {showDownloadModal && (
        <StatementDownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          customer={customer}
          loans={loans}
          payments={payments}
        />
      )}
    </div>
  );
};

export default CustomerStatementModal;

