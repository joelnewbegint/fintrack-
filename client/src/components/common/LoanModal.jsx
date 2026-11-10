import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDateForInput } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { useLanguage } from '../../context/LanguageContext';
import { buildLoanAgreementPDF } from '../../utils/loanAgreementPdf';
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
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Printer,
  Download,
  Eye,
  CheckCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';

export const LoanModal = ({ customers = [], initialCustomerId = '', onClose, onSuccess }) => {
  const { isMobile } = useDeviceMode();
  const { lang } = useLanguage();
  const fileInputRef = useRef(null);

  // Workflow steps:
  // 1: Choose Borrower
  // 2: Loan Terms (+ Borrower Photo Upload)
  // 3: Review & Confirm
  // 4: Success Screen with PDF Actions
  const [step, setStep] = useState(1);

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

  // Borrower Photo State (Requirement 1)
  const [borrowerPhoto, setBorrowerPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [isPhotoCompressing, setIsPhotoCompressing] = useState(false);

  // Loan Terms State (Requirement 2)
  const [principal, setPrincipal] = useState(20000);
  const [interestPercent, setInterestPercent] = useState(10);
  const [chargeAmount, setChargeAmount] = useState(2000);
  const [interestType, setInterestType] = useState('deduction'); // 'deduction' (minus from principal) or 'addon'
  const [financeType, setFinanceType] = useState('daily');
  const [duration, setDuration] = useState(100);
  const [startDate, setStartDate] = useState(formatDateForInput());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Success & PDF Generation State (Requirement 3 & 4)
  const [createdLoan, setCreatedLoan] = useState(null);
  const [pdfResult, setPdfResult] = useState(null);
  const [downloadedSuccess, setDownloadedSuccess] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);

  // Two-way interactive calculation handlers
  const handlePrincipalChange = (val) => {
    setPrincipal(val);
    const p = val === '' ? 0 : Number(val);
    const pct = Number(interestPercent) || 0;
    setChargeAmount(Math.round((p * pct) / 100));
  };

  const handlePresetPrincipal = (p) => {
    setPrincipal(p);
    const pct = Number(interestPercent) || 0;
    setChargeAmount(Math.round((p * pct) / 100));
  };

  const handleChargeAmountChange = (val) => {
    setChargeAmount(val);
    const c = val === '' ? 0 : Number(val);
    const p = Number(principal) || 0;
    if (p > 0 && val !== '') {
      const pct = Number(((c / p) * 100).toFixed(2));
      setInterestPercent(pct);
    }
  };

  const handleInterestPercentChange = (val) => {
    setInterestPercent(val);
    const pct = val === '' ? 0 : Number(val);
    const p = Number(principal) || 0;
    if (val !== '') {
      setChargeAmount(Math.round((p * pct) / 100));
    }
  };

  // Synchronize customer list and fetch if empty
  useEffect(() => {
    if (customers && customers.length > 0) {
      setCustomerList(customers);
      if (!customerId && customers[0]?._id) {
        setCustomerId(customers[0]._id);
      }
    } else {
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

  const selectedCustomer = customerList.find((c) => c._id === customerId);
  const parsedCustomer = parseCustomerName(selectedCustomer?.name || 'Customer');

  // Prepopulate customer's existing photo if available
  useEffect(() => {
    if (selectedCustomer?.photoUrl && !borrowerPhoto) {
      setBorrowerPhoto(selectedCustomer.photoUrl);
    }
  }, [customerId, selectedCustomer]);

  // Sensible default durations per scheme
  useEffect(() => {
    if (financeType === 'daily') setDuration(100);
    else if (financeType === 'weekly') setDuration(15);
    else if (financeType === 'monthly') setDuration(10);
  }, [financeType]);

  // Live Calculations (Minus charge in principal for deduction mode)
  const principalNum = Number(principal) || 0;
  const interestNum = Number(interestPercent) || 0;
  const chargeAmountNum = Number(chargeAmount) || 0;
  const durationNum = Number(duration) || 1;

  // In-Hand Cash given to borrower (Minus from Principal in deduction mode)
  const inHandAmount = interestType === 'deduction'
    ? Math.max(0, principalNum - chargeAmountNum)
    : principalNum;

  // Total amount borrower repays
  const totalPayable = interestType === 'deduction'
    ? principalNum
    : principalNum + chargeAmountNum;

  // Installment Due Amount
  const installmentAmount = durationNum > 0 ? Math.ceil(totalPayable / durationNum) : 0;

  // Compute estimated End Date / Due Date
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

  const filteredCustomers = customerList.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.area?.toLowerCase().includes(q)
    );
  });

  // Photo Upload & Compression Handler
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');

    // Allowed types: JPG, JPEG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Invalid format. Please upload JPG, PNG, or WEBP / தவறான வடிவம்');
      return;
    }

    // Size limit: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setPhotoError('File size exceeds 5MB limit. Please choose a smaller image / அதிகபட்ச அளவு 5MB');
      return;
    }

    setIsPhotoCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Downscale to max 800px dimension for performance & crisp PDF embedding
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setBorrowerPhoto(compressedDataUrl);
        setIsPhotoCompressing(false);
      };
      img.onerror = () => {
        setPhotoError('Failed to process image');
        setIsPhotoCompressing(false);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file');
      setIsPhotoCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setBorrowerPhoto('');
    setPhotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
        photoUrl: borrowerPhoto || '',
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

  // Loan Creation and Automatic PDF Generation
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
        chargeAmount: chargeAmountNum,
        interestType,
        totalPayable,
        installmentAmount,
        financeType,
        duration: durationNum,
        startDate,
        notes,
        borrowerPhoto,
      });

      const savedLoan = res.loan || {
        _id: 'loan_' + Date.now(),
        loanNo: `LN-${(financeType[0] || 'D').toUpperCase()}26-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: selectedCustomer,
        principal: principalNum,
        chargeAmount: chargeAmountNum,
        interestPercent: interestNum,
        interestType,
        disbursedAmount: inHandAmount,
        totalPayable,
        installmentAmount,
        financeType,
        duration: durationNum,
        startDate,
        status: 'active',
        borrowerPhoto,
      };

      // Generate the official PDF application & agreement immediately (Requirement 3)
      const pdf = buildLoanAgreementPDF(savedLoan, selectedCustomer);
      setPdfResult(pdf);
      setCreatedLoan(savedLoan);

      // Advance to Success View (Requirement 4)
      setStep(4);

      if (onSuccess) {
        onSuccess(savedLoan);
      }
    } catch (err) {
      setError(err.message || 'Failed to create loan');
    } finally {
      setSubmitting(false);
    }
  };

  // Success Screen Action Handlers
  const handleDownloadPdf = () => {
    if (pdfResult) {
      pdfResult.download();
      setDownloadedSuccess(true);
      setTimeout(() => setDownloadedSuccess(false), 3000);
    }
  };

  const handlePreviewPdf = () => {
    if (pdfResult) {
      const url = pdfResult.getBlobUrl();
      setPreviewBlobUrl(url);
      setShowPdfPreviewModal(true);
    }
  };

  const handlePrintPdf = () => {
    if (pdfResult) {
      pdfResult.print();
    }
  };

  const handleReturnDashboard = () => {
    if (createdLoan && onSuccess) {
      onSuccess(createdLoan);
    }
    onClose();
  };

  const handleIssueAnother = () => {
    setStep(1);
    setCreatedLoan(null);
    setPdfResult(null);
    setBorrowerPhoto('');
    setNotes('');
    setPrincipal(20000);
    setInterestPercent(10);
    setChargeAmount(2000);
    setInterestType('deduction');
    setFinanceType('daily');
    setDuration(100);
  };

  return (
    <>
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
                    {step === 4
                      ? 'Loan Form PDF Generated'
                      : `Step ${step} of 3: ${
                          step === 1
                            ? 'Select Borrower'
                            : step === 2
                            ? 'Loan Terms & Photo'
                            : 'Review & Confirm'
                        }`}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={step === 4 ? handleReturnDashboard : onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator (Hidden on Success Screen) */}
          {step <= 3 && (
            <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
              {[
                { num: 1, title: 'Borrower', ta: 'வாடிக்கையாளர்' },
                { num: 2, title: 'Loan Terms', ta: 'விதிமுறைகள் & படம்' },
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
          )}

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
                        className="w-full pl-9 pr-4 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-sky-400 transition"
                      />
                    </div>

                    {/* Customer Cards List */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                          No borrowers found. Click "+ New Borrower" to add.
                        </div>
                      ) : (
                        filteredCustomers.map((c) => {
                          const isSelected = c._id === customerId;
                          const parsed = parseCustomerName(c.name);
                          const custPhoto = c.photoUrl || c.photo || '';
                          return (
                            <div
                              key={c._id}
                              onClick={() => {
                                setCustomerId(c._id);
                                if (custPhoto) setBorrowerPhoto(custPhoto);
                              }}
                              className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 shadow-sm ring-1 ring-sky-300'
                                  : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                {custPhoto ? (
                                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-sky-300 shrink-0">
                                    <img
                                      src={custPhoto}
                                      alt={c.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isSelected
                                        ? 'bg-sky-500 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {parsed.primary?.[0] || 'C'}
                                  </div>
                                )}
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
                STEP 2: LOAN TERMS & BORROWER PHOTO UPLOAD
            ======================================================== */}
            {step === 2 && (
              <div className="space-y-3.5">
                {/* Selected Customer Banner */}
                <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {borrowerPhoto ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-sky-400 shrink-0 shadow-xs">
                        <img
                          src={borrowerPhoto}
                          alt="Borrower"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {parsedCustomer.primary?.[0] || 'B'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[9.5px] text-slate-400 uppercase font-black block leading-none">
                        Selected Borrower
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {parsedCustomer.primary}
                        {parsedCustomer.secondary && ` (${parsedCustomer.secondary})`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>

                {/* ========================================================
                    REQUIREMENT 1: BORROWER PHOTO UPLOAD SECTION
                ======================================================== */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-sky-500" />
                        <span>Borrower Photo / கடனாளியின் புகைப்படம்</span>
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Upload from computer or mobile gallery (JPG, PNG, WEBP max 5MB)
                      </p>
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                      Optional
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {photoError && (
                    <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-[11px] font-bold">
                      {photoError}
                    </div>
                  )}

                  {borrowerPhoto ? (
                    <div className="flex items-center space-x-3.5 p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-sky-400 shadow-sm shrink-0 bg-slate-100 dark:bg-slate-800">
                        <img
                          src={borrowerPhoto}
                          alt="Borrower Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Photo Attached for Loan Form PDF</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          Will be printed on official agreement document
                        </p>
                        <div className="flex items-center space-x-2 mt-1.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Change Photo</span>
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="text-[11px] font-bold text-red-500 hover:underline flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group border-2 border-dashed border-sky-200 hover:border-sky-400 dark:border-slate-700 dark:hover:border-sky-500 rounded-2xl p-4 text-center cursor-pointer transition bg-sky-50/30 hover:bg-sky-50/70 dark:bg-slate-900/40 dark:hover:bg-slate-800/40"
                    >
                      <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950 flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400 mb-1.5 group-hover:scale-105 transition">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click or tap to Upload Borrower Photo
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        கடனாளியின் புகைப்படம் பதிவேற்றவும் (Gallery or Camera)
                      </p>
                      {isPhotoCompressing && (
                        <p className="text-[10px] text-sky-600 font-bold mt-1 animate-pulse">
                          Optimizing image for PDF...
                        </p>
                      )}
                    </div>
                  )}
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
                      onChange={(e) => handlePrincipalChange(e.target.value)}
                      className="w-full pl-9 pr-4 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                    />
                  </div>
                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {[10000, 20000, 30000, 50000, 100000].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePresetPrincipal(p)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition min-h-[32px] ${
                          Number(principal) === p
                            ? 'bg-sky-500 text-white border-sky-400'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        ₹{p >= 100000 ? `${p / 100000}L` : `${p / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Automatic Interest & Charge Calculation Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-sky-500" />
                      <span>Interest & Charges / வட்டி & கட்டணம்</span>
                    </span>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                      Auto Calculation
                    </span>
                  </div>

                  {/* Linked Inputs: Charge Amount (₹) and Interest Rate (%) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Charge Amount / கட்டணத் தொகை (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={chargeAmount}
                          onChange={(e) => handleChargeAmountChange(e.target.value)}
                          placeholder="2000"
                          className="w-full pl-7 pr-3 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-slate-900 dark:text-white"
                        />
                      </div>
                      <span className="text-[9.5px] text-slate-400 mt-0.5 block">
                        Direct charge in ₹
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Interest Rate / வட்டி விகிதம் (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          max="100"
                          value={interestPercent}
                          onChange={(e) => handleInterestPercentChange(e.target.value)}
                          placeholder="10"
                          className="w-full pl-3 pr-7 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-slate-900 dark:text-white"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400">%</span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 mt-0.5 block">
                        Auto-calculated rate
                      </span>
                    </div>
                  </div>

                  {/* Deduction Method Selector */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Deduction Method / கழிவு முறை:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInterestType('deduction')}
                        className={`p-2 rounded-xl text-left border transition text-xs ${
                          interestType === 'deduction'
                            ? 'bg-sky-500 text-white border-sky-400 shadow-sm ring-1 ring-sky-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <p className="font-black text-[11px] leading-tight">
                          ✓ Deduct from Principal
                        </p>
                        <p className="text-[9.5px] opacity-85 mt-0.5 leading-tight">
                          முன்பிடித்தம் (In-Hand: {formatCurrency(inHandAmount)})
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInterestType('addon')}
                        className={`p-2 rounded-xl text-left border transition text-xs ${
                          interestType === 'addon'
                            ? 'bg-sky-500 text-white border-sky-400 shadow-sm ring-1 ring-sky-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <p className="font-black text-[11px] leading-tight">
                          Add to Principal
                        </p>
                        <p className="text-[9.5px] opacity-85 mt-0.5 leading-tight">
                          கூடுதல் வட்டி (Total: {formatCurrency(principalNum + chargeAmountNum)})
                        </p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Duration and Start Date */}
                <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      Start Date / தொடங்கும் தேதி
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>

                {/* Automatic Due Date Banner */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/70 text-xs">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block leading-tight">
                        Automatic Due Date (கடன் முடிவுத் தேதி)
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Last Installment Due
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-sky-600 dark:text-sky-400 block">
                      {calculateEndDate()}
                    </span>
                    <span className="text-[9.5px] font-semibold text-slate-500">
                      {durationNum} {financeType === 'daily' ? 'days' : financeType === 'weekly' ? 'weeks' : 'months'}
                    </span>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/60 dark:from-sky-950/50 dark:to-indigo-950/50 border border-sky-200 dark:border-sky-800 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800/80 shadow-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-black">
                        Due Amount / தவணை
                      </span>
                      <p className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums">
                        {formatCurrency(installmentAmount)}{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          / {financeType === 'daily' ? 'day' : financeType === 'weekly' ? 'week' : 'month'}
                        </span>
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800/80 shadow-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-black">
                        Due Date / முடிவு தேதி
                      </span>
                      <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums mt-1 font-mono">
                        {calculateEndDate()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-sky-200/60 dark:border-sky-800/60 text-xs">
                    <div>
                      <span className="text-[10.5px] text-slate-600 dark:text-slate-400 font-bold block">
                        In-Hand Cash (கையில் வழங்குவது):
                      </span>
                      <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                        {formatCurrency(inHandAmount)}{' '}
                        {interestType === 'deduction' && chargeAmountNum > 0 && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({formatCurrency(principalNum)} - {formatCurrency(chargeAmountNum)})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10.5px] text-slate-600 dark:text-slate-400 font-bold block">
                        Total Repayable (மொத்த வசூல்):
                      </span>
                      <p className="font-black text-slate-900 dark:text-white text-sm tabular-nums">
                        {formatCurrency(totalPayable)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                STEP 3: REVIEW & CONFIRM (Requirement 2 & 3)
            ======================================================== */}
            {step === 3 && (
              <form id="loan-review-form" onSubmit={handleSubmit} className="space-y-3.5">
                {/* Borrower Information Card with Photo */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-3.5 shadow-xs">
                  {borrowerPhoto ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-sky-400 shrink-0 shadow-sm bg-slate-100">
                      <img
                        src={borrowerPhoto}
                        alt={parsedCustomer.primary}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                      {parsedCustomer.primary?.[0] || 'B'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                        {parsedCustomer.primary}
                      </p>
                      {parsedCustomer.secondary && (
                        <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold truncate">
                          ({parsedCustomer.secondary})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono mt-0.5">
                      <span>{selectedCustomer?.phone || 'No phone'}</span>
                      <span>•</span>
                      <span>{selectedCustomer?.area || 'Town'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      ID: {String(selectedCustomer?._id || 'N/A').slice(-8)} • {selectedCustomer?.address || 'Tamil Nadu'}
                    </p>
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/60 dark:to-indigo-950/60 border border-sky-200 dark:border-sky-800 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Repayment Scheme</span>
                      <p className="font-black text-slate-900 dark:text-white uppercase">{financeType}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Principal (அசல்)</span>
                      <p className="font-black text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(principalNum)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {interestType === 'deduction' ? 'Deducted Charge (பிடித்தம்)' : 'Interest Charge'} ({interestNum}%)
                      </span>
                      <p className={`font-black tabular-nums ${interestType === 'deduction' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {interestType === 'deduction' ? `- ${formatCurrency(chargeAmountNum)}` : `+ ${formatCurrency(chargeAmountNum)}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">In-Hand Cash (வழங்குவது)</span>
                      <p className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(inHandAmount)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Total Repayable (மொத்தம்)</span>
                      <p className="font-black text-slate-900 dark:text-white tabular-nums text-sm">
                        {formatCurrency(totalPayable)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Due Date (முடிவு தேதி)</span>
                      <p className="font-black text-sky-600 dark:text-sky-400 tabular-nums text-sm font-mono">
                        {calculateEndDate()}
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
                    Loan Start: <strong>{startDate}</strong> • Est. Completion: <strong className="text-slate-800 dark:text-slate-200">{calculateEndDate()}</strong>
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

            {/* ========================================================
                STEP 4: SUCCESS SCREEN (Requirement 4)
            ======================================================== */}
            {step === 4 && (
              <div className="py-2 space-y-3.5 animate-fade-in text-center">
                {/* Celebration Icon */}
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-50 dark:ring-emerald-900/30">
                  <CheckCircle className="w-10 h-10 stroke-[2.5]" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Loan Successfully Created!
                  </h3>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    கடன் வெற்றிகரமாக உருவாக்கப்பட்டது!
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Official loan application & agreement PDF is ready with borrower photo.
                  </p>
                </div>

                {/* Created Loan Summary Badge */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/70 dark:from-sky-950/50 dark:to-indigo-950/50 border border-sky-200 dark:border-sky-800 text-left space-y-2">
                  <div className="flex items-center justify-between border-b border-sky-200/60 dark:border-sky-800/60 pb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Official Loan ID
                    </span>
                    <span className="font-mono font-black text-sm text-sky-700 dark:text-sky-300">
                      {createdLoan?.loanNo}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Borrower</span>
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {parsedCustomer.primary}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Principal (அசல்)</span>
                      <p className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(principalNum)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Scheme</span>
                      <p className="font-bold text-sky-600 dark:text-sky-400 uppercase">
                        {financeType} ({durationNum} {financeType === 'daily' ? 'days' : financeType === 'weekly' ? 'weeks' : 'months'})
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Installment Due</span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(installmentAmount)} / {financeType === 'daily' ? 'day' : financeType === 'weekly' ? 'week' : 'month'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Action Buttons as specifically requested in Requirement 4 */}
                <div className="space-y-2 pt-1 text-left">
                  {/* Option 1: Download Loan Application PDF */}
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-xs shadow-md shadow-sky-500/25 active:scale-98 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <Download className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="leading-tight">1. Download Loan Application PDF</p>
                        <p className="text-[10px] text-sky-100 font-medium">
                          கடன் விண்ணப்பம் மற்றும் ஒப்பந்த PDF பதிவிறக்கம்
                        </p>
                      </div>
                    </div>
                    {downloadedSuccess ? (
                      <span className="text-[10px] bg-white text-sky-700 font-black px-2 py-0.5 rounded-full">
                        Saved ✓
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-sky-200" />
                    )}
                  </button>

                  {/* Option 2: Preview Loan Application PDF */}
                  <button
                    type="button"
                    onClick={handlePreviewPdf}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-xs shadow-xs active:scale-98 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="leading-tight">2. Preview Loan Application PDF</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          படிவத்தை முன்னோட்டமிட (View Document)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Option 3: Print Loan Application */}
                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-xs shadow-xs active:scale-98 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="leading-tight">3. Print Loan Application</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          உடனடி அச்சுப்பொறி அச்சு (Physical Copy)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Option 4: Return to Dashboard & Issue Another */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleIssueAnother}
                      className="p-2.5 rounded-xl border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 text-xs font-bold hover:bg-sky-50 dark:hover:bg-sky-950/40 text-center transition"
                    >
                      + Issue Another
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnDashboard}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black shadow-md text-center transition"
                    >
                      4. Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Sticky Footer Action Bar (Steps 1 to 3) */}
          {step <= 3 && (
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
                      <span className="flex items-center space-x-1.5">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Loan & PDF...</span>
                      </span>
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
          )}
        </div>
      </div>

      {/* Embedded PDF Preview Modal */}
      {showPdfPreviewModal && previewBlobUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Loan Application & Agreement PDF Preview
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1 hover:bg-slate-100"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfPreviewModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2">
              <iframe
                src={previewBlobUrl}
                title="Loan Form PDF Preview"
                className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoanModal;
