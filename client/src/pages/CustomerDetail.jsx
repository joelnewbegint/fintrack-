import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate } from '../utils/currency';
import LoanModal from '../components/common/LoanModal';
import ReceiptModal from '../components/common/ReceiptModal';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  Plus,
  Clock,
  Eye,
  CheckCircle,
  FileText,
  Printer,
} from 'lucide-react';

export const CustomerDetail = ({ customerId, onBack, onViewLoan }) => {
  const { t, lang } = useLanguage();
  const { isMobile } = useDeviceMode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomerById(customerId);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  if (loading && !data) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading customer ledger...</div>;
  }

  if (!data || !data.customer) {
    return (
      <div className="p-8 text-center text-xs text-red-500">
        Customer not found.
        <button onClick={onBack} className="block mx-auto mt-2 text-blue-600 font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const { customer, loans = [], payments = [] } = data;

  const totalLent = loans.reduce((acc, l) => acc + l.principal, 0);
  const totalRepaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const totalOutstanding = activeLoans.reduce((acc, l) => acc + l.remainingBalance, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        <button
          onClick={() => setShowAddLoan(true)}
          className="flex items-center space-x-2 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Loan</span>
        </button>
      </div>

      {/* Customer Profile Banner Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
              {customer.name[0]}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {customer.name}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center space-x-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  <span>+91 {customer.phone}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{customer.area}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-[10px]">
                  {customer.idProofType}: {customer.idProofNumber || 'Verified'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                {customer.address}
              </p>
            </div>
          </div>

          {/* Guarantor Details Pill */}
          {customer.guarantor?.name && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-amber-800 dark:text-amber-300">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Guarantor / ஜாமீன்தாரர்</span>
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {customer.guarantor.name} ({customer.guarantor.relationship})
              </p>
              <p className="font-mono text-slate-500 text-[11px]">
                📱 {customer.guarantor.phone || 'No phone recorded'}
              </p>
            </div>
          )}
        </div>

        {/* Aggregate Financial Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <p className="text-[11px] text-slate-500">Total Borrowed</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {formatCurrency(totalLent)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Total Repaid</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalRepaid)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30">
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Outstanding Balance</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30">
            <p className="text-[11px] text-blue-600 dark:text-blue-400">Total Loans</p>
            <p className="text-lg font-black text-blue-600 dark:text-blue-400">
              {loans.length} ({activeLoans.length} active)
            </p>
          </div>
        </div>
      </div>

      {/* Customer's Loans Ledger */}
      <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
          Loan History Ledger / கடன் வரலாறு
        </h3>

        {loans.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No loans registered yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loans.map((loan) => (
              <div
                key={loan._id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 p-3 rounded-2xl transition"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {loan.loanNo}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      {loan.financeType}
                    </span>
                    <span
                      className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full ${
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    Principal: {formatCurrency(loan.principal)} • Payable: {formatCurrency(loan.totalPayable)} • {formatDate(loan.startDate)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Balance</p>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(loan.remainingBalance)}
                    </p>
                  </div>

                  <button
                    onClick={() => onViewLoan && onViewLoan(loan._id)}
                    className="btn-sky-primary flex items-center space-x-1 py-1.5 px-3 text-xs font-bold shadow-sm active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Schedule</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer's Payments History */}
      <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
          All Payment Receipts / செலுத்திய ரசீதுகள் ({payments.length})
        </h3>

        {payments.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No payment receipts yet.</p>
        ) : isMobile ? (
          <div className="space-y-2.5">
            {payments.map((p) => (
              <div
                key={p._id}
                className="p-3.5 rounded-2xl glass border border-white/70 dark:border-sky-800/40 border-l-4 border-l-emerald-500 space-y-2 min-h-[64px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                      {p.receiptNo}
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {p.loanId?.loanNo || 'LOAN'} • {formatDate(p.date)}
                    </p>
                  </div>
                  <span className="font-black tabular-nums text-base text-emerald-600 dark:text-emerald-400 whitespace-nowrap flex-shrink-0">
                    {formatCurrency(p.amount)}
                  </span>
                </div>

                <div className="pt-2 border-t border-sky-100/60 dark:border-sky-900/40 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {p.mode}
                  </span>
                  <button
                    onClick={() => setReceiptPayment({ ...p, customerId: customer })}
                    className="btn-sky-primary min-h-[44px] py-1 px-3 text-xs font-bold shadow-sm flex items-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Receipt No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Loan Account</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Collected By</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {p.receiptNo}
                    </td>
                    <td className="py-2.5 px-3">{formatDate(p.date)}</td>
                    <td className="py-2.5 px-3 font-semibold">{p.loanId?.loanNo || '-'}</td>
                    <td className="py-2.5 px-3 uppercase font-bold text-[10px]">{p.mode}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{p.collectedBy?.name || 'Owner'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setReceiptPayment({ ...p, customerId: customer })}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Loan Modal */}
      {showAddLoan && (
        <LoanModal
          customers={[customer]}
          initialCustomerId={customer._id}
          onClose={() => setShowAddLoan(false)}
          onSuccess={() => fetchCustomerData()}
        />
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
};

export default CustomerDetail;
