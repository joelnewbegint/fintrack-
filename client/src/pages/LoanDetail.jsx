import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatDate } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import { useDeviceMode } from '../context/DeviceModeContext';
import PaymentModal from '../components/common/PaymentModal';
import ReceiptModal from '../components/common/ReceiptModal';
import WhatsAppReminderModal from '../components/common/WhatsAppReminderModal';
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
} from 'lucide-react';

export const LoanDetail = ({ loanId, onBack }) => {
  const { t, lang } = useLanguage();
  const { isMobile } = useDeviceMode();
  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [payModalItem, setPayModalItem] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [whatsappItem, setWhatsappItem] = useState(null);

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      const res = await api.getLoanById(loanId);
      if (res.success) {
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

  const customer = loan.customerId || {};
  const recoveryPct =
    loan.totalPayable > 0
      ? Math.round((loan.totalCollected / loan.totalPayable) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 h-11 px-4 rounded-xl border border-sky-200/80 dark:border-sky-800/60 glass text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Loans</span>
        </button>

        <div className="flex items-center gap-2">
          {loan.remainingBalance > 0 && (
            <button
              onClick={() =>
                setPayModalItem({
                  loanId: loan._id,
                  loanNo: loan.loanNo,
                  customerName: customer.name,
                  installmentAmount: loan.installmentAmount,
                  dueAmount: loan.installmentAmount,
                })
              }
              className="btn-sky-primary flex items-center space-x-1.5 h-11 px-4 rounded-xl text-xs font-black shadow-lg shadow-sky-500/25 active:scale-95 transition"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={() =>
              setWhatsappItem({
                customerName: customer.name,
                customerPhone: customer.phone,
                dueAmount: loan.installmentAmount,
                loanNo: loan.loanNo,
                dueDate: new Date(),
              })
            }
            className="flex items-center space-x-1.5 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp Reminder</span>
          </button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {loan.loanNo}
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase ${
                  loan.financeType === 'daily'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : loan.financeType === 'weekly'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {loan.financeType} Scheme
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold capitalize ${
                  loan.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : loan.status === 'overdue'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                {loan.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Contract Period: {formatDate(loan.startDate)} to {formatDate(loan.endDate)} ({loan.duration} installments)
            </p>
          </div>

          {/* Customer mini card */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <p className="text-slate-400 font-semibold text-[10px] uppercase">Borrower / வாடிக்கையாளர்</p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{customer.name}</p>
            <p className="text-slate-500 font-mono">📱 +91 {customer.phone} • {customer.area}</p>
          </div>
        </div>

        {/* Financial Stat Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <p className="text-[11px] text-slate-500 font-medium">Principal (அசல்)</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {formatCurrency(loan.principal)}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <p className="text-[11px] text-slate-500 font-medium">Total Payable</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {formatCurrency(loan.totalPayable)}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Collected (வசூல்)
            </p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(loan.totalCollected)}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30">
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Remaining (மீதி இருப்பு)
            </p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(loan.remainingBalance)}
            </p>
          </div>
        </div>

        {/* Recovery Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-400">Repayment Progress</span>
            <span className="text-blue-600 dark:text-blue-400">{recoveryPct}% Recovered</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-blue-600 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${recoveryPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Repayment Schedule & Timeline Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Table (2 Cols on desktop) */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {t('repaymentSchedule')} / தவணை அட்டவணை
              </h3>
              <p className="text-xs text-slate-500">
                {loan.schedule?.length} scheduled installments
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Per Inst: {formatCurrency(loan.installmentAmount)}
            </span>
          </div>

          {isMobile ? (
            <div className="space-y-2.5">
              {loan.schedule?.map((inst) => {
                const isPaid = inst.status === 'paid';
                const isOverdue = inst.status === 'overdue';
                const isPartial = inst.status === 'partial';

                return (
                  <div
                    key={inst.installmentNo}
                    className={`glass rounded-2xl p-3.5 border border-white/80 dark:border-sky-800/40 shadow-sm space-y-2 ${
                      isOverdue
                        ? 'border-l-4 border-l-red-500'
                        : isPaid
                        ? 'border-l-4 border-l-emerald-500'
                        : 'border-l-4 border-l-sky-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Installment #{inst.installmentNo} • {formatDate(inst.dueDate)}
                      </p>
                      <p className="font-black tabular-nums text-sm text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(inst.amount)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 font-mono">
                        {isPaid && inst.paidDate ? `Paid on ${formatDate(inst.paidDate)}` : isPartial ? `Paid: ${formatCurrency(inst.paidAmount)}` : 'Pending'}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isOverdue
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {inst.status}
                      </span>
                    </div>

                    {!isPaid && (
                      <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40 flex justify-end">
                        <button
                          onClick={() =>
                            setPayModalItem({
                              loanId: loan._id,
                              loanNo: loan.loanNo,
                              customerName: customer.name,
                              installmentAmount: inst.amount,
                              dueAmount: inst.amount - (inst.paidAmount || 0),
                            })
                          }
                          className="btn-sky-primary min-h-[44px] px-4 py-2 text-xs font-black shadow-sm flex items-center space-x-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect {formatCurrency(inst.amount - (inst.paidAmount || 0))}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Paid</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Paid Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loan.schedule?.map((inst) => (
                    <tr
                      key={inst.installmentNo}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-2.5 px-3 font-bold">{inst.installmentNo}</td>
                      <td className="py-2.5 px-3">{formatDate(inst.dueDate)}</td>
                      <td className="py-2.5 px-3 font-semibold">{formatCurrency(inst.amount)}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">
                        {formatCurrency(inst.paidAmount || 0)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inst.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : inst.status === 'overdue'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 animate-pulse'
                              : inst.status === 'partial'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {inst.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {inst.paidDate ? formatDate(inst.paidDate) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {inst.status !== 'paid' && (
                          <button
                            onClick={() =>
                              setPayModalItem({
                                loanId: loan._id,
                                loanNo: loan.loanNo,
                                customerName: customer.name,
                                installmentAmount: inst.amount,
                                dueAmount: inst.amount - (inst.paidAmount || 0),
                              })
                            }
                            className="btn-sky-primary px-2.5 py-1 text-[10px] font-black active:scale-95 transition"
                          >
                            Collect
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment History Timeline (1 Col on desktop) */}
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Payment Timeline
            </h3>
          </div>

          {payments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No payments collected on this loan yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {payments.map((p) => (
                <div
                  key={p._id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {p.receiptNo}
                    </span>
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(p.amount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{formatDate(p.date)}</span>
                    <span className="uppercase font-bold text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700">
                      {p.mode}
                    </span>
                  </div>

                  <div className="pt-1 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/40 dark:border-slate-700/40">
                    <span>By: {p.collectedBy?.name || 'Owner'}</span>
                    <button
                      onClick={() => setReceiptPayment({ ...p, loanId: loan, customerId: customer })}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center space-x-0.5"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {payModalItem && (
        <PaymentModal
          loanItem={payModalItem}
          onClose={() => setPayModalItem(null)}
          onSuccess={(recordedPayment) => {
            fetchLoanData();
            setReceiptPayment(recordedPayment);
          }}
        />
      )}

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
    </div>
  );
};

export default LoanDetail;
