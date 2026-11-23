import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate, formatPhoneNumber } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import {
  generateLoanSchedule,
  buildCustomerFullLedger,
  exportCustomerStatementCSV,
  downloadCustomerStatementPDF,
} from '../utils/schedule';
import LoanModal from '../components/common/LoanModal';
import ReceiptModal from '../components/common/ReceiptModal';
import WhatsAppPaymentHistoryModal from '../components/common/WhatsAppPaymentHistoryModal';
import WhatsAppHubModal from '../components/common/WhatsAppHubModal';
import CustomerStatementModal from '../components/common/CustomerStatementModal';
import StatementDownloadModal from '../components/common/StatementDownloadModal';
import EditLoanModal from '../components/common/EditLoanModal';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  Plus,
  Clock,
  Eye,
  CheckCircle,
  FileText,
  Printer,
  Share2,
  Smartphone,
  Download,
  FileSpreadsheet,
  Calendar,
  Search,
  Receipt,
  Layers,
  ChevronRight,
  TrendingDown,
  Pencil,
  Coffee,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';

export const CustomerDetail = ({ customerId, onBack, onViewLoan }) => {
  const { t, lang } = useLanguage();
  const { isMobile, isTablet } = useDeviceMode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & Sheets
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showWhatsAppHub, setShowWhatsAppHub] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [holidayModalTarget, setHolidayModalTarget] = useState(null); // { loan, installment }
  const [holidayType, setHolidayType] = useState('holiday'); // 'holiday' | 'missed'
  const [holidayReason, setHolidayReason] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [declaringHoliday, setDeclaringHoliday] = useState(false);

  // Profile View Controls
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'schedule'
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomerById(customerId);
      if (res.success) {
        setData(res);
        if (res.loans && res.loans.length > 0 && !selectedLoanId) {
          // Default to the first active loan, or the latest loan
          const active = res.loans.find((l) => l.status === 'active' || l.status === 'overdue');
          setSelectedLoanId(active ? active._id : res.loans[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const handleDeclareHoliday = async (loanId, installmentNo, date, type, reason) => {
    try {
      setDeclaringHoliday(true);
      await api.declareLoanHoliday(loanId, {
        installmentNo,
        date,
        type: type || 'holiday',
        reason: reason || (type === 'missed' ? 'Missed Collection / தவறிய நாள்' : 'Holiday / விடுமுறை'),
      });
      await fetchCustomerData();
      setHolidayModalTarget(null);
      setHolidayReason('');
    } catch (err) {
      alert('Failed to declare holiday/missed day: ' + err.message);
    } finally {
      setDeclaringHoliday(false);
    }
  };

  const handleRemoveHoliday = async (loanId, installmentNo, date) => {
    try {
      setDeclaringHoliday(true);
      await api.removeLoanHoliday(loanId, { installmentNo, date });
      await fetchCustomerData();
    } catch (err) {
      alert('Failed to remove holiday/missed declaration: ' + err.message);
    } finally {
      setDeclaringHoliday(false);
    }
  };

  if (loading && !data) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading customer ledger & schedules...</div>;
  }

  if (!data || !data.customer) {
    return (
      <div className="p-8 text-center text-xs text-red-500">
        Customer not found.
        <button onClick={onBack} className="block mx-auto mt-2 text-blue-600 font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const { customer, loans = [], payments = [] } = data;

  const totalLent = loans.reduce((acc, l) => acc + (Number(l.principal || l.principalAmount) || 0), 0);
  const totalRepaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue' || (l.remainingBalance || 0) > 0);
  const totalOutstanding = activeLoans.reduce(
    (acc, l) => acc + (Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0),
    0
  );

  const parsedCustomer = parseCustomerName(customer.name);

  // Compiled full ledger with running balance
  const fullLedger = buildCustomerFullLedger(customer, loans, payments);

  // Filtered ledger based on search
  const filteredLedger = fullLedger.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.receiptNo.toLowerCase().includes(q) ||
      item.loanNo.toLowerCase().includes(q) ||
      formatDate(item.date).toLowerCase().includes(q) ||
      String(item.amount).includes(q) ||
      item.mode.toLowerCase().includes(q)
    );
  });

  // Selected Loan for Installment Schedule Tab
  const activeSelectedLoan = loans.find((l) => String(l._id) === String(selectedLoanId)) || loans[0];
  const activeSelectedLoanPayments = payments.filter(
    (p) => String(p.loanId?._id || p.loanId) === String(activeSelectedLoan?._id)
  );
  const loanInstallmentSchedule = activeSelectedLoan
    ? generateLoanSchedule(activeSelectedLoan, activeSelectedLoanPayments)
    : [];

  const loanRecoveryPct =
    activeSelectedLoan && (activeSelectedLoan.totalPayable || activeSelectedLoan.principal) > 0
      ? Math.min(
          100,
          Math.round(
            ((Number(activeSelectedLoan.totalCollected) || 0) /
              (Number(activeSelectedLoan.totalPayable || activeSelectedLoan.principal) || 1)) *
              100
          )
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 h-11 px-4 rounded-xl border border-sky-200/80 dark:border-sky-800/60 glass text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        {/* Action Buttons: PDF, CSV, Print, WhatsApp, New Loan */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Download Statement (Active / Settled / Complete) */}
          <button
            onClick={() => setShowDownloadModal(true)}
            className="flex items-center space-x-1.5 h-11 px-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition"
            title="Download Separate Active Loans, Settled Loans, or Complete Statement PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Statement</span>
            <span className="sm:hidden">Statement</span>
          </button>

          {/* 2. Export CSV / Excel */}
          <button
            onClick={() => exportCustomerStatementCSV(customer, loans, payments)}
            className="flex items-center space-x-1.5 h-11 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
            title="Export complete payment schedule to Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">CSV</span>
          </button>

          {/* 3. Print / View Statement */}
          <button
            onClick={() => setShowStatementModal(true)}
            className="flex items-center space-x-1.5 h-11 px-3.5 rounded-xl glass border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs active:scale-95 transition"
            title="Preview full printable statement sheet"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Print Statement</span>
          </button>

          {/* 4. WhatsApp Hub */}
          <button
            onClick={() => setShowWhatsAppHub(true)}
            className="flex items-center space-x-1.5 h-11 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
            title={lang === 'ta' ? 'வாட்ஸ்அப் செய்தி மையம்' : 'WhatsApp Hub'}
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* 5. Issue New Loan */}
          <button
            onClick={() => setShowAddLoan(true)}
            className="btn-sky-primary flex items-center space-x-1.5 h-11 px-4 rounded-xl text-xs font-black shadow-lg shadow-sky-500/25 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Loan</span>
          </button>
        </div>
      </div>

      {/* Customer Profile Banner Card */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shrink-0">
              {parsedCustomer.primary[0] || 'C'}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                  {parsedCustomer.primary}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                  {activeLoans.length > 0 ? `${activeLoans.length} Active Loans` : 'All Settled'}
                </span>
              </div>

              {parsedCustomer.secondary && (
                <p className="text-xs text-slate-400 font-medium">
                  {parsedCustomer.secondary}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                <span className="flex items-center space-x-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                  <span>+91 {customer.phone}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-500" />
                  <span>{customer.area}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-[10px]">
                  {customer.idProofType}: {customer.idProofNumber || 'Verified'}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                📍 {customer.address || customer.area}
              </p>
            </div>
          </div>

          {/* Guarantor Details Pill */}
          {customer.guarantor?.name && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-xs space-y-1 shrink-0 self-start">
              <div className="flex items-center space-x-1.5 font-bold text-amber-800 dark:text-amber-300">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Guarantor / ஜாமீன்தாரர்</span>
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {customer.guarantor.name} ({customer.guarantor.relationship || 'Witness'})
              </p>
              <p className="font-mono text-slate-500 text-[11px]">
                📱 {customer.guarantor.phone || 'No phone recorded'}
              </p>
            </div>
          )}
        </div>

        {/* Aggregate Financial Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <p className="text-[11px] text-slate-500 font-medium">Total Borrowed</p>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {formatCurrency(totalLent)}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Total Repaid</p>
            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {formatCurrency(totalRepaid)}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30">
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Outstanding Due</p>
            <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30">
            <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">Loans Registered</p>
            <p className="text-lg sm:text-xl font-black text-sky-600 dark:text-sky-400 tabular-nums mt-0.5">
              {loans.length} <span className="text-xs font-normal text-slate-400">({activeLoans.length} active)</span>
            </p>
          </div>
        </div>

        {/* Direct Download & Statement Options Banner */}
        <div className="p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2 text-xs text-sky-800 dark:text-sky-300 font-bold">
            <FileText className="w-4 h-4 text-sky-500 shrink-0" />
            <span>Customer Statement & Schedule Downloads Available</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDownloadModal(true)}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Statement (Active / Settled)</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              onClick={() => exportCustomerStatementCSV(customer, loans, payments)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              onClick={() => setShowStatementModal(true)}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:underline flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Full Statement Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer's Loans Ledger Cards */}
      <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Loan Portfolio Ledger / கடன் வரலாறு ({loans.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {activeLoans.length} active • {loans.length - activeLoans.length} settled
          </span>
        </div>

        {loans.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No loans registered yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loans.map((loan) => (
              <div
                key={loan._id}
                className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 p-3 rounded-2xl transition cursor-pointer ${
                  String(loan._id) === String(selectedLoanId) && activeTab === 'schedule'
                    ? 'ring-2 ring-sky-400 bg-sky-50/40 dark:bg-sky-950/20'
                    : ''
                }`}
                onClick={() => {
                  setSelectedLoanId(loan._id);
                }}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {loan.loanNo}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      {loan.financeType}
                    </span>
                    <span
                      className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full ${
                        loan.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : loan.status === 'overdue'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Principal: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(loan.principal)}</strong> • Payable: {formatCurrency(loan.totalPayable || loan.principal)} • Start: {formatDate(loan.startDate)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Due</p>
                    <p className={`text-sm sm:text-base font-black tabular-nums ${
                      (loan.remainingBalance || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                    }`}>
                      {formatCurrency(loan.remainingBalance || 0)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLoan(loan);
                      }}
                      className="p-1.5 px-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-xs active:scale-95 flex items-center space-x-1 text-xs font-bold"
                      title="Edit Loan Terms / திருத்து"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Are you sure you want to permanently delete Loan ${loan.loanNo}? This will remove the loan and its transaction records.`
                          )
                        ) {
                          try {
                            await api.deleteLoan(loan._id);
                            fetchCustomerData();
                          } catch (err) {
                            alert(err.message || 'Failed to delete loan');
                          }
                        }
                      }}
                      className="p-1.5 px-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition shadow-xs active:scale-95 flex items-center space-x-1 text-xs font-bold"
                      title="Delete Loan / நீக்கு"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLoanId(loan._id);
                        setActiveTab('schedule');
                      }}
                      className="btn-sky-primary flex items-center space-x-1 py-1.5 px-3 text-xs font-bold shadow-sm active:scale-95"
                      title="View full installment schedule"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>View Schedule</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FULL PAYMENT SCHEDULE & TRANSACTION LEDGER SECTION */}
      <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
        {/* Section Header with Tabs and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Full Payment Schedule & Receipts / முழு தவணை & ரசீது அறிக்கை
            </h3>
            <p className="text-xs text-slate-500">
              Complete historical record of all scheduled installments, payment receipts, and running balance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tab 1: All Receipts */}
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                activeTab === 'ledger'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'glass text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>All Receipts ({payments.length})</span>
            </button>

            {/* Tab 2: Installment Schedule by Loan */}
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                activeTab === 'schedule'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'glass text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Installment Schedule by Loan</span>
            </button>

            {/* Send WhatsApp History */}
            {payments.length > 0 && (
              <button
                onClick={() => setShowPaymentHistoryModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-sm active:scale-95 transition"
                title="Send full payment statement to customer on WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp Ledger</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Complete Repayment Receipts Audit Trail */}
        {activeTab === 'ledger' && (
          <div className="space-y-3">
            {/* Search filter bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by Receipt No, Date, Loan No, or Amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl glass border border-slate-200/80 dark:border-slate-800/80 text-xs outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            {filteredLedger.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No payment receipts matching your query.</p>
            ) : isMobile ? (
              <div className="space-y-2.5">
                {filteredLedger.map((item) => (
                  <div
                    key={item.receiptNo + item.index}
                    className="p-3.5 rounded-2xl glass border border-white/70 dark:border-sky-800/40 border-l-4 border-l-emerald-500 space-y-2 min-h-[64px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                            {item.receiptNo}
                          </span>
                          <span className="text-[10px] text-slate-400">#{item.index}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {item.loanNo} • {formatDate(item.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black tabular-nums text-base text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Bal: {formatCurrency(item.runningBalance)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-sky-100/60 dark:border-sky-900/40 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {item.mode}
                      </span>
                      <button
                        onClick={() => setReceiptPayment({ ...item.raw, customerId: customer })}
                        className="btn-sky-primary min-h-[38px] py-1 px-3 text-xs font-bold shadow-sm flex items-center space-x-1"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Loan Account</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                      <th className="py-2.5 px-3">Collected By</th>
                      <th className="py-2.5 px-3 text-right">Receipt Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {filteredLedger.map((item) => (
                      <tr key={item.receiptNo + item.index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400">{item.index}</td>
                        <td className="py-2.5 px-3 font-bold text-sky-600 dark:text-sky-400">{item.receiptNo}</td>
                        <td className="py-2.5 px-3">{formatDate(item.date)}</td>
                        <td className="py-2.5 px-3 font-semibold">{item.loanNo}</td>
                        <td className="py-2.5 px-3 uppercase font-bold text-[10px]">{item.mode}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 tabular-nums">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-600 tabular-nums">
                          {formatCurrency(item.runningBalance)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px]">{item.collector}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setReceiptPayment({ ...item.raw, customerId: customer })}
                            className="text-sky-600 hover:underline font-bold"
                          >
                            Print Voucher
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Detailed Installment Schedule for Selected Loan */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Loan Switcher Strip & Quick Holiday Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Select Loan Account:
                </span>
                <select
                  value={selectedLoanId || ''}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-sky-400"
                >
                  {loans.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.loanNo} ({formatCurrency(l.principal)} • {l.financeType} • {l.status.toUpperCase()})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setHolidayModalTarget({
                      loanId: activeSelectedLoan?._id,
                      installmentNo: '',
                      date: new Date().toISOString().split('T')[0],
                    });
                    setHolidayType('holiday');
                    setHolidayReason('Sunday / Holiday');
                    setHolidayDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="flex items-center space-x-1.5 h-9 px-3 rounded-xl border border-[#D5E9FA] bg-[#EAF5FF] text-[#0878D1] hover:bg-[#D5E9FA]/60 text-xs font-bold transition shadow-xs active:scale-95"
                  title="Declare Holiday or Missed Collection Day"
                >
                  <Coffee className="w-3.5 h-3.5 text-[#0878D1]" />
                  <span>Declare Holiday / Missed</span>
                </button>
              </div>

              {activeSelectedLoan && (
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span>
                    Installment: <strong>{formatCurrency(activeSelectedLoan.installmentAmount)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Repaid: <strong className="text-emerald-600">{formatCurrency(activeSelectedLoan.totalCollected || 0)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Balance: <strong className="text-amber-600">{formatCurrency(activeSelectedLoan.remainingBalance || 0)}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Repayment Progress Bar */}
            {activeSelectedLoan && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-sky-800 dark:text-sky-300">
                    Loan Repayment Progress ({loanRecoveryPct}%)
                  </span>
                  <span className="text-slate-500 font-mono">
                    {activeSelectedLoan.duration || 100} Scheduled Installments
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${loanRecoveryPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Installments Table */}
            <div className="overflow-x-auto max-h-[460px] rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Inst #</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Expected Amount</th>
                    <th className="py-2.5 px-3">Paid Date</th>
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Declare / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {loanInstallmentSchedule.map((inst) => (
                    <tr
                      key={inst.installmentNo}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        inst.status === 'paid'
                          ? 'bg-emerald-50/20'
                          : inst.status === 'holiday'
                          ? 'bg-[#EAF5FF]/40'
                          : inst.status === 'missed'
                          ? 'bg-amber-50/30'
                          : inst.status === 'overdue'
                          ? 'bg-red-50/20'
                          : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-500">#{inst.installmentNo}</td>
                      <td className="py-2 px-3">{formatDate(inst.dueDate)}</td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums">{formatCurrency(inst.amount)}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {inst.paidDate ? formatDate(inst.paidDate) : '-'}
                      </td>
                      <td className="py-2 px-3 text-sky-600 font-bold">{inst.receiptNo || '-'}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 tabular-nums">
                        {inst.paidAmount > 0 ? formatCurrency(inst.paidAmount) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            inst.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : inst.status === 'holiday'
                              ? 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] font-black'
                              : inst.status === 'missed'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 font-black'
                              : inst.status === 'partial'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                              : inst.status === 'overdue'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {inst.status === 'holiday'
                            ? '🏖️ Holiday'
                            : inst.status === 'missed'
                            ? '⚠️ Missed'
                            : inst.status}
                        </span>
                        {inst.holidayReason && (
                          <span className="block text-[8px] text-slate-400 mt-0.5 truncate max-w-[100px] mx-auto">
                            {inst.holidayReason}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {inst.status === 'holiday' || inst.status === 'missed' ? (
                          <button
                            disabled={declaringHoliday}
                            onClick={() =>
                              handleRemoveHoliday(
                                activeSelectedLoan._id,
                                inst.installmentNo,
                                inst.dueDate
                              )
                            }
                            className="text-[10px] text-slate-500 hover:text-red-600 font-bold underline transition"
                            title="Revert back to regular installment"
                          >
                            Revert
                          </button>
                        ) : inst.status !== 'paid' ? (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              disabled={declaringHoliday}
                              onClick={() =>
                                handleDeclareHoliday(
                                  activeSelectedLoan._id,
                                  inst.installmentNo,
                                  inst.dueDate,
                                  'holiday',
                                  'Holiday / விடுமுறை'
                                )
                              }
                              className="px-2 py-0.5 rounded-lg border border-[#D5E9FA] bg-[#EAF5FF] text-[#0878D1] hover:bg-[#D5E9FA] text-[10px] font-bold transition active:scale-95"
                              title="Declare as Holiday (விடுமுறை)"
                            >
                              🏖️ Holiday
                            </button>
                            <button
                              disabled={declaringHoliday}
                              onClick={() =>
                                handleDeclareHoliday(
                                  activeSelectedLoan._id,
                                  inst.installmentNo,
                                  inst.dueDate,
                                  'missed',
                                  'Missed Collection / தவறிய நாள்'
                                )
                              }
                              className="px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-[10px] font-bold transition active:scale-95"
                              title="Declare as Missed Collection (தவறிய நாள்)"
                            >
                              ⚠️ Missed
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Loan Modal */}
      {showAddLoan && (
        <LoanModal
          customers={[customer]}
          initialCustomerId={customer._id}
          onClose={() => setShowAddLoan(false)}
          onSuccess={() => fetchCustomerData()}
        />
      )}

      {/* Printable Receipt Voucher Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {/* WhatsApp Payment History Statement Modal */}
      {showPaymentHistoryModal && (
        <WhatsAppPaymentHistoryModal
          customer={customer}
          loans={loans}
          payments={payments}
          onClose={() => setShowPaymentHistoryModal(false)}
        />
      )}

      {/* WhatsApp Direct Hub Modal */}
      {showWhatsAppHub && (
        <WhatsAppHubModal
          isOpen={showWhatsAppHub}
          onClose={() => setShowWhatsAppHub(false)}
          initialCustomer={customer}
        />
      )}

      {/* Official Customer Statement & Print Modal */}
      {showStatementModal && (
        <CustomerStatementModal
          customer={customer}
          loans={loans}
          payments={payments}
          onClose={() => setShowStatementModal(false)}
        />
      )}

      {/* 3-Option Statement Download Modal (Active / Settled / Complete) */}
      {showDownloadModal && (
        <StatementDownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          customer={customer}
          loans={loans}
          payments={payments}
          onOpenStatementSheet={() => setShowStatementModal(true)}
        />
      )}

      {/* Declare Holiday or Missed Day Modal */}
      {holidayModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#183653]/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white/95 backdrop-blur-[20px] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#D5E9FA] space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5E9FA]">
              <div className="flex items-center space-x-2">
                <Coffee className="w-5 h-5 text-[#0878D1]" />
                <h3 className="font-black text-base text-[#183653]">
                  Declare Holiday / Missed Day
                </h3>
              </div>
              <button
                onClick={() => setHolidayModalTarget(null)}
                className="p-1 rounded-full text-[#647C95] hover:text-[#183653] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#647C95] font-bold uppercase tracking-wider mb-1.5 text-[10px]">
                  Declaration Type / வகை
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHolidayType('holiday')}
                    className={`py-2.5 px-3 rounded-2xl border font-bold flex items-center justify-center space-x-2 transition ${
                      holidayType === 'holiday'
                        ? 'border-[#0878D1] bg-[#EAF5FF] text-[#0878D1] shadow-sm'
                        : 'border-[#D5E9FA] text-[#647C95] hover:bg-[#F3F9FF]'
                    }`}
                  >
                    <span>🏖️ Holiday / விடுமுறை</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHolidayType('missed')}
                    className={`py-2.5 px-3 rounded-2xl border font-bold flex items-center justify-center space-x-2 transition ${
                      holidayType === 'missed'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                        : 'border-[#D5E9FA] text-[#647C95] hover:bg-[#F3F9FF]'
                    }`}
                  >
                    <span>⚠️ Missed / தவறிய நாள்</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#647C95] font-bold uppercase tracking-wider mb-1.5 text-[10px]">
                  Date / தேதி
                </label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl border border-[#D5E9FA] bg-[#F3F9FF] text-xs font-bold text-[#183653] outline-none focus:ring-2 focus:ring-[#0878D1]"
                />
              </div>

              <div>
                <label className="block text-[#647C95] font-bold uppercase tracking-wider mb-1.5 text-[10px]">
                  Installment Number (Optional / குறிப்பிட்ட தவணை எண்)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5 (Leave empty for date match)"
                  value={holidayModalTarget.installmentNo || ''}
                  onChange={(e) =>
                    setHolidayModalTarget({ ...holidayModalTarget, installmentNo: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-2xl border border-[#D5E9FA] bg-[#F3F9FF] text-xs font-bold text-[#183653] outline-none focus:ring-2 focus:ring-[#0878D1]"
                />
              </div>

              <div>
                <label className="block text-[#647C95] font-bold uppercase tracking-wider mb-1.5 text-[10px]">
                  Reason / குறிப்பு
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sunday, Festival, Shop Closed, Customer Away"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl border border-[#D5E9FA] bg-[#F3F9FF] text-xs font-bold text-[#183653] outline-none focus:ring-2 focus:ring-[#0878D1]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setHolidayModalTarget(null)}
                  className="px-4 py-2.5 rounded-2xl border border-[#D5E9FA] text-[#647C95] font-bold hover:bg-[#F3F9FF] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={declaringHoliday}
                  onClick={() =>
                    handleDeclareHoliday(
                      holidayModalTarget.loanId,
                      holidayModalTarget.installmentNo,
                      holidayDate,
                      holidayType,
                      holidayReason
                    )
                  }
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white font-black shadow-md hover:opacity-95 transition active:scale-95 disabled:opacity-50"
                >
                  {declaringHoliday ? 'Saving...' : 'Declare / அறிவிக்க'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {editingLoan && (
        <EditLoanModal
          isOpen={Boolean(editingLoan)}
          loan={editingLoan}
          customer={customer}
          onClose={() => setEditingLoan(null)}
          onSuccess={() => {
            fetchCustomerData();
            setEditingLoan(null);
          }}
        />
      )}
    </div>
  );
};

export default CustomerDetail;
