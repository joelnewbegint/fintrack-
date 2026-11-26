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
  ChevronRight,
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

/**
 * Separate Holiday Table Storage Helpers (Additive only, leaves existing records untouched)
 */
const STORAGE_KEY_HOLIDAYS = 'fintrack_loan_holidays';
const STORAGE_KEY_HOLIDAY_LOGS = 'fintrack_holiday_logs';

const getStoredHolidays = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HOLIDAYS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveStoredHolidays = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(list));
  } catch (e) {}
};

const logHolidayAction = (action, details) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HOLIDAY_LOGS);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      ...details,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY_HOLIDAY_LOGS, JSON.stringify(logs.slice(0, 200)));
  } catch (e) {}
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

  // Separate holiday records
  const [storedHolidays, setStoredHolidays] = useState(getStoredHolidays);

  // Holiday Sheet Modal State (Small sheet popup for borrower card)
  const [holidayModalLoan, setHolidayModalLoan] = useState(null);
  const [holidayChoice, setHolidayChoice] = useState('today'); // 'today' | 'pick' | 'range'
  const [holidayDates, setHolidayDates] = useState([formatDateForInput()]);
  const [holidayRangeStart, setHolidayRangeStart] = useState(formatDateForInput());
  const [holidayRangeEnd, setHolidayRangeEnd] = useState(formatDateForInput());
  const [holidayModalReason, setHolidayModalReason] = useState('');
  const [holidayExtendSchedule, setHolidayExtendSchedule] = useState(false);
  const [holidaySheetError, setHolidaySheetError] = useState('');
  const [savingHoliday, setSavingHoliday] = useState(false);

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
  const [entryMode, setEntryMode] = useState('payment'); // 'payment' | 'holiday' | 'leave'
  const [holidayType, setHolidayType] = useState('holiday'); // 'holiday' | 'missed'
  const [holidayReason, setHolidayReason] = useState('');
  const [skipOption, setSkipOption] = useState('move_next'); // 'move_next' | 'extend_end' | 'skip_only'

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
  // 1) CARD TAP NAVIGATION (Opens loan repayment schedule / detail page, closes popup)
  // ---------------------------------------------------------------------------
  const handleCardClick = (l) => {
    const loanId = l._id || l.loanId;
    const custId =
      l.customerId?._id ||
      (typeof l.customerId === 'string' && l.customerId.length > 5 ? l.customerId : null);

    if (loanId) {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/loans/${loanId}`);
        window.dispatchEvent(
          new CustomEvent('fintrack:navigate-loan', {
            detail: { loanId },
          })
        );
      }
    } else if (custId) {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/customers/${custId}`);
        window.dispatchEvent(
          new CustomEvent('fintrack:navigate-customer', {
            detail: { customerId: custId },
          })
        );
      }
    }
    onClose();
  };

  // ---------------------------------------------------------------------------
  // 2) OVERDUE BADGE CALCULATION (Read-only, excludes holidays & paid dues)
  // ---------------------------------------------------------------------------
  const getOverdueMetrics = (loan) => {
    if (!Array.isArray(loan?.schedule) || loan.schedule.length === 0) {
      return { count: 0, amount: 0 };
    }

    const loanId = String(loan._id || loan.loanId);

    // Collect all holiday dates for this loan
    const holidayDates = new Set();
    if (Array.isArray(loan.holidays)) {
      loan.holidays.forEach((h) => {
        if (h.date) holidayDates.add(h.date.slice(0, 10));
      });
    }
    storedHolidays.forEach((h) => {
      if (String(h.loanId) === loanId && h.date) {
        holidayDates.add(h.date.slice(0, 10));
      }
    });

    let count = 0;
    let amount = 0;

    loan.schedule.forEach((inst) => {
      if (inst.status === 'paid') return;
      const dueStr = inst.dueDate ? inst.dueDate.slice(0, 10) : '';
      if (!dueStr || dueStr >= todayStr) return; // Only installments due before today
      if (inst.status === 'holiday' || inst.status === 'missed' || holidayDates.has(dueStr)) {
        return; // Exclude holidays
      }

      const instAmt = Number(inst.amount) || Number(loan.installmentAmount) || 0;
      const paidAmt = Number(inst.paidAmount) || 0;
      const unpaid = Math.max(0, instAmt - paidAmt);
      if (unpaid > 0) {
        count += 1;
        amount += unpaid;
      }
    });

    return { count, amount };
  };

  // ---------------------------------------------------------------------------
  // 3) HOLIDAY HELPERS & RECORD LOOKUP
  // ---------------------------------------------------------------------------
  const getTodayHolidayRecord = (loan) => {
    const loanId = String(loan._id || loan.loanId);

    // Check separate holiday table
    const localHol = storedHolidays.find(
      (h) => String(h.loanId) === loanId && h.date === todayStr
    );
    if (localHol) return localHol;

    // Check loan.holidays
    if (Array.isArray(loan.holidays)) {
      const dbHol = loan.holidays.find((h) => {
        const d = h.date ? h.date.slice(0, 10) : '';
        return d === todayStr;
      });
      if (dbHol) return dbHol;
    }

    // Check schedule for today
    if (Array.isArray(loan.schedule)) {
      const instToday = loan.schedule.find((inst) => {
        const d = inst.dueDate ? inst.dueDate.slice(0, 10) : '';
        return d === todayStr && (inst.status === 'holiday' || inst.status === 'missed');
      });
      if (instToday) return instToday;
    }

    return null;
  };

  const handleOpenHolidayModal = (loan) => {
    setHolidayModalLoan(loan);
    setHolidayChoice('today');
    setHolidayDates([formatDateForInput()]);
    setHolidayRangeStart(formatDateForInput());
    setHolidayRangeEnd(formatDateForInput());
    setHolidayModalReason('');
    setHolidayExtendSchedule(false);
    setHolidaySheetError('');
  };

  const handleSaveHolidaySheet = async (e) => {
    if (e) e.preventDefault();
    setHolidaySheetError('');

    if (!holidayModalLoan) return;
    const loanId = String(holidayModalLoan._id || holidayModalLoan.loanId);

    // Determine target dates
    let targetDates = [];
    if (holidayChoice === 'today') {
      targetDates = [todayStr];
    } else if (holidayChoice === 'pick') {
      targetDates = holidayDates.filter((d) => d && d.trim().length > 0);
    } else if (holidayChoice === 'range') {
      if (!holidayRangeStart || !holidayRangeEnd) {
        setHolidaySheetError('Please select start and end dates / தேதிகளைத் தேர்ந்தெடுக்கவும்');
        return;
      }
      const start = new Date(holidayRangeStart);
      const end = new Date(holidayRangeEnd);
      if (start > end) {
        setHolidaySheetError(
          'End date must be on or after start date / முடிவு தேதி தொடக்க தேதிக்கு பின் இருக்க வேண்டும்'
        );
        return;
      }
      const cur = new Date(start);
      while (cur <= end) {
        targetDates.push(formatDateForInput(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }

    if (targetDates.length === 0) {
      setHolidaySheetError(
        'Please specify at least one date / குறைந்தபட்சம் ஒரு தேதியை தேர்வு செய்யவும்'
      );
      return;
    }

    // Validation: Block holidays on dates already fully paid
    if (Array.isArray(holidayModalLoan.schedule)) {
      for (const tDate of targetDates) {
        const inst = holidayModalLoan.schedule.find((item) => {
          const d = item.dueDate ? item.dueDate.slice(0, 10) : '';
          return d === tDate;
        });
        if (
          inst &&
          (inst.status === 'paid' || (inst.paidAmount && inst.paidAmount >= inst.amount))
        ) {
          setHolidaySheetError(
            `Cannot declare holiday on ${tDate}: installment is already paid / ${tDate} ஏற்கனவே வசூலிக்கப்பட்டது`
          );
          return;
        }
      }
    }

    try {
      setSavingHoliday(true);
      const newRecords = [];

      for (const tDate of targetDates) {
        const rec = {
          id: `hol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          loanId,
          date: tDate,
          reason: holidayModalReason.trim() || 'Holiday / விடுமுறை',
          extendSchedule: !!holidayExtendSchedule,
          createdBy: user?._id || user?.username || 'owner',
          userName: user?.name || user?.username || 'Owner',
          createdAt: new Date().toISOString(),
        };
        newRecords.push(rec);

        // Call backend API / offline sync
        try {
          await api.declareLoanHoliday(loanId, {
            date: tDate,
            type: 'holiday',
            reason: holidayModalReason || 'Holiday / விடுமுறை',
          });
        } catch (apiErr) {
          console.warn('Backend holiday declaration failed/offline queued:', apiErr);
        }

        // Log holiday creation with user and time
        logHolidayAction('CREATE_HOLIDAY', {
          loanId,
          loanNo: holidayModalLoan.loanNo,
          customerName:
            holidayModalLoan.customerId?.name || holidayModalLoan.customerName,
          date: tDate,
          reason: holidayModalReason,
          extendSchedule: holidayExtendSchedule,
          user: user?.name || user?.username || 'Owner',
        });
      }

      // Save to separate holiday table
      const updatedHols = [...storedHolidays, ...newRecords];
      saveStoredHolidays(updatedHols);
      setStoredHolidays(updatedHols);

      // Optimistically update activeLoansList
      setActiveLoansList((prev) =>
        prev.map((l) => {
          if (String(l._id || l.loanId) === loanId) {
            const hols = Array.isArray(l.holidays) ? [...l.holidays] : [];
            targetDates.forEach((td) => {
              hols.push({ date: td, type: 'holiday', reason: holidayModalReason });
            });
            const sched = Array.isArray(l.schedule)
              ? l.schedule.map((inst) => {
                  const d = inst.dueDate ? inst.dueDate.slice(0, 10) : '';
                  if (targetDates.includes(d) && inst.status !== 'paid') {
                    return { ...inst, status: 'holiday', holidayReason: holidayModalReason };
                  }
                  return inst;
                })
              : l.schedule;
            return { ...l, holidays: hols, schedule: sched };
          }
          return l;
        })
      );

      // Broadcast update across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }

      // Close modal sheet
      setHolidayModalLoan(null);
    } catch (err) {
      console.error('Save holiday error:', err);
      setHolidaySheetError(err.message || 'Failed to save holiday / விடுமுறை பதிவு தோல்வி');
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleUndoHoliday = async (loan) => {
    const loanId = String(loan._id || loan.loanId);
    try {
      setSubmitting(true);
      // Remove from storedHolidays for today's date
      const updatedHols = storedHolidays.filter(
        (h) => !(String(h.loanId) === loanId && h.date === todayStr)
      );
      saveStoredHolidays(updatedHols);
      setStoredHolidays(updatedHols);

      // Log holiday undo with user and time
      logHolidayAction('UNDO_HOLIDAY', {
        loanId,
        loanNo: loan.loanNo,
        date: todayStr,
        user: user?.name || user?.username || 'Owner',
      });

      // Call backend API / offline sync
      try {
        await api.removeLoanHoliday(loanId, { date: todayStr });
      } catch (e) {
        console.warn('Backend holiday remove failed/offline queued:', e);
      }

      // Optimistically update activeLoansList
      setActiveLoansList((prev) =>
        prev.map((l) => {
          if (String(l._id || l.loanId) === loanId) {
            const hols = Array.isArray(l.holidays)
              ? l.holidays.filter((h) => (h.date ? h.date.slice(0, 10) : '') !== todayStr)
              : [];
            const sched = Array.isArray(l.schedule)
              ? l.schedule.map((inst) => {
                  const d = inst.dueDate ? inst.dueDate.slice(0, 10) : '';
                  if (d === todayStr && inst.status === 'holiday') {
                    return { ...inst, status: 'pending', holidayReason: '' };
                  }
                  return inst;
                })
              : l.schedule;
            return { ...l, holidays: hols, schedule: sched };
          }
          return l;
        })
      );

      // Broadcast update across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      console.error('Undo holiday error:', err);
      setError(err.message || 'Failed to undo holiday / விடுமுறை ரத்து தோல்வி');
    } finally {
      setSubmitting(false);
    }
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

    const maxAllowed = Math.max(0, Number(currentBalance) || 0);

    if (!useMultiDate && payNum > maxAllowed) {
      setError(`Amount cannot exceed pending due (${formatCurrency(maxAllowed)}) / தொகை நிலுவைத் தொகை ${formatCurrency(maxAllowed)}-க்கு மேல் இருக்கக் கூடாது`);
      return;
    }

    const loanId = selectedLoan.loanId || selectedLoan._id;

    try {
      setSubmitting(true);
      if (selectedLoan.customerName) {
        saveRecentName(selectedLoan.customerName);
      }

      let lastRecorded = null;
      let updatedServerLoan = null;

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
        const res = await api.recordInstallmentAction(loanId, {
          action: 'pay',
          amount: payNum,
          mode,
          paidDate: date,
          notes,
        });
        lastRecorded = res?.payments?.[0] || res?.payment;
        updatedServerLoan = res?.loan || null;
      }

      const paymentId = lastRecorded?._id || lastRecorded?.id || `pay_${Date.now()}`;
      const isOffline = !navigator.onLine || !!lastRecorded?.isOffline;

      // Update state for today's collection map
      setTodayCollections((prev) => ({
        ...prev,
        [String(loanId)]: {
          paymentId,
          amount: payNum,
          remainingBalance: updatedServerLoan?.remainingBalance ?? balanceAfterPayment,
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
                ...(updatedServerLoan || {}),
                remainingBalance: updatedServerLoan?.remainingBalance ?? balanceAfterPayment,
                totalCollected: updatedServerLoan?.totalCollected ?? (l.totalCollected || 0) + payNum,
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

  // Holiday / Leave submit
  const handleHolidaySubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!selectedLoan) {
      setError('Please select a loan account first');
      return;
    }

    if (entryMode === 'leave' && !holidayReason.trim()) {
      setError('Reason is required in notes for Leave / விடுப்பிற்கு காரணம் தேவை');
      return;
    }

    try {
      setSubmitting(true);
      const loanId = selectedLoan.loanId || selectedLoan._id;
      const res = await api.recordInstallmentAction(loanId, {
        action: entryMode, // 'holiday' | 'leave'
        paidDate: date,
        reason: holidayReason.trim(),
        notes: holidayReason.trim(),
        skipOption,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }

      showToast(loanId, null, parsedName.primary, 0);

      if (onSuccess) {
        onSuccess(res?.loan || selectedLoan);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record holiday/leave day');
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
                /* 4) Borrower Row Cards (3-Row Layout with Card Navigation, Overdue Badge & Holiday) */
                filteredAndSortedLoans.map((l) => {
                  const loanId = l._id || l.loanId;
                  const pName = parseCustomerName(l.customerId?.name || l.customerName);
                  const custPhone = l.customerId?.phone || l.customerPhone || '';
                  const custArea = l.customerId?.area || l.customerArea || '';
                  const remBal =
                    l.remainingBalance !== undefined
                      ? Number(l.remainingBalance)
                      : l.installmentAmount || 200;
                  const instAmt = Number(l.installmentAmount) || Number(l.dueAmount) || 200;
                  const collectAmount = Math.max(0, Math.min(instAmt, remBal));

                  const collectedInfo = todayCollections[String(loanId)];
                  const isCollected = !!collectedInfo;
                  const todayHolidayRecord = getTodayHolidayRecord(l);
                  const isTodayHoliday = !!todayHolidayRecord;
                  const overdueMetrics = getOverdueMetrics(l);

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

                  const canUndoHoliday =
                    isOwner ||
                    (user &&
                      todayHolidayRecord &&
                      (todayHolidayRecord.createdBy === user._id ||
                        todayHolidayRecord.createdBy === user.username ||
                        todayHolidayRecord.userName === user.name));

                  const isCollectingThis = collectingLoanId === loanId;

                  return (
                    <div
                      key={loanId}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(l)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCardClick(l);
                        }
                      }}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative shadow-2xs group outline-none focus:ring-2 focus:ring-[#0878D1]/30 ${
                        isCollected
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : isTodayHoliday
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                          : 'bg-white dark:bg-slate-900 hover:bg-[#F3F9FF] dark:hover:bg-slate-850 border-[#D5E9FA] dark:border-slate-800 shadow-2xs hover:border-[#0878D1]/40'
                      }`}
                    >
                      {/* ROW 1: Initial avatar, name, scheme tag, overdue badge, chevron */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          {/* Round initial avatar */}
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {pName.primary
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase() || 'VK'}
                          </div>

                          <div className="flex items-center space-x-2 flex-wrap gap-y-1 min-w-0 flex-1">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(l);
                              }}
                              className="font-black text-sm text-[#183653] dark:text-white truncate cursor-pointer hover:text-[#0878D1] hover:underline transition-colors"
                              title="View loan repayment schedule / தவணை அட்டவணை"
                            >
                              {pName.primary}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EAF5FF] dark:bg-slate-800 text-[#0878D1] dark:text-[#55B8F5] border border-[#D5E9FA] dark:border-slate-700 shrink-0">
                              {l.financeType || 'daily'}
                            </span>

                            {/* Overdue Badge (if overdueCount > 0 and not paid today and not holiday today) */}
                            {!isCollected && !isTodayHoliday && overdueMetrics.count > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                                Overdue {overdueMetrics.count} · {formatCurrency(overdueMetrics.amount)}
                              </span>
                            )}

                            {/* Holiday Today Badge */}
                            {isTodayHoliday && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0 flex items-center space-x-1">
                                <span>🏖️ Holiday today / இன்று விடுமுறை</span>
                              </span>
                            )}

                            {isPendingSync && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1 shrink-0">
                                <Clock className="w-2.5 h-2.5 animate-spin" />
                                <span>Syncing</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chevron on far right */}
                        <div className="shrink-0 text-[#647C95] dark:text-slate-400 group-hover:text-[#0878D1] group-hover:translate-x-0.5 transition pl-1">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>

                      {/* ROW 2: Loan number, phone, area, then Bal: ₹... in amber and per-due amount */}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                        <div className="flex items-center space-x-2 text-[#647C95] dark:text-slate-400 font-medium truncate">
                          <span className="font-bold text-[#0878D1] dark:text-[#55B8F5] font-mono">
                            {l.loanNo}
                          </span>
                          {custPhone && (
                            <span className="truncate">
                              • 📞 {custPhone}
                            </span>
                          )}
                          {custArea && (
                            <span className="truncate">
                              • 📍 {custArea}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {isCollected ? (
                            <div className="flex items-center space-x-1.5 text-xs font-black text-[#18A879]">
                              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Collected {formatCurrency(collectedInfo.amount)} today · Bal{' '}
                                {formatCurrency(remBal)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5 text-xs">
                              <span className="font-black text-amber-600 dark:text-amber-500">
                                Bal: {formatCurrency(remBal)}
                              </span>
                              <span className="text-[#647C95] dark:text-slate-400">
                                · {formatCurrency(instAmt)} / due
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ROW 3: Action Row (Green Collect button [takes remaining width], square pencil button, amber Holiday button) */}
                      <div className="mt-3 pt-2.5 border-t border-[#EAF5FF] dark:border-slate-800 flex items-center space-x-2">
                        {isCollected ? (
                          <>
                            <div className="flex-1 min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center space-x-1.5 text-xs font-black text-emerald-800 dark:text-emerald-200">
                              <CheckCircle className="w-4 h-4 text-[#18A879]" />
                              <span>Collected Today / இன்று வசூலானது</span>
                            </div>
                            {canUndo && (
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUndo(loanId, collectedInfo?.paymentId);
                                }}
                                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold active:scale-95 transition flex items-center space-x-1.5 shadow-2xs shrink-0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Undo / ரத்து</span>
                              </button>
                            )}
                          </>
                        ) : isTodayHoliday ? (
                          <>
                            <div className="flex-1 min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 flex items-center justify-center space-x-2 text-xs font-black text-amber-800 dark:text-amber-200">
                              <Coffee className="w-4 h-4 text-amber-600" />
                              <span>Holiday / இன்று விடுமுறை</span>
                            </div>
                            {canUndoHoliday && (
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUndoHoliday(l);
                                }}
                                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100 border border-amber-400 text-amber-800 dark:text-amber-300 text-xs font-bold active:scale-95 transition flex items-center space-x-1.5 shadow-2xs shrink-0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Undo Holiday / ரத்து</span>
                              </button>
                            )}
                            {/* Square Pencil Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPencil(l);
                              }}
                              title="Edit amount / advance payment"
                              className="w-10 h-10 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-[#0878D1] dark:text-[#55B8F5] flex items-center justify-center shrink-0 active:scale-95 transition shadow-2xs"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Green Collect Button (takes remaining width) */}
                            <button
                              type="button"
                              disabled={isCollectingThis || collectAmount <= 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDirectCollect(l);
                              }}
                              className="flex-1 bg-[#18A879] hover:bg-[#138861] disabled:opacity-50 text-white min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-xs flex items-center justify-center space-x-2 active:scale-95 transition"
                            >
                              {isCollectingThis ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 stroke-[3]" />
                                  <span>Collect {formatCurrency(collectAmount)}</span>
                                </>
                              )}
                            </button>

                            {/* Square Pencil Button: Opens Full Form for Custom/Advance/Multi-Date */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPencil(l);
                              }}
                              title="Edit amount / advance payment"
                              className="w-10 h-10 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-[#0878D1] dark:text-[#55B8F5] flex items-center justify-center shrink-0 active:scale-95 transition shadow-2xs"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Amber Holiday Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenHolidayModal(l);
                              }}
                              title="Declare holiday for this loan"
                              className="min-h-[40px] px-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center space-x-1.5 shrink-0 active:scale-95 transition shadow-2xs"
                            >
                              <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span>Holiday</span>
                            </button>
                          </>
                        )}
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
                      <p
                        onClick={() => {
                          const lid = selectedLoan?._id || selectedLoan?.loanId;
                          if (lid && typeof window !== 'undefined') {
                            window.history.pushState({}, '', `/loans/${lid}`);
                            window.dispatchEvent(
                              new CustomEvent('fintrack:navigate-loan', {
                                detail: { loanId: lid },
                              })
                            );
                            onClose();
                          }
                        }}
                        className="font-black text-xs sm:text-sm text-[#183653] dark:text-white truncate cursor-pointer hover:text-[#0878D1] hover:underline transition-colors"
                        title="View loan repayment schedule / தவணை அட்டவணை"
                      >
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

            {/* 3-way toggle: Pay | Holiday / விடுமுறை | Leave / விடுப்பு */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F3F9FF] dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEntryMode('payment');
                  setError('');
                }}
                className={`py-1.5 px-2 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1 ${
                  entryMode === 'payment'
                    ? 'bg-[#0878D1] text-white shadow-xs'
                    : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Pay</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryMode('holiday');
                  setError('');
                }}
                className={`py-1.5 px-1.5 rounded-xl font-black text-[11px] transition flex items-center justify-center space-x-1 ${
                  entryMode === 'holiday'
                    ? 'bg-[#0878D1] text-white shadow-xs'
                    : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
                }`}
              >
                <span>🏖️ Holiday / விடுமுறை</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryMode('leave');
                  setError('');
                }}
                className={`py-1.5 px-1.5 rounded-xl font-black text-[11px] transition flex items-center justify-center space-x-1 ${
                  entryMode === 'leave'
                    ? 'bg-[#0878D1] text-white shadow-xs'
                    : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
                }`}
              >
                <span>👤 Leave / விடுப்பு</span>
              </button>
            </div>

            {entryMode === 'holiday' || entryMode === 'leave' ? (
              /* Holiday / Leave Form */
              <div className="space-y-3 pt-1 animate-fade-in">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-medium space-y-1">
                  <p className="font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      {entryMode === 'holiday'
                        ? 'Shop / Area Holiday (no collection on this day) / விடுமுறை நாள்'
                        : 'Customer Absent or Leave Taken / வாடிக்கையாளர் விடுப்பு'}
                    </span>
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    This installment will not count as overdue or attract penalties.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#183653] mb-1">
                    Date / தேதி *
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
                    After skipping / பிறகு *
                  </label>
                  <select
                    value={skipOption}
                    onChange={(e) => setSkipOption(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-bold text-xs outline-none focus:border-[#0878D1]"
                  >
                    <option value="move_next">a) Move due to next date / அடுத்த தேதிக்கு மாற்றுக (Default)</option>
                    <option value="extend_end">b) Extend loan end date by 1 day / கடன் முடிவை நீட்டிக்க</option>
                    <option value="skip_only">c) No change, mark skipped only / மாற்றம் இல்லை, தவிர்த்ததாக குறிக்க</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#183653] mb-1">
                    {entryMode === 'leave'
                      ? 'Reason for Leave / விடுப்பிற்கான காரணம் * (Required)'
                      : 'Reason / குறிப்பு (Optional)'}
                  </label>
                  <input
                    type="text"
                    required={entryMode === 'leave'}
                    placeholder={
                      entryMode === 'leave'
                        ? 'e.g. Out of station, Medical leave, Customer absent...'
                        : 'e.g. Sunday, Festival, Shop Closed...'
                    }
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
                  <span>
                    {entryMode === 'holiday' ? 'Confirm Holiday / உறுதிசெய்' : 'Confirm Leave / உறுதிசெய்'}
                  </span>
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

                        {/* LIVE SPLIT BOX WHILE TYPING (MINUS INSTALLMENT + EXTRA FROM PENDING DUE) */}
                        {amount > 0 && selectedLoan && (
                          <div className="mt-2 p-2.5 rounded-xl bg-[#F3F9FF] dark:bg-slate-800/80 border border-[#D5E9FA] dark:border-slate-700 space-y-1 text-xs">
                            {(() => {
                              const due = Math.max(0, Number(selectedLoan.installmentAmount || selectedLoan.dueAmount || 200));
                              const pendingDue = Math.max(0, Number(currentBalance) || 0);
                              const effectiveDue = Math.min(due, pendingDue);
                              const amt = Number(amount) || 0;
                              const instPart = Math.min(amt, effectiveDue);
                              const extra = Math.max(0, amt - effectiveDue);
                              const newPendingDue = Math.max(0, pendingDue - instPart - extra);
                              const dateLabel = date ? formatDate(date) : 'Today';

                              return (
                                <>
                                  <div className="flex items-center justify-between text-[#647C95] dark:text-slate-400 font-medium">
                                    <span>Pending Due / நிலுவை:</span>
                                    <span className="font-bold text-[#183653] dark:text-white tabular-nums">
                                      {formatCurrency(pendingDue)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[#183653] dark:text-white font-medium">
                                    <span>Installment ({dateLabel}):</span>
                                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                      - {formatCurrency(instPart)}
                                    </span>
                                  </div>
                                  {extra > 0 && (
                                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
                                      <span>Extra Amount / கூடுதல் ({dateLabel}):</span>
                                      <span className="tabular-nums">- {formatCurrency(extra)}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between text-[#0878D1] dark:text-[#55B8F5] font-black pt-0.5 border-t border-[#D5E9FA]/60 dark:border-slate-700/60">
                                    <span>New Pending Due / மீதி நிலுவை:</span>
                                    <span className="tabular-nums">{formatCurrency(newPendingDue)}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] font-bold text-[#647C95] dark:text-slate-400">
                                    <span>Remaining Dates / மீதி தவணைகள்:</span>
                                    <span className="text-[#183653] dark:text-white tabular-nums">
                                      {due > 0 ? Math.ceil(newPendingDue / due) : 0} × {formatCurrency(due)}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
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

        {/* =========================================================================
            HOLIDAY MODAL SHEET (TODAY, PICK DATES, RANGE, REASON, EXTEND SCHEDULE)
        ========================================================================= */}
        {holidayModalLoan && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setHolidayModalLoan(null);
            }}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-[#D5E9FA] dark:border-slate-800 space-y-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#D5E9FA]/60 dark:border-slate-800">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm sm:text-base font-black text-[#183653] dark:text-white truncate">
                      Declare Holiday / விடுமுறை அறிவிப்பு
                    </h4>
                    <p className="text-xs text-[#647C95] dark:text-slate-400 font-medium truncate">
                      {parseCustomerName(holidayModalLoan.customerId?.name || holidayModalLoan.customerName).primary} • {holidayModalLoan.loanNo}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHolidayModalLoan(null)}
                  className="w-8 h-8 rounded-full bg-[#F3F9FF] dark:bg-slate-800 hover:bg-[#EAF5FF] text-[#647C95] flex items-center justify-center transition shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {holidaySheetError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{holidaySheetError}</span>
                </div>
              )}

              {/* Choices: Today only (default), Pick dates, Date range */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#647C95] mb-1.5">
                  Holiday Selection / தேர்வு வகை
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F3F9FF] dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700">
                  {[
                    { id: 'today', label: 'Today Only', labelTa: 'இன்று மட்டும்' },
                    { id: 'pick', label: 'Pick Dates', labelTa: 'தேதிகள்' },
                    { id: 'range', label: 'Date Range', labelTa: 'வரம்பு' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setHolidayChoice(tab.id);
                        setHolidaySheetError('');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center ${
                        holidayChoice === tab.id
                          ? 'bg-[#0878D1] text-white shadow-xs'
                          : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="text-[9px] opacity-80">{tab.labelTa}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Inputs based on choice */}
              {holidayChoice === 'today' ? (
                <div className="p-3 rounded-xl bg-[#EAF5FF] dark:bg-slate-800/60 border border-[#BFE3FA] dark:border-slate-700 text-xs text-[#064B8E] dark:text-[#55B8F5] flex items-center justify-between">
                  <span className="font-bold">Holiday for Today / இன்றைய தேதி:</span>
                  <span className="font-mono font-black">{todayStr}</span>
                </div>
              ) : holidayChoice === 'pick' ? (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  <label className="block text-xs font-black text-[#183653] dark:text-white">
                    Select Specific Dates / குறிப்பிட்ட தேதிகள்:
                  </label>
                  {holidayDates.map((dVal, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="date"
                        value={dVal}
                        onChange={(e) => {
                          const updated = [...holidayDates];
                          updated[idx] = e.target.value;
                          setHolidayDates(updated);
                        }}
                        className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] text-xs font-bold text-[#183653] dark:text-white"
                      />
                      {holidayDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setHolidayDates(holidayDates.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setHolidayDates([...holidayDates, formatDateForInput()])}
                    className="w-full py-1.5 rounded-xl border border-dashed border-[#0878D1] text-[#0878D1] text-xs font-bold hover:bg-[#EAF5FF] transition flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Date / தேதி சேர்க்க</span>
                  </button>
                </div>
              ) : (
                /* Date range */
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-black text-[#183653] dark:text-white mb-1">
                      Start Date / தொடக்கம்
                    </label>
                    <input
                      type="date"
                      value={holidayRangeStart}
                      onChange={(e) => setHolidayRangeStart(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] text-xs font-bold text-[#183653] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#183653] dark:text-white mb-1">
                      End Date / முடிவு
                    </label>
                    <input
                      type="date"
                      value={holidayRangeEnd}
                      onChange={(e) => setHolidayRangeEnd(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] text-xs font-bold text-[#183653] dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Optional Reason */}
              <div>
                <label className="block text-xs font-black text-[#183653] dark:text-white mb-1">
                  Reason / குறிப்பு (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Festival, Sunday, Shop closed, Health / திருவிழா, விடுமுறை..."
                  value={holidayModalReason}
                  onChange={(e) => setHolidayModalReason(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 text-xs font-medium text-[#183653] dark:text-white placeholder-[#647C95] outline-none focus:border-[#0878D1]"
                />
              </div>

              {/* Toggle: Add holiday days to the end of the schedule (default off) */}
              <label className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-[#F3F9FF] dark:bg-slate-800/60 border border-[#D5E9FA] dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={holidayExtendSchedule}
                  onChange={(e) => setHolidayExtendSchedule(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#0878D1] focus:ring-[#0878D1]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-[#183653] dark:text-white">
                    Add holiday days to the end of the schedule
                  </p>
                  <p className="text-[11px] text-[#647C95] dark:text-slate-400">
                    கால அட்டவணையின் முடிவில் விடுமுறை நாட்களைச் சேர்க்கவும்
                  </p>
                </div>
              </label>

              {/* Save Button */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setHolidayModalLoan(null)}
                  className="flex-1 min-h-[42px] px-4 rounded-xl border border-[#D5E9FA] dark:border-slate-700 font-bold text-xs text-[#647C95] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel / ரத்து
                </button>
                <button
                  type="button"
                  disabled={savingHoliday}
                  onClick={handleSaveHolidaySheet}
                  className="flex-1 min-h-[42px] px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center space-x-1.5 active:scale-95 transition disabled:opacity-50"
                >
                  {savingHoliday ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Save Holiday / சேமி</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
