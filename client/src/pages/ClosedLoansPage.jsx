import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatDate } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import {
  ArrowLeft,
  Search,
  Archive,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Eye,
  Coins,
  ChevronUp,
  ChevronDown,
  Zap,
  CalendarDays,
  CalendarRange,
  Award,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';

const getAvatarStyle = (name = '') => {
  const char = (name || 'B').trim().charAt(0).toUpperCase();
  return {
    char,
    classes: 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]',
  };
};

// Accurate realized profit computation across deduction, add-on, and percentage schemes
const getSettledLoanProfit = (loan) => {
  if (!loan) return 0;
  if (loan.computedProfit != null && Number(loan.computedProfit) > 0) return Number(loan.computedProfit);
  if (Number(loan.profit) > 0) return Number(loan.profit);
  if (Number(loan.chargeAmount) > 0) return Number(loan.chargeAmount);

  const pr = Number(loan.principal || loan.principalAmount || 0);
  const collected = Number(loan.totalCollected || loan.totalPayable || loan.totalPaid || 0);
  const disbursed = Number(loan.disbursedAmount || 0);

  if (loan.interestType === 'deduction' || (disbursed > 0 && disbursed < pr)) {
    const baseDisbursed = disbursed > 0 ? disbursed : pr - (Number(loan.chargeAmount) || 0);
    if (baseDisbursed > 0 && collected >= baseDisbursed) {
      return collected - baseDisbursed;
    }
  }

  if (collected > pr) {
    return collected - pr;
  }
  const payable = Number(loan.totalPayable || loan.totalRepayable || 0);
  if (payable > pr) {
    return payable - pr;
  }
  if (Number(loan.interestPercent) > 0 && pr > 0) {
    return Math.round((pr * Number(loan.interestPercent)) / 100);
  }
  return 0;
};

const getLoanCollected = (loan) =>
  Number(loan?.totalCollected || loan?.totalPayable || loan?.totalPaid || loan?.principal || 0);

const getLoanPrincipal = (loan) => Number(loan?.principal || loan?.principalAmount || 0);

const getSettledDateValue = (loan) =>
  loan?.settledDate || loan?.closedAt || loan?.closureDate || loan?.updatedAt || loan?.endDate;

