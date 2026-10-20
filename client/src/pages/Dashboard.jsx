import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatShortCurrency, formatDate, getOverdueDays } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import StatCard from '../components/common/StatCard';
import FinanceTypeCard from '../components/common/FinanceTypeCard';
import PaymentModal from '../components/common/PaymentModal';
import ReceiptModal from '../components/common/ReceiptModal';
import WhatsAppReminderModal from '../components/common/WhatsAppReminderModal';
import CollectionBreakdownModal from '../components/common/CollectionBreakdownModal';
import {
  Banknote,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Send,
  CreditCard,
  RefreshCw,
  Search,
  CalendarCheck,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  CheckCheck,
  Receipt,
  Award,
  Zap,
  CalendarDays,
  CalendarRange,
  Layers,
  ArrowRight,
  Check,
  Printer,
  PieChart as PieChartIcon,
  Coins,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

export const Dashboard = ({
  onSelectFinanceType,
  onViewLoan,
  onOpenPayment,
  onOpenNewLoan,
  onOpenInvestment,
  onOpenExpenses,
}) => {
  const { t, lang } = useLanguage();
  const { user, isOwner } = useAuth();
  const { isMobile, isTablet, isLaptop } = useDeviceMode();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedPayItem, setSelectedPayItem] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [whatsappItem, setWhatsappItem] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [panelTab, setPanelTab] = useState('pending'); // 'pending' | 'completed'
  const [dashboardView, setDashboardView] = useState('overview'); // 'overview' | 'completed' | 'settled'
  const [completedFilterScheme, setCompletedFilterScheme] = useState('all');
  const [completedSearch, setCompletedSearch] = useState('');

  // Mobile specific states
  const [mobileTab, setMobileTab] = useState('due'); // 'due' | 'collected' | 'overdue'
  const [mobileVisibleCount, setMobileVisibleCount] = useState(5);
  const [showTrendChart, setShowTrendChart] = useState(false);
  const [showSplitChart, setShowSplitChart] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Skeleton Loader
  if (loading && !stats) {
    if (isMobile) {
      return (
        <div className="space-y-4 animate-pulse p-1 pb-24">
          <div className="h-10 w-44 bg-sky-200/50 dark:bg-sky-900/40 rounded-2xl" />
          <div className="h-28 glass rounded-3xl" />
          <div className="h-20 glass rounded-3xl" />
          <div className="h-64 glass rounded-3xl" />
        </div>
      );
    }
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 glass rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 glass rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const cards = stats?.cards || {};
  const financeTypes = stats?.financeTypes || {};
  const todayDueList = stats?.todayDueList || [];
  const overdueLoans = stats?.overdueLoans || [];
  const collectionTrend = stats?.collectionTrend || [];
  const financeTypeSplit = (stats?.financeTypeSplit || []).map((item) => {
    let c = '#0EA5E9'; // sky
    if (item.key === 'daily') c = '#F59E0B'; // amber
    if (item.key === 'monthly') c = '#14B8A6'; // teal
    return { ...item, color: c };
  });
  const monthlyChartData = stats?.monthlyChartData || [];

  // Filter today's list by customer name, phone, or loanNo
  const filteredTodayList = todayDueList.filter((item) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.customerName?.toLowerCase().includes(q) ||
      item.customerPhone?.includes(q) ||
      item.loanNo?.toLowerCase().includes(q) ||
      item.customerArea?.toLowerCase().includes(q)
    );
  });

  const completedTodayList = stats?.completedTodayList || [];
  const completedLoansList = stats?.completedLoansList || [];

  // Filter completed collections list
  const filteredCompletedList = completedTodayList.filter((item) => {
    const q = (filterQuery || completedSearch).toLowerCase();
    const custName = item.customerId?.name?.toLowerCase() || '';
    const custPhone = item.customerId?.phone || '';
    const receiptNo = item.receiptNo?.toLowerCase() || '';
    const loanNo = item.loanId?.loanNo?.toLowerCase() || '';
    const area = item.customerId?.area?.toLowerCase() || '';
    const matchesSearch =
      !q || custName.includes(q) || custPhone.includes(q) || receiptNo.includes(q) || loanNo.includes(q) || area.includes(q);
    const itemScheme = (item.loanId?.financeType || 'daily').toLowerCase();
    const matchesScheme =
      completedFilterScheme === 'all' || itemScheme === completedFilterScheme;
    return matchesSearch && matchesScheme;
  });

  // Render the Today's Collection List Component (used in right panel on Laptop, or stacked on Tablet)
  const renderTodayCollectionList = () => (
    <div className="glass rounded-3xl p-5 border border-white/70 dark:border-sky-800/40 shadow-lg space-y-4">
      {/* Header with Segmented Switch: Pending vs Completed Collections */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sky-100 dark:border-sky-900/40">
        <div>
          <div className="flex items-center space-x-1 p-1 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60">
            <button
              onClick={() => setPanelTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                panelTab === 'pending'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-sky-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Dues ({filteredTodayList.length})</span>
            </button>
            <button
              onClick={() => setPanelTab('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                panelTab === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed ({completedTodayList.length})</span>
            </button>
          </div>
          {/* Put the description on its own line under title (Bug A.4 fix) */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            {panelTab === 'pending'
              ? 'Collections to be collected. Disappears automatically once paid.'
              : 'Paid collections saved in archive with official receipts.'}
          </p>
        </div>

        {/* Quick Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={panelTab === 'pending' ? 'Filter pending dues...' : 'Filter completed receipts...'}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </div>

      {panelTab === 'pending' ? (
        filteredTodayList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl space-y-2">
            <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-200">All Collections Completed!</p>
            <p className="text-[11px]">No pending dues remaining for today. All paid collections are saved in the Completed list.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredTodayList.map((item) => {
              const parsed = parseCustomerName(item.customerName);
              return (
                <div
                  key={`${item.loanId}-${item.dueDate}`}
                  className="p-3.5 rounded-2xl glass glass-hover border border-white/80 dark:border-sky-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
                >
                  <div
                    className="cursor-pointer space-y-0.5 flex-1 min-w-0"
                    onClick={() => onViewLoan && onViewLoan(item.loanId)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {parsed.primary}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase border shrink-0 ${
                          item.financeType === 'daily'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300'
                            : item.financeType === 'weekly'
                            ? 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300'
                            : 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300'
                        }`}
                      >
                        {item.financeType}
                      </span>
                    </div>
                    {parsed.secondary && (
                      <p className="text-[11px] text-slate-400 truncate leading-none">
                        {parsed.secondary}
                      </p>
                    )}
                    <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2 truncate">
                      <span>{item.loanNo}</span>
                      <span>•</span>
                      <span>{item.customerPhone}</span>
                      {item.customerArea && (
                        <>
                          <span>•</span>
                          <span className="truncate">{item.customerArea}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-black tabular-nums text-sm sm:text-base text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(item.dueAmount)}
                      </p>
                      {item.isOverdue ? (
                        <span className="text-[10px] font-bold text-red-500 whitespace-nowrap">
                          Overdue ({getOverdueDays(item.dueDate)}d)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          Due Today
                        </span>
                      )}
                    </div>

                    {/* Actions: One-Tap Quick Pay & WhatsApp */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => setWhatsappItem(item)}
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border border-sky-200 dark:border-sky-800 text-slate-600 hover:text-emerald-600 hover:border-emerald-400 transition active:scale-95 shadow-sm"
                        title="Send WhatsApp Reminder"
                      >
                        <Send className="w-4 h-4 text-emerald-500" />
                      </button>

                      <button
                        onClick={() => setSelectedPayItem(item)}
                        className="btn-sky-primary min-h-[44px] py-2 px-3 text-xs font-black shadow-md flex items-center space-x-1 whitespace-nowrap"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{t('markPaid')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Completed Collections List (Saved in Archive) */
        filteredCompletedList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl">
            No completed collections recorded yet for today.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredCompletedList.map((p) => {
              const scheme = (p.loanId?.financeType || 'daily').toLowerCase();
              const parsed = parseCustomerName(p.customerId?.name);
              return (
                <div
                  key={p._id}
                  className="p-3.5 rounded-2xl glass glass-hover border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {parsed.primary}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border shrink-0 ${
                          scheme === 'daily'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : scheme === 'weekly'
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : 'bg-teal-100 text-teal-900 border-teal-300'
                        }`}
                      >
                        {scheme}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                          p.mode === 'cash'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}
                      >
                        {p.mode?.toUpperCase()}
                      </span>
                    </div>
                    {parsed.secondary && (
                      <p className="text-[11px] text-slate-400 truncate leading-none">
                        {parsed.secondary}
                      </p>
                    )}
                    <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2 truncate">
                      <span className="font-bold text-emerald-600">{p.receiptNo}</span>
                      <span>•</span>
                      <span>{p.loanId?.loanNo}</span>
                      <span>•</span>
                      <span>{formatDate(p.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-black tabular-nums text-sm sm:text-base text-emerald-600 whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        By {p.collectedBy?.name || 'Owner'}
                      </p>
                    </div>

                    <button
                      onClick={() => setReceiptPayment(p)}
                      className="px-3 py-2 rounded-xl glass hover:bg-sky-50 text-sky-600 font-bold text-xs border border-sky-200 shrink-0 min-h-[44px] flex items-center"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs: Overview vs Dedicated Completed Collections Page vs Settled Accounts */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        <button
          onClick={() => setDashboardView('overview')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 ${
            dashboardView === 'overview'
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-300'
              : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{lang === 'ta' ? 'கண்ணோட்டம்' : 'Overview'}</span>
        </button>

        <button
          onClick={() => setDashboardView('completed')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 ${
            dashboardView === 'completed'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-300'
              : 'glass text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'ta' ? 'வசூலானவை' : 'Completed'} ({completedTodayList.length})</span>
        </button>

        <button
          onClick={() => setDashboardView('settled')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 ${
            dashboardView === 'settled'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-300'
              : 'glass text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
          }`}
        >
          <Award className="w-4 h-4 text-amber-300" />
          <span>{lang === 'ta' ? 'முடிந்தவை' : 'Settled'} ({completedLoansList.length})</span>
        </button>
      </div>

      {/* Dedicated View 1: Completed Collections (Archived & Saved Separate Page) */}
      {dashboardView === 'completed' && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards for Completed Collections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass rounded-3xl p-5 border border-emerald-200/80 dark:border-emerald-900/60 shadow-lg">
              <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">
                Total Collections Saved
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 tabular-nums whitespace-nowrap">
                {formatCurrency(
                  completedTodayList.reduce((acc, p) => acc + (p.amount || 0), 0)
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {completedTodayList.length} total payments collected & archived
              </p>
            </div>

            <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Cash in Hand
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums whitespace-nowrap">
                {formatCurrency(
                  completedTodayList
                    .filter((p) => p.mode === 'cash')
                    .reduce((acc, p) => acc + (p.amount || 0), 0)
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Physical currency collected</p>
            </div>

            <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg">
              <p className="text-[11px] text-sky-500 font-bold uppercase tracking-wider">
                GPay / UPI Received
              </p>
              <p className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 mt-1 tabular-nums whitespace-nowrap">
                {formatCurrency(
                  completedTodayList
                    .filter((p) => p.mode === 'upi')
                    .reduce((acc, p) => acc + (p.amount || 0), 0)
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Direct digital bank settlements</p>
            </div>

            <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Completed Receipts Count
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                {completedTodayList.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Official customer vouchers</p>
            </div>
          </div>

          {/* Scheme Filter Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search borrower, receipt #, loan #..."
                value={completedSearch}
                onChange={(e) => setCompletedSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-3 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div className="flex items-center space-x-1.5 p-1 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60 overflow-x-auto w-full sm:w-auto">
              {['all', 'daily', 'weekly', 'monthly'].map((m) => (
                <button
                  key={m}
                  onClick={() => setCompletedFilterScheme(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                    completedFilterScheme === m
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                  }`}
                >
                  {m === 'all' ? 'All Schemes' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Completed Collections Table / Cards */}
          <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/40">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <CheckCheck className="w-5 h-5 text-emerald-500" />
                  <span>Completed Collections Archive / சேமிக்கப்பட்ட வசூல் விவரங்கள்</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Showing {filteredCompletedList.length} verified collections saved today
                </p>
              </div>

              <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-200 tabular-nums whitespace-nowrap">
                Total: {formatCurrency(
                  filteredCompletedList.reduce((acc, p) => acc + (p.amount || 0), 0)
                )}
              </span>
            </div>

            {filteredCompletedList.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 glass rounded-2xl space-y-1">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-200">No matching completed collections</p>
                <p className="text-[11px]">When collections are marked paid, they automatically appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredCompletedList.map((p) => {
                  const scheme = (p.loanId?.financeType || 'daily').toLowerCase();
                  const parsed = parseCustomerName(p.customerId?.name);
                  return (
                    <div
                      key={p._id}
                      className="p-4 rounded-2xl glass glass-hover border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                            {parsed.primary}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase border shrink-0 ${
                              scheme === 'daily'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : scheme === 'weekly'
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : 'bg-teal-100 text-teal-900 border-teal-300'
                            }`}
                          >
                            {scheme}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                              p.mode === 'cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {p.mode?.toUpperCase()}
                          </span>
                        </div>
                        {parsed.secondary && (
                          <p className="text-xs text-slate-400 truncate">{parsed.secondary}</p>
                        )}

                        <div className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-2">
                          <span className="font-bold text-emerald-600">{p.receiptNo}</span>
                          <span>•</span>
                          <span>{p.loanId?.loanNo}</span>
                          <span>•</span>
                          <span>{p.customerId?.phone}</span>
                          {p.customerId?.area && (
                            <>
                              <span>•</span>
                              <span>{p.customerId.area}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatDate(p.date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 shrink-0">
                        <div className="text-left sm:text-right shrink-0">
                          <p className="font-black tabular-nums text-base sm:text-lg text-emerald-600 whitespace-nowrap">
                            {formatCurrency(p.amount)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Collected by {p.collectedBy?.name || 'Owner'}
                          </p>
                        </div>

                        <button
                          onClick={() => setReceiptPayment(p)}
                          className="btn-sky-primary min-h-[44px] py-2 px-3 text-xs font-black shadow-md flex items-center space-x-1.5 shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dedicated View 2: Settled Loans (100% Repaid Accounts) */}
      {dashboardView === 'settled' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top KPI Cards for Settled Accounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-3xl p-5 border border-teal-200/80 dark:border-teal-900/60 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-teal-600 font-bold uppercase tracking-wider">
                  {lang === 'ta' ? 'முடிவுற்ற கடன் தொகை' : 'Total Settled Amount'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-teal-600 mt-2 tabular-nums whitespace-nowrap">
                {formatCurrency(cards.settledAmount || completedLoansList.reduce((acc, l) => acc + (l.totalCollected || l.totalPayable || 0), 0))}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === 'ta' ? 'முடிவுற்ற கணக்குகளில் வசூலான மொத்த தொகை' : 'Total recovered across 100% settled accounts'}
              </p>
            </div>

            <div className="glass rounded-3xl p-5 border border-emerald-200/80 dark:border-emerald-900/60 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">
                  {lang === 'ta' ? 'முடிந்த கடன் நிகர லாபம்' : 'Profit from Settled'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tabular-nums whitespace-nowrap">
                +{formatCurrency(cards.profitFromSettled || completedLoansList.reduce((acc, l) => acc + Math.max(0, (l.totalCollected || l.totalPayable || 0) - (l.principal || 0)), 0))}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === 'ta' ? 'நடப்பு வட்டியிலிருந்து மாற்றப்பட்டு பெற்ற லாபம்' : 'Realized profit transferred from active interest'}
              </p>
            </div>

            <div className="glass rounded-3xl p-5 border border-sky-200/80 dark:border-sky-900/60 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-sky-600 font-bold uppercase tracking-wider">
                  {lang === 'ta' ? 'முடிவுற்ற கணக்குகள்' : 'Settled Accounts'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600">
                  <CheckCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 tabular-nums whitespace-nowrap">
                {completedLoansList.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === 'ta' ? 'முழுமையாக முடிந்த கடன் கணக்குகள்' : 'Loans closed with zero pending balance'}
              </p>
            </div>
          </div>

          {/* Settled Loans List */}
          <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/40">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Fully Settled Accounts / முடிவுற்ற கடன் கணக்குகள்</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ta'
                    ? 'முழுமையாக தவணைகள் செலுத்தப்பட்டு முடிக்கப்பட்ட கடன் கணக்குகள் (வட்டி லாபமாக வரவு வைக்கப்பட்டது)'
                    : 'Borrowers who have completely paid scheduled principal and interest (Profit realized)'}
                </p>
              </div>
              <span className="text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-xl border border-amber-300">
                {completedLoansList.length} Settled
              </span>
            </div>

            {completedLoansList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-200">No settled loans yet</p>
                <p className="text-[11px]">When a loan balance reaches ₹0, it automatically archives here with profit separated.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedLoansList.map((loan) => {
                  const pr = Number(loan.principal || loan.principalAmount || 0);
                  const collected = Number(loan.totalCollected || loan.totalPayable || loan.totalPaid || 0);
                  const profit = Math.max(0, collected - pr);
                  const parsed = parseCustomerName(loan.customerId?.name || loan.customerName);

                  return (
                    <div
                      key={loan._id}
                      onClick={() => onViewLoan && onViewLoan(loan._id)}
                      className="p-4 rounded-2xl glass glass-hover border border-sky-200/60 dark:border-sky-800/40 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            {parsed.primary}
                          </span>
                          <span className="px-2 py-0.5 rounded-full font-black text-[10px] uppercase bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300">
                            {loan.financeType}
                          </span>
                          <span className="px-2 py-0.5 rounded-full font-black text-[10px] uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center space-x-1">
                            <span>+{formatCurrency(profit)} {lang === 'ta' ? 'லாபம்' : 'Profit'}</span>
                          </span>
                        </div>
                        {parsed.secondary && (
                          <p className="text-[11px] text-slate-400">{parsed.secondary}</p>
                        )}
                        <p className="text-xs text-slate-500 font-mono">
                          {loan.loanNo} • {loan.customerId?.phone || loan.customerPhone} • {loan.customerId?.area || loan.area}
                        </p>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <p className="font-black tabular-nums text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          Principal: {formatCurrency(pr)} • Settled: {formatCurrency(collected)}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-bold flex items-center sm:justify-end space-x-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-500" />
                          <span>Settled on {formatDate(loan.settledDate || loan.updatedAt || loan.endDate)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Dashboard Overview View */}
      {dashboardView === 'overview' && (
        <>
          {isMobile ? (
            /* ========================================================
               MOBILE DASHBOARD (Top to Bottom: Section F, E, A)
            ======================================================== */
            <div className="space-y-4">
              {/* 1. Greeting + Date */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                    {lang === 'ta' ? 'வணக்கம்' : 'Welcome back'}, {user?.name?.split(' ')[0] || 'Sir'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {new Date().toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {user?.role === 'owner' ? 'Owner' : 'Agent'}
                </span>
              </div>

              {/* 2. Horizontal Swipe Carousel of Key Metric Cards (Snap scrolling) */}
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-none -mx-3 px-3">
                {/* Net Overall Collected (After Expenses) with Tap for Breakdown */}
                <div
                  onClick={() => setShowBreakdownModal(true)}
                  className="w-[84%] shrink-0 snap-center glass rounded-3xl p-4 border border-emerald-300/80 dark:border-emerald-800/60 shadow-lg bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-sky-500/10 cursor-pointer active:scale-98 transition relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      {lang === 'ta' ? 'நிகர வசூல் இருப்பு' : 'Net Collections in Hand'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums mt-1 whitespace-nowrap">
                    {formatCurrency(cards.netCollected !== undefined ? cards.netCollected : Math.max(0, (cards.totalCollected || 0) - (cards.totalExpenses || 0)))}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1">
                      <span>Click for breakdown</span>
                      <ArrowRight className="w-3 h-3 text-emerald-500" />
                    </span>
                    {cards.totalExpenses > 0 && (
                      <span className="text-rose-500 font-bold">
                        (-{formatCurrency(cards.totalExpenses)} exp)
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Total Lent */}
                <div className="w-[82%] shrink-0 snap-center glass rounded-3xl p-4 border border-white/80 dark:border-sky-800/40 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {lang === 'ta' ? 'வழங்கிய கடன்' : 'Total Lent'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600">
                      <Banknote className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1 whitespace-nowrap">
                    {formatCurrency(cards.totalLent || 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {cards.totalLoans || 0} loans issued
                  </p>
                </div>

                {/* 2. Total Collected */}
                <div className="w-[82%] shrink-0 snap-center glass rounded-3xl p-4 border border-emerald-200/80 dark:border-emerald-900/60 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">
                      {lang === 'ta' ? 'மொத்த வசூல்' : 'Total Collected'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-emerald-600 tabular-nums mt-1 whitespace-nowrap">
                    {formatCurrency(cards.totalCollected || 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Repaid across accounts
                  </p>
                </div>

                {/* 3. Outstanding Balance */}
                <div className="w-[82%] shrink-0 snap-center glass rounded-3xl p-4 border border-amber-200/80 dark:border-amber-900/60 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">
                      {lang === 'ta' ? 'மீதி இருப்பு' : 'Outstanding'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-amber-600 tabular-nums mt-1 whitespace-nowrap">
                    {formatCurrency(cards.totalOutstanding || 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {cards.activeLoans || 0} active loans pending
                  </p>
                </div>

                {/* 4. Active Interest (Auto-reduces as loans settle) */}
                <div className="w-[82%] shrink-0 snap-center glass rounded-3xl p-4 border border-indigo-200/80 dark:border-indigo-900/60 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                      {lang === 'ta' ? 'நடப்பு வட்டி (Interest)' : 'Active Interest'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-indigo-600 tabular-nums mt-1 whitespace-nowrap">
                    {formatCurrency(cards.activeInterest || 0)}
                  </p>
                  <p className="text-[10px] text-indigo-500/80 dark:text-indigo-400 mt-0.5">
                    {lang === 'ta' ? 'முடிவுற்றதும் குறையும்' : 'Auto-reduces as loans settle'}
                  </p>
                </div>

                {/* 5. Total Settled Amount (Overall recovered from completed loans) */}
                <div className="w-[82%] shrink-0 snap-center glass rounded-3xl p-4 border border-cyan-200/80 dark:border-cyan-900/60 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wide">
                      {lang === 'ta' ? 'முடிவுற்ற கடன் தொகை' : 'Settled Amount'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-cyan-600 tabular-nums mt-1 whitespace-nowrap">
                    {formatCurrency(cards.settledAmount || 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {cards.completedLoans || 0} completed loans overall
                  </p>
                </div>

                {/* 6. Profit from Settled (Pure realized profit) */}
                <div className="w-[82%] shrink-0 snap-center glass rounded-3xl p-4 border border-emerald-300/80 dark:border-emerald-800/60 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">
                      {lang === 'ta' ? 'முடிந்த கடன் லாபம்' : 'Profit from Settled'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-emerald-600 tabular-nums mt-1 whitespace-nowrap">
                    +{formatCurrency(cards.profitFromSettled ?? cards.profitEarned ?? 0)}
                  </p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">
                    {lang === 'ta' ? 'முடிந்த கணக்குகளின் நிகர லாபம்' : 'Realized profit from settled'}
                  </p>
                </div>
              </div>

              {/* 3. Three Finance-Type Chips (Daily / Weekly / Monthly) */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none -mx-3 px-3">
                {[
                  { id: 'daily', label: lang === 'ta' ? 'தினசரி தண்டல்' : 'Daily Thandal', icon: Zap, color: 'text-amber-500 bg-amber-500/10 border-amber-300' },
                  { id: 'weekly', label: lang === 'ta' ? 'வாரத்தவணை' : 'Weekly Finance', icon: CalendarDays, color: 'text-sky-500 bg-sky-500/10 border-sky-300' },
                  { id: 'monthly', label: lang === 'ta' ? 'மாதத்தவணை' : 'Monthly Finance', icon: CalendarRange, color: 'text-teal-500 bg-teal-500/10 border-teal-300' },
                ].map((chip) => {
                  const data = financeTypes[chip.id] || {};
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => onSelectFinanceType && onSelectFinanceType(chip.id)}
                      className="shrink-0 flex items-center space-x-2 px-3 py-2 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60 active:scale-95 transition"
                    >
                      <div className={`p-1.5 rounded-xl ${chip.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                          {chip.label}
                        </p>
                        <p className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
                          {data.activeLoans || 0} loans • {formatCurrency(data.lent || 0)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 4. Today's Collection Card with Progress Bar (Total on own line - Bug A.4 fix) */}
              {(() => {
                const collectedTodayAmt = stats?.todayStats?.collectedToday || 0;
                const totalPendingDueAmt = todayDueList.reduce((acc, item) => acc + (item.dueAmount || 0), 0);
                const totalExpectedAmt = collectedTodayAmt + totalPendingDueAmt;
                const progressPct = totalExpectedAmt > 0 ? Math.min(100, Math.round((collectedTodayAmt / totalExpectedAmt) * 100)) : 0;

                return (
                  <div className="glass rounded-3xl p-4 border border-white/80 dark:border-sky-800/40 shadow-lg space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <Receipt className="w-4 h-4 text-sky-500" />
                          <span>{lang === 'ta' ? 'இன்றைய வசூல் நிலவரம்' : "Today's Collection"}</span>
                        </h3>
                        <span className="text-xs font-black text-sky-600 dark:text-sky-400 tabular-nums">
                          {progressPct}% Done
                        </span>
                      </div>
                      {/* Put the total on its own line under the title */}
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="tabular-nums font-bold text-emerald-600 whitespace-nowrap">
                          Collected: {formatCurrency(collectedTodayAmt)}
                        </span>
                        <span className="tabular-nums text-slate-500 whitespace-nowrap">
                          Expected: {formatCurrency(totalExpectedAmt)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-sky-950/60 rounded-full h-2.5 overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* 5. Tabs Under It: [Due Today] [Collected] [Overdue] (ONE list at a time) */}
              <div className="space-y-3">
                <div className="flex items-center p-1 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60">
                  <button
                    onClick={() => {
                      setMobileTab('due');
                      setMobileVisibleCount(5);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                      mobileTab === 'due'
                        ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Due ({filteredTodayList.length})
                  </button>
                  <button
                    onClick={() => {
                      setMobileTab('collected');
                      setMobileVisibleCount(5);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                      mobileTab === 'collected'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Collected ({completedTodayList.length})
                  </button>
                  <button
                    onClick={() => {
                      setMobileTab('overdue');
                      setMobileVisibleCount(5);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                      mobileTab === 'overdue'
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Overdue ({overdueLoans.length})
                  </button>
                </div>

                {/* Render ONE List at a Time (Section E Card format) */}
                <div className="space-y-2.5">
                  {mobileTab === 'due' && (
                    filteredTodayList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl">
                        <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                        <p className="font-bold text-slate-800 dark:text-slate-200">All Collections Completed!</p>
                        <p className="text-[11px]">No pending dues remaining for today.</p>
                      </div>
                    ) : (
                      <>
                        {filteredTodayList.slice(0, mobileVisibleCount).map((item) => {
                          const parsed = parseCustomerName(item.customerName);
                          return (
                            <div
                              key={`${item.loanId}-${item.dueDate}`}
                              className={`glass rounded-2xl p-3.5 border border-white/80 dark:border-sky-800/40 shadow-sm min-h-[64px] space-y-2 ${
                                item.isOverdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-sky-500'
                              }`}
                            >
                              {/* Line 1: Customer Name left, Amount right (bold, never truncated) */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {parsed.primary}
                                  </p>
                                  {parsed.secondary && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {parsed.secondary}
                                    </p>
                                  )}
                                </div>
                                <div className="flex-shrink-0 text-right whitespace-nowrap font-black tabular-nums text-base text-slate-900 dark:text-white">
                                  {formatCurrency(item.dueAmount)}
                                </div>
                              </div>

                              {/* Line 2: Loan # • Inst # • Area left, Status badge right */}
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate min-w-0 flex-1">
                                  {item.loanNo} • #{item.installmentNo} • {item.customerArea || item.customerPhone}
                                </p>
                                <span
                                  className={`flex-shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    item.isOverdue
                                      ? 'bg-red-100 text-red-800 border border-red-300'
                                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                                  }`}
                                >
                                  {item.isOverdue ? `OVERDUE (${getOverdueDays(item.dueDate)}d)` : 'DUE TODAY'}
                                </span>
                              </div>

                              {/* Line 3: Actions (Pay & WhatsApp) */}
                              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-sky-100 dark:border-sky-900/40">
                                <button
                                  onClick={() => setWhatsappItem(item)}
                                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 active:scale-95 transition"
                                  title="WhatsApp Reminder"
                                >
                                  <Send className="w-4 h-4 text-emerald-500" />
                                </button>
                                <button
                                  onClick={() => setSelectedPayItem(item)}
                                  className="btn-sky-primary min-h-[44px] px-4 py-2 text-xs font-black shadow-sm flex items-center space-x-1.5 active:scale-95"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>{t('markPaid')}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {filteredTodayList.length > mobileVisibleCount && (
                          <button
                            onClick={() => setMobileVisibleCount((prev) => prev + 5)}
                            className="w-full py-2.5 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-black text-sky-600 dark:text-sky-400 active:scale-95 transition"
                          >
                            Show More (+5) / மேலும் காட்டுக
                          </button>
                        )}
                      </>
                    )
                  )}

                  {mobileTab === 'collected' && (
                    filteredCompletedList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl">
                        No completed collections recorded yet today.
                      </div>
                    ) : (
                      <>
                        {filteredCompletedList.slice(0, mobileVisibleCount).map((p) => {
                          const parsed = parseCustomerName(p.customerId?.name);
                          return (
                            <div
                              key={p._id}
                              className="glass rounded-2xl p-3.5 border border-emerald-200/80 dark:border-emerald-900/60 shadow-sm min-h-[64px] border-l-4 border-l-emerald-500 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {parsed.primary}
                                  </p>
                                  {parsed.secondary && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {parsed.secondary}
                                    </p>
                                  )}
                                </div>
                                <div className="flex-shrink-0 text-right whitespace-nowrap font-black tabular-nums text-base text-emerald-600">
                                  {formatCurrency(p.amount)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-slate-500 font-mono truncate min-w-0 flex-1">
                                  {p.receiptNo} • {p.loanId?.loanNo} • {p.mode?.toUpperCase()}
                                </p>
                                <span className="flex-shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  PAID
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-sky-100 dark:border-sky-900/40 text-[11px] text-slate-400">
                                <span>Collected by {p.collectedBy?.name || 'Owner'}</span>
                                <button
                                  onClick={() => setReceiptPayment(p)}
                                  className="text-xs font-bold text-sky-600 hover:underline min-h-[36px] flex items-center"
                                >
                                  View Receipt
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {filteredCompletedList.length > mobileVisibleCount && (
                          <button
                            onClick={() => setMobileVisibleCount((prev) => prev + 5)}
                            className="w-full py-2.5 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-black text-emerald-600 active:scale-95 transition"
                          >
                            Show More (+5) / மேலும் காட்டுக
                          </button>
                        )}
                      </>
                    )
                  )}

                  {mobileTab === 'overdue' && (
                    overdueLoans.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl">
                        No overdue accounts currently.
                      </div>
                    ) : (
                      <>
                        {overdueLoans.slice(0, mobileVisibleCount).map((l) => {
                          const parsed = parseCustomerName(l.customerId?.name);
                          return (
                            <div
                              key={l._id}
                              className="glass rounded-2xl p-3.5 border border-red-200/80 dark:border-red-900/60 shadow-sm min-h-[64px] border-l-4 border-l-red-500 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {parsed.primary}
                                  </p>
                                  {parsed.secondary && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {parsed.secondary}
                                    </p>
                                  )}
                                </div>
                                <div className="flex-shrink-0 text-right whitespace-nowrap font-black tabular-nums text-base text-red-600">
                                  {formatCurrency(l.remainingBalance)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-slate-500 font-mono truncate min-w-0 flex-1">
                                  {l.loanNo} • {l.financeType} scheme • {l.customerId?.phone}
                                </p>
                                <span className="flex-shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-300">
                                  OVERDUE
                                </span>
                              </div>

                              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-red-100 dark:border-red-900/40">
                                <button
                                  onClick={() =>
                                    setWhatsappItem({
                                      customerName: l.customerId?.name,
                                      customerPhone: l.customerId?.phone,
                                      dueAmount: l.installmentAmount,
                                      loanNo: l.loanNo,
                                      dueDate: new Date(),
                                    })
                                  }
                                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass hover:bg-emerald-50 text-slate-500 hover:text-emerald-600"
                                >
                                  <Send className="w-4 h-4 text-emerald-500" />
                                </button>
                                <button
                                  onClick={() => onViewLoan && onViewLoan(l._id)}
                                  className="btn-sky-primary min-h-[44px] px-4 py-2 text-xs font-black shadow-sm"
                                >
                                  View Loan
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {overdueLoans.length > mobileVisibleCount && (
                          <button
                            onClick={() => setMobileVisibleCount((prev) => prev + 5)}
                            className="w-full py-2.5 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-black text-red-600 active:scale-95 transition"
                          >
                            Show More (+5) / மேலும் காட்டுக
                          </button>
                        )}
                      </>
                    )
                  )}
                </div>
              </div>

              {/* 6. Charts in Collapsible Sections (Simplified sparkline / donut) */}
              <div className="space-y-3 pt-2">
                <div className="glass rounded-3xl p-4 border border-white/70 dark:border-sky-800/40 shadow-sm">
                  <button
                    onClick={() => setShowTrendChart(!showTrendChart)}
                    className="w-full flex items-center justify-between text-left font-black text-xs text-slate-900 dark:text-white"
                  >
                    <span className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-sky-500" />
                      <span>{t('collectionTrend30Days')}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showTrendChart ? 'rotate-180' : ''}`} />
                  </button>
                  {showTrendChart && (
                    <div className="h-44 w-full mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={collectionTrend}>
                          <defs>
                            <linearGradient id="colorTrendMob" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="displayDate" tick={{ fontSize: 9 }} />
                          <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 9 }} />
                          <Tooltip formatter={(val) => [formatCurrency(val), 'Collected']} />
                          <Area type="monotone" dataKey="amount" stroke="#0EA5E9" strokeWidth={2.5} fill="url(#colorTrendMob)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="glass rounded-3xl p-4 border border-white/70 dark:border-sky-800/40 shadow-sm">
                  <button
                    onClick={() => setShowSplitChart(!showSplitChart)}
                    className="w-full flex items-center justify-between text-left font-black text-xs text-slate-900 dark:text-white"
                  >
                    <span className="flex items-center space-x-2">
                      <PieChartIcon className="w-4 h-4 text-sky-500" />
                      <span>{t('financeTypeDistribution')}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSplitChart ? 'rotate-180' : ''}`} />
                  </button>
                  {showSplitChart && (
                    <div className="h-44 w-full mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={financeTypeSplit} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                            {financeTypeSplit.map((entry, index) => (
                              <Cell key={`cell-mob-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val) => [formatCurrency(val), 'Lent']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               DESKTOP & TABLET DASHBOARD (Rich Multi-pane Layout)
            ======================================================== */
            <div className="space-y-6">
              {/* Quick Action Bar (Add Payment for Admin & Agent, New Loan & Investment for Owner) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  onClick={() => {
                    if (onOpenPayment) {
                      onOpenPayment();
                    } else {
                      setSelectedPayItem({});
                    }
                  }}
                  className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-600 text-white cursor-pointer shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-[1.01] active:scale-98 transition flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                      <PlusCircle className="w-6 h-6 text-white stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm">
                        {lang === 'ta' ? '+ வசூல் பதிவு (Add Payment)' : '+ Record Collection'}
                      </h4>
                      <p className="text-[11px] text-emerald-100 font-medium">
                        {lang === 'ta' ? 'அனைத்து கடன் கணக்குகளுக்கும் வசூல் சேர்' : 'One-tap installment entry for any active loan'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-white/25 px-2 py-0.5 rounded-lg font-bold">
                    P
                  </span>
                </div>

                {isOwner ? (
                  <div
                    onClick={onOpenNewLoan}
                    className="p-4 rounded-3xl glass glass-hover border border-sky-300 dark:border-sky-800 text-slate-900 dark:text-white cursor-pointer shadow-md hover:scale-[1.01] active:scale-98 transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-2xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300">
                        <Banknote className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm">
                          {lang === 'ta' ? '+ புதிய கடன் (New Loan)' : '+ Issue New Loan'}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {lang === 'ta' ? 'தினசரி, வாரம் அல்லது மாதத்தவணை' : 'Daily, weekly, or monthly scheme'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-lg font-bold">
                      N
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-3xl glass border border-sky-200/80 dark:border-sky-800 text-slate-900 dark:text-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-2xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300">
                        <CheckCircle2 className="w-6 h-6 text-sky-500" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm">
                          {lang === 'ta' ? 'முகவர் பணி முறை (Agent Mode)' : 'Collection Agent Panel'}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {todayDueList.length} {lang === 'ta' ? 'தவணைகள் இன்று வசூலிக்க வேண்டும்' : 'collections due today'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isOwner && (
                  <div
                    onClick={onOpenInvestment}
                    className="p-4 rounded-3xl glass glass-hover border border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-white cursor-pointer shadow-md hover:scale-[1.01] active:scale-98 transition flex items-center justify-between sm:col-span-2 lg:col-span-1"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/20">
                        <TrendingUp className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm">
                          {lang === 'ta' ? 'முதலீடு & மூலதனம் (Investments)' : 'Capital & Investments'}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {lang === 'ta' ? 'சொந்த முதலீடு மற்றும் கூட்டாளி பங்கு' : 'Promoter equity & partner credit'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg font-bold">
                      I
                    </span>
                  </div>
                )}
              </div>

              {/* 1. Key Metric Cards (Including Net Overall Collected) */}
              <div
                className={`grid ${
                  isTablet ? 'grid-cols-2 gap-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                }`}
              >
                <StatCard
                  title={t('netCollected')}
                  amount={cards.netCollected !== undefined ? cards.netCollected : Math.max(0, (cards.totalCollected || 0) - (cards.totalExpenses || 0))}
                  subtitle={
                    cards.totalExpenses > 0
                      ? `Click for breakdown • -${formatCurrency(cards.totalExpenses)} exp`
                      : 'Click for daily & scheme breakdown'
                  }
                  icon={Wallet}
                  gradient="from-emerald-400 to-teal-600"
                  delay={0}
                  onClick={() => setShowBreakdownModal(true)}
                />
                <StatCard
                  title={t('totalLent')}
                  amount={cards.totalLent}
                  subtitle={`${cards.totalLoans || 0} loans issued`}
                  icon={Banknote}
                  gradient="from-sky-400 to-sky-600"
                  delay={0.05}
                />
                <StatCard
                  title={t('totalCollected')}
                  amount={cards.totalCollected}
                  subtitle="Gross repaid across accounts"
                  icon={CheckCircle2}
                  gradient="from-emerald-400 to-teal-500"
                  delay={0.1}
                />
                <StatCard
                  title={t('totalOutstanding')}
                  amount={cards.totalOutstanding}
                  subtitle={`${cards.activeLoans || 0} active loans pending`}
                  icon={Clock}
                  gradient="from-amber-400 to-amber-500"
                  delay={0.15}
                />
                <StatCard
                  title={t('activeInterest')}
                  amount={cards.activeInterest}
                  subtitle={lang === 'ta' ? 'முடிவுற்றதும் குறையும்' : 'Auto-reduces as loans settle'}
                  icon={Coins}
                  gradient="from-indigo-400 to-indigo-600"
                  delay={0.2}
                />
                <StatCard
                  title={t('settledAmount')}
                  amount={cards.settledAmount}
                  subtitle={`${cards.completedLoans || 0} completed loans`}
                  icon={ShieldCheck}
                  gradient="from-teal-400 to-cyan-600"
                  delay={0.25}
                  onClick={() => setDashboardView('settled')}
                />
                <StatCard
                  title={t('profitFromSettled')}
                  amount={cards.profitFromSettled ?? cards.profitEarned}
                  subtitle={lang === 'ta' ? 'முடிந்த கணக்குகளின் நிகர லாபம்' : 'Realized profit from settled'}
                  icon={Award}
                  gradient="from-emerald-500 to-green-600"
                  delay={0.3}
                  onClick={() => setDashboardView('settled')}
                />
              </div>

              {/* 2. Three Finance-Type Cards (Daily / Weekly / Monthly) */}
              <div
                className={`grid ${
                  isTablet ? 'grid-cols-2 gap-4' : 'grid-cols-3 gap-4'
                }`}
              >
                <FinanceTypeCard
                  type="daily"
                  title={lang === 'ta' ? 'தினசரி தண்டல்' : 'Daily Finance'}
                  subTitle="Daily collection thandal"
                  activeLoans={financeTypes.daily?.activeLoans}
                  lent={financeTypes.daily?.lent}
                  collected={financeTypes.daily?.collected}
                  pending={financeTypes.daily?.pending}
                  onClick={() => onSelectFinanceType && onSelectFinanceType('daily')}
                />

                <FinanceTypeCard
                  type="weekly"
                  title={lang === 'ta' ? 'வாரத்தவணை நிதி' : 'Weekly Finance'}
                  subTitle="7-day cycle repayment"
                  activeLoans={financeTypes.weekly?.activeLoans}
                  lent={financeTypes.weekly?.lent}
                  collected={financeTypes.weekly?.collected}
                  pending={financeTypes.weekly?.pending}
                  onClick={() => onSelectFinanceType && onSelectFinanceType('weekly')}
                />

                <FinanceTypeCard
                  type="monthly"
                  title={lang === 'ta' ? 'மாதத்தவணை நிதி' : 'Monthly Finance'}
                  subTitle="Monthly calendar return"
                  activeLoans={financeTypes.monthly?.activeLoans}
                  lent={financeTypes.monthly?.lent}
                  collected={financeTypes.monthly?.collected}
                  pending={financeTypes.monthly?.pending}
                  onClick={() => onSelectFinanceType && onSelectFinanceType('monthly')}
                />
              </div>

              {/* 3. Laptop Split Layout: 7 Cols Left (Charts) vs 5 Cols Right (Collection Panel) */}
              {isLaptop ? (
                <div className="grid grid-cols-12 gap-6 items-start">
                  <div className="col-span-7 space-y-6">
                    {/* Collection Trend (30 Days) */}
                    <div className="glass rounded-3xl p-5 border border-white/70 dark:border-sky-800/40 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            {t('collectionTrend30Days')}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Daily repayment cashflow history
                          </p>
                        </div>
                        <span className="text-xs font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-xl border border-sky-200">
                          30 Days
                        </span>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={collectionTrend}>
                            <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} />
                            <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(val) => [formatCurrency(val), 'Collected']} />
                            <Area
                              type="monotone"
                              dataKey="amount"
                              stroke="#0EA5E9"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorTotal)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Donut Chart: Scheme Distribution */}
                      <div className="glass rounded-3xl p-5 border border-white/70 dark:border-sky-800/40 shadow-lg">
                        <h3 className="font-black text-sm text-slate-900 dark:text-white mb-1">
                          {t('financeTypeDistribution')}
                        </h3>
                        <p className="text-[11px] text-slate-500 mb-2">Loan book by scheme</p>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={financeTypeSplit}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {financeTypeSplit.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val) => [formatCurrency(val), 'Lent']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Bar Chart: 6-Month Profit Recovery */}
                      <div className="glass rounded-3xl p-5 border border-white/70 dark:border-sky-800/40 shadow-lg">
                        <h3 className="font-black text-sm text-slate-900 dark:text-white mb-1">
                          Monthly Financials (6M)
                        </h3>
                        <p className="text-[11px] text-slate-500 mb-2">Collections vs net profit</p>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyChartData}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                              <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 9 }} />
                              <Tooltip
                                formatter={(val, name) => [
                                  formatCurrency(val),
                                  name === 'collected' ? 'Collections' : 'Net Profit',
                                ]}
                              />
                              <Bar dataKey="collected" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="profit" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Today's Collection Panel (5 cols) */}
                  <div className="col-span-5 sticky top-20">
                    {renderTodayCollectionList()}
                  </div>
                </div>
              ) : (
                /* Tablet Layout: Stacked Today's Collection + Charts */
                <div className="space-y-6">
                  {renderTodayCollectionList()}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass rounded-3xl p-5 border border-white/70 dark:border-sky-800/40 shadow-lg">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white mb-2">
                        {t('collectionTrend30Days')}
                      </h3>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={collectionTrend}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="displayDate" tick={{ fontSize: 9 }} />
                            <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 9 }} />
                            <Tooltip formatter={(val) => [formatCurrency(val), 'Collected']} />
                            <Area type="monotone" dataKey="amount" stroke="#0EA5E9" strokeWidth={2.5} fill="#0EA5E9" fillOpacity={0.2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass rounded-3xl p-5 border border-white/70 dark:border-sky-800/40 shadow-lg">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white mb-2">
                        {t('financeTypeDistribution')}
                      </h3>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={financeTypeSplit} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                              {financeTypeSplit.map((entry, index) => (
                                <Cell key={`cell-t-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val) => [formatCurrency(val), 'Lent']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Payment Recording Modal */}
      {selectedPayItem && (
        <PaymentModal
          loanItem={selectedPayItem}
          onClose={() => setSelectedPayItem(null)}
          onSuccess={(recordedPayment) => {
            const paidLoanId = recordedPayment?.loanId?._id || recordedPayment?.loanId;
            setStats((prev) => {
              if (!prev) return prev;
              const updatedDueList = (prev.todayDueList || []).filter(
                (item) => String(item.loanId) !== String(paidLoanId)
              );
              const alreadyInList = (prev.completedTodayList || []).some(
                (p) => String(p._id) === String(recordedPayment?._id)
              );
              const updatedCompletedList = alreadyInList
                ? prev.completedTodayList
                : [recordedPayment, ...(prev.completedTodayList || [])];

              const additionalAmount = Number(recordedPayment?.amount) || 0;
              return {
                ...prev,
                todayDueList: updatedDueList,
                completedTodayList: updatedCompletedList,
                todayStats: {
                  ...prev.todayStats,
                  collectedToday: (prev.todayStats?.collectedToday || 0) + additionalAmount,
                  todayPaymentsCount: (prev.todayStats?.todayPaymentsCount || 0) + 1,
                  dueCount: Math.max(0, (prev.todayStats?.dueCount || 1) - 1),
                },
                cards: {
                  ...prev.cards,
                  totalCollected: (prev.cards?.totalCollected || 0) + additionalAmount,
                  totalOutstanding: Math.max(0, (prev.cards?.totalOutstanding || 0) - additionalAmount),
                },
              };
            });
            loadData();
            setReceiptPayment(recordedPayment);
          }}
        />
      )}

      {/* Official Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {/* WhatsApp Pre-filled Reminder Modal */}
      {whatsappItem && (
        <WhatsAppReminderModal
          item={whatsappItem}
          onClose={() => setWhatsappItem(null)}
        />
      )}

      {/* Overall Collection Breakdown Modal (Daily & Scheme Details) */}
      <CollectionBreakdownModal
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        cards={cards}
        financeTypes={financeTypes}
        dailyCollectionBreakdown={stats?.dailyCollectionBreakdown || []}
        onOpenExpenses={onOpenExpenses}
      />
    </div>
  );
};

export default Dashboard;
