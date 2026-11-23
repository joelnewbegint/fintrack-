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
  ReferenceLine,
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
  Users,
  Check,
  Printer,
  PieChart as PieChartIcon,
  Coins,
  ShieldCheck,
  Wallet,
  Landmark,
  Briefcase,
  Sparkles,
  BarChart2,
} from 'lucide-react';

export const Dashboard = ({
  onSelectFinanceType,
  onViewLoan,
  onOpenPayment,
  onOpenNewLoan,
  onOpenInvestment,
  onOpenExpenses,
  onOpenNewCustomer,
  onNavigateTab,
}) => {
  const { t, lang } = useLanguage();
  const { user, isOwner, isClient } = useAuth();
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
  const [agentList, setAgentList] = useState([]);

  // Trend Chart State (7D, 14D, 30D & Area vs Bar)
  const [trendDays, setTrendDays] = useState(30);
  const [trendChartType, setTrendChartType] = useState('area');

  // Real-time Live Clock for Hero Banner
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentDateTime.getHours();
    if (hour < 12) return lang === 'ta' ? 'காலை வணக்கம்' : 'Good morning';
    if (hour < 17) return lang === 'ta' ? 'மதிய வணக்கம்' : 'Good afternoon';
    return lang === 'ta' ? 'மாலை வணக்கம்' : 'Good evening';
  };

  const hoursRaw = currentDateTime.getHours();
  const hours12 = (hoursRaw % 12 || 12).toString().padStart(2, '0');
  const minutes = currentDateTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentDateTime.getSeconds().toString().padStart(2, '0');
  const ampm = hoursRaw >= 12 ? 'PM' : 'AM';

  const formattedDate = currentDateTime.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const displayName = user?.name || 'Vasantha Kumar K';
  const roleLabel = user?.role === 'owner' ? (lang === 'ta' ? 'உரிமையாளர்' : 'Owner') : (user?.role || 'Staff');

  useEffect(() => {
    if (isOwner) {
      api.getAgents().then((res) => {
        if (Array.isArray(res)) setAgentList(res);
      }).catch(() => {});
    }
  }, [isOwner]);

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground && !stats) {
        setLoading(true);
      }
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
    loadData(false);
    const handleSyncUpdate = () => {
      // Background silent refresh without triggering skeleton loader
      loadData(true);
    };
    window.addEventListener('fintrack:data-updated', handleSyncUpdate);
    return () => window.removeEventListener('fintrack:data-updated', handleSyncUpdate);
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
  const todayDueTotal = todayDueList.reduce((acc, item) => acc + (Number(item.dueAmount) || 0), 0);
  const overdueTotal = overdueLoans.reduce((acc, item) => acc + (Number(item.remainingBalance || item.dueAmount) || 0), 0);
  const totalDueAndOverdue = todayDueTotal + overdueTotal;

  const collectionTrend = stats?.collectionTrend || [];
  const financeTypeSplit = (stats?.financeTypeSplit || []).map((item) => {
    let c = '#0878D1'; // primary blue
    if (item.key === 'daily') c = '#55B8F5'; // sky blue
    if (item.key === 'monthly') c = '#18A879'; // success emerald
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

  // Sum of Active Interest + Realized Profit from settled loans
  const activeInterestVal = Number(cards.activeInterest || 0);
  const settledProfitVal = Number(cards.profitFromSettled ?? cards.profitEarned ?? 0);
  const sumInterestAndProfit = activeInterestVal + settledProfitVal;

  // Calculate accurate realized profit for a settled/completed loan
  // Supports upfront deduction loans (chargeAmount / disbursedAmount difference), addon loans, and percentage
  const getSettledLoanProfit = (loan) => {
    if (!loan) return 0;
    if (Number(loan.profit) > 0) return Number(loan.profit);
    if (Number(loan.chargeAmount) > 0) return Number(loan.chargeAmount);

    const pr = Number(loan.principal || loan.principalAmount || 0);
    const collected = Number(loan.totalCollected || loan.totalPayable || loan.totalPaid || 0);
    const disbursed = Number(loan.disbursedAmount || 0);

    // If upfront deduction loan or disbursed is less than principal
    if (loan.interestType === 'deduction' || (disbursed > 0 && disbursed < pr)) {
      const baseDisbursed = disbursed > 0 ? disbursed : (pr - (Number(loan.chargeAmount) || 0));
      if (baseDisbursed > 0 && collected >= baseDisbursed) {
        return collected - baseDisbursed;
      }
    }

    // Addon loan where collected or payable exceeds principal
    if (collected > pr) {
      return collected - pr;
    }
    const payable = Number(loan.totalPayable || loan.totalRepayable || 0);
    if (payable > pr) {
      return payable - pr;
    }

    // Percentage fallback
    if (Number(loan.interestPercent) > 0 && pr > 0) {
      return Math.round((pr * Number(loan.interestPercent)) / 100);
    }

    return 0;
  };

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

  // Calculate trend metrics for the selected time range
  const activeTrendData = collectionTrend.slice(-trendDays);
  const trendSliceTotal = activeTrendData.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const trendSliceAvg = Math.round(trendSliceTotal / (activeTrendData.length || 1));
  const trendSlicePeak = Math.max(...activeTrendData.map((d) => Number(d.amount) || 0), 0);
  const trendYDomainMax = trendSlicePeak > 0 ? Math.ceil(trendSlicePeak * 1.25) : 5000;

  // Custom rich glass tooltip for collection trend
  const CustomTrendTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div
          className="rounded-2xl p-3 text-xs shadow-xl border border-[#D5E9FA] min-w-[170px]"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="font-extrabold text-[#183653] mb-1 flex items-center justify-between gap-2">
            <span>📅 {d.date || d.displayDate}</span>
            {d.count > 0 && (
              <span className="text-[10px] text-[#0878D1] bg-[#EAF5FF] px-2 py-0.5 rounded-full font-bold border border-[#D5E9FA]">
                {d.count} {d.count === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>
          <div className="text-base font-black text-[#0878D1] tracking-tight">
            ₹{Number(d.amount || 0).toLocaleString('en-IN')}
          </div>
          {(d.cash > 0 || d.upi > 0) && (
            <div className="mt-2 pt-2 border-t border-[#D5E9FA] flex items-center justify-between text-[10px] font-semibold text-[#647C95]">
              <span>Cash: ₹{Number(d.cash || 0).toLocaleString('en-IN')}</span>
              <span>UPI: ₹{Number(d.upi || 0).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Reusable Collection Trend Card with 7D/14D/30D selector & Area/Bar switcher
  const renderCollectionTrendCard = (compact = false) => (
    <div className="bg-white/75 backdrop-blur-[20px] rounded-3xl p-5 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)] min-w-0">
      {/* Header with Title and Interactive Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0878D1] animate-pulse" />
            <h3 className="font-black text-sm text-[#183653]">
              {t('collectionTrend30Days') || 'Collection Trend'}
            </h3>
          </div>
          <p className="text-[11px] text-[#647C95] mt-0.5">
            Daily repayment cashflow history
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* 7D / 14D / 30D Time Range Selector */}
          <div className="inline-flex p-0.5 bg-[#EAF5FF] rounded-xl border border-[#D5E9FA] shadow-xs">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTrendDays(days)}
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                  trendDays === days
                    ? 'bg-[#0878D1] text-white shadow-sm'
                    : 'text-[#647C95] hover:text-[#183653]'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          {/* Area vs Bar View Switcher */}
          <div className="inline-flex p-0.5 bg-[#EAF5FF] rounded-xl border border-[#D5E9FA] shadow-xs">
            <button
              onClick={() => setTrendChartType('area')}
              title="Smooth Wave Area"
              className={`p-1.5 rounded-lg transition-all ${
                trendChartType === 'area'
                  ? 'bg-white text-[#0878D1] shadow-xs'
                  : 'text-[#647C95] hover:text-[#183653]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTrendChartType('bar')}
              title="Daily Cashflow Columns"
              className={`p-1.5 rounded-lg transition-all ${
                trendChartType === 'bar'
                  ? 'bg-white text-[#0878D1] shadow-xs'
                  : 'text-[#647C95] hover:text-[#183653]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Metric Summary Strip */}
      <div className="grid grid-cols-3 gap-2 py-2 px-3 mb-3 bg-[#EAF5FF] rounded-2xl border border-[#D5E9FA]">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#647C95] block tracking-wider">
            {trendDays}D Total
          </span>
          <span className="text-sm sm:text-base font-black text-[#183653]">
            ₹{trendSliceTotal.toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-[#647C95] block tracking-wider">
            Daily Avg
          </span>
          <span className="text-sm sm:text-base font-black text-[#183653]">
            ₹{trendSliceAvg.toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-[#647C95] block tracking-wider">
            Peak Day
          </span>
          <span className="text-sm sm:text-base font-black text-[#0878D1] truncate block">
            {trendSlicePeak > 0 ? `₹${trendSlicePeak.toLocaleString('en-IN')}` : '₹0'}
          </span>
        </div>
      </div>

      {/* Chart View */}
      <div className={`${compact ? 'h-48' : 'h-64'} w-full`}>
        {trendSliceTotal === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center rounded-2xl bg-[#EAF5FF]/60 border border-dashed border-[#D5E9FA]">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF5FF] border border-[#D5E9FA] flex items-center justify-center text-[#0878D1] mb-2">
              <Coins className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-[#183653]">
              No Collections Recorded in the Last {trendDays} Days
            </p>
            <p className="text-[11px] text-[#647C95] max-w-xs mt-0.5">
              Installments collected will plot your daily cashflow trend curve here.
            </p>
            <button
              onClick={onOpenPayment}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#064B8E] hover:to-[#0878D1] text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center space-x-1"
            >
              <span>+ Record Collection</span>
            </button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {trendChartType === 'bar' ? (
              <BarChart data={activeTrendData} margin={{ top: 16, right: 10, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="barTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0878D1" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#55B8F5" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10, fill: '#647C95' }}
                  axisLine={{ stroke: '#D5E9FA' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, trendYDomainMax]}
                  tickFormatter={(v) => formatShortCurrency(v)}
                  tick={{ fontSize: 10, fill: '#647C95' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTrendTooltip />} />
                {trendSliceAvg > 0 && (
                  <ReferenceLine
                    y={trendSliceAvg}
                    stroke="#55B8F5"
                    strokeDasharray="3 3"
                    label={{
                      value: `Avg ${formatShortCurrency(trendSliceAvg)}`,
                      position: 'insideTopRight',
                      fontSize: 9,
                      fill: '#0878D1',
                      fontWeight: 700,
                    }}
                  />
                )}
                <Bar
                  dataKey="amount"
                  fill="url(#barTrendGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            ) : (
              <AreaChart data={activeTrendData} margin={{ top: 16, right: 10, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0878D1" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#55B8F5" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10, fill: '#647C95' }}
                  axisLine={{ stroke: '#D5E9FA' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, trendYDomainMax]}
                  tickFormatter={(v) => formatShortCurrency(v)}
                  tick={{ fontSize: 10, fill: '#647C95' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTrendTooltip />} />
                {trendSliceAvg > 0 && (
                  <ReferenceLine
                    y={trendSliceAvg}
                    stroke="#55B8F5"
                    strokeDasharray="3 3"
                    label={{
                      value: `Avg ${formatShortCurrency(trendSliceAvg)}`,
                      position: 'insideTopRight',
                      fontSize: 9,
                      fill: '#0878D1',
                      fontWeight: 700,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#0878D1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaTrendGrad)"
                  dot={(dotProps) => {
                    const { cx, cy, payload } = dotProps;
                    if (!payload || payload.amount <= 0) return null;
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#0878D1"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        className="drop-shadow-sm"
                      />
                    );
                  }}
                  activeDot={{ r: 6, fill: '#0878D1', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  // Render the Today's Collection List Component (used in right panel on Laptop, or stacked on Tablet)
  const renderTodayCollectionList = () => (
    <div className="bg-white/75 backdrop-blur-[20px] rounded-3xl p-5 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)] space-y-4 min-w-0">
      {/* Header with Segmented Switch: Pending vs Completed Collections */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 pb-3 border-b border-[#D5E9FA]">
        <div>
          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EAF5FF] border border-[#D5E9FA]">
            <button
              onClick={() => setPanelTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                panelTab === 'pending'
                  ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-md shadow-[#0878D1]/25 ring-1 ring-[#55B8F5]'
                  : 'text-[#647C95] hover:text-[#0878D1]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Dues ({filteredTodayList.length})</span>
            </button>
            <button
              onClick={() => setPanelTab('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                panelTab === 'completed'
                  ? 'bg-gradient-to-r from-[#18A879] to-[#0878D1] text-white shadow-md shadow-[#18A879]/25 ring-1 ring-[#18A879]'
                  : 'text-[#647C95] hover:text-[#18A879]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed ({completedTodayList.length})</span>
            </button>
          </div>
          <p className="text-[11px] text-[#647C95] mt-1.5">
            {panelTab === 'pending'
              ? 'Collections to be collected. Disappears automatically once paid.'
              : 'Paid collections saved in archive with official receipts.'}
          </p>
        </div>

        {/* Quick Filter */}
        <div className="relative w-full xl:w-48">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#647C95] pointer-events-none" />
          <input
            type="text"
            placeholder={panelTab === 'pending' ? 'Filter dues...' : 'Filter receipts...'}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl bg-white/90 border border-[#D5E9FA] text-xs text-[#183653] placeholder-[#647C95] w-full focus:outline-none focus:ring-2 focus:ring-[#0878D1]/20 focus:border-[#0878D1]"
          />
        </div>
      </div>

      {panelTab === 'pending' ? (
        filteredTodayList.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#647C95] bg-[#EAF5FF]/50 rounded-2xl space-y-2 border border-[#D5E9FA]">
            <CheckCheck className="w-8 h-8 text-[#18A879] mx-auto" />
            <p className="font-bold text-[#183653]">All Collections Completed!</p>
            <p className="text-[11px]">No pending dues remaining for today. All paid collections are saved in the Completed list.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredTodayList.map((item) => {
              const parsed = parseCustomerName(item.customerName);
              return (
                <div
                  key={`${item.loanId}-${item.dueDate}`}
                  className="p-3.5 rounded-2xl bg-white/75 hover:bg-white/95 border border-[#D5E9FA] shadow-xs space-y-2.5 animate-fade-in min-w-0 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="cursor-pointer space-y-0.5 flex-1 min-w-0"
                      onClick={() => onViewLoan && onViewLoan(item.loanId)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-xs sm:text-sm text-[#183653] truncate">
                          {parsed.primary}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase border shrink-0 ${
                            item.financeType === 'daily'
                              ? 'bg-[#EAF5FF] text-[#0878D1] border-[#D5E9FA]'
                              : item.financeType === 'weekly'
                              ? 'bg-[#EAF5FF] text-[#064B8E] border-[#D5E9FA]'
                              : 'bg-[#EAF5FF] text-[#18A879] border-[#D5E9FA]'
                          }`}
                        >
                          {item.financeType}
                        </span>
                      </div>
                      {parsed.secondary && (
                        <p className="text-[11px] text-[#647C95] truncate leading-none">
                          {parsed.secondary}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black tabular-nums text-sm sm:text-base text-[#183653] whitespace-nowrap">
                        {formatCurrency(item.dueAmount)}
                      </p>
                      {item.isOverdue ? (
                        <span className="text-[10px] font-bold text-[#9B2C2C] whitespace-nowrap">
                          Overdue ({getOverdueDays(item.dueDate)}d)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#18A879] whitespace-nowrap">
                          Due Today
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#D5E9FA] text-[11px] text-[#647C95] font-mono">
                    <div className="flex items-center space-x-1.5 truncate min-w-0">
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

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => setWhatsappItem(item)}
                        className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-white border border-[#D5E9FA] text-[#18A879] hover:bg-[#EAF5FF] hover:border-[#55B8F5] transition active:scale-95 shadow-xs"
                        title="Send WhatsApp Reminder"
                      >
                        <Send className="w-3.5 h-3.5 text-[#18A879]" />
                      </button>

                      <button
                        onClick={() => setSelectedPayItem(item)}
                        className="btn-sky-primary min-h-[36px] py-1.5 px-3 text-xs font-black shadow-md flex items-center space-x-1 whitespace-nowrap active:scale-95"
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
                  className="p-3.5 rounded-2xl glass glass-hover border border-emerald-200/80 dark:border-emerald-900/60 space-y-2.5 animate-fade-in min-w-0"
                >
                  <div className="flex items-start justify-between gap-2">
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
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black tabular-nums text-sm sm:text-base text-emerald-600 whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        By {p.collectedBy?.name || 'Owner'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-100/70 dark:border-emerald-900/40 text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center space-x-1.5 truncate min-w-0">
                      <span className="font-bold text-emerald-600">{p.receiptNo}</span>
                      <span>•</span>
                      <span>{p.loanId?.loanNo}</span>
                      <span>•</span>
                      <span>{formatDate(p.date)}</span>
                    </div>

                    <button
                      onClick={() => setReceiptPayment(p)}
                      className="px-3 py-1.5 rounded-xl glass hover:bg-sky-50 text-sky-600 font-bold text-xs border border-sky-200 shrink-0 min-h-[36px] flex items-center active:scale-95 transition"
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
              ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-md shadow-[#0878D1]/25 ring-1 ring-[#55B8F5]'
              : 'bg-white/75 backdrop-blur-[20px] text-[#183653] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{lang === 'ta' ? 'கண்ணோட்டம்' : 'Overview'}</span>
        </button>

        <button
          onClick={() => setDashboardView('completed')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 ${
            dashboardView === 'completed'
              ? 'bg-gradient-to-r from-[#18A879] to-[#0878D1] text-white shadow-md shadow-[#18A879]/25 ring-1 ring-[#18A879]'
              : 'bg-white/75 backdrop-blur-[20px] text-[#183653] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'ta' ? 'வசூலானவை' : 'Completed'} ({completedTodayList.length})</span>
        </button>

        <button
          onClick={() => setDashboardView('settled')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 ${
            dashboardView === 'settled'
              ? 'bg-gradient-to-r from-[#55B8F5] to-[#0878D1] text-white shadow-md shadow-[#55B8F5]/25 ring-1 ring-[#55B8F5]'
              : 'bg-white/75 backdrop-blur-[20px] text-[#183653] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
          }`}
        >
          <Award className="w-4 h-4 text-[#0878D1]" />
          <span>{lang === 'ta' ? 'முடிந்தவை' : 'Settled'} ({completedLoansList.length})</span>
        </button>
      </div>

      {/* Dedicated View 1: Completed Collections (Archived & Saved Separate Page) */}
      {dashboardView === 'completed' && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards for Completed Collections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <div className="glass rounded-3xl p-5 border border-emerald-200/80 dark:border-emerald-900/60 shadow-lg min-w-0 flex flex-col justify-between h-full">
              <div>
                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">
                  Total Collections Saved
                </p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 tabular-nums whitespace-nowrap">
                  {formatCurrency(
                    completedTodayList.reduce((acc, p) => acc + (p.amount || 0), 0)
                  )}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {completedTodayList.length} total payments collected & archived
              </p>
            </div>

            <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg min-w-0 flex flex-col justify-between h-full">
              <div>
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
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Physical currency collected</p>
            </div>

            <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg min-w-0 flex flex-col justify-between h-full">
              <div>
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
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Direct digital bank settlements</p>
            </div>

            <div className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-lg min-w-0 flex flex-col justify-between h-full">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Completed Receipts Count
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {completedTodayList.length}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Official customer vouchers</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <div className="glass rounded-3xl p-5 border border-teal-200/80 dark:border-teal-900/60 shadow-lg min-w-0 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-teal-600 font-bold uppercase tracking-wider truncate">
                    {lang === 'ta' ? 'முடிவுற்ற கடன் தொகை' : 'Total Settled Amount'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-teal-600 mt-2 tabular-nums whitespace-nowrap">
                  {formatCurrency(cards.settledAmount || completedLoansList.reduce((acc, l) => acc + (l.totalCollected || l.totalPayable || 0), 0))}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {lang === 'ta' ? 'முடிவுற்ற கணக்குகளில் வசூலான மொத்த தொகை' : 'Total recovered across 100% settled accounts'}
              </p>
            </div>

            <div className="glass rounded-3xl p-5 border border-emerald-200/80 dark:border-emerald-900/60 shadow-lg min-w-0 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider truncate">
                    {lang === 'ta' ? 'முடிந்த கடன் நிகர லாபம்' : 'Profit from Settled'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shrink-0">
                    <Award className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tabular-nums whitespace-nowrap">
                  +{formatCurrency(cards.profitFromSettled ?? cards.profitEarned ?? completedLoansList.reduce((acc, l) => acc + getSettledLoanProfit(l), 0))}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {lang === 'ta' ? 'நடப்பு வட்டியிலிருந்து மாற்றப்பட்டு பெற்ற லாபம்' : 'Realized profit transferred from active interest'}
              </p>
            </div>

            <div className="bg-white/75 backdrop-blur-[20px] rounded-3xl p-5 border border-[#D5E9FA] shadow-lg min-w-0 flex flex-col justify-between h-full bg-gradient-to-br from-[#EAF5FF]/60 via-white/80 to-transparent">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#0878D1] font-bold uppercase tracking-wider truncate">
                    {lang === 'ta' ? 'மொத்த வட்டி & லாபம்' : 'Sum of Interest & Profit'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] flex items-center justify-center text-[#0878D1] shrink-0">
                    <Coins className="w-4 h-4 text-[#0878D1]" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-[#0878D1] mt-2 tabular-nums whitespace-nowrap">
                  +{formatCurrency(sumInterestAndProfit)}
                </p>
              </div>
              <p className="text-[11px] text-[#647C95] mt-2 truncate">
                {lang === 'ta'
                  ? `நடப்பு: ${formatCurrency(activeInterestVal)} + ஈட்டியது: ${formatCurrency(settledProfitVal)}`
                  : `Active: ${formatCurrency(activeInterestVal)} + Settled: ${formatCurrency(settledProfitVal)}`}
              </p>
            </div>

            <div className="glass rounded-3xl p-5 border border-sky-200/80 dark:border-sky-900/60 shadow-lg min-w-0 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-sky-600 font-bold uppercase tracking-wider truncate">
                    {lang === 'ta' ? 'முடிவுற்ற கணக்குகள்' : 'Settled Accounts'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 shrink-0">
                    <CheckCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 tabular-nums whitespace-nowrap">
                  {completedLoansList.length}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
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
                  const disbursed = Number(loan.disbursedAmount || 0);
                  const profit = getSettledLoanProfit(loan);
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
                          {disbursed > 0 && disbursed < pr ? (
                            <>
                              <span className="text-slate-500 font-medium text-xs">
                                {lang === 'ta' ? 'அசல்' : 'Principal'}: {formatCurrency(pr)} ({lang === 'ta' ? 'வழங்கியது' : 'In Hand'}: {formatCurrency(disbursed)})
                              </span>
                              {' • '}
                              <span>{lang === 'ta' ? 'வசூல்' : 'Settled'}: {formatCurrency(collected)}</span>
                            </>
                          ) : (
                            <>
                              <span>{lang === 'ta' ? 'அசல்' : 'Principal'}: {formatCurrency(pr)}</span>
                              {' • '}
                              <span>{lang === 'ta' ? 'முடிந்தது' : 'Settled'}: {formatCurrency(collected)}</span>
                            </>
                          )}
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
              {/* 1. Mobile Ocean Blue Welcome Banner with Live Clock & Quick Actions */}
              <div className="p-2.5 sm:p-3 rounded-[24px] bg-[#EAF5FF]/80 backdrop-blur-xl border border-[#D5E9FA] shadow-[0_6px_20px_rgba(8,120,209,0.06)]">
                <div className="relative overflow-hidden rounded-[20px] bg-[#0878D1] text-white p-4 sm:p-5 shadow-[0_10px_28px_rgba(8,120,209,0.20)] space-y-3">
                  {/* Subtle ambient glow */}
                  <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/20 backdrop-blur-md">
                      <Sparkles className="w-3 h-3 text-[#55B8F5]" />
                      <span>{lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : "VK Banker's Fintech"}</span>
                    </span>
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/20">
                      {roleLabel}
                    </span>
                  </div>

                  <div className="relative z-10">
                    <p className="text-xs font-medium text-white/90">
                      {getGreeting()}
                    </p>
                    <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5 mb-1 leading-tight">
                      {displayName}
                    </h2>
                    <p className="text-[11px] text-white/80 leading-snug">
                      {lang === 'ta'
                        ? 'நிதி மேலாண்மை மற்றும் நேரலை வசூல் பதிவேடு'
                        : 'Financial portfolio overview and real-time collection ledger'}
                    </p>
                  </div>

                  {/* Mobile Live Time IST Compact Widget */}
                  <div className="relative z-10 bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-3 text-white flex items-center justify-between shadow-inner">
                    <div>
                      <div className="flex items-center space-x-1 text-[10px] text-white/80 font-medium">
                        <Clock className="w-3 h-3 text-[#55B8F5]" />
                        <span>Live time · IST</span>
                      </div>
                      <p className="text-[11px] font-medium text-white/90 mt-0.5">
                        {formattedDate}
                      </p>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-xl font-black text-white tabular-nums tracking-tight">
                        {hours12}:{minutes}
                      </span>
                      <span className="text-xs font-bold text-white/85 tabular-nums ml-1">
                        {seconds}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-white/20 border border-white/30 text-[9px] font-black text-white ml-1.5 uppercase">
                        {ampm}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Quick Action Buttons: 2x2 Grid */}
                  <div className="relative z-10 grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onOpenNewLoan}
                      className="h-9 px-3 rounded-full bg-white text-[#0878D1] font-bold text-xs shadow-sm active:scale-95 transition flex items-center justify-center space-x-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-[#0878D1]" />
                      <span>{lang === 'ta' ? 'புதிய கடன்' : 'New loan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenNewCustomer}
                      className="h-9 px-3 rounded-full bg-white/15 text-white font-semibold text-xs border border-white/20 active:scale-95 transition flex items-center justify-center space-x-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{lang === 'ta' ? 'வாடிக்கையாளர்' : 'Customer'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenPayment}
                      className="h-9 px-3 rounded-full bg-[#55B8F5] text-white font-bold text-xs shadow-sm active:scale-95 transition flex items-center justify-center space-x-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{lang === 'ta' ? 'தவணை வசூல்' : 'Collect EMI'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenInvestment || (() => onNavigateTab && onNavigateTab('settings'))}
                      className="h-9 px-3 rounded-full bg-white/15 text-white font-semibold text-xs border border-white/20 active:scale-95 transition flex items-center justify-center space-x-1.5"
                    >
                      <Landmark className="w-3.5 h-3.5 text-[#55B8F5]" />
                      <span>{lang === 'ta' ? 'முதலீடு' : 'Investment'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Horizontal Swipe Carousel of Key Metric Cards (Snap scrolling) */}
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-none -mx-3 px-3">
                {/* NEW: Sky Blue KPI Card: EMI Due Today / Overdue */}
                <div
                  onClick={() => {
                    setMobileTab('due');
                    const el = document.getElementById('mobile-collection-tabs');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-[84%] shrink-0 snap-center card-sky-kpi rounded-3xl p-4 border shadow-lg cursor-pointer active:scale-98 transition relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#1F4E6B] dark:text-[#CFE6F2]">
                      {lang === 'ta' ? 'இன்றைய தவணை & நிலுவை' : 'EMI Due Today / Overdue'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[#CFE6F2] text-[#1F4E6B] flex items-center justify-center shadow-md">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold tabular-nums mt-1 whitespace-nowrap text-[#1F4E6B] dark:text-[#CFE6F2]">
                    {formatCurrency(totalDueAndOverdue)}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                    <span>
                      {lang === 'ta' ? 'இன்று' : 'Due'}: {formatCurrency(todayDueTotal)} ({todayDueList.length})
                    </span>
                    <span className="text-[#A8442C] font-semibold">
                      {lang === 'ta' ? 'நிலுவை' : 'Overdue'}: {formatCurrency(overdueTotal)} ({overdueLoans.length})
                    </span>
                  </div>
                </div>

                {/* Available Capital / Investment Card (Minus Loans Disbursed, Add to Lend) */}
                <div
                  onClick={() => onOpenInvestment && onOpenInvestment()}
                  className="w-[84%] shrink-0 snap-center bg-white/75 backdrop-blur-[20px] rounded-3xl p-4 border border-[#D5E9FA] shadow-sm cursor-pointer active:scale-98 transition relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#0878D1] uppercase tracking-wide">
                      {lang === 'ta' ? 'முதலீட்டு கையிருப்பு (Available)' : 'Available Capital to Lend'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0878D1] to-[#064B8E] text-white flex items-center justify-center shadow-md shadow-[#0878D1]/20">
                      <Landmark className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-[#183653] tabular-nums mt-1 whitespace-nowrap">
                    {formatCurrency(
                      cards.availableInvestment !== undefined
                        ? cards.availableInvestment
                        : Math.max(0, (cards.activeWorkingCapital || cards.totalInvested || 0) - (cards.totalLent || 0))
                    )}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-[#647C95] font-bold">
                      {lang === 'ta'
                        ? `முதலீடு: ${formatCurrency(cards.totalInvested || 0)}`
                        : `Pool: ${formatCurrency(cards.totalInvested || 0)}`}
                    </span>
                    <span className="text-rose-500 font-bold">
                      (-{formatCurrency(cards.totalLent || 0)} lent)
                    </span>
                  </div>
                </div>

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
                <div className="w-[82%] shrink-0 snap-center bg-white/75 backdrop-blur-[20px] rounded-3xl p-4 border border-[#D5E9FA] shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#0878D1] uppercase tracking-wide">
                      {lang === 'ta' ? 'நடப்பு வட்டி (Interest)' : 'Active Interest'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[#EAF5FF] flex items-center justify-center text-[#0878D1]">
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-[#183653] tabular-nums mt-1 whitespace-nowrap">
                    {formatCurrency(cards.activeInterest || 0)}
                  </p>
                  <p className="text-[10px] text-[#647C95] mt-0.5">
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

                {/* 7. Total Sum of Interest and Profit */}
                <div className="w-[82%] shrink-0 snap-center bg-white/75 backdrop-blur-[20px] rounded-3xl p-4 border border-[#D5E9FA] shadow-md bg-gradient-to-br from-[#EAF5FF] via-white/80 to-[#EAF5FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#0878D1] uppercase tracking-wide">
                      {lang === 'ta' ? 'மொத்த வட்டி & லாபம்' : 'Total Interest & Profit'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] flex items-center justify-center text-[#0878D1]">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-[#0878D1] tabular-nums mt-1 whitespace-nowrap">
                    +{formatCurrency(sumInterestAndProfit)}
                  </p>
                  <p className="text-[10px] text-[#647C95] mt-0.5 truncate">
                    {lang === 'ta'
                      ? `நடப்பு: ${formatCurrency(activeInterestVal)} + ஈட்டியது: ${formatCurrency(settledProfitVal)}`
                      : `Active: ${formatCurrency(activeInterestVal)} + Settled: ${formatCurrency(settledProfitVal)}`}
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
                    <div className="mt-3">
                      {renderCollectionTrendCard(true)}
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
              {/* 1. Ocean Blue Welcome Banner with Modern Fintech Styling & Live IST Clock */}
              <div className="p-3 sm:p-4 rounded-[32px] bg-[#EAF5FF]/80 backdrop-blur-xl border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.06)]">
                <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] bg-[#0878D1] text-white p-6 sm:p-7 shadow-[0_12px_36px_rgba(8,120,209,0.22)]">
                  {/* Subtle ambient glow */}
                  <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <div className="absolute left-1/3 -bottom-16 w-48 h-48 rounded-full bg-[#55B8F5]/20 blur-xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Badges, Greeting, Name, Tagline & Action Buttons */}
                    <div className="space-y-4 max-w-2xl">
                      {/* Top Badges */}
                      <div className="flex items-center space-x-2.5">
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/20 text-white border border-white/25 backdrop-blur-md transition-colors">
                          <Sparkles className="w-3.5 h-3.5 text-[#55B8F5]" />
                          <span>{lang === 'ta' ? 'வி.கே. பேங்கர்ஸ் ஃபின்டெக்' : "VK Banker's Fintech"}</span>
                        </span>
                        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/20 text-white border border-white/25 backdrop-blur-md transition-colors">
                          {roleLabel}
                        </span>
                      </div>

                      {/* Greeting & Name */}
                      <div>
                        <p className="text-sm sm:text-base font-medium text-white/90">
                          {getGreeting()}
                        </p>
                        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mt-0.5 mb-1.5">
                          {displayName}
                        </h1>
                        <p className="text-xs sm:text-sm font-normal text-white/85 leading-relaxed">
                          {lang === 'ta'
                            ? 'நிதி மேலாண்மை மற்றும் நேரலை வசூல் பதிவேடு'
                            : 'Financial portfolio overview and real-time collection ledger'}
                        </p>
                      </div>

                      {/* Bottom Action Buttons Row */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        {/* New Loan - White Pill */}
                        <button
                          type="button"
                          onClick={onOpenNewLoan}
                          className="h-10 px-5 rounded-full bg-white hover:bg-white/95 text-[#0878D1] font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4 text-[#0878D1]" />
                          <span>{lang === 'ta' ? 'புதிய கடன்' : 'New loan'}</span>
                        </button>

                        {/* Customer - Translucent Glass Pill */}
                        <button
                          type="button"
                          onClick={onOpenNewCustomer}
                          className="h-10 px-5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm border border-white/25 backdrop-blur-md transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
                        >
                          <Users className="w-4 h-4" />
                          <span>{lang === 'ta' ? 'வாடிக்கையாளர்' : 'Customer'}</span>
                        </button>

                        {/* Collect EMI - Sky Blue Pill */}
                        <button
                          type="button"
                          onClick={onOpenPayment}
                          className="h-10 px-5 rounded-full bg-[#55B8F5] hover:bg-[#41aaf0] text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>{lang === 'ta' ? 'தவணை வசூல்' : 'Collect EMI'}</span>
                        </button>

                        {/* Investment - Translucent Glass Pill */}
                        {(isOwner || onOpenInvestment) && (
                          <button
                            type="button"
                            onClick={onOpenInvestment || (() => onNavigateTab && onNavigateTab('settings'))}
                            className="h-10 px-5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm border border-white/25 backdrop-blur-md transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
                          >
                            <Landmark className="w-4 h-4 text-[#55B8F5]" />
                            <span>{lang === 'ta' ? 'முதலீடு' : 'Investment'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: Live Time IST Glass Card */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 text-white shadow-inner min-w-[260px] sm:min-w-[290px] shrink-0 self-start lg:self-center">
                      <div className="flex items-center space-x-1.5 text-xs text-white/80 font-medium mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#55B8F5]" />
                        <span>Live time · IST</span>
                      </div>
                      <div className="flex items-baseline mb-2">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                          {hours12}:{minutes}
                        </span>
                        <span className="text-base sm:text-lg font-bold text-white/85 tabular-nums ml-2">
                          {seconds}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white/20 border border-white/30 text-xs font-black text-white ml-2.5 uppercase">
                          {ampm}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-white/90">
                        {formattedDate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0878D1]" />
                  <h3 className="text-base font-black text-[#183653] tracking-tight">
                    {lang === 'ta' ? 'நிதிச் சுருக்கம்' : 'Financial Summary'}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#647C95]">
                  {lang === 'ta' ? 'நேரலை மூலதனம் & வசூல் நிலவரம்' : 'Real-time capital & collection breakdown'}
                </span>
              </div>

              {/* Key Metric Cards (8 cards in 4x2 matrix matching design mockup) */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-stretch"
              >
                {/* 1. NET COLLECTIONS IN HAND */}
                <StatCard
                  title={lang === 'ta' ? 'கையிருப்பு வசூல்' : 'NET COLLECTIONS IN HAND'}
                  amount={
                    cards.netCollected !== undefined
                      ? cards.netCollected
                      : Math.max(0, (cards.totalCollected || 0) - (cards.totalExpenses || 0))
                  }
                  subtitle={
                    cards.totalExpenses > 0
                      ? `Click for breakdown • -${formatCurrency(cards.totalExpenses)} exp`
                      : 'Click for daily & scheme br...'
                  }
                  icon={Wallet}
                  gradient="from-[#18A879] to-[#0878D1]"
                  delay={0}
                  onClick={() => setShowBreakdownModal(true)}
                />

                {/* 2. TOTAL LENT */}
                <StatCard
                  title={lang === 'ta' ? 'வழங்கிய மொத்த கடன்' : 'TOTAL LENT'}
                  amount={cards.totalLent}
                  subtitle={`${cards.totalLoans || 0} loans issued`}
                  icon={Banknote}
                  gradient="from-[#0878D1] to-[#064B8E]"
                  delay={0.03}
                />

                {/* 3. TOTAL COLLECTED */}
                <StatCard
                  title={lang === 'ta' ? 'மொத்த வசூல்' : 'TOTAL COLLECTED'}
                  amount={cards.totalCollected}
                  subtitle="Gross repaid across accounts"
                  icon={CheckCircle2}
                  gradient="from-[#18A879] to-[#064B8E]"
                  delay={0.06}
                />

                {/* 4. TOTAL EXPENSES */}
                <StatCard
                  title={lang === 'ta' ? 'மொத்த செலவுகள்' : 'TOTAL EXPENSES'}
                  amount={cards.totalExpenses || 0}
                  subtitle="Business & office expenses"
                  icon={TrendingUp}
                  gradient="from-[#0878D1] to-[#55B8F5]"
                  delay={0.09}
                  onClick={() => onOpenExpenses && onOpenExpenses()}
                />

                {/* 5. TOTAL OUTSTANDING */}
                <StatCard
                  title={lang === 'ta' ? 'மொத்த நிலுவை' : 'TOTAL OUTSTANDING'}
                  amount={cards.totalOutstanding}
                  subtitle={`${cards.activeLoans || 0} active loans pending`}
                  icon={Clock}
                  gradient="from-[#55B8F5] to-[#0878D1]"
                  delay={0.12}
                />

                {/* 6. ACTIVE INTEREST */}
                <StatCard
                  title={lang === 'ta' ? 'செயலில் உள்ள வட்டி' : 'ACTIVE INTEREST'}
                  amount={cards.activeInterest}
                  subtitle={lang === 'ta' ? 'முடிவுற்றதும் குறையும்' : 'Auto-reduces as loans settle'}
                  icon={Coins}
                  gradient="from-[#0878D1] to-[#064B8E]"
                  delay={0.15}
                />

                {/* 7. TOTAL SETTLED AMOUNT */}
                <StatCard
                  title={lang === 'ta' ? 'முடிவடைந்த தொகை' : 'TOTAL SETTLED AMOUNT'}
                  amount={cards.settledAmount}
                  subtitle={`${cards.completedLoans || 0} completed loans`}
                  icon={ShieldCheck}
                  gradient="from-[#55B8F5] to-[#0878D1]"
                  delay={0.18}
                  onClick={() => setDashboardView('settled')}
                />

                {/* 8. PROFIT FROM SETTLED */}
                <StatCard
                  title={lang === 'ta' ? 'முடிவடைந்த நிகர லாபம்' : 'PROFIT FROM SETTLED'}
                  amount={cards.profitFromSettled ?? cards.profitEarned}
                  subtitle={lang === 'ta' ? 'முடிந்த கணக்குகளின் நிகர லாபம்' : 'Realized profit from settled'}
                  icon={Award}
                  gradient="from-[#18A879] to-[#0878D1]"
                  delay={0.21}
                  onClick={() => setDashboardView('settled')}
                />
              </div>

              {/* 4. Business Overview & Lending Schemes Header */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#55B8F5]" />
                  <h3 className="text-base font-black text-[#183653] tracking-tight">
                    {lang === 'ta' ? 'வணிகக் கண்ணோட்டம் & திட்டங்கள்' : 'Business Overview & Lending Schemes'}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#647C95]">
                  {lang === 'ta' ? 'தினசரி, வாராந்திர & மாதாந்திர நிதி' : 'Daily, Weekly & Monthly Schemes'}
                </span>
              </div>

              {/* 2. Three Finance-Type Cards (Daily / Weekly / Monthly) */}
              <div
                className={`grid ${
                  isTablet ? 'grid-cols-2 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-4'
                } items-stretch`}
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

              {/* 2.5 Per-Agent Summary Cards for Owners */}
              {isOwner && agentList.length > 0 && (
                <div className="bg-white/75 backdrop-blur-[20px] rounded-3xl p-5 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-[#0878D1]" />
                      <h3 className="text-sm font-bold text-[#183653]">
                        {lang === 'ta' ? 'கள முகவர்கள் வசூல் விவரம் (Agent Performance)' : 'Field Collection Agents Performance'}
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#647C95] font-semibold">
                      {agentList.length} {lang === 'ta' ? 'செயலில் உள்ள முகவர்கள்' : 'Active Agents'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {agentList.map((agent) => (
                      <div
                        key={agent._id || agent.id}
                        className="p-3.5 rounded-2xl bg-white/70 border border-[#D5E9FA] flex items-center justify-between shadow-xs"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#183653] truncate">
                            {agent.name}
                          </p>
                          <p className="text-[10.5px] text-[#647C95] truncate mt-0.5">
                            {agent.phone || agent.email}
                          </p>
                        </div>
                        <span className="badge-paid px-2.5 py-1 text-[10px] font-bold rounded-full shrink-0">
                          {lang === 'ta' ? 'செயலில்' : 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Laptop Split Layout: 7 Cols Left (Charts) vs 5 Cols Right (Collection Panel) */}
              {isLaptop ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 space-y-6 min-w-0">
                    {/* Collection Trend */}
                    {renderCollectionTrendCard(false)}

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Donut Chart: Scheme Distribution */}
                      <div className="bg-white/75 backdrop-blur-[20px] rounded-3xl p-5 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)] min-w-0">
                        <h3 className="font-black text-sm text-[#183653] mb-1">
                          {t('financeTypeDistribution')}
                        </h3>
                        <p className="text-[11px] text-[#647C95] mb-2">Loan book by scheme</p>
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
                      <div className="bg-white/75 backdrop-blur-[20px] rounded-3xl p-5 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)] min-w-0">
                        <h3 className="font-black text-sm text-[#183653] mb-1">
                          Monthly Financials (6M)
                        </h3>
                        <p className="text-[11px] text-[#647C95] mb-2">Collections vs net profit</p>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyChartData}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="#D5E9FA" />
                              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#647C95' }} stroke="#D5E9FA" />
                              <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 9, fill: '#647C95' }} stroke="#D5E9FA" />
                              <Tooltip
                                formatter={(val, name) => [
                                  formatCurrency(val),
                                  name === 'collected' ? 'Collections' : 'Net Profit',
                                ]}
                              />
                              <Bar dataKey="collected" fill="#0878D1" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="profit" fill="#18A879" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Today's Collection Panel (5 cols) */}
                  <div className="lg:col-span-5 sticky top-20 min-w-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#18A879]" />
                        <h3 className="text-base font-black text-[#183653] tracking-tight">
                          {lang === 'ta' ? 'சமீபத்திய வசூல் செயல்பாடுகள்' : 'Recent Activities'}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-[#647C95]">
                        {lang === 'ta' ? 'தவணை & ரசீதுகள்' : 'Dues & Receipts'}
                      </span>
                    </div>
                    {renderTodayCollectionList()}
                  </div>
                </div>
              ) : (
                /* Tablet Layout: Stacked Today's Collection + Charts */
                <div className="space-y-6">
                  {renderTodayCollectionList()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderCollectionTrendCard(true)}

                    <div className="bg-white/75 backdrop-blur-[20px] rounded-3xl p-5 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)]">
                      <h3 className="font-black text-sm text-[#183653] mb-2">
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
