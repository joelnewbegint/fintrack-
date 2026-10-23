import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  Printer,
  FileText,
  Sparkles,
  Camera,
  CheckCircle2,
} from 'lucide-react';

// Dignified Dr. A.P.J. Abdul Kalam Sample Data
const KALAM_SAMPLE_DATA = {
  appNo: 'VK-AF-2026-KALAM',
  date: new Date().toISOString().split('T')[0],
  // 1. Borrower Details
  customerName: 'Dr. A.P.J. Abdul Kalam / டாக்டர் ஏ.பி.ஜே. அப்துல் கலாம்',
  fatherSpouseName: 'Jainulabdeen / ஜைனுலாப்தீன்',
  phone: '+91 94431 10150',
  altPhone: '+91 98401 20150',
  address: 'House of Kalam, Mosque Street, Rameswaram, Ramanathapuram Dist, Tamil Nadu - 623526',
  area: 'Rameswaram / ராமேஸ்வரம்',
  dob: '15-10-1931',
  occupation: 'Aerospace Scientist & Author / விஞ்ஞானி & எழுத்தாளர்',
  monthlyIncome: '75,000',
  residenceType: 'Own', // 'Own' or 'Rent'
  idType: 'Aadhaar', // 'Aadhaar', 'Voter ID', 'Ration Card'
  idNumber: '1931 1015 2015',
  photoUrl: '', // Optional uploaded photo

  // 2. Loan Particulars & Scheme
  loanAmount: '50,000',
  tenure: '100 Days / 100 நாட்கள்',
  installmentAmount: '500',
  scheme: 'daily', // 'daily', 'weekly', 'monthly'
  startDate: new Date().toISOString().split('T')[0],
  purpose: 'Higher Education & Student Guidance / கல்வி & மாணவர் வழிகாட்டல்',
  loanAmountWords: 'ஐம்பதாயிரம் ரூபாய் மட்டும் / Fifty Thousand Rupees Only',

  // 3. Witness & Guarantor Details
  witness1Name: 'Dr. A. Sivathanu Pillai / டாக்டர் ஏ. சிவதாணு பிள்ளை',
  witness1Phone: '+91 94440 12345',
  witness1Relation: 'Colleague Scientist / சக விஞ்ஞானி & நண்பர்',
  witness1Aadhaar: '3456 7890 1234',
  witness1Address: 'DRDO Scientists Quarters, Avadi, Chennai, Tamil Nadu',

  witness2Name: 'Prof. Y.S. Rajan / பேராசிரியர் ஒய். எஸ். ராஜன்',
  witness2Phone: '+91 98410 54321',
  witness2Relation: 'Co-Author & Academician / சக எழுத்தாளர் & ஆலோசகர்',
  witness2Aadhaar: '7890 1234 5678',
  witness2Address: 'TIFAC, Technology Bhavan, New Delhi / Bengaluru',

  // 5. Signatures Meta
  place: 'Rameswaram / ராமேஸ்வரம்',

  // 6. Office Use Only
  approvedBy: 'Managing Director / நிர்வாக இயக்குநர்',
  disbursedOn: new Date().toISOString().split('T')[0],
  receiptNo: 'VK-REC-2026-0942',
};

