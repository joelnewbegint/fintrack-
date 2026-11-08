import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  X,
  Printer,
  FileText,
  Camera,
  RotateCcw,
  Save,
  CheckCircle,
  Trash2,
} from 'lucide-react';

// Pristine Blank Form Template (Zero Dump Data)
const BLANK_FORM_DATA = {
  appNo: '',
  date: new Date().toISOString().split('T')[0],
  customerName: '',
  fatherSpouseName: '',
  phone: '',
  altPhone: '',
  address: '',
  area: '',
  dob: '',
  occupation: '',
  monthlyIncome: '',
  residenceType: '',
  idType: '',
  idNumber: '',
  photoUrl: '',
  loanAmount: '',
  tenure: '',
  installmentAmount: '',
  scheme: '',
  startDate: '',
  endDate: '',
  purpose: '',
  witness1Name: '',
  witness1Phone: '',
  witness1Relation: '',
  witness1Aadhaar: '',
  witness1Address: '',
  witness2Name: '',
  witness2Phone: '',
  witness2Relation: '',
  witness2Aadhaar: '',
  witness2Address: '',
  place: '',
  approvedBy: '',
  disbursedOn: '',
  receiptNo: '',
};

// Safe date string extractor
const toDateString = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  } catch (e) {}
  return typeof d === 'string' ? d.split('T')[0] : '';
};

// Helper to format date for print/display (DD-MM-YYYY)
const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '';
  try {
    const str = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [year, month, day] = str.split('T')[0].split('-');
      return `${day}-${month}-${year}`;
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) {}
  return String(dateVal);
};

// Map real incoming loan/customer data safely into standard form schema
const mapIncomingData = (data) => {
  if (!data) return BLANK_FORM_DATA;

  const cust = data.customerId && typeof data.customerId === 'object'
    ? data.customerId
    : (data.customer && typeof data.customer === 'object' ? data.customer : {});

  // Determine tenure display string
  let tenureStr = '';
  if (data.tenure) {
    tenureStr = data.tenure;
  } else if (data.duration) {
    const scheme = (data.financeType || data.scheme || 'daily').toLowerCase();
    const unit = scheme.includes('daily') ? 'Days' : scheme.includes('weekly') ? 'Weeks' : 'Months';
    tenureStr = `${data.duration} ${unit}`;
  }

  // Calculate or extract End Date
  let calculatedEndDate = toDateString(data.endDate);
  const rawStart = data.startDate || data.date;
  if (!calculatedEndDate && rawStart && data.duration) {
    try {
      const d = new Date(rawStart);
      const dur = Number(data.duration);
      const scheme = (data.financeType || data.scheme || 'daily').toLowerCase();
      if (!isNaN(d.getTime()) && !isNaN(dur)) {
        if (scheme.includes('daily')) d.setDate(d.getDate() + dur);
        else if (scheme.includes('weekly')) d.setDate(d.getDate() + dur * 7);
        else if (scheme.includes('monthly')) d.setMonth(d.getMonth() + dur);
        calculatedEndDate = d.toISOString().split('T')[0];
      }
    } catch (e) {}
  }

  return {
    appNo: data.loanNo || data.appNo || '',
    date: toDateString(data.date || rawStart || new Date()),
    customerName: cust.name || data.customerName || data.name || '',
    fatherSpouseName: cust.fatherName || data.fatherSpouseName || '',
    phone: cust.phone || data.phone || '',
    altPhone: cust.altPhone || data.altPhone || '',
    address: cust.address || data.address || '',
    area: cust.area || data.area || '',
    dob: toDateString(cust.dob || data.dob || data.dateOfBirth),
    occupation: cust.occupation || data.occupation || '',
    monthlyIncome: cust.monthlyIncome ? String(cust.monthlyIncome) : (data.monthlyIncome ? String(data.monthlyIncome) : ''),
    residenceType: cust.residenceType || data.residenceType || '',
    idType: cust.idProofType || cust.idType || data.idProofType || data.idType || '',
    idNumber: cust.idProofNumber || cust.idNumber || data.idProofNumber || data.idNumber || '',
    photoUrl: cust.photoUrl || cust.photo || data.photoUrl || data.photo || '',
    loanAmount: data.principal ? String(data.principal) : (data.loanAmount ? String(data.loanAmount) : ''),
    tenure: tenureStr,
    installmentAmount: data.installmentAmount ? String(data.installmentAmount) : '',
    scheme: data.financeType || data.scheme || '',
    startDate: toDateString(rawStart),
    endDate: calculatedEndDate,
    purpose: data.notes || data.purpose || '',
    witness1Name: cust.guarantor?.name || data.witness1Name || '',
    witness1Phone: cust.guarantor?.phone || data.witness1Phone || '',
    witness1Relation: cust.guarantor?.relationship || data.witness1Relation || '',
    witness1Aadhaar: cust.guarantor?.aadhaar || data.witness1Aadhaar || '',
    witness1Address: cust.guarantor?.address || data.witness1Address || '',
    witness2Name: data.witness2Name || (data.witness2?.name || ''),
    witness2Phone: data.witness2Phone || (data.witness2?.phone || ''),
    witness2Relation: data.witness2Relation || (data.witness2?.relationship || ''),
    witness2Aadhaar: data.witness2Aadhaar || (data.witness2?.aadhaar || ''),
    witness2Address: data.witness2Address || (data.witness2?.address || ''),
    place: cust.area || data.place || data.area || '',
    approvedBy: data.approvedBy || '',
    disbursedOn: toDateString(data.disbursedOn || data.disbursedAt || rawStart),
    receiptNo: data.receiptNo || '',
  };
};

