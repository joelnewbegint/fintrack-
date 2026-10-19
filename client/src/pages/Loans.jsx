import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency, formatDate } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import LoanModal from '../components/common/LoanModal';
import PaymentModal from '../components/common/PaymentModal';
import ReceiptModal from '../components/common/ReceiptModal';
import WhatsAppReminderModal from '../components/common/WhatsAppReminderModal';
import {
  Plus,
  Search,
  Filter,
  Eye,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Send,
} from 'lucide-react';

export const Loans = ({ initialType = 'all', onViewLoan }) => {
  const { t, lang } = useLanguage();
  const { isOwner } = useAuth();
  const { isMobile, isTablet, isLaptop } = useDeviceMode();

  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [payLoanItem, setPayLoanItem] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [whatsappItem, setWhatsappItem] = useState(null);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await api.getLoans({
        financeType: typeFilter,
        status: statusFilter,
        search,
      });
      if (res.success) {
        setLoans(res.loans);
      }
    } catch (err) {
      console.error('Failed to fetch loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.getCustomers();
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [typeFilter, statusFilter, search]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header & New Loan Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('loans')} / கடன் கணக்குகள்
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'ta'
              ? 'தினசரி, வார மற்றும் மாதத் தவணைக் கடன்களின் முழு விவரம்'
              : 'Complete portfolio ledger for daily thandal, weekly, and monthly installment loans'}
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-sky-primary min-h-[44px] py-2.5 px-4 text-xs font-black shadow-lg shadow-sky-500/25 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('newLoan')} (N)</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass rounded-2xl p-4 border border-white/70 dark:border-sky-800/40 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-sky-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search loan #, customer, phone... (/ to focus)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Scheme Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="all">All Schemes / அனைத்து திட்டம்</option>
            <option value="daily">Daily Thandal (தினசரி)</option>
            <option value="weekly">Weekly (வாரத்தவணை)</option>
            <option value="monthly">Monthly (மாதத்தவணை)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="all">All Status / அனைத்து நிலை</option>
            <option value="active">Active (நடப்பில் உள்ளது)</option>
            <option value="overdue">Overdue (தவணை தவறியது)</option>
            <option value="completed">Completed (முடிவுற்றது)</option>
          </select>
        </div>
      </div>

      {/* Mobile Mode: Responsive Card List (No horizontal scroll, >= 48px touch targets) */}
      {isMobile ? (
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading loans...</div>
          ) : loans.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl">
              No loans match your filter.
            </div>
          ) : (
            loans.map((loan) => {
              const cust = loan.customerId || {};
              const parsed = parseCustomerName(cust.name);
              const recoveryPct =
                loan.totalPayable > 0
                  ? Math.round((loan.totalCollected / loan.totalPayable) * 100)
                  : 0;
              const isOverdue = loan.status === 'overdue';
              const isCompleted = loan.status === 'completed';

              return (
                <div
                  key={loan._id}
                  className={`glass rounded-2xl p-4 border border-white/80 dark:border-sky-800/40 shadow-sm min-h-[64px] space-y-3 ${
                    isOverdue
                      ? 'border-l-4 border-l-red-500'
                      : isCompleted
                      ? 'border-l-4 border-l-emerald-500'
                      : 'border-l-4 border-l-sky-500'
                  }`}
                >
                  {/* Line 1: Customer Name left, Installment Amount right (never truncated) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {parsed.primary}
                      </p>
                      {parsed.secondary && (
                        <p className="text-[11px] text-slate-400 truncate leading-none">
                          {parsed.secondary}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right whitespace-nowrap font-black tabular-nums text-base text-slate-900 dark:text-white">
                      {formatCurrency(loan.installmentAmount)}
                      <span className="block text-[10px] text-slate-400 font-normal">/ installment</span>
                    </div>
                  </div>

                  {/* Line 2: Loan # • Scheme • Area left, Status badge right */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate min-w-0 flex-1">
                      {loan.loanNo} • {loan.financeType} • {cust.area || cust.phone}
                    </p>
                    <span
                      className={`flex-shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isOverdue
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-sky-100 text-sky-800 border border-sky-300'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>

                  {/* Line 3: Recovery Progress + Remaining Balance */}
                  <div className="space-y-1 pt-1 border-t border-sky-100 dark:border-sky-900/40">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Recovery ({recoveryPct}%)
                      </span>
                      <span className="font-bold tabular-nums text-xs whitespace-nowrap">
                        Pending: <strong className="text-amber-600">{formatCurrency(loan.remainingBalance)}</strong>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-sky-950/60 rounded-full h-2 overflow-hidden">
                      <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${recoveryPct}%` }} />
                    </div>
                  </div>

                  {/* Mobile Direct Action Buttons (48px Touch Targets) */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {loan.remainingBalance > 0 ? (
                      <button
                        onClick={() =>
                          setPayLoanItem({
                            loanId: loan._id,
                            loanNo: loan.loanNo,
                            customerName: cust.name,
                            installmentAmount: loan.installmentAmount,
                            dueAmount: loan.installmentAmount,
                          })
                        }
                        className="btn-sky-primary min-h-[48px] py-2 text-xs font-black shadow-sm flex items-center justify-center space-x-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>
                    ) : (
                      <div className="min-h-[48px] flex items-center justify-center text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl">
                        Settled
                      </div>
                    )}

                    <button
                      onClick={() =>
                        setWhatsappItem({
                          customerName: cust.name,
                          customerPhone: cust.phone,
                          loanNo: loan.loanNo,
                          dueAmount: loan.installmentAmount,
                          dueDate: loan.endDate,
                        })
                      }
                      className="btn-sky-secondary min-h-[48px] py-2 text-xs font-bold flex items-center justify-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reminder</span>
                    </button>

                    <button
                      onClick={() => onViewLoan && onViewLoan(loan._id)}
                      className="glass min-h-[48px] py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-sky-50 flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-500" />
                      <span>Ledger</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Tablet & Laptop Mode: Full Glass Data Table */
        <div className="glass rounded-3xl overflow-hidden border border-white/70 dark:border-sky-800/40 shadow-lg">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading loans data...</div>
          ) : loans.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No loans match your current search and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sky-100 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/40 text-[11px] font-black uppercase text-sky-800 dark:text-sky-300 tracking-wider">
                    <th className="py-3 px-4">Loan Details</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Scheme</th>
                    <th className="py-3 px-4">Principal</th>
                    <th className="py-3 px-4">Installment</th>
                    <th className="py-3 px-4">Collected / Remaining</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/60 dark:divide-sky-900/30 text-xs">
                  {loans.map((loan) => {
                    const cust = loan.customerId || {};
                    const recoveryPct =
                      loan.totalPayable > 0
                        ? Math.round((loan.totalCollected / loan.totalPayable) * 100)
                        : 0;

                    return (
                      <tr
                        key={loan._id}
                        className="hover:bg-sky-50/60 dark:hover:bg-sky-950/30 transition"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {loan.loanNo}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate(loan.startDate)} to {formatDate(loan.endDate)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {cust.name || 'Unknown'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {cust.phone} {cust.area ? `• ${cust.area}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                              loan.financeType === 'daily'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : loan.financeType === 'weekly'
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : 'bg-teal-100 text-teal-900 border-teal-300'
                            }`}
                          >
                            {loan.financeType} ({loan.duration})
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(loan.principal)}
                          <span className="text-[10px] text-slate-400 font-normal block">
                            +{loan.interestPercent}% int
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(loan.installmentAmount)}
                        </td>

                        <td className="py-3.5 px-4 min-w-[150px]">
                          <div className="flex justify-between text-[11px] font-semibold mb-1">
                            <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatCurrency(loan.totalCollected)}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                              {formatCurrency(loan.remainingBalance)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-sky-950/60 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-sky-500 h-1.5 rounded-full"
                              style={{ width: `${recoveryPct}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                              loan.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : loan.status === 'overdue'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 animate-pulse'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {loan.remainingBalance > 0 && (
                              <button
                                onClick={() =>
                                  setPayLoanItem({
                                    loanId: loan._id,
                                    loanNo: loan.loanNo,
                                    customerName: cust.name,
                                    installmentAmount: loan.installmentAmount,
                                    dueAmount: loan.installmentAmount,
                                  })
                                }
                                className="btn-sky-primary py-1.5 px-3 text-xs font-bold shadow-sm"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                <span>Pay</span>
                              </button>
                            )}

                            <button
                              onClick={() =>
                                setWhatsappItem({
                                  customerName: cust.name,
                                  customerPhone: cust.phone,
                                  loanNo: loan.loanNo,
                                  dueAmount: loan.installmentAmount,
                                  dueDate: loan.endDate,
                                })
                              }
                              className="p-1.5 rounded-xl glass hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition"
                              title="Send WhatsApp Reminder"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-500" />
                            </button>

                            <button
                              onClick={() => onViewLoan && onViewLoan(loan._id)}
                              className="p-1.5 rounded-xl glass hover:bg-sky-50 text-slate-600 dark:text-slate-300 transition"
                              title="View Ledger / தவணை விவரம்"
                            >
                              <Eye className="w-4 h-4 text-sky-500" />
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
      )}

      {/* Add Loan Modal */}
      {showAddModal && (
        <LoanModal
          customers={customers}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchLoans();
          }}
        />
      )}

      {/* Payment Recording Modal */}
      {payLoanItem && (
        <PaymentModal
          loanItem={payLoanItem}
          onClose={() => setPayLoanItem(null)}
          onSuccess={(recordedPayment) => {
            fetchLoans();
            setReceiptPayment(recordedPayment);
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {/* WhatsApp Pre-filled Reminder Modal */}
      {whatsappItem && (
        <WhatsAppReminderModal
          item={whatsappItem}
          onClose={() => setWhatsappItem(null)}
        />
      )}
    </div>
  );
};

export default Loans;
