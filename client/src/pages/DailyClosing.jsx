import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate, formatDateForInput } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Banknote,
  QrCode,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  CalendarDays,
  CalendarRange,
  Layers,
  Filter,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const DailyClosing = () => {
  const { t, lang } = useLanguage();
  const { isMobile, isTablet, isLaptop } = useDeviceMode();
  const [selectedDate, setSelectedDate] = useState(formatDateForInput());
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'daily', 'weekly', 'monthly'
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleCollectedCount, setVisibleCollectedCount] = useState(5);
  const [visibleExpectedCount, setVisibleExpectedCount] = useState(5);

  const fetchClosingReport = async () => {
    try {
      setLoading(true);
      const res = await api.getDailyClosing(selectedDate);
      if (res.success) {
        setReport(res);
      }
    } catch (err) {
      console.error('Failed to load daily closing report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosingReport();
  }, [selectedDate]);

  const summary = report?.summary || {
    totalExpected: 0,
    totalCollected: 0,
    pendingAmount: 0,
    cashCollected: 0,
    upiCollected: 0,
    totalReceiptsCount: 0,
  };

  const payments = report?.payments || [];
  const expectedList = report?.expectedList || [];

  // Calculate or extract byFinanceType breakdown (Daily, Weekly, Monthly)
  const byFinanceType = report?.summary?.byFinanceType || (() => {
    const res = {
      daily: { expected: 0, collected: 0, pending: 0, cash: 0, upi: 0, receiptsCount: 0, expectedCount: 0 },
      weekly: { expected: 0, collected: 0, pending: 0, cash: 0, upi: 0, receiptsCount: 0, expectedCount: 0 },
      monthly: { expected: 0, collected: 0, pending: 0, cash: 0, upi: 0, receiptsCount: 0, expectedCount: 0 },
    };
    payments.forEach((p) => {
      const type = (p.loanId?.financeType || 'daily').toLowerCase();
      if (res[type]) {
        res[type].collected += p.amount || 0;
        res[type].receiptsCount += 1;
        if (p.mode === 'cash') res[type].cash += p.amount || 0;
        if (p.mode === 'upi') res[type].upi += p.amount || 0;
      }
    });
    expectedList.forEach((inst) => {
      const type = (inst.financeType || 'daily').toLowerCase();
      if (res[type]) {
        res[type].expected += inst.expectedAmount || 0;
        res[type].expectedCount += 1;
      }
    });
    Object.keys(res).forEach((k) => {
      res[k].pending = Math.max(0, res[k].expected - res[k].collected);
    });
    return res;
  })();

  // Filtered lists according to selected finance scheme tab
  const filteredPayments = payments.filter((p) => {
    if (selectedType === 'all') return true;
    const type = (p.loanId?.financeType || 'daily').toLowerCase();
    return type === selectedType;
  });

  const filteredExpected = expectedList.filter((inst) => {
    if (selectedType === 'all') return true;
    const type = (inst.financeType || 'daily').toLowerCase();
    return type === selectedType;
  });

  const handlePrint = () => {
    window.print();
  };

  // Scheme styling helper
  const getSchemeMeta = (type) => {
    switch (type) {
      case 'daily':
        return {
          title: lang === 'ta' ? 'தினசரி தண்டல்' : 'Daily Thandal',
          subTitle: lang === 'ta' ? 'தினசரி வசூல் கணக்கு' : 'Daily collection cycle',
          icon: Zap,
          badgeBg: 'bg-amber-100 dark:bg-amber-950/70',
          badgeText: 'text-amber-900 dark:text-amber-300',
          badgeBorder: 'border-amber-300 dark:border-amber-800',
          accent: '#F59E0B',
          glow: 'from-amber-400 to-amber-600',
        };
      case 'weekly':
        return {
          title: lang === 'ta' ? 'வாரத்தவணை நிதி' : 'Weekly Finance',
          subTitle: lang === 'ta' ? 'வாராந்திர தவணை கணக்கு' : '7-day installment cycle',
          icon: CalendarDays,
          badgeBg: 'bg-sky-100 dark:bg-sky-950/70',
          badgeText: 'text-sky-900 dark:text-sky-300',
          badgeBorder: 'border-sky-300 dark:border-sky-800',
          accent: '#0EA5E9',
          glow: 'from-sky-400 to-sky-600',
        };
      case 'monthly':
      default:
        return {
          title: lang === 'ta' ? 'மாதத்தவணை நிதி' : 'Monthly Finance',
          subTitle: lang === 'ta' ? 'மாதாந்திர வட்டி/தவணை' : 'Monthly repayment cycle',
          icon: CalendarRange,
          badgeBg: 'bg-teal-100 dark:bg-teal-950/70',
          badgeText: 'text-teal-900 dark:text-teal-300',
          badgeBorder: 'border-teal-300 dark:border-teal-800',
          accent: '#14B8A6',
          glow: 'from-teal-400 to-teal-600',
        };
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header and Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('dailyClosingReport')} / தினசரி கணக்கு முடிவு
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'ta'
              ? 'தினசரி தண்டல், வாரத்தவணை மற்றும் மாதத்தவணை தனித்தனி வசூல் வரவு செலவு அறிக்கை'
              : 'End-of-day cashier balance sheet: Separate breakdown for Daily, Weekly, and Monthly schemes'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 glass px-3 py-2 rounded-2xl border border-sky-200/80 dark:border-sky-800/60 shadow-sm text-xs">
            <Calendar className="w-4 h-4 text-sky-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-black outline-none text-slate-800 dark:text-slate-200"
            />
          </div>

          <button
            onClick={handlePrint}
            className="btn-sky-primary flex items-center space-x-1.5 py-2.5 px-4 text-xs font-black shadow-md shadow-sky-500/20 active:scale-95"
            title="Print Cashier Statement Sheet"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* 1. Overall Summary Metric Cards (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expected */}
        <div className="glass rounded-3xl p-4 sm:p-5 border border-white/70 dark:border-sky-800/40 shadow-lg">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            {t('totalExpectedDues')}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatCurrency(summary.totalExpected)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {expectedList.length} total installments scheduled
          </p>
        </div>

        {/* Collected Today */}
        <div className="glass rounded-3xl p-4 sm:p-5 border border-emerald-200/80 dark:border-emerald-900/60 shadow-lg">
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
            {t('collectedToday')}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(summary.totalCollected)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {summary.totalReceiptsCount} receipts issued today
          </p>
        </div>

        {/* Pending Shortfall */}
        <div className="glass rounded-3xl p-4 sm:p-5 border border-amber-200/80 dark:border-amber-900/60 shadow-lg">
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
            {t('netDeficit')}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {formatCurrency(summary.pendingAmount)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Uncollected shortfall today</p>
        </div>

        {/* Payment Breakdown (Cash & UPI) */}
        <div className="glass rounded-3xl p-4 sm:p-5 border border-white/70 dark:border-sky-800/40 shadow-lg flex flex-col justify-between">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Payment Breakdown</p>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-300">
                <Banknote className="w-4 h-4 text-emerald-500" />
                <span>Cash in Hand:</span>
              </span>
              <span className="font-black text-emerald-600 tabular-nums">
                {formatCurrency(summary.cashCollected)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-300">
                <QrCode className="w-4 h-4 text-sky-500" />
                <span>GPay / UPI:</span>
              </span>
              <span className="font-black text-sky-600 tabular-nums">
                {formatCurrency(summary.upiCollected)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Collection Schemes Breakdown (Daily vs Weekly vs Monthly) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-sky-500" />
              <span>
                {lang === 'ta'
                  ? 'தனித்தனி வசூல் கணக்கு (Daily, Weekly, Monthly)'
                  : 'Separate Collection Schemes (Daily, Weekly, Monthly)'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ta'
                ? 'ஒவ்வொரு கடன் திட்டத்தின் தனித்தனி வசூல் மற்றும் நிலுவை ஒப்பீடு'
                : 'Scheme-by-scheme comparison of expected dues, actual collections, and pending balances'}
            </p>
          </div>

          {/* Segmented Filter Tab Controls */}
          <div className="flex items-center p-1 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 space-x-1 overflow-x-auto">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                selectedType === 'all'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-sky-600'
              }`}
            >
              All ({summary.totalReceiptsCount})
            </button>

            <button
              onClick={() => setSelectedType('daily')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 ${
                selectedType === 'daily'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'ta' ? 'தினசரி தண்டல்' : 'Daily'} ({byFinanceType.daily.receiptsCount})</span>
            </button>

            <button
              onClick={() => setSelectedType('weekly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 ${
                selectedType === 'weekly'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-sky-600'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-sky-500" />
              <span>{lang === 'ta' ? 'வாரத்தவணை' : 'Weekly'} ({byFinanceType.weekly.receiptsCount})</span>
            </button>

            <button
              onClick={() => setSelectedType('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 ${
                selectedType === 'monthly'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5 text-teal-500" />
              <span>{lang === 'ta' ? 'மாதத்தவணை' : 'Monthly'} ({byFinanceType.monthly.receiptsCount})</span>
            </button>
          </div>
        </div>

        {/* 3 Dedicated Scheme Split Cards */}
        <div
          className={`grid ${
            isMobile ? 'grid-cols-1 gap-3' : isTablet ? 'grid-cols-2 gap-4' : 'grid-cols-3 gap-4'
          }`}
        >
          {['daily', 'weekly', 'monthly'].map((type) => {
            const data = byFinanceType[type] || {
              expected: 0,
              collected: 0,
              pending: 0,
              cash: 0,
              upi: 0,
              receiptsCount: 0,
              expectedCount: 0,
            };
            const meta = getSchemeMeta(type);
            const Icon = meta.icon;
            const isSelected = selectedType === type;
            const collectionRate =
              data.expected > 0
                ? Math.min(100, Math.round((data.collected / data.expected) * 100))
                : data.collected > 0
                ? 100
                : 0;

            return (
              <div
                key={type}
                onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                className={`glass rounded-3xl p-5 border cursor-pointer transition-all duration-200 shadow-md flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-sky-400 bg-sky-50/70 dark:bg-sky-950/60 border-sky-400 scale-[1.01]'
                    : 'border-white/80 dark:border-sky-800/40 hover:border-sky-300'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-gradient-to-tr ${meta.glow} shadow-md`}
                      >
                        <Icon className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                          {meta.title}
                        </h3>
                        <p className="text-[11px] text-slate-400">{meta.subTitle}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                    >
                      {type}
                    </span>
                  </div>

                  {/* 3 Metric Figures */}
                  <div className="grid grid-cols-3 gap-2 py-3.5 my-3 border-y border-sky-100 dark:border-sky-900/40 text-center text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Expected</p>
                      <p className="font-black tabular-nums text-slate-800 dark:text-slate-100 mt-0.5">
                        {formatCurrency(data.expected)}
                      </p>
                      <span className="text-[10px] text-slate-400">({data.expectedCount} dues)</span>
                    </div>

                    <div>
                      <p className="text-[10px] text-emerald-600 uppercase font-bold">Collected</p>
                      <p className="font-black tabular-nums text-emerald-600 mt-0.5">
                        {formatCurrency(data.collected)}
                      </p>
                      <span className="text-[10px] text-emerald-500 font-bold">
                        ({data.receiptsCount} paid)
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] text-amber-600 uppercase font-bold">Pending</p>
                      <p className="font-black tabular-nums text-amber-600 mt-0.5">
                        {formatCurrency(data.pending)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {data.expectedCount - data.receiptsCount > 0
                          ? `(${data.expectedCount - data.receiptsCount} left)`
                          : '0 left'}
                      </span>
                    </div>
                  </div>

                  {/* Cash vs UPI Breakdown within Scheme */}
                  <div className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-sky-100 dark:border-sky-900/40 font-mono">
                    <span className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
                      <Banknote className="w-3 h-3 text-emerald-500" />
                      <span>Cash: {formatCurrency(data.cash)}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
                      <QrCode className="w-3 h-3 text-sky-500" />
                      <span>UPI: {formatCurrency(data.upi)}</span>
                    </span>
                  </div>
                </div>

                {/* Collection Efficiency Progress Bar */}
                <div className="pt-3 mt-2 border-t border-sky-100 dark:border-sky-900/40">
                  <div className="flex justify-between items-center text-[10px] mb-1 font-bold">
                    <span className="text-slate-500">Collection Recovery:</span>
                    <span
                      style={{ color: meta.accent }}
                      className="font-black tabular-nums"
                    >
                      {collectionRate}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${meta.glow}`}
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Detailed Cashier Ledger Panels (Side-by-side on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Collections Received on this day */}
        <div className="glass rounded-3xl p-4 sm:p-5 border border-white/80 dark:border-sky-800/40 shadow-lg space-y-3">
          <div className="pb-3 border-b border-sky-100 dark:border-sky-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>
                    {selectedType === 'all'
                      ? 'Collected Today / வசூலான தொகை'
                      : `${getSchemeMeta(selectedType).title} Collections`}
                    {' '}({filteredPayments.length})
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedType === 'all'
                    ? 'All cash and UPI receipts issued on this date'
                    : `Filtered to ${selectedType.toUpperCase()} scheme receipts`}
                </p>
              </div>

              <div className="mt-1 sm:mt-0">
                <span className="inline-block text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 tabular-nums whitespace-nowrap">
                  Total: {formatCurrency(
                    filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 glass rounded-2xl">
              No {selectedType !== 'all' ? selectedType : ''} collections recorded on this date.
            </div>
          ) : (
            <div className={`space-y-2.5 ${isMobile ? '' : 'divide-y divide-sky-100 dark:divide-sky-900/40 max-h-[460px] overflow-y-auto pr-1'}`}>
              {(isMobile ? filteredPayments.slice(0, visibleCollectedCount) : filteredPayments).map((p) => {
                const scheme = (p.loanId?.financeType || 'daily').toLowerCase();
                const meta = getSchemeMeta(scheme);
                const nameParsed = parseCustomerName(p.customerId?.name);

                return (
                  <div
                    key={p._id}
                    className="p-3.5 rounded-2xl glass border border-white/60 dark:border-sky-900/40 border-l-4 border-l-emerald-500 space-y-2 min-h-[64px]"
                  >
                    {/* Line 1: Customer Name + Amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight truncate block">
                          {nameParsed.primary}
                        </span>
                        {nameParsed.secondary && (
                          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate block mt-0.5">
                            {nameParsed.secondary}
                          </span>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <span className="font-black text-emerald-600 text-sm sm:text-base tabular-nums whitespace-nowrap block">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Info + Badges */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                      <div className="min-w-0 flex-1 truncate font-mono text-[11px]">
                        <span>{p.receiptNo}</span>
                        <span className="mx-1">•</span>
                        <span>{p.loanId?.loanNo}</span>
                        {p.customerId?.area && (
                          <>
                            <span className="mx-1">•</span>
                            <span>{p.customerId.area}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} whitespace-nowrap`}
                        >
                          {scheme}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap ${
                            p.mode === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {p.mode?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Line 3: Collector */}
                    <div className="pt-1.5 border-t border-sky-100/60 dark:border-sky-900/40 text-[10px] text-slate-400">
                      Collected By: {p.collectedBy?.name || 'Owner'}
                    </div>
                  </div>
                );
              })}

              {isMobile && filteredPayments.length > visibleCollectedCount && (
                <button
                  onClick={() => setVisibleCollectedCount((prev) => prev + 5)}
                  className="w-full py-2.5 rounded-2xl glass font-bold text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 active:scale-98 transition shadow-sm mt-2"
                >
                  Show More (+5 of {filteredPayments.length - visibleCollectedCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expected Installments on this day */}
        <div className="glass rounded-3xl p-4 sm:p-5 border border-white/80 dark:border-sky-800/40 shadow-lg space-y-3">
          <div className="pb-3 border-b border-sky-100 dark:border-sky-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-sky-500" />
                  <span>
                    {selectedType === 'all'
                      ? 'Scheduled Dues / தவணை எதிர்பார்ப்பு'
                      : `${getSchemeMeta(selectedType).title} Scheduled Dues`}
                    {' '}({filteredExpected.length})
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedType === 'all'
                    ? 'Active loans due for collection on this date'
                    : `Filtered to ${selectedType.toUpperCase()} scheme expected dues`}
                </p>
              </div>

              <div className="mt-1 sm:mt-0">
                <span className="inline-block text-xs font-black text-sky-600 bg-sky-50 dark:bg-sky-950/60 px-3 py-1 rounded-xl border border-sky-200 dark:border-sky-800 tabular-nums whitespace-nowrap">
                  Expected: {formatCurrency(
                    filteredExpected.reduce((acc, inst) => acc + (inst.expectedAmount || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          {filteredExpected.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 glass rounded-2xl">
              No {selectedType !== 'all' ? selectedType : ''} installments scheduled for this date.
            </div>
          ) : (
            <div className={`space-y-2.5 ${isMobile ? '' : 'divide-y divide-sky-100 dark:divide-sky-900/40 max-h-[460px] overflow-y-auto pr-1'}`}>
              {(isMobile ? filteredExpected.slice(0, visibleExpectedCount) : filteredExpected).map((item, idx) => {
                const scheme = (item.financeType || 'daily').toLowerCase();
                const meta = getSchemeMeta(scheme);
                const nameParsed = parseCustomerName(item.customerName);
                const isPaid = item.status === 'paid';

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl glass border border-white/60 dark:border-sky-900/40 border-l-4 ${
                      isPaid ? 'border-l-emerald-500' : 'border-l-amber-500'
                    } space-y-2 min-h-[64px]`}
                  >
                    {/* Line 1: Customer Name + Amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight truncate block">
                          {nameParsed.primary}
                        </span>
                        {nameParsed.secondary && (
                          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate block mt-0.5">
                            {nameParsed.secondary}
                          </span>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base tabular-nums whitespace-nowrap block">
                          {formatCurrency(item.expectedAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Loan details + Status */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                      <div className="min-w-0 flex-1 truncate font-mono text-[11px]">
                        <span>{item.loanNo}</span>
                        <span className="mx-1">•</span>
                        <span>Inst #{item.installmentNo}</span>
                        {item.area && (
                          <>
                            <span className="mx-1">•</span>
                            <span>{item.area}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} whitespace-nowrap`}
                        >
                          {scheme}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-black text-[9px] uppercase whitespace-nowrap ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Line 3: Status explanation */}
                    <div className="pt-1.5 border-t border-sky-100/60 dark:border-sky-900/40 text-[10px] text-slate-400">
                      {isPaid ? 'Paid in full for today' : 'Collection Pending'}
                    </div>
                  </div>
                );
              })}

              {isMobile && filteredExpected.length > visibleExpectedCount && (
                <button
                  onClick={() => setVisibleExpectedCount((prev) => prev + 5)}
                  className="w-full py-2.5 rounded-2xl glass font-bold text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 active:scale-98 transition shadow-sm mt-2"
                >
                  Show More (+5 of {filteredExpected.length - visibleExpectedCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyClosing;

