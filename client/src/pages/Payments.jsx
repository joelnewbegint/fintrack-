import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import ReceiptModal from '../components/common/ReceiptModal';
import PaymentModal from '../components/common/PaymentModal';
import {
  Receipt,
  Search,
  Filter,
  RotateCcw,
  Printer,
  Calendar,
  Banknote,
  QrCode,
  Download,
  PlusCircle,
} from 'lucide-react';

export const Payments = () => {
  const { t, lang } = useLanguage();
  const { isOwner } = useAuth();
  const { isMobile, isTablet, isLaptop } = useDeviceMode();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments({
        mode: modeFilter,
      });
      if (res.success) {
        setPayments(res.payments);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [modeFilter]);

  const handleUndoPayment = async (payment) => {
    if (
      window.confirm(
        `Are you sure you want to undo payment ${payment.receiptNo} of ${formatCurrency(
          payment.amount
        )}? The loan balance and schedule will be restored.`
      )
    ) {
      try {
        await api.deletePayment(payment._id);
        fetchPayments();
      } catch (err) {
        alert(err.message || 'Cannot undo payment');
      }
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.receiptNo?.toLowerCase().includes(q) ||
      p.customerId?.name?.toLowerCase().includes(q) ||
      p.customerId?.phone?.includes(q) ||
      p.loanId?.loanNo?.toLowerCase().includes(q)
    );
  });

  const totalCollectedToday = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const cashAmount = filteredPayments
    .filter((p) => p.mode === 'cash')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const upiAmount = filteredPayments
    .filter((p) => p.mode === 'upi')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('payments')} / வசூல் ரசீதுகள்
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official cash and UPI repayment audit trail with instant receipt printing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold whitespace-nowrap tabular-nums">
              Cash: {formatCurrency(cashAmount)}
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold whitespace-nowrap tabular-nums">
              UPI: {formatCurrency(upiAmount)}
            </div>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'ta' ? '+ வசூல் பதிவு' : '+ Add Payment'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass rounded-2xl p-4 border border-white/70 dark:border-sky-800/40 shadow-md flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-sky-500" />
          <input
            type="text"
            placeholder="Search by receipt no, customer name, loan no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <div className="flex space-x-2">
          {['all', 'cash', 'upi'].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold uppercase transition ${
                modeFilter === m
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-300'
                  : 'glass text-slate-600 dark:text-slate-400 hover:bg-sky-50'
              }`}
            >
              {m === 'all' ? 'All Modes' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Mode: Card List */}
      {isMobile ? (
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading records...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl">
              No payment receipts found.
            </div>
          ) : (
            <>
              {filteredPayments.slice(0, visibleCount).map((p) => {
                const nameParsed = parseCustomerName(p.customerId?.name);
                return (
                  <div
                    key={p._id}
                    className="glass rounded-2xl p-4 border border-white/80 dark:border-sky-800/40 shadow-md border-l-4 border-l-emerald-500 space-y-2.5 min-h-[64px]"
                  >
                    {/* Line 1: Customer Name + Amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                          {nameParsed.primary}
                        </h4>
                        {nameParsed.secondary && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                            {nameParsed.secondary}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <span className="font-black tabular-nums text-base text-emerald-600 dark:text-emerald-400 whitespace-nowrap block">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Details + Status / Mode Badge */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                      <div className="min-w-0 flex-1 truncate font-mono text-[11px]">
                        <span>{p.receiptNo}</span>
                        <span className="mx-1">•</span>
                        <span>{p.loanId?.loanNo || 'LOAN'}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(p.date)}</span>
                      </div>

                      <span
                        className={`flex-shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                          p.mode === 'cash'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-300'
                        }`}
                      >
                        {p.mode}
                      </span>
                    </div>

                    {/* Line 3: Collected By & Actions */}
                    <div className="pt-2 border-t border-sky-100/60 dark:border-sky-900/40 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 truncate">
                        By: {p.collectedBy?.name || 'Owner'}
                      </span>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="btn-sky-primary min-h-[44px] py-1.5 px-3 text-xs font-bold shadow-sm flex items-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          <span>Receipt</span>
                        </button>

                        {isOwner && (
                          <button
                            onClick={() => handleUndoPayment(p)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass hover:bg-red-50 text-slate-400 hover:text-red-500 transition active:scale-95"
                            title="Undo Payment"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Show more button if list is long */}
              {filteredPayments.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                  className="w-full py-3 rounded-2xl glass font-bold text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 active:scale-98 transition shadow-sm"
                >
                  Show More (+5 of {filteredPayments.length - visibleCount} remaining)
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        /* Tablet & Laptop Mode: Glass Table */
        <div className="glass rounded-3xl overflow-hidden border border-white/70 dark:border-sky-800/40 shadow-lg">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading collection records...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No payment receipts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="border-b border-sky-100 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/40 text-[10px] font-black uppercase text-sky-800 dark:text-sky-300">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Borrower</th>
                    <th className="py-3 px-4">Loan Account</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Collected By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/60 dark:divide-sky-900/30">
                  {filteredPayments.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-sky-50/60 dark:hover:bg-sky-950/30 transition"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {p.receiptNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.customerId?.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.customerId?.phone} {p.customerId?.area ? `• ${p.customerId?.area}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">{p.loanId?.loanNo}</span>
                        <span className="block text-[10px] text-slate-400 uppercase">
                          {p.loanId?.financeType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                            p.mode === 'cash'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-sky-100 text-sky-900 border-sky-300'
                          }`}
                        >
                          {p.mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black tabular-nums text-slate-900 dark:text-white text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.collectedBy?.name || 'Owner'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="btn-sky-secondary py-1 px-2.5 text-xs font-bold shadow-sm flex items-center space-x-1"
                            title="View / Print Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-sky-600" />
                            <span>Receipt</span>
                          </button>

                          {isOwner && (
                            <button
                              onClick={() => handleUndoPayment(p)}
                              className="p-1.5 rounded-xl glass hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                              title="Undo / Reverse Payment"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          payment={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Global / Standalone Record Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          loanItem={null}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchPayments();
          }}
        />
      )}
    </div>
  );
};

export default Payments;
