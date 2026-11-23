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
  Receipt,
  Info,
  DollarSign,
  Sun,
  ShieldAlert,
  Archive,
} from 'lucide-react';
import PaymentModal from '../components/common/PaymentModal';

// Animated CountUp Hook/Component respecting prefers-reduced-motion
const CountUpNumber = ({ end, duration = 750, isCurrency = false }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const targetVal = Number(end) || 0;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || targetVal === 0) {
      setVal(targetVal);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeProgress * targetVal);
      setVal(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setVal(targetVal);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [end, duration]);

  if (isCurrency) {
    return <span>{formatCurrency(val)}</span>;
  }
  return <span>{val.toLocaleString('en-IN')}</span>;
};

// Scheme-specific configuration metadata
const SCHEME_CONFIG = {
  daily: {
    key: 'daily',
    enTitle: 'Daily Loans',
    taTitle: 'தினசரி கடன்கள் (தண்டல்)',
    enSubtitle: 'Daily collection thandal repayments schedule and financials',
    taSubtitle: 'தினசரி வசூல் தண்டல் தவணைக் கணக்குகள் மற்றும் நிதி விபரங்கள்',
    icon: Clock,
    color: '#F59E0B',
    accentBg: 'bg-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/40',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200/80 dark:border-amber-900/50',
    badgeText: 'Daily Thandal',
  },
  weekly: {
    key: 'weekly',
    enTitle: 'Weekly Loans',
    taTitle: 'வாராந்திர கடன்கள் (வாரத் தவணை)',
    enSubtitle: '7-day cycle repayments schedule and financials',
    taSubtitle: '7-நாள் வாரத் தவணைக் கணக்குகள் மற்றும் நிதி விபரங்கள்',
    icon: CalendarRange,
    color: '#0EA5E9',
    accentBg: 'bg-sky-500',
    lightBg: 'bg-sky-50 dark:bg-sky-950/40',
    textColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-200/80 dark:border-sky-900/50',
    badgeText: 'Weekly Finance',
  },
  monthly: {
    key: 'monthly',
    enTitle: 'Monthly Loans',
    taTitle: 'மாதாந்திர கடன்கள் (மாத வட்டி)',
    enSubtitle: 'Monthly calendar return repayments schedule and financials',
    taSubtitle: 'மாதாந்திர காலண்டர் தவணைக் கணக்குகள் மற்றும் நிதி விபரங்கள்',
    icon: CalendarCheck,
    color: '#10B981',
    accentBg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200/80 dark:border-emerald-900/50',
    badgeText: 'Monthly Return',
  },
};

