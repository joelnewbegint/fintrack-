import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate, getOverdueDays } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import LoanModal from '../components/common/LoanModal';
import PaymentModal from '../components/common/PaymentModal';
import ReceiptModal from '../components/common/ReceiptModal';
import WhatsAppReminderModal from '../components/common/WhatsAppReminderModal';
import WhatsAppHubModal from '../components/common/WhatsAppHubModal';
import LoanApplicationFormModal from '../components/common/LoanApplicationFormModal';
import EditLoanModal from '../components/common/EditLoanModal';
import { downloadLoanAgreementPDF, downloadRepaymentSchedulePDF } from '../utils/loanAgreementPdf';
import SmartNameInput from '../components/common/SmartNameInput';
import { saveRecentName } from '../utils/nameCorrection';
import {
  Plus,
  Search,
  Eye,
  CreditCard,
  AlertCircle,
  TrendingUp,
  FileText,
  Smartphone,
  Download,
  Pencil,
  Trash2,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Landmark,
  X,
} from 'lucide-react';

export const Loans = ({ initialType = 'all', onViewLoan }) => {
  const { t, lang } = useLanguage();
  const { isOwner } = useAuth();
  const { isMobile } = useDeviceMode();

  const [loans, setLoans] = useState([]);
  const [allLoansSummary, setAllLoansSummary] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [todayCollected, setTodayCollected] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Pagination
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown & Modals state
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [payLoanItem, setPayLoanItem] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [whatsappItem, setWhatsappItem] = useState(null);
  const [whatsappHubLoan, setWhatsappHubLoan] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedFormLoan, setSelectedFormLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);

  // Fetch summary totals and dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const res = await api.getDashboardStats();
      if (res?.todayStats?.collectedToday !== undefined) {
        setTodayCollected(res.todayStats.collectedToday);
      }
    } catch (err) {
      console.warn('Dashboard stats fetch failed:', err);
    }
  };

  // Fetch all loans without filter to keep summary cards consistent
  const fetchSummaryLoans = async () => {
    try {
      const res = await api.getLoans({});
      if (res?.success && Array.isArray(res.loans)) {
        setAllLoansSummary(res.loans);
      }
    } catch (err) {
      console.warn('Summary loans fetch failed:', err);
    }
  };

  // Fetch filtered loans for table
  const fetchLoans = async (isBackground = false) => {
    try {
      if (!isBackground && loans.length === 0) {
        setLoading(true);
      }
      const res = await api.getLoans({
        financeType: typeFilter,
        status: statusFilter,
        search,
      });
      if (res?.success) {
        setLoans(res.loans || []);
      }
    } catch (err) {
      console.error('Failed to fetch loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.getCustomers();
      if (res?.success) {
        setCustomers(res.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchSummaryLoans();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    fetchLoans(false);
    setCurrentPage(1);

    const handleSyncUpdate = () => {
      if (!showAddModal && !payLoanItem && !editingLoan && !showFormModal) {
        fetchLoans(true);
        fetchSummaryLoans();
        fetchDashboardStats();
        fetchCustomers();
      }
    };
    window.addEventListener('fintrack:data-updated', handleSyncUpdate);
    return () => window.removeEventListener('fintrack:data-updated', handleSyncUpdate);
  }, [typeFilter, statusFilter, search, showAddModal, payLoanItem, editingLoan, showFormModal]);

  // Click outside listener for overflow action dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts: 'N' for new loan, '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      ) {
        return;
      }
      if ((e.key === 'n' || e.key === 'N') && isOwner) {
        e.preventDefault();
        setShowAddModal(true);
      } else if (e.key === '/') {
        e.preventDefault();
        const input = document.getElementById('loans-search-input');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOwner]);

  // Helper to resolve customer object from loan
  const resolveCustomer = (loan) => {
    if (loan.customerId && typeof loan.customerId === 'object' && loan.customerId.name) {
      return loan.customerId;
    }
    const rawCid =
      typeof loan.customerId === 'object' && loan.customerId !== null
        ? String(loan.customerId._id || '')
        : String(loan.customerId || '');
    if (rawCid && customers.length > 0) {
      const found = customers.find((c) => String(c._id) === rawCid);
      if (found) return found;
    }
    if (loan.customerName) {
      return {
        name: loan.customerName,
        phone: loan.customerPhone || '',
        area: loan.customerArea || '',
      };
    }
    if (loan.notes) {
      const match = loan.notes.match(/ledger loan for\s+(.+)$/i);
      if (match && match[1]) {
        return { name: match[1].trim(), phone: '', area: '' };
      }
      if (customers.length > 0) {
        const foundByNote = customers.find((c) => {
          const simple = (c.name || '').toLowerCase().split('(')[0].trim();
          return simple && loan.notes.toLowerCase().includes(simple);
        });
        if (foundByNote) return foundByNote;
      }
    }
    return { name: loan.customerName || 'Borrower / வாடிக்கையாளர்', phone: '', area: '' };
  };

  // Helper to build pay loan item for PaymentModal
  const buildPayItem = (loan, cust) => ({
    loanId: loan._id,
    _id: loan._id,
    loanNo: loan.loanNo,
    customerName: cust.name,
    customerPhone: cust.phone,
    customerArea: cust.area,
    principal: loan.principal,
    totalPayable: loan.totalPayable,
    totalCollected: loan.totalCollected || 0,
    remainingBalance: loan.remainingBalance,
    installmentAmount: loan.installmentAmount,
    dueAmount: loan.installmentAmount,
    financeType: loan.financeType,
    duration: loan.duration,
  });

  // Calculate Summary metrics from portfolio
  const summarySource = allLoansSummary.length > 0 ? allLoansSummary : loans;
  const activeLoansCount = useMemo(
    () => summarySource.filter((l) => l.status === 'active' || (l.status !== 'completed' && (l.remainingBalance || 0) > 0)).length,
    [summarySource]
  );
  const totalPrincipal = useMemo(
    () => summarySource.reduce((acc, l) => acc + (Number(l.principal) || 0), 0),
    [summarySource]
  );
  const overdueLoansList = useMemo(
    () => summarySource.filter((l) => l.status === 'overdue'),
    [summarySource]
  );
  const overdueAmount = useMemo(
    () => overdueLoansList.reduce((acc, l) => acc + (Number(l.remainingBalance) || 0), 0),
    [overdueLoansList]
  );

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(loans.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, loans.length);
  const paginatedLoans = useMemo(
    () => loans.slice(startIndex, endIndex),
    [loans, startIndex, endIndex]
  );

  // Clear all filters
  const handleClearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setSearch('');
    setCurrentPage(1);
  };

  const isFiltering = search || typeFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('loans')} / கடன் கணக்குகள்
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'ta'
              ? 'தினசரி, வார மற்றும் மாதத் தவணைக் கடன்களின் முழு விவரம்'
              : 'Complete credit portfolio for daily thandal, weekly, and monthly installment loans'}
          </p>
        </div>

        {/* Exactly 2 Buttons: New Loan (primary) and Application Form (secondary) */}
        <div className="flex items-center space-x-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => {
              setSelectedFormLoan(null);
              setShowFormModal(true);
            }}
            className="h-10 px-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 shadow-xs active:scale-95 transition"
            title="Download or Print Blank Loan Application Form"
          >
            <FileText className="w-4 h-4 text-sky-500" />
            <span>{lang === 'ta' ? 'விண்ணப்பப் படிவம்' : 'Application Form'}</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-md shadow-sky-500/25 flex items-center space-x-2 active:scale-95 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('newLoan')} (N)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SUMMARY CARDS (4-grid above table) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Active Loans */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              {lang === 'ta' ? 'நடப்புக் கடன்கள்' : 'Total Active Loans'}
            </p>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {activeLoansCount}
            </p>
          </div>
        </div>

        {/* Card 2: Total Principal */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              {lang === 'ta' ? 'மொத்த அசல்' : 'Total Principal'}
            </p>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight truncate">
              {formatCurrency(totalPrincipal)}
            </p>
          </div>
        </div>

        {/* Card 3: Collected Today */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              {lang === 'ta' ? 'இன்று வசூல்' : 'Collected Today'}
            </p>
            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight truncate">
              {formatCurrency(todayCollected)}
            </p>
          </div>
        </div>

        {/* Card 4: Overdue Amount (Red accent, clickable to filter overdue) */}
        <button
          onClick={() => {
            setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue');
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl p-3.5 sm:p-4 border shadow-sm flex items-center space-x-3 transition active:scale-[0.98] ${
            statusFilter === 'overdue'
              ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-400'
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 hover:border-rose-300'
          }`}
          title="Click to filter overdue loans"
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              statusFilter === 'overdue'
                ? 'bg-white/20 text-white'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p
                className={`text-[11px] font-medium truncate ${
                  statusFilter === 'overdue' ? 'text-rose-100' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {lang === 'ta' ? 'தவணை தவறிய தொகை' : 'Overdue Amount'}
              </p>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  statusFilter === 'overdue'
                    ? 'bg-white/20 text-white'
                    : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                }`}
              >
                {overdueLoansList.length}
              </span>
            </div>
            <p
              className={`text-lg sm:text-xl font-black tabular-nums tracking-tight truncate ${
                statusFilter === 'overdue' ? 'text-white' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(overdueAmount)}
            </p>
          </div>
        </button>
      </div>

      {/* 3. FILTER BAR (One row + Quick chips) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        {/* Main Controls Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Box with "/" focus */}
          <div className="relative flex-1">
            <SmartNameInput
              id="loans-search-input"
              value={search}
              onChange={setSearch}
              isSearch={true}
              placeholder="Search loan #, customer, phone... (/ to focus)"
              existingCustomers={loans
                .map((l) => ({
                  _id: l._id,
                  name: l.customerName || l.customerId?.name,
                  phone: l.customerPhone || l.customerId?.phone,
                  area: l.customerArea || l.customerId?.area,
                }))
                .filter((c) => c.name)}
              onSelectCustomer={(cust) => {
                setSearch(cust.name);
                saveRecentName(cust.name);
              }}
              inputClassName="w-full h-10 pl-9 pr-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition"
            />
          </div>

          {/* Scheme & Status Dropdowns */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
            >
              <option value="all">All Schemes / அனைத்து திட்டம்</option>
              <option value="daily">Daily Thandal (தினசரி)</option>
              <option value="weekly">Weekly (வாரத்தவணை)</option>
              <option value="monthly">Monthly (மாதத்தவணை)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
            >
              <option value="all">All Status / அனைத்து நிலை</option>
              <option value="active">Active (நடப்பில் உள்ளது)</option>
              <option value="overdue">Overdue (தவணை தவறியது)</option>
              <option value="completed">Closed (முடிவுற்றது)</option>
            </select>
          </div>
        </div>

        {/* Quick Chips & Result Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All', onClick: () => { setTypeFilter('all'); setStatusFilter('all'); } },
              { id: 'daily', label: 'Daily', onClick: () => setTypeFilter('daily') },
              { id: 'weekly', label: 'Weekly', onClick: () => setTypeFilter('weekly') },
              { id: 'monthly', label: 'Monthly', onClick: () => setTypeFilter('monthly') },
              { id: 'overdue', label: 'Overdue', onClick: () => setStatusFilter('overdue') },
              { id: 'completed', label: 'Closed', onClick: () => setStatusFilter('completed') },
            ].map((chip) => {
              const isActive =
                chip.id === 'all'
                  ? typeFilter === 'all' && statusFilter === 'all'
                  : chip.id === 'overdue'
                  ? statusFilter === 'overdue'
                  : chip.id === 'completed'
                  ? statusFilter === 'completed'
                  : typeFilter === chip.id;

              return (
                <button
                  key={chip.id}
                  onClick={() => {
                    chip.onClick();
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Result Count and Clear Filters */}
          <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200">{paginatedLoans.length}</strong> of{' '}
              <strong className="text-slate-800 dark:text-slate-200">{loans.length}</strong> loans
            </span>

            {isFiltering && (
              <button
                onClick={handleClearFilters}
                className="text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. MAIN TABLE / MOBILE CARDS */}
      {isMobile ? (
        /* Mobile Stacked Cards */
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white/60 dark:bg-slate-900/60 rounded-2xl">
              Loading loans...
            </div>
          ) : loans.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Search className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs text-slate-500 font-medium">No loans match your search or filters.</p>
              {isFiltering && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-600 text-xs font-bold"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            paginatedLoans.map((loan) => {
              const cust = resolveCustomer(loan);
              const parsed = parseCustomerName(cust.name);
              const recoveryPct =
                loan.totalPayable > 0
                  ? Math.round(((loan.totalCollected || 0) / loan.totalPayable) * 100)
                  : 0;
              const isOverdue = loan.status === 'overdue';
              const isClosed = loan.status === 'completed';
              const daysOverdue = isOverdue
                ? getOverdueDays(loan.endDate || loan.startDate)
                : 0;

              return (
                <div
                  key={loan._id}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3"
                >
                  {/* Row 1: Customer Avatar + Name + Installment */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-sky-300/40">
                        {(cust.name || 'B').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {parsed.primary}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {cust.phone || 'No phone'} {cust.area ? `• ${cust.area}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold tabular-nums text-sm text-slate-900 dark:text-white">
                        {formatCurrency(loan.installmentAmount)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        /{loan.financeType === 'daily' ? 'day' : loan.financeType === 'weekly' ? 'wk' : 'mo'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Loan # • Scheme • Status */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {loan.loanNo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${
                          loan.financeType === 'daily'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80'
                            : loan.financeType === 'weekly'
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/80'
                            : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/80'
                        }`}
                      >
                        {loan.financeType === 'daily'
                          ? `Daily • ${loan.duration || 100}`
                          : loan.financeType === 'weekly'
                          ? `Weekly • ${loan.duration || 10}`
                          : `Monthly • ${loan.duration || 12}`}
                      </span>
                    </div>

                    {/* Status badge with dot */}
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          isOverdue
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80'
                            : isClosed
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOverdue
                              ? 'bg-rose-500'
                              : isClosed
                              ? 'bg-slate-400'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span className="capitalize">{loan.status}</span>
                      </span>
                      {isOverdue && daysOverdue > 0 && (
                        <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">
                          {daysOverdue}d overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Principal & Disbursed */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/80 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span>
                      Principal:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency(loan.principal)}
                      </strong>
                    </span>
                    <span>
                      Disbursed:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency(
                          loan.disbursedAmount || (loan.principal - (loan.chargeAmount || 0))
                        )}
                      </strong>
                    </span>
                  </div>

                  {/* Row 4: Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-slate-500 tabular-nums">
                      <span>
                        {formatCurrency(loan.totalCollected || 0)} of {formatCurrency(loan.totalPayable)}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {recoveryPct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, recoveryPct))}%` }}
                      />
                    </div>
                  </div>

                  {/* Row 5: Actions (Pay + View + Overflow) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      {loan.remainingBalance > 0 ? (
                        <button
                          onClick={() => setPayLoanItem(buildPayItem(loan, cust))}
                          className="h-8 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm shadow-sky-500/20 flex items-center space-x-1.5 active:scale-95 transition"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay / வரவு</span>
                        </button>
                      ) : (
                        <span className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center border border-emerald-200/60">
                          ✓ Paid
                        </span>
                      )}

                      <button
                        onClick={() => onViewLoan && onViewLoan(loan._id)}
                        className="h-8 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1 active:scale-95 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-500" />
                        <span>View</span>
                      </button>
                    </div>

                    {/* Overflow Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === loan._id ? null : loan._id)}
                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition border border-transparent hover:border-slate-200"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === loan._id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 bottom-full mb-1.5 w-52 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-40"
                        >
                          <button
                            onClick={() => {
                              setEditingLoan(loan);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-500" />
                            <span>Edit Loan / திருத்து</span>
                          </button>

                          <button
                            onClick={() => {
                              downloadLoanAgreementPDF(loan, cust);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                          >
                            <Download className="w-3.5 h-3.5 text-sky-500" />
                            <span>Agreement PDF / ஒப்பந்தம்</span>
                          </button>

                          <button
                            onClick={() => {
                              downloadRepaymentSchedulePDF(loan, cust);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                          >
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Repayment Schedule PDF</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedFormLoan(loan);
                              setShowFormModal(true);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-500" />
                            <span>Application Form / படிவம்</span>
                          </button>

                          <button
                            onClick={() => {
                              setWhatsappHubLoan(loan);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                            <span>WhatsApp / வாட்ஸ்அப்</span>
                          </button>

                          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                          <button
                            onClick={async () => {
                              setOpenMenuId(null);
                              const borrowerName = cust.name || loan.customerName || 'Borrower';
                              if (
                                window.confirm(
                                  `Are you sure you want to permanently delete Loan ${loan.loanNo} (${borrowerName})?`
                                )
                              ) {
                                try {
                                  await api.deleteLoan(loan._id);
                                  fetchLoans();
                                  fetchSummaryLoans();
                                } catch (err) {
                                  alert(err.message || 'Failed to delete loan');
                                }
                              }
                            }}
                            className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete Loan / நீக்கு</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Desktop & Tablet Mode: Simplified Modern Glass Table */
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              {/* Sticky Header */}
              <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Loan</th>
                  <th className="py-3 px-4">Scheme</th>
                  <th className="py-3 px-4">Principal</th>
                  <th className="py-3 px-4">Installment</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {loading ? (
                  /* Loading Skeletons */
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                          <div className="space-y-1.5 w-28">
                            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                            <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 w-24">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 w-24">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 w-32">
                          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full w-full" />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-16" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <div className="h-8 w-14 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : loans.length === 0 ? (
                  /* Empty State */
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="max-w-xs mx-auto space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center">
                          <Search className="w-6 h-6 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {lang === 'ta' ? 'கடன்கள் எதுவும் கிடைக்கவில்லை' : 'No loans match your search'}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {lang === 'ta'
                              ? 'தேடல் சொல் அல்லது வடிகட்டிகளை மாற்றி மீண்டும் முயற்சிக்கவும்'
                              : 'Try adjusting your search terms or filter criteria'}
                          </p>
                        </div>
                        {isFiltering && (
                          <button
                            onClick={handleClearFilters}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 font-bold text-xs hover:bg-sky-100 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{lang === 'ta' ? 'வடிகட்டிகளை மீட்டமைக்க' : 'Clear all filters'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLoans.map((loan) => {
                    const cust = resolveCustomer(loan);
                    const parsed = parseCustomerName(cust.name);
                    const recoveryPct =
                      loan.totalPayable > 0
                        ? Math.round(((loan.totalCollected || 0) / loan.totalPayable) * 100)
                        : 0;
                    const isOverdue = loan.status === 'overdue';
                    const isClosed = loan.status === 'completed';
                    const daysOverdue = isOverdue
                      ? getOverdueDays(loan.endDate || loan.startDate)
                      : 0;

                    return (
                      <tr
                        key={loan._id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition duration-150"
                      >
                        {/* 1. Customer Cell */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-sky-300/40">
                              {(cust.name || 'B').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 max-w-[170px]">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {parsed.primary}
                              </div>
                              {parsed.secondary && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  {parsed.secondary}
                                </div>
                              )}
                              <div className="text-[11px] text-slate-400 truncate">
                                {cust.phone || 'No phone'} {cust.area ? `• ${cust.area}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Loan Cell (Single line monospace #, grey date range below) */}
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {loan.loanNo}
                          </div>
                          <div className="text-[11px] text-slate-400 whitespace-nowrap mt-0.5">
                            {formatDate(loan.startDate)} → {formatDate(loan.endDate)}
                          </div>
                        </td>

                        {/* 3. Scheme Badge (Single line pill: Daily • 100) */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                              loan.financeType === 'daily'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80'
                                : loan.financeType === 'weekly'
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/80'
                                : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/80'
                            }`}
                          >
                            {loan.financeType === 'daily'
                              ? `Daily • ${loan.duration || 100}`
                              : loan.financeType === 'weekly'
                              ? `Weekly • ${loan.duration || 10}`
                              : `Monthly • ${loan.duration || 12}`}
                          </span>
                        </td>

                        {/* 4. Principal Cell (Bold amount, second line small grey) */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(loan.principal)}
                          </div>
                          <div className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap mt-0.5">
                            Disbursed{' '}
                            {formatCurrency(
                              loan.disbursedAmount || (loan.principal - (loan.chargeAmount || 0))
                            )}
                            {loan.chargeAmount ? (
                              <> • Charge {formatCurrency(loan.chargeAmount)}</>
                            ) : (
                              <> • {loan.interestPercent || 0}% int</>
                            )}
                          </div>
                        </td>

                        {/* 5. Installment Cell (Bold amount with grey frequency) */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(loan.installmentAmount)}
                            <span className="font-normal text-xs text-slate-400 ml-1">
                              /{loan.financeType === 'daily' ? 'day' : loan.financeType === 'weekly' ? 'wk' : 'mo'}
                            </span>
                          </div>
                        </td>

                        {/* 6. Progress Cell (Real progress bar with ₹ collected of total and %) */}
                        <td className="py-3 px-4 min-w-[160px]">
                          <div className="w-full max-w-[170px] space-y-1">
                            <div className="flex items-center justify-between text-[11px] tabular-nums">
                              <span className="text-slate-500 dark:text-slate-400 truncate">
                                {formatCurrency(loan.totalCollected || 0)} of{' '}
                                {formatCurrency(loan.totalPayable)}
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1.5">
                                {recoveryPct}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(0, recoveryPct))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 7. Status Badge (Soft pill with dot, X days overdue under it) */}
                        <td className="py-3 px-4">
                          <div>
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isOverdue
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80'
                                  : isClosed
                                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOverdue
                                    ? 'bg-rose-500'
                                    : isClosed
                                    ? 'bg-slate-400'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span className="capitalize">{loan.status}</span>
                            </span>
                            {isOverdue && daysOverdue > 0 && (
                              <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">
                                {daysOverdue} days overdue
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 8. Actions (ONLY 2 visible: Pay + View, rest in ⋮) */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* 1. Pay Button */}
                            {loan.remainingBalance > 0 ? (
                              <button
                                onClick={() => setPayLoanItem(buildPayItem(loan, cust))}
                                className="h-8 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs hover:shadow flex items-center space-x-1.5 active:scale-95 transition whitespace-nowrap"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </button>
                            ) : (
                              <span className="h-8 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center border border-emerald-200/60 whitespace-nowrap">
                                ✓ Paid
                              </span>
                            )}

                            {/* 2. View (Eye) Button */}
                            <button
                              onClick={() => onViewLoan && onViewLoan(loan._id)}
                              className="h-8 w-8 rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center justify-center transition border border-transparent hover:border-sky-200/60"
                              title="View Ledger / தவணை விவரம்"
                            >
                              <Eye className="w-4 h-4 text-sky-500" />
                            </button>

                            {/* 3. Overflow Menu (⋮) */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === loan._id ? null : loan._id);
                                }}
                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition border border-transparent hover:border-slate-200"
                                title="More Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuId === loan._id && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    onClick={() => {
                                      setEditingLoan(loan);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Edit Loan / திருத்து</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      downloadLoanAgreementPDF(loan, cust);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                                  >
                                    <Download className="w-3.5 h-3.5 text-sky-500" />
                                    <span>Agreement PDF / ஒப்பந்தம்</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      downloadRepaymentSchedulePDF(loan, cust);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Repayment Schedule / அட்டவணை</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSelectedFormLoan(loan);
                                      setShowFormModal(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-sky-500" />
                                    <span>Application Form / படிவம்</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setWhatsappHubLoan(loan);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition"
                                  >
                                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>WhatsApp / வாட்ஸ்அப்</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                  <button
                                    onClick={async () => {
                                      setOpenMenuId(null);
                                      const borrowerName = cust.name || loan.customerName || 'Borrower';
                                      if (
                                        window.confirm(
                                          `Are you sure you want to permanently delete Loan ${loan.loanNo} (${borrowerName})?`
                                        )
                                      ) {
                                        try {
                                          await api.deleteLoan(loan._id);
                                          fetchLoans();
                                          fetchSummaryLoans();
                                        } catch (err) {
                                          alert(err.message || 'Failed to delete loan');
                                        }
                                      }
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete Loan / நீக்கு</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. BOTTOM PAGINATION BAR */}
      {loans.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
          {/* Left: Range and Rows per Page */}
          <div className="flex items-center space-x-3">
            <span className="font-medium">
              Showing <strong className="text-slate-900 dark:text-white">{startIndex + 1}</strong>–
              <strong className="text-slate-900 dark:text-white">{endIndex}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white">{loans.length}</strong> loans
            </span>
            <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Right: Previous / Next Controls */}
          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-bold px-2 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Add Loan Modal */}
      {showAddModal && (
        <LoanModal
          customers={customers}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchLoans();
            fetchSummaryLoans();
          }}
        />
      )}

      {/* 2. Payment Recording Modal */}
      {payLoanItem && (
        <PaymentModal
          loanItem={payLoanItem}
          onClose={() => setPayLoanItem(null)}
          onSuccess={(recordedPayment) => {
            fetchLoans();
            fetchSummaryLoans();
            fetchDashboardStats();
            setReceiptPayment(recordedPayment);
          }}
        />
      )}

      {/* 3. Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {/* 4. WhatsApp Pre-filled Reminder Modal */}
      {whatsappItem && (
        <WhatsAppReminderModal
          item={whatsappItem}
          onClose={() => setWhatsappItem(null)}
        />
      )}

      {/* 5. WhatsApp Hub Modal (Manual Web Automation) */}
      {whatsappHubLoan && (
        <WhatsAppHubModal
          isOpen={!!whatsappHubLoan}
          onClose={() => setWhatsappHubLoan(null)}
          initialLoan={whatsappHubLoan}
        />
      )}

      {/* 6. Official Loan Application Form (Print & Download) */}
      <LoanApplicationFormModal
        isOpen={showFormModal}
        prefillData={selectedFormLoan}
        onLoanCreated={() => {
          fetchLoans();
          fetchSummaryLoans();
          fetchCustomers();
        }}
        onClose={() => {
          setShowFormModal(false);
          setSelectedFormLoan(null);
        }}
      />

      {/* 7. Edit Loan Modal */}
      {editingLoan && (
        <EditLoanModal
          isOpen={Boolean(editingLoan)}
          loan={editingLoan}
          customer={editingLoan.customerId}
          onClose={() => setEditingLoan(null)}
          onSuccess={(updatedLoan) => {
            setLoans((prev) =>
              prev.map((l) => (l._id === updatedLoan._id ? updatedLoan : l))
            );
            fetchSummaryLoans();
            setEditingLoan(null);
          }}
        />
      )}
    </div>
  );
};

export default Loans;
