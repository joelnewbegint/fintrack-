import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import api from '../../services/api';
import { formatCurrency, formatDateForInput, formatDate } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { openWhatsApp, generateReceiptMessage } from '../../utils/whatsapp';
import SmartNameInput from './SmartNameInput';
import { saveRecentName } from '../../utils/nameCorrection';
import { saveRecentNumber } from '../../utils/numberCorrection';
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

/**
 * Extracts and formats the initial date string (YYYY-MM-DD) from a loan/installment item.
 * Preserves the exact scheduled date safely across timezones.
 */
const getInitialDate = (item) => {
  const raw = item?.dueDate || item?.date || item?.dueDetails?.date;
  if (raw) {
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return formatDateForInput(d);
      }
    } catch (e) {
      console.warn('Could not format initial date:', e);
    }
  }
  return formatDateForInput();
};

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
  const [mode, setMode] = useState('cash'); // 'cash' | 'upi'
  const [date, setDate] = useState(() => getInitialDate(loanItem));
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
      setDate(getInitialDate(loanItem));
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
    if (cust.name) {
      saveRecentName(cust.name);
    }
    if (cust.phone) {
      saveRecentNumber(cust.phone, cust.name, 'phone');
    }
    if (loan.loanNo) {
      saveRecentNumber(loan.loanNo, cust.name || '', 'loan');
    }
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
    setDate(getInitialDate(loan));
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
      if (selectedLoan.customerName) {
        saveRecentName(selectedLoan.customerName);
      }
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
      } bg-slate-950/70 backdrop-blur-md animate-fade-in`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white ${
          isMobile
            ? 'rounded-t-3xl max-w-lg w-full max-h-[94vh] flex flex-col p-4 pb-safe'
            : 'rounded-3xl max-w-xl w-full p-5 sm:p-6 max-h-[92vh] flex flex-col'
        } shadow-2xl border border-[#D5E9FA] overflow-hidden my-auto`}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div className="w-12 h-1.5 rounded-full bg-[#D5E9FA] mx-auto mb-2 shrink-0" />
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[#D5E9FA] shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-[#183653] flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-[#0878D1] shrink-0" />
              <span>Record Collection / வசூல் பதிவு</span>
            </h3>
            <p className="text-xs text-[#647C95] truncate mt-0.5">
              {selectedLoan
                ? `${parsedName.primary} • ${selectedLoan.loanNo}`
                : 'Select borrower loan account to collect installment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F3F9FF] hover:bg-[#EAF5FF] text-[#647C95] hover:text-[#183653] border border-[#D5E9FA] transition flex items-center justify-center shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shrink-0 flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* =========================================================================
            STATE A: POST-PAYMENT RECEIPT CONFIRMATION SCREEN
        ========================================================================= */}
        {recordedPayment ? (
          <div className="py-4 space-y-4 overflow-y-auto animate-fade-in flex-1 pr-1">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#18A879] flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-50">
                <CheckCircle className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-lg font-black text-[#183653]">
                  Payment Recorded Successfully!
                </h3>
                <p className="text-xs font-bold text-[#18A879] mt-0.5">
                  வசூல் வெற்றிகரமாக பதிவு செய்யப்பட்டது!
                </p>
              </div>
            </div>

            {/* Official Receipt Summary Card */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-[#EAF5FF] via-white to-[#F3F9FF] border-2 border-[#55B8F5] shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-[#D5E9FA] pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#647C95] tracking-wider block">
                    Receipt Number / ரசீது எண்
                  </span>
                  <span className="font-mono font-black text-sm text-[#0878D1]">
                    {recordedPayment.receiptNo}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]">
                  {recordedPayment.mode || 'CASH'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-[#647C95] uppercase font-semibold">Customer / பெயர்</span>
                  <p className="font-black text-[#183653] truncate">
                    {parsedName.primary}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#647C95] uppercase font-semibold">Loan A/C / கடன் எண்</span>
                  <p className="font-mono font-black text-[#183653]">
                    {selectedLoan.loanNo}
                  </p>
                </div>
              </div>

              {/* Highlighted Amount & Updated Balance */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-2xl bg-white border border-[#D5E9FA] shadow-xs">
                  <span className="text-[10px] text-[#647C95] font-bold uppercase block">
                    Collected / வரவு
                  </span>
                  <span className="text-xl font-black text-[#18A879] tabular-nums block mt-0.5">
                    {formatCurrency(recordedPayment.amount)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#EAF5FF] border border-[#BFE3FA] shadow-xs">
                  <span className="text-[10px] text-[#0878D1] font-bold uppercase block">
                    Balance Now / மீதி நிலுவை
                  </span>
                  <span className="text-xl font-black text-[#064B8E] tabular-nums block mt-0.5">
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
                  className="w-full flex items-center justify-center space-x-2 min-h-[46px] rounded-2xl bg-[#18A879] hover:bg-[#138861] text-white font-black text-xs shadow-md shadow-[#18A879]/25 active:scale-98 transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send WhatsApp Receipt to Borrower / வாட்ஸ்அப் ரசீது அனுப்பு</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[46px] rounded-2xl bg-[#0878D1] hover:bg-[#064B8E] text-white font-black text-xs shadow-md active:scale-98 transition"
              >
                Done / நிறைவு
              </button>
            </div>
          </div>
        ) : !selectedLoan ? (
          /* =========================================================================
              STATE B: LOAN ACCOUNT SELECTION SEARCH LIST
          ========================================================================= */
          <div className="mt-3 space-y-3 flex-1 overflow-y-auto pr-1">
            <SmartNameInput
              value={searchQuery}
              onChange={setSearchQuery}
              isSearch={true}
              placeholder="Search borrower name, phone, loan #, area..."
              existingCustomers={activeLoansList
                .map((l) => ({
                  _id: l._id,
                  name: l.customerId?.name || l.customerName,
                  phone: l.customerId?.phone,
                  area: l.customerId?.area,
                }))
                .filter((c) => c.name)}
              onSelectCustomer={(cust) => {
                setSearchQuery(cust.name);
              }}
              inputClassName="w-full pl-10 pr-9 h-11 rounded-2xl bg-[#F3F9FF] border border-[#D5E9FA] text-xs font-medium outline-none focus:ring-2 focus:ring-[#0878D1]/20 focus:border-[#0878D1]"
            />

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {loadingLoans ? (
                <div className="p-8 text-center text-xs font-bold text-[#647C95]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0878D1]" />
                  Loading active loans / கடன்கள் ஏற்றப்படுகிறது...
                </div>
              ) : filteredLoans.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-[#647C95] bg-[#F3F9FF] rounded-2xl border border-[#D5E9FA]">
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
                      className="p-3 rounded-2xl bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-xs text-[#183653] truncate">
                            {pName.primary}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] shrink-0">
                            {l.financeType}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647C95] font-mono truncate mt-0.5">
                          {l.loanNo}
                          {l.customerId?.phone ? ` • 📞 ${l.customerId.phone}` : ''}
                          {l.customerId?.area ? ` • 📍 ${l.customerId.area}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-black tabular-nums text-[#0878D1] whitespace-nowrap">
                          {formatCurrency(l.installmentAmount)}
                          <span className="text-[10px] font-normal text-[#647C95] block">per due</span>
                        </p>
                        <p className="text-[10px] font-bold text-[#064B8E] tabular-nums">
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
              STATE C: EASY, CLEAN & ATTRACTIVE COLLECTION FORM
          ========================================================================= */
          <form onSubmit={handleSubmit} className="mt-3 flex-1 overflow-y-auto space-y-3.5 pr-1 pb-1 scroll-smooth">
            {/* 1. Sleek & Compact Borrower & Loan Overview Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#F3F9FF] via-white to-[#EAF5FF] border border-[#D5E9FA] shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  {/* Initials Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-[#0878D1]/20">
                    {parsedName.primary
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'VK'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-black text-sm text-[#183653] truncate">
                        {parsedName.primary}
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] shrink-0">
                        {financeType === 'daily' ? 'Daily (தினசரி)' : financeType === 'weekly' ? 'Weekly (வாராந்திர)' : 'Monthly (மாதாந்திர)'}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#647C95] font-mono truncate flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="font-bold text-[#0878D1]">
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
                    className="text-xs font-bold text-[#0878D1] hover:text-[#064B8E] shrink-0 ml-2 bg-[#EAF5FF] hover:bg-[#D5E9FA] px-2.5 py-1 rounded-xl transition"
                  >
                    Change / மாற்று
                  </button>
                )}
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-[#647C95]">
                  <span>Repayment Progress / தவணை முன்னேற்றம்</span>
                  <span className="font-mono text-[#0878D1] font-bold">
                    {currentProgressPct}% {payNum > 0 ? `→ ${newProgressPct}%` : ''}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#EAF5FF] overflow-hidden relative">
                  <div
                    className="h-full bg-[#0878D1] transition-all duration-300"
                    style={{ width: `${currentProgressPct}%` }}
                  />
                  {payNum > 0 && newProgressPct > currentProgressPct && (
                    <div
                      className="absolute top-0 bottom-0 bg-[#18A879] transition-all duration-300 opacity-90 animate-pulse"
                      style={{
                        left: `${currentProgressPct}%`,
                        width: `${Math.min(100 - currentProgressPct, newProgressPct - currentProgressPct)}%`,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 3 Metrics Financial Strip */}
              <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                <div className="p-1.5 rounded-xl bg-white border border-[#D5E9FA]">
                  <span className="text-[9px] text-[#647C95] font-bold block uppercase truncate">
                    Total Due
                  </span>
                  <span className="text-xs font-black text-[#183653] tabular-nums block mt-0.5">
                    {formatCurrency(totalPayable)}
                  </span>
                </div>

                <div className="p-1.5 rounded-xl bg-white border border-[#D5E9FA]">
                  <span className="text-[9px] text-[#18A879] font-bold block uppercase truncate">
                    Paid / வரவு
                  </span>
                  <span className="text-xs font-black text-[#18A879] tabular-nums block mt-0.5">
                    {formatCurrency(totalCollected)}
                  </span>
                </div>

                <div className="p-1.5 rounded-xl bg-[#EAF5FF] border border-[#BFE3FA]">
                  <span className="text-[9px] text-[#0878D1] font-bold block uppercase truncate">
                    Balance / நிலுவை
                  </span>
                  <span className="text-xs font-black text-[#064B8E] tabular-nums block mt-0.5">
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Entry Mode Switcher: Payment vs Holiday / Missed */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#F3F9FF] border border-[#D5E9FA] shrink-0">
              <button
                type="button"
                onClick={() => setEntryMode('payment')}
                className={`py-1.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 ${
                  entryMode === 'payment'
                    ? 'bg-[#0878D1] text-white shadow-xs'
                    : 'text-[#647C95] hover:text-[#183653]'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Payment / வசூல்</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('holiday')}
                className={`py-1.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 ${
                  entryMode === 'holiday'
                    ? 'bg-[#0878D1] text-white shadow-xs'
                    : 'text-[#647C95] hover:text-[#183653]'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Holiday / Missed</span>
              </button>
            </div>

            {entryMode === 'holiday' ? (
              /* Holiday / Missed Day Form */
              <div className="space-y-3 pt-1 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#647C95] mb-1.5">
                    Declaration Type / வகை
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHolidayType('holiday')}
                      className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                        holidayType === 'holiday'
                          ? 'border-[#0878D1] bg-[#EAF5FF] text-[#0878D1] shadow-xs'
                          : 'bg-white text-[#647C95] hover:bg-[#EAF5FF]'
                      }`}
                    >
                      <Coffee className="w-4 h-4 text-[#0878D1]" />
                      <span>🏖️ Holiday / விடுமுறை</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHolidayType('missed')}
                      className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                        holidayType === 'missed'
                          ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-xs'
                          : 'bg-white text-[#647C95] hover:bg-[#EAF5FF]'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>⚠️ Missed / தவறிய நாள்</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#183653] mb-1">
                    Date / தேதி
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-bold text-xs outline-none focus:ring-2 focus:ring-[#0878D1]/20 focus:border-[#0878D1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#183653] mb-1">
                    Reason / குறிப்பு
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunday, Festival, Shop Closed, Borrower Not Available"
                    value={holidayReason}
                    onChange={(e) => setHolidayReason(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-bold text-xs outline-none focus:ring-2 focus:ring-[#0878D1]/20 focus:border-[#0878D1]"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleHolidaySubmit}
                    className="w-full min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#064B8E] hover:to-[#0878D1] text-white font-black text-xs shadow-md shadow-[#0878D1]/25 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98 transition"
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
              <div className="space-y-3">
                {/* 2. Amount Quick Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#647C95]">
                      Quick Amount Presets / தொகையை தேர்வு செய்
                    </label>
                    <span className="text-[10px] font-bold text-[#0878D1]">
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[34px] flex items-center space-x-1 ${
                            amount === installmentAmt
                              ? 'border-[#0878D1] bg-[#0878D1] text-white shadow-xs'
                              : 'bg-white border-[#D5E9FA] text-[#183653] hover:bg-[#EAF5FF]'
                          }`}
                        >
                          <span>1 Due ({formatCurrency(installmentAmt)})</span>
                        </button>

                        {currentBalance >= installmentAmt * 2 && (
                          <button
                            type="button"
                            onClick={() => setAmount(installmentAmt * 2)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[34px] ${
                              amount === installmentAmt * 2
                                ? 'border-[#0878D1] bg-[#0878D1] text-white shadow-xs'
                                : 'bg-white border-[#D5E9FA] text-[#183653] hover:bg-[#EAF5FF]'
                            }`}
                          >
                            2 Dues ({formatCurrency(installmentAmt * 2)})
                          </button>
                        )}

                        {currentBalance >= installmentAmt * 3 && (
                          <button
                            type="button"
                            onClick={() => setAmount(installmentAmt * 3)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[34px] ${
                              amount === installmentAmt * 3
                                ? 'border-[#0878D1] bg-[#0878D1] text-white shadow-xs'
                                : 'bg-white border-[#D5E9FA] text-[#183653] hover:bg-[#EAF5FF]'
                            }`}
                          >
                            3 Dues ({formatCurrency(installmentAmt * 3)})
                          </button>
                        )}
                      </>
                    )}

                    {/* Full Settlement Balance Chip */}
                    {currentBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(currentBalance)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[34px] flex items-center space-x-1 ${
                          amount === currentBalance
                            ? 'border-[#18A879] bg-[#18A879] text-white shadow-xs'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Full Balance ({formatCurrency(currentBalance)})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. ⭐ CORE ENTERING GRID: AMOUNT & DATE SIDE-BY-SIDE ⭐ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Payment Amount */}
                  <div>
                    <label className="block text-xs font-black text-[#183653] mb-1">
                      Payment Amount / வசூல் தொகை ₹ *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-[#0878D1]">
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
                        className="w-full pl-9 pr-3 h-11 rounded-xl bg-white border-2 border-[#D5E9FA] text-[#183653] font-black text-lg outline-none focus:border-[#0878D1] focus:ring-2 focus:ring-[#0878D1]/20 tabular-nums shadow-xs transition"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>

                  {/* Collection Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-black text-[#183653]">
                        Collection Date / தேதி *
                      </label>
                      {selectedLoan?.dueDate && (
                        <span className="text-[10px] font-bold text-[#0878D1] bg-[#EAF5FF] border border-[#BFE3FA] px-1.5 py-0.5 rounded-md">
                          {selectedLoan.installmentNo ? `Due #${selectedLoan.installmentNo}` : 'Scheduled'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 h-11 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-bold text-xs outline-none focus:border-[#0878D1] focus:ring-2 focus:ring-[#0878D1]/20 shadow-xs transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. ⭐ PAY OPTION (COLLECTION MODE) PROMINENT & DIRECTLY IN VIEW ⭐ */}
                <div>
                  <label className="block text-xs font-black text-[#183653] mb-1.5">
                    Pay Option / செலுத்தும் முறை *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMode('cash')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center space-x-2 font-bold text-xs transition border-2 ${
                        mode === 'cash'
                          ? 'bg-[#EAF5FF] border-[#0878D1] text-[#0878D1] shadow-xs ring-2 ring-[#0878D1]/15'
                          : 'bg-white border-[#D5E9FA] text-[#647C95] hover:bg-[#F3F9FF] hover:border-[#55B8F5]'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash / ரொக்கம்</span>
                      {mode === 'cash' && <Check className="w-3.5 h-3.5 stroke-[3] ml-1" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('upi')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center space-x-2 font-bold text-xs transition border-2 ${
                        mode === 'upi'
                          ? 'bg-[#EAF5FF] border-[#0878D1] text-[#0878D1] shadow-xs ring-2 ring-[#0878D1]/15'
                          : 'bg-white border-[#D5E9FA] text-[#647C95] hover:bg-[#F3F9FF] hover:border-[#55B8F5]'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>UPI / GPay</span>
                      {mode === 'upi' && <Check className="w-3.5 h-3.5 stroke-[3] ml-1" />}
                    </button>
                  </div>
                </div>

                {/* 5. ⭐ STREAMLINED LIVE BALANCE PREVIEW ⭐ */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-[#F3F9FF] to-[#EAF5FF] border border-[#D5E9FA] shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#064B8E]">
                      <Calculator className="w-3.5 h-3.5 text-[#0878D1]" />
                      <span>Balance After Payment / செலுத்திய பின் நிலுவை</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#647C95] bg-white px-2 py-0.5 rounded-full border border-[#D5E9FA]">
                      {remainingDuesCount} {financeType === 'daily' ? 'days' : financeType === 'weekly' ? 'weeks' : 'months'} remaining
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-0.5">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl sm:text-2xl font-black text-[#064B8E] tabular-nums tracking-tight">
                        {formatCurrency(balanceAfterPayment)}
                      </span>
                      {payNum > 0 && (
                        <span className="text-xs text-[#647C95] font-mono">
                          ({formatCurrency(currentBalance)} – {formatCurrency(payNum)})
                        </span>
                      )}
                    </div>

                    {isFullSettlement && (
                      <span className="text-[11px] font-black text-[#18A879] bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Full Settlement!</span>
                      </span>
                    )}
                  </div>

                  {isOverpaying && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center justify-between">
                      <span>Exceeds balance by {formatCurrency(payNum - currentBalance)}</span>
                      <button
                        type="button"
                        onClick={() => setAmount(currentBalance)}
                        className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 active:scale-95"
                      >
                        Set Exact ({formatCurrency(currentBalance)})
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Collection Notes (Optional) */}
                <div>
                  <input
                    type="text"
                    placeholder="Notes / குறிப்பு (optional, e.g. GPay UTR, paid at shop...)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-medium text-xs outline-none focus:border-[#0878D1] focus:ring-2 focus:ring-[#0878D1]/20 transition"
                  />
                </div>
              </div>
            )}

            {/* 7. Action Button at Bottom */}
            {entryMode === 'payment' && (
              <div className="pt-1.5 shrink-0">
                <button
                  type="submit"
                  disabled={submitting || payNum <= 0}
                  className="w-full min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#064B8E] hover:to-[#0878D1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-lg shadow-[#0878D1]/25 flex items-center justify-center space-x-2 transition active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording Collection... / பதிவு செய்யப்படுகிறது...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>
                        Confirm Payment {payNum > 0 ? `• ${formatCurrency(payNum)}` : ''} / வசூல் உறுதிப்படுத்து
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
