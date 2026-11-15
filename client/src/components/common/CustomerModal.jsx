import React, { useState, useRef } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDateForInput } from '../../utils/currency';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { buildLoanAgreementPDF, downloadRepaymentSchedulePDF } from '../../utils/loanAgreementPdf';
import {
  X,
  UserPlus,
  Shield,
  Banknote,
  Sparkles,
  Camera,
  Upload,
  Trash2,
  Calendar,
  Download,
  Printer,
  Eye,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  FileText,
} from 'lucide-react';

export const CustomerModal = ({ customer = null, onClose, onSuccess }) => {
  const isEdit = Boolean(customer);
  const { isMobile } = useDeviceMode();
  const fileInputRef = useRef(null);

  // Tab State: 'profile' (Step 1) or 'loan' (Step 2)
  const [activeTab, setActiveTab] = useState('profile');

  // ---------------------------------------------------------------------------
  // Customer Profile State
  // ---------------------------------------------------------------------------
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [area, setArea] = useState(customer?.area || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [idProofType, setIdProofType] = useState(customer?.idProofType || 'Aadhaar');
  const [idProofNumber, setIdProofNumber] = useState(customer?.idProofNumber || '');
  const [borrowerPhoto, setBorrowerPhoto] = useState(customer?.photoUrl || customer?.photo || '');
  const [photoError, setPhotoError] = useState('');
  const [isPhotoCompressing, setIsPhotoCompressing] = useState(false);

  // Guarantor State
  const [guarantorName, setGuarantorName] = useState(customer?.guarantor?.name || '');
  const [guarantorPhone, setGuarantorPhone] = useState(customer?.guarantor?.phone || '');
  const [guarantorAddress, setGuarantorAddress] = useState(customer?.guarantor?.address || '');
  const [guarantorRelationship, setGuarantorRelationship] = useState(customer?.guarantor?.relationship || '');
  const [notes, setNotes] = useState(customer?.notes || '');

  // ---------------------------------------------------------------------------
  // Integrated Loan Terms State (All in this page!)
  // ---------------------------------------------------------------------------
  const [includeLoan, setIncludeLoan] = useState(!isEdit); // Default ON for new customers
  const [principal, setPrincipal] = useState(20000);
  const [chargeAmount, setChargeAmount] = useState(2000);
  const [financeType, setFinanceType] = useState('daily');
  const [duration, setDuration] = useState(100);
  const [interestType, setInterestType] = useState('deduction'); // 'deduction' (upfront minus) or 'addon'
  const [startDate, setStartDate] = useState(formatDateForInput());

  // ---------------------------------------------------------------------------
  // Submission & Success/PDF State
  // ---------------------------------------------------------------------------
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdLoan, setCreatedLoan] = useState(null);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [pdfResult, setPdfResult] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Calculations (No Percentage Displayed - Strict Thandhal Formula)
  // ---------------------------------------------------------------------------
  const principalNum = Math.max(0, Number(principal) || 0);
  const chargeAmountNum = Math.max(0, Number(chargeAmount) || 0);
  const durationNum = Math.max(1, Number(duration) || 100);

  const inHandAmount =
    interestType === 'deduction'
      ? Math.max(0, principalNum - chargeAmountNum)
      : principalNum;

  const totalPayable =
    interestType === 'deduction'
      ? principalNum
      : principalNum + chargeAmountNum;

  const installmentAmount = Math.ceil(totalPayable / durationNum);

  const calculateEndDate = () => {
    try {
      const d = new Date(startDate || new Date());
      if (isNaN(d.getTime())) return '—';
      if (financeType === 'daily') d.setDate(d.getDate() + durationNum);
      else if (financeType === 'weekly') d.setDate(d.getDate() + durationNum * 7);
      else if (financeType === 'monthly') d.setMonth(d.getMonth() + durationNum);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  // ---------------------------------------------------------------------------
  // Photo Handling (Compress to max 800px)
  // ---------------------------------------------------------------------------
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Invalid format. Please upload JPG, PNG, or WEBP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    setIsPhotoCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setBorrowerPhoto(dataUrl);
        setIsPhotoCompressing(false);
      };
      img.onerror = () => {
        setPhotoError('Failed to process image');
        setIsPhotoCompressing(false);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image');
      setIsPhotoCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setBorrowerPhoto('');
    setPhotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------------------------------------------------------------------------
  // Form Submission (Customer + Loan Atomic Flow)
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    if (!name.trim()) {
      setActiveTab('profile');
      setError('Please enter customer full name / வாடிக்கையாளர் பெயர் தேவை');
      return;
    }
    if (!phone.trim()) {
      setActiveTab('profile');
      setError('Please enter mobile number / அலைபேசி எண் தேவை');
      return;
    }

    const custPayload = {
      name: name.trim(),
      phone: phone.trim(),
      area: area.trim() || 'Town Circle',
      address: address.trim() || 'Tamil Nadu',
      idProofType,
      idProofNumber: idProofNumber.trim(),
      photoUrl: borrowerPhoto || '',
      photo: borrowerPhoto || '',
      guarantor: {
        name: guarantorName.trim(),
        phone: guarantorPhone.trim(),
        address: guarantorAddress.trim(),
        relationship: guarantorRelationship.trim(),
      },
      notes: notes.trim(),
    };

    try {
      setSubmitting(true);
      let savedCust;

      if (isEdit) {
        const res = await api.updateCustomer(customer._id, custPayload);
        savedCust = res.customer;
      } else {
        const res = await api.createCustomer(custPayload);
        savedCust = res.customer;
      }

      setCreatedCustomer(savedCust);

      // If user wants to issue a loan with this customer:
      if (!isEdit && includeLoan && savedCust?._id) {
        const loanRes = await api.createLoan({
          customerId: savedCust._id,
          customerName: savedCust.name,
          customerPhone: savedCust.phone,
          customerArea: savedCust.area,
          principal: principalNum,
          chargeAmount: chargeAmountNum,
          interestPercent: principalNum > 0 ? Number(((chargeAmountNum / principalNum) * 100).toFixed(2)) : 0,
          interestType,
          totalPayable,
          installmentAmount,
          financeType,
          duration: durationNum,
          startDate,
          borrowerPhoto,
          notes: notes.trim(),
        });

        const savedLoan = loanRes.loan || {
          _id: 'loan_' + Date.now(),
          loanNo: `LN-${(financeType[0] || 'D').toUpperCase()}26-${Math.floor(1000 + Math.random() * 9000)}`,
          customerId: savedCust,
          customerName: savedCust.name,
          customerPhone: savedCust.phone,
          customerArea: savedCust.area,
          principal: principalNum,
          chargeAmount: chargeAmountNum,
          disbursedAmount: inHandAmount,
          totalPayable,
          installmentAmount,
          financeType,
          duration: durationNum,
          startDate,
          status: 'active',
          borrowerPhoto,
        };

        setCreatedLoan(savedLoan);

        // Pre-build official Agreement PDF
        const pdf = buildLoanAgreementPDF(savedLoan, savedCust);
        setPdfResult(pdf);

        if (onSuccess) {
          onSuccess(savedCust, { loan: savedLoan });
        }
        return; // Stay in modal to display the download screen!
      }

      // If customer only
      if (onSuccess) {
        onSuccess(savedCust);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action Handlers for Success View
  // ---------------------------------------------------------------------------
  const handleDownloadAgreement = () => {
    if (pdfResult) {
      pdfResult.download();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  const handleDownloadSchedule = () => {
    if (createdLoan && createdCustomer) {
      downloadRepaymentSchedulePDF(createdLoan, createdCustomer);
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 3000);
    }
  };

  const handlePreviewPdf = () => {
    if (pdfResult) {
      setPreviewBlobUrl(pdfResult.getBlobUrl());
      setShowPreviewModal(true);
    }
  };

  const handlePrintPdf = () => {
    if (pdfResult) {
      pdfResult.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl sm:max-w-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-sky-500/20 shrink-0">
              {includeLoan && activeTab === 'loan' ? (
                <Banknote className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                  {createdLoan
                    ? 'Loan & Customer Created!'
                    : isEdit
                    ? 'Edit Customer'
                    : 'New Customer & Loan'}
                </h2>
                <span className="text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400">
                  {createdLoan
                    ? 'பதிவு முடிந்தது'
                    : isEdit
                    ? 'வாடிக்கையாளர் திருத்து'
                    : 'புதிய வாடிக்கையாளர் & கடன்'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {createdLoan
                  ? 'Official application agreement & repayment schedule ready for download'
                  : 'Fast borrower registration with instant daily thandhal disbursement'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs shrink-0 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700 text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Selection Bar (Shown when registering new customer) */}
        {!createdLoan && !isEdit && (
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mt-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>1. Borrower Profile / வாடிக்கையாளர்</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!includeLoan) setIncludeLoan(true);
                setActiveTab('loan');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 ${
                activeTab === 'loan'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>2. Loan Terms / கடன் விவரங்கள்</span>
              {includeLoan && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
              )}
            </button>
          </div>
        )}

        {/* =========================================================================
            STATE A: SUCCESS & INSTANT DOWNLOAD SCREEN (When Loan was created!)
        ========================================================================= */}
        {createdLoan ? (
          <div className="py-4 space-y-4 overflow-y-auto animate-fade-in text-center flex-1 pr-1">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-50 dark:ring-emerald-900/30">
              <CheckCircle className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Customer &amp; Loan Successfully Created!
              </h3>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                வாடிக்கையாளர் மற்றும் கடன் வெற்றிகரமாக உருவாக்கப்பட்டது!
              </p>
            </div>

            {/* Created Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/70 dark:from-sky-950/50 dark:to-indigo-950/50 border border-sky-200 dark:border-sky-800 text-left space-y-2.5">
              <div className="flex items-center justify-between border-b border-sky-200/60 dark:border-sky-800/60 pb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Official Loan ID
                </span>
                <span className="font-mono font-black text-sm text-sky-700 dark:text-sky-300">
                  {createdLoan.loanNo}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Customer</span>
                  <p className="font-black text-slate-900 dark:text-white truncate">
                    {createdCustomer?.name}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Principal (அசல்)</span>
                  <p className="font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(principalNum)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Net Disbursed (கையில்)</span>
                  <p className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(inHandAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Installment Due</span>
                  <p className="font-black text-sky-600 dark:text-sky-400 tabular-nums">
                    {formatCurrency(installmentAmount)} / {financeType === 'daily' ? 'day' : 'inst'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons as Specifically Requested */}
            <div className="space-y-2 text-left pt-1">
              {/* Option 1: Download Agreement PDF */}
              <button
                type="button"
                onClick={handleDownloadAgreement}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-xs shadow-md shadow-sky-500/25 active:scale-98 transition"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Download className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="leading-tight">1. Download Loan Agreement Form (PDF)</p>
                    <p className="text-[10px] text-sky-100 font-medium">
                      கடன் விண்ணப்பம் மற்றும் ஒப்பந்த படிவம் பதிவிறக்கம்
                    </p>
                  </div>
                </div>
                {downloadSuccess ? (
                  <span className="text-[10px] bg-white text-sky-700 font-black px-2 py-0.5 rounded-full">
                    Saved ✓
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-sky-200" />
                )}
              </button>

              {/* Option 2: Download Repayment Schedule PDF */}
              <button
                type="button"
                onClick={handleDownloadSchedule}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-md shadow-indigo-500/25 active:scale-98 transition"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="leading-tight">2. Download Repayment Schedule (PDF)</p>
                    <p className="text-[10px] text-indigo-100 font-medium">
                      தவணை அட்டவணை PDF பதிவிறக்கம் (Daily Ledger Schedule)
                    </p>
                  </div>
                </div>
                {scheduleSuccess ? (
                  <span className="text-[10px] bg-white text-indigo-700 font-black px-2 py-0.5 rounded-full">
                    Saved ✓
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-indigo-200" />
                )}
              </button>

              {/* Option 3: Print Form */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                >
                  <Printer className="w-4 h-4 text-purple-600" />
                  <span>Print Form / அச்சிடு</span>
                </button>

                <button
                  type="button"
                  onClick={handlePreviewPdf}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                >
                  <Eye className="w-4 h-4 text-sky-600" />
                  <span>Preview / பார்க்க</span>
                </button>
              </div>

              {/* Finish / Done button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-[46px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition active:scale-98"
                >
                  Done / நிறைவு
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
              STATE B: INTEGRATED CUSTOMER + LOAN FORM
          ========================================================================= */
          <form onSubmit={handleSubmit} className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1">
            {/* ---------------------------------------------------------------------
                VIEW 1: CUSTOMER / BORROWER PROFILE TAB
            --------------------------------------------------------------------- */}
            {(activeTab === 'profile' || isEdit) && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Borrower Particulars / வாடிக்கையாளர் விவரங்கள்</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name / பெயர் *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. S. Murugesan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Phone / அலைபேசி *
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      placeholder="9842100000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Area / பகுதி *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Main Bazaar / Madhanur"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ID Proof Type / அடையாள அட்டை
                    </label>
                    <select
                      value={idProofType}
                      onChange={(e) => setIdProofType(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
                    >
                      <option value="Aadhaar">Aadhaar Card (ஆதார்)</option>
                      <option value="Voter ID">Voter ID (வாக்காளர் அட்டை)</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Ration Card">Ration Card (ரேஷன் அட்டை)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ID Proof Number (Last 4 digits / முழு எண்)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4582"
                      value={idProofNumber}
                      onChange={(e) => setIdProofNumber(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>

                  {/* Photo Upload Component */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Borrower Photo / புகைப்படம் (Optional)
                    </label>
                    <div className="flex items-center space-x-3">
                      {borrowerPhoto ? (
                        <div className="relative group w-12 h-14 rounded-xl border border-sky-300 overflow-hidden bg-slate-100 shrink-0 shadow-xs">
                          <img
                            src={borrowerPhoto}
                            alt="Borrower"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            title="Remove photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-14 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}

                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoSelect}
                          className="hidden"
                          id="modal-customer-photo-input"
                        />
                        <label
                          htmlFor="modal-customer-photo-input"
                          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition active:scale-95 border border-slate-200/60 dark:border-slate-700/60"
                        >
                          <Upload className="w-3.5 h-3.5 text-sky-600" />
                          <span>{borrowerPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                        </label>
                        {photoError && (
                          <p className="text-[10px] text-red-500 mt-1">{photoError}</p>
                        )}
                        {isPhotoCompressing && (
                          <p className="text-[10px] text-sky-500 mt-1 animate-pulse">Compressing...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Residential Address / முழு முகவரி *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Door No, Street Name, Landmark..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                  />
                </div>

                {/* Guarantor Details Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <span>Guarantor / ஜாமீன்தாரர் விவரங்கள்</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Guarantor Name / பெயர்"
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="Guarantor Phone / எண்"
                      value={guarantorPhone}
                      onChange={(e) => setGuarantorPhone(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Relationship (e.g. Brother, Spouse, Employer)"
                      value={guarantorRelationship}
                      onChange={(e) => setGuarantorRelationship(e.target.value)}
                      className="sm:col-span-2 w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Business / Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Business / Occupation Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tea stall owner, vegetable merchant"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
                  />
                </div>

                {/* Profile View Sticky Action Footer */}
                <div className="sticky bottom-0 pt-3.5 pb-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition"
                  >
                    Cancel / ரத்து
                  </button>

                  <div className="flex items-center space-x-2">
                    {includeLoan && !isEdit ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!name.trim()) {
                            setError('Please enter customer full name / பெயர் தேவை');
                            return;
                          }
                          if (!phone.trim()) {
                            setError('Please enter mobile number / அலைபேசி எண் தேவை');
                            return;
                          }
                          setError('');
                          setActiveTab('loan');
                        }}
                        className="btn-sky-primary min-h-[44px] py-2 px-5 text-xs font-black shadow-lg shadow-sky-500/25 flex items-center space-x-2 active:scale-95 transition"
                      >
                        <span>Next: Loan Terms / கடன் விவரங்கள்</span>
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-sky-primary min-h-[44px] py-2 px-5 text-xs font-black shadow-lg shadow-sky-500/25 flex items-center space-x-1.5 active:scale-95 transition"
                      >
                        {submitting ? 'Saving...' : isEdit ? 'Update Customer' : 'Save Customer / சேமிக்க'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                VIEW 2: LOAN TERMS & DISBURSEMENT TAB
            --------------------------------------------------------------------- */}
            {activeTab === 'loan' && !isEdit && (
              <div className="space-y-4 py-1 animate-fade-in">
                {/* Enable / Disable Loan Toggle Card */}
                <div
                  onClick={() => setIncludeLoan(!includeLoan)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    includeLoan
                      ? 'bg-gradient-to-r from-sky-50 to-indigo-50/70 dark:from-sky-950/40 dark:to-indigo-950/40 border-sky-300 dark:border-sky-700/80 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                        includeLoan
                          ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Issue Loan With This Borrower / உடனடி கடன் வழங்கல்</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {includeLoan
                          ? 'Enabled: Customer & Loan will be created together with instant PDF agreement'
                          : 'Disabled: Only customer account will be created'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeLoan}
                    onChange={(e) => setIncludeLoan(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {includeLoan && (
                  <div className="space-y-4">
                    {/* Principal Amount Section */}
                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Principal Amount / கடன் தொகை (அசல்) *
                        </label>
                        <span className="text-xs font-mono font-black text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-lg">
                          {formatCurrency(principalNum)}
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1000"
                          step="500"
                          required={includeLoan}
                          value={principal}
                          onChange={(e) => setPrincipal(e.target.value)}
                          className="w-full pl-9 pr-4 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-base font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {[10000, 20000, 30000, 50000, 100000].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPrincipal(p)}
                            className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition ${
                              Number(principal) === p
                                ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-500/25'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            ₹{p.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scheme & Tenure */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Repayment Scheme / திட்டம்
                        </label>
                        <select
                          value={financeType}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFinanceType(val);
                            if (val === 'daily') setDuration(100);
                            else if (val === 'weekly') setDuration(10);
                            else if (val === 'monthly') setDuration(12);
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
                        >
                          <option value="daily">Daily Thandhal (தினசரி)</option>
                          <option value="weekly">Weekly (வாரத் தவணை)</option>
                          <option value="monthly">Monthly (மாதத் தவணை)</option>
                        </select>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Tenure / தவணை நாட்கள்
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full h-10 px-3 pr-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                            {financeType === 'daily' ? 'days' : financeType === 'weekly' ? 'weeks' : 'months'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Upfront Charge Amount (NO PERCENTAGE!) */}
                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Upfront Charge / கட்டணத் தொகை (பிடித்தம்)
                        </label>
                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          {interestType === 'deduction' ? 'கழித்து தருதல்' : 'அசலுடன் கூட்டல்'}
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          className="w-full pl-9 pr-4 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-base font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Preset Buttons */}
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {[1000, 1500, 2000, 2500, 3000, 4500].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setChargeAmount(amt)}
                            className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition ${
                              Number(chargeAmount) === amt
                                ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-500/25'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            ₹{amt.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deduction Method & Start Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Deduction Method
                        </label>
                        <select
                          value={interestType}
                          onChange={(e) => setInterestType(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="deduction">Upfront Deduction (கையில் குறைத்து வழங்குதல்)</option>
                          <option value="addon">Add to Principal (அசலுடன் சேர்த்தல்)</option>
                        </select>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Start Date (தொடக்கம்)
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold outline-none"
                        />
                      </div>
                    </div>

                    {/* Live Calculation Summary Banner - 4-Stat Luxury Cards */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-indigo-50/60 dark:from-sky-950/50 dark:via-slate-900 dark:to-indigo-950/50 border-2 border-sky-200 dark:border-sky-800/80 shadow-md">
                      <div className="text-[11px] font-black uppercase text-sky-800 dark:text-sky-300 tracking-wider mb-2.5 flex items-center justify-between">
                        <span>Instant Financial Breakdown / நேரலை கணக்கீடு</span>
                        <span className="text-slate-400 font-mono font-bold lowercase">auto-computed</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                        <div className="p-3 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-sky-100 dark:border-sky-900/60 shadow-xs">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                            Net Disbursed / கையில்
                          </span>
                          <strong className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                            {formatCurrency(inHandAmount)}
                          </strong>
                        </div>

                        <div className="p-3 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-sky-100 dark:border-sky-900/60 shadow-xs">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                            Installment / தவணை
                          </span>
                          <strong className="text-base font-black text-sky-600 dark:text-sky-400 tabular-nums block mt-0.5">
                            {formatCurrency(installmentAmount)}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">
                              / {financeType === 'daily' ? 'day' : 'inst'}
                            </span>
                          </strong>
                        </div>

                        <div className="p-3 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-sky-100 dark:border-sky-900/60 shadow-xs">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                            Total Due / மொத்தம்
                          </span>
                          <strong className="text-base font-black text-slate-900 dark:text-white tabular-nums block mt-0.5">
                            {formatCurrency(totalPayable)}
                          </strong>
                        </div>

                        <div className="p-3 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-sky-100 dark:border-sky-900/60 shadow-xs">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                            Due Date / முடிவு
                          </span>
                          <strong className="text-xs font-black text-indigo-600 dark:text-indigo-400 block mt-1">
                            {calculateEndDate()}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loan View Sticky Action Footer */}
                <div className="sticky bottom-0 pt-3.5 pb-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>← Back to Profile / சுயவிவரம்</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 max-w-md min-h-[46px] rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-xs shadow-xl shadow-sky-500/30 transition active:scale-98 flex items-center justify-center space-x-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing Loan &amp; Customer...</span>
                      </>
                    ) : (
                      <>
                        <Banknote className="w-4 h-4" />
                        <span>Save Customer &amp; Issue Loan / கடன் வழங்குக</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* PDF Preview Modal iframe if requested */}
        {showPreviewModal && previewBlobUrl && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-3 border-b">
                <h4 className="font-bold text-sm text-slate-800">Loan Agreement PDF Preview</h4>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <iframe src={previewBlobUrl} className="w-full flex-1" title="PDF Preview" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerModal;
