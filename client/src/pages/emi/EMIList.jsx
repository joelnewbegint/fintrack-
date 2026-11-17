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
  ChevronRight,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  User,
} from 'lucide-react';
import { openWhatsApp, generateEMIWhatsAppMessage } from '../../utils/emiWhatsapp';

export const EMIList = ({
  initialTab = 'active',
  onViewLoan,
  onOpenNewLoan,
  onOpenCollectModal,
}) => {
  const { user, isOwner } = useAuth();
  const { lang } = useLanguage();

  const [activeTab, setActiveTab] = useState(initialTab); // 'active' | 'overdue' | 'completed' | 'all'
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ active: 0, overdue: 0, completed: 0, all: 0 });

  const fetchLoans = async () => {
    try {
      setLoading(true);
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
        setCounts({
          all: all.length,
          active: all.filter(l => l.status === 'active').length,
          overdue: all.filter(l => l.status === 'overdue').length,
          completed: all.filter(l => l.status === 'completed' || l.status === 'foreclosed').length,
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

  const handleExportExcel = () => {
    const url = `${api.getApiBaseUrl()}/api/emi/export/excel`;
    window.open(url, '_blank');
  };

  // Distinct areas for filter dropdown
  const uniqueAreas = Array.from(new Set(loans.map(l => l.customerArea).filter(Boolean)));

  return (
    <div
      className="space-y-5 pb-12 -mx-2 sm:-mx-4 lg:-mx-6 px-3 sm:px-6 py-4 rounded-3xl"
      style={{
        background: 'linear-gradient(180deg, #FFF8F5 0%, #FFF3EC 60%, #F8FAFD 100%)',
      }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
              மாத தவணை பட்டியல்
            </span>
            <span className="text-xs text-slate-500 font-medium">Monthly Installment Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1">
            {lang === 'ta' ? 'EMI வாடிக்கையாளர் பட்டியல்' : 'EMI Borrowers Portfolio'}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="h-10 px-3.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-emerald-700 transition flex items-center space-x-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={onOpenNewLoan}
            className="h-10 px-4 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center space-x-1.5 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              boxShadow: '0 6px 16px -2px rgba(249, 115, 22, 0.35)',
            }}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New EMI Loan</span>
          </button>
        </div>
      </div>

      {/* Tabs Row (Active / Overdue / Done / All) with Count Badges */}
      <div className="flex items-center space-x-2 border-b border-orange-100 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'active'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white/70 text-slate-600 hover:bg-white border border-slate-200/70'
          }`}
        >
          <span>Active / நடப்பு</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {counts.active}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'overdue'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-white/70 text-slate-600 hover:bg-white border border-slate-200/70'
          }`}
        >
          <span>Overdue / நிலுவை</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'overdue' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'}`}>
            {counts.overdue}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white/70 text-slate-600 hover:bg-white border border-slate-200/70'
          }`}
        >
          <span>Completed / முடிந்தது</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white/70 text-slate-600 hover:bg-white border border-slate-200/70'
          }`}
        >
          <span>All / அனைத்தும்</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {counts.all}
          </span>
        </button>
      </div>

      {/* Search & Area Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-orange-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone or EMI no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl bg-white/90 border border-orange-200/80 text-slate-800 text-xs font-medium outline-none focus:border-orange-500 shadow-sm"
          />
        </div>

        {uniqueAreas.length > 0 && (
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="h-11 px-3 rounded-xl bg-white/90 border border-orange-200/80 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 shadow-sm"
          >
            <option value="all">📍 All Areas / அனைத்து பகுதிகள்</option>
            {uniqueAreas.map((area, idx) => (
              <option key={idx} value={area}>
                {area}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Borrowers Cards Grid (Stacked on mobile, 2-cols on tablet/desktop) */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading EMI loan records...</p>
        </div>
      ) : loans.length === 0 ? (
        <div className="py-16 text-center bg-white/60 rounded-3xl border border-dashed border-slate-300">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No EMI loans found</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search or add a new EMI loan.</p>
          <button
            onClick={onOpenNewLoan}
            className="mt-4 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow transition active:scale-95"
          >
            + Sanction First EMI Loan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {loans.map((loan) => {
            const paidCount = (loan.schedule || []).filter(s => s.status === 'paid').length;
            const totalCount = loan.tenureMonths || (loan.schedule || []).length || 12;
            const progress = Math.min(100, Math.round((paidCount / totalCount) * 100));

            const isOverdue = loan.status === 'overdue';
            const isCompleted = loan.status === 'completed' || loan.status === 'foreclosed';

            return (
              <div
                key={loan._id}
                className="rounded-2xl p-4 sm:p-5 border transition hover:shadow-md relative group flex flex-col justify-between"
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(16px)',
                  borderColor: isOverdue ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 8px 20px -6px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div>
                  {/* Card Header: Name, Area, Status Pill */}
                  <div className="flex items-start justify-between mb-2">
                    <div
                      onClick={() => onViewLoan && onViewLoan(loan._id)}
                      className="cursor-pointer flex-1 pr-2"
                    >
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition flex items-center space-x-1.5">
                        <span>{loan.customerName}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {loan.emiNo} • 📍 {loan.customerArea || 'Tamil Nadu'}
                      </p>
                    </div>

                    {/* Status Pill */}
                    {isCompleted ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        Completed
                      </span>
                    ) : isOverdue ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Overdue</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-orange-50/40 border border-orange-100/60 my-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Monthly EMI</span>
                      <span className="text-sm font-black text-slate-900">
                        ₹{(loan.installmentAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Balance Pending</span>
                      <span className="text-sm font-black text-orange-600">
                        ₹{(loan.remainingBalance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Progress Pill: "6 of 12 paid" */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">
                        {paidCount} of {totalCount} paid / தவணை
                      </span>
                      <span className="font-mono text-slate-500">{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          background: isCompleted
                            ? '#10B981'
                            : isOverdue
                            ? '#F43F5E'
                            : '#F97316',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions: Call, WhatsApp, Collect EMI */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {/* Call icon */}
                    {loan.customerPhone && (
                      <a
                        href={`tel:${loan.customerPhone}`}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Call Customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* WhatsApp icon */}
                    {loan.customerPhone && (
                      <button
                        onClick={() => {
                          const nextInst = (loan.schedule || []).find(s => s.status !== 'paid') || {};
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
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                        title="Send WhatsApp notice"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onViewLoan && onViewLoan(loan._id)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                    >
                      Detail
                    </button>

                    {!isCompleted && (
                      <button
                        onClick={() => onOpenCollectModal && onOpenCollectModal({ loanId: loan._id, ...loan })}
                        className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition active:scale-95"
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

