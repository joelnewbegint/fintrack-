import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  X,
  Wallet,
  CheckCircle,
  MessageCircle,
  Printer,
  CreditCard,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { openWhatsApp, generateEMIWhatsAppMessage } from '../../utils/emiWhatsapp';

export const CollectEMIModal = ({
  isOpen,
  loanItem,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [amount, setAmount] = useState(0);
  const [installmentNo, setInstallmentNo] = useState(1);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'upi' | 'cheque'
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Post-collection receipt state
  const [completedReceipt, setCompletedReceipt] = useState(null);

  useEffect(() => {
    if (loanItem) {
      setAmount(loanItem.installmentAmount || loanItem.amount || 0);
      setInstallmentNo(loanItem.installmentNo || 1);
      setPenaltyAmount(loanItem.penaltyAmount || 0);
      setPaymentMode('cash');
      setReferenceNo('');
      setNotes('');
      setError('');
      setCompletedReceipt(null);
    }
  }, [loanItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const targetLoanId = loanItem?.loanId || loanItem?._id;
    if (!targetLoanId) {
      setError('Invalid loan selection');
      return;
    }

    if (Number(amount) <= 0) {
      setError('Please enter a valid collection amount');
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
        paymentDate: new Date(),
      });

      if (res.success) {
        setCompletedReceipt(res.receipt);
        if (onSuccess) onSuccess(res.receipt);
      }
    } catch (err) {
      setError(err.message || 'Failed to record EMI payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !loanItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="max-w-md w-full rounded-3xl p-6 border relative space-y-4 shadow-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {completedReceipt ? 'Payment Receipt / ரசீது' : 'Collect EMI / தவணை வசூல்'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {loanItem.emiNo || loanItem.customerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {completedReceipt ? (
          /* Receipt Preview State */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black text-emerald-900">EMI Payment Received!</h4>
              <p className="text-xs font-mono text-emerald-700 font-bold">
                {completedReceipt.receiptNo}
              </p>
              <div className="text-2xl font-black text-slate-900 mt-2">
                ₹{Number(completedReceipt.amount).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500">
                {loanItem.customerName} • Mode: {completedReceipt.mode?.toUpperCase()}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {loanItem.customerPhone && (
                <button
                  type="button"
                  onClick={() => {
                    const msg = generateEMIWhatsAppMessage({
                      type: 'payment_received',
                      customerName: loanItem.customerName,
                      emiNo: loanItem.emiNo,
                      amount: completedReceipt.amount,
                      remainingBalance: Math.max(0, (loanItem.remainingBalance || 0) - completedReceipt.amount),
                      receiptNo: completedReceipt.receiptNo,
                      lang,
                    });
                    openWhatsApp(loanItem.customerPhone, msg);
                  }}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center justify-center space-x-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 rounded-xl bg-slate-800 text-white text-xs font-bold"
            >
              Done / முடிந்தது
            </button>
          </div>
        ) : (
          /* Form Entry State */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">Borrower</span>
              <p className="text-sm font-black text-slate-900">{loanItem.customerName}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Collection Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-orange-300 text-base font-black text-slate-900 bg-orange-50/40 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Late Fee / Penalty (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold text-rose-600"
                />
              </div>
            </div>

            {/* Payment Mode (Cash / UPI / Cheque) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Mode / முறை
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'upi', 'cheque'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition border ${
                      paymentMode === mode
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode !== 'cash' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UPI / Transaction Reference No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref # or Bank Txn ID"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / குறிப்பு</label>
              <input
                type="text"
                placeholder="Optional notes or remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 w-full h-11 rounded-xl font-bold text-xs text-white shadow-md transition active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                }}
              >
                {loading ? 'Recording...' : `Confirm & Issue Receipt ₹${Number(amount).toLocaleString('en-IN')}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CollectEMIModal;