const getAvatarStyle = (name = '') => {
  const char = (name || 'B').trim().charAt(0).toUpperCase();
  const palette = [
    'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]',
    'bg-[#EAF5FF] text-[#064B8E] border border-[#D5E9FA]',
    'bg-[#EAF5FF] text-[#18A879] border border-[#D5E9FA]',
    'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]',
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

  const [summaryData, setSummaryData] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Popup Modal states
  const [breakdownMetric, setBreakdownMetric] = useState(null);
  const [breakdownSearch, setBreakdownSearch] = useState('');
  const [payLoanItem, setPayLoanItem] = useState(null);

  // Fetch summary metrics & active loans from dedicated backend aggregation
  const fetchSchemeFinancials = async () => {
    try {
      setLoading(true);
      const res = await api.getLoanSummary(normalizedScheme);
      if (res?.success) {
        setSummaryData(res);
        if (Array.isArray(res.activeLoans)) {
          setActiveLoans(res.activeLoans);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch ${normalizedScheme} summary:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemeFinancials();
  }, [normalizedScheme]);

  // Financial values from aggregated summary
  const summary = summaryData?.summary || {
    totalLoanAmount: 0,
    totalInterest: 0,
    totalProfit: 0,
    totalCollected: 0,
    outstandingBalance: 0,
    activeLoansCount: 0,
    closedLoansCount: 0,
  };

  // Filtered & Sorted Active Loans
  const filteredActiveLoans = useMemo(() => {
    let list = [...activeLoans];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) => {
        const cName = (l.customerId?.name || l.customerName || '').toLowerCase();
        const cPhone = l.customerId?.phone || l.customerPhone || '';
        const lNo = (l.loanNo || '').toLowerCase();
        return cName.includes(q) || cPhone.includes(q) || lNo.includes(q);
      });
    }

    if (sortBy === 'highestPrincipal') {
      list.sort((a, b) => (b.principal || 0) - (a.principal || 0));
    } else if (sortBy === 'highestBalance') {
      list.sort((a, b) => (b.remainingBalance || 0) - (a.remainingBalance || 0));
    } else if (sortBy === 'dueDate') {
      list.sort((a, b) => new Date(a.endDate || 0) - new Date(b.endDate || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return list;
  }, [activeLoans, search, sortBy]);

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

  // Breakdown Modal Configuration
  const breakdownConfig = useMemo(() => {
    if (!breakdownMetric || !summaryData?.breakdowns) return null;

    const list = summaryData.breakdowns[breakdownMetric] || [];
    const filteredList = list.filter((item) => {
      if (!breakdownSearch) return true;
      const q = breakdownSearch.toLowerCase();
      const name = (item.customerName || '').toLowerCase();
      const phone = item.phone || '';
      const loanNo = (item.loanNo || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || loanNo.includes(q);
    });

    const titles = {
      loanAmount: {
        en: 'Total Loan Amount Breakdown (Principal)',
        ta: 'மொத்த கடன் அசல் தொகை விபரம்',
        total: summary.totalLoanAmount,
        color: 'text-orange-600',
        field: 'principal',
        label: lang === 'ta' ? 'அசல்' : 'Principal',
      },
      interest: {
        en: 'Total Interest Breakdown',
        ta: 'மொத்த வட்டி விபரம்',
        total: summary.totalInterest,
        color: 'text-amber-600',
        field: 'interest',
        label: lang === 'ta' ? 'வட்டி' : 'Interest',
      },
      profit: {
        en: 'Total Profit Earned Breakdown',
        ta: 'ஈட்டிய மொத்த லாபம் விபரம்',
        total: summary.totalProfit,
        color: 'text-emerald-600',
        field: 'profit',
        label: lang === 'ta' ? 'லாபம்' : 'Profit',
      },
      collected: {
        en: 'Amount Collected Breakdown',
        ta: 'மொத்த வசூல் தொகை விபரம்',
        total: summary.totalCollected,
        color: 'text-sky-600',
        field: 'totalCollected',
        label: lang === 'ta' ? 'வசூல்' : 'Collected',
      },
      outstanding: {
        en: 'Outstanding Balance Breakdown',
        ta: 'நிலுவைத் தொகை விபரம் (Active Loans)',
        total: summary.outstandingBalance,
        color: 'text-rose-600',
        field: 'remainingBalance',
        label: lang === 'ta' ? 'நிலுவை' : 'Balance',
      },
      active: {
        en: 'Active Loans Breakdown',
        ta: 'நடப்பு கடன்கள் விபரம்',
        total: summary.activeLoansCount,
        color: 'text-[#0878D1]',
        field: 'remainingBalance',
        label: lang === 'ta' ? 'நிலுவை' : 'Balance',
        isCount: true,
      },
    };

    return {
      ...titles[breakdownMetric],
      items: filteredList,
    };
  }, [breakdownMetric, summaryData, breakdownSearch, summary, lang]);

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs border border-sky-100 dark:border-sky-900/40 active:scale-95"
            title="Back to Loans"
          >
            <ArrowLeft className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${scheme.lightBg} ${scheme.textColor} border ${scheme.borderColor}`}
              >
                {scheme.badgeText}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {lang === 'ta' ? scheme.taTitle : scheme.enTitle}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {lang === 'ta' ? scheme.taSubtitle : scheme.enSubtitle}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {onOpenNewLoan && isOwner && (
            <button
              onClick={() => onOpenNewLoan(normalizedScheme)}
              className="px-4 py-2.5 rounded-2xl font-bold text-xs text-white shadow-lg shadow-sky-500/20 active:scale-95 transition flex items-center space-x-1.5"
              style={{
                background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              }}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{lang === 'ta' ? 'புதிய கடன் வழங்குக' : 'New Loan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THE 6 SUMMARY CARDS WITH COUNT-UP & POPUP BREAKDOWN */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Loan Amount */}
        <div
          onClick={() => {
            setBreakdownSearch('');
            setBreakdownMetric('loanAmount');
          }}
          className="p-4 rounded-2xl relative overflow-hidden border cursor-pointer hover:shadow-lg transition-all duration-200 group active:scale-[0.98]"
          style={{
            background: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(254, 215, 170, 0.8)',
            boxShadow: '0 4px 16px -2px rgba(249, 115, 22, 0.1)',
          }}
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              {lang === 'ta' ? 'மொத்த அசல்' : 'Total Loan Amount'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
            <CountUpNumber end={summary.totalLoanAmount} isCurrency={true} />
          </p>
          <p className="text-[9px] text-orange-500 font-bold mt-0.5 flex items-center justify-between">
            <span>{lang === 'ta' ? 'வழங்கிய அசல்' : 'Principal given'}</span>
            <span className="opacity-0 group-hover:opacity-100 transition text-[9px]">🔍</span>
          </p>
        </div>

        {/* Card 2: Total Interest */}
        <div
          onClick={() => {
            setBreakdownSearch('');
            setBreakdownMetric('interest');
          }}
          className="p-4 rounded-2xl relative overflow-hidden border cursor-pointer hover:shadow-lg transition-all duration-200 group active:scale-[0.98]"
          style={{
            background: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(253, 230, 138, 0.9)',
            boxShadow: '0 4px 16px -2px rgba(245, 158, 11, 0.1)',
          }}
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {lang === 'ta' ? 'மொத்த வட்டி' : 'Total Interest'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
            <CountUpNumber end={summary.totalInterest} isCurrency={true} />
          </p>
          <p className="text-[9px] text-amber-600 font-bold mt-0.5 flex items-center justify-between">
            <span>{lang === 'ta' ? 'வட்டி பகுதி' : 'Interest portion'}</span>
            <span className="opacity-0 group-hover:opacity-100 transition text-[9px]">🔍</span>
          </p>
        </div>

        {/* Card 3: Total Profit */}
        <div
          onClick={() => {
            setBreakdownSearch('');
            setBreakdownMetric('profit');
          }}
          className="p-4 rounded-2xl relative overflow-hidden border cursor-pointer hover:shadow-lg transition-all duration-200 group active:scale-[0.98]"
          style={{
            background: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(167, 243, 208, 0.9)',
            boxShadow: '0 4px 16px -2px rgba(16, 185, 129, 0.1)',
          }}
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {lang === 'ta' ? 'மொத்த லாபம்' : 'Total Profit'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
            <CountUpNumber end={summary.totalProfit} isCurrency={true} />
          </p>
          <p className="text-[9px] text-emerald-600 font-bold mt-0.5 flex items-center justify-between">
            <span>{lang === 'ta' ? 'ஈட்டிய நிகர லாபம்' : 'Earned / Realized'}</span>
            <span className="opacity-0 group-hover:opacity-100 transition text-[9px]">🔍</span>
          </p>
        </div>

        {/* Card 4: Amount Collected */}
        <div
          onClick={() => {
            setBreakdownSearch('');
            setBreakdownMetric('collected');
          }}
          className="p-4 rounded-2xl relative overflow-hidden border cursor-pointer hover:shadow-lg transition-all duration-200 group active:scale-[0.98]"
          style={{
            background: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(186, 230, 253, 0.9)',
            boxShadow: '0 4px 16px -2px rgba(14, 165, 233, 0.1)',
          }}
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {lang === 'ta' ? 'மொத்த வசூல்' : 'Amount Collected'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-110 transition">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
            <CountUpNumber end={summary.totalCollected} isCurrency={true} />
          </p>
          <p className="text-[9px] text-sky-500 font-bold mt-0.5 flex items-center justify-between">
            <span>{lang === 'ta' ? 'வசூலிக்கப்பட்டது' : 'Collected so far'}</span>
            <span className="opacity-0 group-hover:opacity-100 transition text-[9px]">🔍</span>
          </p>
        </div>

        {/* Card 5: Outstanding Balance */}
        <div
          onClick={() => {
            setBreakdownSearch('');
            setBreakdownMetric('outstanding');
          }}
          className="p-4 rounded-2xl relative overflow-hidden border cursor-pointer hover:shadow-lg transition-all duration-200 group active:scale-[0.98]"
          style={{
            background: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(254, 205, 211, 0.9)',
            boxShadow: '0 4px 16px -2px rgba(244, 63, 94, 0.1)',
          }}
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {lang === 'ta' ? 'நிலுவைத் தொகை' : 'Outstanding Balance'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
            <CountUpNumber end={summary.outstandingBalance} isCurrency={true} />
          </p>
          <p className="text-[9px] text-rose-500 font-bold mt-0.5 flex items-center justify-between">
            <span>{lang === 'ta' ? 'வர வேண்டிய பாக்கி' : 'Active dues'}</span>
            <span className="opacity-0 group-hover:opacity-100 transition text-[9px]">🔍</span>
          </p>
        </div>

        {/* Card 6: Active Loans Count */}
        <div
          onClick={() => {
            setBreakdownSearch('');
            setBreakdownMetric('active');
          }}
          className="p-4 rounded-2xl relative overflow-hidden border cursor-pointer hover:shadow-lg transition-all duration-200 group active:scale-[0.98]"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            borderColor: '#D5E9FA',
            boxShadow: '0 4px 16px -2px rgba(8, 120, 209, 0.08)',
          }}
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0878D1]">
              {lang === 'ta' ? 'நடப்பு கடன்கள்' : 'Active Loans'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#EAF5FF] text-[#0878D1] flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-[#183653]">
            <CountUpNumber end={summary.activeLoansCount} isCurrency={false} />
          </p>
          <p className="text-[9px] text-[#0878D1] font-bold mt-0.5 flex items-center justify-between">
            <span>{lang === 'ta' ? 'இயங்கும் கடன்கள்' : 'Open accounts'}</span>
            <span className="opacity-0 group-hover:opacity-100 transition text-[9px]">🔍</span>
          </p>
        </div>
      </div>

      {/* 3. SEARCH & SORT TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl glass border border-sky-100 dark:border-sky-900/40">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ta'
                ? `${scheme.badgeText} கடன்களில் வாடிக்கையாளர் பெயர் / கடன் எண் தேடு...`
                : `Search ${scheme.badgeText} borrower, phone or loan number...`
            }
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold outline-none"
          >
            <option value="newest">{lang === 'ta' ? 'புதியது முதலில்' : 'Newest First'}</option>
            <option value="highestPrincipal">{lang === 'ta' ? 'அதிக அசல்' : 'Highest Principal'}</option>
            <option value="highestBalance">{lang === 'ta' ? 'அதிக நிலுவை' : 'Highest Balance'}</option>
            <option value="dueDate">{lang === 'ta' ? 'தவணை தேதி' : 'Due Date'}</option>
          </select>
        </div>
      </div>

      {/* 4. ACTIVE LOANS TABLE / LIST */}
      {loading ? (
        <div className="p-12 text-center glass rounded-2xl">
          <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading {scheme.badgeText} active loans...</p>
        </div>
      ) : filteredActiveLoans.length === 0 ? (
        <div className="p-10 text-center glass rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-black text-slate-800 dark:text-white text-base">
              {lang === 'ta' ? `நடப்பு ${scheme.badgeText} கடன்கள் எதுவும் இல்லை` : `No Active ${scheme.badgeText} Loans`}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {lang === 'ta'
                ? `இந்த பிரிவில் தற்போது நிலுவையில் உள்ள நடப்பு கடன்கள் இல்லை. அனைத்து முந்தைய ${summary.closedLoansCount} கடன்களும் முழுமையாக வசூலிக்கப்பட்டு தீர்க்கப்பட்டுள்ளன.`
                : `All previous ${summary.closedLoansCount} ${scheme.badgeText} loans are fully collected and completed. Closed records remain safe in the Closed Loans archive.`}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center space-x-3 flex-wrap gap-2">
            <button
              onClick={() => {
                try {
                  window.history.pushState({}, '', '/loans/closed');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                } catch (e) {}
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition shadow-xs flex items-center space-x-1.5"
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'ta' ? 'முடிந்த கடன்களைப் பார்க்க' : 'View Closed Archive'}</span>
            </button>

            {onOpenNewLoan && isOwner && (
              <button
                onClick={() => onOpenNewLoan(normalizedScheme)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition shadow-xs flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'ta' ? 'புதிய கடன் துவங்கு' : 'Issue New Loan'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-sky-100 dark:border-sky-900/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">{lang === 'ta' ? 'கடன் எண்' : 'Loan No'}</th>
                  <th className="px-4 py-3">{lang === 'ta' ? 'வாடிக்கையாளர்' : 'Borrower'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'ta' ? 'வட்டி' : 'Interest'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'ta' ? 'வசூலானது' : 'Collected'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'ta' ? 'மீத பாக்கி' : 'Remaining Balance'}</th>
                  <th className="px-4 py-3">{lang === 'ta' ? 'அடுத்த தவணை' : 'Next Due Date'}</th>
                  <th className="px-4 py-3 text-center">{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                  <th className="px-4 py-3 text-center">{lang === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredActiveLoans.map((loan) => {
                  const cust = getCustomer(loan);
                  const avatar = getAvatarStyle(cust.name);
                  const remBal = Number(loan.remainingBalance != null ? loan.remainingBalance : loan.balanceAmount) || 0;
                  const interestVal = Number(loan.computedInterest != null ? loan.computedInterest : (loan.chargeAmount || 0));

                  return (
                    <tr
                      key={loan._id || loan.loanNo}
                      className="hover:bg-sky-50/40 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onViewLoan && onViewLoan(loan._id || loan.clientId || loan.loanNo)}
                    >
                      {/* Loan No */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 dark:text-white">
                          {loan.loanNo}
                        </span>
                      </td>

                      {/* Borrower */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${avatar.classes}`}
                          >
                            {avatar.char}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {cust.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {cust.phone ? `+91 ${cust.phone}` : cust.area || 'Area not set'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Principal */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {formatCurrency(loan.principal)}
                      </td>

                      {/* Interest */}
                      <td className="px-4 py-3.5 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        +{formatCurrency(interestVal)}
                      </td>

                      {/* Collected */}
                      <td className="px-4 py-3.5 text-right font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        {formatCurrency(loan.totalCollected || 0)}
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200/60 dark:border-rose-800/40">
                          {formatCurrency(remBal)}
                        </span>
                      </td>

                      {/* Next Due */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                        {loan.endDate ? formatDate(loan.endDate) : 'Pending'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            loan.status === 'overdue'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setPayLoanItem(loan)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs flex items-center space-x-1"
                            title="Collect Payment"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>{lang === 'ta' ? 'வசூல்' : 'Pay'}</span>
                          </button>

                          <button
                            onClick={() => onViewLoan && onViewLoan(loan._id || loan.clientId || loan.loanNo)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. POPUP BREAKDOWN MODAL WHEN CLICKING ANY SUMMARY CARD */}
      {breakdownConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div
            className="max-w-2xl w-full rounded-3xl p-5 sm:p-6 shadow-2xl border space-y-4 max-h-[88vh] flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(226, 232, 240, 0.9)',
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  {lang === 'ta' ? breakdownConfig.ta : breakdownConfig.en}
                </h3>
                <p className="text-xs text-slate-500">
                  {scheme.badgeText} • {breakdownConfig.items.length} {lang === 'ta' ? 'கணக்குகள்' : 'accounts'}
                </p>
              </div>

              <button
                onClick={() => setBreakdownMetric(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Metric Banner */}
            <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {lang === 'ta' ? 'மொத்த மதிப்பு' : 'Total Contributed Value'}:
              </span>
              <span className={`text-base font-black ${breakdownConfig.color}`}>
                {breakdownConfig.isCount ? breakdownConfig.total : formatCurrency(breakdownConfig.total)}
              </span>
            </div>

            {/* In-Modal Search */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={breakdownSearch}
                onChange={(e) => setBreakdownSearch(e.target.value)}
                placeholder={lang === 'ta' ? 'பட்டியலில் தேடுக...' : 'Search contributing loans...'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-sky-500 transition"
              />
            </div>

            {/* Contributing Loans List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {breakdownConfig.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {lang === 'ta' ? 'பொருத்தமான கடன்கள் எதுவும் இல்லை' : 'No matching contributing loans found'}
                </div>
              ) : (
                breakdownConfig.items.map((item, idx) => {
                  const val = item[breakdownConfig.field] || 0;
                  return (
                    <div
                      key={item.loanNo || idx}
                      onClick={() => {
                        setBreakdownMetric(null);
                        if (onViewLoan) onViewLoan(item.loanNo);
                      }}
                      className="pt-2.5 pb-2 flex items-center justify-between hover:bg-sky-50/50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-800 dark:text-white group-hover:text-sky-600 transition">
                            {item.loanNo}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${
                              item.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.status === 'overdue'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                          {item.customerName || 'Borrower'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.phone ? `+91 ${item.phone}` : item.area || ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-xs font-black ${breakdownConfig.color}`}>
                          {breakdownConfig.isCount ? '' : formatCurrency(val)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {breakdownConfig.label}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setBreakdownMetric(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                {lang === 'ta' ? 'மூடுக' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. QUICK PAYMENT MODAL REUSING EXISTING LOGIC */}
      {payLoanItem && (
        <PaymentModal
          loan={payLoanItem}
          onClose={() => setPayLoanItem(null)}
          onSuccess={() => {
            setPayLoanItem(null);
            fetchSchemeFinancials();
          }}
        />
      )}
    </div>
  );
};

export default SchemeLoansPage;