const BLANK_FORM_DATA = {
  appNo: `VK-AF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
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
  tenure: '100 Days',
  installmentAmount: '',
  scheme: 'daily',
  startDate: '',
  purpose: '',
  loanAmountWords: '',
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

// Safe helper to map arbitrary prefill data into standard form schema
const mapIncomingData = (data) => {
  if (!data) return KALAM_SAMPLE_DATA;
  return {
    appNo: data.appNo || data.loanNo || `VK-AF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: data.date || (data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    customerName: data.customerName || data.name || '',
    fatherSpouseName: data.fatherSpouseName || '',
    phone: data.phone || '',
    altPhone: data.altPhone || '',
    address: data.address || '',
    area: data.area || '',
    dob: data.dob || data.dateOfBirth || '',
    occupation: data.occupation || '',
    monthlyIncome: data.monthlyIncome ? String(data.monthlyIncome) : '',
    residenceType: data.residenceType || 'Own',
    idType: data.idProofType || data.idType || 'Aadhaar',
    idNumber: data.idProofNumber || data.idNumber || '',
    photoUrl: data.photoUrl || data.photo || '',
    loanAmount: data.loanAmount ? String(data.loanAmount) : (data.principal ? String(data.principal) : ''),
    tenure: data.tenure || (data.duration ? `${data.duration} Days` : '100 Days'),
    installmentAmount: data.installmentAmount ? String(data.installmentAmount) : '',
    scheme: data.scheme || data.financeType || 'daily',
    startDate: data.startDate ? (typeof data.startDate === 'string' ? data.startDate.split('T')[0] : new Date(data.startDate).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
    purpose: data.purpose || data.notes || '',
    loanAmountWords: data.loanAmountWords || '',
    witness1Name: data.witness1Name || data.guarantor?.name || '',
    witness1Phone: data.witness1Phone || data.guarantor?.phone || '',
    witness1Relation: data.witness1Relation || data.guarantor?.relationship || '',
    witness1Aadhaar: data.witness1Aadhaar || '',
    witness1Address: data.witness1Address || data.guarantor?.address || '',
    witness2Name: data.witness2Name || '',
    witness2Phone: data.witness2Phone || '',
    witness2Relation: data.witness2Relation || '',
    witness2Aadhaar: data.witness2Aadhaar || '',
    witness2Address: data.witness2Address || '',
    place: data.place || data.area || '',
    approvedBy: data.approvedBy || '',
    disbursedOn: data.disbursedOn || '',
    receiptNo: data.receiptNo || '',
  };
};

export const LoanApplicationFormModal = ({ isOpen, onClose, prefillData = null }) => {
  const { lang } = useLanguage();
  const printAreaRef = useRef(null);

  const [formData, setFormData] = useState(() => mapIncomingData(prefillData));
  const [isBlankMode, setIsBlankMode] = useState(false);

  useEffect(() => {
    if (prefillData) {
      setFormData(mapIncomingData(prefillData));
      setIsBlankMode(false);
    } else {
      setFormData(KALAM_SAMPLE_DATA);
      setIsBlankMode(false);
    }
  }, [prefillData, isOpen]);

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

  const setKalamSample = () => {
    setFormData(KALAM_SAMPLE_DATA);
    setIsBlankMode(false);
  };

  const setBlank = () => {
    setFormData(BLANK_FORM_DATA);
    setIsBlankMode(true);
  };

  if (!isOpen) return null;

  // Bilingual Checkbox component
  const renderCheckbox = (isChecked, label) => (
    <span className="inline-flex items-center space-x-1 mr-2 text-[8px] font-semibold text-slate-800 shrink-0">
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
                  Strict A4 Fit
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                Boxed cells • Navy & Gold theme • Bilingual Tamil/English • No thumb box
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={setKalamSample}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 active:scale-95 ${
                !isBlankMode && formData.customerName.includes('Kalam')
                  ? 'bg-amber-500/15 border-[#c8962b] text-[#c8962b] dark:text-amber-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Fill Dr. A.P.J. Abdul Kalam Sample Data"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c8962b]" />
              <span>Dr. Kalam Sample</span>
            </button>

            <button
              onClick={setBlank}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 active:scale-95 ${
                isBlankMode
                  ? 'bg-[#10295c]/10 border-[#10295c] text-[#10295c] dark:text-sky-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Clear to blank boxed form for handwriting"
            >
              <FileText className="w-3.5 h-3.5 text-[#10295c]" />
              <span>Blank Form</span>
            </button>

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

        {/* Printable Loan Application Form Sheet (Strict Single A4 Boxed Form) */}
        <div
          id="printable-loan-form"
          ref={printAreaRef}
          className="bg-white text-[#0d1b3e] p-3 sm:p-5 rounded-xl border border-[#7f8da8] print:border-none print:p-0 print:text-[#0d1b3e] text-[10px] leading-tight max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-hidden select-text"
          style={{ fontFamily: "'Poppins', 'Noto Sans Tamil', sans-serif" }}
        >
          {/* Top Form Header: Brand, Logo, Badges & Top Right 35mm x 45mm Photo Box */}
          <div className="flex justify-between items-stretch gap-2.5 pb-1.5 border-b-[2px] border-[#10295c]">
            {/* Header Left: Logo & Company Identity & Form Banner */}
            <div className="flex flex-col justify-between flex-1 min-w-0 pr-1">
              <div className="flex items-start space-x-2.5">
                <img
                  src="/icon-192.png"
                  alt="VK Banker's"
                  className="w-11 h-11 object-contain rounded-xl shrink-0 mt-0.5 border border-[#7f8da8]/30 shadow-sm print:w-11 print:h-11"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-black text-[17px] tracking-tight text-[#10295c] leading-tight">
                      VK BANKER'S & FINANCE
                    </span>
                    <span className="text-[8.5px] uppercase font-black px-1.5 py-0.5 rounded bg-[#c8962b] text-white tracking-wider shadow-xs">
                      வி.கே. பேங்கர்ஸ்
                    </span>
                  </div>
                  <p className="font-semibold text-[9.5px] text-[#1d4fa3] mt-0.5 leading-snug">
                    தவணை கடன் வசூல் & நிதி மேலாண்மை நிறுவனம் (Micro Finance & Daily Lending)
                  </p>
                </div>
              </div>

              {/* Form Title Pill */}
              <div className="mt-1.5 bg-[#10295c] text-white px-2.5 py-0.5 rounded-[3px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between shadow-xs">
                <span className="font-extrabold text-[9px] uppercase tracking-wide">
                  கடன் விண்ணப்பம் & உறுதிமொழிப் பத்திரம் • LOAN APPLICATION & PROMISSORY FORM
                </span>
                <span className="text-[7.5px] font-medium text-amber-200 opacity-90 hidden sm:inline">
                  Strict Single A4 Format
                </span>
              </div>

              {/* Top Row: Boxed Application No & Date */}
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <div className="border border-[#7f8da8] bg-[#eef2fa] rounded-[2px] px-2 py-0.5 flex items-center justify-between">
                  <span className="text-[7.5px] font-bold text-[#10295c] uppercase">
                    விண்ணப்ப எண் / Application No:
                  </span>
                  <span className="font-mono font-black text-[9.5px] text-[#0d1b3e] ml-1">
                    {formData.appNo}
                  </span>
                </div>
                <div className="border border-[#7f8da8] bg-[#eef2fa] rounded-[2px] px-2 py-0.5 flex items-center justify-between">
                  <span className="text-[7.5px] font-bold text-[#10295c] uppercase">
                    தேதி / Date:
                  </span>
                  <span className="font-mono font-black text-[9.5px] text-[#0d1b3e] ml-1">
                    {formData.date}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right: Exact 35mm x 45mm Passport Photo Box */}
            <div
              className="border-2 border-dashed border-[#7f8da8] rounded-[3px] bg-[#f8fafc] flex flex-col items-center justify-center p-1 text-center shrink-0 relative overflow-hidden"
              style={{
                width: '35mm',
                height: '45mm',
                minWidth: '35mm',
                minHeight: '45mm',
                maxWidth: '35mm',
                maxHeight: '45mm',
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
                  <Camera className="w-5 h-5 text-[#7f8da8] mb-1" />
                  <span className="text-[7px] text-slate-600 font-semibold leading-tight">
                    Paste Passport Size Photo
                  </span>
                  <span className="text-[7.5px] font-bold text-[#10295c] leading-tight mt-0.5">
                    புகைப்படம் ஒட்டவும்
                  </span>
                  <span className="text-[6.5px] text-slate-500 font-mono mt-1 border-t border-slate-300 pt-0.5 w-full">
                    35 mm × 45 mm
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Borrower Details */}
          <div className="mt-1.5">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                1. வாடிக்கையாளர் விவரங்கள் • BORROWER DETAILS
              </span>
              <span className="text-[7px] text-amber-200">Without Bank Details</span>
            </div>

            <div className="border border-[#7f8da8] bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
              {/* Row 1: Full Name & Father/Spouse */}
              <div className="col-span-6 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  முழு பெயர் / Full Name:
                </span>
                <span className="text-[9.5px] font-bold text-[#0d1b3e] truncate">
                  {isBlankMode ? '' : formData.customerName}
                </span>
              </div>

              <div className="col-span-6 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தந்தை / கணவர் பெயர் / Father or Spouse:
                </span>
                <span className="text-[9.5px] font-bold text-[#0d1b3e] truncate">
                  {isBlankMode ? '' : formData.fatherSpouseName}
                </span>
              </div>

              {/* Row 2: Mobile No, Alternate Phone, DOB, Occupation */}
              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கைபேசி எண் / Mobile No:
                </span>
                <span className="text-[9px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : formData.phone}
                </span>
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  மாற்று எண் / Alternate Phone:
                </span>
                <span className="text-[9px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : formData.altPhone}
                </span>
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  பிறந்த தேதி / Date of Birth:
                </span>
                <span className="text-[9px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : (formData.dob || '—')}
                </span>
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தொழில் / Occupation:
                </span>
                <span className="text-[9px] font-bold text-[#0d1b3e] truncate">
                  {isBlankMode ? '' : formData.occupation}
                </span>
              </div>

              {/* Row 3: Present Address (Tall Cell) & Area / Monthly Income */}
              <div className="col-span-8 bg-white p-1 flex flex-col justify-between min-h-[32px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தற்போதைய முகவரி / Present Address:
                </span>
                <span className="text-[8.5px] font-semibold text-[#0d1b3e] leading-snug line-clamp-2">
                  {isBlankMode ? '' : formData.address}
                </span>
              </div>

              <div className="col-span-4 bg-white p-0 flex flex-col">
                <div className="p-1 flex flex-col justify-between border-b border-[#7f8da8] flex-1">
                  <span className="text-[7px] font-bold text-[#10295c] uppercase">
                    பகுதி / Area:
                  </span>
                  <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                    {isBlankMode ? '' : formData.area}
                  </span>
                </div>
                <div className="p-1 flex flex-col justify-between flex-1">
                  <span className="text-[7px] font-bold text-[#10295c] uppercase">
                    மாத வருமானம் / Monthly Income:
                  </span>
                  <span className="text-[8.5px] font-bold text-[#0d1b3e]">
                    {isBlankMode ? '' : (formData.monthlyIncome ? `₹ ${formData.monthlyIncome} / Month` : '')}
                  </span>
                </div>
              </div>

              {/* Row 4: Home (Own/Rent) & ID Proof Checkboxes & ID No */}
              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  குடியிருப்பு வகை / Home:
                </span>
                <div className="flex items-center mt-0.5">
                  {renderCheckbox(isHomeOwn, 'சொந்த வீடு / Own')}
                  {renderCheckbox(isHomeRent, 'வாடகை / Rent')}
                </div>
              </div>

              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  அடையாளச் சான்று / ID Proof:
                </span>
                <div className="flex items-center mt-0.5">
                  {renderCheckbox(isIdAadhaar, 'ஆதார்')}
                  {renderCheckbox(isIdVoter, 'வாக்காளர்')}
                  {renderCheckbox(isIdRation, 'ரேஷன்')}
                </div>
              </div>

              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[22px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  அடையாள எண் / ID No:
                </span>
                <span className="text-[9px] font-mono font-bold text-[#0d1b3e] truncate">
                  {isBlankMode ? '' : formData.idNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Loan Particulars & Scheme */}
          <div className="mt-1.5">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                2. கடன் விவரங்கள் & திட்டம் • LOAN PARTICULARS & SCHEME
              </span>
              <span className="text-[7px] text-amber-200">Financial Terms</span>
            </div>

            <div className="border border-[#7f8da8] bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
              {/* Row 1: Loan Amount, Scheme Checkboxes, Tenure, Due Amount */}
              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[24px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கடன் தொகை / Loan Amount:
                </span>
                <span className="text-[10px] font-black text-[#10295c]">
                  {isBlankMode ? '' : (formData.loanAmount ? `₹ ${formData.loanAmount}` : '')}
                </span>
              </div>

              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[24px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  திட்டம் / Scheme:
                </span>
                <div className="flex items-center mt-0.5 flex-wrap">
                  {renderCheckbox(isDaily, 'தினசரி / Daily')}
                  {renderCheckbox(isWeekly, 'வாராந்திர')}
                  {renderCheckbox(isMonthly, 'மாதாந்திர')}
                </div>
              </div>

              <div className="col-span-2 bg-white p-1 flex flex-col justify-between min-h-[24px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கால அளவு / Tenure:
                </span>
                <span className="text-[9px] font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : formData.tenure}
                </span>
              </div>

              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[24px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தவணைத் தொகை / Due Amount:
                </span>
                <span className="text-[9.5px] font-black text-[#10295c]">
                  {isBlankMode ? '' : (formData.installmentAmount ? `₹ ${formData.installmentAmount} / தவணை` : '')}
                </span>
              </div>

              {/* Row 2: Start Date, Purpose of Loan, Amount in Words */}
              <div className="col-span-3 bg-white p-1 flex flex-col justify-between min-h-[24px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  துவக்க தேதி / Start Date:
                </span>
                <span className="text-[9px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : (formData.startDate || formData.date)}
                </span>
              </div>

              <div className="col-span-4 bg-white p-1 flex flex-col justify-between min-h-[24px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கடன் நோக்கம் / Purpose of Loan:
                </span>
                <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                  {isBlankMode ? '' : formData.purpose}
                </span>
              </div>

              <div className="col-span-5 bg-white p-1 flex flex-col justify-between min-h-[24px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  தொகை எழுத்தால் / Amount in Words:
                </span>
                <span className="text-[8px] font-bold text-[#0d1b3e] italic truncate">
                  {isBlankMode ? '' : formData.loanAmountWords}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Witness & Guarantor Details (Two Side-by-Side Columns) */}
          <div className="mt-1.5">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                3. சாட்சிகள் & ஜாமீன்தார்கள் விவரம் • WITNESS & GUARANTOR DETAILS
              </span>
              <span className="text-[7px] text-amber-200">2 Independent Guarantors</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-0.5">
              {/* Witness 1 (Primary Guarantor) */}
              <div className="border border-[#7f8da8] rounded-[2px] overflow-hidden">
                <div className="bg-[#eef2fa] px-2 py-0.5 border-b border-[#7f8da8] flex justify-between items-center">
                  <span className="font-black text-[8px] text-[#10295c] uppercase">
                    சாட்சி 1 / Witness 1
                  </span>
                  <span className="text-[7px] font-bold text-[#1d4fa3] bg-white px-1 py-0.2 rounded border border-[#7f8da8]/40">
                    முதன்மை ஜாமீன்தார் (Primary)
                  </span>
                </div>

                <div className="bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
                  <div className="col-span-12 bg-white p-1 min-h-[20px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">பெயர் / Full Name:</span>
                    <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                      {isBlankMode ? '' : formData.witness1Name}
                    </span>
                  </div>

                  <div className="col-span-6 bg-white p-1 min-h-[20px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">கைபேசி / Mobile No:</span>
                    <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                      {isBlankMode ? '' : formData.witness1Phone}
                    </span>
                  </div>

                  <div className="col-span-6 bg-white p-1 min-h-[20px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">உறவுமுறை / Relation:</span>
                    <span className="text-[8px] font-bold text-[#0d1b3e] truncate">
                      {isBlankMode ? '' : formData.witness1Relation}
                    </span>
                  </div>

                  <div className="col-span-12 bg-white p-1 min-h-[20px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">ஆதார் எண் / Aadhaar No:</span>
                    <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                      {isBlankMode ? '' : formData.witness1Aadhaar}
                    </span>
                  </div>

                  <div className="col-span-12 bg-white p-1 min-h-[24px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">முகவரி / Address:</span>
                    <span className="text-[7.5px] font-medium text-[#0d1b3e] line-clamp-2">
                      {isBlankMode ? '' : formData.witness1Address}
                    </span>
                  </div>

                  {/* Witness 1 Signature Cell */}
                  <div className="col-span-12 bg-[#fffdf7] p-1 border-t border-[#7f8da8] min-h-[28px] flex flex-col justify-between text-center">
                    <div className="flex-1" />
                    <span className="text-[7px] font-black text-[#10295c] border-t border-dotted border-[#7f8da8] pt-0.5">
                      சாட்சி 1 கையொப்பம் / Signature of Witness 1
                    </span>
                  </div>
                </div>
              </div>

              {/* Witness 2 (Secondary Guarantor) */}
              <div className="border border-[#7f8da8] rounded-[2px] overflow-hidden">
                <div className="bg-[#eef2fa] px-2 py-0.5 border-b border-[#7f8da8] flex justify-between items-center">
                  <span className="font-black text-[8px] text-[#10295c] uppercase">
                    சாட்சி 2 / Witness 2
                  </span>
                  <span className="text-[7px] font-bold text-[#1d4fa3] bg-white px-1 py-0.2 rounded border border-[#7f8da8]/40">
                    இரண்டாம் ஜாமீன்தார் (Secondary)
                  </span>
                </div>

                <div className="bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
                  <div className="col-span-12 bg-white p-1 min-h-[20px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">பெயர் / Full Name:</span>
                    <span className="text-[8.5px] font-bold text-[#0d1b3e] truncate">
                      {isBlankMode ? '' : formData.witness2Name}
                    </span>
                  </div>

                  <div className="col-span-6 bg-white p-1 min-h-[20px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">கைபேசி / Mobile No:</span>
                    <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                      {isBlankMode ? '' : formData.witness2Phone}
                    </span>
                  </div>

                  <div className="col-span-6 bg-white p-1 min-h-[20px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">உறவுமுறை / Relation:</span>
                    <span className="text-[8px] font-bold text-[#0d1b3e] truncate">
                      {isBlankMode ? '' : formData.witness2Relation}
                    </span>
                  </div>

                  <div className="col-span-12 bg-white p-1 min-h-[20px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">ஆதார் எண் / Aadhaar No:</span>
                    <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                      {isBlankMode ? '' : formData.witness2Aadhaar}
                    </span>
                  </div>

                  <div className="col-span-12 bg-white p-1 min-h-[24px] flex flex-col justify-between">
                    <span className="text-[6.5px] font-bold text-[#10295c] uppercase">முகவரி / Address:</span>
                    <span className="text-[7.5px] font-medium text-[#0d1b3e] line-clamp-2">
                      {isBlankMode ? '' : formData.witness2Address}
                    </span>
                  </div>

                  {/* Witness 2 Signature Cell */}
                  <div className="col-span-12 bg-[#fffdf7] p-1 border-t border-[#7f8da8] min-h-[28px] flex flex-col justify-between text-center">
                    <div className="flex-1" />
                    <span className="text-[7px] font-black text-[#10295c] border-t border-dotted border-[#7f8da8] pt-0.5">
                      சாட்சி 2 கையொப்பம் / Signature of Witness 2
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Promissory Undertaking */}
          <div className="mt-1.5">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                4. உறுதிமொழிப் பத்திரம் • PROMISSORY UNDERTAKING
              </span>
              <span className="text-[7px] text-amber-200">Legal Declaration</span>
            </div>

            <div className="border border-[#7f8da8] bg-[#f8faff] p-1.5 space-y-1 rounded-b-[2px]">
              <p className="text-[8px] font-semibold text-[#0d1b3e] leading-snug text-justify">
                "வி.கே. பேங்கர்ஸ் & பைனான்ஸ் நிறுவனத்திடமிருந்து நான் பெற்றுக்கொண்ட மேற்கண்ட கடன் தொகையினை முழு மனதுடன் ஒப்புக்கொள்கிறேன். நிர்ணயிக்கப்பட்ட தவணைத் தேதிகளில் தவணைத் தொகையை தவறாமல் முகவரிடமோ அல்லது நிறுவன அலுவலகத்திலோ முழுமையாக செலுத்திவிடுவேன் என உறுதியளிக்கிறேன். தவணை தவறும் பட்சத்தில் நிறுவன விதிகளின்படி கூடுதல் நடவடிக்கைகளை ஏற்க சம்மதிக்கிறேன்."
              </p>
              <p className="text-[7px] font-normal text-slate-600 leading-snug italic text-justify border-t border-slate-200 pt-0.5">
                "I hereby acknowledge the receipt of the above-mentioned loan amount from VK BANKER'S & FINANCE. I unconditionally promise and undertake to repay the loan installments on or before the due dates without default. In case of any delay or default, I agree to abide by the rules and charges of the institution."
              </p>
            </div>
          </div>

          {/* Section 5: Signatures (NO THUMB IMPRESSION ANYWHERE) */}
          <div className="mt-1.5">
            <div className="bg-[#10295c] text-white px-2 py-0.5 rounded-t-[2px] border-l-[3.5px] border-[#c8962b] flex items-center justify-between">
              <span className="font-black text-[8.5px] uppercase tracking-wide">
                5. கையொப்பங்கள் & உறுதிப்படுத்தல் • SIGNATURES & VERIFICATION
              </span>
              <span className="text-[7px] text-amber-200">Official Sign-off</span>
            </div>

            <div className="border border-[#7f8da8] bg-[#7f8da8] grid grid-cols-12 gap-[1px]">
              {/* Wide Borrower Signature Cell */}
              <div className="col-span-6 bg-white p-1.5 flex flex-col justify-between min-h-[36px]">
                <span className="text-[7px] font-bold text-[#10295c] uppercase">
                  கடன் பெறுபவர் கையொப்பம் / Borrower Signature:
                </span>
                <div className="flex-1" />
                <div className="border-t border-dotted border-[#7f8da8] pt-0.5 flex justify-between items-center text-[7px] text-slate-500">
                  <span className="font-bold text-[#0d1b3e]">கடன் பெறுபவரின் முழு கையொப்பம்</span>
                  <span>(Applicant Sign)</span>
                </div>
              </div>

              {/* Place & Date Cell */}
              <div className="col-span-3 bg-white p-1.5 flex flex-col justify-between min-h-[36px]">
                <div className="space-y-1">
                  <div className="text-[7px]">
                    <span className="font-bold text-[#10295c]">இடம் / Place: </span>
                    <span className="font-bold text-[#0d1b3e]">{isBlankMode ? '' : (formData.place || 'Rameswaram')}</span>
                  </div>
                  <div className="text-[7px]">
                    <span className="font-bold text-[#10295c]">தேதி / Date: </span>
                    <span className="font-mono font-bold text-[#0d1b3e]">{formData.date}</span>
                  </div>
                </div>
                <div className="border-t border-dotted border-[#7f8da8] pt-0.5 text-[6.5px] text-slate-500 text-center">
                  இடம் மற்றும் தேதி பதிவு
                </div>
              </div>

              {/* Verification & Officer Sign */}
              <div className="col-span-3 bg-white p-1.5 flex flex-col justify-between min-h-[36px] text-center">
                <span className="text-[7px] font-bold text-[#10295c] uppercase text-left">
                  கள அலுவலர் / நிர்வாகி:
                </span>
                <div className="flex-1" />
                <div className="border-t border-dotted border-[#7f8da8] pt-0.5 text-[7px] text-[#10295c] font-bold">
                  சரிபார்ப்பு / Authorized Signatory
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: For Office Use Only (Gold Dashed Style) */}
          <div className="mt-1.5 border-[1.5px] border-dashed border-[#c8962b] bg-[#fffdf7] p-1 rounded-[2px]">
            <div className="flex items-center justify-between px-1 pb-0.5 border-b border-[#c8962b]/30">
              <span className="font-black text-[7.5px] text-[#c8962b] uppercase tracking-wider flex items-center gap-1">
                <span>★</span>
                <span>அலுவலக உபயோகத்திற்கு மட்டும் / FOR OFFICE USE ONLY</span>
              </span>
              <span className="text-[6.5px] text-slate-500 font-mono">Disbursement Audit</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-1 px-1">
              <div className="border-b border-dotted border-[#7f8da8] pb-0.5 flex flex-col">
                <span className="text-[6.5px] font-bold text-[#10295c] uppercase">அனுமதித்தவர் / Approved By:</span>
                <span className="text-[8px] font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : (formData.approvedBy || 'Managing Director / நிர்வாக இயக்குநர்')}
                </span>
              </div>

              <div className="border-b border-dotted border-[#7f8da8] pb-0.5 flex flex-col">
                <span className="text-[6.5px] font-bold text-[#10295c] uppercase">வழங்கப்பட்ட தேதி / Disbursed On:</span>
                <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : (formData.disbursedOn || formData.date)}
                </span>
              </div>

              <div className="border-b border-dotted border-[#7f8da8] pb-0.5 flex flex-col">
                <span className="text-[6.5px] font-bold text-[#10295c] uppercase">ரசீது எண் / Receipt No:</span>
                <span className="text-[8px] font-mono font-bold text-[#0d1b3e]">
                  {isBlankMode ? '' : (formData.receiptNo || 'VK-REC-2026-0942')}
                </span>
              </div>
            </div>
          </div>

          {/* Official Clean Footer */}
          <div className="mt-1.5 pt-1 border-t border-[#7f8da8] text-center text-[7.5px] text-slate-600 flex items-center justify-between">
            <span className="font-bold text-[#10295c]">
              VK BANKER'S & FINANCE • Trust • Transparency • Service
            </span>
            <span className="text-slate-500 font-medium">
              வி.கே. பேங்கர்ஸ் & பைனான்ஸ் • நம்பிக்கை • வெளிப்படைத்தன்மை • சேவை
            </span>
            <span className="font-mono text-[7px] text-slate-400">
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
