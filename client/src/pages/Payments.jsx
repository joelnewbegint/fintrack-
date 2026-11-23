import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate, formatPhoneNumber } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import ReceiptModal from '../components/common/ReceiptModal';
import PaymentModal from '../components/common/PaymentModal';
import WhatsAppPaymentHistoryModal from '../components/common/WhatsAppPaymentHistoryModal';
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
  Share2,
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
  const [whatsappHistoryItem, setWhatsappHistoryItem] = useState(null);

  const fetchPayments = async (isBackground = false) => {
    try {
      if (!isBackground && payments.length === 0) {
        setLoading(true);
      }
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
    fetchPayments(false);
    const handleSyncUpdate = () => {
      if (!showPaymentModal) {
        fetchPayments(true);
      }
    };
    window.addEventListener('fintrack:data-updated', handleSyncUpdate);
    return () => window.removeEventListener('fintrack:data-updated', handleSyncUpdate);
  }, [modeFilter, showPaymentModal]);

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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#183653] tracking-tight">
            {t('payments')} / வசூல் ரசீதுகள்
          </h1>
          <p className="text-xs text-[#647C95] mt-0.5">
            Official cash and UPI repayment audit trail with instant receipt printing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
            <div className="h-10 px-3 flex items-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold whitespace-nowrap tabular-nums">
              Cash: {formatCurrency(cashAmount)}
            </div>
            <div className="h-10 px-3 flex items-center rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] font-bold whitespace-nowrap tabular-nums">
              UPI: {formatCurrency(upiAmount)}
            </div>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="h-10 flex items-center space-x-1.5 px-4 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:opacity-95 text-white text-xs font-black shadow-md shadow-[#0878D1]/20 active:scale-95 transition whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'ta' ? '+ வசூல் பதிவு' : '+ Add Payment'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/75 backdrop-blur-[20px] rounded-2xl p-3 sm:p-4 border border-[#D5E9FA] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0878D1] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by receipt no, customer name, loan no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/75 border border-[#D5E9FA] text-xs text-[#183653] outline-none focus:ring-2 focus:ring-[#0878D1] transition"
          />
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {['all', 'cash', 'upi'].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`h-11 px-4 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center ${
                modeFilter === m
                  ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-md shadow-[#0878D1]/25 ring-1 ring-[#0878D1]'
                  : 'bg-white/75 text-[#647C95] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
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
            <div className="p-8 text-center text-xs text-[#647C95]">Loading records...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#647C95] bg-white/75 backdrop-blur-[20px] rounded-2xl border border-[#D5E9FA]">
              No payment receipts found.
            </div>
          ) : (
            <>
              {filteredPayments.slice(0, visibleCount).map((p) => {
                const nameParsed = parseCustomerName(p.customerId?.name);
                return (
                  <div
                    key={p._id}
                    className="bg-white/75 backdrop-blur-[20px] rounded-2xl p-4 border border-[#D5E9FA] shadow-sm border-l-4 border-l-[#18A879] space-y-2.5 min-h-[64px]"
                  >
                    {/* Line 1: Customer Name + Amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-[#183653] leading-tight truncate">
                          {nameParsed.primary}
                        </h4>
                        {nameParsed.secondary && (
                          <p className="text-[11px] text-[#647C95] leading-tight mt-0.5 truncate">
                            {nameParsed.secondary}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <span className="font-black tabular-nums text-base text-[#18A879] whitespace-nowrap block">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Details + Status / Mode Badge */}
                    <div className="flex items-center justify-between text-xs text-[#647C95] gap-2">
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
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-[#EAF5FF] text-[#0878D1] border-[#D5E9FA]'
                        }`}
                      >
                        {p.mode}
                      </span>
                    </div>

                    {/* Line 3: Collected By & Actions */}
                    <div className="pt-2 border-t border-[#D5E9FA] flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#647C95] truncate">
                        By: {p.collectedBy?.name || 'Owner'}
                      </span>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="h-9 px-3 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white text-xs font-bold shadow-sm flex items-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          <span>Receipt</span>
                        </button>

                        <button
                          onClick={() => setWhatsappHistoryItem({
                            customer: p.customerId,
                            loan: p.loanId,
                            payments: [p]
                          })}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-600 active:scale-95 transition"
                          title="Send via WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {isOwner && (
                          <button
                            onClick={() => handleUndoPayment(p)}
                            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-white/75 border border-[#D5E9FA] hover:bg-red-50 text-[#647C95] hover:text-red-500 transition active:scale-95"
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
                  className="w-full py-3 rounded-2xl bg-white/75 backdrop-blur-[20px] font-bold text-xs text-[#0878D1] hover:bg-[#EAF5FF] border border-[#D5E9FA] active:scale-98 transition shadow-sm"
                >
                  Show More (+5 of {filteredPayments.length - visibleCount} remaining)
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        /* Tablet & Laptop Mode: Glass Table */
        <div className="bg-white/75 backdrop-blur-[20px] rounded-3xl overflow-hidden border border-[#D5E9FA] shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#647C95]">Loading collection records...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#647C95]">No payment receipts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="border-b border-[#D5E9FA] bg-[#EAF5FF]/60 text-[10px] font-black uppercase text-[#064B8E]">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Borrower</th>
                    <th className="py-3 px-4">Loan Account</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Collected By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D5E9FA]/60">
                  {filteredPayments.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-[#EAF5FF]/40 transition"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0878D1]">
                        {p.receiptNo}
                      </td>
                      <td className="py-3 px-4 text-[#647C95]">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#183653]">
                          {p.customerId?.name}
                        </div>
                        <div className="text-[10px] text-[#647C95] font-mono">
                          {formatPhoneNumber(p.customerId?.phone)} {p.customerId?.area ? `• ${p.customerId?.area}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#183653]">{p.loanId?.loanNo}</span>
                        <span className="block text-[10px] text-[#647C95] uppercase">
                          {p.loanId?.financeType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                            p.mode === 'cash'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-[#EAF5FF] text-[#0878D1] border-[#D5E9FA]'
                          }`}
                        >
                          {p.mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-[#183653] text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-[#647C95]">
                        {p.collectedBy?.name || 'Owner'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="py-1 px-2.5 rounded-xl bg-white/75 border border-[#D5E9FA] hover:bg-[#EAF5FF] text-xs font-bold text-[#0878D1] shadow-xs flex items-center space-x-1 transition active:scale-95"
                            title="View / Print Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#0878D1]" />
                            <span>Receipt</span>
                          </button>

                          <button
                            onClick={() => setWhatsappHistoryItem({
                              customer: p.customerId,
                              loan: p.loanId,
                              payments: [p]
                            })}
                            className="p-1.5 rounded-xl bg-white/75 hover:bg-emerald-50 text-emerald-600 border border-[#D5E9FA] transition active:scale-95"
                            title="Send Receipt via WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {isOwner && (
                            <button
                              onClick={() => handleUndoPayment(p)}
                              className="p-1.5 rounded-xl bg-white/75 hover:bg-red-50 text-[#647C95] hover:text-red-500 border border-[#D5E9FA] transition"
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

      {/* WhatsApp Payment Statement Modal */}
      {whatsappHistoryItem && (
        <WhatsAppPaymentHistoryModal
          customer={whatsappHistoryItem.customer}
          loan={whatsappHistoryItem.loan}
          payments={whatsappHistoryItem.payments}
          onClose={() => setWhatsappHistoryItem(null)}
        />
      )}
    </div>
  );
};

export default Payments;
