import React, { useState, useEffect } from 'react';
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
  Phone,
  MessageCircle,
  FileText,
  RotateCcw,
  Zap,
  Printer,
  ChevronRight,
  Shield,
  CreditCard,
} from 'lucide-react';
import { openWhatsApp, generateEMIWhatsAppMessage } from '../../utils/emiWhatsapp';
import { generateEMIAgreementPdf } from '../../utils/emiAgreementPdf';

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

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      const res = await api.getEMILoanById(loanId);
      if (res.success) {
        setLoan(res.loan);
        setPayments(res.payments || []);
      }
    } catch (e) {
      setError(e.message || 'Failed to load EMI loan details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loanId) fetchLoanData();
  }, [loanId]);

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
      alert(e.message || 'Error getting foreclosure quote');
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
        fetchLoanData();
      }
    } catch (e) {
      alert(e.message || 'Foreclosure failed');
    } finally {
      setForeclosureLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!newDueDate) return alert('Please select a valid new due date');
    try {
      const res = await api.rescheduleEMIInstallment(loanId, {
        installmentNo: selectedInstNo,
        newDueDate,
        reason: rescheduleReason,
      });
      if (res.success) {
        setShowRescheduleModal(false);
        fetchLoanData();
      }
    } catch (e) {
      alert(e.message || 'Reschedule failed');
    }
  };

  const handleReversePayment = async (paymentId) => {
    if (!isOwner) return;
    const reason = window.prompt('Owner Authorization: Enter reason for reversing this EMI receipt:');
    if (!reason) return;

    try {
      const res = await api.reverseEMIPayment(paymentId, reason);
      if (res.success) {
        alert(res.message);
        fetchLoanData();
      }
    } catch (e) {
      alert(e.message || 'Payment reversal failed');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Loading loan file...</p>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 text-sm font-bold">{error || 'Loan record not found'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold">
          ← Back to Portfolio
        </button>
      </div>
    );
  }

  const schedule = loan.schedule || [];
  const paidCount = schedule.filter(s => s.status === 'paid').length;
  const totalCount = loan.tenureMonths || schedule.length || 12;
  const progressPercent = Math.min(100, Math.round((paidCount / totalCount) * 100));

  return (
    <div
      className="space-y-6 pb-12 -mx-2 sm:-mx-4 lg:-mx-6 px-3 sm:px-6 py-4 rounded-3xl"
      style={{
        background: 'linear-gradient(180deg, #FFF8F5 0%, #FFF3EC 60%, #F8FAFD 100%)',
      }}
    >
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-700 transition active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-orange-600">{loan.emiNo}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                loan.status === 'completed' || loan.status === 'foreclosed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : loan.status === 'overdue'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-sky-100 text-sky-800'
              }`}>
                {loan.status?.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {loan.customerName}
            </h1>
          </div>
        </div>

        {/* Action Buttons: PDF Agreement, WhatsApp Notice, Settle */}
        <div className="flex flex-wrap items-center gap-2">
          {loan.customerPhone && (
            <button
              onClick={() => {
                const nextInst = schedule.find(s => s.status !== 'paid') || {};
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
              className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Reminder</span>
            </button>
          )}

          <button
            onClick={() => generateEMIAgreementPdf(loan, loan.customerId || {})}
            className="h-9 px-3 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>EMI Agreement PDF</span>
          </button>

          {isOwner && loan.status !== 'completed' && loan.status !== 'foreclosed' && (
            <button
              onClick={handleOpenForeclosure}
              className="h-9 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Foreclosure Quote</span>
            </button>
          )}

          {loan.status !== 'completed' && loan.status !== 'foreclosed' && (
            <button
              onClick={() => onOpenCollectModal && onOpenCollectModal({ loanId: loan._id, ...loan })}
              className="h-9 px-4 rounded-xl font-bold text-xs text-white shadow transition flex items-center space-x-1.5 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              }}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Collect ₹{Number(loan.installmentAmount).toLocaleString('en-IN')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Overview Card: Outstanding Balance, Tenure Line, Progress Bar */}
      <div
        className="rounded-3xl p-6 border space-y-4"
        style={{
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(18px)',
          borderColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 12px 30px -8px rgba(249, 115, 22, 0.12)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Outstanding Amount / மீதமுள்ள தொகை
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-0.5">
              ₹{(loan.remainingBalance || 0).toLocaleString('en-IN')}
            </div>
            {/* Required user line: "total, months, interest % reducing" */}
            <p className="text-xs text-slate-600 font-medium mt-1">
              Total ₹{(loan.totalPayable || 0).toLocaleString('en-IN')} • {loan.tenureMonths} Months • {loan.interestRatePercent}% ({loan.interestCalculationType || 'reducing'}) interest
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-slate-500">Repayment Status</span>
            <div className="text-lg font-black text-slate-800">
              {paidCount} of {totalCount} Installments Paid
            </div>
            <span className="text-[11px] text-slate-500">
              Collected ₹{(loan.totalCollected || 0).toLocaleString('en-IN')} so far
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 pt-2">
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: loan.status === 'completed'
                  ? '#10B981'
                  : 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)',
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-slate-500">
            <span>Started: {new Date(loan.startDate).toLocaleDateString()}</span>
            <span>{progressPercent}% Complete</span>
            <span>Matures: {new Date(loan.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns: Installment Timeline & Customer Details + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Installment Timeline (#1 Paid, #2 Due today, etc.) */}
        <div className="lg:col-span-2 space-y-4">
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'ta' ? 'தவணை காலவரிசை' : 'Installment Schedule Timeline'}
                </h3>
                <p className="text-xs text-slate-500">Step-by-step monthly breakdown and due status</p>
              </div>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
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
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                      isPaid
                        ? 'bg-emerald-50/50 border-emerald-200/60'
                        : isOverdue
                        ? 'bg-rose-50/60 border-rose-200/80'
                        : 'bg-white/80 border-slate-200/70 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isPaid
                            ? 'bg-emerald-500 text-white'
                            : isOverdue
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        #{inst.installmentNo}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-900">
                            ₹{Number(inst.amount).toLocaleString('en-IN')}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : isRescheduled
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {inst.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
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
                                setShowRescheduleModal(true);
                              }}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg border border-slate-200 bg-white"
                              title="Reschedule installment date"
                            >
                              Postpone
                            </button>
                          )}

                          <button
                            onClick={() => onOpenCollectModal && onOpenCollectModal({
                              loanId: loan._id,
                              installmentNo: inst.installmentNo,
                              amount: inst.amount,
                              ...loan,
                            })}
                            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition active:scale-95"
                          >
                            Collect
                          </button>
                        </>
                      )}

                      {isPaid && inst.receiptNo && (
                        <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-200">
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
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              Payment Receipts / வசூல் ரசீதுகள் ({payments.length})
            </h3>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No payment receipts recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p._id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      p.status === 'reversed'
                        ? 'bg-slate-100 border-slate-300 opacity-60 line-through'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{p.receiptNo}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.mode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {new Date(p.paymentDate).toLocaleDateString()} • Collected by: {p.collectedByName || 'Staff'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-black text-slate-900">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </span>

                      {/* Owner-only Payment Reversal */}
                      {isOwner && p.status !== 'reversed' && (
                        <button
                          onClick={() => handleReversePayment(p._id)}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded bg-rose-50 border border-rose-200"
                          title="Reverse this payment entry"
                        >
                          Reverse
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Particulars & Guarantor */}
        <div className="space-y-5">
          <div
            className="rounded-2xl p-5 border space-y-3"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Customer Information / விவரம்
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-800">{loan.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Phone:</span>
                <span className="font-bold text-slate-800">{loan.customerPhone || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Area:</span>
                <span className="font-bold text-slate-800">{loan.customerArea || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Agent:</span>
                <span className="font-bold text-slate-800">{loan.assignedAgentName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Principal:</span>
                <span className="font-bold text-slate-800">₹{(loan.principal || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Interest Calculation:</span>
                <span className="font-bold text-slate-800 uppercase">{loan.interestCalculationType || 'reducing'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Doc Charges:</span>
                <span className="font-bold text-slate-800">₹{(loan.documentationCharges || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Foreclosure Quote Modal */}
      {showForeclosureModal && foreclosureQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-800 text-sm">Early Closure / Foreclosure Quote</h3>
              </div>
              <button onClick={() => setShowForeclosureModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-2 text-xs bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200">
              <div className="flex justify-between">
                <span>Total Book Balance:</span>
                <span className="font-bold">₹{foreclosureQuote.totalRemainingBalance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Unearned Interest:</span>
                <span className="text-emerald-700">₹{foreclosureQuote.unearnedInterest.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Rebate / Discount:</span>
                <span className="text-emerald-700 font-bold">- ₹{foreclosureQuote.recommendedDiscount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-amber-200 text-amber-900">
                <span>Net Settlement Quote:</span>
                <span>₹{foreclosureQuote.settlementAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Settlement Payment Mode</label>
              <select
                value={settlementMode}
                onChange={(e) => setSettlementMode(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="cash">Cash / ரொக்கம்</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cheque">Bank Transfer / Cheque</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowForeclosureModal(false)}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmForeclosure}
                disabled={foreclosureLoading}
                className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow"
              >
                {foreclosureLoading ? 'Processing...' : 'Confirm Early Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Installment Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Reschedule Installment #{selectedInstNo}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Due Date / புதிய தவணை தேதி</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason / காரணம்</label>
              <input
                type="text"
                placeholder="e.g. Festival postponement"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 h-10 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                className="flex-1 h-10 rounded-xl bg-orange-500 text-xs font-bold text-white shadow"
              >
                Save Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMIDetail;