const SCHEME_CARDS = [
  {
    id: 'daily',
    en: 'Daily Thandal',
    ta: 'தினசரி தண்டல்',
    subtitleEn: 'Daily collection settled accounts',
    subtitleTa: 'தினசரி முடிந்த கணக்குகள்',
    icon: Zap,
    accentText: 'text-amber-600',
    accentBg: 'bg-amber-50 border-amber-200',
    pillBg: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'weekly',
    en: 'Weekly Finance',
    ta: 'வாராந்திர கடன்',
    subtitleEn: 'Weekly cycle settled accounts',
    subtitleTa: 'வாராந்திர முடிந்த கணக்குகள்',
    icon: CalendarDays,
    accentText: 'text-[#0878D1]',
    accentBg: 'bg-[#EAF5FF] border-[#BFE0FB]',
    pillBg: 'bg-[#EAF5FF] text-[#064B8E] border-[#BFE0FB]',
  },
  {
    id: 'monthly',
    en: 'Monthly Finance',
    ta: 'மாதாந்திர கடன்',
    subtitleEn: 'Monthly scheme settled accounts',
    subtitleTa: 'மாதாந்திர முடிந்த கணக்குகள்',
    icon: CalendarRange,
    accentText: 'text-[#18A879]',
    accentBg: 'bg-emerald-50 border-emerald-200',
    pillBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
];

export const ClosedLoansPage = ({ onBack, onViewLoan }) => {
  const { lang } = useLanguage();

  const [loans, setLoans] = useState([]);
  const [activeInterestVal, setActiveInterestVal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('all'); // 'all' | 'daily' | 'weekly' | 'monthly'
  const [showMetrics, setShowMetrics] = useState(true);

  const fetchClosedAndSettled = async () => {
    try {
      setLoading(true);
      const [closedRes, statsRes] = await Promise.allSettled([
        api.getLoans({ view: 'closed' }),
        api.getDashboardStats(),
      ]);

      const closedRaw =
        closedRes.status === 'fulfilled' && closedRes.value?.success && Array.isArray(closedRes.value.loans)
          ? closedRes.value.loans
          : [];

      const dashCompleted =
        statsRes.status === 'fulfilled' && Array.isArray(statsRes.value?.completedLoansList)
          ? statsRes.value.completedLoansList
          : [];

      if (statsRes.status === 'fulfilled') {
        setActiveInterestVal(Number(statsRes.value?.cards?.activeInterest || 0));
      }

      // Merge uniquely from both sources so Closed & Settled are 100% consistent
      const byKey = new Map();
      [...closedRaw, ...dashCompleted].forEach((l) => {
        if (!l) return;
        const isDone =
          l.status === 'completed' ||
          l.status === 'closed' ||
          (l.remainingBalance != null && Number(l.remainingBalance) <= 0);
        if (!isDone) return;
        const key = String(l._id || l.clientId || l.loanNo || '');
        if (!key) return;
        if (!byKey.has(key)) {
          byKey.set(key, l);
        }
      });

      const merged = Array.from(byKey.values()).sort((a, b) => {
        const da = new Date(getSettledDateValue(a) || 0).getTime();
        const db = new Date(getSettledDateValue(b) || 0).getTime();
        return db - da;
      });

      setLoans(merged);
    } catch (err) {
      console.warn('Failed to load closed & settled loans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedAndSettled();
  }, []);

  // Per-scheme aggregates across ALL settled loans (always shown on the 3 scheme cards)
  const schemeBreakdown = useMemo(() => {
    const base = {
      daily: { count: 0, principal: 0, collected: 0, profit: 0 },
      weekly: { count: 0, principal: 0, collected: 0, profit: 0 },
      monthly: { count: 0, principal: 0, collected: 0, profit: 0 },
    };

    loans.forEach((loan) => {
      const type = String(loan.financeType || 'daily').toLowerCase();
      const bucket = base[type] || base.daily;
      bucket.count += 1;
      bucket.principal += getLoanPrincipal(loan);
      bucket.collected += getLoanCollected(loan);
      bucket.profit += getSettledLoanProfit(loan);
    });

    return base;
  }, [loans]);

  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      const type = String(l.financeType || 'daily').toLowerCase();
      if (schemeFilter !== 'all' && type !== schemeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const cName = (l.customerId?.name || l.customerName || '').toLowerCase();
        const cPhone = String(l.customerId?.phone || l.customerPhone || '');
        const cArea = (l.customerId?.area || l.customerArea || l.area || '').toLowerCase();
        const lNo = (l.loanNo || '').toLowerCase();
        if (!cName.includes(q) && !cPhone.includes(q) && !lNo.includes(q) && !cArea.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [loans, schemeFilter, search]);

  const totalPrincipal = useMemo(
    () => filteredLoans.reduce((sum, l) => sum + getLoanPrincipal(l), 0),
    [filteredLoans]
  );
  const totalProfit = useMemo(
    () => filteredLoans.reduce((sum, l) => sum + getSettledLoanProfit(l), 0),
    [filteredLoans]
  );
  const totalCollected = useMemo(
    () => filteredLoans.reduce((sum, l) => sum + getLoanCollected(l), 0),
    [filteredLoans]
  );

  const getCustomer = (loan) => {
    if (loan.customerId && typeof loan.customerId === 'object' && loan.customerId.name) {
      return loan.customerId;
    }
    return {
      name: loan.customerName || 'Borrower / வாடிக்கையாளர்',
      phone: loan.customerPhone || '',
      area: loan.customerArea || loan.area || '',
    };
  };

  return (
    <div className="space-y-5 max-w-full pb-16">
      {/* 1. STICKY HEADER BAR */}
      <div className="sticky top-16 z-20 bg-[#F3F9FF]/95 backdrop-blur-xl -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6 -mt-3 sm:-mt-5 lg:-mt-6 pt-3 sm:pt-4 pb-3.5 border-b border-[#D5E9FA] shadow-[0_8px_24px_rgba(8,120,209,0.06)] space-y-3.5 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 sm:p-2.5 rounded-2xl bg-white/85 hover:bg-[#EAF5FF] text-[#183653] transition shadow-xs border border-[#D5E9FA] active:scale-95 cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-[#0878D1]" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]">
                  {lang === 'ta' ? 'முடிந்த & தீர்க்கப்பட்ட கடன்கள்' : 'Closed & Settled Portfolio'}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-[#183653] tracking-tight mt-0.5">
                {lang === 'ta' ? 'முடிந்த & தீர்க்கப்பட்ட கடன்கள்' : 'Closed & Settled Loans'}
              </h1>
              <p className="text-xs text-[#647C95] font-medium mt-0.5 hidden sm:block">
                {lang === 'ta'
                  ? 'தினசரி, வாராந்திர மற்றும் மாதாந்திர முழுமையாக முடிந்த கடன்கள் & ஈட்டிய லாபம்'
                  : 'Unified Daily, Weekly & Monthly 100% repaid accounts with realized profit'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {filteredLoans.length} {lang === 'ta' ? 'கடன்கள்' : 'Settled Accounts'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowMetrics((v) => !v)}
              className="px-2.5 py-1 rounded-xl border border-[#D5E9FA] bg-white/80 hover:bg-[#EAF5FF] text-[#183653] text-xs font-bold transition flex items-center space-x-1 shadow-xs active:scale-95 cursor-pointer"
              title={showMetrics ? 'Collapse Summary Cards' : 'Expand Summary Cards'}
            >
              <span className="text-[11px] text-[#647C95] font-semibold hidden md:inline">
                {showMetrics ? (lang === 'ta' ? 'சுருக்கு' : 'Collapse') : lang === 'ta' ? 'விரி' : 'Summary'}
              </span>
              {showMetrics ? <ChevronUp className="w-4 h-4 text-[#0878D1]" /> : <ChevronDown className="w-4 h-4 text-[#0878D1]" />}
            </button>
          </div>
        </div>

        {/* 2. SEARCH & QUICK SCHEME FILTER BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/85 backdrop-blur-md border border-[#D5E9FA] shadow-xs">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {[
              { id: 'all', label: lang === 'ta' ? 'அனைத்தும்' : 'All Schemes', count: loans.length },
              { id: 'daily', label: lang === 'ta' ? 'தினசரி' : 'Daily', count: schemeBreakdown.daily.count },
              { id: 'weekly', label: lang === 'ta' ? 'வாராந்திர' : 'Weekly', count: schemeBreakdown.weekly.count },
              { id: 'monthly', label: lang === 'ta' ? 'மாதாந்திர' : 'Monthly', count: schemeBreakdown.monthly.count },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSchemeFilter(sc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer flex items-center space-x-1.5 ${
                  schemeFilter === sc.id
                    ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-[#EAF5FF] text-[#183653] border border-[#D5E9FA]'
                }`}
              >
                <span>{sc.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    schemeFilter === sc.id ? 'bg-white/25 text-white' : 'bg-[#EAF5FF] text-[#0878D1]'
                  }`}
                >
                  {sc.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#647C95]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ta' ? 'வாடிக்கையாளர் / கடன் எண் / பகுதி தேடு...' : 'Search borrower, area or loan no...'}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#D5E9FA] text-[#183653] outline-none focus:border-[#0878D1] focus:ring-1 focus:ring-[#0878D1] transition placeholder:text-[#647C95]"
            />
          </div>
        </div>
      </div>

      {/* 3. OVERALL SUMMARY METRICS + DAILY / WEEKLY / MONTHLY SETTLED CARDS */}
      {showMetrics && (
        <div className="space-y-4 animate-fade-in">
          {/* Overall 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl border border-[#D5E9FA] bg-white/90 backdrop-blur-md shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#647C95] truncate">
                  {lang === 'ta' ? 'முடிந்த கணக்குகள்' : 'Settled Accounts'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] flex items-center justify-center shrink-0">
                  <CheckCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-[#183653] tabular-nums">{filteredLoans.length}</p>
                <p className="text-[10px] text-[#647C95] mt-0.5 font-medium truncate">
                  {schemeFilter === 'all'
                    ? lang === 'ta'
                      ? 'அனைத்து திட்டங்களும்'
                      : 'All schemes (Balance ₹0)'
                    : `${schemeFilter.toUpperCase()} scheme only`}
                </p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl border border-cyan-200 bg-white/90 backdrop-blur-md shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-700 truncate">
                  {lang === 'ta' ? 'மொத்த வசூல் தொகை' : 'Total Settled Amount'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-cyan-700 tabular-nums">{formatCurrency(totalCollected)}</p>
                <p className="text-[10px] text-cyan-700/80 mt-0.5 font-medium truncate">
                  {lang === 'ta' ? '100% வசூலான தொகை' : 'Total recovered across closed loans'}
                </p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-md shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 truncate">
                  {lang === 'ta' ? 'வழங்கிய அசல்' : 'Principal Recovered'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-[#183653] tabular-nums">{formatCurrency(totalPrincipal)}</p>
                <p className="text-[10px] text-amber-700/80 mt-0.5 font-medium truncate">
                  {lang === 'ta' ? 'திரும்பப் பெற்ற அசல்' : 'Principal capital recovered'}
                </p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-200 bg-white/90 backdrop-blur-md shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 truncate">
                  {lang === 'ta' ? 'ஈட்டிய நிகர லாபம்' : 'Realized Profit'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">+{formatCurrency(totalProfit)}</p>
                <p className="text-[10px] text-emerald-700/80 mt-0.5 font-medium truncate">
                  {schemeFilter === 'all' && activeInterestVal > 0
                    ? `Active Int: ${formatCurrency(activeInterestVal)} + Profit`
                    : lang === 'ta'
                    ? 'வட்டி & கட்டண நிகர லாபம்'
                    : 'Realized interest & fee profit'}
                </p>
              </div>
            </div>
          </div>

          {/* 3 DEDICATED SCHEME CARDS: DAILY, WEEKLY, MONTHLY SETTLED DATA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs sm:text-sm font-black text-[#183653] uppercase tracking-wider flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#0878D1]" />
                <span>
                  {lang === 'ta'
                    ? 'திட்டம் வாரியான முடிந்த கணக்குகள் (தினசரி / வாராந்திர / மாதாந்திர)'
                    : 'Settled Breakdown by Scheme (Daily · Weekly · Monthly)'}
                </span>
              </h2>
              {schemeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSchemeFilter('all')}
                  className="text-xs font-bold text-[#0878D1] hover:underline"
                >
                  {lang === 'ta' ? 'அனைத்தையும் காட்டு' : 'Show All Schemes'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {SCHEME_CARDS.map((card) => {
                const Icon = card.icon;
                const data = schemeBreakdown[card.id];
                const isSelected = schemeFilter === card.id;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSchemeFilter(isSelected ? 'all' : card.id)}
                    className={`text-left rounded-2xl p-4 transition-all cursor-pointer border flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#EAF5FF] border-[#0878D1] ring-2 ring-[#0878D1]/30 shadow-md'
                        : 'bg-white/90 hover:bg-[#F8FBFF] border-[#D5E9FA] hover:border-[#55B8F5] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${card.accentBg} ${card.accentText}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-[#183653] truncate">
                            {lang === 'ta' ? card.ta : card.en}
                          </h3>
                          <p className="text-[11px] text-[#647C95] truncate">
                            {lang === 'ta' ? card.subtitleTa : card.subtitleEn}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${card.pillBg}`}>
                        {data.count} {lang === 'ta' ? 'முடிந்தவை' : 'Settled'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EAF5FF] w-full">
                      <div>
                        <p className="text-[10px] font-bold text-[#647C95] uppercase">
                          {lang === 'ta' ? 'அசல்' : 'Principal'}
                        </p>
                        <p className="text-xs sm:text-sm font-black text-[#183653] tabular-nums mt-0.5">
                          {formatCurrency(data.principal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#647C95] uppercase">
                          {lang === 'ta' ? 'வசூல்' : 'Settled'}
                        </p>
                        <p className="text-xs sm:text-sm font-black text-[#0878D1] tabular-nums mt-0.5">
                          {formatCurrency(data.collected)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#647C95] uppercase">
                          {lang === 'ta' ? 'லாபம்' : 'Profit'}
                        </p>
                        <p className="text-xs sm:text-sm font-black text-emerald-600 tabular-nums mt-0.5">
                          +{formatCurrency(data.profit)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold w-full">
                      <span className={isSelected ? 'text-[#064B8E]' : 'text-[#647C95]'}>
                        {isSelected
                          ? lang === 'ta'
                            ? 'தேர்ந்தெடுக்கப்பட்டது (மீண்டும் தட்ட அனைத்தும்)'
                            : 'Active filter (tap to clear)'
                          : lang === 'ta'
                          ? `${card.ta} கணக்குகளை பார்க்க தட்டவும் →`
                          : `View ${card.en} settled loans →`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. UNIFIED SETTLED & CLOSED LOANS DATA LIST */}
      {loading ? (
        <div className="p-12 text-center bg-white/80 rounded-2xl border border-[#D5E9FA]">
          <div className="w-10 h-10 border-4 border-[#0878D1] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#647C95]">Loading closed &amp; settled loans...</p>
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="p-12 text-center bg-white/85 rounded-3xl border border-[#D5E9FA] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF5FF] text-[#0878D1] flex items-center justify-center mx-auto">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-[#183653]">
            {lang === 'ta' ? 'முடிந்த கடன்கள் எதுவும் இல்லை' : 'No settled or closed loans found'}
          </h3>
          <p className="text-xs text-[#647C95] max-w-sm mx-auto">
            {search || schemeFilter !== 'all'
              ? 'Try clearing your search or switching scheme filter.'
              : 'When any Daily, Weekly, or Monthly loan balance reaches ₹0, it archives cleanly here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredLoans.map((loan) => {
              const cust = getCustomer(loan);
              const parsed = parseCustomerName(cust.name);
              const pr = getLoanPrincipal(loan);
              const collected = getLoanCollected(loan);
              const disbursed = Number(loan.disbursedAmount || 0);
              const profitVal = getSettledLoanProfit(loan);
              const settledDate = getSettledDateValue(loan);

              return (
                <div
                  key={loan._id || loan.clientId || loan.loanNo}
                  onClick={() => onViewLoan && onViewLoan(loan._id || loan.clientId || loan.loanNo)}
                  className="p-4 rounded-2xl bg-white/90 border border-[#D5E9FA] shadow-xs space-y-2.5 cursor-pointer active:scale-[0.99] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-black text-sm text-[#183653]">{parsed.primary}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]">
                          {loan.financeType || 'daily'}
                        </span>
                      </div>
                      {parsed.secondary && <p className="text-[11px] text-[#647C95]">{parsed.secondary}</p>}
                      <p className="text-[11px] font-mono text-[#647C95] mt-0.5">
                        {loan.loanNo} • {cust.phone || cust.area || '—'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      +{formatCurrency(profitVal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EAF5FF] text-xs">
                    <div>
                      <span className="text-[10px] text-[#647C95] block">Principal</span>
                      <span className="font-bold text-[#183653] tabular-nums">{formatCurrency(pr)}</span>
                      {disbursed > 0 && disbursed < pr && (
                        <span className="block text-[9px] text-[#647C95]">In hand: {formatCurrency(disbursed)}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-[#647C95] block">Settled</span>
                      <span className="font-black text-[#0878D1] tabular-nums">{formatCurrency(collected)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#647C95] block">Settled On</span>
                      <span className="font-bold text-emerald-700 text-[11px]">
                        {settledDate ? formatDate(settledDate) : 'Settled'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop / Tablet Clean Table */}
          <div className="hidden md:block bg-white/90 rounded-3xl border border-[#D5E9FA] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3F9FF] text-[#647C95] uppercase text-[10px] font-black border-b border-[#D5E9FA]">
                  <tr>
                    <th className="px-4 py-3">{lang === 'ta' ? 'கடன் எண்' : 'Loan No'}</th>
                    <th className="px-4 py-3">{lang === 'ta' ? 'வாடிக்கையாளர்' : 'Borrower'}</th>
                    <th className="px-4 py-3">{lang === 'ta' ? 'பிரிவு' : 'Scheme'}</th>
                    <th className="px-4 py-3 text-right">{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
                    <th className="px-4 py-3 text-right">{lang === 'ta' ? 'வசூலான தொகை' : 'Total Settled'}</th>
                    <th className="px-4 py-3 text-right">{lang === 'ta' ? 'ஈட்டிய லாபம்' : 'Profit Earned'}</th>
                    <th className="px-4 py-3">{lang === 'ta' ? 'முடிந்த தேதி' : 'Settled Date'}</th>
                    <th className="px-4 py-3 text-center">{lang === 'ta' ? 'விபரம்' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF5FF] font-medium">
                  {filteredLoans.map((loan) => {
                    const cust = getCustomer(loan);
                    const parsed = parseCustomerName(cust.name);
                    const avatar = getAvatarStyle(parsed.primary);
                    const pr = getLoanPrincipal(loan);
                    const collected = getLoanCollected(loan);
                    const disbursed = Number(loan.disbursedAmount || 0);
                    const profitVal = getSettledLoanProfit(loan);
                    const settledDate = getSettledDateValue(loan);

                    return (
                      <tr
                        key={loan._id || loan.clientId || loan.loanNo}
                        className="hover:bg-[#F3F9FF]/80 transition-colors cursor-pointer"
                        onClick={() => onViewLoan && onViewLoan(loan._id || loan.clientId || loan.loanNo)}
                      >
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-[#183653]">{loan.loanNo}</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">
                              Settled
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${avatar.classes}`}>
                              {avatar.char}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#183653] truncate">{parsed.primary}</p>
                              {parsed.secondary && (
                                <p className="text-[10px] text-[#647C95] truncate">{parsed.secondary}</p>
                              )}
                              <p className="text-[10px] text-[#647C95] font-mono">
                                {cust.phone ? `+91 ${cust.phone}` : ''}{cust.phone && cust.area ? ' • ' : ''}{cust.area || (!cust.phone ? 'Area not set' : '')}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              loan.financeType === 'daily'
                                ? 'bg-amber-100 text-amber-800'
                                : loan.financeType === 'weekly'
                                ? 'bg-[#EAF5FF] text-[#0878D1]'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {loan.financeType || 'daily'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="font-bold text-[#183653] tabular-nums">{formatCurrency(pr)}</span>
                          {disbursed > 0 && disbursed < pr && (
                            <span className="block text-[10px] text-[#647C95] tabular-nums">
                              In hand: {formatCurrency(disbursed)}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-black text-[#0878D1] whitespace-nowrap tabular-nums">
                          {formatCurrency(collected)}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 tabular-nums">
                            +{formatCurrency(profitVal)}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap text-[#647C95] text-[11px]">
                          {settledDate ? formatDate(settledDate) : 'Settled'}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onViewLoan) onViewLoan(loan._id || loan.clientId || loan.loanNo);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#0878D1] hover:bg-[#EAF5FF] border border-[#D5E9FA] transition inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{lang === 'ta' ? 'விபரம்' : 'View'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClosedLoansPage;
