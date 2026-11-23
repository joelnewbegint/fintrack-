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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {lang === 'ta' ? 'முடிந்த கடன்கள் காப்பகம்' : 'Closed Loans Archive'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {lang === 'ta' ? 'முழுவதும் முடிந்த கடன்கள்' : 'Closed & Settled Loans'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {lang === 'ta'
                ? 'முழுமையாக வசூலிக்கப்பட்டு தீர்க்கப்பட்ட கடன் கணக்குகளின் விபரம் மற்றும் ஈட்டிய லாபம்'
                : 'Fully repaid and completed loans with realized profit and settled dates'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center space-x-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{filteredLoans.length} {lang === 'ta' ? 'கடன்கள்' : 'Closed Accounts'}</span>
          </span>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Closed Loans Count */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden border transition-all duration-200"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -4px rgba(100, 116, 139, 0.08)',
          }}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              {lang === 'ta' ? 'முடிந்த கடன்கள் எண்ணிக்கை' : 'Closed Loans Count'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {filteredLoans.length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {lang === 'ta' ? 'முழுதும் பூர்த்தியானது' : 'Fully settled accounts'}
          </p>
        </div>

        {/* Total Principal Given */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden border transition-all duration-200"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(254, 215, 170, 0.8)',
            boxShadow: '0 4px 20px -4px rgba(249, 115, 22, 0.12)',
          }}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              {lang === 'ta' ? 'அசல் தொகை' : 'Principal Disbursed'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {formatCurrency(totalPrincipal)}
          </p>
          <p className="text-[10px] text-orange-500 mt-0.5 font-medium">
            {lang === 'ta' ? 'வழங்கப்பட்ட அசல்' : 'Capital principal recovered'}
          </p>
        </div>

        {/* Total Profit Earned */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden border transition-all duration-200"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(167, 243, 208, 0.9)',
            boxShadow: '0 4px 20px -4px rgba(16, 185, 129, 0.12)',
          }}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {lang === 'ta' ? 'ஈட்டிய நிகர லாபம்' : 'Realized Profit'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalProfit)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
            {lang === 'ta' ? 'வட்டி & கட்டண லாபம்' : 'Total interest & fee earned'}
          </p>
        </div>

        {/* Total Amount Collected */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden border transition-all duration-200"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(186, 230, 253, 0.9)',
            boxShadow: '0 4px 20px -4px rgba(14, 165, 233, 0.12)',
          }}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {lang === 'ta' ? 'மொத்த வசூல்' : 'Total Collected'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {formatCurrency(totalCollected)}
          </p>
          <p className="text-[10px] text-sky-500 mt-0.5 font-medium">
            {lang === 'ta' ? 'முழுவதும் வசூலான தொகை' : '100% repayment realized'}
          </p>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl glass border border-sky-100 dark:border-sky-900/40">
        {/* Scheme Type Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'all', label: lang === 'ta' ? 'அனைத்தும்' : 'All Schemes' },
            { id: 'daily', label: lang === 'ta' ? 'தினசரி' : 'Daily' },
            { id: 'weekly', label: lang === 'ta' ? 'வாராந்திர' : 'Weekly' },
            { id: 'monthly', label: lang === 'ta' ? 'மாதாந்திர' : 'Monthly' },
          ].map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSchemeFilter(sc.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                schemeFilter === sc.id
                  ? 'btn-sky-primary text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ta' ? 'வாடிக்கையாளர் / கடன் எண் தேடு...' : 'Search borrower or loan no...'}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
          />
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
