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
import LoanActionBar from '../components/common/LoanActionBar';
import { downloadLoanAgreementPDF, downloadRepaymentSchedulePDF } from '../utils/loanAgreementPdf';
import {
  ArrowLeft,
  CreditCard,
  Send,
  Printer,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  History,
  FileText,
  Share2,
  Smartphone,
  Download,
  Pencil,
  Trash2,
  Calendar,
  Check,
  RotateCcw,
  Banknote,
  QrCode,
  X,
  RefreshCw,
  Sparkles,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';

export const LoanDetail = ({ loanId, onBack }) => {
  const { t, lang } = useLanguage();
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

  // Pencil Modal state (for editing unpaid advance or correcting paid row)
  const [pencilInst, setPencilInst] = useState(null);
  const [pencilAmount, setPencilAmount] = useState(0);
  const [pencilMode, setPencilMode] = useState('cash');
  const [pencilDate, setPencilDate] = useState(formatDateForInput());
  const [pencilNotes, setPencilNotes] = useState('');
  const [pencilSubmitting, setPencilSubmitting] = useState(false);
  const [pencilError, setPencilError] = useState('');

  // Master Collect & Checkbox Selection state
  const [selectedInstNos, setSelectedInstNos] = useState(new Set());
  const [upToDateFilter, setUpToDateFilter] = useState('');
  const [masterCollecting, setMasterCollecting] = useState(false);
  const [collectingInstNo, setCollectingInstNo] = useState(null);

  // 8-Second Floating Toast state
  const [toast, setToast] = useState(null); // { type: 'single' | 'batch', message, amount, items: [{ paymentId, instNo, amount }] }
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
    }, 8000); // 8 seconds
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

      // Optimistic update of schedule & balances
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

      // Micro celebration
      try {
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.8 } });
      } catch (e) {}

      // Trigger 8-second toast with Undo
      showToast({
        type: 'single',
        message: `Installment ${instNo} collected · ${formatCurrency(payAmount)}`,
        amount: payAmount,
        items: [{ paymentId, instNo, amount: payAmount }],
      });

      // Broadcast update across the app
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

      // Revert in memory
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

      // Broadcast update across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      console.error('Undo toast error:', err);
      alert(err.message || 'Cannot undo payment / ரத்து செய்ய இயலவில்லை');
    }
  };

  // ---------------------------------------------------------------------------
  // PENCIL MODAL: UNPAID (CUSTOM/ADVANCE) OR PAID (OWNER CORRECTION/REVERSE)
  // ---------------------------------------------------------------------------
  const handleOpenPencil = (inst) => {
    setPencilInst(inst);
    setPencilError('');
    setPencilMode('cash');
    setPencilDate(inst.dueDate ? formatDateForInput(inst.dueDate) : formatDateForInput());
    setPencilNotes('');

    if (inst.status !== 'paid') {
      const instDue = Number(inst.amount) - (Number(inst.paidAmount) || 0);
      setPencilAmount(instDue);
    } else {
      setPencilAmount(Number(inst.paidAmount || inst.amount));
    }
  };

  const handleSavePencil = async (e) => {
    e.preventDefault();
    if (!pencilInst) return;
    setPencilError('');

    const isPaid = pencilInst.status === 'paid';
    const payNum = Number(pencilAmount) || 0;
    if (payNum <= 0) {
      setPencilError('Please enter a valid amount / சரியான தொகை தேவை');
      return;
    }

    try {
      setPencilSubmitting(true);
      const auditNote = isPaid
        ? `[Correction by ${user?.name || 'Owner'} on ${new Date().toLocaleDateString('en-IN')}]: ${pencilNotes || 'Adjusted amount/mode'}`
        : pencilNotes || `Installment #${pencilInst.installmentNo} advance payment`;

      const res = await api.recordPayment({
        loanId: loan._id,
        amount: payNum,
        mode: pencilMode,
        date: pencilDate,
        notes: auditNote,
      });

      setPencilInst(null);
      await fetchLoanData();

      // Micro celebration
      try {
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}

      showToast({
        type: 'single',
        message: `Saved ${formatCurrency(payNum)} for Installment #${pencilInst.installmentNo}`,
        amount: payNum,
        items: [{ paymentId: res?.payment?._id, instNo: pencilInst.installmentNo, amount: payNum }],
      });

      // Broadcast update across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      setPencilError(err.message || 'Failed to save / சேமிக்க இயலவில்லை');
    } finally {
      setPencilSubmitting(false);
    }
  };

  const handleReversePaidInst = async () => {
    if (!pencilInst || pencilInst.status !== 'paid') return;
    if (!window.confirm(`Reverse payment for Installment #${pencilInst.installmentNo} (${formatCurrency(pencilInst.paidAmount || pencilInst.amount)})?`)) {
      return;
    }

    try {
      setPencilSubmitting(true);
      if (pencilInst.paymentId) {
        await api.deletePayment(pencilInst.paymentId);
      }
      setPencilInst(null);
      await fetchLoanData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
      }
    } catch (err) {
      setPencilError(err.message || 'Failed to reverse payment');
    } finally {
      setPencilSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MASTER COLLECT BAR HELPERS
  // ---------------------------------------------------------------------------
  const unpaidInstallments = useMemo(() => {
    return (loan?.schedule || []).filter((inst) => inst.status !== 'paid');
  }, [loan?.schedule]);

  const overdueCount = useMemo(() => {
    const now = new Date();
    return unpaidInstallments.filter(
      (inst) => inst.status === 'overdue' || new Date(inst.dueDate) < now
    ).length;
  }, [unpaidInstallments]);

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
      if (inst.status === 'overdue' || new Date(inst.dueDate) < now) {
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

  // Selected totals for Master Collect
  const selectedInstallmentsList = useMemo(() => {
    return (loan?.schedule || []).filter((inst) => selectedInstNos.has(inst.installmentNo));
  }, [loan?.schedule, selectedInstNos]);

  const totalSelectedAmount = useMemo(() => {
    return selectedInstallmentsList.reduce(
      (sum, inst) => sum + (inst.amount - (inst.paidAmount || 0)),
      0
    );
  }, [selectedInstallmentsList]);

  // Master Collect execution (Atomic, saves each installment with its own due date)
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

      // Optimistically update schedule & balance
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

      // Micro celebration
      try {
        confetti({ particleCount: 65, spread: 75, origin: { y: 0.75 } });
      } catch (e) {}

      // One Toast with batch Undo
      showToast({
        type: 'batch',
        message: `${createdItems.length} installments collected · ${formatCurrency(totalSelectedAmount)}`,
        amount: totalSelectedAmount,
        items: createdItems,
      });

      // Broadcast update across the app
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
    <div className="space-y-5">
      {/* =========================================================================
          1) SCHEDULE HERO HEADER (BORROWER NAME, LOAN #, INSTALLMENTS, PER DUE, BALANCE)
      ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#F3F9FF] via-white to-[#EAF5FF] border border-[#D5E9FA] shadow-sm space-y-3">
        {/* Top Action Row: Back Button & Loan Tag */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 h-10 px-3.5 rounded-xl border border-[#D5E9FA] bg-white text-xs font-bold text-[#183653] hover:bg-[#EAF5FF] transition active:scale-95 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#0878D1]" />
            <span>Back to Loans / கடன்கள்</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]">
              {loan.financeType} Scheme
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                loan.status === 'completed'
                  ? 'bg-emerald-100 text-[#18A879] border border-emerald-300'
                  : loan.status === 'overdue'
                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                  : 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]'
              }`}
            >
              {loan.status}
            </span>
          </div>
        </div>

        {/* Borrower & Key Figures Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {/* Borrower Name */}
          <div className="col-span-2 sm:col-span-1 p-2.5 rounded-2xl bg-white border border-[#D5E9FA]">
            <span className="text-[10px] text-[#647C95] font-bold block uppercase truncate">
              Borrower / பெயர்
            </span>
            <p className="text-sm font-black text-[#183653] truncate mt-0.5">
              {parsedName.primary}
            </p>
            <p className="text-[10px] text-[#647C95] font-mono truncate">
              {customer.phone ? `📞 ${customer.phone}` : customer.area || ''}
            </p>
          </div>

          {/* Loan Number */}
          <div className="p-2.5 rounded-2xl bg-white border border-[#D5E9FA]">
            <span className="text-[10px] text-[#647C95] font-bold block uppercase truncate">
              Loan No / எண்
            </span>
            <p className="text-sm font-black text-[#0878D1] font-mono mt-0.5">
              {loan.loanNo}
            </p>
          </div>

          {/* Total Installments */}
          <div className="p-2.5 rounded-2xl bg-white border border-[#D5E9FA]">
            <span className="text-[10px] text-[#647C95] font-bold block uppercase truncate">
              Total Installments
            </span>
            <p className="text-sm font-black text-[#183653] mt-0.5">
              {totalInstallmentsCount} <span className="text-[10px] font-normal text-[#647C95]">dues</span>
            </p>
          </div>

          {/* Per-Installment Amount */}
          <div className="p-2.5 rounded-2xl bg-white border border-[#D5E9FA]">
            <span className="text-[10px] text-[#647C95] font-bold block uppercase truncate">
              Per Inst / தவணை
            </span>
            <p className="text-sm font-black text-[#0878D1] tabular-nums mt-0.5">
              {formatCurrency(loan.installmentAmount)}
            </p>
          </div>

          {/* Remaining Balance */}
          <div className="col-span-2 sm:col-span-1 p-2.5 rounded-2xl bg-[#EAF5FF] border border-[#BFE3FA]">
            <span className="text-[10px] text-[#0878D1] font-bold block uppercase truncate">
              Remaining / மீதி
            </span>
            <p className="text-base font-black text-[#064B8E] tabular-nums mt-0.5">
              {formatCurrency(loan.remainingBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar (WhatsApp, History, Edit, Documents, Delete) */}
      <LoanActionBar
        loan={loan}
        onOpenWhatsAppHub={() => setShowWhatsAppHub(true)}
        onOpenPaymentHistory={() => setShowPaymentHistoryModal(true)}
        onOpenEditLoan={() => setShowEditModal(true)}
        onDeleteLoan={handleDeleteLoan}
        onDownloadFormPDF={() => downloadLoanAgreementPDF(loan, customer)}
        onDownloadRepaymentSchedulePDF={() => downloadRepaymentSchedulePDF(loan, customer, payments)}
        onPrintForm={() => setShowLoanFormModal(true)}
      />

      {/* =========================================================================
          4) MASTER COLLECT BAR (QUICK SELECTIONS + ATOMIC BATCH COLLECT BUTTON)
      ========================================================================= */}
      {unpaidInstallments.length > 0 && (
        <div className="sticky top-2 z-20 p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D5E9FA] shadow-md space-y-2.5 animate-fade-in">
          {/* Quick Selection Chips */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
              <span className="text-[11px] font-black uppercase text-[#647C95] shrink-0 mr-1 flex items-center space-x-1">
                <Filter className="w-3 h-3 text-[#0878D1]" />
                <span>Select:</span>
              </span>

              {overdueCount > 0 && (
                <button
                  type="button"
                  onClick={handleSelectOverdue}
                  className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold whitespace-nowrap active:scale-95 transition"
                >
                  ⚡ All overdue ({overdueCount})
                </button>
              )}

              <button
                type="button"
                onClick={handleSelectNext7Days}
                className="px-2.5 py-1 rounded-xl bg-[#EAF5FF] hover:bg-[#D5E9FA] text-[#0878D1] border border-[#BFE3FA] text-xs font-bold whitespace-nowrap active:scale-95 transition"
              >
                📅 Next 7 days
              </button>

              {/* Up to date picker */}
              <div className="flex items-center space-x-1 bg-[#F3F9FF] border border-[#D5E9FA] rounded-xl px-2 py-0.5">
                <span className="text-[10px] text-[#647C95] font-bold">Up to:</span>
                <input
                  type="date"
                  value={upToDateFilter}
                  onChange={(e) => handleSelectUpToDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#183653] outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleAllUnpaid}
                className="px-2 py-1 text-xs font-bold text-[#647C95] hover:text-[#183653] underline whitespace-nowrap"
              >
                {selectedInstNos.size === unpaidInstallments.length ? 'Clear all' : 'Select all unpaid'}
              </button>
            </div>

            {/* Master Collect Action Button */}
            {selectedInstNos.size > 0 && (
              <button
                type="button"
                disabled={masterCollecting}
                onClick={handleMasterCollect}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center space-x-2 active:scale-95 transition shrink-0 ml-auto"
              >
                {masterCollecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Collecting {selectedInstNos.size} installments...</span>
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
        </div>
      )}

      {/* =========================================================================
          2 & 3) REPAYMENT SCHEDULE TABLE & MOBILE CARDS (1-TAP COLLECT + PENCIL)
      ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#D5E9FA] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#D5E9FA]">
          <div>
            <h3 className="font-black text-base text-[#183653]">
              {t('repaymentSchedule')} / தவணை அட்டவணை
            </h3>
            <p className="text-xs text-[#647C95]">
              {loan.schedule?.length} scheduled installments · Auto-sorted with overdue tracking
            </p>
          </div>
          <span className="text-xs font-bold text-[#0878D1]">
            1 Due = {formatCurrency(loan.installmentAmount)}
          </span>
        </div>

        {isMobile ? (
          /* Mobile Card View with Large Tap Targets */
          <div className="space-y-2.5">
            {loan.schedule?.map((inst) => {
              const isPaid = inst.status === 'paid';
              const isHoliday = inst.status === 'holiday';
              const isMissed = inst.status === 'missed';
              const isOverdue = !isHoliday && !isMissed && (inst.status === 'overdue' || (!isPaid && new Date(inst.dueDate) < new Date()));
              const isSelected = selectedInstNos.has(inst.installmentNo);
              const isPendingSync = pendingSyncInstNos.has(inst.installmentNo) || inst.isOffline;
              const isCollecting = collectingInstNo === inst.installmentNo;

              return (
                <div
                  key={inst.installmentNo}
                  id={`inst-row-${inst.installmentNo}`}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    isPaid
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : isSelected
                      ? 'bg-[#EAF5FF] border-[#0878D1] ring-1 ring-[#0878D1]'
                      : 'bg-white border-[#D5E9FA] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {/* Selection Checkbox (Unpaid only) */}
                      {!isPaid && (
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
                        <p className="font-black text-xs text-[#183653]">
                          #{inst.installmentNo} · {formatDate(inst.dueDate)}
                        </p>
                        <p className="text-[11px] text-[#647C95] font-mono">
                          {isPaid
                            ? `✓ Paid on ${formatDate(inst.paidDate || inst.dueDate)}`
                            : `Due: ${formatCurrency(inst.amount)}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular-nums text-[#183653]">
                        {formatCurrency(inst.amount)}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block ${
                          isPaid
                            ? 'bg-emerald-100 text-[#18A879]'
                            : isHoliday
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : isMissed
                            ? 'bg-orange-100 text-orange-800 border border-orange-300'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-[#647C95]'
                        }`}
                      >
                        {isPaid ? 'PAID' : isHoliday ? 'HOLIDAY' : isMissed ? 'MISSED' : isOverdue ? 'OVERDUE' : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* Action Row: Collect & Pencil Button */}
                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-[#D5E9FA]/60">
                    {isPendingSync && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mr-auto flex items-center space-x-1">
                        <Clock className="w-2.5 h-2.5 animate-spin" />
                        <span>Pending sync</span>
                      </span>
                    )}

                    {!isPaid && !isHoliday && (
                      <button
                        type="button"
                        disabled={isCollecting}
                        onClick={() => handleDirectCollect(inst)}
                        className="min-h-[44px] px-4 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white font-black text-xs flex items-center space-x-1.5 shadow-xs active:scale-95 transition"
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
                      className="w-11 h-11 rounded-xl border border-[#D5E9FA] bg-white hover:bg-[#EAF5FF] text-[#0878D1] flex items-center justify-center shrink-0 active:scale-95 transition shadow-2xs"
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
          <div className="overflow-x-auto max-h-[580px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#F3F9FF] font-bold uppercase text-[10px] text-[#647C95] border-b border-[#D5E9FA] z-10">
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
              <tbody className="divide-y divide-[#D5E9FA]/60">
                {loan.schedule?.map((inst) => {
                  const isPaid = inst.status === 'paid';
                  const isHoliday = inst.status === 'holiday';
                  const isMissed = inst.status === 'missed';
                  const isOverdue = !isHoliday && !isMissed && (inst.status === 'overdue' || (!isPaid && new Date(inst.dueDate) < new Date()));
                  const isSelected = selectedInstNos.has(inst.installmentNo);
                  const isPendingSync = pendingSyncInstNos.has(inst.installmentNo) || inst.isOffline;
                  const isCollecting = collectingInstNo === inst.installmentNo;

                  return (
                    <tr
                      key={inst.installmentNo}
                      id={`inst-row-${inst.installmentNo}`}
                      className={`transition-colors ${
                        isPaid
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                          : isSelected
                          ? 'bg-[#EAF5FF] hover:bg-[#EAF5FF]/80'
                          : 'hover:bg-[#F3F9FF]'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3">
                        {!isPaid && (
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

                      <td className="py-2.5 px-3 font-black text-[#183653]">
                        {inst.installmentNo}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-[#183653]">
                        {formatDate(inst.dueDate)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-black tabular-nums text-[#183653]">
                        {formatCurrency(inst.amount)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-black tabular-nums text-[#18A879]">
                        {formatCurrency(inst.paidAmount || 0)}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center space-x-1 ${
                            isPaid
                              ? 'bg-emerald-100 text-[#18A879] border border-emerald-300'
                              : isHoliday
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : isMissed
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                              : 'bg-slate-100 text-[#647C95] border border-slate-200'
                          }`}
                        >
                          {isPaid ? 'PAID' : isHoliday ? 'HOLIDAY' : isMissed ? 'MISSED' : isOverdue ? 'OVERDUE' : 'PENDING'}
                        </span>
                        {isPendingSync && (
                          <span className="ml-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full">
                            Syncing
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[#647C95] text-[11px] font-mono">
                        {inst.paidDate ? formatDate(inst.paidDate) : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {!isPaid && !isHoliday && (
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
                            className="w-8 h-8 rounded-xl border border-[#D5E9FA] bg-white hover:bg-[#EAF5FF] text-[#0878D1] flex items-center justify-center shrink-0 active:scale-95 transition"
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
          PENCIL MODAL: UNPAID (CUSTOM/ADVANCE) OR PAID (OWNER CORRECTION/REVERSE)
      ========================================================================= */}
      {pencilInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-[#D5E9FA] space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#D5E9FA]">
              <div className="flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-[#0878D1]" />
                <h4 className="font-black text-sm text-[#183653]">
                  {pencilInst.status === 'paid'
                    ? `Edit Paid Installment #${pencilInst.installmentNo}`
                    : `Record / Advance Installment #${pencilInst.installmentNo}`}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPencilInst(null)}
                className="w-8 h-8 rounded-full bg-[#F3F9FF] hover:bg-[#EAF5FF] text-[#647C95] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pencilError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {pencilError}
              </div>
            )}

            <form onSubmit={handleSavePencil} className="space-y-3">
              {/* Amount input */}
              <div>
                <label className="block text-xs font-black text-[#183653] mb-1">
                  Amount / தொகை (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pencilAmount || ''}
                  onChange={(e) => setPencilAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-black text-base outline-none focus:border-[#0878D1]"
                />
              </div>

              {/* Mode Toggle */}
              <div>
                <label className="block text-xs font-black text-[#183653] mb-1">
                  Payment Mode / முறை
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPencilMode('cash')}
                    className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 ${
                      pencilMode === 'cash'
                        ? 'bg-[#EAF5FF] border-[#0878D1] text-[#0878D1]'
                        : 'bg-white border-[#D5E9FA] text-[#647C95]'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPencilMode('upi')}
                    className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 ${
                      pencilMode === 'upi'
                        ? 'bg-[#EAF5FF] border-[#0878D1] text-[#0878D1]'
                        : 'bg-white border-[#D5E9FA] text-[#647C95]'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>UPI / GPay</span>
                  </button>
                </div>
              </div>

              {/* Paid Date */}
              <div>
                <label className="block text-xs font-black text-[#183653] mb-1">
                  Paid Date / தேதி
                </label>
                <input
                  type="date"
                  required
                  value={pencilDate}
                  onChange={(e) => setPencilDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-bold text-xs outline-none focus:border-[#0878D1]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-[#183653] mb-1">
                  Notes / குறிப்பு
                </label>
                <input
                  type="text"
                  placeholder="Optional notes or audit reason..."
                  value={pencilNotes}
                  onChange={(e) => setPencilNotes(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5E9FA] text-[#183653] font-medium text-xs outline-none focus:border-[#0878D1]"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center space-x-2">
                {pencilInst.status === 'paid' && isOwner && (
                  <button
                    type="button"
                    disabled={pencilSubmitting}
                    onClick={handleReversePaidInst}
                    className="flex-1 min-h-[42px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-black text-xs transition"
                  >
                    Reverse / ரத்து
                  </button>
                )}

                <button
                  type="submit"
                  disabled={pencilSubmitting}
                  className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#0878D1] hover:bg-[#064B8E] text-white font-black text-xs shadow-md shadow-[#0878D1]/25 transition"
                >
                  {pencilSubmitting ? 'Saving...' : 'Save Payment / சேமி'}
                </button>
              </div>
            </form>
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
