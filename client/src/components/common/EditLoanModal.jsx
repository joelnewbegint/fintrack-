import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDateForInput } from '../../utils/currency';
import { parseCustomerName } from '../../utils/customerName';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { useLanguage } from '../../context/LanguageContext';
import { buildLoanAgreementPDF } from '../../utils/loanAgreementPdf';
import {
  X,
  Pencil,
  Calculator,
  User,
  Calendar,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Check,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
  Clock,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';

export const EditLoanModal = ({
  isOpen = true,
  loan,
  customer = null,
  onClose,
  onSuccess,
}) => {
  if (!loan) return null;

  const { isMobile } = useDeviceMode();
  const { lang } = useLanguage();
  const fileInputRef = useRef(null);

  // Customer resolution
  const cust =
    customer && typeof customer === 'object' && Object.keys(customer).length > 0
      ? customer
      : loan.customerId && typeof loan.customerId === 'object'
      ? loan.customerId
      : {};

  const parsedCustomer = parseCustomerName(cust.name || loan.customerName || 'Borrower');

  // Initial form values from existing loan
  const [principal, setPrincipal] = useState(loan.principal || 20000);
  const [interestPercent, setInterestPercent] = useState(loan.interestPercent || 10);
  const [chargeAmount, setChargeAmount] = useState(
    loan.chargeAmount !== undefined
      ? loan.chargeAmount
      : Math.round(((Number(loan.principal) || 0) * (Number(loan.interestPercent) || 0)) / 100)
  );
  const [interestType, setInterestType] = useState(loan.interestType || 'deduction');
  const [financeType, setFinanceType] = useState(loan.financeType || 'daily');
  const [duration, setDuration] = useState(loan.duration || 100);
  const [installmentAmount, setInstallmentAmount] = useState(loan.installmentAmount || 200);
  const [startDate, setStartDate] = useState(
    loan.startDate ? formatDateForInput(loan.startDate) : formatDateForInput()
  );
  const [status, setStatus] = useState(loan.status || 'active');
  const [notes, setNotes] = useState(loan.notes || '');
  const [borrowerPhoto, setBorrowerPhoto] = useState(
    loan.borrowerPhoto || cust.photoUrl || cust.photo || ''
  );

  // UI state
  const [photoError, setPhotoError] = useState('');
  const [isPhotoCompressing, setIsPhotoCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedUpdatedLoan, setSavedUpdatedLoan] = useState(null);

  // Two-way calculation handlers
  const handlePrincipalChange = (val) => {
    setPrincipal(val);
    const p = val === '' ? 0 : Number(val);
    const pct = Number(interestPercent) || 0;
    const chg = Math.round((p * pct) / 100);
    setChargeAmount(chg);

    const tot = interestType === 'deduction' ? p : p + chg;
    const dur = Number(duration) || 1;
    setInstallmentAmount(Math.ceil(tot / dur));
  };

  const handlePresetPrincipal = (p) => {
    setPrincipal(p);
    const pct = Number(interestPercent) || 0;
    const chg = Math.round((p * pct) / 100);
    setChargeAmount(chg);

    const tot = interestType === 'deduction' ? p : p + chg;
    const dur = Number(duration) || 1;
    setInstallmentAmount(Math.ceil(tot / dur));
  };

  const handleChargeAmountChange = (val) => {
    setChargeAmount(val);
    const c = val === '' ? 0 : Number(val);
    const p = Number(principal) || 0;
    if (p > 0 && val !== '') {
      const pct = Number(((c / p) * 100).toFixed(2));
      setInterestPercent(pct);
    }
    const tot = interestType === 'deduction' ? p : p + c;
    const dur = Number(duration) || 1;
    setInstallmentAmount(Math.ceil(tot / dur));
  };

  const handleInterestPercentChange = (val) => {
    setInterestPercent(val);
    const pct = val === '' ? 0 : Number(val);
    const p = Number(principal) || 0;
    if (val !== '') {
      const chg = Math.round((p * pct) / 100);
      setChargeAmount(chg);
      const tot = interestType === 'deduction' ? p : p + chg;
      const dur = Number(duration) || 1;
      setInstallmentAmount(Math.ceil(tot / dur));
    }
  };

  const handleDurationChange = (val) => {
    const dur = Number(val) || 1;
    setDuration(dur);
    const p = Number(principal) || 0;
    const c = Number(chargeAmount) || 0;
    const tot = interestType === 'deduction' ? p : p + c;
    setInstallmentAmount(Math.ceil(tot / dur));
  };

  const handleInterestTypeChange = (newType) => {
    setInterestType(newType);
    const p = Number(principal) || 0;
    const c = Number(chargeAmount) || 0;
    const tot = newType === 'deduction' ? p : p + c;
    const dur = Number(duration) || 1;
    setInstallmentAmount(Math.ceil(tot / dur));
  };

  // Image Upload Handler
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Invalid format. Please upload JPG, PNG, or WEBP / தவறான வடிவம்');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size exceeds 5MB limit / அதிகபட்ச அளவு 5MB');
      return;
    }

    setIsPhotoCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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

        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setBorrowerPhoto(compressed);
        setIsPhotoCompressing(false);
      };
      img.onerror = () => {
        setPhotoError('Failed to process image');
        setIsPhotoCompressing(false);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setPhotoError('Failed to read file');
      setIsPhotoCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  // Financial calculations
  const principalNum = Number(principal) || 0;
  const chargeAmountNum = Number(chargeAmount) || 0;
  const durationNum = Number(duration) || 1;
  const alreadyCollected = Number(loan.totalCollected || loan.totalPaid || 0);

  const inHandAmount =
    interestType === 'deduction' ? Math.max(0, principalNum - chargeAmountNum) : principalNum;

  const totalPayable =
    interestType === 'deduction' ? principalNum : principalNum + chargeAmountNum;

  const newRemainingBalance = Math.max(0, totalPayable - alreadyCollected);

  // Compute calculated end date
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (principalNum <= 0) {
      setError('Principal amount must be greater than zero');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.updateLoan(loan._id, {
        principal: principalNum,
        interestPercent: Number(interestPercent) || 0,
        chargeAmount: chargeAmountNum,
        interestType,
        financeType,
        duration: durationNum,
        installmentAmount: Number(installmentAmount) || Math.ceil(totalPayable / durationNum),
        totalPayable,
        startDate,
        status,
        borrowerPhoto,
        notes,
      });

      if (res?.success) {
        setSavedSuccess(true);
        setSavedUpdatedLoan(res.loan);
        if (onSuccess) {
          onSuccess(res.loan);
        }
      } else {
        throw new Error(res?.message || 'Failed to update loan');
      }
    } catch (err) {
      console.error('Update loan error:', err);
      setError(err.message || 'Failed to update loan terms');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (savedUpdatedLoan || loan) {
      const target = savedUpdatedLoan || loan;
      buildLoanAgreementPDF(target, cust).download();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isMobile ? 'flex-col justify-end' : 'items-center justify-center p-3 sm:p-4'
      } bg-slate-900/80 backdrop-blur-md animate-fade-in`}
    >
      <div
        className={`bg-white dark:bg-slate-900 ${
          isMobile
            ? 'rounded-t-3xl max-w-[430px] w-full max-h-[92vh] flex flex-col p-4 pb-safe'
            : 'rounded-3xl max-w-xl w-full p-6 max-h-[90vh] flex flex-col'
        } shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden`}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2 shrink-0" />
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                  Edit Loan Terms
                </h3>
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {loan.loanNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                கடனைத் திருத்து • Update terms, amounts, scheme & borrower photo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Borrower Info & Recovery Progress Card */}
        <div className="my-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              {borrowerPhoto ? (
                <img
                  src={borrowerPhoto}
                  alt={parsedCustomer.primary}
                  className="w-8 h-8 rounded-lg object-cover border border-sky-300 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                  {parsedCustomer.primary?.[0] || 'B'}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate">
                  {parsedCustomer.primary}{' '}
                  {parsedCustomer.secondary && `(${parsedCustomer.secondary})`}
                </p>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {cust.phone} {cust.area ? `• ${cust.area}` : ''}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Collected So Far
              </span>
              <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                {formatCurrency(alreadyCollected)}
              </span>
            </div>
          </div>

          {alreadyCollected > 0 && (
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-[10.5px] text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>
                <strong>{formatCurrency(alreadyCollected)}</strong> already repaid by borrower. New
                remaining balance will automatically adjust to{' '}
                <strong>{formatCurrency(newRemainingBalance)}</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {savedSuccess && (
          <div className="mb-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Loan updated successfully! கடன் விவரங்கள் புதுப்பிக்கப்பட்டன.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>PDF</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold shrink-0">
            {error}
          </div>
        )}

        {/* Form Body (Scrollable) */}
        <form
          id="edit-loan-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto space-y-4 pr-0.5"
        >
          {/* 1. Repayment Scheme */}
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
                  className={`p-2.5 rounded-2xl text-center border transition min-h-[48px] ${
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

          {/* 2. Principal Amount */}
          <div>
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
              Principal Amount / அசல் கடன் தொகை (₹)
            </label>
            <div className="relative mb-1.5">
              <span className="absolute left-3.5 top-2.5 text-lg font-black text-sky-500">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min="500"
                step="500"
                required
                value={principal}
                onChange={(e) => handlePrincipalChange(e.target.value)}
                className="w-full pl-9 pr-4 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[10000, 20000, 30000, 50000, 100000].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetPrincipal(p)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
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

          {/* 3. Interest & Charges Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-sky-500" />
                <span>Interest & Charges / வட்டி & கட்டணம்</span>
              </span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                Auto Sync
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Charge Amount / பிடித்தத் தொகை (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={chargeAmount}
                    onChange={(e) => handleChargeAmountChange(e.target.value)}
                    className="w-full pl-7 pr-3 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Interest Rate / வட்டி (%)
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
                    className="w-full pl-3 pr-7 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-slate-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400">%</span>
                </div>
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
                  onClick={() => handleInterestTypeChange('deduction')}
                  className={`p-2 rounded-xl text-left border transition text-xs ${
                    interestType === 'deduction'
                      ? 'bg-sky-500 text-white border-sky-400 shadow-sm ring-1 ring-sky-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-black text-[11px] leading-tight">✓ Deduct from Principal</p>
                  <p className="text-[9.5px] opacity-85 mt-0.5 leading-tight">
                    முன்பிடித்தம் (In-Hand: {formatCurrency(inHandAmount)})
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleInterestTypeChange('addon')}
                  className={`p-2 rounded-xl text-left border transition text-xs ${
                    interestType === 'addon'
                      ? 'bg-sky-500 text-white border-sky-400 shadow-sm ring-1 ring-sky-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-black text-[11px] leading-tight">Add to Principal</p>
                  <p className="text-[9.5px] opacity-85 mt-0.5 leading-tight">
                    கூடுதல் வட்டி (Total: {formatCurrency(principalNum + chargeAmountNum)})
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Duration, Start Date, Installment Amount */}
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
                onChange={(e) => handleDurationChange(e.target.value)}
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

          {/* 5. Installment Amount & Loan Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                Installment Amount / தவணை (₹)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={installmentAmount}
                onChange={(e) => setInstallmentAmount(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-sky-600 dark:text-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                Loan Status / கடன் நிலை
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-black outline-none focus:ring-2 focus:ring-sky-400 capitalize"
              >
                <option value="active">Active (நடைமுறையில்)</option>
                <option value="completed">Completed / Settled (முடிவடைந்தது)</option>
                <option value="overdue">Overdue (தாமதம்)</option>
                <option value="defaulted">Defaulted (தவறியது)</option>
              </select>
            </div>
          </div>

          {/* 6. Borrower Photo Upload Section */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-sky-500" />
                <span>Borrower Photo / புகைப்படம்</span>
              </label>
              <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoError && (
              <div className="p-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold">
                {photoError}
              </div>
            )}

            {borrowerPhoto ? (
              <div className="flex items-center space-x-3 p-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <img
                  src={borrowerPhoto}
                  alt="Borrower"
                  className="w-12 h-12 rounded-lg object-cover border border-sky-400 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Photo Attached
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Change</span>
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBorrowerPhoto('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
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
                className="border-2 border-dashed border-sky-200 dark:border-slate-700 hover:border-sky-400 rounded-2xl p-3 text-center cursor-pointer transition bg-sky-50/30"
              >
                <Upload className="w-5 h-5 mx-auto text-sky-500 mb-1" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Upload or Replace Borrower Photo
                </p>
                {isPhotoCompressing && (
                  <p className="text-[10px] text-sky-600 animate-pulse mt-0.5">Processing...</p>
                )}
              </div>
            )}
          </div>

          {/* 7. Notes */}
          <div>
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
              Notes / குறிப்பு
            </label>
            <input
              type="text"
              placeholder="Business purpose, guarantor reference, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 8. Impact Summary Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/60 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  New Total Repayable
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  {formatCurrency(totalPayable)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  New Remaining Balance
                </span>
                <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                  {formatCurrency(newRemainingBalance)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-sky-200/60 dark:border-sky-800/60 text-[11px] text-slate-500">
              <span>Expected Completion: <strong>{calculateEndDate()}</strong></span>
              <span>Disbursed In-Hand: <strong className="text-emerald-600">{formatCurrency(inHandAmount)}</strong></span>
            </div>
          </div>
        </form>

        {/* Modal Sticky Footer Action Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              if (
                window.confirm(
                  `Are you sure you want to permanently delete Loan ${loan.loanNo}? This will delete the loan and its transaction records.`
                )
              ) {
                try {
                  await api.deleteLoan(loan._id);
                  if (onSuccess) onSuccess();
                  onClose();
                } catch (err) {
                  alert(err.message || 'Failed to delete loan');
                }
              }
            }}
            className="px-3 min-h-[44px] py-2.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-bold transition flex items-center space-x-1"
            title="Permanently Delete This Loan"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">Delete / நீக்கு</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-center"
          >
            Cancel / ரத்து
          </button>

          <button
            type="submit"
            form="edit-loan-form"
            disabled={submitting}
            className="flex-[2] btn-sky-primary min-h-[44px] py-2.5 text-xs font-black shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-1.5 disabled:opacity-50 active:scale-98 transition"
          >
            {submitting ? (
              <span className="flex items-center space-x-1.5">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Changes / சேமிக்க</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLoanModal;