export const LoanApplicationFormModal = ({ isOpen, onClose, prefillData = null, onLoanCreated = null }) => {
  const { lang } = useLanguage();
  const printAreaRef = useRef(null);

  const [formData, setFormData] = useState(() => {
    if (prefillData) return mapIncomingData(prefillData);
    try {
      const saved = localStorage.getItem('fintrack_loan_form_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return BLANK_FORM_DATA;
  });
  const [isBlankMode, setIsBlankMode] = useState(() => {
    if (prefillData) return false;
    try {
      const saved = localStorage.getItem('fintrack_loan_form_draft');
      return !saved;
    } catch {
      return true;
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (prefillData) {
      setFormData(mapIncomingData(prefillData));
      setIsBlankMode(false);
    } else {
      try {
        const saved = localStorage.getItem('fintrack_loan_form_draft');
        if (saved) {
          setFormData(JSON.parse(saved));
          setIsBlankMode(false);
          return;
        }
      } catch (e) {}
      setFormData(BLANK_FORM_DATA);
      setIsBlankMode(true);
    }
  }, [prefillData, isOpen]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (!prefillData) {
        try {
          localStorage.setItem('fintrack_loan_form_draft', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
    setIsBlankMode(false);
  };

  const handleClearDraft = () => {
    if (window.confirm('Clear form back to clean blank? / படிவத்தை அழிக்கவா?')) {
      try {
        localStorage.removeItem('fintrack_loan_form_draft');
      } catch (e) {}
      setFormData(BLANK_FORM_DATA);
      setIsBlankMode(true);
      setSaveSuccessMsg('');
      setSaveError('');
    }
  };

  const handleSaveLoan = async () => {
    setSaveError('');
    setSaveSuccessMsg('');

    const borrowerName = (formData.customerName || '').trim();
    const principalNum = Number(formData.loanAmount) || 0;

    if (!borrowerName) {
      setSaveError('Please enter borrower full name / வாடிக்கையாளர் பெயர் உள்ளிடவும்');
      return;
    }
    if (principalNum < 500) {
      setSaveError('Please enter valid loan amount (min ₹500) / கடன் தொகை உள்ளிடவும்');
      return;
    }

    try {
      setIsSaving(true);
      const custRes = await api.createCustomer({
        name: borrowerName,
        phone: (formData.phone || '').trim() || '9842100000',
        area: (formData.area || '').trim() || 'Town',
        address: (formData.address || '').trim() || 'Tamil Nadu',
        idProofType: formData.idType || 'Aadhaar',
        idProofNumber: formData.idNumber || '',
        guarantor: {
          name: formData.witness1Name || '',
          phone: formData.witness1Phone || '',
          address: formData.witness1Address || '',
          relationship: formData.witness1Relation || 'Guarantor',
        },
      });

      const customerId = custRes?.customer?._id || 'cust_' + Date.now();

      const scheme = (formData.scheme || 'daily').toLowerCase();
      const financeType = scheme.includes('weekly') ? 'weekly' : scheme.includes('monthly') ? 'monthly' : 'daily';
      let durationNum = parseInt(formData.tenure, 10);
      if (isNaN(durationNum) || durationNum <= 0) {
        durationNum = financeType === 'daily' ? 100 : financeType === 'weekly' ? 15 : 10;
      }

      const chargeAmount = Math.round((principalNum * 10) / 100);
      const installmentAmount = Math.ceil(principalNum / durationNum);

      const loanRes = await api.createLoan({
        customerId,
        principal: principalNum,
        interestPercent: 10,
        chargeAmount,
        interestType: 'deduction',
        totalPayable: principalNum,
        installmentAmount,
        financeType,
        duration: durationNum,
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        notes: formData.purpose || 'Issued from Loan Application Form',
      });

      setSaveSuccessMsg(`Loan ${loanRes?.loan?.loanNo || ''} and Borrower registered successfully!`);
      try {
        localStorage.removeItem('fintrack_loan_form_draft');
      } catch (e) {}

      if (onLoanCreated) {
        onLoanCreated(loanRes?.loan);
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save loan');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-loan-form');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-loan-form');
    };
  }, []);

  const handlePrint = () => {
    document.body.classList.add('printing-loan-form');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-loan-form');
    }, 1500);
  };

  const toggleBlankMode = () => {
    if (isBlankMode) {
      if (prefillData) {
        setFormData(mapIncomingData(prefillData));
        setIsBlankMode(false);
      }
    } else {
      setFormData(BLANK_FORM_DATA);
      setIsBlankMode(true);
    }
  };

  if (!isOpen) return null;

  // Bilingual Checkbox component
  const renderCheckbox = (isChecked, label) => (
    <span className="inline-flex items-center space-x-1 mr-2 text-[7.5px] print:text-[7.5px] font-semibold text-slate-800 shrink-0">
      <span
        className={`inline-flex items-center justify-center w-3 h-3 border border-[#7f8da8] rounded-[2px] text-[8px] font-black leading-none ${
          isChecked ? 'bg-[#10295c] text-white border-[#10295c]' : 'bg-white text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="text-slate-800 leading-none">{label}</span>
    </span>
  );

  const isHomeOwn = !isBlankMode && (formData.residenceType || '').toLowerCase().includes('own');
  const isHomeRent = !isBlankMode && (formData.residenceType || '').toLowerCase().includes('rent');

  const idTypeStr = (formData.idType || '').toLowerCase();
  const isIdAadhaar = !isBlankMode && (idTypeStr.includes('aadhaar') || idTypeStr.includes('adhar'));
  const isIdVoter = !isBlankMode && (idTypeStr.includes('voter') || idTypeStr.includes('epic'));
  const isIdRation = !isBlankMode && idTypeStr.includes('ration');

  const schemeStr = (formData.scheme || '').toLowerCase();
  const isDaily = !isBlankMode && schemeStr.includes('daily');
  const isWeekly = !isBlankMode && schemeStr.includes('weekly');
  const isMonthly = !isBlankMode && schemeStr.includes('monthly');

  const modalContent = (
    <div
      id="printable-loan-modal-wrapper"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:block print:overflow-visible print:z-auto animate-fade-in print:animate-none"
    >
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-3 sm:p-4 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto print:static print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full print:bg-white print:rounded-none">
        
        {/* Screen Action Bar (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center space-x-2.5">
            <img
              src="/icon-192.png"
              alt="Logo"
              className="w-8 h-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 object-contain"
            />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Loan Application & Promissory Form</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eef2fa] text-[#10295c] font-black border border-[#7f8da8]/40">
                  Strict Single A4 Fit
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                Official Micro Finance Bond • Bilingual Tamil & English • Clean Boxed Grid
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!prefillData && (
              <button
                type="button"
                onClick={handleSaveLoan}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 active:scale-95 transition disabled:opacity-50"
                title="Permanently save this loan and borrower into FinTrack"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save & Store Loan / சேமிக்கவும்'}</span>
              </button>
            )}

            {!prefillData && !isBlankMode && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="p-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold transition flex items-center space-x-1"
                title="Clear draft / படிவத்தை அழிக்க"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {prefillData && (
              <button
                onClick={toggleBlankMode}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 active:scale-95 ${
                  isBlankMode
                    ? 'bg-[#10295c]/10 border-[#10295c] text-[#10295c] dark:text-sky-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isBlankMode ? 'Restore filled loan data' : 'Clear to blank form for handwriting'}
              >
                {isBlankMode ? <RotateCcw className="w-3.5 h-3.5 text-[#10295c]" /> : <FileText className="w-3.5 h-3.5 text-[#10295c]" />}
                <span>{isBlankMode ? 'Show Filled Data' : 'Blank Form'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="bg-[#10295c] hover:bg-[#1d4fa3] text-white flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md shadow-[#10295c]/30 active:scale-95 transition"
            >
              <Printer className="w-3.5 h-3.5 text-[#c8962b]" />
              <span>Print / Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl glass hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-2.5 mb-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-2 print:hidden animate-fade-in shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {saveError && (
          <div className="p-2.5 mb-2 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center space-x-2 print:hidden animate-fade-in shadow-xs">
            <X className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Printable Loan Application Form Sheet (Strict Single A4 Boxed Form) */}
        <div
          id="printable-loan-form"
          ref={printAreaRef}
          className="bg-white text-[#0d1b3e] p-3 sm:p-4 rounded-xl border border-[#7f8da8] print:border-[1.5px] print:border-[#10295c] print:p-2 text-[10px] leading-tight max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-hidden select-text flex flex-col justify-between"
          style={{ fontFamily: "'Poppins', 'Noto Sans Tamil', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
          {/* Top Form Header: Brand, Logo, Badges & Top Right Passport Photo Box */}
          <div className="flex justify-between items-stretch gap-2 pb-1 border-b-[2px] border-[#10295c]">
            {/* Header Left: Logo & Company Identity & Form Banner */}
            <div className="flex flex-col justify-between flex-1 min-w-0 pr-1">
              <div className="flex items-start space-x-2">
                <img
                  src="/icon-192.png"
                  alt="VK Banker's"
                  className="w-10 h-10 object-contain rounded-lg shrink-0 mt-0.5 border border-[#7f8da8]/30 shadow-sm print:w-10 print:h-10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-black text-[16px] tracking-tight text-[#10295c] leading-tight">
                      VK BANKER'S & FINANCE
                    </span>
                    <span className="text-[8.5px] uppercase font-black px-1.5 py-0.5 rounded bg-[#c8962b] text-white tracking-wider shadow-xs">
                      வி.கே. பேங்கர்ஸ்
                    </span>
                  </div>
                  <p className="font-semibold text-[9px] text-[#1d4fa3] mt-0.5 leading-snug">
                    தவணை கடன் வசூல் & நிதி மேலாண்மை நிறுவனம் (Micro Finance & Daily Lending)
                  </p>
                </div>
              </div>

              {/* Form Title Pill */}
              <div className="mt-1 bg-[#10295c] text-white px-2 py-0.5 rounded-[3px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between shadow-xs">
                <span className="font-extrabold text-[8.5px] uppercase tracking-wide">
                  கடன் விண்ணப்பம் & உறுதிமொழிப் பத்திரம் • LOAN APPLICATION & PROMISSORY FORM
                </span>
                <span className="text-[7px] font-semibold text-amber-200">
                  OFFICIAL BOND
                </span>
              </div>

              {/* Top Row: Boxed Application No & Date */}
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <div className="border border-[#7f8da8] bg-[#eef2fa] rounded-[2px] px-2 py-0.5 flex items-center justify-between">
                  <span className="text-[7.5px] font-bold text-[#10295c] uppercase">
                    விண்ணப்ப எண் / Application No:
                  </span>
                  <span className="font-mono font-black text-[9px] text-[#0d1b3e] ml-1">
                    {formData.appNo || '—'}
                  </span>
                </div>
                <div className="border border-[#7f8da8] bg-[#eef2fa] rounded-[2px] px-2 py-0.5 flex items-center justify-between">
                  <span className="text-[7.5px] font-bold text-[#10295c] uppercase">
                    தேதி / Date:
                  </span>
                  <span className="font-mono font-black text-[9px] text-[#0d1b3e] ml-1">
                    {formatDateDisplay(formData.date) || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right: Exact 35mm x 45mm Passport Photo Box */}
            <div
              className="border-2 border-dashed border-[#7f8da8] rounded-[3px] bg-[#f8fafc] flex flex-col items-center justify-center p-1 text-center shrink-0 relative overflow-hidden"
              style={{
                width: '35mm',
                height: '42mm',
                minWidth: '35mm',
                minHeight: '42mm',
                maxWidth: '35mm',
                maxHeight: '42mm',
                boxSizing: 'border-box',
              }}
            >
              {formData.photoUrl ? (
                <img
                  src={formData.photoUrl}
                  alt="Borrower Photo"
                  className="w-full h-full object-cover rounded-sm"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full px-1">
                  <Camera className="w-4 h-4 text-[#7f8da8] mb-0.5" />
                  <span className="text-[6.5px] text-slate-600 font-semibold leading-tight">
                    Passport Size Photo
                  </span>
                  <span className="text-[7px] font-bold text-[#10295c] leading-tight mt-0.5">
                    புகைப்படம் ஒட்டவும்
                  </span>
                  <span className="text-[6px] text-slate-500 font-mono mt-0.5 border-t border-slate-300 pt-0.5 w-full">
                    35 mm × 45 mm
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Borrower Details */}
          <div className="mt-1 print:mt-1">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                1. வாடிக்கையாளர் விவரங்கள் • BORROWER DETAILS
              </span>
              <span className="text-[7px] text-amber-200">KYC & Identity</span>
            </div>

            <div className="border border-[#7f8da8] bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
              {/* Row 1: Full Name & Father/Spouse */}
              <div className="col-span-6 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  முழு பெயர் / Full Name:
                </span>
                {!prefillData ? (
                  <input
                    type="text"
                    value={isBlankMode ? '' : formData.customerName}
                    onChange={(e) => handleFieldChange('customerName', e.target.value)}
                    placeholder="Enter full name..."
                    className="text-[9px] font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[9px] font-bold text-[#0d1b3e] truncate">
                    {isBlankMode ? '' : formData.customerName}
                  </span>
                )}
              </div>

              <div className="col-span-6 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தந்தை / கணவர் பெயர் / Father or Spouse:
                </span>
                {!prefillData ? (
                  <input
                    type="text"
                    value={isBlankMode ? '' : formData.fatherSpouseName}
                    onChange={(e) => handleFieldChange('fatherSpouseName', e.target.value)}
                    placeholder="Father/Spouse..."
                    className="text-[9px] font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[9px] font-bold text-[#0d1b3e] truncate">
                    {isBlankMode ? '' : formData.fatherSpouseName}
                  </span>
                )}
              </div>

              {/* Row 2: Mobile No, Alternate Phone, DOB, Occupation */}
              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கைபேசி எண் / Mobile No:
                </span>
                {!prefillData ? (
                  <input
                    type="tel"
                    value={isBlankMode ? '' : formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="Mobile..."
                    className="text-[8.5px] font-mono font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[8.5px] font-mono font-bold text-[#0d1b3e]">
                    {isBlankMode ? '' : formData.phone}
                  </span>
                )}
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  மாற்று எண் / Alternate Phone:
                </span>
                {!prefillData ? (
                  <input
                    type="tel"
                    value={isBlankMode ? '' : formData.altPhone}
                    onChange={(e) => handleFieldChange('altPhone', e.target.value)}
                    placeholder="Alt phone..."
                    className="text-[8.5px] font-mono font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[8.5px] font-mono font-bold text-[#0d1b3e]">
                    {isBlankMode ? '' : formData.altPhone}
                  </span>
                )}
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  பிறந்த தேதி / Date of Birth:
                </span>
                <span className="text-[8.5px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : formatDateDisplay(formData.dob)}
                </span>
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தொழில் / Occupation:
                </span>
                {!prefillData ? (
                  <input
                    type="text"
                    value={isBlankMode ? '' : formData.occupation}
                    onChange={(e) => handleFieldChange('occupation', e.target.value)}
                    placeholder="Occupation..."
                    className="text-[8.5px] font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                    {isBlankMode ? '' : formData.occupation}
                  </span>
                )}
              </div>

              {/* Row 3: Present Address (Tall Cell) & Area / Monthly Income */}
              <div className="col-span-8 bg-white p-1 flex flex-col justify-between min-h-[34px] print:min-h-[38px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தற்போதைய முகவரி / Present Address:
                </span>
                {!prefillData ? (
                  <input
                    type="text"
                    value={isBlankMode ? '' : formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="Present address..."
                    className="text-[8.5px] font-semibold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[8.5px] font-semibold text-[#0d1b3e] leading-snug line-clamp-2">
                    {isBlankMode ? '' : formData.address}
                  </span>
                )}
              </div>

              <div className="col-span-4 bg-white p-0 flex flex-col">
                <div className="p-1 flex flex-col justify-between border-b border-[#7f8da8] flex-1 min-h-[17px] print:min-h-[19px]">
                  <span className="text-[7px] font-bold text-[#10295c] uppercase">
                    பகுதி / Area:
                  </span>
                  <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                    {isBlankMode ? '' : formData.area}
                  </span>
                </div>
                <div className="p-1 flex flex-col justify-between flex-1 min-h-[17px] print:min-h-[19px]">
                  <span className="text-[7px] font-bold text-[#10295c] uppercase">
                    மாத வருமானம் / Monthly Income:
                  </span>
                  <span className="text-[8.5px] font-bold text-[#0d1b3e]">
                    {isBlankMode ? '' : (formData.monthlyIncome ? `₹ ${formData.monthlyIncome} / Month` : '')}
                  </span>
                </div>
              </div>

              {/* Row 4: Home (Own/Rent) & ID Proof Checkboxes & ID No */}
              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  குடியிருப்பு வகை / Home:
                </span>
                <div className="flex items-center mt-0.5">
                  {renderCheckbox(isHomeOwn, 'சொந்த வீடு / Own')}
                  {renderCheckbox(isHomeRent, 'வாடகை / Rent')}
                </div>
              </div>

              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  அடையாளச் சான்று / ID Proof:
                </span>
                <div className="flex items-center mt-0.5">
                  {renderCheckbox(isIdAadhaar, 'ஆதார்')}
                  {renderCheckbox(isIdVoter, 'வாக்காளர்')}
                  {renderCheckbox(isIdRation, 'ரேஷன்')}
                </div>
              </div>

              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[24px] print:min-h-[26px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  அடையாள எண் / ID No:
                </span>
                <span className="text-[8.5px] font-mono font-bold text-[#0d1b3e] truncate">
                  {isBlankMode ? '' : formData.idNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Loan Particulars & Scheme (Amount in Words Removed, End Date added after Start Date) */}
          <div className="mt-1 print:mt-1">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                2. கடன் விவரங்கள் & திட்டம் • LOAN PARTICULARS & SCHEME
              </span>
              <span className="text-[7px] text-amber-200">Financial Terms</span>
            </div>

            <div className="border border-[#7f8da8] bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
              {/* Row 1: Loan Amount, Scheme Checkboxes, Tenure, Due Amount */}
              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[26px] print:min-h-[28px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கடன் தொகை / LOAN AMOUNT:
                </span>
                {!prefillData ? (
                  <div className="flex items-center">
                    <span className="text-[10px] font-black text-[#10295c] mr-1">₹</span>
                    <input
                      type="number"
                      value={isBlankMode ? '' : formData.loanAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleFieldChange('loanAmount', val);
                        const num = Number(val) || 0;
                        const inst = Math.ceil(num / 100);
                        handleFieldChange('installmentAmount', String(inst));
                      }}
                      placeholder="e.g. 20000"
                      className="text-[10px] font-black text-[#10295c] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                    />
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-[#10295c]">
                    {isBlankMode ? '' : (formData.loanAmount ? `₹ ${formData.loanAmount}` : '')}
                  </span>
                )}
              </div>

              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[26px] print:min-h-[28px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  திட்டம் / SCHEME:
                </span>
                <div className="flex items-center mt-0.5 flex-wrap">
                  {renderCheckbox(isDaily, 'தினசரி / Daily')}
                  {renderCheckbox(isWeekly, 'வாராந்திர')}
                  {renderCheckbox(isMonthly, 'மாதாந்திர')}
                </div>
              </div>

              <div className="col-span-2 bg-white p-1 flex flex-col justify-between min-h-[26px] print:min-h-[28px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கால அளவு / TENURE:
                </span>
                {!prefillData ? (
                  <input
                    type="text"
                    value={isBlankMode ? '' : formData.tenure}
                    onChange={(e) => handleFieldChange('tenure', e.target.value)}
                    placeholder="100 Days"
                    className="text-[8.5px] font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[8.5px] font-bold text-[#0d1b3e]">
                    {isBlankMode ? '' : formData.tenure}
                  </span>
                )}
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[26px] print:min-h-[28px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தவணைத் தொகை / DUE AMOUNT:
                </span>
                {!prefillData ? (
                  <div className="flex items-center">
                    <span className="text-[9.5px] font-black text-[#10295c] mr-1">₹</span>
                    <input
                      type="number"
                      value={isBlankMode ? '' : formData.installmentAmount}
                      onChange={(e) => handleFieldChange('installmentAmount', e.target.value)}
                      placeholder="e.g. 200"
                      className="text-[9.5px] font-black text-[#10295c] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                    />
                  </div>
                ) : (
                  <span className="text-[9.5px] font-black text-[#10295c]">
                    {isBlankMode ? '' : (formData.installmentAmount ? `₹ ${formData.installmentAmount} / தவணை` : '')}
                  </span>
                )}
              </div>

              {/* Row 2: Start Date, End Date, Purpose of Loan (Strictly Balanced 3+3+6 Columns) */}
              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[26px] print:min-h-[28px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  துவக்க தேதி / START DATE:
                </span>
                {!prefillData ? (
                  <input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => {
                      const s = e.target.value;
                      handleFieldChange('startDate', s);
                      try {
                        const d = new Date(s);
                        d.setDate(d.getDate() + 100);
                        handleFieldChange('endDate', d.toISOString().split('T')[0]);
                      } catch (err) {}
                    }}
                    className="text-[8.5px] font-mono font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[8.5px] font-mono font-bold text-[#0d1b3e]">
                    {isBlankMode ? '' : formatDateDisplay(formData.startDate)}
                  </span>
                )}
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[26px] print:min-h-[28px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  முடிவு தேதி / END DATE:
                </span>
                {!prefillData ? (
                  <input
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => handleFieldChange('endDate', e.target.value)}
                    className="text-[8.5px] font-mono font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[8.5px] font-mono font-bold text-[#0d1b3e]">
                    {isBlankMode ? '' : formatDateDisplay(formData.endDate)}
                  </span>
                )}
              </div>

              <div className="col-span-6 bg-white p-1 flex flex-col justify-between min-h-[26px] print:min-h-[28px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கடன் நோக்கம் / PURPOSE OF LOAN:
                </span>
                {!prefillData ? (
                  <input
                    type="text"
                    value={isBlankMode ? '' : formData.purpose}
                    onChange={(e) => handleFieldChange('purpose', e.target.value)}
                    placeholder="Business, tailoring, agriculture..."
                    className="text-[8.5px] font-bold text-[#0d1b3e] bg-transparent outline-none w-full p-0 border-none focus:bg-sky-50/80 rounded print:placeholder-transparent"
                  />
                ) : (
                  <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                    {isBlankMode ? '' : formData.purpose}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Witness & Guarantor Details (Two Side-by-Side Columns) */}
          <div className="mt-1 print:mt-1">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                3. சாட்சிகள் & ஜாமீன்தார்கள் விவரம் • WITNESS & GUARANTOR DETAILS
              </span>
              <span className="text-[7px] text-amber-200">2 Independent Guarantors</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              {/* Witness 1 (Primary Guarantor) */}
              <div className="border border-[#7f8da8] rounded-[2px] overflow-hidden">
                <div className="bg-[#eef2fa] px-1.5 py-0.5 border-b border-[#7f8da8] flex justify-between items-center">
                  <span className="font-black text-[7.5px] text-[#10295c] uppercase">
                    சாட்சி 1 / Witness 1
                  </span>
                  <span className="text-[6.5px] font-bold text-[#1d4fa3] bg-white px-1 py-0.2 rounded border border-[#7f8da8]/40">
                    முதன்மை ஜாமீன்தார் (Primary)
                  </span>
                </div>

                <div className="bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
                  <div className="col-span-12 bg-white p-1 min-h-[20px] print:min-h-[22px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">பெயர் / Full Name:</span>
                    <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                      {isBlankMode ? '' : formData.witness1Name}
                    </span>
                  </div>

                  <div className="col-span-6 bg-white p-1 min-h-[20px] print:min-h-[22px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">கைபேசி / Mobile No:</span>
                    <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                      {isBlankMode ? '' : formData.witness1Phone}
                    </span>
                  </div>

                  <div className="col-span-6 bg-white p-1 min-h-[20px] print:min-h-[22px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">உறவுமுறை / Relation:</span>
                    <span className="text-[8px] font-bold text-[#0d1b3e] truncate">
                      {isBlankMode ? '' : formData.witness1Relation}
                    </span>
                  </div>

                  <div className="col-span-12 bg-white p-1 min-h-[20px] print:min-h-[22px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">ஆதார் எண் / Aadhaar No:</span>
                    <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                      {isBlankMode ? '' : formData.witness1Aadhaar}
                    </span>
                  </div>

                  <div className="col-span-12 bg-white p-1 min-h-[24px] print:min-h-[28px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">முகவரி / Address:</span>
                    <span className="text-[7.5px] font-medium text-[#0d1b3e] line-clamp-2">
                      {isBlankMode ? '' : formData.witness1Address}
                    </span>
                  </div>

                  {/* Witness 1 Signature Cell */}
                  <div className="col-span-12 bg-[#fffdf7] p-1 border-t border-[#7f8da8] min-h-[28px] print:min-h-[34px] flex flex-col justify-between text-center">
                    <div className="flex-1" />
                    <span className="text-[6.5px] font-black text-[#10295c] border-t border-dotted border-[#7f8da8] pt-0.5">
                      சாட்சி 1 கையொப்பம் / Signature of Witness 1
                    </span>
                  </div>
                </div>
              </div>

              {/* Witness 2 (Secondary Guarantor) */}
              <div className="border border-[#7f8da8] rounded-[2px] overflow-hidden">
                <div className="bg-[#eef2fa] px-1.5 py-0.5 border-b border-[#7f8da8] flex justify-between items-center">
                  <span className="font-black text-[7.5px] text-[#10295c] uppercase">
                    சாட்சி 2 / Witness 2
                  </span>
                  <span className="text-[6.5px] font-bold text-[#1d4fa3] bg-white px-1 py-0.2 rounded border border-[#7f8da8]/40">
                    இரண்டாம் ஜாமீன்தார் (Secondary)
                  </span>
                </div>

                <div className="bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
                  <div className="col-span-12 bg-white p-1 min-h-[20px] print:min-h-[22px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">பெயர் / Full Name:</span>
                    <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                      {isBlankMode ? '' : formData.witness2Name}
                    </span>
                  </div>

                  <div className="col-span-6 bg-white p-1 min-h-[20px] print:min-h-[22px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">கைபேசி / Mobile No:</span>
                    <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                      {isBlankMode ? '' : formData.witness2Phone}
                    </span>
                  </div>

                  <div className="col-span-6 bg-white p-1 min-h-[20px] print:min-h-[22px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">உறவுமுறை / Relation:</span>
                    <span className="text-[8px] font-bold text-[#0d1b3e] truncate">
                      {isBlankMode ? '' : formData.witness2Relation}
                    </span>
                  </div>

                  <div className="col-span-12 bg-white p-1 min-h-[20px] print:min-h-[22px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">ஆதார் எண் / Aadhaar No:</span>
                    <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                      {isBlankMode ? '' : formData.witness2Aadhaar}
                    </span>
                  </div>

                  <div className="col-span-12 bg-white p-1 min-h-[24px] print:min-h-[28px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">முகவரி / Address:</span>
                    <span className="text-[7.5px] font-medium text-[#0d1b3e] line-clamp-2">
                      {isBlankMode ? '' : formData.witness2Address}
                    </span>
                  </div>

                  {/* Witness 2 Signature Cell */}
                  <div className="col-span-12 bg-[#fffdf7] p-1 border-t border-[#7f8da8] min-h-[28px] print:min-h-[34px] flex flex-col justify-between text-center">
                    <div className="flex-1" />
                    <span className="text-[6.5px] font-black text-[#10295c] border-t border-dotted border-[#7f8da8] pt-0.5">
                      சாட்சி 2 கையொப்பம் / Signature of Witness 2
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Promissory Undertaking */}
          <div className="mt-1 print:mt-1">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                4. உறுதிமொழிப் பத்திரம் • PROMISSORY UNDERTAKING
              </span>
              <span className="text-[7px] text-amber-200">Legal Declaration</span>
            </div>

            <div className="border border-[#7f8da8] bg-[#f8faff] p-1.5 space-y-1 rounded-b-[2px]">
              <p className="text-[7.5px] font-semibold text-[#0d1b3e] leading-snug text-justify">
                "வி.கே. பேங்கர்ஸ் & பைனான்ஸ் நிறுவனத்திடமிருந்து நான் பெற்றுக்கொண்ட மேற்கண்ட கடன் தொகையினை முழு மனதுடன் ஒப்புக்கொள்கிறேன். நிர்ணயிக்கப்பட்ட தவணைத் தேதிகளில் தவணைத் தொகையை தவறாமல் முகவரிடமோ அல்லது நிறுவன அலுவலகத்திலோ முழுமையாக செலுத்திவிடுவேன் என உறுதியளிக்கிறேன். தவணை தவறும் பட்சத்தில் நிறுவன விதிகளின்படி கூடுதல் நடவடிக்கைகளை ஏற்க சம்மதிக்கிறேன்."
              </p>
              <p className="text-[6.5px] font-normal text-slate-600 leading-snug italic text-justify border-t border-slate-200 pt-0.5">
                "I hereby acknowledge receipt of the above-mentioned loan amount from VK BANKER'S & FINANCE. I unconditionally promise and undertake to repay the loan installments on or before the due dates without default. In case of any delay or default, I agree to abide by the rules and charges of the institution."
              </p>
            </div>
          </div>

          {/* Section 5: Signatures & Verification */}
          <div className="mt-1 print:mt-1">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                5. கையொப்பங்கள் & உறுதிப்படுத்தல் • SIGNATURES & VERIFICATION
              </span>
              <span className="text-[7px] text-amber-200">Official Sign-off</span>
            </div>

            <div className="border border-[#7f8da8] bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
              {/* Borrower Signature Cell */}
              <div className="col-span-6 bg-white p-1.5 flex flex-col justify-between min-h-[36px] print:min-h-[44px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கடன் பெறுபவர் கையொப்பம் / Borrower Signature:
                </span>
                <div className="flex-1" />
                <div className="border-t border-dotted border-[#7f8da8] pt-0.5 flex justify-between items-center text-[6.5px] text-slate-500">
                  <span className="font-bold text-[#0d1b3e]">கடன் பெறுபவரின் முழு கையொப்பம்</span>
                  <span>(Applicant Sign)</span>
                </div>
              </div>

              {/* Place & Date Cell */}
              <div className="col-span-3 bg-white p-1.5 flex flex-col justify-between min-h-[36px] print:min-h-[44px]">
                <div className="space-y-1">
                  <div className="text-[7px]">
                    <span className="font-bold text-[#10295c]">இடம் / Place: </span>
                    <span className="font-bold text-[#0d1b3e]">{isBlankMode ? '' : (formData.place || '')}</span>
                  </div>
                  <div className="text-[7px]">
                    <span className="font-bold text-[#10295c]">தேதி / Date: </span>
                    <span className="font-mono font-bold text-[#0d1b3e]">{formatDateDisplay(formData.date) || ''}</span>
                  </div>
                </div>
                <div className="border-t border-dotted border-[#7f8da8] pt-0.5 text-[6px] text-slate-500 text-center">
                  இடம் மற்றும் தேதி பதிவு
                </div>
              </div>

              {/* Verification & Officer Sign */}
              <div className="col-span-3 bg-white p-1.5 flex flex-col justify-between min-h-[36px] print:min-h-[44px] text-center">
                <span className="text-[7px] font-bold text-[#10295c] uppercase text-left">
                  கள அலுவலர் / நிர்வாகி:
                </span>
                <div className="flex-1" />
                <div className="border-t border-dotted border-[#7f8da8] pt-0.5 text-[6.5px] text-[#10295c] font-bold">
                  சரிபார்ப்பு / Authorized Signatory
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: For Office Use Only */}
          <div className="mt-1 print:mt-1 border-[1.5px] border-dashed border-[#c8962b] bg-[#fffdf7] p-1 rounded-[2px]">
            <div className="flex items-center justify-between px-1 pb-0.5 border-b border-[#c8962b]/30">
              <span className="font-black text-[7.5px] text-[#c8962b] uppercase tracking-wider flex items-center gap-1">
                <span>★</span>
                <span>அலுவலக உபயோகத்திற்கு மட்டும் / FOR OFFICE USE ONLY</span>
              </span>
              <span className="text-[6.5px] text-slate-500 font-mono">Disbursement Audit</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-0.5 px-1">
              <div className="border-b border-dotted border-[#7f8da8] pb-0.5 flex flex-col">
                <span className="text-[6.5px] font-bold text-[#10295c] uppercase">அனுமதித்தவர் / Approved By:</span>
                <span className="text-[8px] font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : (formData.approvedBy || '')}
                </span>
              </div>

              <div className="border-b border-dotted border-[#7f8da8] pb-0.5 flex flex-col">
                <span className="text-[6.5px] font-bold text-[#10295c] uppercase">வழங்கப்பட்ட தேதி / Disbursed On:</span>
                <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : (formatDateDisplay(formData.disbursedOn) || '')}
                </span>
              </div>

              <div className="border-b border-dotted border-[#7f8da8] pb-0.5 flex flex-col">
                <span className="text-[6.5px] font-bold text-[#10295c] uppercase">ரசீது எண் / Receipt No:</span>
                <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : (formData.receiptNo || '')}
                </span>
              </div>
            </div>
          </div>

          {/* Official Clean Footer */}
          <div className="mt-1 print:mt-1 pt-0.5 border-t border-[#7f8da8] text-center text-[7px] text-slate-600 flex items-center justify-between">
            <span className="font-bold text-[#10295c]">
              VK BANKER'S & FINANCE • Trust • Transparency • Service
            </span>
            <span className="text-slate-500 font-medium">
              வி.கே. பேங்கர்ஸ் & பைனான்ஸ் • நம்பிக்கை • வெளிப்படைத்தன்மை • சேவை
            </span>
            <span className="font-mono text-[6.5px] text-slate-400">
              Form Ref: VK-A4-2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default LoanApplicationFormModal;
