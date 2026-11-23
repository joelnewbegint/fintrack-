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
  AlertTriangle,
  Coins,
  Wallet,
  Users,
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
  Keyboard,
  ChevronRight as ArrowRight,
  Clock,
  CalendarRange,
  CalendarCheck,
  Archive,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

// Initials avatar helper for Ocean Blue Theme
const getAvatarStyle = (name = '') => {
  const char = (name || 'B').trim().charAt(0).toUpperCase();
  return {
    char,
    classes: 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] shadow-xs',
  };
};

export const Loans = ({ initialType = 'all', onViewLoan, onSelectScheme }) => {
  const { t, lang } = useLanguage();
  const { isOwner } = useAuth();
  const { isMobile } = useDeviceMode();

  const [loans, setLoans] = useState([]);
  const [allLoansSummary, setAllLoansSummary] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [todayCollected, setTodayCollected] = useState(0);
  const [loading, setLoading] = useState(true);

  // Overall financial summary data (Owner view)
  const [overallSummary, setOverallSummary] = useState(null);
  const [overallViewToggle, setOverallViewToggle] = useState('active'); // 'active' | 'closed' | 'all'

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

  // Fetch overall summary across daily, weekly, monthly
  const fetchOverallSummary = async () => {
    try {
      const res = await api.getLoanOverallSummary();
      if (res?.success) {
        setOverallSummary(res);
      }
    } catch (err) {
      console.warn('Failed to fetch overall loan summary:', err);
    }
  };

  // Fetch active loans without filter to keep summary cards consistent (excluding closed loans)
  const fetchSummaryLoans = async () => {
    try {
      const res = await api.getLoans({ excludeClosed: true });
      if (res?.success && Array.isArray(res.loans)) {
        const activeOnly = res.loans.filter(
          (l) => l.status !== 'completed' && l.status !== 'closed' && (l.remainingBalance == null || Number(l.remainingBalance) > 0)
        );
        setAllLoansSummary(activeOnly);
      }
    } catch (err) {
      console.warn('Summary loans fetch failed:', err);
    }
  };

  // Fetch filtered active loans for table (strictly hiding closed loans)
  const fetchLoans = async (isBackground = false) => {
    try {
      if (!isBackground && loans.length === 0) {
        setLoading(true);
      }
      const res = await api.getLoans({
        financeType: typeFilter,
        status: statusFilter,
        search,
        excludeClosed: true,
      });
      if (res?.success) {
        const activeOnly = (res.loans || []).filter(
          (l) => l.status !== 'completed' && l.status !== 'closed' && (l.remainingBalance == null || Number(l.remainingBalance) > 0)
        );
        setLoans(activeOnly);
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
    fetchOverallSummary();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    fetchLoans(false);
    setCurrentPage(1);

    const handleSyncUpdate = () => {
      if (!showAddModal && !payLoanItem && !editingLoan && !showFormModal) {
        fetchLoans(true);
        fetchSummaryLoans();
        fetchOverallSummary();
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

  // Scheme statistics for the 3 clickable summary cards
  const schemeStats = useMemo(() => {
    const s = summarySource;
    const calc = (type) => {
      const typeLoans = s.filter((l) => (l.financeType || 'daily').toLowerCase() === type);
      return {
        count: typeLoans.length,
        principal: typeLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0),
        overdueCount: typeLoans.filter((l) => l.status === 'overdue').length,
      };
    };
    return {
      daily: calc('daily'),
      weekly: calc('weekly'),
      monthly: calc('monthly'),
    };
  }, [summarySource]);

  // Live Counts for Quick Chips (strictly active loans only)
  const chipCounts = useMemo(() => {
    const s = summarySource;
    return {
      all: s.length,
      daily: s.filter((l) => l.financeType === 'daily').length,
      weekly: s.filter((l) => l.financeType === 'weekly').length,
      monthly: s.filter((l) => l.financeType === 'monthly').length,
      overdue: s.filter((l) => l.status === 'overdue').length,
      closed: overallSummary?.overall?.closedLoansCount ?? 0,
    };
  }, [summarySource, overallSummary]);

  // Overall financial calculations based on Active / Closed / All toggle
  const displayedOverall = useMemo(() => {
    if (!overallSummary) return null;
    const { overall, byType, activeLoans, closedLoans } = overallSummary;

    if (overallViewToggle === 'closed') {
      const list = closedLoans || [];
      const pr = list.reduce((acc, l) => acc + (Number(l.principal) || 0), 0);
      const interest = list.reduce((acc, l) => acc + (Number(l.computedInterest || l.chargeAmount) || 0), 0);
      const profit = list.reduce((acc, l) => acc + (Number(l.computedProfit || l.chargeAmount) || 0), 0);
      const collected = list.reduce((acc, l) => acc + (Number(l.totalCollected || l.totalPayable || l.principal) || 0), 0);
      const dPr = list.filter((l) => l.financeType === 'daily').reduce((a, b) => a + (Number(b.principal) || 0), 0);
      const wPr = list.filter((l) => l.financeType === 'weekly').reduce((a, b) => a + (Number(b.principal) || 0), 0);
      const mPr = list.filter((l) => l.financeType === 'monthly').reduce((a, b) => a + (Number(b.principal) || 0), 0);
      return {
        title: lang === 'ta' ? 'முடிந்த கடன்கள் நிதி' : 'Closed Loans Portfolio',
        totalLoanAmount: pr,
        totalInterest: interest,
        totalProfit: profit,
        totalCollected: collected,
        outstandingBalance: 0,
        count: list.length,
        dailyPr: dPr,
        weeklyPr: wPr,
        monthlyPr: mPr,
      };
    } else if (overallViewToggle === 'active') {
      const list = activeLoans || [];
      const pr = list.reduce((acc, l) => acc + (Number(l.principal) || 0), 0);
      const interest = list.reduce((acc, l) => acc + (Number(l.computedInterest || l.chargeAmount) || 0), 0);
      const profit = list.reduce((acc, l) => acc + (Number(l.computedProfit) || 0), 0);
      const collected = list.reduce((acc, l) => acc + (Number(l.totalCollected) || 0), 0);
      const outstanding = list.reduce((acc, l) => acc + Math.max(0, Number(l.remainingBalance) || 0), 0);
      const dPr = list.filter((l) => l.financeType === 'daily').reduce((a, b) => a + (Number(b.principal) || 0), 0);
      const wPr = list.filter((l) => l.financeType === 'weekly').reduce((a, b) => a + (Number(b.principal) || 0), 0);
      const mPr = list.filter((l) => l.financeType === 'monthly').reduce((a, b) => a + (Number(b.principal) || 0), 0);
      return {
        title: lang === 'ta' ? 'நடப்பு கடன்கள் நிதி' : 'Active Loans Portfolio',
        totalLoanAmount: pr,
        totalInterest: interest,
        totalProfit: profit,
        totalCollected: collected,
        outstandingBalance: outstanding,
        count: list.length,
        dailyPr: dPr,
        weeklyPr: wPr,
        monthlyPr: mPr,
      };
    } else {
      // 'all'
      return {
        title: lang === 'ta' ? 'முழுமையான நிதி (நடப்பு + முடிந்தவை)' : 'Combined Portfolio (Active + Closed)',
        totalLoanAmount: overall?.totalLoanAmount || 0,
        totalInterest: overall?.totalInterest || 0,
        totalProfit: overall?.totalProfit || 0,
        totalCollected: overall?.totalCollected || 0,
        outstandingBalance: overall?.outstandingBalance || 0,
        count: overall?.totalLoansCount || 0,
        dailyPr: byType?.daily?.totalLoanAmount || 0,
        weeklyPr: byType?.weekly?.totalLoanAmount || 0,
        monthlyPr: byType?.monthly?.totalLoanAmount || 0,
      };
    }
  }, [overallSummary, overallViewToggle, lang]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(loans.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, loans.length);
  const paginatedLoans = useMemo(
    () => loans.slice(startIndex, endIndex),
    [loans, startIndex, endIndex]
  );

  // Page Numbers List Generator
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [totalPages, currentPage]);

  // Clear all filters
  const handleClearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setSearch('');
    setCurrentPage(1);
  };

  const isFiltering = search || typeFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-5 max-w-full">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Big Coin Icon + Title + 2 Subtitle Lines */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-sm border border-sky-200/60 dark:border-sky-800/40">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Loans / கடன் கணக்குகள்
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              Manage customer loans, installments and collections in one place.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
              வாடிக்கையாளர் கடன்கள், தவணைகள் மற்றும் வசூல்களை ஒரே இடத்தில் நிர்வகிக்கவும்.
            </p>
          </div>
        </div>

        {/* Right Buttons: + New Loan (N) and Application Form */}
        <div className="flex items-center space-x-2.5 shrink-0 self-start sm:self-auto">
          {/* Primary: + New Loan (N) with Tamil subtitle */}
          {isOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="h-11 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/25 flex items-center space-x-2 active:scale-95 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <div className="text-left">
                <p className="text-xs font-black leading-tight">New Loan (N)</p>
                <p className="text-[10px] text-sky-100 leading-tight">புதிய கடன்</p>
              </div>
            </button>
          )}

          {/* Secondary: Application Form with Tamil subtitle */}
          <button
            onClick={() => {
              setSelectedFormLoan(null);
              setShowFormModal(true);
            }}
            className="h-11 px-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-xs flex items-center space-x-2 active:scale-95 transition"
            title="Download or Print Blank Loan Application Form"
          >
            <FileText className="w-4 h-4 text-sky-500 shrink-0" />
            <div className="text-left">
              <p className="text-xs font-bold leading-tight">Application Form</p>
              <p className="text-[10px] text-slate-400 leading-tight">கடன் விண்ணப்ப படிவம்</p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS (4 Cards Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Active Loans */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              Total Active Loans
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              செயலில் உள்ள கடன்கள்
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
              {activeLoansCount}
            </p>
          </div>
        </div>

        {/* Card 2: Total Principal */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              Total Principal
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              மொத்த முதற்கடன் தொகை
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5 truncate">
              {formatCurrency(totalPrincipal)}
            </p>
          </div>
        </div>

        {/* Card 3: Collected Today */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              Collected Today
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              இன்று வசூலித்த தொகை
            </p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight mt-0.5 truncate">
              {formatCurrency(todayCollected)}
            </p>
          </div>
        </div>

        {/* Card 4: Overdue Amount (Red accent, clickable with arrow) */}
        <button
          onClick={() => {
            setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue');
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl p-4 border shadow-sm flex items-center justify-between transition active:scale-[0.98] ${
            statusFilter === 'overdue'
              ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-400'
              : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 hover:border-rose-300'
          }`}
          title="Click to filter overdue loans"
        >
          <div className="flex items-center space-x-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                statusFilter === 'overdue'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p
                className={`text-xs font-bold truncate ${
                  statusFilter === 'overdue' ? 'text-white' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                Overdue Amount
              </p>
              <p
                className={`text-[10px] truncate ${
                  statusFilter === 'overdue' ? 'text-rose-100' : 'text-rose-600/70 dark:text-rose-400/70'
                }`}
              >
                கால அவகாசம் மீறிய தொகை
              </p>
              <p
                className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 truncate ${
                  statusFilter === 'overdue' ? 'text-white' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(overdueAmount)}
              </p>
            </div>
          </div>
          <ArrowRight
            className={`w-5 h-5 shrink-0 ml-2 ${
              statusFilter === 'overdue' ? 'text-white' : 'text-rose-400'
            }`}
          />
        </button>
      </div>

      {/* 2.2 OVERALL PORTFOLIO SUMMARY (Owner View & Loans Home) with Active / Closed / All Toggle */}
      {isOwner && displayedOverall && (
        <div
          className="rounded-3xl p-5 border transition-all duration-300 space-y-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 249, 255, 0.85) 100%)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(186, 230, 253, 0.9)',
            boxShadow: '0 8px 30px -6px rgba(14, 165, 233, 0.12), 0 2px 10px -2px rgba(249, 115, 22, 0.08)',
          }}
        >
          {/* Header row: Title + Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-sky-100 dark:border-sky-900/50">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center shadow-xs">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
                  {lang === 'ta' ? 'ஒட்டுமொத்த நிதி தொகுப்பு (Overall Portfolio)' : 'Overall Portfolio Financials'}
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  Daily + Weekly + Monthly • {displayedOverall.count} {lang === 'ta' ? 'கணக்குகள்' : 'accounts'}
                </p>
              </div>
            </div>

            {/* Toggle: Active / Closed / All */}
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-sky-200/80 dark:border-sky-900/60 shadow-xs self-start sm:self-auto">
              {[
                { id: 'active', en: 'Active', ta: 'நடப்பு' },
                { id: 'closed', en: 'Closed', ta: 'முடிந்தவை' },
                { id: 'all', en: 'All Combined', ta: 'அனைத்தும்' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setOverallViewToggle(opt.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                    overallViewToggle === opt.id
                      ? 'btn-sky-primary text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {lang === 'ta' ? opt.ta : opt.en}
                </button>
              ))}
            </div>
          </div>

          {/* Combined Metrics 5-Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Loan Amount */}
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-orange-100 dark:border-orange-950 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                {lang === 'ta' ? 'மொத்த அசல்' : 'Total Loan Amount'}
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(displayedOverall.totalLoanAmount)}
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                {lang === 'ta' ? 'அனைத்து திட்டங்கள்' : 'Combined principal'}
              </p>
            </div>

            {/* 2. Total Interest */}
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-amber-100 dark:border-amber-950 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                {lang === 'ta' ? 'மொத்த வட்டி' : 'Total Interest'}
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                +{formatCurrency(displayedOverall.totalInterest)}
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                {lang === 'ta' ? 'வட்டி பகுதி' : 'Interest portion'}
              </p>
            </div>

            {/* 3. Total Profit */}
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-emerald-100 dark:border-emerald-950 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {lang === 'ta' ? 'ஈட்டிய நிகர லாபம்' : 'Total Profit'}
              </span>
              <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                +{formatCurrency(displayedOverall.totalProfit)}
              </p>
              <p className="text-[9px] text-emerald-600/80 font-medium">
                {lang === 'ta' ? 'வசூலான லாபம்' : 'Earned to date'}
              </p>
            </div>

            {/* 4. Amount Collected */}
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-sky-100 dark:border-sky-950 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
                {lang === 'ta' ? 'மொத்த வசூல்' : 'Amount Collected'}
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(displayedOverall.totalCollected)}
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                {lang === 'ta' ? 'செலுத்தப்பட்ட தொகை' : 'Repaid principal+int'}
              </p>
            </div>

            {/* 5. Outstanding Balance */}
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-rose-100 dark:border-rose-950 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                {lang === 'ta' ? 'நிலுவைத் தொகை' : 'Outstanding Balance'}
              </span>
              <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(displayedOverall.outstandingBalance)}
              </p>
              <p className="text-[9px] text-rose-500 font-medium">
                {lang === 'ta' ? 'வர வேண்டிய பாக்கி' : 'Remaining dues'}
              </p>
            </div>
          </div>

          {/* Per-Type Comparison Stacked Bar & Division Summary */}
          {displayedOverall.totalLoanAmount > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span>{lang === 'ta' ? 'திட்ட வாரியாக ஒப்பீடு (Per-Type Comparison)' : 'Per-Type Distribution & Share'}:</span>
                <button
                  onClick={() => {
                    try {
                      window.history.pushState({}, '', '/loans/closed');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    } catch (e) {}
                  }}
                  className="text-sky-600 hover:text-sky-700 hover:underline flex items-center space-x-1 font-bold"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'முடிந்த கடன்கள் காப்பகம்' : 'Closed Loans Archive'} ({overallSummary?.overall?.closedLoansCount ?? 0}) →</span>
                </button>
              </div>

              {/* Stacked Bar */}
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                {displayedOverall.dailyPr > 0 && (
                  <div
                    style={{ width: `${Math.round((displayedOverall.dailyPr / displayedOverall.totalLoanAmount) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    title={`Daily: ${formatCurrency(displayedOverall.dailyPr)}`}
                  />
                )}
                {displayedOverall.weeklyPr > 0 && (
                  <div
                    style={{ width: `${Math.round((displayedOverall.weeklyPr / displayedOverall.totalLoanAmount) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all duration-500"
                    title={`Weekly: ${formatCurrency(displayedOverall.weeklyPr)}`}
                  />
                )}
                {displayedOverall.monthlyPr > 0 && (
                  <div
                    style={{ width: `${Math.round((displayedOverall.monthlyPr / displayedOverall.totalLoanAmount) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    title={`Monthly: ${formatCurrency(displayedOverall.monthlyPr)}`}
                  />
                )}
              </div>

              {/* Legend with direct jump links */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] pt-0.5">
                <button
                  onClick={() => (onSelectScheme ? onSelectScheme('daily') : setTypeFilter('daily'))}
                  className="flex items-center space-x-1.5 hover:underline text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Daily:</span>
                  <span className="font-semibold text-slate-500">{formatCurrency(displayedOverall.dailyPr)}</span>
                  <span className="text-amber-600 font-bold">({Math.round((displayedOverall.dailyPr / displayedOverall.totalLoanAmount) * 100) || 0}%)</span>
                </button>

                <button
                  onClick={() => (onSelectScheme ? onSelectScheme('weekly') : setTypeFilter('weekly'))}
                  className="flex items-center space-x-1.5 hover:underline text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Weekly:</span>
                  <span className="font-semibold text-slate-500">{formatCurrency(displayedOverall.weeklyPr)}</span>
                  <span className="text-sky-600 font-bold">({Math.round((displayedOverall.weeklyPr / displayedOverall.totalLoanAmount) * 100) || 0}%)</span>
                </button>

                <button
                  onClick={() => (onSelectScheme ? onSelectScheme('monthly') : setTypeFilter('monthly'))}
                  className="flex items-center space-x-1.5 hover:underline text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Monthly:</span>
                  <span className="font-semibold text-slate-500">{formatCurrency(displayedOverall.monthlyPr)}</span>
                  <span className="text-emerald-600 font-bold">({Math.round((displayedOverall.monthlyPr / displayedOverall.totalLoanAmount) * 100) || 0}%)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2.5 SCHEME SUMMARY CARDS (Clickable: Daily / Weekly / Monthly -> Opens Scheme Loan Page) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Daily Scheme Card */}
        <button
          type="button"
          onClick={() => (onSelectScheme ? onSelectScheme('daily') : setTypeFilter('daily'))}
          className="group relative text-left bg-gradient-to-br from-white/95 to-amber-50/40 dark:from-slate-900/90 dark:to-amber-950/20 backdrop-blur-md rounded-2xl p-4 border border-amber-200/70 dark:border-amber-900/40 shadow-sm hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Daily Finance
                  </h3>
                  {schemeStats.daily.overdueCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                      {schemeStats.daily.overdueCount} due
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80">
                  தினசரி கடன் ({schemeStats.daily.count})
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100/80 dark:border-amber-950/50 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Principal / முதல்
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {formatCurrency(schemeStats.daily.principal)}
              </p>
            </div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
              View daily loans →
            </span>
          </div>
        </button>

        {/* Weekly Scheme Card */}
        <button
          type="button"
          onClick={() => (onSelectScheme ? onSelectScheme('weekly') : setTypeFilter('weekly'))}
          className="group relative text-left bg-gradient-to-br from-white/95 to-sky-50/40 dark:from-slate-900/90 dark:to-sky-950/20 backdrop-blur-md rounded-2xl p-4 border border-sky-200/70 dark:border-sky-900/40 shadow-sm hover:shadow-lg hover:shadow-sky-500/10 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Weekly Finance
                  </h3>
                  {schemeStats.weekly.overdueCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                      {schemeStats.weekly.overdueCount} due
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-sky-700/80 dark:text-sky-400/80">
                  வாராந்திர கடன் ({schemeStats.weekly.count})
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/60 transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-sky-100/80 dark:border-sky-950/50 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Principal / முதல்
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {formatCurrency(schemeStats.weekly.principal)}
              </p>
            </div>
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
              View weekly loans →
            </span>
          </div>
        </button>

        {/* Monthly Scheme Card */}
        <button
          type="button"
          onClick={() => (onSelectScheme ? onSelectScheme('monthly') : setTypeFilter('monthly'))}
          className="group relative text-left bg-gradient-to-br from-white/95 to-emerald-50/40 dark:from-slate-900/90 dark:to-emerald-950/20 backdrop-blur-md rounded-2xl p-4 border border-emerald-200/70 dark:border-emerald-900/40 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Monthly Finance
                  </h3>
                  {schemeStats.monthly.overdueCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                      {schemeStats.monthly.overdueCount} due
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400/80">
                  மாதாந்திர கடன் ({schemeStats.monthly.count})
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-100/80 dark:border-emerald-950/50 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Principal / முதல்
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {formatCurrency(schemeStats.monthly.principal)}
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
              View monthly loans →
            </span>
          </div>
        </button>
      </div>

      {/* 3. FILTER BAR (Matching Mockup with Labeled Dropdowns & Chips) */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5">
        {/* Top Filter Row: Search Input + Scheme Select + Status Select + Clear Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <SmartNameInput
              id="loans-search-input"
              value={search}
              onChange={setSearch}
              isSearch={true}
              placeholder="Search loan #, customer, phone... ( / )"
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
              inputClassName="w-full h-10 pl-9 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-400 transition"
            />
          </div>

          {/* Scheme Dropdown with Label on Top */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Scheme / திட்டம்
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 min-w-[150px] rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
            >
              <option value="all">All Schemes</option>
              <option value="daily">Daily Thandal (தினசரி)</option>
              <option value="weekly">Weekly (வாரத்தவணை)</option>
              <option value="monthly">Monthly (மாதத்தவணை)</option>
            </select>
          </div>

          {/* Status Dropdown with Label on Top */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Status / நிலை
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 min-w-[150px] rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
            >
              <option value="all">All Active Status</option>
              <option value="active">Active (நடப்பில் உள்ளது)</option>
              <option value="overdue">Overdue (தவணை தவறியது)</option>
            </select>
          </div>

          {/* Clear Filters Link */}
          <div className="pb-1">
            <button
              onClick={handleClearFilters}
              className="h-10 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center space-x-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Quick Filter Chips with Live Counts + Showing Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: `All Active (${chipCounts.all})`, onClick: () => { setTypeFilter('all'); setStatusFilter('all'); } },
              { id: 'daily', label: `Daily (${chipCounts.daily})`, onClick: () => setTypeFilter('daily') },
              { id: 'weekly', label: `Weekly (${chipCounts.weekly})`, onClick: () => setTypeFilter('weekly') },
              { id: 'monthly', label: `Monthly (${chipCounts.monthly})`, onClick: () => setTypeFilter('monthly') },
              { id: 'overdue', label: `Overdue (${chipCounts.overdue})`, isOverduePill: true, onClick: () => setStatusFilter('overdue') },
            ].map((chip) => {
              const isActive =
                chip.id === 'all'
                  ? typeFilter === 'all' && statusFilter === 'all'
                  : chip.id === 'overdue'
                  ? statusFilter === 'overdue'
                  : typeFilter === chip.id;

              return (
                <button
                  key={chip.id}
                  onClick={() => {
                    chip.onClick();
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                    isActive
                      ? chip.isOverduePill
                        ? 'bg-rose-500 text-white'
                        : 'bg-sky-500 text-white'
                      : chip.isOverduePill
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              try {
                window.history.pushState({}, '', '/loans/closed');
                window.dispatchEvent(new PopStateEvent('popstate'));
              } catch (e) {}
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-sky-600 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-sky-50 dark:hover:bg-slate-700 transition flex items-center space-x-1.5 border border-slate-200/80 dark:border-slate-700 shadow-xs active:scale-95"
            title="View Closed Loans Archive"
          >
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === 'ta' ? 'முடிந்த கடன்கள்' : 'Closed Loans'} ({overallSummary?.overall?.closedLoansCount ?? chipCounts.closed}) →</span>
          </button>

          <div className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
            Showing <strong className="text-slate-800 dark:text-slate-200">{paginatedLoans.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{loans.length}</strong> loans
          </div>
        </div>
      </div>

      {/* 4. TABLE OR MOBILE CARDS */}
      {isMobile ? (
        /* Mobile View (Responsive Card matching Mockup preview) */
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white/60 dark:bg-slate-900/60 rounded-2xl">
              Loading loans...
            </div>
          ) : loans.length === 0 ? (
            /* Empty State matching Mockup */
            <div className="py-12 px-4 text-center space-y-3 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                No loans found
              </h3>
              <p className="text-xs text-slate-400">கடன் பதிவுகள் இல்லை</p>
              {isOwner && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold"
                >
                  + New Loan (N)
                </button>
              )}
            </div>
          ) : (
            paginatedLoans.map((loan) => {
              const cust = resolveCustomer(loan);
              const parsed = parseCustomerName(cust.name);
              const avatar = getAvatarStyle(cust.name);
              const recoveryPct =
                loan.totalPayable > 0
                  ? Math.round(((loan.totalCollected || 0) / loan.totalPayable) * 100)
                  : 0;
              const isOverdue = loan.status === 'overdue';
              const daysOverdue = isOverdue
                ? getOverdueDays(loan.endDate || loan.startDate)
                : 0;

              return (
                <div
                  key={loan._id}
                  className="glass-card glass-hover rounded-[20px] p-4 bg-white/62 border border-white/85 shadow-ocean space-y-3"
                >
                  {/* Top: Customer Avatar + Name + Loan # */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full ${avatar.classes} font-bold text-xs flex items-center justify-center shrink-0`}>
                        {avatar.char}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-ink truncate">
                          {parsed.primary}
                        </p>
                        <p className="font-mono text-xs text-muted">
                          {loan.loanNo}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isOverdue ? 'badge-overdue' : 'badge-paid'
                      }`}>
                        <span>{isOverdue ? `Overdue • ${daysOverdue}d` : 'Active'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Principal & Installment */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <p className="text-base font-black text-ink tabular-nums">
                        {formatCurrency(loan.principal)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-ink">
                        {formatCurrency(loan.installmentAmount)}{' '}
                        <span className="text-[10px] text-muted font-normal">/ day</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Balance */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-muted tabular-nums">
                      <span>{formatCurrency(loan.totalCollected || 0)} of {formatCurrency(loan.totalPayable)} ({recoveryPct}%)</span>
                      {Number(loan.remainingBalance) > 0 ? (
                        <span className="font-bold text-[#8A4A1F]">
                          Bal: {formatCurrency(loan.remainingBalance)}
                        </span>
                      ) : (
                        <span className="font-bold text-[#1F6B4F]">Paid</span>
                      )}
                    </div>
                    <div className="w-full bg-white/80 border border-white/90 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#1F6FC8] h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, recoveryPct))}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {loan.remainingBalance > 0 ? (
                      <button
                        onClick={() => setPayLoanItem(buildPayItem(loan, cust))}
                        className="flex-1 h-8 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center space-x-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>
                    ) : (
                      <div className="flex-1 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                        ✓ Paid
                      </div>
                    )}

                    <button
                      onClick={() => onViewLoan && onViewLoan(loan._id)}
                      className="px-3 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-500" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => setOpenMenuId(openMenuId === loan._id ? null : loan._id)}
                      className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Desktop & Tablet Table (Exact 1:1 Match of Mockup) */
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              {/* Sticky Table Header with English on top, Tamil underneath */}
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80">
                <tr>
                  <th className="py-3 px-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Customer</p>
                    <p className="text-[10px] text-slate-400 font-medium">வாடிக்கையாளர்</p>
                  </th>
                  <th className="py-3 px-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Loan</p>
                    <p className="text-[10px] text-slate-400 font-medium">கடன் விவரம்</p>
                  </th>
                  <th className="py-3 px-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Scheme</p>
                    <p className="text-[10px] text-slate-400 font-medium">திட்டம்</p>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Principal</p>
                    <p className="text-[10px] text-slate-400 font-medium">முதற்கடன்</p>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Installment</p>
                    <p className="text-[10px] text-slate-400 font-medium">தவணை</p>
                  </th>
                  <th className="py-3 px-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Progress</p>
                    <p className="text-[10px] text-slate-400 font-medium">செலுத்திய முன்னேற்றம்</p>
                  </th>
                  <th className="py-3 px-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Status</p>
                    <p className="text-[10px] text-slate-400 font-medium">நிலை</p>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Actions</p>
                    <p className="text-[10px] text-slate-400 font-medium">செயல்கள்</p>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {loading ? (
                  /* Loading Skeleton matching Mockup */
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
                  /* Empty State matching Mockup */
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="max-w-xs mx-auto space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center">
                          <FileText className="w-7 h-7 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            No loans found
                          </h3>
                          <p className="text-xs text-slate-400">கடன் பதிவுகள் இல்லை</p>
                          <p className="text-[11px] text-slate-400">
                            Try changing the filters or add a new loan.
                          </p>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition"
                          >
                            + New Loan (N)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLoans.map((loan) => {
                    const cust = resolveCustomer(loan);
                    const parsed = parseCustomerName(cust.name);
                    const avatar = getAvatarStyle(cust.name);
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
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition duration-150"
                      >
                        {/* 1. Customer Cell (Colorful Initial Avatar + Bold Name + Phone • Area) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-full ${avatar.classes} font-bold text-xs flex items-center justify-center shrink-0`}>
                              {avatar.char}
                            </div>
                            <div className="min-w-0 max-w-[170px]">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {parsed.primary}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {cust.phone || 'No phone'} {cust.area ? `• ${cust.area}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Loan Cell (Monospace Loan # + Date Range) */}
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {loan.loanNo}
                          </div>
                          <div className="text-[11px] text-slate-400 whitespace-nowrap mt-0.5">
                            {formatDate(loan.startDate)} → {formatDate(loan.endDate)}
                          </div>
                        </td>

                        {/* 3. Scheme Cell (Compact single line pill: Daily • 100, etc.) */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                              loan.financeType === 'daily'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80'
                                : loan.financeType === 'weekly'
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/80'
                                : 'bg-[#EAF5FF] text-[#18A879] border border-[#D5E9FA]'
                            }`}
                          >
                            {loan.financeType === 'daily'
                              ? `Daily • ${loan.duration || 100}`
                              : loan.financeType === 'weekly'
                              ? `Weekly • ${loan.duration || 10}`
                              : `Monthly • ${loan.duration || 12}`}
                          </span>
                        </td>

                        {/* 4. Principal Cell (Bold Amount + Disbursed/Charge Sub-line) */}
                        <td className="py-3 px-4 text-right">
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

                        {/* 5. Installment Cell (Bold amount with frequency) */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(loan.installmentAmount)}
                            <span className="font-normal text-xs text-slate-400 ml-1">
                              /{loan.financeType === 'daily' ? 'day' : loan.financeType === 'weekly' ? 'week' : 'month'}
                            </span>
                          </div>
                        </td>

                        {/* 6. Progress Cell (Real green bar with Collected of Total and %) */}
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
                            {Number(loan.remainingBalance) > 0 ? (
                              <div className="text-[10px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                                Bal: {formatCurrency(loan.remainingBalance)}
                              </div>
                            ) : (
                              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                Fully Repaid
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 7. Status Cell (Dot + Status + Overdue/Next Sub-line) */}
                        <td className="py-3 px-4">
                          <div>
                            <span
                              className={`inline-flex items-center space-x-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                                isOverdue
                                  ? 'badge-overdue text-rose-600 dark:text-rose-400'
                                  : isClosed
                                  ? 'badge-paid text-slate-500 dark:text-slate-400'
                                  : 'badge-duetoday text-emerald-600 dark:text-emerald-400'
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
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isOverdue && daysOverdue > 0
                                ? `${daysOverdue} days overdue`
                                : isClosed
                                ? 'Completed'
                                : `Next: ${formatDate(loan.endDate)}`}
                            </div>
                          </div>
                        </td>

                        {/* 8. Actions (Pay + View + Overflow ⋮) */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Pay Button */}
                            {loan.remainingBalance > 0 ? (
                              <button
                                onClick={() => setPayLoanItem(buildPayItem(loan, cust))}
                                className="h-8 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs hover:shadow flex items-center space-x-1 active:scale-95 transition whitespace-nowrap"
                              >
                                <span>₹ Pay</span>
                              </button>
                            ) : (
                              <span className="h-8 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center border border-emerald-200/60 whitespace-nowrap">
                                ✓ Paid
                              </span>
                            )}

                            {/* View (Eye) Button */}
                            <button
                              onClick={() => onViewLoan && onViewLoan(loan._id)}
                              className="h-8 w-8 rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center justify-center transition border border-transparent hover:border-sky-200/60"
                              title="View Ledger / விவரம்"
                            >
                              <Eye className="w-4 h-4 text-sky-500" />
                            </button>

                            {/* Overflow ⋮ Button */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === loan._id ? null : loan._id);
                                }}
                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
                                title="More Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu matching Mockup */}
                              {openMenuId === loan._id && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    onClick={() => {
                                      setEditingLoan(loan);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Edit Loan</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      downloadLoanAgreementPDF(loan, cust);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Download</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      downloadRepaymentSchedulePDF(loan, cust);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Calendar / Schedule</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSelectedFormLoan(loan);
                                      setShowFormModal(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Statement</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setWhatsappHubLoan(loan);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition"
                                  >
                                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>WhatsApp</span>
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
                                    <span>Delete</span>
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

          {/* 5. PAGINATION (Bottom of Table matching Mockup) */}
          {loans.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              {/* Left: Rows per page: [ 25 ▾ ] */}
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Right: Numbered Navigation buttons < 1 2 3 4 5 ... 14 > */}
              <div className="flex items-center space-x-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {paginationRange.map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-1 text-slate-400 font-bold">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = currentPage === page;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition flex items-center justify-center ${
                        isCurrent
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center text-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. BOTTOM BAR: KEYBOARD SHORTCUTS (Exact match from Mockup) */}
      <div className="flex flex-wrap items-center space-x-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 shadow-2xs">
        <div className="flex items-center space-x-2 font-bold text-slate-700 dark:text-slate-300">
          <Keyboard className="w-4 h-4 text-sky-500" />
          <span>Keyboard Shortcuts / விசைப்பலகை குறுக்குவழிகள்:</span>
        </div>

        <div className="flex items-center space-x-1.5 font-medium">
          <kbd className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-mono font-bold text-[11px] border border-sky-200/60 dark:border-sky-800/60">
            N
          </kbd>
          <span>– New Loan (புதிய கடன்)</span>
        </div>

        <div className="flex items-center space-x-1.5 font-medium">
          <kbd className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-mono font-bold text-[11px] border border-sky-200/60 dark:border-sky-800/60">
            /
          </kbd>
          <span>– Focus Search (தேடல்)</span>
        </div>
      </div>

      {/* MODALS */}
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

      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {whatsappItem && (
        <WhatsAppReminderModal
          item={whatsappItem}
          onClose={() => setWhatsappItem(null)}
        />
      )}

      {whatsappHubLoan && (
        <WhatsAppHubModal
          isOpen={!!whatsappHubLoan}
          onClose={() => setWhatsappHubLoan(null)}
          initialLoan={whatsappHubLoan}
        />
      )}

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
