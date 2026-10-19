import React, { useState } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDateForInput } from '../../utils/currency';
import { X, Check, Landmark, DollarSign, ArrowDownLeft, ShieldCheck } from 'lucide-react';

export const InvestmentModal = ({ onClose, onSuccess, initialReturnItem = null }) => {
  const isReturnMode = Boolean(initialReturnItem);

  // New Investment Fields
  const [investorName, setInvestorName] = useState(initialReturnItem?.investorName || '');
  const [phone, setPhone] = useState(initialReturnItem?.phone || '');
  const [amount, setAmount] = useState(initialReturnItem ? 50000 : 100000);
  const [interestPercent, setInterestPercent] = useState(0);
  const [investmentType, setInvestmentType] = useState('self');
  const [startDate, setStartDate] = useState(formatDateForInput());
  const [paymentMode, setPaymentMode] = useState('bank');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeBalance = initialReturnItem
    ? Math.max(0, initialReturnItem.amount - (initialReturnItem.totalReturned || 0))
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      if (isReturnMode) {
        if (numAmount > activeBalance) {
          setError(`Return amount cannot exceed active balance of ${formatCurrency(activeBalance)}`);
          setSubmitting(false);
          return;
        }

        await api.recordInvestmentReturn(initialReturnItem._id, {
          amount: numAmount,
          returnDate: startDate,
          paymentMode,
          notes,
        });
      } else {
        await api.createInvestment({
          investorName,
          phone,
          amount: numAmount,
          interestPercent: Number(interestPercent) || 0,
          investmentType,
          startDate,
          paymentMode,
          notes,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in max-w-[430px] sm:max-w-none mx-auto left-0 right-0">
      <div className="glass rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-white/80 dark:border-sky-800/60 max-h-[92vh] flex flex-col">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />

        <div className="flex justify-between items-center pb-3 border-b border-sky-100 dark:border-sky-900/60">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Landmark className="w-5 h-5 text-sky-500 flex-shrink-0" />
              <span className="truncate">
                {isReturnMode
                  ? 'Withdraw Capital'
                  : 'Add Capital Investment'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isReturnMode
                ? `Recording return against ${initialReturnItem.investorName}`
                : 'Track owner capital, partner equity, or borrowed fund'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-sky-100 dark:hover:bg-sky-950/60 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Active Balance Banner for Return Mode */}
          {isReturnMode && (
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Active Capital Balance</span>
                <p className="font-black text-sm text-sky-600 dark:text-sky-400 tabular-nums">
                  {formatCurrency(activeBalance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAmount(activeBalance)}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                Withdraw Full
              </button>
            </div>
          )}

          {!isReturnMode && (
            <>
              {/* Investor Name */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  Investor / Source Name (முதலீட்டாளர் பெயர்)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. K. Subramanian (Self) or Partner Name"
                  value={investorName}
                  onChange={(e) => setInvestorName(e.target.value)}
                  className="w-full px-3.5 h-12 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-medium outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Phone & Investment Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="9842100000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 h-11 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-mono outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Capital Type (வகை)
                  </label>
                  <select
                    value={investmentType}
                    onChange={(e) => setInvestmentType(e.target.value)}
                    className="w-full px-3 h-11 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="self">Self (சொந்த மூலதனம்)</option>
                    <option value="partner">Partner (பங்குதாரர்)</option>
                    <option value="borrowed">Borrowed / Wholesale (வெளி கடன்)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Capital Amount */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
              {isReturnMode ? 'Return / Withdrawal Amount (திரும்பப் பெறும் தொகை ₹)' : 'Investment Amount (முதலீட்டு தொகை ₹)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-lg font-black text-sky-500">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-9 pr-4 h-12 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white font-black text-base outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
              />
            </div>
          </div>

          {!isReturnMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Interest / Return Rate (% per annum, 0 for self)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={interestPercent}
                onChange={(e) => setInterestPercent(Number(e.target.value))}
                className="w-full px-3.5 h-11 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          )}

          {/* Payment Mode & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Channel
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 h-11 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="bank">Bank Transfer (NEFT/RTGS)</option>
                <option value="cash">Cash (ரொக்கம்)</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cheque">Cheque (காசோலை)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date (தேதி)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 h-11 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes / குறிப்புகள்
            </label>
            <input
              type="text"
              placeholder="e.g. Transferred from HDFC Bank account"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 h-11 rounded-xl glass border border-sky-200/80 dark:border-sky-800/60 text-xs outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Submit Button Sticky at Bottom */}
          <div className="sticky bottom-0 pt-3 pb-1 glass bg-white/90 dark:bg-slate-900/90">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 btn-sky-primary text-sm font-black shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>
                    {isReturnMode
                      ? 'Confirm Withdrawal'
                      : 'Save Capital Investment'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvestmentModal;
