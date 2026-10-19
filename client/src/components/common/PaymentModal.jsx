import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import api from '../../services/api';
import { formatCurrency, formatDateForInput } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { X, Check, Banknote, QrCode, Search, User, CreditCard } from 'lucide-react';

export const PaymentModal = ({ loanItem = null, onClose, onSuccess }) => {
  const { isMobile } = useDeviceMode();
  const [selectedLoan, setSelectedLoan] = useState(loanItem);
  const [activeLoansList, setActiveLoansList] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const defaultDue = selectedLoan
    ? selectedLoan.dueAmount || selectedLoan.installmentAmount || 0
    : 0;
  const remaining = selectedLoan?.remainingBalance || defaultDue;

  const [amount, setAmount] = useState(defaultDue);
  const [mode, setMode] = useState('cash');
  const [date, setDate] = useState(formatDateForInput());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If no loan was pre-selected, fetch active loans
  useEffect(() => {
    if (!loanItem) {
      setLoadingLoans(true);
      api
        .getLoans({ status: 'active' })
        .then((res) => {
          if (res.success) {
            setActiveLoansList(res.loans || []);
          }
        })
        .catch((err) => console.error('Error fetching active loans:', err))
        .finally(() => setLoadingLoans(false));
    } else {
      setSelectedLoan(loanItem);
      const due = loanItem.dueAmount || loanItem.installmentAmount || 0;
      setAmount(due);
    }
  }, [loanItem]);

  const handleSelectLoan = (loan) => {
    const formatted = {
      loanId: loan._id,
      loanNo: loan.loanNo,
      customerName: loan.customerId?.name || 'Unknown',
      customerPhone: loan.customerId?.phone || '',
      installmentAmount: loan.installmentAmount,
      dueAmount: loan.installmentAmount,
      remainingBalance: loan.remainingBalance,
      financeType: loan.financeType,
    };
    setSelectedLoan(formatted);
    setAmount(loan.installmentAmount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedLoan) {
      setError('Please select a loan account first');
      return;
    }

    const payNum = Number(amount);
    if (!payNum || payNum <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.recordPayment({
        loanId: selectedLoan.loanId || selectedLoan._id,
        amount: payNum,
        mode,
        date,
        notes,
      });

      // Celebration effect!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });

      if (onSuccess) {
        onSuccess(res.payment);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLoans = activeLoansList.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const custName = l.customerId?.name?.toLowerCase() || '';
    const custPhone = l.customerId?.phone || '';
    const loanNo = l.loanNo?.toLowerCase() || '';
    const area = l.customerId?.area?.toLowerCase() || '';
    return custName.includes(q) || custPhone.includes(q) || loanNo.includes(q) || area.includes(q);
  });

  const parsedName = parseCustomerName(
    selectedLoan?.customerName || selectedLoan?.customerId?.name
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isMobile ? 'flex-col justify-end' : 'items-center justify-center p-3 sm:p-4'
      } bg-slate-900/70 backdrop-blur-sm animate-fade-in`}
    >
      <div
        className={`glass ${
          isMobile
            ? 'rounded-t-3xl max-w-[430px] w-full max-h-[92vh] flex flex-col p-4 pb-safe'
            : 'rounded-3xl max-w-lg w-full p-5 sm:p-6 max-h-[92vh]'
        } shadow-2xl border border-white/80 dark:border-sky-800/60 overflow-y-auto`}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-sky-800/80 mx-auto mb-2 shrink-0" />
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-sky-100 dark:border-sky-900/60 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-sky-500 shrink-0" />
              <span>Record Collection / வசூல் பதிவு</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {selectedLoan
                ? `${parsedName.primary} • ${selectedLoan.loanNo}`
                : 'Select borrower loan account to collect installment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-950/60 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold shrink-0">
            {error}
          </div>
        )}

        {/* Step 1: If no loan selected, choose loan account */}
        {!selectedLoan ? (
          <div className="mt-4 space-y-3 flex-1 overflow-y-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-sky-500" />
              <input
                type="text"
                autoFocus
                placeholder="Search borrower name, phone, loan #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-base font-medium outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {loadingLoans ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading active loans...</div>
              ) : filteredLoans.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 glass rounded-2xl">
                  No active loans found matching query.
                </div>
              ) : (
                filteredLoans.map((l) => {
                  const pName = parseCustomerName(l.customerId?.name);
                  return (
                    <div
                      key={l._id}
                      onClick={() => handleSelectLoan(l)}
                      className="p-3.5 rounded-2xl glass glass-hover border border-white/80 dark:border-sky-800/40 cursor-pointer flex items-center justify-between transition-all min-h-[56px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                            {pName.primary}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-100 text-sky-800 shrink-0">
                            {l.financeType}
                          </span>
                        </div>
                        {pName.secondary && (
                          <p className="text-[10px] text-slate-400 truncate">{pName.secondary}</p>
                        )}
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {l.loanNo} • {l.customerId?.phone} {l.customerId?.area ? `• ${l.customerId.area}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black tabular-nums text-sky-600 whitespace-nowrap">
                          {formatCurrency(l.installmentAmount)}
                        </p>
                        <p className="text-[10px] text-slate-400">Installment</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Payment Entry Form */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Selected Loan Banner */}
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-black text-xs text-slate-900 dark:text-white truncate">
                    {parsedName.primary} {parsedName.secondary ? `(${parsedName.secondary})` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">
                    {selectedLoan.loanNo} • {selectedLoan.customerPhone}
                  </p>
                </div>

                {!loanItem && (
                  <button
                    type="button"
                    onClick={() => setSelectedLoan(null)}
                    className="text-xs font-bold text-sky-600 hover:underline shrink-0 ml-2"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Amount Quick-Chips (Section G: ₹100, ₹200, ₹500, 1 Due, Full) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Quick Amount Presets / தொகையை தேர்வு செய்
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[100, 200, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition min-h-[36px] ${
                        amount === preset
                          ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                          : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                  {defaultDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(defaultDue)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition min-h-[36px] ${
                        amount === defaultDue
                          ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                          : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                      }`}
                    >
                      1 Due (₹{defaultDue})
                    </button>
                  )}
                  {remaining > 0 && remaining !== defaultDue && (
                    <button
                      type="button"
                      onClick={() => setAmount(remaining)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition min-h-[36px] ${
                        amount === remaining
                          ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                          : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                      }`}
                    >
                      Full (₹{remaining})
                    </button>
                  )}
                </div>
              </div>

              {/* Amount input (Height 48px, 16px font, inputMode="numeric") */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (வசூல் தொகை ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-lg font-black text-sky-500">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-4 h-12 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white font-black text-base outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                  />
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  Collection Mode / செலுத்தும் முறை
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('cash')}
                    className={`min-h-[48px] p-2.5 rounded-2xl flex items-center justify-center space-x-2 font-black text-xs transition border ${
                      mode === 'cash'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md border-emerald-400'
                        : 'glass text-slate-600 dark:text-slate-300 hover:bg-emerald-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash / ரொக்கம்</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('upi')}
                    className={`min-h-[48px] p-2.5 rounded-2xl flex items-center justify-center space-x-2 font-black text-xs transition border ${
                      mode === 'upi'
                        ? 'bg-gradient-to-r from-sky-400 to-sky-600 text-white shadow-md border-sky-400'
                        : 'glass text-slate-600 dark:text-slate-300 hover:bg-sky-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / GPay</span>
                  </button>
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Date / ரசீது தேதி
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            {/* Sticky Action Button at Bottom (Section G) */}
            <div className="sticky bottom-0 pt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-sky-100 dark:border-sky-900/60 shrink-0">
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-sky-primary min-h-[48px] py-3 text-sm font-black shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98"
              >
                {submitting ? (
                  <span>Recording Collection...</span>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Confirm Payment / வசூல் உறுதிப்படுத்து</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
