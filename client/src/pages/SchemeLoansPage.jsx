import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate, getOverdueDays } from '../utils/currency';
import {
  ArrowLeft,
  Coins,
  Clock,
  CalendarRange,
  CalendarCheck,
  Search,
  Eye,
  Users,
  Wallet,
  AlertTriangle,
  Plus,
  ChevronRight,
  TrendingUp,
  X,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

// Scheme-specific configuration metadata
const SCHEME_CONFIG = {
  daily: {
    key: 'daily',
    enTitle: 'Daily Loans',
    taTitle: 'தினசரி கடன்கள் (தண்டல்)',
    enSubtitle: 'Daily collection thandal repayments schedule and status',
    taSubtitle: 'தினசரி வசூல் தண்டல் தவணைக் கணக்குகள் மற்றும் விபரங்கள்',
    icon: Clock,
    color: '#F59E0B',
    accentBg: 'bg-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/40',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200/80 dark:border-amber-900/50',
    badgeText: 'Daily Thandal',
    unitLabel: '/day',
    unitLabelTa: '/நாள்',
  },
  weekly: {
    key: 'weekly',
    enTitle: 'Weekly Loans',
    taTitle: 'வாராந்திர கடன்கள் (வாரத் தவணை)',
    enSubtitle: '7-day cycle repayments schedule and status',
    taSubtitle: '7-நாள் வாரத் தவணைக் கணக்குகள் மற்றும் விபரங்கள்',
    icon: CalendarRange,
    color: '#0EA5E9',
    accentBg: 'bg-sky-500',
    lightBg: 'bg-sky-50 dark:bg-sky-950/40',
    textColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-200/80 dark:border-sky-900/50',
    badgeText: 'Weekly Finance',
    unitLabel: '/week',
    unitLabelTa: '/வாரம்',
  },
  monthly: {
    key: 'monthly',
    enTitle: 'Monthly Loans',
    taTitle: 'மாதாந்திர கடன்கள் (மாத வட்டி)',
    enSubtitle: 'Monthly calendar return repayments schedule and status',
    taSubtitle: 'மாதாந்திர காலண்டர் தவணைக் கணக்குகள் மற்றும் விபரங்கள்',
    icon: CalendarCheck,
    color: '#10B981',
    accentBg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200/80 dark:border-emerald-900/50',
    badgeText: 'Monthly Return',
    unitLabel: '/month',
    unitLabelTa: '/மாதம்',
  },
};

// Colorful avatar helper matching the rest of the application
const getAvatarStyle = (name = '') => {
  const char = (name || 'B').trim().charAt(0).toUpperCase();
  const palette = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 ring-1 ring-blue-300/40',
    'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 ring-1 ring-purple-300/40',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 ring-1 ring-emerald-300/40',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 ring-1 ring-rose-300/40',
    'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 ring-1 ring-sky-300/40',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 ring-1 ring-amber-300/40',
  ];
  const code = char.charCodeAt(0) || 0;
  return {
    char,
    classes: palette[code % palette.length],
  };
};

