import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatDateForInput } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import { useDeviceMode } from '../context/DeviceModeContext';
import { getSyncQueue } from '../services/offlineQueue';
import PaymentModal from '../components/common/PaymentModal';
import ReceiptModal from '../components/common/ReceiptModal';
import WhatsAppReminderModal from '../components/common/WhatsAppReminderModal';
import WhatsAppPaymentHistoryModal from '../components/common/WhatsAppPaymentHistoryModal';
import WhatsAppHubModal from '../components/common/WhatsAppHubModal';
import LoanApplicationFormModal from '../components/common/LoanApplicationFormModal';
import EditLoanModal from '../components/common/EditLoanModal';
import { downloadLoanAgreementPDF } from '../utils/loanAgreementPdf';
import {
  exportLoanHistoryPDF,
  exportLoanHistoryExcel,
  shareLoanHistoryWhatsApp,
} from '../utils/loanStatementExport';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  History,
  FileText,
  Download,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Banknote,
  QrCode,
  X,
  RefreshCw,
  CheckSquare,
  Square,
  Filter,
  ChevronDown,
  MoreVertical,
  MessageCircle,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';

export const LoanDetail = ({ loanId, onBack }) => {
  const { t } = useLanguage();
  const { isMobile } = useDeviceMode();
  const { user, isOwner } = useAuth();

  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [payModalItem, setPayModalItem] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [whatsappItem, setWhatsappItem] = useState(null);
  const [showWhatsAppHub, setShowWhatsAppHub] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showLoanFormModal, setShowLoanFormModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Download History Dropdown state
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [downloadPeriod, setDownloadPeriod] = useState('all'); // 'all' | 'this_month' | 'custom'
  const [downloadStartDate, setDownloadStartDate] = useState(formatDateForInput());
  const [downloadEndDate, setDownloadEndDate] = useState(formatDateForInput());
  const downloadDropdownRef = useRef(null);

  // More Menu Dropdown & Delete Confirmation Modal state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const moreMenuRef = useRef(null);

  // Pencil Modal state (for editing unpaid advance or correcting paid row)
  const [pencilInst, setPencilInst] = useState(null);
  const [pencilAmount, setPencilAmount] = useState(0);
  const [pencilMode, setPencilMode] = useState('cash');
  const [pencilDate, setPencilDate] = useState(formatDateForInput());
  const [pencilNotes, setPencilNotes] = useState('');
  const [pencilActionTab, setPencilActionTab] = useState('pay'); // 'pay' | 'holiday' | 'leave'
  const [pencilSkipOption, setPencilSkipOption] = useState('move_next'); // 'move_next' | 'extend_end' | 'skip_only'
  const [pencilSubmitting, setPencilSubmitting] = useState(false);
  const [pencilError, setPencilError] = useState('');

  // Master Collect & Checkbox Selection state
  const [selectedInstNos, setSelectedInstNos] = useState(new Set());
  const [upToDateFilter, setUpToDateFilter] = useState('');
  const [masterCollecting, setMasterCollecting] = useState(false);
  const [collectingInstNo, setCollectingInstNo] = useState(null);

  // 8-Second Floating Toast state
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Offline queue detection
  const [pendingSyncInstNos, setPendingSyncInstNos] = useState(new Set());

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      const res = await api.getLoanById(loanId);
      if (res.success && res.loan) {
        setLoan(res.loan);
        setPayments(res.payments || []);
      }
    } catch (err) {
      console.error('Failed to fetch loan details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loanId) {
      fetchLoanData();
    }
  }, [loanId]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(e.target)) {
        setShowDownloadDropdown(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Monitor offline queue for pending sync badges
  useEffect(() => {
    let isMounted = true;
    const checkOffline = async () => {
      try {
        const q = await getSyncQueue();
        if (!isMounted) return;
        const set = new Set();
        q.forEach((item) => {
          if (item.endpoint === '/api/payments' && item.data?.loanId === loanId) {
            if (item.data?.installmentNo) {
              set.add(item.data.installmentNo);
            }
          }
        });
        setPendingSyncInstNos(set);
      } catch (e) {}
    };

    checkOffline();
    const interval = setInterval(checkOffline, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loanId]);

  // Auto-scroll to first unpaid (overdue) installment
  useEffect(() => {
    if (loan?.schedule && loan.schedule.length > 0) {
      const firstUnpaid = loan.schedule.find((inst) => inst.status !== 'paid');
      if (firstUnpaid) {
        const timer = setTimeout(() => {
          const el = document.getElementById(`inst-row-${firstUnpaid.installmentNo}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-[#0878D1]/40');
            setTimeout(() => el.classList.remove('ring-2', 'ring-[#0878D1]/40'), 2500);
          }
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [loan?._id]);

  const showToast = (toastData) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 8000);
    setToast(toastData);
  };

  const handleDeleteLoan = async () => {
    try {
      await api.deleteLoan(loan._id);
      alert(`Loan ${loan.loanNo} successfully deleted.`);
      onBack();
    } catch (err) {
      alert(err.message || 'Failed to delete loan');
    }
  };

  // ---------------------------------------------------------------------------
  // 1-TAP DIRECT COLLECT ON INSTALLMENT ROW
  // ---------------------------------------------------------------------------
  const handleDirectCollect = async (inst) => {
    if (inst.status === 'paid') return;
    const remBal = Number(loan.remainingBalance) || 0;
    if (remBal <= 0) {
      alert('Loan is already fully settled / கடன் கணக்கு ஏற்கனவே முடிவடைந்தது');
      return;
    }

    const instDue = Number(inst.amount) - (Number(inst.paidAmount) || 0);
    const payAmount = Math.max(0, Math.min(instDue, remBal));
    if (payAmount <= 0) return;

    const instNo = inst.installmentNo;
    const rowDueDate = inst.dueDate ? formatDateForInput(inst.dueDate) : formatDateForInput();

    try {
      setCollectingInstNo(instNo);
      const res = await api.recordPayment({
        loanId: loan._id,
        amount: payAmount,
        mode: 'cash',
        date: rowDueDate,
        notes: `Installment #${instNo} collection / தவணை #${instNo} நேரடி வசூல்`,
      });

      const paymentId = res?.payment?._id || res?.payment?.id || `pay_${Date.now()}`;
      const isOffline = !navigator.onLine || !!res?.isOffline;

      const updatedSchedule = loan.schedule.map((item) => {
        if (item.installmentNo === instNo) {
          return {
            ...item,
            status: 'paid',
            paidAmount: item.amount,
            paidDate: new Date().toISOString(),
            paymentId,
            isOffline,
          };
        }
        return item;
      });

      const newTotalCollected = (loan.totalCollected || 0) + payAmount;
      const newRemainingBalance = Math.max(0, (loan.totalPayable || 0) - newTotalCollected);
      const newStatus = newRemainingBalance <= 0 ? 'completed' : loan.status;

      setLoan((prev) => ({
        ...prev,
        schedule: updatedSchedule,
        totalCollected: newTotalCollected,
        remainingBalance: newRemainingBalance,
        status: newStatus,
      }));

      try {
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.8 } });
      } catch (e) {}

      showToast({
        type: 'single',
        message: `Installment ${instNo} collected · ${formatCurrency(payAmount)}`,
        amount: payAmount,
        items: [{ paymentId, instNo, amount: payAmount }],
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      console.error('Installment collect error:', err);
      alert(err.message || 'Collection failed / வசூல் பதிவு தோல்வி');
    } finally {
      setCollectingInstNo(null);
    }
  };

  // ---------------------------------------------------------------------------
  // UNDO SINGLE OR BATCH PAYMENTS
  // ---------------------------------------------------------------------------
  const handleUndoToast = async () => {
    if (!toast?.items || toast.items.length === 0) return;
    try {
      const itemsToUndo = toast.items;
      setToast(null);

      for (const item of itemsToUndo) {
        if (item.paymentId) {
          await api.deletePayment(item.paymentId);
        }
      }

      setLoan((prev) => {
        const itemMap = new Map(itemsToUndo.map((i) => [i.instNo, i.amount]));
        let totalReverted = 0;

        const updatedSchedule = prev.schedule.map((inst) => {
          if (itemMap.has(inst.installmentNo)) {
            const revertedAmt = itemMap.get(inst.installmentNo);
            totalReverted += revertedAmt;
            const isOverdue = new Date(inst.dueDate) < new Date();
            return {
              ...inst,
              status: isOverdue ? 'overdue' : 'pending',
              paidAmount: 0,
              paidDate: null,
              paymentId: null,
            };
          }
          return inst;
        });

        const restoredCollected = Math.max(0, (prev.totalCollected || 0) - totalReverted);
        const restoredRemaining = Math.min(prev.totalPayable, (prev.remainingBalance || 0) + totalReverted);

        return {
          ...prev,
          schedule: updatedSchedule,
          totalCollected: restoredCollected,
          remainingBalance: restoredRemaining,
          status: 'active',
        };
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      console.error('Undo toast error:', err);
      alert(err.message || 'Cannot undo payment / ரத்து செய்ய இயலவில்லை');
    }
  };

  // ---------------------------------------------------------------------------
  // HELPER: Match Paid Installment with its associated Payment document
  // ---------------------------------------------------------------------------
  const findPaymentForInstallment = (inst, paymentsList = [], schedule = []) => {
    if (!inst) return null;
    if (inst.paymentId) {
      const found = paymentsList.find((p) => String(p._id) === String(inst.paymentId));
      if (found) return found;
      return { _id: inst.paymentId, amount: inst.paidAmount || inst.amount };
    }

    const instNo = inst.installmentNo;
    // 1. Match by notes: "Installment #4", "Inst #4", or "#4"
    const noteMatch = paymentsList.find((p) => {
      const n = p.notes || '';
      const re = new RegExp(`(?:installment|inst)\\s*#?${instNo}\\b|#${instNo}\\b`, 'i');
      return re.test(n);
    });
    if (noteMatch) return noteMatch;

    // 2. Match by exact date and amount
    if (inst.paidDate) {
      const instDateStr = new Date(inst.paidDate).toISOString().slice(0, 10);
      const dateMatch = paymentsList.find((p) => {
        const pDateStr = p.date ? new Date(p.date).toISOString().slice(0, 10) : '';
        return pDateStr === instDateStr && Number(p.amount) === Number(inst.paidAmount || inst.amount);
      });
      if (dateMatch) return dateMatch;
    }

    // 3. Positional chronological matching:
    const paidSchedule = (schedule || []).filter((s) => s.status === 'paid');
    const paidIndex = paidSchedule.findIndex((s) => s.installmentNo === instNo);

    // Payments sorted chronologically (oldest to newest)
    const sortedPayments = [...paymentsList].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    if (paidIndex >= 0 && paidIndex < sortedPayments.length) {
      return sortedPayments[paidIndex];
    }

    // Fallback: If it's the latest paid installment or single payment, return latest payment
    if (sortedPayments.length > 0) {
      return sortedPayments[sortedPayments.length - 1];
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // PENCIL MODAL: UNPAID (CUSTOM/ADVANCE/HOLIDAY/LEAVE) OR PAID (REVERSE/CORRECTION)
  // ---------------------------------------------------------------------------
  const handleOpenPencil = (inst) => {
    setPencilError('');
    setPencilSubmitting(false);
    setPencilActionTab('pay');
    setPencilSkipOption('move_next');

    const isPaid = inst.status === 'paid';
    const associatedPayment = isPaid ? findPaymentForInstallment(inst, payments, loan?.schedule) : null;
    const instWithPayment = associatedPayment?._id
      ? { ...inst, paymentId: associatedPayment._id, paymentReceiptNo: associatedPayment.receiptNo }
      : inst;
    setPencilInst(instWithPayment);

    if (isPaid) {
      const paidAmt =
        Number(associatedPayment?.amount) ||
        Number(inst.paidAmount) ||
        Number(inst.amount) ||
        Number(loan?.installmentAmount) ||
        200;
      setPencilAmount(paidAmt);
      setPencilMode(associatedPayment?.mode || 'cash');
      const pDate = associatedPayment?.date || inst.paidDate || inst.dueDate;
      setPencilDate(pDate ? formatDateForInput(pDate) : formatDateForInput());
      setPencilNotes(associatedPayment?.notes || '');
    } else {
      const instDue =
        Number(inst.amount) - (Number(inst.paidAmount) || 0) ||
        Number(loan?.installmentAmount) ||
        200;
      setPencilAmount(instDue);
      setPencilMode('cash');
      setPencilDate(inst.dueDate ? formatDateForInput(inst.dueDate) : formatDateForInput());
      setPencilNotes('');
    }
  };

  const handleSavePencil = async (e) => {
    e.preventDefault();
    if (!pencilInst) return;
    setPencilError('');

    const isPaid = pencilInst.status === 'paid';
    const instNo = pencilInst.installmentNo;

    if (isPaid) {
      const payNum = Number(pencilAmount) || 0;
      if (payNum <= 0) {
        setPencilError('Please enter a valid amount / சரியான தொகை தேவை');
        return;
      }
      try {
        setPencilSubmitting(true);
        const associatedPayment = findPaymentForInstallment(pencilInst, payments, loan?.schedule);
        const auditNote = pencilNotes || `Installment #${instNo} collection (${pencilMode.toUpperCase()})`;

        if (associatedPayment?._id) {
          await api.updatePayment(associatedPayment._id, {
            amount: payNum,
            mode: pencilMode,
            date: pencilDate,
            notes: auditNote,
          });
        } else {
          await api.recordPayment({
            loanId: loan._id,
            amount: payNum,
            mode: pencilMode,
            date: pencilDate,
            notes: auditNote,
          });
        }
        setPencilInst(null);
        await fetchLoanData();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
        }
        showToast({
          type: 'single',
          message: `Installment #${instNo} updated / தவணை #${instNo} திருத்தப்பட்டது`,
        });
      } catch (err) {
        console.error('Failed to update paid installment:', err);
        setPencilError(err.message || 'Failed to update / திருத்த இயலவில்லை');
      } finally {
        setPencilSubmitting(false);
      }
      return;
    }

    // UNPAID INSTALLMENT: Pay | Holiday | Leave
    if (pencilActionTab === 'leave' && !pencilNotes.trim()) {
      setPencilError('Reason is required in notes for Leave / விடுப்பிற்கு காரணம் தேவை');
      return;
    }

    const instDue = Math.max(0, Number(pencilInst.amount) - (Number(pencilInst.paidAmount) || 0));
    const payNum = Number(pencilAmount) || 0;

    if (pencilActionTab === 'pay') {
      if (payNum <= 0) {
        setPencilError('Please enter a valid amount / சரியான தொகை தேவை');
        return;
      }
      const maxAllowed = (Number(loan?.principal) || 0) + instDue;
      if (payNum > maxAllowed) {
        setPencilError(`Amount cannot exceed outstanding principal + due (₹${maxAllowed}) / தொகை ₹${maxAllowed}-க்கு மேல் இருக்கக் கூடாது`);
        return;
      }
    }

    try {
      setPencilSubmitting(true);
      await api.recordInstallmentAction(loan._id, {
        action: pencilActionTab,
        installmentNo: instNo,
        amount: payNum,
        mode: pencilMode,
        paidDate: pencilDate,
        notes: pencilNotes.trim(),
        skipOption: pencilSkipOption,
        reason: pencilNotes.trim(),
      });

      if (pencilActionTab === 'pay') {
        try {
          confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
      }

      setPencilInst(null);
      await fetchLoanData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }

      showToast({
        type: 'single',
        message: 'Saved / சேமிக்கப்பட்டது',
        amount: payNum,
      });
    } catch (err) {
      console.error('Failed to save installment action:', err);
      setPencilError(err.message || 'Failed to save / சேமிக்க இயலவில்லை');
    } finally {
      setPencilSubmitting(false);
    }
  };

  const handleReversePaidInst = async () => {
    if (!pencilInst || pencilInst.status !== 'paid') return;
    const instNo = pencilInst.installmentNo;

    try {
      setPencilSubmitting(true);
      await api.reverseInstallment(loan._id, instNo);

      setPencilInst(null);
      await fetchLoanData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }

      showToast({
        type: 'single',
        message: `Installment #${instNo} reversed / தவணை #${instNo} வசூல் ரத்து செய்யப்பட்டது`,
      });
    } catch (err) {
      console.error('Failed to reverse installment:', err);
      setPencilError(err.message || 'Failed to reverse payment / ரத்து செய்ய இயலவில்லை');
    } finally {
      setPencilSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FINANCIAL CALCULATIONS & MASTER COLLECT BAR HELPERS
  // ---------------------------------------------------------------------------
  const unpaidInstallments = useMemo(() => {
    return (loan?.schedule || []).filter((inst) => inst.status !== 'paid');
  }, [loan?.schedule]);

  const overdueCount = useMemo(() => {
    const now = new Date();
    return unpaidInstallments.filter(
      (inst) => inst.status === 'overdue' || (inst.status !== 'holiday' && inst.status !== 'leave' && new Date(inst.dueDate) < now)
    ).length;
  }, [unpaidInstallments]);

  const { totalOverdueAmount, nextDueInst } = useMemo(() => {
    let overdueAmt = 0;
    let nextDue = null;
    const now = new Date();

    (loan?.schedule || []).forEach((inst) => {
      const isPaid = inst.status === 'paid';
      const isHoliday = inst.status === 'holiday' || inst.status === 'missed' || inst.status === 'leave';
      const instDue = Number(inst.amount) - (Number(inst.paidAmount) || 0);

      if (!isPaid && !isHoliday) {
        const d = new Date(inst.dueDate);
        if (d < now || inst.status === 'overdue') {
          overdueAmt += Math.max(0, instDue);
        } else if (!nextDue && d >= now) {
          nextDue = inst;
        }
      }
    });

    return { totalOverdueAmount: overdueAmt, nextDueInst: nextDue };
  }, [loan?.schedule]);

  const handleToggleSelectInst = (instNo) => {
    setSelectedInstNos((prev) => {
      const next = new Set(prev);
      if (next.has(instNo)) next.delete(instNo);
      else next.add(instNo);
      return next;
    });
  };

  const handleSelectOverdue = () => {
    const now = new Date();
    const set = new Set();
    unpaidInstallments.forEach((inst) => {
      if (inst.status === 'overdue' || (inst.status !== 'holiday' && new Date(inst.dueDate) < now)) {
        set.add(inst.installmentNo);
      }
    });
    setSelectedInstNos(set);
  };

  const handleSelectNext7Days = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future = new Date();
    future.setDate(future.getDate() + 7);
    future.setHours(23, 59, 59, 999);

    const set = new Set();
    unpaidInstallments.forEach((inst) => {
      const d = new Date(inst.dueDate);
      if (d >= now && d <= future) {
        set.add(inst.installmentNo);
      }
    });
    setSelectedInstNos(set);
  };

  const handleSelectUpToDate = (targetDateStr) => {
    setUpToDateFilter(targetDateStr);
    if (!targetDateStr) return;
    const target = new Date(targetDateStr);
    target.setHours(23, 59, 59, 999);

    const set = new Set();
    unpaidInstallments.forEach((inst) => {
      if (new Date(inst.dueDate) <= target) {
        set.add(inst.installmentNo);
      }
    });
    setSelectedInstNos(set);
  };

  const handleToggleAllUnpaid = () => {
    if (selectedInstNos.size === unpaidInstallments.length) {
      setSelectedInstNos(new Set());
    } else {
      setSelectedInstNos(new Set(unpaidInstallments.map((i) => i.installmentNo)));
    }
  };

  const selectedInstallmentsList = useMemo(() => {
    return (loan?.schedule || []).filter((inst) => selectedInstNos.has(inst.installmentNo));
  }, [loan?.schedule, selectedInstNos]);

  const totalSelectedAmount = useMemo(() => {
    return selectedInstallmentsList.reduce(
      (sum, inst) => sum + (inst.amount - (inst.paidAmount || 0)),
      0
    );
  }, [selectedInstallmentsList]);

  const handleMasterCollect = async () => {
    if (selectedInstallmentsList.length === 0) return;
    const remBal = Number(loan.remainingBalance) || 0;
    if (remBal <= 0) {
      alert('Loan is already fully settled / கடன் கணக்கு முடிவடைந்தது');
      return;
    }

    try {
      setMasterCollecting(true);
      const createdItems = [];

      for (const inst of selectedInstallmentsList) {
        const instDue = inst.amount - (inst.paidAmount || 0);
        const rowDueDate = inst.dueDate ? formatDateForInput(inst.dueDate) : formatDateForInput();

        const res = await api.recordPayment({
          loanId: loan._id,
          amount: instDue,
          mode: 'cash',
          date: rowDueDate,
          notes: `Master collect Installment #${inst.installmentNo}`,
        });

        const paymentId = res?.payment?._id || res?.payment?.id || `pay_${Date.now()}`;
        createdItems.push({
          paymentId,
          instNo: inst.installmentNo,
          amount: instDue,
        });
      }

      const createdMap = new Map(createdItems.map((c) => [c.instNo, c.amount]));
      const updatedSchedule = loan.schedule.map((item) => {
        if (createdMap.has(item.installmentNo)) {
          return {
            ...item,
            status: 'paid',
            paidAmount: item.amount,
            paidDate: new Date().toISOString(),
          };
        }
        return item;
      });

      const newTotalCollected = (loan.totalCollected || 0) + totalSelectedAmount;
      const newRemainingBalance = Math.max(0, (loan.totalPayable || 0) - newTotalCollected);

      setLoan((prev) => ({
        ...prev,
        schedule: updatedSchedule,
        totalCollected: newTotalCollected,
        remainingBalance: newRemainingBalance,
        status: newRemainingBalance <= 0 ? 'completed' : prev.status,
      }));

      setSelectedInstNos(new Set());

      try {
        confetti({ particleCount: 65, spread: 75, origin: { y: 0.75 } });
      } catch (e) {}

      showToast({
        type: 'batch',
        message: `${createdItems.length} installments collected · ${formatCurrency(totalSelectedAmount)}`,
        amount: totalSelectedAmount,
        items: createdItems,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      console.error('Master collect error:', err);
      alert(err.message || 'Master collect failed');
      await fetchLoanData();
    } finally {
      setMasterCollecting(false);
    }
  };

  if (loading && !loan) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading loan ledger & repayment schedule...
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-8 text-center text-xs text-red-500">
        Loan record not found.
        <button onClick={onBack} className="block mx-auto mt-2 text-blue-600 font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const customer =
    loan.customerId && typeof loan.customerId === 'object' && loan.customerId.name
      ? loan.customerId
      : {
          name: loan.customerName || 'Borrower',
          phone: loan.customerPhone || '',
          area: loan.customerArea || '',
        };

  const parsedName = parseCustomerName(customer.name);
  const totalInstallmentsCount = loan.duration || loan.schedule?.length || 0;

  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-7xl mx-auto">
      {/* =========================================================================
          1) STICKY HEADER (STAYS FIXED WHILE SCROLLING, <= 25% SCREEN HEIGHT)
      ========================================================================= */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-6 -mt-3 sm:-mt-6 px-3.5 sm:px-6 py-2.5 sm:py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-[#D5E9FA] dark:border-slate-800 shadow-sm space-y-2">
        {/* Row 1: Back, Initial Avatar, Name, Tags, Info Line, and Large Remaining Balance */}
        <div className="flex items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {/* Back Button */}
            <button
              type="button"
              onClick={onBack}
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-xs font-bold text-[#183653] dark:text-white flex items-center space-x-1.5 shrink-0 transition active:scale-95 shadow-2xs"
              title="Back to Loans / கடன்கள்"
            >
              <ArrowLeft className="w-4 h-4 text-[#0878D1]" />
              <span className="hidden sm:inline">Back / கடன்கள்</span>
            </button>

            {/* Round Initial Avatar */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs">
              {parsedName.primary
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'VK'}
            </div>

            {/* Borrower Name, Scheme Tag, Overdue Badge & Compact Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <h2 className="font-black text-sm sm:text-base text-[#183653] dark:text-white truncate">
                  {parsedName.primary}
                </h2>

                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EAF5FF] dark:bg-slate-800 text-[#0878D1] dark:text-[#55B8F5] border border-[#D5E9FA] dark:border-slate-700 shrink-0">
                  {loan.financeType}
                </span>

                {overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
                    OVERDUE {overdueCount}
                  </span>
                )}
              </div>

              {/* Info Line: Loan #, Phone, Per Inst, Total Dues */}
              <p className="text-[11px] text-[#647C95] dark:text-slate-400 font-mono truncate mt-0.5">
                <span className="font-bold text-[#0878D1] dark:text-[#55B8F5]">{loan.loanNo}</span>
                {customer.phone && <span> • 📞 {customer.phone}</span>}
                <span> • {formatCurrency(loan.installmentAmount)} / due</span>
                <span> • {totalInstallmentsCount} dues</span>
              </p>
            </div>
          </div>

          {/* Right: Remaining Balance in Large Text */}
          <div className="text-right shrink-0 pl-1.5 sm:pl-3">
            <span className="text-[10px] text-[#647C95] dark:text-slate-400 font-bold uppercase block truncate">
              Remaining / மீதி
            </span>
            <p className="text-base sm:text-xl font-black text-[#064B8E] dark:text-[#55B8F5] tabular-nums leading-tight">
              {formatCurrency(loan.remainingBalance)}
            </p>
          </div>
        </div>

        {/* Row 2: Action Row (Download History Dropdown + Square Icon Buttons + More Menu) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#EAF5FF] dark:border-slate-800/80">
          {/* Left: Prominent Blue Download History Button with Dropdown */}
          <div className="relative" ref={downloadDropdownRef}>
            <button
              type="button"
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
              className="h-8 sm:h-9 px-3 rounded-xl bg-[#0878D1] hover:bg-[#064B8E] text-white text-xs font-black shadow-xs flex items-center space-x-1.5 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Download history / அறிக்கை</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>

            {/* Download Dropdown */}
            {showDownloadDropdown && (
              <div
                className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-[#D5E9FA] dark:border-slate-800 shadow-2xl p-3 z-50 space-y-3 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-[#EAF5FF] dark:border-slate-800">
                  <span className="text-xs font-black text-[#183653] dark:text-white flex items-center space-x-1.5">
                    <Download className="w-3.5 h-3.5 text-[#0878D1]" />
                    <span>Export Statement / அறிக்கை</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDownloadDropdown(false)}
                    className="text-[#647C95] hover:text-[#183653] p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Period Choices: All, This month, Custom dates */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#647C95] dark:text-slate-400 mb-1">
                    Select Period / காலம்
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-[#F3F9FF] dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700">
                    {[
                      { id: 'all', label: 'All', labelTa: 'முழுவதும்' },
                      { id: 'this_month', label: 'This Month', labelTa: 'இந்த மாதம்' },
                      { id: 'custom', label: 'Custom', labelTa: 'தேதிகள்' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDownloadPeriod(tab.id)}
                        className={`py-1 px-1.5 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center ${
                          downloadPeriod === tab.id
                            ? 'bg-[#0878D1] text-white shadow-2xs'
                            : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className="text-[9px] opacity-75">{tab.labelTa}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom dates input if selected */}
                {downloadPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-[#647C95] dark:text-slate-400 font-bold block mb-0.5">Start Date</span>
                      <input
                        type="date"
                        value={downloadStartDate}
                        onChange={(e) => setDownloadStartDate(e.target.value)}
                        className="w-full h-8 px-2 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 text-xs font-bold text-[#183653] dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#647C95] dark:text-slate-400 font-bold block mb-0.5">End Date</span>
                      <input
                        type="date"
                        value={downloadEndDate}
                        onChange={(e) => setDownloadEndDate(e.target.value)}
                        className="w-full h-8 px-2 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 text-xs font-bold text-[#183653] dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Export Action Buttons */}
                <div className="space-y-1.5 pt-1 border-t border-[#EAF5FF] dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadDropdown(false);
                      exportLoanHistoryPDF({
                        loan,
                        customer,
                        payments,
                        period: downloadPeriod,
                        startDate: downloadStartDate,
                        endDate: downloadEndDate,
                      });
                    }}
                    className="w-full min-h-[38px] px-3 rounded-xl bg-[#EAF5FF] hover:bg-[#D5E9FA] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0878D1] dark:text-[#55B8F5] font-bold text-xs flex items-center space-x-2 transition active:scale-98"
                  >
                    <FileText className="w-4 h-4 text-[#0878D1] dark:text-[#55B8F5]" />
                    <span className="flex-1 text-left">PDF Statement / PDF அறிக்கை</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadDropdown(false);
                      exportLoanHistoryExcel({
                        loan,
                        customer,
                        payments,
                        period: downloadPeriod,
                        startDate: downloadStartDate,
                        endDate: downloadEndDate,
                      });
                    }}
                    className="w-full min-h-[38px] px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-[#18A879] font-bold text-xs flex items-center space-x-2 transition active:scale-98"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#18A879]" />
                    <span className="flex-1 text-left">Excel Spreadsheet (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadDropdown(false);
                      shareLoanHistoryWhatsApp({
                        loan,
                        customer,
                        period: downloadPeriod,
                        startDate: downloadStartDate,
                        endDate: downloadEndDate,
                      });
                    }}
                    className="w-full min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-2 transition active:scale-98"
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span className="flex-1 text-left">Share on WhatsApp / வாட்ஸ்அப்</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Square Icon Buttons & More Menu */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* WhatsApp Hub */}
            <button
              type="button"
              onClick={() => setShowWhatsAppHub(true)}
              title="WhatsApp Hub / வாட்ஸ்அப் மையம்"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs transition active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
            </button>

            {/* Payment History */}
            <button
              type="button"
              onClick={() => setShowPaymentHistoryModal(true)}
              title="Payment History / வரவு வரலாறு"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-[#0878D1] flex items-center justify-center shrink-0 shadow-2xs transition active:scale-95"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Documents */}
            <button
              type="button"
              onClick={() => setShowLoanFormModal(true)}
              title="Documents & Forms / ஆவணங்கள்"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-[#0878D1] flex items-center justify-center shrink-0 shadow-2xs transition active:scale-95"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* More (Three Dots) Menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="More actions / கூடுதல்"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-[#647C95] hover:text-[#183653] dark:text-slate-400 dark:hover:text-white flex items-center justify-center shrink-0 shadow-2xs transition active:scale-95"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* More Dropdown */}
              {showMoreMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-[#D5E9FA] dark:border-slate-800 shadow-2xl p-1.5 z-50 space-y-1 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowEditModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[#183653] dark:text-slate-200 hover:bg-[#F3F9FF] dark:hover:bg-slate-800 flex items-center space-x-2 transition"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#0878D1]" />
                    <span>Edit Loan / திருத்து</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      downloadLoanAgreementPDF(loan, customer);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[#183653] dark:text-slate-200 hover:bg-[#F3F9FF] dark:hover:bg-slate-800 flex items-center space-x-2 transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#647C95]" />
                    <span>Print Form PDF</span>
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setDeleteConfirmInput('');
                        setShowDeleteModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete Loan / நீக்கு</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2) SUMMARY CARDS (COLLECTED, OVERDUE AMOUNT, NEXT DUE DATE)
      ========================================================================= */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Card 1: Collected */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#D5E9FA] dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] text-[#18A879] font-bold block uppercase truncate">
            Collected / வரவு
          </span>
          <p className="text-sm sm:text-base font-black text-[#18A879] tabular-nums mt-0.5">
            {formatCurrency(loan.totalCollected || 0)}
          </p>
          <p className="text-[10px] text-[#647C95] dark:text-slate-400 truncate mt-0.5 font-medium">
            {loan.totalPayable > 0 ? Math.round(((loan.totalCollected || 0) / loan.totalPayable) * 100) : 0}% realized
          </p>
        </div>

        {/* Card 2: Overdue Amount */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-2xs">
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block uppercase truncate">
            Overdue Amount / தவணை
          </span>
          <p className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            {formatCurrency(totalOverdueAmount)}
          </p>
          <p className="text-[10px] text-[#647C95] dark:text-slate-400 truncate mt-0.5 font-medium">
            {overdueCount} {overdueCount === 1 ? 'due' : 'dues'} overdue
          </p>
        </div>

        {/* Card 3: Next Due Date */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#EAF5FF] dark:bg-slate-800/80 border border-[#BFE3FA] dark:border-slate-700 shadow-2xs">
          <span className="text-[10px] text-[#0878D1] dark:text-[#55B8F5] font-bold block uppercase truncate">
            Next Due / அடுத்த தவணை
          </span>
          <p className="text-sm sm:text-base font-black text-[#064B8E] dark:text-white truncate mt-0.5">
            {nextDueInst ? formatDate(nextDueInst.dueDate) : 'All Settled'}
          </p>
          <p className="text-[10px] text-[#647C95] dark:text-slate-400 truncate mt-0.5 font-medium">
            {nextDueInst ? formatCurrency(nextDueInst.amount - (nextDueInst.paidAmount || 0)) : 'Balance: ₹0'}
          </p>
        </div>
      </div>

      {/* =========================================================================
          3) STICKY MASTER COLLECT BAR (STICKY JUST UNDER THE STICKY HEADER)
      ========================================================================= */}
      {unpaidInstallments.length > 0 && (
        <div className="sticky top-[86px] sm:top-[94px] z-20 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-[#D5E9FA] dark:border-slate-800 shadow-md flex items-center justify-between gap-2 flex-wrap transition-all">
          {/* Quick Selection Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase text-[#647C95] dark:text-slate-400 shrink-0 mr-1 flex items-center space-x-1">
              <Filter className="w-3 h-3 text-[#0878D1]" />
              <span>Select:</span>
            </span>

            {overdueCount > 0 && (
              <button
                type="button"
                onClick={handleSelectOverdue}
                className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold whitespace-nowrap active:scale-95 transition shrink-0"
              >
                ⚡ All overdue ({overdueCount})
              </button>
            )}

            <button
              type="button"
              onClick={handleSelectNext7Days}
              className="px-2.5 py-1 rounded-xl bg-[#EAF5FF] hover:bg-[#D5E9FA] text-[#0878D1] border border-[#BFE3FA] text-xs font-bold whitespace-nowrap active:scale-95 transition shrink-0"
            >
              📅 Next 7 days
            </button>

            {/* Up to date picker */}
            <div className="flex items-center space-x-1 bg-[#F3F9FF] dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 rounded-xl px-2 py-0.5 shrink-0">
              <span className="text-[10px] text-[#647C95] dark:text-slate-400 font-bold">Up to:</span>
              <input
                type="date"
                value={upToDateFilter}
                onChange={(e) => handleSelectUpToDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#183653] dark:text-white outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleToggleAllUnpaid}
              className="px-2 py-1 text-xs font-bold text-[#647C95] hover:text-[#183653] dark:text-slate-400 dark:hover:text-white underline whitespace-nowrap shrink-0"
            >
              {selectedInstNos.size === unpaidInstallments.length ? 'Clear all' : `All unpaid (${unpaidInstallments.length})`}
            </button>
          </div>

          {/* Green Collect Action Button */}
          {selectedInstNos.size > 0 && (
            <button
              type="button"
              disabled={masterCollecting}
              onClick={handleMasterCollect}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center space-x-2 active:scale-95 transition shrink-0 ml-auto"
            >
              {masterCollecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Collecting {selectedInstNos.size}...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    Collect selected · {selectedInstNos.size} · {formatCurrency(totalSelectedAmount)}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* =========================================================================
          4) REPAYMENT SCHEDULE TABLE & MOBILE CARDS (1-TAP COLLECT + PENCIL)
      ========================================================================= */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#D5E9FA] dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#EAF5FF] dark:border-slate-800">
          <div>
            <h3 className="font-black text-sm sm:text-base text-[#183653] dark:text-white">
              {t('repaymentSchedule')} / தவணை அட்டவணை
            </h3>
            <p className="text-[11px] text-[#647C95] dark:text-slate-400">
              {loan.schedule?.length} scheduled installments · Auto-sorted with overdue tracking
            </p>
          </div>
          <span className="text-xs font-bold text-[#0878D1] dark:text-[#55B8F5]">
            1 Due = {formatCurrency(loan.installmentAmount)}
          </span>
        </div>

        {isMobile ? (
          /* Mobile Card View with Large Tap Targets */
          <div className="space-y-2.5">
            {loan.schedule?.map((inst) => {
              const isPaid = inst.status === 'paid';
              const isHoliday = inst.status === 'holiday';
              const isLeave = inst.status === 'leave';
              const isMissed = inst.status === 'missed';
              const isOverdue = !isHoliday && !isMissed && !isLeave && (inst.status === 'overdue' || (!isPaid && new Date(inst.dueDate) < new Date()));
              const isSelected = selectedInstNos.has(inst.installmentNo);
              const isPendingSync = pendingSyncInstNos.has(inst.installmentNo) || inst.isOffline;
              const isCollecting = collectingInstNo === inst.installmentNo;

              return (
                <div
                  key={inst.installmentNo}
                  id={`inst-row-${inst.installmentNo}`}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    isPaid
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : isHoliday
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                      : isLeave
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700'
                      : isOverdue
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 border-l-4 border-l-rose-500'
                      : isSelected
                      ? 'bg-[#EAF5FF] dark:bg-slate-800 border-[#0878D1] ring-1 ring-[#0878D1]'
                      : 'bg-white dark:bg-slate-900 border-[#D5E9FA] dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {/* Selection Checkbox (Unpaid only) */}
                      {!isPaid && !isHoliday && !isLeave && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectInst(inst.installmentNo)}
                          className="text-[#0878D1] p-1"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5 text-[#647C95]" />
                          )}
                        </button>
                      )}

                      <div>
                        <p className="font-black text-xs text-[#183653] dark:text-white">
                          #{inst.installmentNo} · {formatDate(inst.dueDate)}
                        </p>
                        <p className="text-[11px] text-[#647C95] dark:text-slate-400 font-mono">
                          {isPaid
                            ? `✓ Paid on ${formatDate(inst.paidDate || inst.dueDate)}`
                            : isHoliday
                            ? `🏖️ Holiday: ${inst.holidayReason || 'Shop / Area'}`
                            : isLeave
                            ? `👤 Leave: ${inst.holidayReason || 'Customer Leave'}`
                            : `Due: ${formatCurrency(inst.amount)}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular-nums text-[#183653] dark:text-white">
                        {formatCurrency(inst.amount)}
                      </p>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-block ${
                          isPaid
                            ? 'bg-emerald-100 text-[#18A879] dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : isHoliday
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                            : isLeave
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300'
                            : isMissed
                            ? 'bg-orange-100 text-orange-800 border border-orange-300'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                            : 'bg-slate-100 text-[#647C95] dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isPaid ? 'PAID' : isHoliday ? 'HOLIDAY' : isLeave ? 'LEAVE' : isMissed ? 'MISSED' : isOverdue ? 'OVERDUE' : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* Action Row: Collect & Pencil Button */}
                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-[#EAF5FF] dark:border-slate-800">
                    {isPendingSync && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mr-auto flex items-center space-x-1">
                        <Clock className="w-2.5 h-2.5 animate-spin" />
                        <span>Pending sync</span>
                      </span>
                    )}

                    {!isPaid && !isHoliday && !isLeave && (
                      <button
                        type="button"
                        disabled={isCollecting}
                        onClick={() => handleDirectCollect(inst)}
                        className="min-h-[40px] px-4 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white font-black text-xs flex items-center space-x-1.5 shadow-xs active:scale-95 transition"
                      >
                        {isCollecting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                        <span>Collect {formatCurrency(inst.amount - (inst.paidAmount || 0))}</span>
                      </button>
                    )}

                    {/* Pencil Button (On every row, paid and unpaid) */}
                    <button
                      type="button"
                      onClick={() => handleOpenPencil(inst)}
                      title="Edit amount / advance payment / correction"
                      className="w-10 h-10 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-[#0878D1] dark:text-[#55B8F5] flex items-center justify-center shrink-0 active:scale-95 transition shadow-2xs"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Table View with Checkbox Column, 1-Tap Collect & Pencil */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F3F9FF] dark:bg-slate-800 font-bold uppercase text-[10px] text-[#647C95] dark:text-slate-300 border-b border-[#D5E9FA] dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-10">
                    <button
                      type="button"
                      onClick={handleToggleAllUnpaid}
                      title="Select / Deselect All Unpaid"
                      className="text-[#0878D1]"
                    >
                      {selectedInstNos.size > 0 && selectedInstNos.size === unpaidInstallments.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Paid Date</th>
                  <th className="py-2.5 px-3 text-right min-w-[140px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF5FF] dark:divide-slate-800">
                {loan.schedule?.map((inst) => {
                  const isPaid = inst.status === 'paid';
                  const isHoliday = inst.status === 'holiday';
                  const isLeave = inst.status === 'leave';
                  const isMissed = inst.status === 'missed';
                  const isOverdue = !isHoliday && !isMissed && !isLeave && (inst.status === 'overdue' || (!isPaid && new Date(inst.dueDate) < new Date()));
                  const isSelected = selectedInstNos.has(inst.installmentNo);
                  const isPendingSync = pendingSyncInstNos.has(inst.installmentNo) || inst.isOffline;
                  const isCollecting = collectingInstNo === inst.installmentNo;

                  return (
                    <tr
                      key={inst.installmentNo}
                      id={`inst-row-${inst.installmentNo}`}
                      className={`transition-colors ${
                        isPaid
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/20'
                          : isHoliday
                          ? 'bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/20'
                          : isLeave
                          ? 'bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-950/20'
                          : isOverdue
                          ? 'bg-rose-50/50 hover:bg-rose-50/80 dark:bg-rose-950/20 border-l-4 border-l-rose-500'
                          : isSelected
                          ? 'bg-[#EAF5FF] hover:bg-[#EAF5FF]/80 dark:bg-slate-800'
                          : 'hover:bg-[#F3F9FF] dark:hover:bg-slate-850'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3">
                        {!isPaid && !isHoliday && !isLeave && (
                          <button
                            type="button"
                            onClick={() => handleToggleSelectInst(inst.installmentNo)}
                            className="text-[#0878D1]"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-[#647C95]" />
                            )}
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-black text-[#183653] dark:text-white">
                        {inst.installmentNo}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-[#183653] dark:text-white">
                        {formatDate(inst.dueDate)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-black tabular-nums text-[#183653] dark:text-white">
                        {formatCurrency(inst.amount)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-black tabular-nums text-[#18A879]">
                        {formatCurrency(inst.paidAmount || 0)}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                            isPaid
                              ? 'bg-emerald-100 text-[#18A879] dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              : isHoliday
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                              : isLeave
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300'
                              : isMissed
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 animate-pulse'
                              : 'bg-slate-100 text-[#647C95] dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
                          }`}
                        >
                          {isPaid ? 'PAID' : isHoliday ? 'HOLIDAY' : isLeave ? 'LEAVE' : isMissed ? 'MISSED' : isOverdue ? 'OVERDUE' : 'PENDING'}
                        </span>
                        {isPendingSync && (
                          <span className="ml-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full">
                            Syncing
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[#647C95] dark:text-slate-400 text-[11px] font-mono">
                        {inst.paidDate ? formatDate(inst.paidDate) : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {!isPaid && !isHoliday && !isLeave && (
                            <button
                              type="button"
                              disabled={isCollecting}
                              onClick={() => handleDirectCollect(inst)}
                              className="bg-[#18A879] hover:bg-[#138861] text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs active:scale-95 transition flex items-center space-x-1"
                            >
                              {isCollecting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                              <span>Collect</span>
                            </button>
                          )}

                          {/* Pencil Button (On EVERY row) */}
                          <button
                            type="button"
                            onClick={() => handleOpenPencil(inst)}
                            title="Edit amount / advance payment / correction"
                            className="w-8 h-8 rounded-xl border border-[#D5E9FA] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#EAF5FF] dark:hover:bg-slate-700 text-[#0878D1] dark:text-[#55B8F5] flex items-center justify-center shrink-0 active:scale-95 transition shadow-2xs"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          PENCIL MODAL: UNPAID (CUSTOM/ADVANCE/HOLIDAY/LEAVE) OR PAID (REVERSE/CORRECTION)
      ========================================================================= */}
      {pencilInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#D5E9FA] dark:border-slate-800 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#EAF5FF] dark:border-slate-800 gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5FF] dark:bg-slate-800 text-[#0878D1] dark:text-[#55B8F5] flex items-center justify-center shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-sm text-[#183653] dark:text-white truncate">
                    {pencilInst.status === 'paid'
                      ? `Edit Paid Installment #${pencilInst.installmentNo}`
                      : `Record / Advance Installment #${pencilInst.installmentNo}`}
                  </h4>
                  <p className="text-[11px] text-[#647C95] dark:text-slate-400 truncate">
                    {loan?.customerName || loan?.customerId?.name} · {loan?.loanNo} · Due: {formatDate(pencilInst.dueDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPencilInst(null)}
                className="w-8 h-8 rounded-full bg-[#F3F9FF] dark:bg-slate-800 hover:bg-[#EAF5FF] text-[#647C95] flex items-center justify-center shrink-0 active:scale-95 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Summary Strip for Paid Installment */}
            {pencilInst.status === 'paid' && (
              <div className="p-3 rounded-2xl bg-[#F3F9FF] dark:bg-slate-800/60 border border-[#D5E9FA] dark:border-slate-700/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#647C95] dark:text-slate-400 uppercase tracking-wider block">
                    Installment
                  </span>
                  <span className="font-mono font-black text-xs text-[#183653] dark:text-white">
                    Due #{pencilInst.installmentNo}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#647C95] dark:text-slate-400 uppercase tracking-wider block">
                    Recorded Payment
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    PAID {formatCurrency(pencilInst.paidAmount || pencilInst.amount)}
                  </span>
                </div>
              </div>
            )}

            {/* 3-WAY TOGGLE (PAY | HOLIDAY | LEAVE) for Unpaid Installment */}
            {pencilInst.status !== 'paid' && (
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F3F9FF] dark:bg-slate-800/80 border border-[#D5E9FA] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setPencilActionTab('pay');
                    setPencilError('');
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1 ${
                    pencilActionTab === 'pay'
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
                    setPencilActionTab('holiday');
                    setPencilError('');
                  }}
                  className={`py-1.5 px-1.5 rounded-xl text-[11px] font-black transition flex items-center justify-center space-x-1 ${
                    pencilActionTab === 'holiday'
                      ? 'bg-[#0878D1] text-white shadow-xs'
                      : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
                  }`}
                >
                  <span>🏖️ Holiday / விடுமுறை</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPencilActionTab('leave');
                    setPencilError('');
                  }}
                  className={`py-1.5 px-1.5 rounded-xl text-[11px] font-black transition flex items-center justify-center space-x-1 ${
                    pencilActionTab === 'leave'
                      ? 'bg-[#0878D1] text-white shadow-xs'
                      : 'text-[#647C95] hover:text-[#183653] dark:text-slate-300'
                  }`}
                >
                  <span>👤 Leave / விடுப்பு</span>
                </button>
              </div>
            )}

            {pencilError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-fade-in flex items-center space-x-2">
                <span>{pencilError}</span>
              </div>
            )}

            <form onSubmit={handleSavePencil} className="space-y-3.5">
              {/* HOLIDAY / LEAVE MODE: Info & Dropdown */}
              {pencilInst.status !== 'paid' && (pencilActionTab === 'holiday' || pencilActionTab === 'leave') ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-medium space-y-1">
                    <p className="font-bold flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {pencilActionTab === 'holiday'
                          ? 'Shop / Area Holiday (no collection on this day) / விடுமுறை நாள்'
                          : 'Customer Absent or Leave Taken / வாடிக்கையாளர் விடுப்பு'}
                      </span>
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      This installment will be excluded from overdue counts and penalty calculations.
                    </p>
                  </div>

                  {/* Dropdown: After skipping / பிறகு */}
                  <div>
                    <label className="block text-xs font-black text-[#183653] dark:text-white mb-1">
                      After skipping / பிறகு *
                    </label>
                    <select
                      value={pencilSkipOption}
                      onChange={(e) => setPencilSkipOption(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 text-[#183653] dark:text-white font-bold text-xs outline-none focus:border-[#0878D1] transition"
                    >
                      <option value="move_next">a) Move due to next date / அடுத்த தேதிக்கு மாற்றுக (Default)</option>
                      <option value="extend_end">b) Extend loan end date by 1 day / கடன் முடிவை நீட்டிக்க</option>
                      <option value="skip_only">c) No change, mark skipped only / மாற்றம் இல்லை, தவிர்த்ததாக குறிக்க</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* PAY MODE OR EDIT PAID: Amount & Mode Inputs */
                <>
                  {/* Amount input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-black text-[#183653] dark:text-white">
                        Amount / தொகை (₹) *
                      </label>
                      {pencilInst.status !== 'paid' && (
                        <span className="text-[11px] font-bold text-[#0878D1] dark:text-[#55B8F5]">
                          Due: {formatCurrency(Math.max(0, Number(pencilInst.amount) - (Number(pencilInst.paidAmount) || 0)))}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm pointer-events-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={pencilAmount !== '' && pencilAmount !== undefined ? pencilAmount : ''}
                        onChange={(e) => setPencilAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full h-10 pl-8 pr-3 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 text-[#183653] dark:text-white font-black text-base outline-none focus:border-[#0878D1] focus:ring-2 focus:ring-[#0878D1]/20 transition"
                      />
                    </div>

                    {/* LIVE SPLIT BOX WHILE TYPING (EXTRA TO PRINCIPAL RULE) */}
                    {pencilInst.status !== 'paid' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-[#F3F9FF] dark:bg-slate-800/80 border border-[#D5E9FA] dark:border-slate-700 space-y-1 text-xs">
                        {(() => {
                          const due = Math.max(0, Number(pencilInst.amount) - (Number(pencilInst.paidAmount) || 0));
                          const amt = Number(pencilAmount) || 0;
                          const extra = Math.max(0, amt - due);
                          const instPart = Math.min(amt, due);
                          const curPrin = Number(loan?.principal) || 0;
                          const newPrin = Math.max(0, curPrin - extra);
                          const dateLabel = pencilDate ? formatDate(pencilDate) : 'Today';

                          return (
                            <>
                              <div className="flex items-center justify-between text-[#183653] dark:text-white font-medium">
                                <span>Installment #{pencilInst.installmentNo} ({dateLabel}):</span>
                                <span className="font-bold tabular-nums">₹{instPart}</span>
                              </div>
                              {extra > 0 && (
                                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
                                  <span>Extra to principal ({dateLabel}):</span>
                                  <span className="tabular-nums">+₹{extra}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[#0878D1] dark:text-[#55B8F5] font-black pt-0.5 border-t border-[#D5E9FA]/60 dark:border-slate-700/60">
                                <span>New principal:</span>
                                <span className="tabular-nums">₹{newPrin}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Mode Toggle */}
                  <div>
                    <label className="block text-xs font-black text-[#183653] dark:text-white mb-1">
                      Payment Mode / முறை
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPencilMode('cash')}
                        className={`h-9 rounded-xl border text-xs font-black flex items-center justify-center space-x-1.5 transition active:scale-95 ${
                          pencilMode === 'cash'
                            ? 'bg-[#EAF5FF] dark:bg-slate-700 border-[#0878D1] text-[#0878D1] dark:text-[#55B8F5] shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-[#D5E9FA] dark:border-slate-700 text-[#647C95]'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPencilMode('upi')}
                        className={`h-9 rounded-xl border text-xs font-black flex items-center justify-center space-x-1.5 transition active:scale-95 ${
                          pencilMode === 'upi'
                            ? 'bg-[#EAF5FF] dark:bg-slate-700 border-[#0878D1] text-[#0878D1] dark:text-[#55B8F5] shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-[#D5E9FA] dark:border-slate-700 text-[#647C95]'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>UPI / GPay</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Paid / Target Date */}
              <div>
                <label className="block text-xs font-black text-[#183653] dark:text-white mb-1">
                  {pencilActionTab === 'pay' || pencilInst.status === 'paid' ? 'Paid Date / தேதி' : 'Date / தேதி'}
                </label>
                <input
                  type="date"
                  required
                  value={pencilDate}
                  onChange={(e) => setPencilDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 text-[#183653] dark:text-white font-bold text-xs outline-none focus:border-[#0878D1] focus:ring-2 focus:ring-[#0878D1]/20 transition"
                />
              </div>

              {/* Notes / Reason */}
              <div>
                <label className="block text-xs font-black text-[#183653] dark:text-white mb-1">
                  {pencilActionTab === 'leave'
                    ? 'Reason for Leave / விடுப்பிற்கான காரணம் *'
                    : pencilActionTab === 'holiday'
                    ? 'Reason / குறிப்பு (Optional)'
                    : 'Notes / குறிப்பு'}
                </label>
                <input
                  type="text"
                  required={pencilActionTab === 'leave'}
                  placeholder={
                    pencilActionTab === 'leave'
                      ? 'e.g. Out of station, Medical leave, Customer absent...'
                      : pencilActionTab === 'holiday'
                      ? 'e.g. Festival, Sunday, Shop closed...'
                      : 'Optional notes or audit reason...'
                  }
                  value={pencilNotes}
                  onChange={(e) => setPencilNotes(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#D5E9FA] dark:border-slate-700 text-[#183653] dark:text-white font-medium text-xs outline-none focus:border-[#0878D1] focus:ring-2 focus:ring-[#0878D1]/20 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-2">
                {pencilInst.status === 'paid' && isOwner && (
                  <button
                    type="button"
                    disabled={pencilSubmitting}
                    onClick={handleReversePaidInst}
                    className="flex-1 min-h-[42px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-black text-xs transition flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reverse / ரத்து</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={pencilSubmitting}
                  className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#0878D1] hover:bg-[#064B8E] text-white font-black text-xs shadow-md shadow-[#0878D1]/25 transition flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50"
                >
                  {pencilSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>
                        {pencilInst.status === 'paid'
                          ? 'Save Changes / சேமி'
                          : pencilActionTab === 'holiday'
                          ? 'Declare Holiday / உறுதிசெய்'
                          : pencilActionTab === 'leave'
                          ? 'Record Leave / உறுதிசெய்'
                          : 'Save Payment / சேமி'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE LOAN CONFIRMATION MODAL (CONFIRM BY TYPING LOAN NUMBER)
      ========================================================================= */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteModal(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-rose-200 dark:border-rose-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-rose-700 dark:text-rose-400">
                  Delete Loan / கடன் கணக்கை நீக்கு
                </h3>
                <p className="text-xs text-[#647C95] dark:text-slate-400">
                  Permanent Action • நிரந்தர நடவடிக்கை
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold">⚠️ Warning / எச்சரிக்கை:</p>
              <p>
                This will permanently delete loan <strong>{loan.loanNo}</strong> and all associated installments and records. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#183653] dark:text-slate-300">
                Type loan number <span className="font-mono text-rose-600 font-black">{loan.loanNo}</span> to confirm deletion:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={`Type ${loan.loanNo}`}
                className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800 text-xs font-mono font-bold text-[#183653] dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-10 rounded-xl border border-[#D5E9FA] text-xs font-bold text-[#647C95] hover:bg-slate-100 transition"
              >
                Cancel / ரத்து
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput.trim() !== loan.loanNo.trim()}
                onClick={() => {
                  setShowDeleteModal(false);
                  handleDeleteLoan();
                }}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-black transition active:scale-95 shadow-md shadow-rose-600/20"
              >
                Confirm Delete / நீக்கு
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8-SECOND FLOATING TOAST WITH UNDO
      ========================================================================= */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto p-3.5 rounded-2xl bg-[#064B8E] text-white shadow-2xl border border-[#55B8F5]/40 flex items-center justify-between space-x-4 animate-fade-in">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-[#18A879] flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <p className="text-xs font-black text-[#55B8F5] truncate">
              {toast.message}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndoToast}
              className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-xs transition active:scale-95 flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo / ரத்து</span>
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

      {/* Modals for WhatsApp, Forms, Receipts */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {whatsappItem && (
        <WhatsAppReminderModal
          item={whatsappItem}
          onClose={() => setWhatsappItem(null)}
        />
      )}

      {showWhatsAppHub && (
        <WhatsAppHubModal
          loan={loan}
          onClose={() => setShowWhatsAppHub(false)}
        />
      )}

      {showPaymentHistoryModal && (
        <WhatsAppPaymentHistoryModal
          loan={loan}
          payments={payments}
          onClose={() => setShowPaymentHistoryModal(false)}
        />
      )}

      {showLoanFormModal && (
        <LoanApplicationFormModal
          loan={loan}
          onClose={() => setShowLoanFormModal(false)}
        />
      )}

      {showEditModal && (
        <EditLoanModal
          loan={loan}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => fetchLoanData()}
        />
      )}

      {payModalItem && (
        <PaymentModal
          loanItem={payModalItem}
          onClose={() => setPayModalItem(null)}
          onSuccess={() => {
            fetchLoanData();
          }}
        />
      )}
    </div>
  );
};

export default LoanDetail;
