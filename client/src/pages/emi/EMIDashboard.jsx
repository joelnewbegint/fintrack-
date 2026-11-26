import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Users,
  Phone,
  MessageCircle,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  X,
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
  const { isOwner } = useAuth();
  const { lang } = useLanguage();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [agentsList, setAgentsList] = useState([]);
  const [filterChip, setFilterChip] = useState('all'); // 'all' | 'due_today' | 'overdue'

  // Owner-only clean sample/test EMI data modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchStats = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
          const emiAgents = (res.agents || []).filter(
            (a) => a.role === 'emi_agent' || a.role === 'agent'
          );
          setAgentsList(emiAgents);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    fetchStats(false);
    fetchAgents();
  }, [selectedAgent]);

  useEffect(() => {
    const handleRefresh = () => fetchStats(true);
    window.addEventListener('fintrack:emi-updated', handleRefresh);
    window.addEventListener('fintrack:data-updated', handleRefresh);
    return () => {
      window.removeEventListener('fintrack:emi-updated', handleRefresh);
      window.removeEventListener('fintrack:data-updated', handleRefresh);
    };
  }, [selectedAgent]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await api.exportEMIExcel();
    } catch (e) {
      alert(e.message || 'Excel export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClearEMIData = async () => {
    try {
      setClearing(true);
      await api.clearEMIData();
      setShowClearModal(false);
      await fetchStats(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
      }
    } catch (err) {
      alert(err.message || 'Failed to clear EMI data');
    } finally {
      setClearing(false);
    }
  };

  const collectedToday = stats?.collectedToday || 0;
  const todayTarget = stats?.todayTarget || 0;
  const progressPercent =
    todayTarget > 0 ? Math.min(100, Math.round((collectedToday / todayTarget) * 100)) : 0;

  const totalPayable = stats?.totalPayable || 0;
  const totalCollected = stats?.totalCollected || 0;
  const recoveryPct =
    totalPayable > 0 ? Math.min(100, Math.round((totalCollected / totalPayable) * 100)) : 0;

  const hasAnyData =
    (stats?.activeLoansCount || 0) > 0 ||
    (stats?.customersCount || 0) > 0 ||
    (stats?.loansIssuedCount || 0) > 0;

  const overdueList = stats?.overdueList || [];
  const todayDueList = stats?.todayDueList || [];

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header & Actions (Ocean Blue Theme) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] text-xs font-bold border border-[#D5E9FA]">
              மாத தவணை பிரிவு
            </span>
            <span className="text-xs text-[#647C95] font-medium">Monthly EMI Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight mt-1">
            {lang === 'ta' ? 'EMI தவணை டாஷ்போர்டு' : 'Monthly EMI Dashboard'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isOwner && agentsList.length > 0 && (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="h-10 px-3 pr-8 rounded-xl bg-white/90 border border-[#D5E9FA] text-xs font-bold text-[#183653] outline-none focus:border-[#0878D1] shadow-xs"
            >
              <option value="all">All EMI Agents</option>
              {agentsList.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.username})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => fetchStats(false)}
            disabled={loading}
            title="Refresh Dashboard"
            className="h-10 w-10 rounded-xl bg-white/85 hover:bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] flex items-center justify-center shadow-xs transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isOwner && hasAnyData && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              title="Clear all EMI sample/test records"
              className="h-10 px-3 rounded-xl bg-white/85 hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold transition flex items-center space-x-1.5 shadow-xs active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'தரவு சுத்தம்' : 'Clear Data'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="h-10 px-3.5 rounded-xl bg-white/85 hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653] hover:text-[#18A879] transition flex items-center space-x-1.5 shadow-xs active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#18A879]" />
            <span>{exporting ? 'Exporting...' : 'Excel Export'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewEMILoan}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#0988ED] hover:to-[#085BAA] text-xs font-bold text-white shadow-md shadow-[#0878D1]/25 transition flex items-center space-x-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{lang === 'ta' ? 'புதிய EMI கடன்' : 'New EMI Loan'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Ocean Blue Glass Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Today Collection */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#0878D1] uppercase tracking-wider">
                {lang === 'ta' ? 'இன்றைய வசூல்' : 'Today Collection'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#EAF5FF] flex items-center justify-center text-[#0878D1] border border-[#D5E9FA]">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight tabular-nums">
              ₹{(stats?.collectedToday || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center space-x-2 mt-1 text-[11px] text-[#647C95] font-medium">
              <span>Cash: ₹{(stats?.collectedCashToday || 0).toLocaleString('en-IN')}</span>
              <span>•</span>
              <span>UPI: ₹{(stats?.collectedUpiToday || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#D5E9FA]/70">
            {todayTarget > 0 ? (
              <>
                <div className="flex justify-between text-[10px] font-bold text-[#647C95] mb-1">
                  <span>Target: ₹{todayTarget.toLocaleString('en-IN')}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#EAF5FF] overflow-hidden mb-2.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0878D1] to-[#18A879] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-[11px] text-[#647C95] mb-2">
                {lang === 'ta' ? 'இன்று தவணை நிலுவை இல்லை' : 'No dues scheduled today'}
              </p>
            )}
            <button
              type="button"
              onClick={() => onOpenCollectModal && onOpenCollectModal()}
              className="w-full py-2 rounded-xl bg-[#18A879] hover:bg-[#138861] text-xs font-bold text-white shadow-xs transition flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <span>+ Collect EMI / வசூல்</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Pending Balance */}
        <div
          onClick={() => onNavigateToList && onNavigateToList('active')}
          className="glass-card glass-hover p-4 sm:p-5 flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#0878D1] uppercase tracking-wider">
                {lang === 'ta' ? 'மீதமுள்ள இருப்பு' : 'Pending Balance'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#EAF5FF] flex items-center justify-center text-[#0878D1] border border-[#D5E9FA]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight tabular-nums">
              ₹{(stats?.pendingBalance || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-[#647C95] mt-1">
              Across {stats?.activeLoansCount || 0} active loan(s)
            </p>
          </div>

          <div className="mt-4 pt-2.5 border-t border-[#D5E9FA]/70 text-[11px] font-semibold text-[#647C95] flex items-center justify-between">
            <span>Total Lent:</span>
            <span className="font-bold text-[#183653] tabular-nums">
              ₹{(stats?.totalPrincipalLent || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Card 3: Overdue */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                {lang === 'ta' ? 'தாமத தவணைகள்' : 'Overdue'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight tabular-nums">
              {stats?.overdueCount || 0}
            </div>
            <p className="text-[11px] text-[#647C95] mt-1">
              Unpaid past due installments
            </p>
          </div>

          <div className="mt-4 pt-2.5 border-t border-[#D5E9FA]/70">
            <button
              type="button"
              onClick={() => onNavigateToList && onNavigateToList('overdue')}
              className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition flex items-center justify-center space-x-1 active:scale-95"
            >
              <span>View Overdue Loans</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Customers */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#18A879] uppercase tracking-wider">
                {lang === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Borrowers'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#18A879] border border-emerald-200">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight tabular-nums">
              {stats?.customersCount || 0}
            </div>
            <p className="text-[11px] text-[#647C95] mt-1">
              Registered EMI borrowers
            </p>
          </div>

          <div className="mt-4 pt-2.5 border-t border-[#D5E9FA]/70">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToCustomers) onNavigateToCustomers();
                else if (onNavigateToList) onNavigateToList('all');
              }}
              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#18A879] text-xs font-bold transition flex items-center justify-center space-x-1 active:scale-95"
            >
              <span>View Customer Directory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Wired Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterChip('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
            filterChip === 'all'
              ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-sm'
              : 'bg-white/85 text-[#183653] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
          }`}
        >
          <span>{lang === 'ta' ? 'அனைத்து விவரம்' : 'All Overview'}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterChip('due_today')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
            filterChip === 'due_today'
              ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-sm'
              : 'bg-white/85 text-[#183653] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              filterChip === 'due_today' ? 'bg-white' : 'bg-[#0878D1]'
            }`}
          />
          <span>Due Today ({stats?.todayDueCount || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterChip('overdue')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
            filterChip === 'overdue'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white/85 text-[#183653] hover:bg-rose-50 border border-[#D5E9FA]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              filterChip === 'overdue' ? 'bg-white' : 'bg-rose-500'
            }`}
          />
          <span>Overdue List ({stats?.overdueCount || 0})</span>
        </button>
      </div>

      {/* Conditional Views Based on Wired Filter Chip */}
      {filterChip === 'due_today' ? (
        /* Focused Due Today List */
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#183653]">
                {lang === 'ta' ? 'இன்று செலுத்த வேண்டிய தவணைகள்' : 'Installments Due Today'}
              </h3>
              <p className="text-xs text-[#647C95]">
                Tap collect or send 1-click WhatsApp notice
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToList && onNavigateToList('due_today')}
              className="text-xs font-bold text-[#0878D1] hover:underline"
            >
              Open Full Schedule →
            </button>
          </div>

          {todayDueList.length === 0 ? (
            <div className="py-10 text-center text-[#647C95] text-xs">
              <CheckCircle className="w-8 h-8 text-[#18A879] mx-auto mb-2" />
              <p className="font-bold text-[#183653]">No installments due today!</p>
              <p>All scheduled EMI collections for today are cleared.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayDueList.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onViewLoan && onViewLoan(item.loanId)}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white/80 hover:bg-[#EAF5FF]/60 border border-[#D5E9FA] transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#183653]">{item.customerName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] font-bold border border-[#D5E9FA]">
                        EMI #{item.installmentNo}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#647C95]">
                      {item.emiNo} • {item.customerArea} {item.customerPhone ? `• ${item.customerPhone}` : ''}
                    </p>
                  </div>

                  <div
                    className="flex items-center space-x-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-right mr-1">
                      <div className="text-sm font-black text-[#183653] tabular-nums">
                        ₹{Number(item.pendingAmount || item.amount).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-[#0878D1] font-bold">Due today</span>
                    </div>

                    {item.customerPhone && (
                      <>
                        <a
                          href={`tel:${item.customerPhone}`}
                          className="p-2 rounded-xl bg-[#EAF5FF] hover:bg-[#D5E9FA] text-[#0878D1] transition"
                          title="Call Customer"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = generateEMIWhatsAppMessage({
                              type: 'due_today',
                              customerName: item.customerName,
                              emiNo: item.emiNo,
                              installmentNo: item.installmentNo,
                              amount: item.pendingAmount || item.amount,
                              lang,
                            });
                            openWhatsApp(item.customerPhone, msg);
                          }}
                          title="Send WhatsApp notice"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#18A879] transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenCollectModal && onOpenCollectModal(item)}
                      className="px-3.5 py-2 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      Collect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filterChip === 'overdue' ? (
        /* Focused Overdue List */
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <div>
                <h3 className="text-sm font-black text-[#183653]">
                  {lang === 'ta' ? 'நிலுவையில் உள்ள EMI தவணைகள்' : 'Overdue EMI Installments'}
                </h3>
                <p className="text-xs text-[#647C95]">
                  Past-due installments requiring follow-up
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToList && onNavigateToList('overdue')}
              className="text-xs font-bold text-[#0878D1] hover:underline"
            >
              Open Full Overdue Portfolio →
            </button>
          </div>

          {overdueList.length === 0 ? (
            <div className="py-10 text-center text-[#647C95] text-xs">
              <CheckCircle className="w-8 h-8 text-[#18A879] mx-auto mb-2" />
              <p className="font-bold text-[#183653]">Zero overdue installments!</p>
              <p>All active EMI borrowers are up to date.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdueList.map((od, i) => (
                <div
                  key={i}
                  onClick={() => onViewLoan && onViewLoan(od.loanId)}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50/60 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#183653]">{od.customerName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                        EMI #{od.installmentNo}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#647C95]">
                      {od.emiNo} • Due: {od.dueDate ? new Date(od.dueDate).toLocaleDateString('en-IN') : '-'}
                    </p>
                  </div>

                  <div
                    className="flex items-center space-x-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-sm font-black text-rose-600 tabular-nums mr-1">
                      ₹{Number(od.pendingAmount || od.amount).toLocaleString('en-IN')}
                    </span>

                    {od.customerPhone && (
                      <>
                        <a
                          href={`tel:${od.customerPhone}`}
                          className="p-2 rounded-xl bg-white hover:bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] transition"
                          title="Call Customer"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
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
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#18A879] transition"
                          title="Send Overdue WhatsApp Reminder"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenCollectModal && onOpenCollectModal(od)}
                      className="px-3.5 py-2 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      Collect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Full All Overview Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column (2 Cols): Weekly Collections Chart & Due Today */}
          <div className="lg:col-span-2 space-y-5">
            {/* Weekly Collection Trends Chart (Ocean Blue Theme) */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-[#183653]">
                    {lang === 'ta' ? 'வாராந்திர வசூல் போக்கு' : 'Weekly EMI Collections'}
                  </h3>
                  <p className="text-xs text-[#647C95]">Last 7 days collection performance</p>
                </div>
                <span className="text-xs font-bold text-[#0878D1] bg-[#EAF5FF] px-2.5 py-1 rounded-full border border-[#D5E9FA]">
                  7-Day Inflow
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.weeklyChart || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D5E9FA" />
                    <XAxis dataKey="day" stroke="#647C95" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#647C95"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collected']}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        borderRadius: '14px',
                        border: '1px solid #D5E9FA',
                        boxShadow: '0 8px 24px rgba(8, 120, 209, 0.12)',
                        fontSize: '12px',
                        color: '#183653',
                      }}
                    />
                    <Bar dataKey="amount" fill="#0878D1" radius={[8, 8, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Today's Due Installments Table */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-[#183653]">
                    {lang === 'ta' ? 'இன்று செலுத்த வேண்டிய தவணைகள்' : 'Installments Due Today'}
                  </h3>
                  <p className="text-xs text-[#647C95]">Tap collect or send 1-click WhatsApp notice</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToList && onNavigateToList('active')}
                  className="text-xs font-bold text-[#0878D1] hover:text-[#064B8E]"
                >
                  View all loans →
                </button>
              </div>

              {todayDueList.length === 0 ? (
                <div className="py-8 text-center text-[#647C95] text-xs">
                  <CheckCircle className="w-8 h-8 text-[#18A879] mx-auto mb-2" />
                  <p className="font-bold text-[#183653]">No installments due today!</p>
                  <p>All scheduled collections for today are cleared.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayDueList.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onViewLoan && onViewLoan(item.loanId)}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/80 hover:bg-[#EAF5FF]/60 border border-[#D5E9FA] transition cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-[#183653]">{item.customerName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] font-bold">
                            #{item.installmentNo}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647C95]">
                          {item.emiNo} • {item.customerArea}
                        </p>
                      </div>

                      <div
                        className="flex items-center space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-right">
                          <div className="text-xs font-black text-[#183653] tabular-nums">
                            ₹{Number(item.pendingAmount || item.amount).toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-[#0878D1] font-bold">Due today</span>
                        </div>

                        {item.customerPhone && (
                          <button
                            type="button"
                            onClick={() => {
                              const msg = generateEMIWhatsAppMessage({
                                type: 'due_today',
                                customerName: item.customerName,
                                emiNo: item.emiNo,
                                installmentNo: item.installmentNo,
                                amount: item.pendingAmount || item.amount,
                                lang,
                              });
                              openWhatsApp(item.customerPhone, msg);
                            }}
                            title="Send WhatsApp notice"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#18A879] transition"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenCollectModal && onOpenCollectModal(item)}
                          className="px-3 py-1.5 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white text-xs font-bold shadow-xs transition active:scale-95"
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

          {/* Right Column: Top Overdue Customers & Portfolio Recovery */}
          <div className="space-y-5">
            {/* Overdue Watchlist Card */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-black text-[#183653]">
                    {lang === 'ta' ? 'நிலுவையாளர்கள்' : 'Overdue Watchlist'}
                  </h3>
                </div>
                {overdueList.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {overdueList.length} Due
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#18A879] border border-emerald-200">
                    All Clear
                  </span>
                )}
              </div>

              {overdueList.length === 0 ? (
                <div className="py-6 text-center text-[#647C95] text-xs">
                  <CheckCircle className="w-7 h-7 text-[#18A879] mx-auto mb-1" />
                  <p className="font-semibold text-[#183653]">Zero overdue loans!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {overdueList.slice(0, 6).map((od, i) => (
                    <div
                      key={i}
                      onClick={() => onViewLoan && onViewLoan(od.loanId)}
                      className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/80 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#183653] truncate">
                          {od.customerName}
                        </span>
                        <span className="text-xs font-black text-rose-600 tabular-nums">
                          ₹{Number(od.pendingAmount || od.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between text-[10px] text-[#647C95] mt-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>
                          {od.emiNo} (#{od.installmentNo})
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {od.customerPhone && (
                            <button
                              type="button"
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
                              className="p-1 rounded-lg text-[#18A879] hover:bg-emerald-100"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenCollectModal && onOpenCollectModal(od)}
                            className="px-2.5 py-1 rounded-lg bg-[#18A879] hover:bg-[#138861] text-white font-bold transition"
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

            {/* Portfolio Recovery Summary Card */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#183653] uppercase tracking-wider">
                  {lang === 'ta' ? 'வசூல் நிலை' : 'Portfolio Recovery'}
                </h4>
                <span className="text-xs font-black text-[#0878D1] tabular-nums">
                  {recoveryPct}%
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-[#EAF5FF] overflow-hidden border border-[#D5E9FA]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0878D1] to-[#18A879] transition-all duration-500"
                  style={{ width: `${recoveryPct}%` }}
                />
              </div>

              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between text-[#647C95]">
                  <span>Total Collected:</span>
                  <span className="font-bold text-[#18A879] tabular-nums">
                    ₹{totalCollected.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#647C95]">
                  <span>Total Payable:</span>
                  <span className="font-bold text-[#183653] tabular-nums">
                    ₹{totalPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Owner-only Clear All Sample / Test EMI Data Confirmation Modal */}
      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#183653]/60 backdrop-blur-sm"
          onClick={() => !clearing && setShowClearModal(false)}
        >
          <div
            className="max-w-md w-full rounded-3xl p-6 bg-white border border-[#D5E9FA] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D5E9FA] pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-[#183653]">
                  Clear All EMI Data / EMI தரவுகளை அழி
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="p-1 rounded-lg text-[#647C95] hover:text-[#183653]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#647C95] leading-relaxed">
              This will permanently remove all existing EMI accounts, sample borrowers, and EMI collection receipts from the EMI database so you can start with a clean EMI ledger. Regular Daily/Weekly/Monthly loans will not be affected.
            </p>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                disabled={clearing}
                onClick={() => setShowClearModal(false)}
                className="flex-1 h-10 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={handleClearEMIData}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition"
              >
                {clearing ? 'Clearing...' : 'Confirm Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMIDashboard;
