import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDateForInput } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import {
  X,
  PlusCircle,
  Calculator,
  User,
  Banknote,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
} from 'lucide-react';

export const LoanModal = ({ customers = [], initialCustomerId = '', onClose, onSuccess }) => {
  const { isMobile } = useDeviceMode();
  const [step, setStep] = useState(1); // 1: Customer, 2: Terms, 3: Review & Confirm

  const [customerId, setCustomerId] = useState(initialCustomerId || (customers[0]?._id || ''));
  const [customerSearch, setCustomerSearch] = useState('');
  const [principal, setPrincipal] = useState(20000);
  const [interestPercent, setInterestPercent] = useState(10);
  const [financeType, setFinanceType] = useState('daily');
  const [duration, setDuration] = useState(100);
  const [startDate, setStartDate] = useState(formatDateForInput());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // When financeType changes, default sensible durations for Tamil Nadu finance
  useEffect(() => {
    if (financeType === 'daily') setDuration(100);
    else if (financeType === 'weekly') setDuration(15);
    else if (financeType === 'monthly') setDuration(10);
  }, [financeType]);

  // Live Calculations
  const principalNum = Number(principal) || 0;
  const interestNum = Number(interestPercent) || 0;
  const durationNum = Number(duration) || 1;

  const totalInterest = Math.round((principalNum * interestNum) / 100);
  const totalPayable = principalNum + totalInterest;
  const installmentAmount = Math.ceil(totalPayable / durationNum);

  // Compute estimated End Date
  const calculateEndDate = () => {
    const d = new Date(startDate);
    if (financeType === 'daily') d.setDate(d.getDate() + durationNum);
    else if (financeType === 'weekly') d.setDate(d.getDate() + durationNum * 7);
    else if (financeType === 'monthly') d.setMonth(d.getMonth() + durationNum);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const selectedCustomer = customers.find((c) => c._id === customerId);
  const parsedCustomer = parseCustomerName(selectedCustomer?.name);

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.area?.toLowerCase().includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Please select a customer first');
      setStep(1);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createLoan({
        customerId,
        principal: principalNum,
        interestPercent: interestNum,
        financeType,
        duration: durationNum,
        startDate,
        notes,
      });

      if (onSuccess) {
        onSuccess(res.loan);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create loan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isMobile ? 'flex-col justify-end' : 'items-center justify-center p-4'
      } bg-slate-900/70 backdrop-blur-sm animate-fade-in`}
    >
      <div
        className={`glass ${
          isMobile
            ? 'rounded-t-3xl max-w-[430px] w-full max-h-[92vh] flex flex-col p-4 pb-safe'
            : 'rounded-3xl max-w-lg w-full p-6 max-h-[92vh]'
        } shadow-2xl border border-white/80 dark:border-sky-800/60 overflow-y-auto`}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-sky-800/80 mx-auto mb-2 shrink-0" />
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-sky-100 dark:border-sky-900/60 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-sky-500 shrink-0" />
              <span>Issue New Loan / புதிய கடன்</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Step {step} of 3: {step === 1 ? 'Select Borrower' : step === 2 ? 'Loan Terms' : 'Review & Confirm'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-950/60 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center space-x-2 py-3 shrink-0">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                s <= step
                  ? 'bg-gradient-to-r from-sky-400 to-sky-600'
                  : 'bg-slate-200 dark:bg-sky-950'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold shrink-0">
            {error}
          </div>
        )}

        {/* ========================================================
            STEP 1: SELECT BORROWER
        ======================================================== */}
        {step === 1 && (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                Choose Customer / கடன் பெறுபவர்
              </label>

              {/* Search customer */}
              <input
                type="text"
                placeholder="Search borrower by name, phone, area..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-base font-medium outline-none focus:ring-2 focus:ring-sky-400"
              />

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredCustomers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 glass rounded-2xl">
                    No customers found.
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const parsed = parseCustomerName(c.name);
                    const isSelected = c._id === customerId;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setCustomerId(c._id)}
                        className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between min-h-[52px] transition ${
                          isSelected
                            ? 'bg-sky-100/80 dark:bg-sky-950 border-sky-400 shadow-sm ring-1 ring-sky-300'
                            : 'glass border-sky-100 dark:border-sky-900/40 hover:bg-sky-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {parsed.primary}
                          </p>
                          {parsed.secondary && (
                            <p className="text-[10px] text-slate-500 truncate leading-none">
                              {parsed.secondary}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400 font-mono">
                            {c.phone} • {c.area}
                          </p>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-sky-600 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sticky Step 1 Action */}
            <div className="sticky bottom-0 pt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-sky-100 dark:border-sky-900/60 shrink-0">
              <button
                type="button"
                disabled={!customerId}
                onClick={() => setStep(2)}
                className="w-full btn-sky-primary min-h-[48px] py-3 text-sm font-black shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <span>Continue to Loan Terms</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: LOAN TERMS & SCHEME
        ======================================================== */}
        {step === 2 && (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Selected Customer banner */}
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Borrower</span>
                  <p className="font-bold text-slate-900 dark:text-white">{parsedCustomer.primary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-sky-600 hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Finance Type Selection (3 options) */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  Repayment Scheme / கடன் திட்டம்
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'daily', label: 'Daily / தண்டல்' },
                    { id: 'weekly', label: 'Weekly / வாரம்' },
                    { id: 'monthly', label: 'Monthly / மாதம்' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFinanceType(item.id)}
                      className={`min-h-[48px] p-2 rounded-2xl text-xs font-black border transition ${
                        financeType === item.id
                          ? 'bg-sky-500 text-white border-sky-400 shadow-md ring-1 ring-sky-300'
                          : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Principal Amount (₹) with Quick Chips */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  Principal Amount / கடன் தொகை (₹)
                </label>
                <div className="relative mb-2">
                  <span className="absolute left-3.5 top-3 text-lg font-black text-sky-500">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1000"
                    step="500"
                    required
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value))}
                    className="w-full pl-9 pr-4 h-12 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-base font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                  />
                </div>
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[10000, 20000, 30000, 50000, 100000].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrincipal(p)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition min-h-[36px] ${
                        principal === p
                          ? 'bg-sky-500 text-white border-sky-400'
                          : 'glass text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      ₹{p >= 100000 ? `${p / 100000}L` : `${p / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interest % and Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    Interest % / வட்டி விகிதம்
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="50"
                    required
                    value={interestPercent}
                    onChange={(e) => setInterestPercent(Number(e.target.value))}
                    className="w-full h-12 px-4 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-base font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    Duration ({financeType === 'daily' ? 'Days' : financeType === 'weekly' ? 'Weeks' : 'Months'})
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-12 px-4 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-base font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="sticky bottom-0 pt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-sky-100 dark:border-sky-900/60 flex space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 min-h-[48px] py-3 rounded-2xl glass border border-sky-200 text-xs font-black flex items-center justify-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-[2] btn-sky-primary min-h-[48px] py-3 text-sm font-black shadow-md flex items-center justify-center space-x-1"
              >
                <span>Review Calculation</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: REVIEW & CONFIRM
        ======================================================== */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Calculation Summary Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/60 dark:to-indigo-950/60 border border-sky-200 dark:border-sky-800 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-sky-200/60 dark:border-sky-800/60">
                  <span className="text-xs font-bold text-slate-500">Borrower:</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {parsedCustomer.primary}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Scheme</span>
                    <p className="font-black text-slate-900 dark:text-white uppercase">{financeType}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Principal</span>
                    <p className="font-black text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(principalNum)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Interest ({interestNum}%)</span>
                    <p className="font-black text-emerald-600 tabular-nums">
                      + {formatCurrency(totalInterest)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Total Payable</span>
                    <p className="font-black text-slate-900 dark:text-white tabular-nums text-sm">
                      {formatCurrency(totalPayable)}
                    </p>
                  </div>
                </div>

                {/* Big Installment Highlight */}
                <div className="p-3 rounded-2xl bg-white/80 dark:bg-sky-900/60 border border-sky-300 dark:border-sky-700 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-sky-700 dark:text-sky-300 uppercase font-black">
                      Per Installment (தவணை தொகை)
                    </p>
                    <p className="text-xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
                      {formatCurrency(installmentAmount)}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    x {durationNum} {financeType === 'daily' ? 'days' : financeType === 'weekly' ? 'weeks' : 'months'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  Est. End Date: <strong className="text-slate-800 dark:text-slate-200">{calculateEndDate()}</strong>
                </p>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  Start Date / கடன் தொடங்கும் தேதி
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  Notes / குறிப்பு (விருப்பத்தேர்வு)
                </label>
                <input
                  type="text"
                  placeholder="Guarantor notes, business purpose, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-base outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="sticky bottom-0 pt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-sky-100 dark:border-sky-900/60 flex space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 min-h-[48px] py-3 rounded-2xl glass border border-sky-200 text-xs font-black flex items-center justify-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] btn-sky-primary min-h-[48px] py-3 text-sm font-black shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98"
              >
                {submitting ? (
                  <span>Creating Loan...</span>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Confirm & Issue Loan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoanModal;
