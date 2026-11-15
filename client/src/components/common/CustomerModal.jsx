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
  RefreshCw,
  FileText,
} from 'lucide-react';

export const CustomerModal = ({ customer = null, onClose, onSuccess }) => {
  const isEdit = Boolean(customer);
  const { isMobile } = useDeviceMode();
  const fileInputRef = useRef(null);

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
      setError('Please enter customer full name / பெயர் தேவை');
      return;
    }
    if (!phone.trim()) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in max-w-[540px] sm:max-w-2xl mx-auto left-0 right-0">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2 sm:hidden" />

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-sky-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                {createdLoan
                  ? 'Loan & Customer Created! / பதிவு முடிந்தது'
                  : isEdit
                  ? 'Edit Customer'
                  : 'New Customer & Loan / புதிய வாடிக்கையாளர் & கடன்'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {createdLoan
                  ? 'Official application agreement & repayment schedule ready'
                  : 'Complete customer registry & instant loan disbursement setup'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
            {error}
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
                SECTION 1: CUSTOMER DETAILS / வாடிக்கையாளர் விவரங்கள்
            --------------------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Customer Information / வாடிக்கையாளர் விவரங்கள்</span>
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
                    placeholder="e.g. Main Bazaar / Gandhi Nagar"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ID Proof Type
                  </label>
                  <select
                    value={idProofType}
                    onChange={(e) => setIdProofType(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
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

                {/* Borrower Photo Upload Component */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Borrower Photo / புகைப்படம் (Optional)
                  </label>
                  <div className="flex items-center space-x-3">
                    {borrowerPhoto ? (
                      <div className="relative group w-12 h-14 rounded-xl border border-sky-300 overflow-hidden bg-slate-100 shrink-0">
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
                        className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition active:scale-95"
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

              {/* Guarantor Details */}
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
                    placeholder="Relationship (e.g. Brother, Spouse)"
                    value={guarantorRelationship}
                    onChange={(e) => setGuarantorRelationship(e.target.value)}
                    className="sm:col-span-2 w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 2: INTEGRATED LOAN CREATION (Right In This Page!)
            --------------------------------------------------------------------- */}
            {!isEdit && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                {/* Header Toggle */}
                <div
                  onClick={() => setIncludeLoan(!includeLoan)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    includeLoan
                      ? 'bg-gradient-to-r from-sky-50 to-indigo-50/70 dark:from-sky-950/50 dark:to-indigo-950/40 border-sky-300 dark:border-sky-700 ring-2 ring-sky-400/20'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                        includeLoan
                          ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Issue Loan In This Form / உடனே கடன் வழங்குக</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        {includeLoan
                          ? 'Loan terms enabled: customer and loan will be created together'
                          : 'Click to add loan details and issue loan with this customer'}
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

                {/* Expanded Loan Fields */}
                {includeLoan && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-sky-200 dark:border-sky-800/80 shadow-xs space-y-3.5 animate-fade-in">
                    {/* Principal Amount */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Principal Amount / கடன் தொகை (அசல்) *
                        </label>
                        <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400">
                          {formatCurrency(principalNum)}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm font-black text-slate-400">₹</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1000"
                          step="500"
                          required={includeLoan}
                          value={principal}
                          onChange={(e) => setPrincipal(e.target.value)}
                          className="w-full pl-8 pr-3 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-slate-900 dark:text-white"
                        />
                      </div>
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[10000, 20000, 30000, 50000, 100000].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPrincipal(p)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                              Number(principal) === p
                                ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            ₹{p.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scheme & Duration */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-sky-400"
                        >
                          <option value="daily">Daily Thandhal (தினசரி)</option>
                          <option value="weekly">Weekly (வாரத் தவணை)</option>
                          <option value="monthly">Monthly (மாதத் தவணை)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tenure / தவணை நாட்கள்
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums"
                        />
                      </div>
                    </div>

                    {/* Upfront Charge Amount (NO PERCENTAGE DISPLAYED!) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Upfront Charge / கட்டணத் தொகை (₹)
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Upfront deduction
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm font-black text-slate-400">₹</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          className="w-full pl-8 pr-3 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-2 focus:ring-sky-400 tabular-nums text-slate-900 dark:text-white"
                        />
                      </div>
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[1000, 1500, 2000, 2500, 3000, 4500].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setChargeAmount(amt)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                              Number(chargeAmount) === amt
                                ? 'bg-sky-500 text-white border-sky-500'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            ₹{amt.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deduction Method & Start Date */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Deduction Method
                        </label>
                        <select
                          value={interestType}
                          onChange={(e) => setInterestType(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                        >
                          <option value="deduction">Upfront Deduction</option>
                          <option value="addon">Add to Principal</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Start Date (தொடக்கம்)
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                        />
                      </div>
                    </div>

                    {/* Live Calculation Summary Banner */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/60 dark:to-indigo-950/60 border border-sky-200 dark:border-sky-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Net Disbursed</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm tabular-nums">
                          {formatCurrency(inHandAmount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Installment Due</span>
                        <strong className="text-sky-600 dark:text-sky-400 font-black text-sm tabular-nums">
                          {formatCurrency(installmentAmount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Repayable</span>
                        <strong className="text-slate-900 dark:text-white font-black text-sm tabular-nums">
                          {formatCurrency(totalPayable)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Due Date</span>
                        <strong className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                          {calculateEndDate()}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sticky Modal Action Footer */}
            <div className="sticky bottom-0 pt-3 pb-1 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 min-h-[48px] rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-xs shadow-xl shadow-sky-500/25 transition active:scale-98 flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Customer &amp; Loan...</span>
                  </>
                ) : (
                  <>
                    <Banknote className="w-4 h-4" />
                    <span>
                      {isEdit
                        ? 'Update Customer'
                        : includeLoan
                        ? 'Save Customer & Issue Loan / கடன் வழங்குக'
                        : 'Save Customer Only'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="sm:w-auto px-5 min-h-[48px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition active:scale-98"
              >
                Cancel
              </button>
            </div>
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
