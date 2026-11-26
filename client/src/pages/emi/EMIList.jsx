import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Search,
  Plus,
  Phone,
  MessageCircle,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Trash2,
} from 'lucide-react';
import { openWhatsApp, generateEMIWhatsAppMessage } from '../../utils/emiWhatsapp';

export const EMIList = ({
  initialTab = 'active',
  initialSearch = '',
  onViewLoan,
  onOpenNewLoan,
  onOpenCollectModal,
}) => {
  const { isOwner } = useAuth();
  const { lang } = useLanguage();

  const [activeTab, setActiveTab] = useState(initialTab); // 'due_today' | 'active' | 'overdue' | 'completed' | 'all'
  const [search, setSearch] = useState(initialSearch);
  const [areaFilter, setAreaFilter] = useState('all');
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [counts, setCounts] = useState({ due_today: 0, active: 0, overdue: 0, completed: 0, all: 0 });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSearch(initialSearch || '');
  }, [initialSearch]);

  const fetchLoans = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getEMILoans({
        status: activeTab === 'all' ? undefined : activeTab,
        search: search.trim() || undefined,
        area: areaFilter === 'all' ? undefined : areaFilter,
      });

      if (res.success) {
        setLoans(res.loans || []);
      }
    } catch (e) {
      console.warn('EMI List fetch note:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const allRes = await api.getEMILoans({});
      if (allRes.success) {
        const all = allRes.loans || [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const dueTodayCount = all.filter((l) =>
          (l.schedule || []).some((s) => {
            const d = new Date(s.dueDate);
            return d >= todayStart && d <= todayEnd && s.status !== 'paid';
          })
        ).length;

        setCounts({
          all: all.length,
          due_today: dueTodayCount,
          active: all.filter((l) => l.status === 'active').length,
          overdue: all.filter((l) => l.status === 'overdue').length,
          completed: all.filter((l) => l.status === 'completed' || l.status === 'foreclosed').length,
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLoans();
  }, [activeTab, search, areaFilter]);

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      fetchLoans(true);
      fetchCounts();
    };
    window.addEventListener('fintrack:emi-updated', handleRefresh);
    return () => window.removeEventListener('fintrack:emi-updated', handleRefresh);
  }, [activeTab, search, areaFilter]);

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

  const handleDeleteLoan = async (loan) => {
    if (!isOwner) return;
    if (!window.confirm(`Delete EMI Loan ${loan.emiNo} (${loan.customerName}) and its receipts?`)) return;
    try {
      await api.deleteEMILoan(loan._id);
      await fetchLoans(false);
      await fetchCounts();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
      }
    } catch (e) {
      alert(e.message || 'Failed to delete EMI loan');
    }
  };

  const uniqueAreas = Array.from(new Set(loans.map((l) => l.customerArea).filter(Boolean)));

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] text-xs font-bold border border-[#D5E9FA]">
              மாத தவணை பட்டியல்
            </span>
            <span className="text-xs text-[#647C95] font-medium">Monthly Installment Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight mt-1">
            {lang === 'ta' ? 'EMI வாடிக்கையாளர் பட்டியல்' : 'EMI Accounts Portfolio'}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="h-10 px-3.5 rounded-xl bg-white/85 hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653] hover:text-[#18A879] transition flex items-center space-x-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#18A879]" />
            <span>{exporting ? 'Exporting...' : 'Excel Export'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewLoan}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#0988ED] hover:to-[#085BAA] font-bold text-xs text-white shadow-md shadow-[#0878D1]/25 transition flex items-center space-x-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New EMI Loan</span>
          </button>
        </div>
      </div>

      {/* Tabs Row (Ocean Blue Glass Theme) */}
      <div className="flex items-center space-x-2 border-b border-[#D5E9FA] pb-2.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('due_today')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'due_today'
              ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-sm'
              : 'bg-white/80 text-[#647C95] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Due Today / இன்று</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'due_today' ? 'bg-white/25 text-white' : 'bg-[#EAF5FF] text-[#0878D1]'
            }`}
          >
            {counts.due_today}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-sm'
              : 'bg-white/80 text-[#647C95] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
          }`}
        >
          <span>Active / நடப்பு</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'active' ? 'bg-white/25 text-white' : 'bg-[#EAF5FF] text-[#0878D1]'
            }`}
          >
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white/80 text-[#647C95] hover:bg-rose-50 border border-[#D5E9FA]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue / நிலுவை</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {counts.overdue}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'completed'
              ? 'bg-[#18A879] text-white shadow-sm'
              : 'bg-white/80 text-[#647C95] hover:bg-emerald-50 border border-[#D5E9FA]'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Paid / முடிந்தது</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-[#18A879]'
            }`}
          >
            {counts.completed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'all'
              ? 'bg-[#183653] text-white shadow-sm'
              : 'bg-white/80 text-[#647C95] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
          }`}
        >
          <span>All / அனைத்தும்</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'all' ? 'bg-white/25 text-white' : 'bg-slate-100 text-[#183653]'
            }`}
          >
            {counts.all}
          </span>
        </button>
      </div>

      {/* Search & Area Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#0878D1]" />
          <input
            type="text"
            placeholder="Search by customer name, phone or EMI no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl bg-white/90 border border-[#D5E9FA] text-[#183653] text-xs font-semibold outline-none focus:border-[#0878D1] shadow-xs"
          />
        </div>

        {uniqueAreas.length > 0 && (
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="h-11 px-3 rounded-xl bg-white/90 border border-[#D5E9FA] text-xs font-bold text-[#183653] outline-none focus:border-[#0878D1] shadow-xs"
          >
            <option value="all">All Areas / அனைத்து பகுதிகள்</option>
            {uniqueAreas.map((area, idx) => (
              <option key={idx} value={area}>
                {area}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Borrowers Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-[#647C95]">
          <div className="w-8 h-8 border-4 border-[#0878D1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-[#183653]">Loading EMI loan records...</p>
        </div>
      ) : loans.length === 0 ? (
        <div className="py-16 text-center glass-card border-dashed border-[#D5E9FA]">
          <User className="w-10 h-10 text-[#647C95]/40 mx-auto mb-2" />
          <p className="text-sm font-bold text-[#183653]">No EMI loans found</p>
          <p className="text-xs text-[#647C95] mt-1">
            Try clearing your search or create a new EMI loan.
          </p>
          <button
            type="button"
            onClick={onOpenNewLoan}
            className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white text-xs font-bold shadow transition active:scale-95"
          >
            + Sanction New EMI Loan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {loans.map((loan) => {
            const paidCount = (loan.schedule || []).filter((s) => s.status === 'paid').length;
            const totalCount = loan.tenureMonths || (loan.schedule || []).length || 12;
            const progress = Math.min(100, Math.round((paidCount / totalCount) * 100));

            const isOverdue = loan.status === 'overdue';
            const isCompleted = loan.status === 'completed' || loan.status === 'foreclosed';

            return (
              <div
                key={loan._id}
                className={`glass-card glass-hover p-4 sm:p-5 flex flex-col justify-between ${
                  isOverdue ? 'border-rose-300' : 'border-[#D5E9FA]'
                }`}
              >
                <div>
                  {/* Card Header: Name, Area, Status Pill */}
                  <div className="flex items-start justify-between mb-2">
                    <div
                      onClick={() => onViewLoan && onViewLoan(loan._id)}
                      className="cursor-pointer flex-1 pr-2"
                    >
                      <h3 className="text-sm font-black text-[#183653] hover:text-[#0878D1] transition flex items-center space-x-1.5">
                        <span>{loan.customerName}</span>
                      </h3>
                      <p className="text-[11px] text-[#647C95]">
                        {loan.emiNo} • {loan.customerArea || 'Tamil Nadu'}
                      </p>
                    </div>

                    {isCompleted ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#18A879] text-[10px] font-bold border border-emerald-200">
                        Completed
                      </span>
                    ) : isOverdue ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Overdue</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] text-[10px] font-bold border border-[#D5E9FA]">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F3F9FF] border border-[#D5E9FA] my-3">
                    <div>
                      <span className="text-[10px] text-[#647C95] block">Monthly EMI</span>
                      <span className="text-sm font-black text-[#183653] tabular-nums">
                        ₹{(loan.installmentAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#647C95] block">Balance Pending</span>
                      <span className="text-sm font-black text-[#0878D1] tabular-nums">
                        ₹{(loan.remainingBalance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Progress Pill */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#183653]">
                        {paidCount} of {totalCount} paid / தவணை
                      </span>
                      <span className="font-mono text-[#647C95]">{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#EAF5FF] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          background: isCompleted
                            ? '#18A879'
                            : isOverdue
                            ? '#E11D48'
                            : '#0878D1',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2.5 border-t border-[#D5E9FA]/70 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {loan.customerPhone && (
                      <a
                        href={`tel:${loan.customerPhone}`}
                        className="p-2 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] transition"
                        title="Call Customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {loan.customerPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextInst = (loan.schedule || []).find((s) => s.status !== 'paid') || {};
                          const msg = generateEMIWhatsAppMessage({
                            type: isOverdue ? 'overdue' : 'due_today',
                            customerName: loan.customerName,
                            emiNo: loan.emiNo,
                            installmentNo: nextInst.installmentNo || 1,
                            amount: loan.installmentAmount,
                            remainingBalance: loan.remainingBalance,
                            lang,
                          });
                          openWhatsApp(loan.customerPhone, msg);
                        }}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#18A879] transition"
                        title="Send WhatsApp notice"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLoan(loan)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        title="Delete EMI Loan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => onViewLoan && onViewLoan(loan._id)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#0878D1] hover:bg-[#EAF5FF] transition"
                    >
                      Schedule
                    </button>

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => onOpenCollectModal && onOpenCollectModal({ loanId: loan._id, ...loan })}
                        className="px-3.5 py-1.5 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white text-xs font-bold shadow-xs transition active:scale-95"
                      >
                        Collect ₹{Number(loan.installmentAmount).toLocaleString('en-IN')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EMIList;
