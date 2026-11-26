import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  ArrowLeft,
  Wallet,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  MessageCircle,
  FileText,
  RotateCcw,
  Zap,
  Printer,
  Receipt,
  Share2,
  X,
  Trash2,
} from 'lucide-react';
import { openWhatsApp, generateEMIWhatsAppMessage } from '../../utils/emiWhatsapp';
import { generateEMIAgreementPdf } from '../../utils/emiAgreementPdf';

const formatInstNos = (p) => {
  if (Array.isArray(p?.installmentNos) && p.installmentNos.length > 0) {
    return p.installmentNos.join(', ');
  }
  return p?.installmentNo || 1;
};

export const EMIDetail = ({
  loanId,
  onBack,
  onOpenCollectModal,
}) => {
  const { user, isOwner } = useAuth();
  const { lang } = useLanguage();

  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Foreclosure quote state
  const [showForeclosureModal, setShowForeclosureModal] = useState(false);
  const [foreclosureQuote, setForeclosureQuote] = useState(null);
  const [settlementAmount, setSettlementAmount] = useState(0);
  const [settlementMode, setSettlementMode] = useState('cash');
  const [foreclosureLoading, setForeclosureLoading] = useState(false);

  // Reschedule installment state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedInstNo, setSelectedInstNo] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Reversal modal state
  const [reverseTargetPayment, setReverseTargetPayment] = useState(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);

  // Delete loan confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLoan, setDeletingLoan] = useState(false);

  // Receipt popup modal state
  const [selectedReceiptForPopup, setSelectedReceiptForPopup] = useState(null);

  const showNotice = useCallback((text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const notifyEmiUpdated = () => {
    window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
  };

  const handlePrintSlip = (p) => {
    const printWindow = window.open('', '_blank', 'width=350,height=550');
    if (!printWindow) return;
    const instLabel = formatInstNos(p);
    printWindow.document.write(`
      <html>
        <head>
          <title>EMI Receipt - ${p.receiptNo || 'VK'}</title>
          <style>
            body { font-family: monospace; padding: 15px; font-size: 12px; color: #111; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #444; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total { font-size: 15px; font-weight: bold; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">VK BANKER'S & FINANCE</div>
          <div class="center">Coimbatore, Tamil Nadu</div>
          <div class="center bold" style="font-size: 11px; margin-top: 3px;">MONTHLY EMI PAYMENT RECEIPT</div>
          <div class="divider"></div>
          <div class="row"><span>Receipt No:</span><span class="bold">${p.receiptNo || 'N/A'}</span></div>
          <div class="row"><span>Date:</span><span>${new Date(p.paymentDate || Date.now()).toLocaleString()}</span></div>
          <div class="row"><span>EMI No:</span><span class="bold">${loan?.emiNo || 'N/A'}</span></div>
          <div class="row"><span>Customer:</span><span class="bold">${loan?.customerName || 'N/A'}</span></div>
          <div class="row"><span>Phone:</span><span>${loan?.customerPhone || 'N/A'}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Installment:</span><span>#${instLabel}</span></div>
          <div class="row"><span>Payment Mode:</span><span class="bold" style="text-transform:uppercase;">${p.mode || 'cash'}</span></div>
          <div class="row total"><span>Amount Paid:</span><span>₹${Number(p.amount || 0).toLocaleString('en-IN')}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Collected By:</span><span>${p.collectedByName || user?.name || 'Authorized Staff'}</span></div>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 10px;">Thank you for your prompt payment!</div>
          <div class="center" style="font-size: 9px; color: #666;">VK Banker's Computer Generated Slip</div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareReceiptWhatsApp = (p) => {
    if (!loan?.customerPhone) {
      showNotice('Customer phone number not available', 'error');
      return;
    }
    const instLabel = formatInstNos(p);
    const msg = `🧾 *VK BANKER'S & FINANCE - EMI RECEIPT*
──────────────────────
• *Receipt No:* ${p.receiptNo || 'N/A'}
• *Loan No:* ${loan.emiNo}
• *Customer:* ${loan.customerName}
• *Installment:* #${instLabel}
• *Paid Amount:* ₹${Number(p.amount || 0).toLocaleString('en-IN')}
• *Mode:* ${(p.mode || 'cash').toUpperCase()}
• *Date:* ${new Date(p.paymentDate).toLocaleDateString()}
• *Remaining Balance:* ₹${Number(loan.remainingBalance || 0).toLocaleString('en-IN')}
──────────────────────
நன்றி! Thank you for your payment.
VK Banker's & Finance, Coimbatore`;
    openWhatsApp(loan.customerPhone, msg);
  };

  const fetchLoanData = useCallback(async () => {
    if (!loanId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.getEMILoanById(loanId);
      if (res.success) {
        setLoan(res.loan);
        setPayments(res.payments || []);
      } else {
        setError(res.message || 'Failed to load EMI loan details');
      }
    } catch (e) {
      setError(e.message || 'Failed to load EMI loan details');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    fetchLoanData();
    const handleRefresh = () => fetchLoanData();
    window.addEventListener('fintrack:emi-updated', handleRefresh);
    return () => window.removeEventListener('fintrack:emi-updated', handleRefresh);
  }, [fetchLoanData]);

  const handleOpenForeclosure = async () => {
    try {
      setForeclosureLoading(true);
      const res = await api.getForeclosureQuote(loanId);
      if (res.success) {
        setForeclosureQuote(res.quote);
        setSettlementAmount(res.quote.settlementAmount);
        setShowForeclosureModal(true);
      }
    } catch (e) {
      showNotice(e.message || 'Error getting foreclosure quote', 'error');
    } finally {
      setForeclosureLoading(false);
    }
  };

  const handleConfirmForeclosure = async () => {
    try {
      setForeclosureLoading(true);
      const res = await api.forecloseEMILoan(loanId, {
        settlementAmount,
        discountGiven: (foreclosureQuote?.totalRemainingBalance || 0) - settlementAmount,
        paymentMode: settlementMode,
      });
      if (res.success) {
        setShowForeclosureModal(false);
        notifyEmiUpdated();
        fetchLoanData();
        showNotice('Loan settled & foreclosed successfully.');
      }
    } catch (e) {
      showNotice(e.message || 'Foreclosure failed', 'error');
    } finally {
      setForeclosureLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!newDueDate) {
      showNotice('Please select a valid new due date', 'error');
      return;
    }
    try {
      setRescheduleLoading(true);
      const res = await api.rescheduleEMIInstallment(loanId, {
        installmentNo: selectedInstNo,
        newDueDate,
        reason: rescheduleReason,
      });
      if (res.success) {
        setShowRescheduleModal(false);
        notifyEmiUpdated();
        fetchLoanData();
        showNotice(`Installment #${selectedInstNo} due date updated.`);
      }
    } catch (e) {
      showNotice(e.message || 'Reschedule failed', 'error');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleConfirmReversePayment = async (e) => {
    e.preventDefault();
    if (!isOwner || !reverseTargetPayment) return;
    if (!reverseReason.trim()) {
      showNotice('Please enter a reason for reversal', 'error');
      return;
    }
    try {
      setReversing(true);
      const res = await api.reverseEMIPayment(reverseTargetPayment._id, reverseReason.trim());
      if (res.success) {
        setReverseTargetPayment(null);
        setReverseReason('');
        notifyEmiUpdated();
        fetchLoanData();
        showNotice(res.message || 'EMI payment reversed cleanly.');
      }
    } catch (err) {
      showNotice(err.message || 'Payment reversal failed', 'error');
    } finally {
      setReversing(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!isOwner || !loan?._id) return;
    try {
      setDeletingLoan(true);
      const res = await api.deleteEMILoan(loan._id);
      if (res.success) {
        setShowDeleteModal(false);
        notifyEmiUpdated();
        if (onBack) onBack();
      }
    } catch (err) {
      showNotice(err.message || 'Failed to delete EMI loan', 'error');
      setShowDeleteModal(false);
    } finally {
      setDeletingLoan(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-9 h-9 border-4 border-[#0878D1] border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
        <p className="text-xs font-bold text-[#647C95]">Loading EMI loan file...</p>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="glass-card rounded-[24px] p-8 text-center max-w-md mx-auto mt-10">
        <AlertTriangle className="w-9 h-9 text-rose-500 mx-auto mb-2" />
        <p className="text-rose-600 text-sm font-bold">{error || 'Loan record not found'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-5 py-2.5 bg-[#EAF5FF] hover:bg-[#D5E9FA] text-[#0878D1] rounded-xl text-xs font-bold transition"
        >
          ← Back to Portfolio
        </button>
      </div>
    );
  }

  const schedule = loan.schedule || [];
  const paidCount = schedule.filter((s) => s.status === 'paid').length;
  const totalCount = loan.tenureMonths || schedule.length || 12;
  const progressPercent = Math.min(100, Math.round((paidCount / totalCount) * 100));

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-[#EAF9F3] border-[#18A879]/30 text-[#127C5A]'
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/85 hover:bg-white border border-[#D5E9FA] text-[#183653] transition active:scale-95 shadow-sm"
            title="Back to EMI Accounts"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#0878D1]">{loan.emiNo}</span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  loan.status === 'completed' || loan.status === 'foreclosed'
                    ? 'bg-[#EAF9F3] text-[#127C5A] border border-[#18A879]/30'
                    : loan.status === 'overdue'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]'
                }`}
              >
                {loan.status}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#183653] tracking-tight">
              {loan.customerName}
            </h1>
          </div>
        </div>

        {/* Action Buttons: WhatsApp Notice, Agreement PDF, Foreclosure, Delete, Collect */}
        <div className="flex flex-wrap items-center gap-2">
          {loan.customerPhone && (
            <button
              onClick={() => {
                const nextInst = schedule.find((s) => s.status !== 'paid') || {};
                const msg = generateEMIWhatsAppMessage({
                  type: loan.status === 'overdue' ? 'overdue' : 'due_today',
                  customerName: loan.customerName,
                  emiNo: loan.emiNo,
                  installmentNo: nextInst.installmentNo || 1,
                  amount: loan.installmentAmount,
                  remainingBalance: loan.remainingBalance,
                  lang,
                });
                openWhatsApp(loan.customerPhone, msg);
              }}
              className="h-9 px-3.5 rounded-xl bg-[#EAF9F3] hover:bg-[#D5F2E6] border border-[#18A879]/30 text-[#127C5A] text-xs font-bold transition flex items-center space-x-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#18A879]" />
              <span>WhatsApp Reminder</span>
            </button>
          )}

          <button
            onClick={() => generateEMIAgreementPdf(loan, loan.customerId || {})}
            className="h-9 px-3.5 rounded-xl bg-white/85 hover:bg-white border border-[#D5E9FA] text-[#183653] text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-[#0878D1]" />
            <span>EMI Agreement PDF</span>
          </button>

          {isOwner && loan.status !== 'completed' && loan.status !== 'foreclosed' && (
            <button
              onClick={handleOpenForeclosure}
              disabled={foreclosureLoading}
              className="h-9 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>{foreclosureLoading ? 'Loading...' : 'Foreclosure Quote'}</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition flex items-center space-x-1"
              title="Delete EMI Account"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          {loan.status !== 'completed' && loan.status !== 'foreclosed' && (
            <button
              onClick={() => onOpenCollectModal && onOpenCollectModal({ loanId: loan._id, ...loan })}
              className="h-10 px-5 rounded-full font-bold text-xs text-white shadow-sm transition flex items-center space-x-1.5 active:scale-95 bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:brightness-105"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Collect ₹{Number(loan.installmentAmount || 0).toLocaleString('en-IN')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="glass-card rounded-[24px] p-6 border border-[#D5E9FA]/80 shadow-ocean space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-[#647C95] uppercase tracking-wider block">
              Outstanding Amount / மீதமுள்ள தொகை
            </span>
            <div className="text-3xl sm:text-4xl font-black text-[#183653] tracking-tight mt-0.5 tabular-nums">
              ₹{(loan.remainingBalance || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#647C95] font-medium mt-1">
              Total ₹{(loan.totalPayable || 0).toLocaleString('en-IN')} • {loan.tenureMonths} Months • {loan.interestRatePercent}% ({loan.interestCalculationType || 'reducing'}) interest
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-[#647C95]">Repayment Status</span>
            <div className="text-lg font-black text-[#183653] tabular-nums">
              {paidCount} of {totalCount} Installments Paid
            </div>
            <span className="text-[11px] text-[#647C95]">
              Collected ₹{(loan.totalCollected || 0).toLocaleString('en-IN')} so far
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 pt-2">
          <div className="w-full h-3 rounded-full bg-[#EAF5FF] border border-[#D5E9FA] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#0878D1] to-[#55B8F5]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-[#647C95]">
            <span>Started: {new Date(loan.startDate).toLocaleDateString()}</span>
            <span className="text-[#0878D1]">{progressPercent}% Complete</span>
            <span>Matures: {new Date(loan.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Installment Timeline & Receipts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-[24px] p-5 border border-[#D5E9FA]/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#183653]">
                  {lang === 'ta' ? 'தவணை காலவரிசை' : 'Installment Schedule Timeline'}
                </h3>
                <p className="text-xs text-[#647C95]">Step-by-step monthly breakdown and due status</p>
              </div>
              <span className="text-xs font-bold text-[#0878D1] bg-[#EAF5FF] px-3 py-1 rounded-full border border-[#D5E9FA]">
                Monthly Schedule
              </span>
            </div>

            {/* Timeline List */}
            <div className="space-y-2.5">
              {schedule.map((inst) => {
                const isPaid = inst.status === 'paid';
                const isOverdue = inst.status === 'overdue';
                const isRescheduled = inst.status === 'rescheduled';

                return (
                  <div
                    key={inst.installmentNo}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                      isPaid
                        ? 'bg-[#EAF9F3] border-[#18A879]/30'
                        : isOverdue
                        ? 'bg-rose-50/85 border-rose-200'
                        : 'bg-white/85 border-[#D5E9FA]/80 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isPaid
                            ? 'bg-[#18A879] text-white'
                            : isOverdue
                            ? 'bg-rose-600 text-white'
                            : 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]'
                        }`}
                      >
                        #{inst.installmentNo}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#183653] tabular-nums">
                            ₹{Number(inst.amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isPaid
                                ? 'bg-[#D5F2E6] text-[#127C5A]'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-700'
                                : isRescheduled
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#EAF5FF] text-[#0878D1]'
                            }`}
                          >
                            {isPaid ? 'Paid' : isOverdue ? 'Overdue' : isRescheduled ? 'Rescheduled' : 'Due'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647C95]">
                          Due: {new Date(inst.dueDate).toLocaleDateString()}
                          {inst.paidDate && ` • Paid on ${new Date(inst.paidDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!isPaid && (
                        <>
                          {isOwner && (
                            <button
                              onClick={() => {
                                setSelectedInstNo(inst.installmentNo);
                                setNewDueDate(new Date(inst.dueDate).toISOString().split('T')[0]);
                                setRescheduleReason('');
                                setShowRescheduleModal(true);
                              }}
                              className="text-[11px] font-bold text-[#647C95] hover:text-[#183653] px-2.5 py-1.5 rounded-lg border border-[#D5E9FA] bg-white transition"
                              title="Reschedule installment date"
                            >
                              Postpone
                            </button>
                          )}

                          <button
                            onClick={() =>
                              onOpenCollectModal &&
                              onOpenCollectModal({
                                loanId: loan._id,
                                installmentNo: inst.installmentNo,
                                amount: inst.amount,
                                ...loan,
                              })
                            }
                            className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold shadow-sm transition active:scale-95 bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:brightness-105"
                          >
                            Collect
                          </button>
                        </>
                      )}

                      {isPaid && inst.receiptNo && (
                        <span className="text-[11px] font-mono text-[#127C5A] bg-[#D5F2E6] px-2.5 py-0.5 rounded-lg border border-[#18A879]/30 font-bold">
                          {inst.receiptNo}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Receipts History Table with Owner Reversal */}
          <div className="glass-card rounded-[24px] p-5 border border-[#D5E9FA]/80">
            <h3 className="text-sm font-bold text-[#183653] mb-3">
              Payment Receipts / வசூல் ரசீதுகள் ({payments.length})
            </h3>

            {payments.length === 0 ? (
              <p className="text-xs text-[#647C95] py-5 text-center">No payment receipts recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {payments.map((p) => {
                  const isReversed = p.status === 'reversed';
                  return (
                    <div
                      key={p._id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl border ${
                        isReversed
                          ? 'bg-slate-100/80 border-slate-300 opacity-70'
                          : 'bg-white/90 border-[#D5E9FA]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className={`font-mono font-bold text-xs text-[#183653] ${isReversed ? 'line-through' : ''}`}>
                            {p.receiptNo}
                          </span>
                          <span className="text-[10px] font-bold text-[#0878D1] bg-[#EAF5FF] px-2 py-0.5 rounded border border-[#D5E9FA]">
                            #{formatInstNos(p)}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#647C95] bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.mode || 'cash'}
                          </span>
                          {isReversed && (
                            <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                              Reversed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#647C95] mt-0.5">
                          {new Date(p.paymentDate).toLocaleDateString()} • Collected by: {p.collectedByName || 'Staff'}
                          {isReversed && p.reversalReason ? ` • Reason: ${p.reversalReason}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-black text-[#183653] tabular-nums mr-1 ${isReversed ? 'line-through' : ''}`}>
                          ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                        </span>

                        {/* View Receipt Popup */}
                        <button
                          onClick={() => setSelectedReceiptForPopup(p)}
                          className="p-1.5 rounded-lg bg-[#EAF5FF] hover:bg-[#D5E9FA] border border-[#D5E9FA] text-[#0878D1] transition"
                          title="View Receipt Popup"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp Share Receipt */}
                        <button
                          onClick={() => handleShareReceiptWhatsApp(p)}
                          className="p-1.5 rounded-lg bg-[#EAF9F3] hover:bg-[#D5F2E6] border border-[#18A879]/30 text-[#127C5A] transition"
                          title="Share Receipt on WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Thermal Slip */}
                        <button
                          onClick={() => handlePrintSlip(p)}
                          className="p-1.5 rounded-lg bg-white hover:bg-[#F3F9FF] border border-[#D5E9FA] text-[#183653] transition"
                          title="Print Thermal Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Owner-only Payment Reversal */}
                        {isOwner && !isReversed && (
                          <button
                            onClick={() => {
                              setReverseTargetPayment(p);
                              setReverseReason('');
                            }}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-100 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 flex items-center space-x-1 transition"
                            title="Reverse this payment entry"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Particulars */}
        <div className="space-y-5">
          <div className="glass-card rounded-[24px] p-5 border border-[#D5E9FA]/80 space-y-3">
            <h3 className="text-xs font-bold text-[#183653] uppercase tracking-wider">
              Customer Information / விவரம்
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#D5E9FA]/60">
                <span className="text-[#647C95]">Name:</span>
                <span className="font-bold text-[#183653]">{loan.customerName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D5E9FA]/60">
                <span className="text-[#647C95]">Phone:</span>
                <span className="font-bold text-[#183653]">{loan.customerPhone || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D5E9FA]/60">
                <span className="text-[#647C95]">Area:</span>
                <span className="font-bold text-[#183653]">{loan.customerArea || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D5E9FA]/60">
                <span className="text-[#647C95]">Agent:</span>
                <span className="font-bold text-[#183653]">{loan.assignedAgentName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D5E9FA]/60">
                <span className="text-[#647C95]">Principal:</span>
                <span className="font-bold text-[#183653] tabular-nums">
                  ₹{(loan.principal || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D5E9FA]/60">
                <span className="text-[#647C95]">Interest Calculation:</span>
                <span className="font-bold text-[#0878D1] uppercase">{loan.interestCalculationType || 'reducing'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#647C95]">Doc Charges:</span>
                <span className="font-bold text-[#183653] tabular-nums">
                  ₹{(loan.documentationCharges || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Foreclosure Quote Modal */}
      {showForeclosureModal && foreclosureQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#064B8E]/40 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-[#D5E9FA] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF5FF] pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[#0878D1]" />
                <h3 className="font-bold text-[#183653] text-sm">Early Closure / Foreclosure Quote</h3>
              </div>
              <button
                onClick={() => setShowForeclosureModal(false)}
                className="w-7 h-7 rounded-lg text-[#647C95] hover:text-[#183653] hover:bg-[#EAF5FF] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-[#F3F9FF] p-4 rounded-2xl border border-[#D5E9FA]">
              <div className="flex justify-between text-[#647C95]">
                <span>Total Book Balance:</span>
                <span className="font-bold text-[#183653]">
                  ₹{foreclosureQuote.totalRemainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#647C95]">
                <span>Unearned Interest:</span>
                <span className="text-[#127C5A] font-semibold">
                  ₹{foreclosureQuote.unearnedInterest.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#647C95]">
                <span>Rebate / Discount:</span>
                <span className="text-[#127C5A] font-bold">
                  - ₹{foreclosureQuote.recommendedDiscount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-[#D5E9FA] text-[#064B8E]">
                <span>Net Settlement Quote:</span>
                <span>₹{foreclosureQuote.settlementAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">Settlement Amount (₹)</label>
              <input
                type="number"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-[#F3F9FF]/60 text-xs font-bold text-[#183653] outline-none focus:border-[#0878D1]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">Settlement Payment Mode</label>
              <select
                value={settlementMode}
                onChange={(e) => setSettlementMode(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-[#F3F9FF]/60 text-xs font-bold text-[#183653] outline-none focus:border-[#0878D1]"
              >
                <option value="cash">Cash / ரொக்கம்</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cheque">Bank Transfer / Cheque</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowForeclosureModal(false)}
                className="flex-1 h-10 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] text-xs font-bold text-[#647C95]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmForeclosure}
                disabled={foreclosureLoading}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:brightness-105 text-xs font-bold text-white shadow-sm disabled:opacity-60"
              >
                {foreclosureLoading ? 'Processing...' : 'Confirm Early Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Installment Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#064B8E]/40 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-[#D5E9FA] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF5FF] pb-3">
              <h3 className="font-bold text-[#183653] text-sm flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#0878D1]" />
                <span>Reschedule Installment #{selectedInstNo}</span>
              </h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="w-7 h-7 rounded-lg text-[#647C95] hover:text-[#183653] hover:bg-[#EAF5FF] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                New Due Date / புதிய தவணை தேதி
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-[#F3F9FF]/60 text-xs font-bold text-[#183653] outline-none focus:border-[#0878D1]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">Reason / காரணம்</label>
              <input
                type="text"
                placeholder="e.g. Festival postponement"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-[#F3F9FF]/60 text-xs text-[#183653] outline-none focus:border-[#0878D1]"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 h-10 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] text-xs font-bold text-[#647C95]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={rescheduleLoading}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:brightness-105 text-xs font-bold text-white shadow-sm disabled:opacity-60"
              >
                {rescheduleLoading ? 'Saving...' : 'Save Date'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Reverse Payment Modal */}
      {reverseTargetPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#064B8E]/40 backdrop-blur-sm">
          <form
            onSubmit={handleConfirmReversePayment}
            className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-[#D5E9FA] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#EAF5FF] pb-3">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-[#183653] text-sm">Reverse EMI Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setReverseTargetPayment(null)}
                className="w-7 h-7 rounded-lg text-[#647C95] hover:text-[#183653] hover:bg-[#EAF5FF] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold">Receipt: {reverseTargetPayment.receiptNo}</p>
              <p>
                Reversing ₹{Number(reverseTargetPayment.amount || 0).toLocaleString('en-IN')} will restore the unpaid installment(s) and remaining balance.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Reversal Reason / ரத்து காரணம் *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wrong entry / bounced cheque"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-[#F3F9FF]/60 text-xs text-[#183653] outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setReverseTargetPayment(null)}
                className="flex-1 h-10 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] text-xs font-bold text-[#647C95]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reversing}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm disabled:opacity-60"
              >
                {reversing ? 'Reversing...' : 'Confirm Reverse'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Owner Delete EMI Loan Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#064B8E]/40 backdrop-blur-sm">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-[#D5E9FA] space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-black text-[#183653] text-base">Delete EMI Account?</h3>
            </div>
            <p className="text-xs text-[#647C95] leading-relaxed">
              This will permanently remove <span className="font-bold text-[#183653]">{loan.emiNo}</span> ({loan.customerName}) and its associated EMI receipts & audit logs. This cannot be undone.
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-10 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] text-xs font-bold text-[#647C95]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLoan}
                disabled={deletingLoan}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm disabled:opacity-60"
              >
                {deletingLoan ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Details Popup Modal */}
      {selectedReceiptForPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#064B8E]/40 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-3xl p-6 border border-[#D5E9FA] bg-white/95 shadow-2xl space-y-4"
            style={{
              boxShadow: '0 20px 40px -10px rgba(8, 120, 209, 0.22)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF5FF]">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5FF] text-[#0878D1] flex items-center justify-center font-bold border border-[#D5E9FA]">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#183653] leading-tight">Payment Receipt</h4>
                  <p className="text-[10px] text-[#647C95] font-mono">
                    {selectedReceiptForPopup.receiptNo || 'RCP-EMI'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceiptForPopup(null)}
                className="w-7 h-7 rounded-lg text-[#647C95] hover:text-[#183653] hover:bg-[#EAF5FF] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 rounded-2xl bg-[#F3F9FF] border border-[#D5E9FA] space-y-2 text-xs">
              <div className="flex justify-between text-[#647C95]">
                <span>Customer:</span>
                <span className="font-bold text-[#183653]">{loan.customerName}</span>
              </div>
              <div className="flex justify-between text-[#647C95]">
                <span>Loan Account:</span>
                <span className="font-mono font-bold text-[#0878D1]">{loan.emiNo}</span>
              </div>
              <div className="flex justify-between text-[#647C95]">
                <span>Installment:</span>
                <span className="font-semibold text-[#183653]">#{formatInstNos(selectedReceiptForPopup)}</span>
              </div>
              <div className="flex justify-between text-[#647C95]">
                <span>Payment Mode:</span>
                <span className="font-bold uppercase text-[#183653]">
                  {selectedReceiptForPopup.mode || 'cash'}
                </span>
              </div>
              <div className="flex justify-between text-[#647C95]">
                <span>Collected On:</span>
                <span className="font-medium text-[#183653]">
                  {new Date(selectedReceiptForPopup.paymentDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-[#647C95]">
                <span>Collector:</span>
                <span className="font-semibold text-[#183653]">
                  {selectedReceiptForPopup.collectedByName || 'Authorized Staff'}
                </span>
              </div>
              <div className="pt-2 border-t border-[#D5E9FA] flex justify-between items-baseline">
                <span className="font-bold text-[#183653]">Paid Amount:</span>
                <span className="text-lg font-black text-[#18A879] tabular-nums">
                  ₹{Number(selectedReceiptForPopup.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Action Buttons: WhatsApp Share & Thermal Print */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleShareReceiptWhatsApp(selectedReceiptForPopup)}
                className="w-full h-10 rounded-xl bg-[#18A879] hover:bg-[#149067] text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Receipt on WhatsApp</span>
              </button>

              <button
                onClick={() => handlePrintSlip(selectedReceiptForPopup)}
                className="w-full h-10 rounded-xl bg-white hover:bg-[#F3F9FF] border border-[#D5E9FA] text-[#183653] text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4 text-[#0878D1]" />
                <span>Print Thermal Receipt Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMIDetail;
