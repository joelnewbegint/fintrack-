import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Users,
  Calendar,
  Phone,
  MessageCircle,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { openWhatsApp, generateEMIWhatsAppMessage } from '../../utils/emiWhatsapp';

export const EMIDashboard = ({
  onOpenNewEMILoan,
  onOpenCollectModal,
  onViewLoan,
  onNavigateToList,
  onNavigateToCustomers,
}) => {
  const { user, isOwner } = useAuth();
  const { lang } = useLanguage();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [agentsList, setAgentsList] = useState([]);
  const [filterChip, setFilterChip] = useState('all'); // 'all' | 'due_today' | 'overdue'

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getEMIDashboardStats(selectedAgent);
      if (res.success) {
        setStats(res.stats);
      }
    } catch (e) {
      console.warn('EMI Dashboard stats fetch note:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    if (isOwner) {
      try {
        const res = await api.getAgentsList();
        if (res.success) {
          const emiAgents = (res.agents || []).filter(a => a.role === 'emi_agent' || a.role === 'agent');
          setAgentsList(emiAgents);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAgents();
  }, [selectedAgent]);

  const handleExportExcel = () => {
    const url = `${api.getApiBaseUrl()}/api/emi/export/excel`;
    window.open(url, '_blank');
  };

  const collectedToday = stats?.collectedToday || 0;
  const todayTarget = stats?.todayTarget || 1;
  const progressPercent = Math.min(100, Math.round((collectedToday / Math.max(1, todayTarget)) * 100));

  return (
    <div
      className="space-y-6 pb-12 -mx-2 sm:-mx-4 lg:-mx-6 px-3 sm:px-6 py-4 rounded-3xl"
      style={{
        background: 'linear-gradient(180deg, #FFF8F5 0%, #FFF3EC 60%, #F8FAFD 100%)',
      }}
    >
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
              மாத தவணை பிரிவு
            </span>
            <span className="text-xs text-slate-500 font-medium">EMI Microfinance Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1">
            {lang === 'ta' ? 'EMI தவணை டாஷ்போர்டு' : 'Monthly EMI Dashboard'}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === 'ta'
              ? 'அனைத்து மாத தவணைக் கடன்கள் மற்றும் இன்றைய வசூல் விவரங்கள்'
              : "Track today's collection targets, customer due installments, and overdue portfolio."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Agent Filter (Owner Only) */}
          {isOwner && agentsList.length > 0 && (
            <div className="relative">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="h-10 px-3 pr-8 rounded-xl bg-white/90 border border-orange-200 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 shadow-sm"
              >
                <option value="all">👥 All EMI Agents</option>
                {agentsList.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleExportExcel}
            className="h-10 px-3.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-emerald-700 transition flex items-center space-x-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={onOpenNewEMILoan}
            className="h-10 px-4 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center space-x-1.5 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              boxShadow: '0 6px 16px -2px rgba(249, 115, 22, 0.35)',
            }}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New EMI Loan / புதிய கடன்</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Today collection, Pending, Overdue, Customers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Today Collection */}
        <div
          className="rounded-2xl p-4 sm:p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.14)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">
                {lang === 'ta' ? 'இன்றைய வசூல்' : 'Today Collection'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹{(stats?.collectedToday || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
              <span>Cash: ₹{(stats?.collectedCashToday || 0).toLocaleString('en-IN')}</span>
              <span>•</span>
              <span>UPI: ₹{(stats?.collectedUpiToday || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-orange-100/70">
            <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
              <span>Target: ₹{(stats?.todayTarget || 0).toLocaleString('en-IN')}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)',
                }}
              />
            </div>
            <button
              onClick={() => onOpenCollectModal && onOpenCollectModal()}
              className="w-full py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center justify-center space-x-1.5 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              }}
            >
              <span>+ Collect EMI / வசூல்</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Pending (Pending Balance) */}
        <div
          className="rounded-2xl p-4 sm:p-5 border flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 20px -4px rgba(56, 189, 248, 0.12)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                {lang === 'ta' ? 'மீதமுள்ள இருப்பு' : 'Pending'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹{(stats?.pendingBalance || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Outstanding balance across {stats?.activeLoansCount || 0} active loans
            </p>
          </div>

          <div className="mt-4 pt-2 border-t border-sky-100/70 text-[11px] font-medium text-slate-600 flex items-center justify-between">
            <span>Total Lent:</span>
            <span className="font-bold text-slate-800">₹{(stats?.totalPrincipalLent || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 3: Overdue */}
        <div
          className="rounded-2xl p-4 sm:p-5 border flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 20px -4px rgba(244, 63, 94, 0.12)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                {lang === 'ta' ? 'தாமத தவணைகள்' : 'Overdue'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {stats?.overdueCount || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Unpaid past due customer installments
            </p>
          </div>

          <div className="mt-4 pt-2 border-t border-rose-100/70">
            <button
              onClick={() => {
                setFilterChip('overdue');
                onNavigateToList && onNavigateToList('overdue');
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition flex items-center justify-center space-x-1"
            >
              <span>View Overdue Loans</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Customers */}
        <div
          className="rounded-2xl p-4 sm:p-5 border flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.12)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                {lang === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats?.customersCount || stats?.activeLoansCount || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active borrowers & borrower records
            </p>
          </div>

          <div className="mt-4 pt-2 border-t border-emerald-100/70">
            <button
              onClick={() => {
                if (onNavigateToCustomers) onNavigateToCustomers();
                else if (onNavigateToList) onNavigateToList('all');
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center justify-center space-x-1"
            >
              <span>View Customer Directory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips Row */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterChip('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
            filterChip === 'all'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
          }`}
        >
          <span>All Overview</span>
        </button>

        <button
          onClick={() => setFilterChip('due_today')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
            filterChip === 'due_today'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span>Due Today ({stats?.todayDueCount || 0})</span>
        </button>

        <button
          onClick={() => setFilterChip('overdue')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
            filterChip === 'overdue'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <span>Overdue List ({stats?.overdueCount || 0})</span>
        </button>
      </div>

      {/* Main Content: Weekly Chart & Actionable Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Weekly Collections Chart & Due Today */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Collection Trends Chart */}
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'ta' ? 'வாராந்திர வசூல் போக்கு' : 'Weekly EMI Collections'}
                </h3>
                <p className="text-xs text-slate-500">Last 7 days performance across areas</p>
              </div>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                7-Day Inflow
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.weeklyChart || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collected']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#F97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Today's Due Installments Table */}
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'ta' ? 'இன்று செலுத்த வேண்டிய தவணைகள்' : 'Installments Due Today'}
                </h3>
                <p className="text-xs text-slate-500">Tap collect or send 1-click WhatsApp notice</p>
              </div>
              <button
                onClick={() => onNavigateToList && onNavigateToList('active')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                View all loans ➔
              </button>
            </div>

            {(stats?.todayDueList || []).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No installments due today!</p>
                <p>All scheduled collections for today are cleared.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(stats?.todayDueList || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/70 hover:bg-white border border-slate-200/60 transition group"
                  >
                    <div
                      onClick={() => onViewLoan && onViewLoan(item.loanId)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-800">{item.customerName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">
                          #{item.installmentNo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {item.emiNo} • {item.customerArea}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-orange-600 font-bold">Due today</span>
                      </div>

                      {/* WhatsApp Reminder Button */}
                      <button
                        onClick={() => {
                          const msg = generateEMIWhatsAppMessage({
                            type: 'due_today',
                            customerName: item.customerName,
                            emiNo: item.emiNo,
                            installmentNo: item.installmentNo,
                            amount: item.amount,
                            lang,
                          });
                          openWhatsApp(item.customerPhone, msg);
                        }}
                        title="Send WhatsApp notice"
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onOpenCollectModal && onOpenCollectModal(item)}
                        className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition active:scale-95"
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Top Overdue Customers & Quick Links */}
        <div className="space-y-6">
          {/* Overdue Watchlist Card */}
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'ta' ? 'முக்கிய நிலுவையாளர்கள்' : 'Top Overdue Customers'}
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                Action Req.
              </span>
            </div>

            {(stats?.overdueList || []).length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <CheckCircle className="w-7 h-7 text-emerald-400 mx-auto mb-1" />
                <p className="font-semibold text-slate-600">Zero overdue loans!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(stats?.overdueList || []).map((od, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {od.customerName}
                      </span>
                      <span className="text-xs font-black text-rose-600">
                        ₹{Number(od.pendingAmount || od.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>{od.emiNo} (#{od.installmentNo})</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            const msg = generateEMIWhatsAppMessage({
                              type: 'overdue',
                              customerName: od.customerName,
                              emiNo: od.emiNo,
                              installmentNo: od.installmentNo,
                              amount: od.pendingAmount || od.amount,
                              lang,
                            });
                            openWhatsApp(od.customerPhone, msg);
                          }}
                          className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenCollectModal && onOpenCollectModal(od)}
                          className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold"
                        >
                          Collect
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EMI Quick Shortcuts */}
          <div
            className="rounded-2xl p-5 border space-y-3"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              EMI Quick Links / விரைவு வழிகள்
            </h4>

            <button
              onClick={() => onNavigateToList && onNavigateToList('active')}
              className="w-full p-2.5 rounded-xl border border-slate-200/70 bg-white hover:bg-orange-50 hover:border-orange-200 transition text-left flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-slate-800">All EMI Accounts (மாத தவணை)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={onOpenNewEMILoan}
              className="w-full p-2.5 rounded-xl border border-slate-200/70 bg-white hover:bg-sky-50 hover:border-sky-200 transition text-left flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-bold text-slate-800">Sanction New Loan</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EMIDashboard;

