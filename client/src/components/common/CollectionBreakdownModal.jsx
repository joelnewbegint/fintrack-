import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { formatCurrency, formatDate } from '../../utils/currency';
import {
  X,
  PieChart as PieChartIcon,
  Calendar,
  Layers,
  Banknote,
  Receipt,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  CalendarDays,
  CalendarRange,
  Search,
  CheckCircle2,
} from 'lucide-react';

export const CollectionBreakdownModal = ({
  isOpen,
  onClose,
  cards = {},
  financeTypes = {},
  dailyCollectionBreakdown = [],
  onOpenExpenses,
}) => {
  const { lang, t } = useLanguage();
  const { isMobile } = useDeviceMode();
  const [activeTab, setActiveTab] = useState('schemes'); // 'schemes' | 'daily'
  const [searchDate, setSearchDate] = useState('');

  if (!isOpen) return null;

  const totalGross = cards.totalCollected || 0;
  const totalExpenses = cards.totalExpenses || 0;
  const netInHand = cards.netCollected !== undefined ? cards.netCollected : Math.max(0, totalGross - totalExpenses);

  const dailyData = financeTypes.daily || {};
  const weeklyData = financeTypes.weekly || {};
  const monthlyData = financeTypes.monthly || {};

  const schemes = [
    {
      id: 'daily',
      title: lang === 'ta' ? 'தினசரி தண்டல்' : 'Daily Thandal',
      sub: 'Daily micro installments',
      icon: Zap,
      color: 'amber',
      badgeBg: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300',
      barColor: 'from-amber-400 to-amber-500',
      collected: dailyData.collected || 0,
      lent: dailyData.lent || 0,
      pending: dailyData.pending || 0,
      activeLoans: dailyData.activeLoans || 0,
    },
    {
      id: 'weekly',
      title: lang === 'ta' ? 'வாரத்தவணை' : 'Weekly Finance',
      sub: 'Weekly commercial credit',
      icon: CalendarDays,
      color: 'sky',
      badgeBg: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-300',
      barColor: 'from-sky-400 to-sky-600',
      collected: weeklyData.collected || 0,
      lent: weeklyData.lent || 0,
      pending: weeklyData.pending || 0,
      activeLoans: weeklyData.activeLoans || 0,
    },
    {
      id: 'monthly',
      title: lang === 'ta' ? 'மாதத்தவணை' : 'Monthly Finance',
      sub: 'Monthly interest & principal',
      icon: CalendarRange,
      color: 'teal',
      badgeBg: 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300',
      barColor: 'from-teal-400 to-teal-600',
      collected: monthlyData.collected || 0,
      lent: monthlyData.lent || 0,
      pending: monthlyData.pending || 0,
      activeLoans: monthlyData.activeLoans || 0,
    },
  ];

  const totalSchemeCollected = schemes.reduce((acc, s) => acc + s.collected, 0) || totalGross || 1;

  // Filter daily breakdown
  const filteredDaily = dailyCollectionBreakdown.filter((item) => {
    if (!searchDate) return true;
    return item.date.includes(searchDate);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative glass-panel rounded-3xl p-5 sm:p-6 border border-white/80 dark:border-sky-800/60 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-sky-100 dark:border-sky-900/40">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <PieChartIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  {lang === 'ta' ? 'வசூல் & நிதி முறை விவரங்கள்' : 'Overall Collections & Scheme Breakdown'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'ta'
                    ? 'வசூல் முறை, தினசரி விவரங்கள் மற்றும் செலவு கழிப்பு'
                    : 'Collections breakdown by scheme, daily logs & expense deductions'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass hover:bg-sky-100 dark:hover:bg-sky-950 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner: Gross - Expenses = Net In Hand */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-emerald-500/10 to-teal-500/10 border border-sky-200/80 dark:border-sky-800/60 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Gross Collected */}
            <div className="glass rounded-xl p-3 border border-sky-200/60 dark:border-sky-800/40">
              <p className="text-[10px] font-black uppercase text-sky-600 tracking-wider">
                {lang === 'ta' ? 'மொத்த வசூல் (Gross)' : 'Gross Collections'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5 whitespace-nowrap">
                {formatCurrency(totalGross)}
              </p>
              <p className="text-[10px] text-slate-400">All customer receipts</p>
            </div>

            {/* Expenses Deducted */}
            <div className="glass rounded-xl p-3 border border-rose-200/60 dark:border-rose-900/40">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-rose-600 tracking-wider">
                  {lang === 'ta' ? 'கழித்த செலவுகள்' : 'Expenses Deducted'}
                </p>
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-600 tabular-nums mt-0.5 whitespace-nowrap">
                -{formatCurrency(totalExpenses)}
              </p>
              <p className="text-[10px] text-rose-500/80">Fuel, tea, rent & office</p>
            </div>

            {/* Net Collections In Hand */}
            <div className="glass rounded-xl p-3 border border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">
                  {lang === 'ta' ? 'நிகர வசூல் இருப்பு' : 'Net Cash in Hand'}
                </p>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums mt-0.5 whitespace-nowrap">
                {formatCurrency(netInHand)}
              </p>
              <p className="text-[10px] text-emerald-600/80 font-bold">Balance after all expenses</p>
            </div>
          </div>

          {/* Quick Expense Shortcut */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'ta'
                ? 'செலவுகள் சேர்க்கும்போது, வசூலில் இருந்து தானாகக் கழியும்'
                : 'Adding expenses automatically reduces net cash in hand'}
            </span>
            {onOpenExpenses && (
              <button
                onClick={() => {
                  onClose();
                  onOpenExpenses();
                }}
                className="px-3 py-1.5 rounded-xl glass hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-bold text-xs border border-rose-200 dark:border-rose-900/60 flex items-center space-x-1.5 transition shrink-0"
              >
                <span>{lang === 'ta' ? 'செலவுகள் பக்கம் செல்ல' : 'Manage Expenses'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher: By Scheme vs Daily Breakdown */}
        <div className="flex items-center space-x-2 border-b border-sky-100 dark:border-sky-900/40 pb-2">
          <button
            onClick={() => setActiveTab('schemes')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'schemes'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-300'
                : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{lang === 'ta' ? 'நிதி முறை விவரம்' : 'By Finance Scheme'}</span>
          </button>

          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'daily'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-300'
                : 'glass text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {lang === 'ta' ? 'தினசரி வசூல் விவரம்' : 'Daily Collection Logs'} ({dailyCollectionBreakdown.length})
            </span>
          </button>
        </div>

        {/* Tab 1: By Finance Scheme */}
        {activeTab === 'schemes' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {schemes.map((scheme) => {
                const Icon = scheme.icon;
                const percentage = Math.round((scheme.collected / (totalSchemeCollected || 1)) * 100);

                return (
                  <div
                    key={scheme.id}
                    className="p-4 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${scheme.badgeBg}`}>
                        {scheme.title}
                      </span>
                      <div className="p-2 rounded-xl glass text-slate-600 dark:text-slate-300">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {formatCurrency(scheme.collected)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {percentage}% {lang === 'ta' ? 'மொத்த வசூலில்' : 'of total collections'}
                      </p>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-sky-950/80 rounded-full h-2 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${scheme.barColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                      />
                    </div>

                    <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Total Lent:</span>
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(scheme.lent)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Remaining Pending:</span>
                        <span className="font-bold text-amber-600 tabular-nums">{formatCurrency(scheme.pending)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Active Loans:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{scheme.activeLoans} loans</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Daily Collections Breakdown */}
        {activeTab === 'daily' && (
          <div className="space-y-3 animate-fade-in">
            {/* Search filter for date */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by date (YYYY-MM-DD)..."
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                {filteredDaily.length} recorded days
              </span>
            </div>

            {filteredDaily.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 glass rounded-2xl">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No collection records found for this filter</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredDaily.map((row) => (
                  <div
                    key={row.date}
                    className="p-3.5 rounded-2xl glass glass-hover border border-sky-200/60 dark:border-sky-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-500" />
                          <span>{formatDate(row.date)}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                          {row.receiptsCount} {row.receiptsCount === 1 ? 'receipt' : 'receipts'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 font-mono">
                        {row.dailyScheme > 0 && <span>Daily: {formatCurrency(row.dailyScheme)}</span>}
                        {row.weeklyScheme > 0 && <span>• Weekly: {formatCurrency(row.weeklyScheme)}</span>}
                        {row.monthlyScheme > 0 && <span>• Monthly: {formatCurrency(row.monthlyScheme)}</span>}
                        <span>• Cash: {formatCurrency(row.cashAmount)}</span>
                        {row.upiAmount > 0 && <span>• UPI: {formatCurrency(row.upiAmount)}</span>}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="flex items-center sm:justify-end space-x-2">
                        <span className="font-black tabular-nums text-sm text-slate-900 dark:text-white">
                          Gross: {formatCurrency(row.totalCollected)}
                        </span>
                        {row.expenses > 0 && (
                          <span className="text-xs font-bold text-rose-500 tabular-nums">
                            (-{formatCurrency(row.expenses)})
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-black text-emerald-600 tabular-nums">
                        Net In Hand: {formatCurrency(row.netCollected)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CollectionBreakdownModal;
