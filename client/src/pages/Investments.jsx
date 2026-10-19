import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate } from '../utils/currency';
import InvestmentModal from '../components/common/InvestmentModal';
import StatCard from '../components/common/StatCard';
import {
  Landmark,
  Plus,
  ArrowDownLeft,
  Calendar,
  Wallet,
  TrendingUp,
  Percent,
  Trash2,
  Search,
  CheckCircle,
  Clock,
  Briefcase,
  History,
} from 'lucide-react';

export const Investments = ({ onOpenNewInvestment }) => {
  const { t, lang } = useLanguage();
  const { isMobile, isTablet, isLaptop } = useDeviceMode();

  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [returnItem, setReturnItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const res = await api.getInvestments({
        status: statusFilter,
        type: typeFilter,
      });
      if (res.success) {
        setInvestments(res.investments || []);
        setSummary(res.summary || {});
      }
    } catch (err) {
      console.error('Failed to load investments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, [statusFilter, typeFilter]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete investment record for ${name}?`)) {
      try {
        await api.deleteInvestment(id);
        fetchInvestments();
      } catch (err) {
        alert(err.message || 'Cannot delete investment');
      }
    }
  };

  const filteredInvestments = investments.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.investorName?.toLowerCase().includes(q) ||
      inv.phone?.includes(q) ||
      inv.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {lang === 'ta' ? 'மூலதன முதலீடுகள்' : 'Capital Investments'} / முதலீடு மேலாண்மை
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'ta'
              ? 'சொந்த மூலதனம், பங்குதாரர் முதலீடு மற்றும் வெளிக்கடன் சுழற்சி கணக்குகள்'
              : 'Promoter equity, partner capital, and borrowed wholesale credit lines ledger'}
          </p>
        </div>

        <button
          onClick={() => {
            if (onOpenNewInvestment) onOpenNewInvestment();
            else setShowAddModal(true);
          }}
          className="btn-sky-primary min-h-[44px] py-2.5 px-4 text-xs font-black shadow-lg shadow-sky-500/25 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ New Investment (I)</span>
        </button>
      </div>

      {/* 4 Summary KPI Stat Cards */}
      <div
        className={`grid ${
          isMobile ? 'grid-cols-1 gap-3' : isTablet ? 'grid-cols-2 gap-4' : 'grid-cols-4 gap-4'
        }`}
      >
        <StatCard
          title={lang === 'ta' ? 'மொத்த மூலதனம்' : 'Total Capital Invested'}
          amount={summary.totalInvested || 0}
          subtitle={`${summary.activeCount || 0} active capital sources`}
          icon={Landmark}
          gradient="from-sky-400 to-sky-600"
        />

        <StatCard
          title={lang === 'ta' ? 'சுழற்சி மூலதனம்' : 'Active Working Capital'}
          amount={summary.activeWorkingCapital || 0}
          subtitle="Net capital currently deployed"
          icon={Briefcase}
          gradient="from-emerald-400 to-teal-500"
        />

        <StatCard
          title={lang === 'ta' ? 'திரும்பப் பெறப்பட்டது' : 'Capital Returned'}
          amount={summary.totalReturned || 0}
          subtitle="Returned to investors"
          icon={ArrowDownLeft}
          gradient="from-amber-400 to-amber-500"
        />

        <StatCard
          title={lang === 'ta' ? 'கையிருப்பு ரொக்கம்' : 'Est. Cash Liquidity'}
          amount={summary.estimatedLiquidCash || 0}
          subtitle="Available for new lending"
          icon={Wallet}
          gradient="from-sky-500 to-indigo-600"
        />
      </div>

      {/* Search and Filters */}
      <div className="glass rounded-2xl p-4 border border-white/70 dark:border-sky-800/40 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-sky-500" />
          <input
            type="text"
            placeholder="Search investor, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs focus:ring-2 focus:ring-sky-400 outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">All Capital Types / அனைத்து வகை</option>
            <option value="self">Self (சொந்த மூலதனம்)</option>
            <option value="partner">Partner (பங்குதாரர்)</option>
            <option value="borrowed">Borrowed (வெளி கடன்)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">All Status / அனைத்து நிலை</option>
            <option value="active">Active (செயலில் உள்ளது)</option>
            <option value="partially_returned">Partially Returned</option>
            <option value="closed">Closed / திரும்பப் பெற்றது</option>
          </select>
        </div>
      </div>

      {/* Different Layout Setup for 3 Formats: Mobile, Tablet, Laptop */}
      {isMobile ? (
        /* Mobile Setup: Stacked Glass Cards with 48px touch targets */
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading investments...</div>
          ) : filteredInvestments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl">
              No investments found. Tap "+ New Investment" to record capital.
            </div>
          ) : (
            <>
              {filteredInvestments.slice(0, visibleCount).map((inv) => {
                const active = Math.max(0, inv.amount - (inv.totalReturned || 0));
                return (
                  <div
                    key={inv._id}
                    className="glass rounded-2xl p-4 border border-white/80 dark:border-sky-800/40 shadow-md space-y-3 min-h-[64px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {inv.investorName}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {inv.phone || 'No phone'} • Since {formatDate(inv.startDate)}
                        </p>
                      </div>

                      <span
                        className={`flex-shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                          inv.investmentType === 'self'
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : inv.investmentType === 'partner'
                            ? 'bg-teal-100 text-teal-900 border-teal-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {inv.investmentType}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-sky-100 dark:border-sky-900/40 text-center text-xs">
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[10px] text-slate-400 uppercase">Invested</p>
                        <p className="font-black tabular-nums whitespace-nowrap text-xs">{formatCurrency(inv.amount)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[10px] text-emerald-600 uppercase">Active</p>
                        <p className="font-black tabular-nums text-emerald-600 whitespace-nowrap text-xs">
                          {formatCurrency(active)}
                        </p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[10px] text-sky-600 uppercase">Interest</p>
                        <p className="font-black tabular-nums text-sky-600 whitespace-nowrap text-xs">
                          {inv.interestPercent}%
                        </p>
                      </div>
                    </div>

                    {inv.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-white/40 dark:bg-slate-900/40 p-2 rounded-xl">
                        "{inv.notes}"
                      </p>
                    )}

                    {/* Actions (48px Touch Targets) */}
                    <div className="flex items-center space-x-2 pt-1">
                      {active > 0 && (
                        <button
                          onClick={() => setReturnItem(inv)}
                          className="flex-1 min-h-[48px] btn-sky-primary text-xs font-black shadow-sm flex items-center justify-center space-x-1"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                          <span>Withdraw / திரும்பப் பெறு</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(inv._id, inv.investorName)}
                        className="min-h-[48px] min-w-[48px] px-3.5 glass hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredInvestments.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                  className="w-full py-2.5 rounded-2xl glass font-bold text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 active:scale-98 transition shadow-sm"
                >
                  Show More (+5 of {filteredInvestments.length - visibleCount} remaining)
                </button>
              )}
            </>
          )}
        </div>
      ) : isTablet ? (
        /* Tablet Setup: 2-Column Balanced Cards */
        <div className="grid grid-cols-2 gap-4">
          {filteredInvestments.map((inv) => {
            const active = Math.max(0, inv.amount - (inv.totalReturned || 0));
            return (
              <div
                key={inv._id}
                className="glass rounded-3xl p-5 border border-white/80 dark:border-sky-800/40 shadow-md flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                        {inv.investorName}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {inv.phone || 'No phone'} • Since {formatDate(inv.startDate)}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                        inv.investmentType === 'self'
                          ? 'bg-sky-100 text-sky-900 border-sky-300'
                          : inv.investmentType === 'partner'
                          ? 'bg-teal-100 text-teal-900 border-teal-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {inv.investmentType}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-sky-100 dark:border-sky-900/40 text-center my-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Invested</span>
                      <p className="font-black tabular-nums">{formatCurrency(inv.amount)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 uppercase font-bold">Active</span>
                      <p className="font-black tabular-nums text-emerald-600">
                        {formatCurrency(active)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-sky-600 uppercase font-bold">Rate</span>
                      <p className="font-black tabular-nums text-sky-600">{inv.interestPercent}%</p>
                    </div>
                  </div>

                  {inv.returns && inv.returns.length > 0 && (
                    <div className="text-[11px] text-slate-500 bg-sky-50/50 dark:bg-sky-950/40 p-2.5 rounded-2xl border border-sky-100 dark:border-sky-900/40 space-y-1">
                      <span className="font-bold text-sky-700 dark:text-sky-300 flex items-center space-x-1">
                        <History className="w-3.5 h-3.5" />
                        <span>Withdrawal History ({inv.returns.length})</span>
                      </span>
                      {inv.returns.slice(0, 2).map((r, idx) => (
                        <div key={idx} className="flex justify-between text-[10px]">
                          <span>{formatDate(r.returnDate)}</span>
                          <span className="font-bold tabular-nums text-amber-600">
                            -{formatCurrency(r.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Mode: {inv.paymentMode}
                  </span>

                  <div className="flex items-center space-x-2">
                    {active > 0 && (
                      <button
                        onClick={() => setReturnItem(inv)}
                        className="btn-sky-primary py-1.5 px-3 text-xs font-black shadow-sm flex items-center space-x-1"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Withdraw</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(inv._id, inv.investorName)}
                      className="p-1.5 rounded-xl glass hover:bg-red-50 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Laptop Setup: Full Glass Data Table */
        <div className="glass rounded-3xl overflow-hidden border border-white/70 dark:border-sky-800/40 shadow-lg">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading capital ledger...</div>
          ) : filteredInvestments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No investment records found. Click "+ New Investment" to add capital.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-sky-100 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/40 text-[11px] font-black uppercase text-sky-800 dark:text-sky-300">
                    <th className="py-3.5 px-4">Investor / Capital Source</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">Start Date</th>
                    <th className="py-3.5 px-4">Initial Capital</th>
                    <th className="py-3.5 px-4">Returned</th>
                    <th className="py-3.5 px-4">Active Balance</th>
                    <th className="py-3.5 px-4">Interest Rate</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/60 dark:divide-sky-900/30">
                  {filteredInvestments.map((inv) => {
                    const active = Math.max(0, inv.amount - (inv.totalReturned || 0));
                    return (
                      <tr
                        key={inv._id}
                        className="hover:bg-sky-50/60 dark:hover:bg-sky-950/30 transition"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 dark:text-white">
                            {inv.investorName}
                          </div>
                          {inv.phone && (
                            <div className="text-[10px] text-slate-400 font-mono">{inv.phone}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                              inv.investmentType === 'self'
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : inv.investmentType === 'partner'
                                ? 'bg-teal-100 text-teal-900 border-teal-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {inv.investmentType}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 capitalize font-semibold text-slate-600 dark:text-slate-300">
                          {inv.paymentMode}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {formatDate(inv.startDate)}
                        </td>

                        <td className="py-3.5 px-4 font-black tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(inv.amount)}
                        </td>

                        <td className="py-3.5 px-4 font-bold tabular-nums text-amber-600">
                          {formatCurrency(inv.totalReturned || 0)}
                        </td>

                        <td className="py-3.5 px-4 font-black tabular-nums text-emerald-600 text-sm">
                          {formatCurrency(active)}
                        </td>

                        <td className="py-3.5 px-4 font-bold tabular-nums text-sky-600">
                          {inv.interestPercent}% p.a.
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              inv.status === 'closed'
                                ? 'bg-slate-100 text-slate-600'
                                : inv.status === 'partially_returned'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {active > 0 && (
                              <button
                                onClick={() => setReturnItem(inv)}
                                className="btn-sky-primary py-1.5 px-3 text-xs font-bold shadow-sm flex items-center space-x-1"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>Withdraw</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(inv._id, inv.investorName)}
                              className="p-1.5 rounded-xl glass hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Return Capital Modal */}
      {(showAddModal || returnItem) && (
        <InvestmentModal
          initialReturnItem={returnItem}
          onClose={() => {
            setShowAddModal(false);
            setReturnItem(null);
          }}
          onSuccess={() => {
            fetchInvestments();
          }}
        />
      )}
    </div>
  );
};

export default Investments;
