import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDateForInput } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  PlusCircle,
  Calculator,
  User,
  UserPlus,
  Banknote,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Search,
  Sparkles,
  MapPin,
  Phone,
  ArrowRight,
} from 'lucide-react';

export const LoanModal = ({ customers = [], initialCustomerId = '', onClose, onSuccess }) => {
  const { isMobile } = useDeviceMode();
  const { lang } = useLanguage();
  const [step, setStep] = useState(1); // 1: Customer, 2: Terms, 3: Review & Confirm

  const [customerList, setCustomerList] = useState(customers);
  const [customerId, setCustomerId] = useState(initialCustomerId || (customers[0]?._id || ''));
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Quick Add Borrower Inline Form State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustArea, setNewCustArea] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');

  // Loan Terms State
  const [principal, setPrincipal] = useState(20000);
  const [interestPercent, setInterestPercent] = useState(10);
  const [financeType, setFinanceType] = useState('daily');
  const [duration, setDuration] = useState(100);
  const [startDate, setStartDate] = useState(formatDateForInput());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Synchronize customer list and fetch if empty
  useEffect(() => {
    if (customers && customers.length > 0) {
      setCustomerList(customers);
      if (!customerId && customers[0]?._id) {
        setCustomerId(customers[0]._id);
      }
    } else {
      // Auto-fetch customers from API if prop was empty
      api.getCustomers()
        .then((res) => {
          if (res?.success && Array.isArray(res.customers)) {
            setCustomerList(res.customers);
            if (res.customers.length > 0 && !customerId) {
              setCustomerId(res.customers[0]._id);
            }
          }
        })
        .catch(() => {});
    }
  }, [customers]);

  // Sensible default durations
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
    try {
      const d = new Date(startDate);
      if (isNaN(d.getTime())) return '—';
      if (financeType === 'daily') d.setDate(d.getDate() + durationNum);
      else if (financeType === 'weekly') d.setDate(d.getDate() + durationNum * 7);
      else if (financeType === 'monthly') d.setMonth(d.getMonth() + durationNum);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const selectedCustomer = customerList.find((c) => c._id === customerId);
  const parsedCustomer = parseCustomerName(selectedCustomer?.name || 'Customer');

  const filteredCustomers = customerList.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.area?.toLowerCase().includes(q)
    );
  });

  // Handle Quick Add Customer inline
  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    setQuickAddError('');

    if (!newCustName.trim() || !newCustPhone.trim()) {
      setQuickAddError('Name and phone are required');
      return;
    }

    try {
      setAddingCustomer(true);
      const res = await api.createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        area: newCustArea.trim() || 'Town',
        address: newCustAddress.trim() || 'Tamil Nadu',
      });

      if (res?.success && res.customer) {
        const created = res.customer;
        setCustomerList((prev) => [created, ...prev]);
        setCustomerId(created._id);
        setShowQuickAdd(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustArea('');
        setNewCustAddress('');
      } else {
        setQuickAddError('Failed to create customer');
      }
    } catch (err) {
      setQuickAddError(err.message || 'Error creating borrower');
    } finally {
      setAddingCustomer(false);
    }
  };

  // Add Kalam sample borrower for instant demo
  const handleAddSampleBorrower = async () => {
    try {
      setAddingCustomer(true);
      const res = await api.createCustomer({
        name: 'Dr. A.P.J. Abdul Kalam / டாக்டர் ஏ.பி.ஜே. அப்துல் கலாம்',
        phone: '9443110150',
        area: 'Rameswaram / ராமேஸ்வரம்',
        address: 'House of Kalam, Mosque Street, Rameswaram, Tamil Nadu - 623526',
      });
      if (res?.success && res.customer) {
        setCustomerList((prev) => [res.customer, ...prev]);
        setCustomerId(res.customer._id);
        setShowQuickAdd(false);
      }
    } catch (err) {
      setQuickAddError(err.message || 'Failed to add sample borrower');
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Please select or register a borrower first');
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
        isMobile ? 'flex-col justify-end' : 'items-center justify-center p-3 sm:p-4'
      } bg-slate-900/75 backdrop-blur-md animate-fade-in`}
    >
      <div
        className={`bg-white dark:bg-slate-900 ${
          isMobile
            ? 'rounded-t-3xl max-w-[430px] w-full max-h-[92vh] flex flex-col p-4 pb-safe'
            : 'rounded-3xl max-w-lg w-full p-6 max-h-[90vh] flex flex-col'
        } shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden`}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2 shrink-0" />
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Issue New Loan</span>
                  <span className="text-xs text-sky-600 dark:text-sky-400 font-bold">
                    புதிய கடன்
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Step {step} of 3: {step === 1 ? 'Select Borrower' : step === 2 ? 'Loan Terms' : 'Review & Confirm'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Modern Stepper Indicator */}
        <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          {[
            { num: 1, title: 'Borrower', ta: 'வாடிக்கையாளர்' },
            { num: 2, title: 'Loan Terms', ta: 'விதிமுறைகள்' },
            { num: 3, title: 'Confirm', ta: 'உறுதிசெய்க' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (s.num < step || (s.num === 2 && customerId)) setStep(s.num);
              }}
              className={`flex items-center space-x-1.5 p-1.5 rounded-xl text-left cursor-pointer transition ${
                s.num === step
                  ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold'
                  : s.num < step
                  ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 opacity-60'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  s.num < step
                    ? 'bg-emerald-500 text-white'
                    : s.num === step
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {s.num < step ? '✓' : s.num}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[10.5px] font-bold truncate">{s.title}</p>
                <p className="text-[9px] text-slate-400 truncate">{s.ta}</p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold shrink-0">
            {error}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5">
          {/* ========================================================
              STEP 1: SELECT BORROWER
          ======================================================== */}
          {step === 1 && (
            <div className="space-y-3.5">
              {/* Header Row: Label & Quick Add Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Choose Borrower / கடன் பெறுபவர்
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showQuickAdd ? 'Back to list' : '+ New Borrower'}</span>
                </button>
              </div>

              {/* Quick Add Inline Form */}
              {showQuickAdd ? (
                <form
                  onSubmit={handleQuickAddCustomer}
                  className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 space-y-3 animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-sky-600" />
                      <span>Quick Register New Borrower / புதிய வாடிக்கையாளர்</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSampleBorrower}
                      disabled={addingCustomer}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 font-bold hover:bg-amber-200 flex items-center gap-1"
                      title="Add Dr. APJ Abdul Kalam as sample"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Dr. Kalam Sample</span>
                    </button>
                  </div>

                  {quickAddError && (
                    <div className="p-2 rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                      {quickAddError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name / பெயர் *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. S. Murugesan"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mobile No / கைபேசி *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 98401 23456"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Area / பகுதி
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Gandhipuram"
                        value={newCustArea}
                        onChange={(e) => setNewCustArea(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Present Address / முகவரி
                      </label>
                      <input
                        type="text"
                        placeholder="Street, City, Pincode"
                        value={newCustAddress}
                        onChange={(e) => setNewCustAddress(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingCustomer}
                      className="btn-sky-primary px-4 py-1.5 rounded-xl text-xs font-black shadow-sm"
                    >
                      {addingCustomer ? 'Saving...' : 'Save & Select Borrower'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search borrower by name, phone, area..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-sky-400 transition"
                    />
                  </div>

                  {/* Customer List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                        <User className="w-8 h-8 text-slate-400 mx-auto" />
                        <div>
                          <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                            No customers found / வாடிக்கையாளர்கள் இல்லை
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Register a new borrower now to issue this loan.
                          </p>
                        </div>
                        <div className="flex justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowQuickAdd(true)}
                            className="btn-sky-primary px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm inline-flex items-center space-x-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Register Borrower</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddSampleBorrower}
                            disabled={addingCustomer}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-700 dark:text-amber-300 text-xs font-bold inline-flex items-center space-x-1"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Dr. Kalam Sample</span>
                          </button>
                        </div>
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
                                ? 'bg-sky-50/90 dark:bg-sky-950/80 border-sky-400 ring-1 ring-sky-400 shadow-sm'
                                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-sky-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {parsed.primary?.[0] || 'C'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {parsed.primary}
                                </p>
                                {parsed.secondary && (
                                  <p className="text-[10px] text-slate-500 truncate leading-none">
                                    {parsed.secondary}
                                  </p>
                                )}
                                <div className="flex items-center space-x-2 text-[10.5px] text-slate-400 font-mono mt-0.5">
                                  <span>{c.phone}</span>
                                  {c.area && <span>• {c.area}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 ml-2">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========================================================
              STEP 2: LOAN TERMS & SCHEME
          ======================================================== */}
          {step === 2 && (
            <div className="space-y-3.5">
              {/* Selected Customer banner */}
              <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-xs">
                    {parsedCustomer.primary?.[0] || 'B'}
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-400 uppercase font-black">
                      Selected Borrower
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white leading-tight">
                      {parsedCustomer.primary}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Finance Type Selection */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                  Repayment Scheme / கடன் திட்டம்
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'daily', label: 'Daily Thandal', sub: 'தினசரி' },
                    { id: 'weekly', label: 'Weekly', sub: 'வாரத்தவணை' },
                    { id: 'monthly', label: 'Monthly', sub: 'மாதத்தவணை' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFinanceType(item.id)}
                      className={`p-2.5 rounded-2xl text-center border transition min-h-[50px] ${
                        financeType === item.id
                          ? 'bg-sky-500 text-white border-sky-400 shadow-md ring-2 ring-sky-300'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-xs font-black">{item.label}</p>
                      <p className="text-[10px] opacity-80">{item.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Principal Amount (₹) with Quick Chips */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                  Principal Amount / கடன் தொகை (₹)
                </label>
                <div className="relative mb-2">
                  <span className="absolute left-3.5 top-2.5 text-lg font-black text-sky-500">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1000"
                    step="500"
                    required
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value))}
                    className="w-full pl-9 pr-4 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                  />
                </div>
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[10000, 20000, 30000, 50000, 100000].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrincipal(p)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition min-h-[32px] ${
                        principal === p
                          ? 'bg-sky-500 text-white border-sky-400'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
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
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                    Interest % / வட்டி விகிதம்
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="50"
                    required
                    value={interestPercent}
                    onChange={(e) => setInterestPercent(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                    Duration ({financeType === 'daily' ? 'Days' : financeType === 'weekly' ? 'Weeks' : 'Months'})
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                  Start Date / கடன் தொடங்கும் தேதி
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Live Preview Card */}
              <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Estimated Due</span>
                  <p className="text-base font-black text-sky-600 dark:text-sky-400">
                    {formatCurrency(installmentAmount)}{' '}
                    <span className="text-[10px] font-normal text-slate-500">
                      / {financeType === 'daily' ? 'day' : financeType === 'weekly' ? 'week' : 'month'}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Total Payable</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(totalPayable)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: REVIEW & CONFIRM
          ======================================================== */}
          {step === 3 && (
            <form id="loan-review-form" onSubmit={handleSubmit} className="space-y-3.5">
              {/* Calculation Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/60 dark:to-indigo-950/60 border border-sky-200 dark:border-sky-800 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-sky-200/60 dark:border-sky-800/60">
                  <span className="text-xs font-bold text-slate-500">Borrower / வாடிக்கையாளர்:</span>
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
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-[10px] text-sky-700 dark:text-sky-300 uppercase font-black">
                      Installment Due (தவணைத் தொகை)
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
                  Est. Completion Date: <strong className="text-slate-800 dark:text-slate-200">{calculateEndDate()}</strong>
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                  Notes / குறிப்பு (விருப்பத்தேர்வு)
                </label>
                <input
                  type="text"
                  placeholder="Guarantor notes, business purpose, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </form>
          )}
        </div>

        {/* Modal Sticky Footer Action Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 shrink-0">
          {step === 1 && (
            <button
              type="button"
              disabled={!customerId}
              onClick={() => setStep(2)}
              className="w-full btn-sky-primary min-h-[46px] py-2.5 text-xs font-black shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-40 transition active:scale-98"
            >
              <span>Continue to Loan Terms</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 min-h-[46px] py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-[2] btn-sky-primary min-h-[46px] py-2.5 text-xs font-black shadow-md flex items-center justify-center space-x-1 active:scale-98"
              >
                <span>Review Calculation</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 min-h-[46px] py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                form="loan-review-form"
                disabled={submitting}
                className="flex-[2] btn-sky-primary min-h-[46px] py-2.5 text-xs font-black shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98"
              >
                {submitting ? (
                  <span>Creating Loan...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm & Issue Loan</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanModal;
