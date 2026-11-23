import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate } from '../utils/currency';
import {
  ArrowLeft,
  Search,
  Archive,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Receipt,
  Eye,
  Filter,
  Calendar,
  Layers,
  Clock,
  CalendarRange,
  CalendarCheck,
  Coins,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

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

export const ClosedLoansPage = ({ onBack, onViewLoan }) => {
  const { lang } = useLanguage();
  const { isOwner } = useAuth();
  const { isMobile } = useDeviceMode();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('all');
  const [showMetrics, setShowMetrics] = useState(true);

  const fetchClosedLoans = async () => {
    try {
      setLoading(true);
      const res = await api.getLoans({ view: 'closed' });
      if (res?.success && Array.isArray(res.loans)) {
        // Also ensure strictly closed
        const closedOnly = res.loans.filter(
          (l) =>
            l.status === 'completed' ||
            l.status === 'closed' ||
            (l.remainingBalance != null && Number(l.remainingBalance) <= 0)
        );
        setLoans(closedOnly);
      }
    } catch (err) {
      console.warn('Failed to load closed loans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedLoans();
  }, []);

  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      if (schemeFilter !== 'all' && l.financeType !== schemeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cName = (l.customerId?.name || l.customerName || '').toLowerCase();
        const cPhone = l.customerId?.phone || l.customerPhone || '';
        const lNo = (l.loanNo || '').toLowerCase();
        if (!cName.includes(q) && !cPhone.includes(q) && !lNo.includes(q)) return false;
      }
      return true;
    });
  }, [loans, schemeFilter, search]);

  // Aggregate totals
  const totalPrincipal = useMemo(
    () => filteredLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0),
    [filteredLoans]
  );
  const totalProfit = useMemo(
    () =>
      filteredLoans.reduce(
        (sum, l) =>
          sum + (Number(l.computedProfit != null ? l.computedProfit : (l.chargeAmount || 0))),
        0
      ),
    [filteredLoans]
  );
  const totalCollected = useMemo(
    () =>
      filteredLoans.reduce(
        (sum, l) => sum + (Number(l.totalCollected || l.totalPayable || l.principal || 0)),
        0
      ),
    [filteredLoans]
  );

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

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* 1 + 2 + 3. STICKY TOP CONTROLS & SUMMARY (Held while scrolling) */}
      <div className="sticky top-16 z-20 bg-[#F3F9FF]/95 backdrop-blur-xl -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6 -mt-3 sm:-mt-5 lg:-mt-6 pt-3 sm:pt-4 pb-3.5 border-b border-[#D5E9FA] shadow-[0_8px_24px_rgba(8,120,209,0.06)] space-y-3.5 transition-all">
        {/* 1. TOP HEADER & BREADCRUMB */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 sm:p-2.5 rounded-2xl bg-white/85 hover:bg-[#EAF5FF] text-[#183653] transition shadow-xs border border-[#D5E9FA] active:scale-95 cursor-pointer shrink-0"
              title="Back to Loans"
            >
              <ArrowLeft className="w-5 h-5 text-[#0878D1]" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]">
                  {lang === 'ta' ? 'முடிந்த கடன்கள் காப்பகம்' : 'Closed Loans Archive'}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-[#183653] tracking-tight mt-0.5">
                {lang === 'ta' ? 'முழுவதும் முடிந்த கடன்கள்' : 'Closed & Settled Loans'}
              </h1>
              <p className="text-xs text-[#647C95] font-medium mt-0.5 hidden sm:block">
                {lang === 'ta'
                  ? 'முழுமையாக வசூலிக்கப்பட்டு தீர்க்கப்பட்ட கடன் கணக்குகளின் விபரம் மற்றும் ஈட்டிய லாபம்'
                  : 'Fully repaid and completed loans with realized profit and settled dates'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{filteredLoans.length} {lang === 'ta' ? 'கடன்கள்' : 'Closed Accounts'}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowMetrics((v) => !v)}
              className="px-2.5 py-1 rounded-xl border border-[#D5E9FA] bg-white/80 hover:bg-[#EAF5FF] text-[#183653] text-xs font-bold transition flex items-center space-x-1 shadow-xs active:scale-95 cursor-pointer"
              title={showMetrics ? 'Collapse Summary Cards' : 'Expand Summary Cards'}
            >
              <span className="text-[11px] text-[#647C95] font-semibold hidden md:inline">
                {showMetrics ? (lang === 'ta' ? 'சுருக்கு' : 'Collapse') : (lang === 'ta' ? 'விரி' : 'Summary')}
              </span>
              {showMetrics ? <ChevronUp className="w-4 h-4 text-[#0878D1]" /> : <ChevronDown className="w-4 h-4 text-[#0878D1]" />}
            </button>
          </div>
        </div>

        {/* 2. SUMMARY METRIC CARDS */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">
            {/* Closed Loans Count */}
            <div className="p-3 sm:p-4 rounded-2xl relative overflow-hidden border border-[#D5E9FA] bg-white/85 backdrop-blur-md shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#647C95] truncate">
                  {lang === 'ta' ? 'முடிந்த கடன்கள் எண்ணிக்கை' : 'Closed Loans Count'}
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] flex items-center justify-center shrink-0">
                  <Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-[#183653] tabular-nums">
                  {filteredLoans.length}
                </p>
                <p className="text-[10px] text-[#647C95] mt-0.5 font-medium truncate">
                  {lang === 'ta' ? 'முழுதும் பூர்த்தியானது' : 'Fully settled accounts'}
                </p>
              </div>
            </div>

            {/* Total Principal Given */}
            <div className="p-3 sm:p-4 rounded-2xl relative overflow-hidden border border-orange-200/90 bg-white/85 backdrop-blur-md shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 truncate">
                  {lang === 'ta' ? 'அசல் தொகை' : 'Principal Disbursed'}
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-100/90 text-orange-600 flex items-center justify-center shrink-0">
                  <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-[#183653] tabular-nums">
                  {formatCurrency(totalPrincipal)}
                </p>
                <p className="text-[10px] text-orange-600 mt-0.5 font-medium truncate">
                  {lang === 'ta' ? 'வழங்கப்பட்ட அசல்' : 'Capital principal recovered'}
                </p>
              </div>
            </div>

            {/* Total Profit Earned */}
            <div className="p-3 sm:p-4 rounded-2xl relative overflow-hidden border border-emerald-200/90 bg-white/85 backdrop-blur-md shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 truncate">
                  {lang === 'ta' ? 'ஈட்டிய நிகர லாபம்' : 'Realized Profit'}
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100/90 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-emerald-600 tabular-nums">
                  {formatCurrency(totalProfit)}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5 font-medium truncate">
                  {lang === 'ta' ? 'வட்டி & கட்டண லாபம்' : 'Total interest & fee earned'}
                </p>
              </div>
            </div>

            {/* Total Amount Collected */}
            <div className="p-3 sm:p-4 rounded-2xl relative overflow-hidden border border-[#D5E9FA] bg-white/85 backdrop-blur-md shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#0878D1] truncate">
                  {lang === 'ta' ? 'மொத்த வசூல்' : 'Total Collected'}
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] flex items-center justify-center shrink-0">
                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-[#183653] tabular-nums">
                  {formatCurrency(totalCollected)}
                </p>
                <p className="text-[10px] text-[#0878D1] mt-0.5 font-medium truncate">
                  {lang === 'ta' ? 'முழுவதும் வசூலான தொகை' : '100% repayment realized'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. FILTERS & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/85 backdrop-blur-md border border-[#D5E9FA] shadow-xs">
          {/* Scheme Type Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {[
              { id: 'all', label: lang === 'ta' ? 'அனைத்தும்' : 'All Schemes' },
              { id: 'daily', label: lang === 'ta' ? 'தினசரி' : 'Daily' },
              { id: 'weekly', label: lang === 'ta' ? 'வாராந்திர' : 'Weekly' },
              { id: 'monthly', label: lang === 'ta' ? 'மாதாந்திர' : 'Monthly' },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSchemeFilter(sc.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer ${
                  schemeFilter === sc.id
                    ? 'bg-[#0878D1] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-[#EAF5FF] text-[#183653] border border-[#D5E9FA]'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#647C95]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ta' ? 'வாடிக்கையாளர் / கடன் எண் தேடு...' : 'Search borrower or loan no...'}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#D5E9FA] text-[#183653] outline-none focus:border-[#0878D1] focus:ring-1 focus:ring-[#0878D1] transition placeholder:text-[#647C95]"
            />
          </div>
        </div>
      </div>

      {/* 4. CLOSED LOANS LIST / TABLE */}
      {loading ? (
        <div className="p-12 text-center glass rounded-2xl">
          <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading closed loans...</p>
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="p-12 text-center glass rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            {lang === 'ta' ? 'முடிந்த கடன்கள் எதுவும் இல்லை' : 'No closed loans found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || schemeFilter !== 'all'
              ? 'Try adjusting your search query or scheme filter'
              : 'Completed and closed loans will automatically appear here once fully settled.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-sky-100 dark:border-sky-900/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">{lang === 'ta' ? 'கடன் எண்' : 'Loan No'}</th>
                  <th className="px-4 py-3">{lang === 'ta' ? 'வாடிக்கையாளர்' : 'Borrower'}</th>
                  <th className="px-4 py-3">{lang === 'ta' ? 'பிரிவு' : 'Scheme'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'ta' ? 'அசல்' : 'Principal'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'ta' ? 'வசூலான தொகை' : 'Total Paid'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'ta' ? 'ஈட்டிய லாபம்' : 'Profit Earned'}</th>
                  <th className="px-4 py-3">{lang === 'ta' ? 'முடிந்த தேதி' : 'Closed Date'}</th>
                  <th className="px-4 py-3 text-center">{lang === 'ta' ? 'விபரம்' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredLoans.map((loan) => {
                  const cust = getCustomer(loan);
                  const avatar = getAvatarStyle(cust.name);
                  const profitVal = Number(
                    loan.computedProfit != null ? loan.computedProfit : (loan.chargeAmount || 0)
                  );
                  const closedDate = loan.closedAt || loan.updatedAt || loan.endDate;

                  return (
                    <tr
                      key={loan._id || loan.loanNo}
                      className="hover:bg-sky-50/40 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onViewLoan && onViewLoan(loan._id || loan.clientId || loan.loanNo)}
                    >
                      {/* Loan No */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-white">
                            {loan.loanNo}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Closed
                          </span>
                        </div>
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

                      {/* Scheme */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            loan.financeType === 'daily'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : loan.financeType === 'weekly'
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {loan.financeType}
                        </span>
                      </td>

                      {/* Principal */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {formatCurrency(loan.principal)}
                      </td>

                      {/* Total Paid */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(loan.totalCollected || loan.totalPayable || loan.principal)}
                      </td>

                      {/* Profit Earned */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                          +{formatCurrency(profitVal)}
                        </span>
                      </td>

                      {/* Closed Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                        {closedDate ? formatDate(closedDate) : 'Settled'}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewLoan) onViewLoan(loan._id || loan.clientId || loan.loanNo);
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 border border-sky-200/60 dark:border-sky-800/60 transition inline-flex items-center space-x-1"
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
      )}
    </div>
  );
};

export default ClosedLoansPage;
