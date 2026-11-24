import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import api from '../../services/api';
import { formatCurrency, formatDateForInput, formatDate } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { useAuth } from '../../context/AuthContext';
import { openWhatsApp, generateReceiptMessage } from '../../utils/whatsapp';
import { getSyncQueue } from '../../services/offlineQueue';
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

/**
 * Live device date in Asia/Kolkata timezone
 */
const getKolkataDate = () => {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  } catch (e) {
    return new Date();
  }
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
  const [activeFilter, setActiveFilter] = useState('pending_today'); // 'pending_today' default selected

  // Live device date in Asia/Kolkata (updates automatically past midnight)
  const [liveTime, setLiveTime] = useState(getKolkataDate);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(getKolkataDate());
    }, 20000); // 20s interval so it catches midnight automatically
    return () => clearInterval(timer);
  }, []);

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
  // OPEN PENCIL (Full edit / advance payment / multi-date form)
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

  const remainingDuesCount =
    installmentAmt > 0 ? Math.ceil(balanceAfterPayment / installmentAmt) : 0;

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
  // 2) TODAY SUMMARY METRICS (Calculated purely from existing data)
  // ---------------------------------------------------------------------------
  const todayMetrics = useMemo(() => {
    let due = 0;
    let collected = 0;

    activeLoansList.forEach((l) => {
      const loanId = l._id || l.loanId;
      const instAmt = Number(l.installmentAmount) || Number(l.dueAmount) || 200;
      const remBal = l.remainingBalance !== undefined ? Number(l.remainingBalance) : instAmt;
      const capDue = Math.min(instAmt, remBal);

      due += capDue;

      const collectedInfo = todayCollections[String(loanId)];
      if (collectedInfo) {
        collected += Number(collectedInfo.amount) || 0;
      }
    });

    const pending = Math.max(0, due - collected);
    const pct = due > 0 ? Math.min(100, Math.round((collected / due) * 100)) : 0;
    return { due, collected, pending, pct };
  }, [activeLoansList, todayCollections]);

  // ---------------------------------------------------------------------------
  // Full Form Submission Handler
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

  // Holiday submit
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

        // Filter chips logic
        if (activeFilter === 'daily' && l.financeType !== 'daily') return false;
        if (activeFilter === 'weekly' && l.financeType !== 'weekly') return false;
        if (activeFilter === 'monthly' && l.financeType !== 'monthly') return false;
        if (activeFilter === 'pending_today' && isCollectedToday) return false;

        // Search logic (Phone remains searchable!)
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

  // Calendar tile calculations for current Asia/Kolkata date
  const tamilWeekdays = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
  const dayNameEn = liveTime.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNum = liveTime.getDate();
  const monthShortEn = liveTime.toLocaleDateString('en-US', { month: 'short' });
  const monthUpper = monthShortEn.toUpperCase();
  const yearNum = liveTime.getFullYear();
  const dayNameTa = tamilWeekdays[liveTime.getDay()] || '';
  const liveDateString = `${dayNameEn}, ${dayNum} ${monthShortEn} ${yearNum} · ${dayNameTa}`;

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
        className={`bg-white dark:bg-slate-900 ${
          isMobile
            ? 'rounded-t-2xl max-w-lg w-full max-h-[94vh] flex flex-col p-4 pb-safe'
            : 'rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col p-4 sm:p-5'
        } shadow-2xl border border-[#D5E9FA] dark:border-slate-800 overflow-hidden my-auto relative`}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div className="w-12 h-1.5 rounded-full bg-[#D5E9FA] dark:bg-slate-700 mx-auto mb-2 shrink-0" />
        )}

        {/* =========================================================================
            1) HEADER WITH TODAY'S DATE (ALWAYS VISIBLE AT TOP)
        ========================================================================= */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#EAF5FF] dark:bg-slate-800/80 border border-[#D5E9FA] dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 mb-2.5">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Small Calendar Tile: Month abbreviation on blue strip, big day below */}
            <div className="w-11 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#BFE3FA] dark:border-slate-700 overflow-hidden flex flex-col shadow-xs shrink-0 text-center">
              <div className="bg-[#0878D1] text-white text-[9px] font-black tracking-wider py-0.5 uppercase leading-none">
                {monthUpper}
              </div>
              <div className="flex-1 flex items-center justify-center font-black text-base text-[#183653] dark:text-white leading-none">
                {dayNum}
              </div>
            </div>

            {/* Title & Live Asia/Kolkata Date */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-black text-[#183653] dark:text-white truncate">
                {selectedLoan
                  ? `${parsedName.primary} • ${selectedLoan.loanNo}`
                  : 'Record Collection / வசூல் பதிவு'}
              </h3>
              <p className="text-[11px] sm:text-xs font-semibold text-[#0878D1] dark:text-[#55B8F5] truncate mt-0.5">
                {liveDateString}
              </p>
            </div>
          </div>

          {/* Round Close Button on the Right */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 hover:bg-[#F3F9FF] text-[#647C95] hover:text-[#183653] dark:text-slate-400 dark:hover:text-white border border-[#D5E9FA] dark:border-slate-700 transition flex items-center justify-center shrink-0 shadow-2xs"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shrink-0 flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* =========================================================================
            SELECTION VIEW (BORROWER LIST, TODAY SUMMARY, SEARCH & 2-LINE FILTERS)
        ========================================================================= */}
        {!selectedLoan ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* FIXED TOP SECTION: TODAY SUMMARY + SEARCH + 2-LINE FILTERS */}
            <div className="shrink-0 space-y-2 mb-2">
              {/* 2) Today Summary Strip: 3 Cards + Thin Green Progress Bar */}
              <div className="p-2.5 rounded-2xl bg-[#F3F9FF] dark:bg-slate-800/40 border border-[#D5E9FA] dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {/* Due Today */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-[#D5E9FA] dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-[#647C95] dark:text-slate-400 font-bold uppercase block truncate">
                      Due Today / தேவை
                    </span>
                    <p className="text-xs sm:text-sm font-black text-[#183653] dark:text-white tabular-nums mt-0.5">
                      {formatCurrency(todayMetrics.due)}
                    </p>
                  </div>

                  {/* Collected */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
                    <span className="text-[10px] text-[#18A879] font-bold uppercase block truncate">
                      Collected / வரவு
                    </span>
                    <p className="text-xs sm:text-sm font-black text-[#18A879] tabular-nums mt-0.5">
                      {formatCurrency(todayMetrics.collected)}
                    </p>
                  </div>

                  {/* Pending */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase block truncate">
                      Pending / நிலுவை
                    </span>
                    <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                      {formatCurrency(todayMetrics.pending)}
                    </p>
                  </div>
                </div>

                {/* Thin Green Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#647C95] dark:text-slate-400 px-0.5">
                    <span>Percent Collected / வசூல் சதவீதம்</span>
                    <span className="text-[#18A879] font-mono font-bold">{todayMetrics.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#EAF5FF] dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-[#18A879] transition-all duration-300 rounded-full"
                      style={{ width: `${todayMetrics.pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 3) Clean Search Field */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#647C95] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search borrower name, phone, loan #, area..."
                  className="w-full pl-9 pr-9 h-10 rounded-xl bg-white dark:bg-slate-900 border border-[#D5E9FA] dark:border-slate-800 text-xs font-medium text-[#183653] dark:text-white placeholder-[#647C95] outline-none focus:border-[#0878D1] focus:ring-2 focus:ring-[#0878D1]/20 transition shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#647C95] hover:text-[#183653] p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Chips: 2-line wrap without horizontal scroll */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { id: 'pending_today', label: 'Pending today / இன்றைய நிலுவை' },
                  { id: 'all', label: 'All / அனைத்தும்' },
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                ].map((chip) => {
                  const isSelected = activeFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setActiveFilter(chip.id)}
                      className={`px-3 py-1.5 rounded-full text-xs transition border ${
                        isSelected
                          ? 'bg-[#0878D1] border-[#0878D1] text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-800 border-[#D5E9FA] dark:border-slate-700 text-[#647C95] dark:text-slate-300 hover:bg-[#F3F9FF] dark:hover:bg-slate-700 font-medium'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SCROLLABLE BORROWER LIST */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-0.5 pb-2">
              {loadingLoans ? (
                <div className="p-8 text-center text-xs font-bold text-[#647C95]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0878D1]" />
                  Loading active loans / கடன்கள் ஏற்றப்படுகிறது...
                </div>
              ) : filteredAndSortedLoans.length === 0 ? (
                /* 5) Friendly Empty State Card */
                <div className="p-6 rounded-2xl border-2 border-dashed border-[#D5E9FA] dark:border-slate-800 bg-[#F3F9FF]/60 dark:bg-slate-800/40 text-center space-y-2.5 my-3 animate-fade-in">
                  {searchQuery.trim().length > 0 ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-[#EAF5FF] dark:bg-slate-800 text-[#0878D1] flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#183653] dark:text-white">
                          No match for "{searchQuery}"
                        </h4>
                        <p className="text-xs text-[#647C95] dark:text-slate-400 mt-0.5">
                          Check the spelling or try searching by borrower name, phone, loan #, or area.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="px-4 py-2 rounded-xl bg-[#0878D1] hover:bg-[#064B8E] text-white font-bold text-xs shadow-xs transition active:scale-95 inline-flex items-center space-x-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear search / தேடலை நீக்கு</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-[#EAF5FF] dark:bg-slate-800 text-[#0878D1] flex items-center justify-center mx-auto">
                        {activeFilter === 'pending_today' ? (
                          <CheckCircle className="w-6 h-6 text-[#18A879]" />
                        ) : (
                          <CreditCard className="w-6 h-6 text-[#0878D1]" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#183653] dark:text-white">
                          {activeFilter === 'pending_today'
                            ? 'No pending loans due today / இன்று நிலுவை ஏதுமில்லை'
                            : activeFilter === 'daily'
                            ? 'No daily loans due today / தினசரி கடன்கள் ஏதுமில்லை'
                            : activeFilter === 'weekly'
                            ? 'No weekly loans due today / வாராந்திர கடன்கள் ஏதுமில்லை'
                            : activeFilter === 'monthly'
                            ? 'No monthly loans due today / மாதாந்திர கடன்கள் ஏதுமில்லை'
                            : 'No active loans found / கடன்கள் ஏதுமில்லை'}
                        </h4>
                        <p className="text-xs text-[#647C95] dark:text-slate-400 mt-0.5">
                          {activeFilter === 'pending_today'
                            ? 'All scheduled installments for today have been collected or none are due.'
                            : `There are currently no active ${activeFilter} loans found in this view.`}
                        </p>
                      </div>
                      {activeFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setActiveFilter('all')}
                          className="px-4 py-2 rounded-xl bg-[#0878D1] hover:bg-[#064B8E] text-white font-bold text-xs shadow-xs transition active:scale-95"
                        >
                          Show all loans / அனைத்து கடன்களையும் காட்டு
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* 4) Borrower Row Cards */
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
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isCollected
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-900 hover:bg-[#F3F9FF] dark:hover:bg-slate-850 border-[#D5E9FA] dark:border-slate-800 shadow-2xs'
                      }`}
                    >
                      {/* Left: Round Initial Avatar + Line 1 (Name, Tag, Loan #, Area) + Line 2 (Balance in Amber) */}
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {pName.primary
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'VK'}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Line 1: Name, Tag, Loan #, Area (Phone hidden to avoid clutter) */}
                          <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                            <span className="font-black text-sm text-[#183653] dark:text-white truncate">
                              {pName.primary}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EAF5FF] dark:bg-slate-800 text-[#0878D1] dark:text-[#55B8F5] border border-[#D5E9FA] dark:border-slate-700 shrink-0">
                              {l.financeType || 'daily'}
                            </span>
                            <span className="font-bold text-xs text-[#0878D1] dark:text-[#55B8F5] font-mono shrink-0">
                              {l.loanNo}
                            </span>
                            {(l.customerId?.area || l.customerArea) && (
                              <span className="text-xs text-[#647C95] dark:text-slate-400 truncate">
                                • {l.customerId?.area || l.customerArea}
                              </span>
                            )}
                            {isPendingSync && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1 shrink-0">
                                <Clock className="w-2.5 h-2.5 animate-spin" />
                                <span>Syncing</span>
                              </span>
                            )}
                          </div>

                          {/* Line 2: Balance in amber below (or Collected Today status) */}
                          <div className="mt-0.5 flex items-center space-x-2 text-xs">
                            {isCollected ? (
                              <div className="flex items-center space-x-1.5 text-xs font-black text-[#18A879]">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Collected {formatCurrency(collectedInfo.amount)} today · Bal{' '}
                                  {formatCurrency(remBal)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-amber-600 dark:text-amber-500">
                                  Bal: {formatCurrency(remBal)}
                                </span>
                                <span className="text-[#647C95] dark:text-slate-400">
                                  · {formatCurrency(instAmt)} / due
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions (Collect & Square Pencil Button) */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {isCollected ? (
                          canUndo && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleUndo(loanId, collectedInfo?.paymentId)}
                              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold active:scale-95 transition flex items-center space-x-1 shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Undo</span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            disabled={isCollectingThis || collectAmount <= 0}
                            onClick={() => handleDirectCollect(l)}
                            className="bg-[#18A879] hover:bg-[#138861] disabled:opacity-50 text-white min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs flex items-center space-x-1.5 active:scale-95 transition"
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

                        {/* Square Pencil Button: Opens Full Form for Custom/Advance/Multi-Date */}
                        <button
                          type="button"
                          onClick={() => handleOpenPencil(l)}
                          title="Edit amount / advance payment"
                          className="w-9 h-9 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-[#0878D1] dark:text-[#55B8F5] flex items-center justify-center shrink-0 active:scale-95 transition shadow-2xs"
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
            className="flex-1 overflow-y-auto space-y-3 pr-1 pb-1 scroll-smooth"
          >
            {/* Top Back to Selection Bar */}
            {!loanItem && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLoan(null);
                  setFullLoanData(null);
                }}
                className="flex items-center space-x-1.5 text-xs font-bold text-[#0878D1] hover:text-[#064B8E] bg-[#EAF5FF] dark:bg-slate-800 hover:bg-[#D5E9FA] px-3 py-1.5 rounded-xl transition w-fit mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to borrower list / கடன் பட்டியலுக்குத் திரும்பு</span>
              </button>
            )}

            {/* Borrower Overview Strip */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#F3F9FF] via-white to-[#EAF5FF] dark:from-slate-850 dark:to-slate-800 border border-[#D5E9FA] dark:border-slate-800 shadow-xs space-y-2">
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
                      <p className="font-black text-xs sm:text-sm text-[#183653] dark:text-white truncate">
                        {parsedName.primary}
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EAF5FF] dark:bg-slate-800 text-[#0878D1] dark:text-[#55B8F5] border border-[#D5E9FA] dark:border-slate-700 shrink-0">
                        {financeType}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#647C95] dark:text-slate-400 font-mono truncate">
                      {selectedLoan.loanNo}
                      {customerPhone ? ` • 📞 ${customerPhone}` : ''}
                      {customerArea ? ` • 📍 ${customerArea}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                <div className="p-1 rounded-xl bg-white dark:bg-slate-900 border border-[#D5E9FA] dark:border-slate-800">
                  <span className="text-[9px] text-[#647C95] dark:text-slate-400 font-bold block uppercase">
                    Total Due
                  </span>
                  <span className="text-xs font-black text-[#183653] dark:text-white tabular-nums block">
                    {formatCurrency(totalPayable)}
                  </span>
                </div>
                <div className="p-1 rounded-xl bg-white dark:bg-slate-900 border border-[#D5E9FA] dark:border-slate-800">
                  <span className="text-[9px] text-[#18A879] font-bold block uppercase">
                    Paid / வரவு
                  </span>
                  <span className="text-xs font-black text-[#18A879] tabular-nums block">
                    {formatCurrency(totalCollected)}
                  </span>
                </div>
                <div className="p-1 rounded-xl bg-[#EAF5FF] dark:bg-slate-800 border border-[#BFE3FA] dark:border-slate-700">
                  <span className="text-[9px] text-[#0878D1] dark:text-[#55B8F5] font-bold block uppercase">
                    Balance / மீதி
                  </span>
                  <span className="text-xs font-black text-[#064B8E] dark:text-white tabular-nums block">
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Switcher: Payment vs Holiday / Missed */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#F3F9FF] dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setEntryMode('payment')}
                className={`py-1.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 ${
                  entryMode === 'payment'
                    ? 'bg-[#0878D1] text-white shadow-xs'
                    : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
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
                    : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
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
