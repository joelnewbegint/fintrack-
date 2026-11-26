import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  X,
  Wallet,
  CheckCircle,
  MessageCircle,
  Printer,
  Search,
  ArrowLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { openWhatsApp, generateEMIWhatsAppMessage } from '../../utils/emiWhatsapp';

export const CollectEMIModal = ({
  isOpen,
  loanItem,
  onClose,
  onSuccess,
}) => {
  const { lang } = useLanguage();

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [availableLoans, setAvailableLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loanSearch, setLoanSearch] = useState('');

  const [amount, setAmount] = useState(0);
  const [installmentNo, setInstallmentNo] = useState(1);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'upi' | 'cheque'
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Post-collection receipt state
  const [completedReceipt, setCompletedReceipt] = useState(null);

  const hydrateLoanForm = (item) => {
    setSelectedLoan(item);
    const nextUnpaid = Array.isArray(item.schedule)
      ? item.schedule.find((s) => s.status !== 'paid')
      : null;
    const defaultAmt =
      Number(item.pendingAmount) ||
      (nextUnpaid ? Math.max(0, (nextUnpaid.amount || 0) - (nextUnpaid.paidAmount || 0)) : 0) ||
      Number(item.installmentAmount) ||
      Number(item.amount) ||
      0;
    setAmount(defaultAmt);
    setInstallmentNo(item.installmentNo || nextUnpaid?.installmentNo || 1);
    setPenaltyAmount(item.penaltyAmount || nextUnpaid?.penaltyAmount || 0);
    setPaymentMode('cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNo('');
    setNotes('');
    setError('');
    setCompletedReceipt(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    setCompletedReceipt(null);
    setError('');
    setLoanSearch('');

    const hasValidId = loanItem && (loanItem.loanId || loanItem._id);
    if (hasValidId) {
      hydrateLoanForm(loanItem);
    } else {
      setSelectedLoan(null);
      setLoadingLoans(true);
      api
        .getEMILoans({})
        .then((res) => {
          if (res.success && Array.isArray(res.loans)) {
            const active = res.loans.filter(
              (l) => l.status !== 'completed' && l.status !== 'foreclosed' && (l.remainingBalance || 0) > 0
            );
            setAvailableLoans(active);
          } else {
            setAvailableLoans([]);
          }
        })
        .catch(() => setAvailableLoans([]))
        .finally(() => setLoadingLoans(false));
    }
  }, [isOpen, loanItem]);

  const filteredLoans = useMemo(() => {
    const q = loanSearch.trim().toLowerCase();
    if (!q) return availableLoans;
    return availableLoans.filter(
      (l) =>
        l.customerName?.toLowerCase().includes(q) ||
        l.emiNo?.toLowerCase().includes(q) ||
        l.customerPhone?.includes(q) ||
        l.customerArea?.toLowerCase().includes(q)
    );
  }, [availableLoans, loanSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const targetLoanId = selectedLoan?.loanId || selectedLoan?._id;
    if (!targetLoanId) {
      setError('Please select an EMI loan account / கடன் கணக்கை தேர்ந்தெடுக்கவும்');
      return;
    }

    if (Number(amount) <= 0) {
      setError('Please enter a valid collection amount / சரியான தொகை தேவை');
      return;
    }

    try {
      setLoading(true);
      const res = await api.recordEMIPayment({
        emiLoanId: targetLoanId,
        amount: Number(amount),
        installmentNo: Number(installmentNo),
        penaltyAmount: Number(penaltyAmount) || 0,
        mode: paymentMode,
        referenceNo: referenceNo.trim(),
        notes: notes.trim(),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      });

      if (res.success) {
        setCompletedReceipt(res.receipt);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
        }
        if (onSuccess) onSuccess(res.receipt);
      }
    } catch (err) {
      setError(err.message || 'Failed to record EMI payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isPreselected = Boolean(loanItem && (loanItem.loanId || loanItem._id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#183653]/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full rounded-3xl p-5 sm:p-6 border border-[#D5E9FA] bg-white/95 backdrop-blur-[20px] relative space-y-4 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D5E9FA] pb-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] flex items-center justify-center text-[#0878D1]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-[#183653] text-sm">
                {completedReceipt
                  ? 'EMI Payment Receipt / ரசீது'
                  : selectedLoan
                  ? 'Collect EMI / தவணை வசூல்'
                  : 'Select EMI Borrower / வாடிக்கையாளர் தேர்வு'}
              </h3>
              <p className="text-[11px] text-[#647C95]">
                {selectedLoan
                  ? `${selectedLoan.emiNo || ''} · ${selectedLoan.customerName || ''}`
                  : 'Choose an active EMI loan to record collection'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F3F9FF] hover:bg-[#EAF5FF] text-[#647C95] hover:text-[#183653] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shrink-0">
            {error}
          </div>
        )}

        {!selectedLoan ? (
          /* Step 1: Search & Pick Borrower when opened globally */
          <div className="flex-1 overflow-hidden flex flex-col space-y-3 min-h-[260px]">
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-[#0878D1] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
                placeholder="Search customer name, EMI #, phone, area..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#F3F9FF] border border-[#D5E9FA] text-xs font-semibold text-[#183653] outline-none focus:border-[#0878D1]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingLoans ? (
                <div className="py-12 text-center text-xs text-[#647C95]">
                  <div className="w-7 h-7 border-3 border-[#0878D1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading EMI accounts...
                </div>
              ) : filteredLoans.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#647C95] space-y-1">
                  <Layers className="w-8 h-8 text-[#D5E9FA] mx-auto" />
                  <p className="font-bold text-[#183653]">No active EMI accounts found</p>
                  <p>Create a New EMI Loan first to collect installments.</p>
                </div>
              ) : (
                filteredLoans.map((l) => {
                  const nextInst = (l.schedule || []).find((s) => s.status !== 'paid');
                  const dueAmt = nextInst
                    ? Math.max(0, (nextInst.amount || 0) - (nextInst.paidAmount || 0))
                    : l.installmentAmount || 0;
                  return (
                    <button
                      key={l._id}
                      type="button"
                      onClick={() => hydrateLoanForm({ loanId: l._id, ...l })}
                      className="w-full text-left p-3 rounded-2xl bg-[#F3F9FF]/70 hover:bg-[#EAF5FF] border border-[#D5E9FA] transition flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-xs text-[#183653] truncate">
                            {l.customerName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#D5E9FA] text-[#0878D1] font-bold">
                            {l.emiNo}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647C95] truncate mt-0.5">
                          {l.customerArea || 'Coimbatore'} • Bal: ₹{Number(l.remainingBalance || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className="text-xs font-black text-[#18A879] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                          ₹{Number(dueAmt).toLocaleString('en-IN')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#647C95] group-hover:text-[#0878D1]" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : completedReceipt ? (
          /* Receipt Preview State */
          <div className="space-y-4 py-1 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <CheckCircle className="w-10 h-10 text-[#18A879] mx-auto" />
              <h4 className="text-sm font-black text-emerald-900">EMI Payment Received!</h4>
              <p className="text-xs font-mono text-emerald-700 font-bold">
                {completedReceipt.receiptNo}
              </p>
              <div className="text-2xl font-black text-[#183653] mt-2 tabular-nums">
                ₹{Number(completedReceipt.amount).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-[#647C95]">
                {selectedLoan.customerName} • Mode: {completedReceipt.mode?.toUpperCase()}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {selectedLoan.customerPhone && (
                <button
                  type="button"
                  onClick={() => {
                    const msg = generateEMIWhatsAppMessage({
                      type: 'payment_received',
                      customerName: selectedLoan.customerName,
                      emiNo: selectedLoan.emiNo,
                      amount: completedReceipt.amount,
                      remainingBalance: Math.max(
                        0,
                        (selectedLoan.remainingBalance || 0) - completedReceipt.amount
                      ),
                      receiptNo: completedReceipt.receiptNo,
                      lang,
                    });
                    openWhatsApp(selectedLoan.customerPhone, msg);
                  }}
                  className="flex-1 h-11 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white text-xs font-bold shadow transition flex items-center justify-center space-x-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 px-4 rounded-xl bg-[#EAF5FF] hover:bg-[#D5E9FA] text-[#0878D1] text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white text-xs font-bold shadow"
            >
              Done / முடிந்தது
            </button>
          </div>
        ) : (
          /* Form Entry State */
          <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto pr-0.5">
            {!isPreselected && (
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="flex items-center space-x-1 text-xs font-bold text-[#0878D1] bg-[#EAF5FF] hover:bg-[#D5E9FA] px-3 py-1 rounded-xl w-fit"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Borrower</span>
              </button>
            )}

            <div className="p-3 rounded-2xl bg-[#F3F9FF] border border-[#D5E9FA] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#647C95] uppercase block">Borrower</span>
                <p className="text-sm font-black text-[#183653]">{selectedLoan.customerName}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#647C95] uppercase block">EMI #</span>
                <span className="text-xs font-black text-[#0878D1] font-mono">
                  #{installmentNo}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Collection Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border-2 border-[#D5E9FA] text-base font-black text-[#183653] bg-white focus:border-[#0878D1] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Payment Date / தேதி
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#D5E9FA] text-xs font-bold text-[#183653] bg-white focus:border-[#0878D1] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Late Fee / Penalty (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs font-bold text-rose-600 bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Payment Mode / முறை
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {['cash', 'upi', 'cheque'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMode(m)}
                      className={`h-10 rounded-xl text-[11px] font-bold uppercase transition border ${
                        paymentMode === m
                          ? 'bg-[#0878D1] text-white border-[#0878D1] shadow-xs'
                          : 'bg-[#F3F9FF] text-[#647C95] border-[#D5E9FA] hover:bg-[#EAF5FF]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {paymentMode !== 'cash' && (
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  UPI / Transaction Reference No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref # or Bank Txn ID"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs font-mono outline-none focus:border-[#0878D1]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">Notes / குறிப்பு</label>
              <input
                type="text"
                placeholder="Optional notes or remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0878D1]"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 w-full h-11 rounded-xl bg-[#18A879] hover:bg-[#138861] font-bold text-xs text-white shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {loading
                  ? 'Recording...'
                  : `Confirm & Issue Receipt ₹${Number(amount).toLocaleString('en-IN')}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CollectEMIModal;