export const SchemeLoansPage = ({
  schemeType = 'daily',
  onBack,
  onViewLoan,
  onOpenNewLoan,
}) => {
  const normalizedScheme = String(schemeType || 'daily').toLowerCase();
  const scheme = SCHEME_CONFIG[normalizedScheme] || SCHEME_CONFIG.daily;
  const SchemeIcon = scheme.icon;

  const { lang } = useLanguage();
  const { isOwner } = useAuth();
  const { isMobile } = useDeviceMode();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [todayCollected, setTodayCollected] = useState(0);

  // Fetch loans for this specific scheme
  const fetchSchemeLoans = async (isBackground = false) => {
    try {
      if (!isBackground && loans.length === 0) {
        setLoading(true);
      }
      const res = await api.getLoans({
        financeType: normalizedScheme,
        status: statusFilter,
        search,
      });
      if (res?.success && Array.isArray(res.loans)) {
        setLoans(res.loans);
      }
    } catch (err) {
      console.warn(`Failed to fetch ${normalizedScheme} loans:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's collection breakdown for this scheme
  const fetchTodayCollection = async () => {
    try {
      const statsRes = await api.getDashboardStats();
      if (statsRes?.dailyCollectionBreakdown?.[0]) {
        const todayRow = statsRes.dailyCollectionBreakdown[0];
        if (normalizedScheme === 'daily') setTodayCollected(todayRow.dailyScheme || 0);
        else if (normalizedScheme === 'weekly') setTodayCollected(todayRow.weeklyScheme || 0);
        else if (normalizedScheme === 'monthly') setTodayCollected(todayRow.monthlyScheme || 0);
      }
    } catch (err) {
      console.warn('Failed to load scheme today collection:', err);
    }
  };

  useEffect(() => {
    fetchSchemeLoans(false);
    fetchTodayCollection();

    const handleSync = () => {
      fetchSchemeLoans(true);
      fetchTodayCollection();
    };
    window.addEventListener('fintrack:data-updated', handleSync);
    return () => window.removeEventListener('fintrack:data-updated', handleSync);
  }, [normalizedScheme, statusFilter, search]);

  // Mini summary metrics strictly for this scheme
  const totalSchemeLoans = loans.length;
  const totalSchemePrincipal = useMemo(
    () => loans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0),
    [loans]
  );
  const overdueSchemeLoans = useMemo(
    () => loans.filter((l) => l.status === 'overdue'),
    [loans]
  );
  const totalOverdueAmount = useMemo(
    () => overdueSchemeLoans.reduce((sum, l) => sum + (Number(l.remainingBalance || 0)), 0),
    [overdueSchemeLoans]
  );

  // Helper to extract customer object safely
  const getCustomer = (loan) => {
    if (loan.customerId && typeof loan.customerId === 'object' && loan.customerId.name) {
      return loan.customerId;
    }
    return {
      name: loan.customerName || 'Borrower / வாடிக்கையாளர்',
      phone: loan.customerPhone || '',
      area: loan.customerArea || '',
    };
  };

  const isFiltering = search || statusFilter !== 'all';

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="h-11 px-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-sm flex items-center space-x-1.5 active:scale-95 transition shrink-0"
            title="Back to All Loans"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold">
              {lang === 'ta' ? 'கடன்கள்' : 'Loans'}
            </span>
          </button>

          {/* Scheme Icon & Title */}
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-2xl ${scheme.lightBg} ${scheme.textColor} flex items-center justify-center shrink-0 shadow-sm border ${scheme.borderColor}`}
            >
              <SchemeIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {lang === 'ta' ? scheme.taTitle : scheme.enTitle}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${scheme.lightBg} ${scheme.textColor} border ${scheme.borderColor}`}>
                  {totalSchemeLoans} {totalSchemeLoans === 1 ? 'Loan' : 'Loans'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'ta' ? scheme.taSubtitle : scheme.enSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: + New Loan for this scheme */}
        {isOwner && (
          <button
            onClick={() => onOpenNewLoan && onOpenNewLoan(normalizedScheme)}
            className={`h-11 px-4 rounded-xl text-white shadow-md flex items-center space-x-2 active:scale-95 transition shrink-0 self-start sm:self-auto ${scheme.accentBg} hover:opacity-90`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <div className="text-left">
              <p className="text-xs font-black leading-tight">
                New {scheme.enTitle.split(' ')[0]} Loan
              </p>
              <p className="text-[10px] text-white/80 leading-tight">புதிய கடன்</p>
            </div>
          </button>
        )}
      </div>

      {/* 2. 4 MINI SUMMARY CARDS FOR THIS SCHEME */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Loans */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className={`w-11 h-11 rounded-2xl ${scheme.lightBg} ${scheme.textColor} flex items-center justify-center shrink-0`}>
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              Total {scheme.enTitle.split(' ')[0]} Loans
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {lang === 'ta' ? 'மொத்த கணக்குகள்' : 'Scheme Accounts'}
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
              {totalSchemeLoans}
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
              {lang === 'ta' ? 'அசல் தொகை' : 'Capital Lent'}
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5 truncate">
              {formatCurrency(totalSchemePrincipal)}
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
              {lang === 'ta' ? 'இன்றைய வசூல்' : 'Today Recovers'}
            </p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight mt-0.5 truncate">
              {formatCurrency(todayCollected)}
            </p>
          </div>
        </div>

        {/* Card 4: Overdue Amount */}
        <div className="bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl p-4 border border-rose-200/80 dark:border-rose-900/50 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 truncate">
                  Overdue Amount
                </p>
                {overdueSchemeLoans.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-200 text-rose-800">
                    {overdueSchemeLoans.length}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70 truncate">
                {lang === 'ta' ? 'நிலுவை தொகை' : 'Overdue Balance'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight mt-0.5 truncate">
                {formatCurrency(totalOverdueAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & STATUS FILTERS */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                lang === 'ta'
                  ? `தேடுக (கடன் #, வாடிக்கையாளர், தொலைபேசி)...`
                  : `Search ${scheme.enTitle.toLowerCase()} by loan #, customer, phone, area...`
              }
              className="w-full h-10 pl-9 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-400 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', en: 'All', ta: 'அனைத்தும்' },
              { id: 'active', en: 'Active', ta: 'செயலில்' },
              { id: 'overdue', en: 'Overdue', ta: 'காலாவதி' },
              { id: 'completed', en: 'Closed', ta: 'முடிந்தது' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === st.id
                    ? `${scheme.accentBg} text-white shadow-xs`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {lang === 'ta' ? st.ta : st.en}
              </button>
            ))}

            {isFiltering && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="h-9 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition whitespace-nowrap flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>{lang === 'ta' ? 'அழி' : 'Clear'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. LOAN LIST / TABLE */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        /* Empty State */
        <div className="glass rounded-3xl p-8 sm:p-12 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className={`w-16 h-16 rounded-3xl ${scheme.lightBg} ${scheme.textColor} mx-auto flex items-center justify-center shadow-sm`}>
            <SchemeIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              {lang === 'ta'
                ? `இத்திட்டத்தில் கடன்கள் எதுவும் இல்லை`
                : `No ${scheme.enTitle} Yet`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {lang === 'ta'
                ? `${scheme.taTitle} பிரிவின் கீழ் பதிவு செய்யப்பட்ட கடன்கள் எதுவும் கிடைக்கவில்லை.`
                : `No active or historical loans were found under the ${scheme.enTitle} scheme.`}
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            {isFiltering ? (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
              >
                {lang === 'ta' ? 'வடிகட்டிகளை அழி' : 'Clear Filters'}
              </button>
            ) : isOwner ? (
              <button
                onClick={() => onOpenNewLoan && onOpenNewLoan(normalizedScheme)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition ${scheme.accentBg} hover:opacity-90`}
              >
                + Issue New {scheme.enTitle.split(' ')[0]} Loan
              </button>
            ) : (
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
              >
                {lang === 'ta' ? 'அனைத்து கடன்கள்' : 'Back to Loans'}
              </button>
            )}
          </div>
        </div>
      ) : isMobile ? (
        /* Mobile Stacked Glass Cards */
        <div className="space-y-3">
          {loans.map((loan) => {
            const cust = getCustomer(loan);
            const avatar = getAvatarStyle(cust.name);
            const totalPay = Number(loan.totalPayable || loan.principal || 0);
            const collected = Number(loan.totalCollected || 0);
            const pct = totalPay > 0 ? Math.min(100, Math.round((collected / totalPay) * 100)) : 0;
            const isOverdue = loan.status === 'overdue';
            const isCompleted = loan.status === 'completed';

            return (
              <div
                key={loan._id}
                onClick={() => onViewLoan && onViewLoan(loan._id)}
                className="glass rounded-2xl p-4 border border-white/80 dark:border-slate-800 shadow-sm active:scale-[0.99] transition cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl ${avatar.classes} flex items-center justify-center font-black text-sm shrink-0`}>
                      {avatar.char}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {cust.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {cust.phone || '-'} {cust.area ? `• ${cust.area}` : ''}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : isOverdue
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                    }`}
                  >
                    {isCompleted ? 'Closed' : isOverdue ? 'Overdue' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Loan No.</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 uppercase">
                      {loan.loanNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Principal</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatCurrency(loan.principal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Installment</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {formatCurrency(loan.installmentAmount)}{scheme.unitLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Balance</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(loan.remainingBalance)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Repaid: {formatCurrency(collected)}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCompleted ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : scheme.accentBg
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop / Tablet Table View */
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="py-3.5 px-4">Customer / வாடிக்கையாளர்</th>
                  <th className="py-3.5 px-4">Loan No. / எண்</th>
                  <th className="py-3.5 px-4">Dates / தேதிகள்</th>
                  <th className="py-3.5 px-4 text-right">Principal / அசல்</th>
                  <th className="py-3.5 px-4 text-right">Installment / தவணை</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Repayment / முன்னேற்றம்</th>
                  <th className="py-3.5 px-4 text-center">Status / நிலை</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {loans.map((loan) => {
                  const cust = getCustomer(loan);
                  const avatar = getAvatarStyle(cust.name);
                  const totalPay = Number(loan.totalPayable || loan.principal || 0);
                  const collected = Number(loan.totalCollected || 0);
                  const pct = totalPay > 0 ? Math.min(100, Math.round((collected / totalPay) * 100)) : 0;
                  const isOverdue = loan.status === 'overdue';
                  const isCompleted = loan.status === 'completed';

                  return (
                    <tr
                      key={loan._id}
                      onClick={() => onViewLoan && onViewLoan(loan._id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-2xl ${avatar.classes} flex items-center justify-center font-black text-xs shrink-0`}>
                            {avatar.char}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 dark:text-white truncate group-hover:text-sky-600 transition">
                              {cust.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {cust.phone || '-'} {cust.area ? `• ${cust.area}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Loan No */}
                      <td className="py-3.5 px-4 font-black uppercase text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                          {loan.loanNo}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatDate(loan.startDate)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          → {formatDate(loan.endDate)}
                        </div>
                      </td>

                      {/* Principal with Disbursed & Charge */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(loan.principal)}
                        </div>
                        <div className="text-[10px] text-slate-400 tabular-nums">
                          In Hand: {formatCurrency(loan.disbursedAmount || loan.principal)}
                        </div>
                      </td>

                      {/* Installment Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-extrabold text-sky-600 dark:text-sky-400 tabular-nums">
                          {formatCurrency(loan.installmentAmount)}
                          <span className="text-[10px] text-slate-400 font-normal">
                            {scheme.unitLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {loan.duration || 100} cycles
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
                            <span>{formatCurrency(collected)}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCompleted ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : scheme.accentBg
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                          }`}
                        >
                          {isCompleted ? 'Closed' : isOverdue ? 'Overdue' : 'Active'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewLoan && onViewLoan(loan._id);
                          }}
                          className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-sky-500 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
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
  );
};

export default SchemeLoansPage;
