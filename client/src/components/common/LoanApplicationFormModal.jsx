import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  Printer,
  Download,
  User,
  ShieldCheck,
  FileText,
  Building,
  CheckCircle,
  Users,
  Calendar,
} from 'lucide-react';

export const LoanApplicationFormModal = ({ isOpen, onClose, prefillData = null }) => {
  const { lang } = useLanguage();
  const printAreaRef = useRef(null);

  const [formData, setFormData] = useState({
    appNo: prefillData?.appNo || `VK-AF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: prefillData?.date || new Date().toISOString().split('T')[0],
    customerName: prefillData?.customerName || '',
    fatherSpouseName: prefillData?.fatherSpouseName || '',
    phone: prefillData?.phone || '',
    altPhone: prefillData?.altPhone || '',
    address: prefillData?.address || '',
    area: prefillData?.area || '',
    idType: prefillData?.idType || 'Aadhaar',
    idNumber: prefillData?.idNumber || '',
    occupation: prefillData?.occupation || '',
    monthlyIncome: prefillData?.monthlyIncome || '',
    residenceType: prefillData?.residenceType || 'Own',
    loanAmount: prefillData?.loanAmount || '',
    loanAmountWords: prefillData?.loanAmountWords || '',
    purpose: prefillData?.purpose || 'Business / தொழில் வளர்ச்சி',
    scheme: prefillData?.scheme || 'daily',
    tenure: prefillData?.tenure || '100 Days',
    installmentAmount: prefillData?.installmentAmount || '',
    docFee: prefillData?.docFee || '',
    // Witness 1
    witness1Name: prefillData?.witness1Name || '',
    witness1Phone: prefillData?.witness1Phone || '',
    witness1Relation: prefillData?.witness1Relation || '',
    witness1Address: prefillData?.witness1Address || '',
    witness1Aadhaar: prefillData?.witness1Aadhaar || '',
    // Witness 2
    witness2Name: prefillData?.witness2Name || '',
    witness2Phone: prefillData?.witness2Phone || '',
    witness2Relation: prefillData?.witness2Relation || '',
    witness2Address: prefillData?.witness2Address || '',
    witness2Aadhaar: prefillData?.witness2Aadhaar || '',
  });

  const [isBlankMode, setIsBlankMode] = useState(!prefillData);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white animate-fade-in">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto print:border-none print:shadow-none print:max-w-none print:m-0 print:p-0 print:rounded-none">
        
        {/* Screen-Only Header & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Loan Application Form / கடன் விண்ணப்பப் படிவம்
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Print or download official printable form with photo box, witness details & promissory bond
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBlankMode(!isBlankMode)}
              className="px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 glass text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 transition active:scale-95"
            >
              {isBlankMode ? 'Fill Details / நிரப்புக' : 'Blank Form / வெற்றுப் படிவம்'}
            </button>

            <button
              onClick={handlePrint}
              className="btn-sky-primary flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-sky-500/25 active:scale-95 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl glass hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Loan Application Form Sheet (A4 Styled) */}
        <div
          id="printable-loan-form"
          ref={printAreaRef}
          className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border-2 border-slate-300 print:border-none print:p-0 print:text-black font-sans text-xs leading-relaxed max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible"
        >
          {/* Top Form Header: Brand & Photo Corner */}
          <div className="flex justify-between items-start gap-4 pb-4 border-b-2 border-slate-900">
            {/* Left: Organization Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-black text-2xl tracking-tight text-sky-900">
                  VK BANKER'S & FINANCE
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  வி.கே. பேங்கர்ஸ்
                </span>
              </div>
              <p className="font-bold text-xs text-slate-700 mt-0.5">
                தவணை கடன் வசூல் & நிதி மேலாண்மை நிறுவனம் (Finance & Micro Lending)
              </p>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                📍 45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu.<br />
                📞 Cell: <strong>+91 98421 12345</strong> | Owner: <strong>Vasantha Kumar K</strong> | Field Agent: <strong>Magimaidoss M</strong>
              </p>
              <div className="mt-2 inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-[11px] font-black uppercase text-slate-800">
                கடன் விண்ணப்பம் & உறுதிமொழிப் பத்திரம் / LOAN APPLICATION & PROMISSORY FORM
              </div>
            </div>

            {/* Top Right Corner: Customer Photo Box */}
            <div className="w-28 h-32 border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center p-2 text-center bg-slate-50 shrink-0">
              <User className="w-8 h-8 text-slate-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-800 leading-tight">
                புகைப்படம் ஒட்டவும்
              </span>
              <span className="text-[9px] text-slate-500">
                Affix Passport Photo
              </span>
            </div>
          </div>

          {/* Form Meta row */}
          <div className="flex justify-between items-center py-2 text-[11px] font-semibold text-slate-700 border-b border-slate-300">
            <div>
              விண்ணப்ப எண் / Application No: <span className="font-mono font-bold text-slate-900">{formData.appNo}</span>
            </div>
            <div>
              தேதி / Date: <span className="font-mono font-bold text-slate-900">{formData.date}</span>
            </div>
          </div>

          {/* Section 1: Customer Personal Details (WITHOUT BANK DETAILS) */}
          <div className="mt-3">
            <h4 className="font-black text-xs uppercase bg-slate-100 p-1.5 border-l-4 border-sky-600 text-slate-900">
              1. வாடிக்கையாளர் விவரங்கள் / Borrower Details (Without Bank Details)
            </h4>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-2">
              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">முழு பெயர் / Full Name: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '_____________________________' : formData.customerName}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">தந்தை / கணவர் பெயர் / Father or Spouse: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '_____________________________' : formData.fatherSpouseName}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">கைபேசி எண் / Mobile No: </span>
                <span className="font-bold font-mono text-slate-900">{isBlankMode ? '_____________________________' : formData.phone}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">மாற்று எண் / Alternate Phone: </span>
                <span className="font-bold font-mono text-slate-900">{isBlankMode ? '_____________________________' : formData.altPhone}</span>
              </div>

              <div className="col-span-2 border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">தற்போதைய முகவரி / Residential Address: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '____________________________________________________________________________________' : formData.address}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">பகுதி / Area: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '_____________________________' : formData.area}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">அடையாள அட்டை / ID Proof ({formData.idType}): </span>
                <span className="font-bold font-mono text-slate-900">{isBlankMode ? '_____________________________' : formData.idNumber}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">தொழில் / வியாபாரம் / Occupation: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '_____________________________' : formData.occupation}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">மாத வருமானம் / Monthly Income: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '₹ ___________________________' : (formData.monthlyIncome ? `₹ ${formData.monthlyIncome}` : '____________________')}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Loan Requirements & Terms */}
          <div className="mt-4">
            <h4 className="font-black text-xs uppercase bg-slate-100 p-1.5 border-l-4 border-amber-600 text-slate-900">
              2. கடன் விபரங்கள் / Loan Particulars & Scheme
            </h4>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-2">
              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">கேட்கப்படும் கடன் தொகை / Loan Amount: </span>
                <span className="font-black text-slate-900">{isBlankMode ? '₹ ___________________________' : `₹ ${formData.loanAmount}`}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">எழுத்தால் / In Words: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '_____________________________' : formData.loanAmountWords}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">கடன் வகை / Finance Scheme: </span>
                <span className="font-bold text-slate-900">
                  {isBlankMode ? '[  ] Daily Thandal   [  ] Weekly   [  ] Monthly' : formData.scheme.toUpperCase()}
                </span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">தவணை காலம் / Tenure: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '_______ Days / Weeks / Months' : formData.tenure}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">தவணைத் தொகை / Installment Due: </span>
                <span className="font-black text-slate-900">{isBlankMode ? '₹ _________ per Installment' : `₹ ${formData.installmentAmount}`}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-1">
                <span className="text-slate-600">கடன் நோக்கம் / Purpose: </span>
                <span className="font-bold text-slate-900">{isBlankMode ? '_____________________________' : formData.purpose}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Witness Details & Signatures */}
          <div className="mt-4">
            <h4 className="font-black text-xs uppercase bg-slate-100 p-1.5 border-l-4 border-emerald-600 text-slate-900">
              3. சாட்சிகள் & ஜாமீன்தார்கள் விவரம் / Witness & Guarantor Details
            </h4>

            <div className="grid grid-cols-2 gap-4 mt-2">
              {/* Witness 1 */}
              <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50/60 space-y-1.5">
                <p className="font-black text-[11px] text-slate-900 border-b border-slate-300 pb-1 flex items-center justify-between">
                  <span>சாட்சி 1 / WITNESS 1</span>
                  <span className="text-[9px] text-slate-500 font-normal">Primary Guarantor</span>
                </p>
                <p><span className="text-slate-600">பெயர் / Name:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________' : formData.witness1Name}</strong></p>
                <p><span className="text-slate-600">கைபேசி / Mobile:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________' : formData.witness1Phone}</strong></p>
                <p><span className="text-slate-600">உறவு / Relation:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________' : formData.witness1Relation}</strong></p>
                <p><span className="text-slate-600">ஆதார் / Aadhaar:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________' : formData.witness1Aadhaar}</strong></p>
                <p><span className="text-slate-600">முகவரி / Address:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________________' : formData.witness1Address}</strong></p>
                
                <div className="pt-8 text-center border-t border-dotted border-slate-400 mt-3">
                  <p className="text-[10px] font-bold text-slate-800">சாட்சி 1 கையொப்பம்</p>
                  <p className="text-[9px] text-slate-500">Signature of Witness 1</p>
                </div>
              </div>

              {/* Witness 2 */}
              <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50/60 space-y-1.5">
                <p className="font-black text-[11px] text-slate-900 border-b border-slate-300 pb-1 flex items-center justify-between">
                  <span>சாட்சி 2 / WITNESS 2</span>
                  <span className="text-[9px] text-slate-500 font-normal">Secondary Guarantor</span>
                </p>
                <p><span className="text-slate-600">பெயர் / Name:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________' : formData.witness2Name}</strong></p>
                <p><span className="text-slate-600">கைபேசி / Mobile:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________' : formData.witness2Phone}</strong></p>
                <p><span className="text-slate-600">உறவு / Relation:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________' : formData.witness2Relation}</strong></p>
                <p><span className="text-slate-600">ஆதார் / Aadhaar:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________' : formData.witness2Aadhaar}</strong></p>
                <p><span className="text-slate-600">முகவரி / Address:</span> <strong className="text-slate-900">{isBlankMode ? '_________________________________' : formData.witness2Address}</strong></p>
                
                <div className="pt-8 text-center border-t border-dotted border-slate-400 mt-3">
                  <p className="text-[10px] font-bold text-slate-800">சாட்சி 2 கையொப்பம்</p>
                  <p className="text-[9px] text-slate-500">Signature of Witness 2</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Promissory Note & Legal Declaration */}
          <div className="mt-4 p-3 rounded-lg border border-slate-300 bg-slate-50/80 space-y-1 text-[11px]">
            <p className="font-black text-slate-900">உறுதிமொழிப் பத்திரம் / PROMISSORY UNDERTAKING:</p>
            <p className="text-slate-700 leading-relaxed text-justify">
              "வி.கே. பேங்கர்ஸ் & பைனான்ஸ் நிறுவனத்திடமிருந்து நான் பெற்றுக்கொண்ட மேற்கண்ட கடன் தொகையினை முழு மனதுடன் ஒப்புக்கொள்கிறேன். நிர்ணயிக்கப்பட்ட தவணைத் தேதிகளில் தவணைத் தொகையை தவறாமல் முகவரிடமோ அல்லது நிறுவன அலுவலகத்திலோ செலுத்திவிடுவேன் என உறுதியளிக்கிறேன். ஒருவேளை தவணை தவறும் பட்சத்தில் நிறுவன விதிகளின்படி கூடுதல் தாமதக் கட்டணத்தை ஏற்க சம்மதிக்கிறேன்."
            </p>
          </div>

          {/* Section 5: Signature Blocks */}
          <div className="grid grid-cols-3 gap-4 pt-10 mt-4 border-t-2 border-slate-800 text-center text-xs">
            {/* Customer Sign */}
            <div className="space-y-1">
              <div className="w-24 h-14 border border-dashed border-slate-400 rounded mx-auto flex items-center justify-center text-[9px] text-slate-400 mb-1">
                இடது பெருவிரல் ரேகை / Thumb
              </div>
              <p className="font-bold text-slate-900">வாடிக்கையாளர் கையொப்பம்</p>
              <p className="text-[10px] text-slate-500">Borrower Signature</p>
            </div>

            {/* Field Agent Sign */}
            <div className="space-y-1">
              <div className="h-14 flex items-end justify-center mb-1">
                <span className="font-mono text-xs text-slate-600">Magimaidoss M</span>
              </div>
              <p className="font-bold text-slate-900">சரிபார்த்த முகவர் கையொப்பம்</p>
              <p className="text-[10px] text-slate-500">Field Agent (Magimaidoss M)</p>
            </div>

            {/* Owner Authorized Sign */}
            <div className="space-y-1">
              <div className="h-14 flex items-end justify-center mb-1">
                <span className="font-mono font-bold text-xs text-slate-800">Vasantha Kumar K</span>
              </div>
              <p className="font-bold text-slate-900">நிர்வாகி / அங்கீகரிக்கப்பட்ட கையொப்பம்</p>
              <p className="text-[10px] text-slate-500">Authorized Signatory (Vasantha Kumar K)</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
            VK BANKER'S & FINANCE • 45, Cross Cut Road, Gandhipuram, Coimbatore - 641012 • Ph: +91 98421 12345
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanApplicationFormModal;
