import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import api from '../../services/api';
import { formatCurrency, formatDateForInput, formatDate } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { useAuth } from '../../context/AuthContext';
import { openWhatsApp, generateReceiptMessage } from '../../utils/whatsapp';
import { getSyncQueue } from '../../services/offlineQueue';
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
  Share2,
  CheckCircle,
  RotateCcw,
  Pencil,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ArrowLeft,
} from 'lucide-react';

/**
 * Extracts and formats the initial date string (YYYY-MM-DD) from a loan/installment item.
 * Preserves the scheduled date safely across timezones.
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
  const { user, isOwner, isLoanAgent } = useAuth();

  // If a loanItem was pre-selected (e.g. from LoanDetail schedule), start with it
  const [selectedLoan, setSelectedLoan] = useState(loanItem);
  const [fullLoanData, setFullLoanData] = useState(null);
  const [activeLoansList, setActiveLoansList] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'daily' | 'weekly' | 'monthly' | 'pending_today'

  // Today's collections map: { [loanId]: { paymentId, amount, remainingBalance, collectedBy, isOffline } }
  const [todayCollections, setTodayCollections] = useState({});
  const [pendingSyncLoanIds, setPendingSyncLoanIds] = useState(new Set());
  const [collectingLoanId, setCollectingLoanId] = useState(null);

  // Bottom Toast state: { loanId, paymentId, customerName, amount }
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Edit / Full form state
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

  // Advance / Multi-date payment state in full form
  const [useMultiDate, setUseMultiDate] = useState(false);
  const [multiDates, setMultiDates] = useState([
    { id: 1, date: formatDateForInput(), amount: initialDue || 200 },
  ]);
  const [shareWhatsAppOnSave, setShareWhatsAppOnSave] = useState(false);

  const todayStr = useMemo(() => formatDateForInput(new Date()), []);

  // ---------------------------------------------------------------------------
  // Load Active Loans & Today's Payments for Selection Popup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!loanItem) {
      setLoadingLoans(true);
      Promise.all([
        api.getLoans({ status: 'active' }).catch((err) => {
          console.error('Error fetching active loans:', err);
          return { success: false, loans: [] };
        }),
        api.getPayments({ limit: 500 }).catch((err) => {
          console.warn('Error fetching recent payments:', err);
          return { success: false, payments: [] };
        }),
      ])
        .then(([loansRes, paymentsRes]) => {
          if (loansRes.success && Array.isArray(loansRes.loans)) {
            let loans = loansRes.loans;
            // Strict role-based isolation: loan agents only see their assigned areas or loans
            if (!isOwner && (isLoanAgent || user?.role === 'loan_agent' || user?.role === 'agent')) {
              if (user?.assignedAreas && user.assignedAreas.length > 0) {
                loans = loans.filter((l) => {
                  const area = l.customerArea || l.customerId?.area;
                  return area && user.assignedAreas.includes(area);
                });
              }
            }
            setActiveLoansList(loans);
          }

          // Compile today's collections
          if (paymentsRes.success && Array.isArray(paymentsRes.payments)) {
            const map = {};
            paymentsRes.payments.forEach((p) => {
              const pDate = p.date ? formatDateForInput(p.date) : '';
              if (pDate === todayStr) {
                const lId = p.loanId?._id || p.loanId;
                if (lId) {
                  map[String(lId)] = {
                    paymentId: p._id,
                    amount: p.amount,
                    collectedBy: p.collectedBy || p.createdBy,
                    isOffline: !!p.isOffline,
                  };
                }
              }
            });
            setTodayCollections((prev) => ({ ...map, ...prev }));
          }
        })
        .finally(() => setLoadingLoans(false));
    } else {
      setSelectedLoan(loanItem);
      const due = loanItem.dueAmount || loanItem.installmentAmount || 0;
      setAmount(due);
      setDate(getInitialDate(loanItem));
      setMultiDates([{ id: 1, date: getInitialDate(loanItem), amount: due || 200 }]);
    }
  }, [loanItem, isOwner, isLoanAgent, user, todayStr]);

  // Monitor pending offline queue items
  useEffect(() => {
    let isMounted = true;
    const checkOfflineQueue = async () => {
      try {
        const q = await getSyncQueue();
        if (!isMounted) return;
        const ids = new Set();
        q.forEach((item) => {
          if (item.endpoint === '/api/payments' && item.data?.loanId) {
            ids.add(String(item.data.loanId));
          }
        });
        setPendingSyncLoanIds(ids);
      } catch (e) {}
    };

    checkOfflineQueue();
    const interval = setInterval(checkOfflineQueue, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch full loan details if a loan is selected for edit
  useEffect(() => {
    const loanId = selectedLoan?.loanId || selectedLoan?._id;
    if (!loanId) return;

    let isMounted = true;
    api
      .getLoanById(loanId)
      .then((res) => {
        if (isMounted && res.success && res.loan) {
          setFullLoanData(res.loan);
          if (!amount || amount === 0) {
            const inst = res.loan.installmentAmount || res.loan.dueAmount || 0;
            if (inst > 0) {
              setAmount(inst);
              setMultiDates([{ id: 1, date: date || formatDateForInput(), amount: inst }]);
            }
          }
        }
      })
      .catch((err) => console.warn('Could not fetch full loan details:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedLoan?.loanId, selectedLoan?._id]);

  // Toast helper for direct collection
  const showToast = (loanId, paymentId, customerName, payAmount) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    const timerId = setTimeout(() => {
      setToast(null);
    }, 8000); // 8 seconds
    toastTimerRef.current = timerId;
    setToast({ loanId, paymentId, customerName, amount: payAmount });
  };

  // ---------------------------------------------------------------------------
  // 1) DIRECT COLLECT (One tap, saves immediately, no receipt)
  // ---------------------------------------------------------------------------
  const handleDirectCollect = async (l) => {
    setError('');
    const loanId = l._id || l.loanId;
    const remBal =
      l.remainingBalance !== undefined
        ? Number(l.remainingBalance)
        : l.dueAmount || l.installmentAmount || 200;
    const instAmt = Number(l.installmentAmount) || Number(l.dueAmount) || 200;

    // Cap amount so it never exceeds outstanding balance
    const payAmount = Math.max(0, Math.min(instAmt, remBal));
    if (payAmount <= 0) {
      setError('Loan is already fully settled / கடன் கணக்கு ஏற்கனவே முடிவடைந்தது');
      return;
    }

    const custName = parseCustomerName(l.customerId?.name || l.customerName).primary;
    const todayDate = formatDateForInput(new Date());

    try {
      setCollectingLoanId(loanId);
      const res = await api.recordPayment({
        loanId,
        amount: payAmount,
        mode: 'cash',
        date: todayDate,
        notes: 'Direct collection / நேரடி தவணை வசூல்',
      });

      const paymentId = res?.payment?._id || res?.payment?.id || `pay_${Date.now()}`;
      const isOffline = !navigator.onLine || !!res?.isOffline;

      const newBal = Math.max(0, remBal - payAmount);

      // Instant optimistic state update on row
      setActiveLoansList((prev) =>
        prev.map((item) =>
          item._id === loanId || item.loanId === loanId
            ? {
                ...item,
                remainingBalance: newBal,
                totalCollected: (item.totalCollected || 0) + payAmount,
              }
            : item
        )
      );

      // Record in today's collections map
      setTodayCollections((prev) => ({
        ...prev,
        [String(loanId)]: {
          paymentId,
          amount: payAmount,
          remainingBalance: newBal,
          collectedBy: user?._id || 'owner',
          isOffline,
        },
      }));

      if (isOffline) {
        setPendingSyncLoanIds((prev) => new Set([...prev, String(loanId)]));
      }

      // Celebratory micro-burst
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {}

      // Trigger 8-second toast
      showToast(loanId, paymentId, custName, payAmount);

      // Broadcast update across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      console.error('Direct collect error:', err);
      setError(err.message || 'Direct collection failed / வசூல் பதிவு தோல்வி');
    } finally {
      setCollectingLoanId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // UNDO COLLECTION (Reverses payment, restores balance & schedule)
  // ---------------------------------------------------------------------------
  const handleUndo = async (loanId, paymentId) => {
    setError('');
    try {
      setSubmitting(true);
      if (paymentId) {
        await api.deletePayment(paymentId);
      }

      const collectedInfo = todayCollections[String(loanId)];
      const undoneAmt = collectedInfo?.amount || 200;

      // Remove from today's collections map
      setTodayCollections((prev) => {
        const copy = { ...prev };
        delete copy[String(loanId)];
        return copy;
      });

      // Restore balance in active loans list
      setActiveLoansList((prev) =>
        prev.map((l) => {
          if (l._id === loanId || l.loanId === loanId) {
            const curBal = l.remainingBalance || 0;
            return {
              ...l,
              remainingBalance: curBal + undoneAmt,
              totalCollected: Math.max(0, (l.totalCollected || 0) - undoneAmt),
            };
          }
          return l;
        })
      );

      // Clear toast if active for this loan
      if (toast?.loanId === loanId) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(null);
      }

      // Broadcast update across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      console.error('Undo error:', err);
      setError(err.message || 'Cannot undo payment / ரத்து செய்ய இயலவில்லை');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2) OPEN PENCIL (Full edit / advance payment / multi-date form)
  // ---------------------------------------------------------------------------
  const handleOpenPencil = (loan) => {
    setError('');
    const cust = loan.customerId || {};
    if (cust.name) saveRecentName(cust.name);
    if (cust.phone) saveRecentNumber(cust.phone, cust.name, 'phone');
    if (loan.loanNo) saveRecentNumber(loan.loanNo, cust.name || '', 'loan');

    const formatted = {
      loanId: loan._id || loan.loanId,
      _id: loan._id || loan.loanId,
      loanNo: loan.loanNo,
      customerName: cust.name || loan.customerName || 'Unknown',
      customerPhone: cust.phone || loan.customerPhone || '',
      customerArea: cust.area || loan.customerArea || '',
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

    const instAmt = loan.installmentAmount || 200;
    setAmount(instAmt);
    setDate(formatDateForInput());
    setUseMultiDate(false);
    setMultiDates([{ id: 1, date: formatDateForInput(), amount: instAmt }]);
    setShareWhatsAppOnSave(false);
  };

  // Multi-date management helpers
  const handleAddMultiDate = () => {
    const instAmt = selectedLoan?.installmentAmount || 200;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + multiDates.length);
    setMultiDates((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        date: formatDateForInput(nextDate),
        amount: instAmt,
      },
    ]);
  };

  const handleUpdateMultiDate = (id, field, value) => {
    setMultiDates((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveMultiDate = (id) => {
    if (multiDates.length <= 1) return;
    setMultiDates((prev) => prev.filter((item) => item.id !== id));
  };

  // Sync total amount when multiDates change
  useEffect(() => {
    if (useMultiDate) {
      const sum = multiDates.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      setAmount(sum);
    }
  }, [useMultiDate, multiDates]);

  // ---------------------------------------------------------------------------
  // Financial Calculations for Full Form
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
  const balanceAfterPayment = Math.max(0, currentBalance - payNum);

  const currentProgressPct =
    totalPayable > 0 ? Math.min(100, Math.round((totalCollected / totalPayable) * 100)) : 0;
  const newProgressPct =
    totalPayable > 0
      ? Math.min(100, Math.round(((totalCollected + payNum) / totalPayable) * 100))
      : 0;

  const remainingDuesCount =
    installmentAmt > 0 ? Math.ceil(balanceAfterPayment / installmentAmt) : 0;

  const isFullSettlement = payNum > 0 && payNum >= currentBalance && currentBalance > 0;
  const isOverpaying = payNum > currentBalance && currentBalance > 0;

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
  // Full Form Submission Handler (Advance / Multi-date supported)
  // ---------------------------------------------------------------------------
  const handleFullFormSubmit = async (e) => {
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

    const loanId = selectedLoan.loanId || selectedLoan._id;

    try {
      setSubmitting(true);
      if (selectedLoan.customerName) {
        saveRecentName(selectedLoan.customerName);
      }

      let lastRecorded = null;

      if (useMultiDate && multiDates.length > 0) {
        // Record each installment date sequentially
        for (const item of multiDates) {
          const itemAmt = Number(item.amount) || 0;
          if (itemAmt > 0) {
            const res = await api.recordPayment({
              loanId,
              amount: itemAmt,
              mode,
              date: item.date || formatDateForInput(),
              notes: notes ? `${notes} (Multi-date installment)` : 'Multi-date advance payment',
            });
            lastRecorded = res?.payment;
          }
        }
      } else {
        const res = await api.recordPayment({
          loanId,
          amount: payNum,
          mode,
          date,
          notes,
        });
        lastRecorded = res?.payment;
      }

      const paymentId = lastRecorded?._id || lastRecorded?.id || `pay_${Date.now()}`;
      const isOffline = !navigator.onLine || !!lastRecorded?.isOffline;

      // Update state for today's collection map
      setTodayCollections((prev) => ({
        ...prev,
        [String(loanId)]: {
          paymentId,
          amount: payNum,
          remainingBalance: balanceAfterPayment,
          collectedBy: user?._id || 'owner',
          isOffline,
        },
      }));

      // Update active loans list locally
      setActiveLoansList((prev) =>
        prev.map((l) =>
          l._id === loanId || l.loanId === loanId
            ? {
                ...l,
                remainingBalance: balanceAfterPayment,
                totalCollected: (l.totalCollected || 0) + payNum,
              }
            : l
        )
      );

      // Confetti burst
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      } catch (e) {}

      // Optional WhatsApp sharing if selected
      if (shareWhatsAppOnSave && customerPhone) {
        const msg = generateReceiptMessage({
          customerName: rawCustomerName || 'Customer',
          loanNo: selectedLoan.loanNo,
          receiptNo: lastRecorded?.receiptNo || `RCP-${Date.now().toString().slice(-6)}`,
          amount: payNum,
          mode,
          date: date || formatDateForInput(),
          remainingBalance: balanceAfterPayment,
          lang: 'ta',
        });
        openWhatsApp({ phone: customerPhone, message: msg });
      }

      // Broadcast update across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }

      // Show toast
      showToast(loanId, paymentId, parsedName.primary, payNum);

      if (onSuccess) {
        onSuccess(lastRecorded || { loanId, amount: payNum, remainingBalance: balanceAfterPayment });
      }

      // If opened generically from selection popup, return back to the list
      if (!loanItem) {
        setSelectedLoan(null);
        setFullLoanData(null);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Full form submit error:', err);
      setError(err.message || 'Payment recording failed / வசூல் பதிவு தோல்வி');
    } finally {
      setSubmitting(false);
    }
  };

  // Holiday / Missed day submit
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
        reason:
          holidayReason ||
          (holidayType === 'missed' ? 'Missed Collection / தவறிய நாள்' : 'Holiday / விடுமுறை'),
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

  // ---------------------------------------------------------------------------
  // 3) FILTERING & SORTING (Pending First, Collected at Bottom in Green)
  // ---------------------------------------------------------------------------
  const filteredAndSortedLoans = useMemo(() => {
    return activeLoansList
      .filter((l) => {
        const loanId = l._id || l.loanId;
        const isCollectedToday = !!todayCollections[String(loanId)];

        // 1. Type / Status Filter Chip
        if (activeFilter === 'daily' && l.financeType !== 'daily') return false;
        if (activeFilter === 'weekly' && l.financeType !== 'weekly') return false;
        if (activeFilter === 'monthly' && l.financeType !== 'monthly') return false;
        if (activeFilter === 'pending_today' && isCollectedToday) return false;

        // 2. Search Box Filter
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const custName = (l.customerId?.name || l.customerName || '').toLowerCase();
        const custPhone = l.customerId?.phone || l.customerPhone || '';
        const loanNo = (l.loanNo || '').toLowerCase();
        const area = (l.customerId?.area || l.customerArea || '').toLowerCase();
        return custName.includes(q) || custPhone.includes(q) || loanNo.includes(q) || area.includes(q);
      })
      .sort((a, b) => {
        const aId = a._id || a.loanId;
        const bId = b._id || b.loanId;
        const aCollected = !!todayCollections[String(aId)];
        const bCollected = !!todayCollections[String(bId)];

        // Pending first (0), Collected at bottom (1)
        if (aCollected !== bCollected) {
          return aCollected ? 1 : -1;
        }
        return 0;
      });
  }, [activeLoansList, activeFilter, searchQuery, todayCollections]);

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
        } shadow-2xl border border-[#D5E9FA] overflow-hidden my-auto relative`}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div className="w-12 h-1.5 rounded-full bg-[#D5E9FA] mx-auto mb-2 shrink-0" />
        )}

        {/* =========================================================================
            HEADER: TITLE + ONE-LINE HINT + CLOSE BUTTON
        ========================================================================= */}
        <div className="flex justify-between items-start pb-3 border-b border-[#D5E9FA] shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-[#183653] flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-[#0878D1] shrink-0" />
              <span>Record Collection / வசூல் பதிவு</span>
            </h3>
            <p className="text-xs text-[#647C95] truncate mt-0.5">
              {selectedLoan
                ? `${parsedName.primary} • ${selectedLoan.loanNo}`
                : 'Tap Collect to save the installment instantly / உடனடியாக தவணையை வரவு வைக்க Collect-ஐ அழுத்தவும்'}
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
            VIEW 1: REDESIGNED BORROWER SELECTION POPUP WITH DIRECT COLLECT & PENCIL
        ========================================================================= */}
        {!selectedLoan ? (
          <div className="mt-3 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Sticky Search Box */}
            <div className="shrink-0 mb-2">
              <SmartNameInput
                value={searchQuery}
                onChange={setSearchQuery}
                isSearch={true}
                placeholder="Search borrower name, phone, loan #, area..."
                existingCustomers={activeLoansList
                  .map((l) => ({
                    _id: l._id || l.loanId,
                    name: l.customerId?.name || l.customerName,
                    phone: l.customerId?.phone || l.customerPhone,
                    area: l.customerId?.area || l.customerArea,
                  }))
                  .filter((c) => c.name)}
                onSelectCustomer={(cust) => {
                  setSearchQuery(cust.name);
                }}
                inputClassName="w-full pl-10 pr-9 h-11 rounded-2xl bg-[#F3F9FF] border border-[#D5E9FA] text-xs font-medium outline-none focus:ring-2 focus:ring-[#0878D1]/20 focus:border-[#0878D1]"
              />
            </div>

            {/* Filter Chips: All, Daily, Weekly, Monthly, Pending Today */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 shrink-0 scrollbar-none">
              {[
                { id: 'all', label: 'All / அனைத்தும்' },
                { id: 'pending_today', label: '⚡ Pending Today / இன்றைய நிலுவை' },
                { id: 'daily', label: 'Daily / தினசரி' },
                { id: 'weekly', label: 'Weekly / வாராந்திர' },
                { id: 'monthly', label: 'Monthly / மாதாந்திர' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition border ${
                    activeFilter === chip.id
                      ? 'bg-[#0878D1] border-[#0878D1] text-white shadow-xs'
                      : 'bg-white border-[#D5E9FA] text-[#647C95] hover:bg-[#F3F9FF]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Scrollable Borrower List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1 pb-2">
              {loadingLoans ? (
                <div className="p-8 text-center text-xs font-bold text-[#647C95]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0878D1]" />
                  Loading active loans / கடன்கள் ஏற்றப்படுகிறது...
                </div>
              ) : filteredAndSortedLoans.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-[#647C95] bg-[#F3F9FF] rounded-2xl border border-[#D5E9FA]">
                  No loans matching your filter or query.
                </div>
              ) : (
                filteredAndSortedLoans.map((l) => {
                  const loanId = l._id || l.loanId;
                  const pName = parseCustomerName(l.customerId?.name || l.customerName);
                  const remBal =
                    l.remainingBalance !== undefined
                      ? Number(l.remainingBalance)
                      : l.installmentAmount || 200;
                  const instAmt = Number(l.installmentAmount) || Number(l.dueAmount) || 200;
                  const collectAmount = Math.max(0, Math.min(instAmt, remBal));

                  const collectedInfo = todayCollections[String(loanId)];
                  const isCollected = !!collectedInfo;
                  const isPendingSync =
                    pendingSyncLoanIds.has(String(loanId)) ||
                    pendingSyncLoanIds.has(String(l.loanNo)) ||
                    collectedInfo?.isOffline;

                  // Double collection blocking & Undo permissions
                  const canUndo =
                    isOwner ||
                    (user &&
                      collectedInfo &&
                      (collectedInfo.collectedBy === user._id ||
                        collectedInfo.collectedBy === user.name ||
                        collectedInfo.collectedBy === user.username));

                  const isCollectingThis = collectingLoanId === loanId;

                  return (
                    <div
                      key={loanId}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isCollected
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                          : 'bg-white hover:bg-[#F3F9FF] border-[#D5E9FA] shadow-xs'
                      }`}
                    >
                      {/* Left: Borrower Identity & Loan Specs */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-black text-xs sm:text-sm text-[#183653] truncate">
                            {pName.primary}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] shrink-0">
                            {l.financeType || 'daily'}
                          </span>
                          {isPendingSync && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1 shrink-0">
                              <Clock className="w-2.5 h-2.5 animate-spin" />
                              <span>Pending sync</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#647C95] font-mono truncate mt-0.5">
                          <span className="font-bold text-[#0878D1]">{l.loanNo}</span>
                          {(l.customerId?.phone || l.customerPhone) && (
                            <span> • 📞 {l.customerId?.phone || l.customerPhone}</span>
                          )}
                          {(l.customerId?.area || l.customerArea) && (
                            <span> • 📍 {l.customerId?.area || l.customerArea}</span>
                          )}
                        </p>

                        {/* Status Message or Balance Info */}
                        {isCollected ? (
                          <div className="mt-1 flex items-center space-x-1.5 text-xs font-black text-[#18A879]">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Collected {formatCurrency(collectedInfo.amount)} today · Bal{' '}
                              {formatCurrency(remBal)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center space-x-3 text-[11px]">
                            <span className="font-bold text-[#064B8E]">
                              Bal: {formatCurrency(remBal)}
                            </span>
                            <span className="text-[#647C95]">
                              {formatCurrency(instAmt)} / due
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Direct Collect Button & Square Pencil Button */}
                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                        {isCollected ? (
                          // If already collected today: Block double collection, show Undo
                          canUndo && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleUndo(loanId, collectedInfo?.paymentId)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold active:scale-95 transition flex items-center space-x-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Undo / ரத்து</span>
                            </button>
                          )
                        ) : (
                          // Direct 1-Tap Collect Button
                          <button
                            type="button"
                            disabled={isCollectingThis || collectAmount <= 0}
                            onClick={() => handleDirectCollect(l)}
                            className="bg-[#18A879] hover:bg-[#138861] disabled:opacity-50 text-white min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center space-x-1.5 active:scale-95 transition"
                          >
                            {isCollectingThis ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Collect {formatCurrency(collectAmount)}</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Square Pencil Icon Button: Opens Full Form for Custom/Advance/Multi-Date */}
                        <button
                          type="button"
                          onClick={() => handleOpenPencil(l)}
                          title="Edit amount / advance payment / பல தவணைகள்"
                          className="w-10 h-10 rounded-xl border border-[#D5E9FA] bg-white hover:bg-[#EAF5FF] text-[#0878D1] hover:border-[#0878D1] flex items-center justify-center shrink-0 active:scale-95 transition shadow-2xs"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
              VIEW 2: FULL RECORD COLLECTION FORM (CUSTOM / ADVANCE / MULTI-DATE)
          ========================================================================= */
          <form
            onSubmit={handleFullFormSubmit}
            className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1 pb-1 scroll-smooth"
          >
            {/* Top Back to Selection Bar (when opened from selection popup) */}
            {!loanItem && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLoan(null);
                  setFullLoanData(null);
                }}
                className="flex items-center space-x-1.5 text-xs font-bold text-[#0878D1] hover:text-[#064B8E] bg-[#EAF5FF] hover:bg-[#D5E9FA] px-3 py-1.5 rounded-xl transition w-fit mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to borrower list / கடன் பட்டியலுக்குத் திரும்பு</span>
              </button>
            )}

            {/* Borrower Overview Strip */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#F3F9FF] via-white to-[#EAF5FF] border border-[#D5E9FA] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-[#0878D1]/20">
                    {parsedName.primary
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'VK'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-black text-xs sm:text-sm text-[#183653] truncate">
                        {parsedName.primary}
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] shrink-0">
                        {financeType}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#647C95] font-mono truncate">
                      {selectedLoan.loanNo}
                      {customerPhone ? ` • 📞 ${customerPhone}` : ''}
                      {customerArea ? ` • 📍 ${customerArea}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                <div className="p-1 rounded-xl bg-white border border-[#D5E9FA]">
                  <span className="text-[9px] text-[#647C95] font-bold block uppercase">
                    Total Due
                  </span>
                  <span className="text-xs font-black text-[#183653] tabular-nums block">
                    {formatCurrency(totalPayable)}
                  </span>
                </div>
                <div className="p-1 rounded-xl bg-white border border-[#D5E9FA]">
                  <span className="text-[9px] text-[#18A879] font-bold block uppercase">
                    Paid / வரவு
                  </span>
                  <span className="text-xs font-black text-[#18A879] tabular-nums block">
                    {formatCurrency(totalCollected)}
                  </span>
                </div>
                <div className="p-1 rounded-xl bg-[#EAF5FF] border border-[#BFE3FA]">
                  <span className="text-[9px] text-[#0878D1] font-bold block uppercase">
                    Balance / மீதி
                  </span>
                  <span className="text-xs font-black text-[#064B8E] tabular-nums block">
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Switcher: Payment vs Holiday / Missed */}
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
              /* Holiday Form */
              <div className="space-y-3 pt-1 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#647C95] mb-1.5">
                    Declaration Type / வகை
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHolidayType('holiday')}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
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
                      className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
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
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-bold text-xs outline-none focus:ring-2 focus:ring-[#0878D1]/20 focus:border-[#0878D1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#183653] mb-1">
                    Reason / குறிப்பு
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunday, Festival, Shop Closed..."
                    value={holidayReason}
                    onChange={(e) => setHolidayReason(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-bold text-xs outline-none focus:ring-2 focus:ring-[#0878D1]/20 focus:border-[#0878D1]"
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleHolidaySubmit}
                  className="w-full min-h-[44px] py-2 rounded-2xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#064B8E] hover:to-[#0878D1] text-white font-black text-xs shadow-md shadow-[#0878D1]/25 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98 transition"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm Declaration / உறுதிசெய்</span>
                </button>
              </div>
            ) : (
              /* Payment Entry Fields */
              <div className="space-y-3">
                {/* Advance Payment Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#647C95]">
                      Advance Presets / முன் கூட்டிய தவணைகள்
                    </label>
                    <span className="text-[10px] font-bold text-[#0878D1]">
                      1 Due = {formatCurrency(installmentAmt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {installmentAmt > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setUseMultiDate(false);
                            setAmount(installmentAmt);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[32px] ${
                            !useMultiDate && amount === installmentAmt
                              ? 'border-[#0878D1] bg-[#0878D1] text-white shadow-xs'
                              : 'bg-white border-[#D5E9FA] text-[#183653] hover:bg-[#EAF5FF]'
                          }`}
                        >
                          1 Due ({formatCurrency(installmentAmt)})
                        </button>

                        {currentBalance >= installmentAmt * 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setUseMultiDate(false);
                              setAmount(installmentAmt * 2);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[32px] ${
                              !useMultiDate && amount === installmentAmt * 2
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
                            onClick={() => {
                              setUseMultiDate(false);
                              setAmount(installmentAmt * 3);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[32px] ${
                              !useMultiDate && amount === installmentAmt * 3
                                ? 'border-[#0878D1] bg-[#0878D1] text-white shadow-xs'
                                : 'bg-white border-[#D5E9FA] text-[#183653] hover:bg-[#EAF5FF]'
                            }`}
                          >
                            3 Dues ({formatCurrency(installmentAmt * 3)})
                          </button>
                        )}
                      </>
                    )}

                    {currentBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseMultiDate(false);
                          setAmount(currentBalance);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[32px] flex items-center space-x-1 ${
                          !useMultiDate && amount === currentBalance
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

                {/* Multiple Dates Toggle & Builder */}
                <div className="p-2.5 rounded-2xl bg-[#F3F9FF] border border-[#D5E9FA] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-black text-[#183653]">
                      <Calendar className="w-3.5 h-3.5 text-[#0878D1]" />
                      <span>Multiple Dates / பல தேதிகள் தேர்வு</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUseMultiDate(!useMultiDate)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl transition ${
                        useMultiDate
                          ? 'bg-[#0878D1] text-white shadow-xs'
                          : 'bg-white text-[#647C95] border border-[#D5E9FA] hover:text-[#183653]'
                      }`}
                    >
                      {useMultiDate ? '✓ Multi-Date Active' : '+ Enable Multi-Date'}
                    </button>
                  </div>

                  {useMultiDate ? (
                    <div className="space-y-2 pt-1">
                      {multiDates.map((item, idx) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-[#647C95] w-5">
                            #{idx + 1}
                          </span>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) =>
                              handleUpdateMultiDate(item.id, 'date', e.target.value)
                            }
                            className="flex-1 h-9 px-2.5 rounded-xl bg-white border border-[#D5E9FA] text-xs font-bold text-[#183653]"
                          />
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0878D1]">
                              ₹
                            </span>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) =>
                                handleUpdateMultiDate(item.id, 'amount', Number(e.target.value))
                              }
                              className="w-full pl-6 pr-2 h-9 rounded-xl bg-white border border-[#D5E9FA] text-xs font-black text-[#183653]"
                            />
                          </div>
                          {multiDates.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMultiDate(item.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddMultiDate}
                        className="w-full py-1.5 rounded-xl border border-dashed border-[#0878D1] text-[#0878D1] text-xs font-bold hover:bg-[#EAF5FF] transition flex items-center justify-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Another Date / மற்றொரு தேதி சேர்க்க</span>
                      </button>
                    </div>
                  ) : (
                    /* Standard Single Date & Amount Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                      <div>
                        <label className="block text-xs font-black text-[#183653] mb-1">
                          Payment Amount / வசூல் தொகை ₹ *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-black text-[#0878D1]">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={amount || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setAmount(val);
                            }}
                            className="w-full pl-8 pr-3 h-10 rounded-xl bg-white border-2 border-[#D5E9FA] text-[#183653] font-black text-base outline-none focus:border-[#0878D1]"
                            placeholder="Enter amount"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-[#183653] mb-1">
                          Receipt Date / தேதி *
                        </label>
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full px-3 h-10 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-bold text-xs outline-none focus:border-[#0878D1]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Option: Cash vs UPI/GPay */}
                <div>
                  <label className="block text-xs font-black text-[#183653] mb-1">
                    Pay Option / செலுத்தும் முறை *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('cash')}
                      className={`min-h-[42px] px-3 py-1.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-xs transition border-2 ${
                        mode === 'cash'
                          ? 'bg-[#EAF5FF] border-[#0878D1] text-[#0878D1] shadow-xs'
                          : 'bg-white border-[#D5E9FA] text-[#647C95] hover:bg-[#F3F9FF]'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash / ரொக்கம்</span>
                      {mode === 'cash' && <Check className="w-3.5 h-3.5 stroke-[3] ml-1" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('upi')}
                      className={`min-h-[42px] px-3 py-1.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-xs transition border-2 ${
                        mode === 'upi'
                          ? 'bg-[#EAF5FF] border-[#0878D1] text-[#0878D1] shadow-xs'
                          : 'bg-white border-[#D5E9FA] text-[#647C95] hover:bg-[#F3F9FF]'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>UPI / GPay</span>
                      {mode === 'upi' && <Check className="w-3.5 h-3.5 stroke-[3] ml-1" />}
                    </button>
                  </div>
                </div>

                {/* Live Balance Summary */}
                <div className="p-2.5 rounded-2xl bg-gradient-to-r from-[#F3F9FF] to-[#EAF5FF] border border-[#D5E9FA] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#064B8E]">
                      Balance After Payment / மீதி நிலுவை
                    </span>
                    <span className="text-[10px] text-[#647C95]">
                      {remainingDuesCount} {financeType === 'daily' ? 'days' : 'dues'} left
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-xl font-black text-[#064B8E] tabular-nums">
                      {formatCurrency(balanceAfterPayment)}
                    </span>
                    {payNum > 0 && (
                      <span className="text-xs text-[#647C95] font-mono">
                        ({formatCurrency(currentBalance)} – {formatCurrency(payNum)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Notes / குறிப்பு (optional, e.g. GPay UTR, paid at shop...)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-medium text-xs outline-none focus:border-[#0878D1]"
                  />
                </div>

                {/* Optional WhatsApp Sharing (Off by default as required) */}
                {customerPhone && (
                  <label className="flex items-center space-x-2 text-xs font-bold text-[#647C95] cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={shareWhatsAppOnSave}
                      onChange={(e) => setShareWhatsAppOnSave(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0878D1] focus:ring-[#0878D1]"
                    />
                    <span>Send WhatsApp Receipt to Borrower / வாட்ஸ்அப் ரசீது அனுப்பு</span>
                  </label>
                )}

                {/* Confirm Action Button */}
                <div className="pt-1 shrink-0">
                  <button
                    type="submit"
                    disabled={submitting || payNum <= 0}
                    className="w-full min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#064B8E] hover:to-[#0878D1] disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-lg shadow-[#0878D1]/25 flex items-center justify-center space-x-2 transition active:scale-[0.98]"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Recording Collection...</span>
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
              </div>
            )}
          </form>
        )}

        {/* =========================================================================
            8-SECOND FLOATING TOAST WITH UNDO ACTION
        ========================================================================= */}
        {toast && (
          <div className="absolute bottom-3 left-4 right-4 z-50 p-3 rounded-2xl bg-[#064B8E] text-white shadow-2xl border border-[#55B8F5]/40 flex items-center justify-between space-x-3 animate-fade-in">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#18A879] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <p className="text-xs font-bold truncate">
                <span>{formatCurrency(toast.amount)} collected from </span>
                <span className="font-black text-[#55B8F5]">{toast.customerName}</span>
              </p>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleUndo(toast.loanId, toast.paymentId)}
                className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-xs transition active:scale-95 flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                  setToast(null);
                }}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
