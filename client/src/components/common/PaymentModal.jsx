import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import api from '../../services/api';
import { formatCurrency, formatDateForInput, formatDate } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { openWhatsApp, generateReceiptMessage } from '../../utils/whatsapp';
import {
  X,
  Check,
  Banknote,
  QrCode,
  Search,
  User,
  CreditCard,
  Coffee,
  AlertCircle,
  Calculator,
  Sparkles,
  RefreshCw,
  Printer,
  Share2,
  CheckCircle,
  TrendingDown,
  Calendar,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const PaymentModal = ({ loanItem = null, onClose, onSuccess }) => {
  const { isMobile } = useDeviceMode();
  const [selectedLoan, setSelectedLoan] = useState(loanItem);
  const [fullLoanData, setFullLoanData] = useState(null);
  const [activeLoansList, setActiveLoansList] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial payment amount from selected loan
  const initialDue =
    loanItem?.dueAmount ||
    loanItem?.installmentAmount ||
    0;

  const [amount, setAmount] = useState(initialDue);
  const [mode, setMode] = useState('cash');
  const [date, setDate] = useState(formatDateForInput());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [entryMode, setEntryMode] = useState('payment'); // 'payment' | 'holiday'
  const [holidayType, setHolidayType] = useState('holiday'); // 'holiday' | 'missed'
  const [holidayReason, setHolidayReason] = useState('');
  const [recordedPayment, setRecordedPayment] = useState(null);

  // If no loan was pre-selected, fetch active loans list
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

  // Fetch real-time loan details from server whenever selectedLoan changes
  useEffect(() => {
    const loanId = selectedLoan?.loanId || selectedLoan?._id;
    if (!loanId) return;

    let isMounted = true;
    setLoadingDetails(true);
    api
      .getLoanById(loanId)
      .then((res) => {
        if (isMounted && res.success && res.loan) {
          setFullLoanData(res.loan);
          // If amount is not set or zero, pre-fill with installment amount
          if (!amount || amount === 0) {
            const inst = res.loan.installmentAmount || res.loan.dueAmount || 0;
            if (inst > 0) setAmount(inst);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch full loan details:', err))
      .finally(() => {
        if (isMounted) setLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLoan?.loanId, selectedLoan?._id]);

  const handleSelectLoan = (loan) => {
    const cust = loan.customerId || {};
    const formatted = {
      loanId: loan._id,
      _id: loan._id,
      loanNo: loan.loanNo,
      customerName: cust.name || 'Unknown',
      customerPhone: cust.phone || '',
      customerArea: cust.area || '',
      principal: loan.principal,
      totalPayable: loan.totalPayable,
      totalCollected: loan.totalCollected || 0,
      remainingBalance: loan.remainingBalance,
      installmentAmount: loan.installmentAmount,
      dueAmount: loan.installmentAmount,
      financeType: loan.financeType,
      duration: loan.duration,
    };
    setSelectedLoan(formatted);
    setFullLoanData(loan);
    setAmount(loan.installmentAmount || 0);
  };

  // ---------------------------------------------------------------------------
  // Dynamic Financial Calculations
  // ---------------------------------------------------------------------------
  const totalPayable =
    fullLoanData?.totalPayable ??
    selectedLoan?.totalPayable ??
    (selectedLoan?.principal ? Number(selectedLoan.principal) : 0);

  const totalCollected =
    fullLoanData?.totalCollected ??
    selectedLoan?.totalCollected ??
    0;

  const currentBalance =
    fullLoanData?.remainingBalance !== undefined
      ? Number(fullLoanData.remainingBalance)
      : selectedLoan?.remainingBalance !== undefined
      ? Number(selectedLoan.remainingBalance)
      : totalPayable > 0
      ? Math.max(0, totalPayable - totalCollected)
      : selectedLoan?.dueAmount || selectedLoan?.installmentAmount || 0;

  const installmentAmt =
    fullLoanData?.installmentAmount ||
    selectedLoan?.installmentAmount ||
    selectedLoan?.dueAmount ||
    200;

  const duration = fullLoanData?.duration || selectedLoan?.duration || 100;
  const financeType = fullLoanData?.financeType || selectedLoan?.financeType || 'daily';

  const payNum = Math.max(0, Number(amount) || 0);

  // Balance After Payment
  const balanceAfterPayment = Math.max(0, currentBalance - payNum);

  // Progress Percentages
  const currentProgressPct =
    totalPayable > 0 ? Math.min(100, Math.round((totalCollected / totalPayable) * 100)) : 0;
  const newProgressPct =
    totalPayable > 0
      ? Math.min(100, Math.round(((totalCollected + payNum) / totalPayable) * 100))
      : 0;

  // Remaining dues count
  const remainingDuesCount = installmentAmt > 0 ? Math.ceil(balanceAfterPayment / installmentAmt) : 0;

  const isFullSettlement = payNum > 0 && payNum >= currentBalance && currentBalance > 0;
  const isOverpaying = payNum > currentBalance && currentBalance > 0;

  // Customer name parsing
  const rawCustomerName =
    selectedLoan?.customerName ||
    selectedLoan?.customerId?.name ||
    fullLoanData?.customerId?.name ||
    '';
  const parsedName = parseCustomerName(rawCustomerName);

  const customerPhone =
    selectedLoan?.customerPhone ||
    selectedLoan?.customerId?.phone ||
    fullLoanData?.customerId?.phone ||
    '';

  const customerArea =
    selectedLoan?.customerArea ||
    selectedLoan?.customerId?.area ||
    fullLoanData?.customerId?.area ||
    '';

  // ---------------------------------------------------------------------------
  // Submission Handlers
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedLoan) {
      setError('Please select a loan account first / கடன் கணக்கைத் தேர்ந்தெடுக்கவும்');
      return;
    }

    if (!payNum || payNum <= 0) {
      setError('Please enter a valid payment amount / சரியான வசூல் தொகை தேவை');
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
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.65 },
        });
      } catch (e) {}

      // Broadcast update across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }

      setRecordedPayment({
        ...(res.payment || {}),
        amount: payNum,
        receiptNo: res.payment?.receiptNo || `RCP-${Date.now().toString().slice(-6)}`,
        remainingBalance: balanceAfterPayment,
        customerName: rawCustomerName,
        customerPhone,
        customerArea,
        loanNo: selectedLoan.loanNo,
        financeType,
        date,
        mode,
      });

      if (onSuccess) {
        onSuccess(res.payment || { loanId: selectedLoan.loanId, amount: payNum, remainingBalance: balanceAfterPayment });
      }
    } catch (err) {
      setError(err.message || 'Payment recording failed / வசூல் பதிவு தோல்வி');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedLoan) {
      setError('Please select a loan account first');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.declareLoanHoliday(selectedLoan.loanId || selectedLoan._id, {
        date,
        type: holidayType,
        reason: holidayReason || (holidayType === 'missed' ? 'Missed Collection / தவறிய நாள்' : 'Holiday / விடுமுறை'),
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }

      if (onSuccess) {
        onSuccess(res?.loan || selectedLoan);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record holiday/missed day');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!recordedPayment) return;
    const msg = generateReceiptMessage({
      customerName: rawCustomerName || 'Customer',
      loanNo: selectedLoan.loanNo,
      receiptNo: recordedPayment.receiptNo,
      amount: recordedPayment.amount,
      mode: recordedPayment.mode,
      date: recordedPayment.date,
      remainingBalance: recordedPayment.remainingBalance,
      lang: 'ta',
    });
    openWhatsApp({
      phone: customerPhone,
      message: msg,
    });
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

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isMobile ? 'flex-col justify-end' : 'items-center justify-center p-3 sm:p-4'
      } bg-slate-950/75 backdrop-blur-md animate-fade-in`}
    >
      <div
        className={`bg-white dark:bg-slate-900 ${
          isMobile
            ? 'rounded-t-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 pb-safe'
            : 'rounded-3xl max-w-xl w-full p-5 sm:p-6 max-h-[92vh] flex flex-col'
        } shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-auto`}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2 shrink-0" />
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-sky-500 shrink-0" />
              <span>Record Collection / வசூல் பதிவு</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {selectedLoan
                ? `${parsedName.primary} • ${selectedLoan.loanNo}`
                : 'Select borrower loan account to collect installment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition flex items-center justify-center shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold shrink-0 flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* =========================================================================
            STATE A: POST-PAYMENT RECEIPT CONFIRMATION SCREEN
        ========================================================================= */}
        {recordedPayment ? (
          <div className="py-4 space-y-4 overflow-y-auto animate-fade-in flex-1 pr-1">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-50 dark:ring-emerald-900/30">
                <CheckCircle className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Payment Recorded Successfully!
                </h3>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  வசூல் வெற்றிகரமாக பதிவு செய்யப்பட்டது!
                </p>
              </div>
            </div>

            {/* Official Receipt Summary Card */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/60 dark:from-emerald-950/50 dark:via-slate-900 dark:to-sky-950/40 border-2 border-emerald-300 dark:border-emerald-700/80 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Receipt Number / ரசீது எண்
                  </span>
                  <span className="font-mono font-black text-sm text-sky-700 dark:text-sky-300">
                    {recordedPayment.receiptNo}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {recordedPayment.mode || 'CASH'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Customer / பெயர்</span>
                  <p className="font-black text-slate-900 dark:text-white truncate">
                    {parsedName.primary}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Loan A/C / கடன் எண்</span>
                  <p className="font-mono font-black text-slate-900 dark:text-white">
                    {selectedLoan.loanNo}
                  </p>
                </div>
              </div>

              {/* Highlighted Amount & Updated Balance */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Collected / வரவு
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                    {formatCurrency(recordedPayment.amount)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/70 dark:from-amber-950/60 dark:to-orange-950/50 border border-amber-300 dark:border-amber-700 shadow-xs">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase block">
                    Balance Now / மீதி நிலுவை
                  </span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums block mt-0.5">
                    {formatCurrency(recordedPayment.remainingBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Post-Action Buttons */}
            <div className="space-y-2 pt-1">
              {customerPhone && (
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full flex items-center justify-center space-x-2 min-h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/25 active:scale-98 transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send WhatsApp Receipt to Borrower / வாட்ஸ்அப் ரசீது அனுப்பு</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[46px] rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-black text-xs shadow-md active:scale-98 transition"
              >
                Done / நிறைவு
              </button>
            </div>
          </div>
        ) : !selectedLoan ? (
          /* =========================================================================
              STATE B: LOAN ACCOUNT SELECTION SEARCH LIST
          ========================================================================= */
          <div className="mt-4 space-y-3 flex-1 overflow-y-auto pr-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-sky-500" />
              <input
                type="text"
                autoFocus
                placeholder="Search borrower name, phone, loan #, area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-base sm:text-xs font-medium outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {loadingLoans ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                  Loading active loans / கடன்கள் ஏற்றப்படுகிறது...
                </div>
              ) : filteredLoans.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  No active loans found matching query.
                </div>
              ) : (
                filteredLoans.map((l) => {
                  const pName = parseCustomerName(l.customerId?.name);
                  const remBal = l.remainingBalance ?? l.installmentAmount;
                  return (
                    <div
                      key={l._id}
                      onClick={() => handleSelectLoan(l)}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer flex items-center justify-between transition-all min-h-[58px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                            {pName.primary}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 shrink-0">
                            {l.financeType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                          {l.loanNo}
                          {l.customerId?.phone ? ` • 📞 ${l.customerId.phone}` : ''}
                          {l.customerId?.area ? ` • 📍 ${l.customerId.area}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-black tabular-nums text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          {formatCurrency(l.installmentAmount)}
                          <span className="text-[10px] font-normal text-slate-400 block">per due</span>
                        </p>
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          Bal: {formatCurrency(remBal)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
              STATE C: LUXURY PAYMENT & BALANCE BREAKDOWN FORM
          ========================================================================= */
          <form onSubmit={handleSubmit} className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1 pb-2 scroll-smooth">
            {/* 1. Clear & Attractive Borrower & Loan Summary Card */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50/80 via-white to-blue-50/50 dark:from-sky-950/40 dark:via-slate-900 dark:to-blue-950/30 border border-sky-200/80 dark:border-sky-800/60 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Initials Avatar */}
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-sky-500/25">
                    {parsedName.primary
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'VK'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                        {parsedName.primary}
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-100 text-sky-800 dark:bg-sky-900/80 dark:text-sky-300 shrink-0">
                        {financeType === 'daily' ? 'Daily (தினசரி)' : financeType === 'weekly' ? 'Weekly' : 'Monthly'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="font-black text-sky-700 dark:text-sky-300">
                        {selectedLoan.loanNo}
                      </span>
                      {customerPhone && (
                        <span>• 📞 {customerPhone}</span>
                      )}
                      {customerArea && (
                        <span>• 📍 {customerArea}</span>
                      )}
                    </div>
                  </div>
                </div>

                {!loanItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLoan(null);
                      setFullLoanData(null);
                    }}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 shrink-0 ml-2 bg-sky-100/70 dark:bg-sky-950/80 px-2.5 py-1 rounded-xl transition"
                  >
                    Change / மாற்று
                  </button>
                )}
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Loan Repayment Progress</span>
                  <span className="font-mono text-sky-600 dark:text-sky-400">
                    {currentProgressPct}% cleared {payNum > 0 ? `→ ${newProgressPct}%` : ''}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${currentProgressPct}%` }}
                  />
                  {payNum > 0 && newProgressPct > currentProgressPct && (
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500 transition-all duration-300 opacity-90 animate-pulse"
                      style={{
                        left: `${currentProgressPct}%`,
                        width: `${Math.min(100 - currentProgressPct, newProgressPct - currentProgressPct)}%`,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 3 Metrics Financial Strip */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase truncate">
                    Total Due
                  </span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums block mt-0.5">
                    {formatCurrency(totalPayable)}
                  </span>
                </div>

                <div className="p-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase truncate">
                    Paid / வரவு
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                    {formatCurrency(totalCollected)}
                  </span>
                </div>

                <div className="p-2 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-amber-950/50 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/70">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block uppercase truncate">
                    Balance / நிலுவை
                  </span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums block mt-0.5">
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Entry Mode Switcher: Payment vs Holiday / Missed */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setEntryMode('payment')}
                className={`py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 ${
                  entryMode === 'payment'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Payment / வசூல்</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('holiday')}
                className={`py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 ${
                  entryMode === 'holiday'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Holiday / Missed</span>
              </button>
            </div>

            {entryMode === 'holiday' ? (
              /* Holiday / Missed Day Form */
              <div className="space-y-4 pt-1 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Declaration Type / வகை
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHolidayType('holiday')}
                      className={`py-3 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                        holidayType === 'holiday'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shadow-sm'
                          : 'bg-white dark:bg-slate-850 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Coffee className="w-4 h-4 text-purple-600" />
                      <span>🏖️ Holiday / விடுமுறை</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHolidayType('missed')}
                      className={`py-3 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                        holidayType === 'missed'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shadow-sm'
                          : 'bg-white dark:bg-slate-850 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>⚠️ Missed / தவறிய நாள்</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    Date / தேதி
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-purple-200/80 dark:border-purple-850/60 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    Reason / குறிப்பு
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunday, Festival, Shop Closed, Borrower Not Available"
                    value={holidayReason}
                    onChange={(e) => setHolidayReason(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-purple-200/80 dark:border-purple-850/60 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleHolidaySubmit}
                    className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs shadow-lg shadow-purple-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98 transition"
                  >
                    {submitting ? (
                      <span>Saving Declaration...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>
                          Confirm {holidayType === 'missed' ? 'Missed Day' : 'Holiday'} / உறுதிசெய்
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Payment Entry Form Fields */
              <div className="space-y-4">
                {/* 2. Amount Quick Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Quick Amount Presets / தொகையை தேர்வு செய்
                    </label>
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      1 Due = {formatCurrency(installmentAmt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {/* Multi-Due Dynamic Chips */}
                    {installmentAmt > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setAmount(installmentAmt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black border transition min-h-[36px] flex items-center space-x-1 ${
                            amount === installmentAmt
                              ? 'border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-500/25'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                          }`}
                        >
                          <span>1 Due ({formatCurrency(installmentAmt)})</span>
                        </button>

                        {currentBalance >= installmentAmt * 2 && (
                          <button
                            type="button"
                            onClick={() => setAmount(installmentAmt * 2)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition min-h-[36px] ${
                              amount === installmentAmt * 2
                                ? 'border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-500/25'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                            }`}
                          >
                            2 Dues ({formatCurrency(installmentAmt * 2)})
                          </button>
                        )}

                        {currentBalance >= installmentAmt * 3 && (
                          <button
                            type="button"
                            onClick={() => setAmount(installmentAmt * 3)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition min-h-[36px] ${
                              amount === installmentAmt * 3
                                ? 'border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-500/25'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                            }`}
                          >
                            3 Dues ({formatCurrency(installmentAmt * 3)})
                          </button>
                        )}
                      </>
                    )}

                    {/* Round number chips if distinct */}
                    {[100, 200, 500].map((preset) => {
                      if (preset === installmentAmt || preset === installmentAmt * 2 || preset === installmentAmt * 3) {
                        return null;
                      }
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black border transition min-h-[36px] ${
                            amount === preset
                              ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                          }`}
                        >
                          ₹{preset}
                        </button>
                      );
                    })}

                    {/* Full Settlement Balance Chip */}
                    {currentBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(currentBalance)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition min-h-[36px] flex items-center space-x-1 ${
                          amount === currentBalance
                            ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Full Balance ({formatCurrency(currentBalance)})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Amount input */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    Payment Amount (வசூல் தொகை ₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-sky-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      required
                      value={amount || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setAmount(val);
                      }}
                      className="w-full pl-10 pr-4 h-13 rounded-2xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-700 text-slate-900 dark:text-white font-black text-xl outline-none focus:ring-2 focus:ring-sky-400 tabular-nums shadow-xs"
                    />
                  </div>
                </div>

                {/* =========================================================================
                    4. ⭐ LIVE "BALANCE AFTER PAYMENT" SHOWCASE (MAIN USER REQUEST) ⭐
                ========================================================================= */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40 border-2 border-emerald-300 dark:border-emerald-700 shadow-md space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border-b border-emerald-200/70 dark:border-emerald-800/60 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Live Balance Calculation / நேரலை நிலுவை கணக்கீடு</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 px-2 py-0.5 rounded-full font-mono font-bold lowercase">
                      auto-computed
                    </span>
                  </div>

                  {/* Math Breakdown Strip */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-emerald-100 dark:border-emerald-900/60 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                        Current Outstanding / தற்போதைய நிலுவை
                      </span>
                      <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 tabular-nums block mt-0.5">
                        {formatCurrency(currentBalance)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-emerald-100 dark:border-emerald-900/60 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                        Paying Now / செலுத்தும் வசூல்
                      </span>
                      <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                        – {formatCurrency(payNum)}
                      </span>
                    </div>
                  </div>

                  {/* Highlighted Balance After Payment Card */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-500/25 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
                        Balance After Payment / செலுத்திய பின் மீதி நிலுவை
                      </p>
                      <p className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight mt-0.5">
                        {formatCurrency(balanceAfterPayment)}
                      </p>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-200 block">
                        Remaining
                      </span>
                      <span className="text-xs font-black bg-white/20 px-2.5 py-1 rounded-xl inline-block mt-0.5">
                        {remainingDuesCount} {financeType === 'daily' ? 'days' : financeType === 'weekly' ? 'weeks' : 'months'}
                      </span>
                    </div>
                  </div>

                  {/* Full Settlement Notice */}
                  {isFullSettlement && (
                    <div className="p-2.5 rounded-2xl bg-emerald-100/90 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        🎉 Full Settlement! This payment completely clears and closes the loan account (₹0 balance remaining).
                      </span>
                    </div>
                  )}

                  {/* Overpayment Notice */}
                  {isOverpaying && (
                    <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between">
                      <span className="leading-tight">
                        Note: Entered amount exceeds balance by {formatCurrency(payNum - currentBalance)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAmount(currentBalance)}
                        className="px-2.5 py-1 rounded-xl bg-amber-600 text-white font-bold text-[10px] hover:bg-amber-700 ml-2 shrink-0 active:scale-95"
                      >
                        Set Exact ({formatCurrency(currentBalance)})
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Payment Mode Selection */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    Collection Mode / செலுத்தும் முறை
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('cash')}
                      className={`min-h-[46px] p-2.5 rounded-2xl flex items-center justify-center space-x-2 font-black text-xs transition border ${
                        mode === 'cash'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 border-emerald-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash / ரொக்கம்</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('upi')}
                      className={`min-h-[46px] p-2.5 rounded-2xl flex items-center justify-center space-x-2 font-black text-xs transition border ${
                        mode === 'upi'
                          ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 border-sky-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>UPI / GPay</span>
                    </button>
                  </div>
                </div>

                {/* 6. Receipt Date Input */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    Receipt Date / ரசீது தேதி
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                {/* 7. Collection Notes Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Notes / குறிப்பு (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid at shop, GPay UTR 29482..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>
            )}

            {/* Sticky Action Button at Bottom */}
            {entryMode === 'payment' && (
              <div className="sticky bottom-0 pt-3 pb-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 shrink-0 z-10">
                <button
                  type="submit"
                  disabled={submitting || payNum <= 0}
                  className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-xl shadow-sky-500/30 flex items-center justify-center space-x-2 transition active:scale-98"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording Collection...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>
                        Confirm Payment {payNum > 0 ? `(Balance: ${formatCurrency(balanceAfterPayment)})` : ''} / வசூல் உறுதிப்படுத்து
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
