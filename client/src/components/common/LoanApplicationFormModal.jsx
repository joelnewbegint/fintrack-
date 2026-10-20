import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  Printer,
  User,
  FileText,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

// Dignified Dr. A.P.J. Abdul Kalam Sample Data
const KALAM_SAMPLE_DATA = {
  appNo: 'VK-AF-2026-KALAM',
  date: new Date().toISOString().split('T')[0],
  customerName: 'Dr. A.P.J. Abdul Kalam / டாக்டர் ஏ.பி.ஜே. அப்துல் கலாம்',
  fatherSpouseName: 'Jainulabdeen / ஜைனுலாப்தீன்',
  phone: '+91 94431 10150',
  altPhone: '+91 98401 20150',
  address: 'House of Kalam, Mosque Street, Rameswaram, Ramanathapuram Dist, Tamil Nadu - 623526',
  area: 'Rameswaram / ராமேஸ்வரம்',
  idType: 'Aadhaar Card',
  idNumber: '1931 1015 2015',
  occupation: 'Aerospace Scientist & Educator / விஞ்ஞானி & கல்வியாளர்',
  monthlyIncome: '75,000',
  residenceType: 'Own House / பூர்வீக சொந்த வீடு',
  loanAmount: '50,000',
  loanAmountWords: 'Fifty Thousand Rupees Only / ஐம்பதாயிரம் ரூபாய் மட்டும்',
  purpose: 'Higher Education & Student Guidance / கல்வி & மாணவர் வழிகாட்டல்',
  scheme: 'daily',
  tenure: '100 Days / 100 நாட்கள்',
  installmentAmount: '500',
  docFee: '500',
  // Witness 1
  witness1Name: 'Dr. A. Sivathanu Pillai / டாக்டர் ஏ. சிவதாணு பிள்ளை',
  witness1Phone: '+91 94440 12345',
  witness1Relation: 'Colleague Scientist / சக விஞ்ஞானி & நண்பர்',
  witness1Address: 'DRDO Scientists Quarters, Avadi, Chennai, Tamil Nadu',
  witness1Aadhaar: '3456 7890 1234',
  // Witness 2
  witness2Name: 'Prof. Y.S. Rajan / பேராசிரியர் ஒய். எஸ். ராஜன்',
  witness2Phone: '+91 98410 54321',
  witness2Relation: 'Co-Author & Academician / சக எழுத்தாளர் & ஆலோசகர்',
  witness2Address: 'TIFAC, Technology Bhavan, New Delhi / Bengaluru',
  witness2Aadhaar: '7890 1234 5678',
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
  idType: 'Aadhaar',
  idNumber: '',
  occupation: '',
  monthlyIncome: '',
  residenceType: 'Own',
  loanAmount: '',
  loanAmountWords: '',
  purpose: '',
  scheme: 'daily',
  tenure: '100 Days',
  installmentAmount: '',
  docFee: '',
  witness1Name: '',
  witness1Phone: '',
  witness1Relation: '',
  witness1Address: '',
  witness1Aadhaar: '',
  witness2Name: '',
  witness2Phone: '',
  witness2Relation: '',
  witness2Address: '',
  witness2Aadhaar: '',
};

export const LoanApplicationFormModal = ({ isOpen, onClose, prefillData = null }) => {
  const { lang } = useLanguage();
  const printAreaRef = useRef(null);

  // Default to Kalam sample data if no prefillData provided; otherwise use prefillData
  const [formData, setFormData] = useState(prefillData || KALAM_SAMPLE_DATA);
  const [isBlankMode, setIsBlankMode] = useState(false);

  // Update when prefillData or isOpen changes
  useEffect(() => {
    if (prefillData) {
      setFormData(prefillData);
      setIsBlankMode(false);
    } else {
      setFormData(KALAM_SAMPLE_DATA);
      setIsBlankMode(false);
    }
  }, [prefillData, isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const setKalamSample = () => {
    setFormData(KALAM_SAMPLE_DATA);
    setIsBlankMode(false);
  };

  const setBlank = () => {
    setFormData(BLANK_FORM_DATA);
    setIsBlankMode(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white animate-fade-in">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto print:border-none print:shadow-none print:max-w-none print:m-0 print:p-0 print:rounded-none">
        
        {/* Screen-Only Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center space-x-3">
            <img
              src="/icon-192.png"
              alt="Logo"
              className="w-9 h-9 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 object-contain"
            />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Loan Application Form</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold">
                  Single A4 Fit
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official printable document with logo, photo box, witness details & promissory bond
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Kalam Sample Button */}
            <button
              onClick={setKalamSample}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 active:scale-95 ${
                !isBlankMode && formData.customerName.includes('Kalam')
                  ? 'bg-amber-500/10 border-amber-400 text-amber-700 dark:text-amber-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Fill Dr. A.P.J. Abdul Kalam Sample Data"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Dr. Kalam Sample</span>
            </button>

            {/* Blank Form Button */}
            <button
              onClick={setBlank}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 active:scale-95 ${
                isBlankMode
                  ? 'bg-sky-500/10 border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Clear to blank form for handwriting"
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span>Blank Form</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="btn-sky-primary flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md shadow-sky-500/25 active:scale-95 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl glass hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Loan Application Form Sheet (Strict Single A4 Guaranteed) */}
        <div
          id="printable-loan-form"
          ref={printAreaRef}
          className="bg-white text-black p-4 sm:p-6 rounded-2xl border border-slate-300 print:border-none print:p-0 print:text-black font-sans text-[11px] leading-tight max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-hidden select-text"
        >
          {/* Top Form Header: Website Logo & Clean Title (NO address & NO owner details) + Photo Box */}
          <div className="flex justify-between items-start gap-3 pb-2 border-b-2 border-black">
            {/* Left: Website Logo & Title */}
            <div className="flex items-start space-x-2.5 flex-1 min-w-0">
              <img
                src="/icon-192.png"
                alt="VK Banker's"
                className="w-12 h-12 object-contain rounded-xl shrink-0 mt-0.5 print:w-12 print:h-12"
              />
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="font-black text-xl tracking-tight text-slate-900 print:text-black">
                    VK BANKER'S & FINANCE
                  </span>
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 print:border-black/30">
                    வி.கே. பேங்கர்ஸ்
                  </span>
                </div>
                <p className="font-bold text-[10.5px] text-slate-700 print:text-black mt-0.5">
                  தவணை கடன் வசூல் & நிதி மேலாண்மை நிறுவனம் (Micro Finance & Daily Lending)
                </p>
                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-black uppercase text-slate-900 print:border-black/40">
                  கடன் விண்ணப்பம் & உறுதிமொழிப் பத்திரம் • LOAN APPLICATION & PROMISSORY FORM
                </div>
              </div>
            </div>

            {/* Top Right: Customer Passport Photo Box */}
            <div className="w-20 h-24 border-2 border-dashed border-slate-500 rounded flex flex-col items-center justify-center p-1 text-center bg-slate-50 shrink-0 print:border-black">
              <User className="w-6 h-6 text-slate-400 mb-0.5 print:text-slate-500" />
              <span className="text-[8.5px] font-bold text-slate-800 print:text-black leading-tight">
                புகைப்படம்
              </span>
              <span className="text-[7.5px] text-slate-500 print:text-slate-600">
                Passport Photo
              </span>
            </div>
          </div>

          {/* Form Meta row: App No & Date */}
          <div className="flex justify-between items-center py-1 text-[10px] font-bold text-slate-800 print:text-black border-b border-slate-300">
            <div>
              விண்ணப்ப எண் / Application No: <span className="font-mono font-black text-black">{formData.appNo}</span>
            </div>
            <div>
              தேதி / Date: <span className="font-mono font-black text-black">{formData.date}</span>
            </div>
          </div>

          {/* Section 1: Customer Personal Details (WITHOUT BANK DETAILS) */}
          <div className="mt-2">
            <h4 className="font-black text-[10.5px] uppercase bg-slate-100 print:bg-slate-100 px-2 py-1 border-l-4 border-sky-600 print:border-black text-slate-900 print:text-black">
              1. வாடிக்கையாளர் விவரங்கள் / Borrower Details (Without Bank Details)
            </h4>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1.5 text-[10px]">
              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">முழு பெயர் / Full Name: </span>
                <span className="font-bold text-black">{isBlankMode ? '_________________________________________' : formData.customerName}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">தந்தை / கணவர் / Father or Spouse: </span>
                <span className="font-bold text-black">{isBlankMode ? '_________________________________________' : formData.fatherSpouseName}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">கைபேசி எண் / Mobile No: </span>
                <span className="font-bold font-mono text-black">{isBlankMode ? '____________________' : formData.phone}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">மாற்று எண் / Alternate Phone: </span>
                <span className="font-bold font-mono text-black">{isBlankMode ? '____________________' : formData.altPhone}</span>
              </div>

              <div className="col-span-2 border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">தற்போதைய முகவரி / Address: </span>
                <span className="font-bold text-black">{isBlankMode ? '____________________________________________________________________________________________________' : formData.address}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">பகுதி / Area: </span>
                <span className="font-bold text-black">{isBlankMode ? '____________________' : formData.area}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">அடையாள அட்டை / ID Proof: </span>
                <span className="font-bold font-mono text-black">{isBlankMode ? '____________________' : `${formData.idType}: ${formData.idNumber}`}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">தொழில் / Occupation: </span>
                <span className="font-bold text-black">{isBlankMode ? '____________________' : formData.occupation}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">வருமானம் & குடியிருப்பு / Income & Home: </span>
                <span className="font-bold text-black">
                  {isBlankMode ? '₹ ________ / மாதம் • [ ] Own [ ] Rent' : `₹ ${formData.monthlyIncome} / Month • ${formData.residenceType}`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Loan Requirements & Terms */}
          <div className="mt-2">
            <h4 className="font-black text-[10.5px] uppercase bg-slate-100 print:bg-slate-100 px-2 py-1 border-l-4 border-amber-600 print:border-black text-slate-900 print:text-black">
              2. கடன் விபரங்கள் / Loan Particulars & Scheme
            </h4>

            <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 mt-1.5 text-[10px]">
              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">கடன் தொகை / Loan: </span>
                <span className="font-black text-black">{isBlankMode ? '₹ ______________' : `₹ ${formData.loanAmount}`}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">திட்டம் / Scheme: </span>
                <span className="font-bold text-black">
                  {isBlankMode ? '[ ] Daily [ ] Weekly [ ] Monthly' : formData.scheme.toUpperCase()}
                </span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">காலம் / Tenure: </span>
                <span className="font-bold text-black">{isBlankMode ? '________ Days' : formData.tenure}</span>
              </div>

              <div className="border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">தவணைத் தொகை / Due: </span>
                <span className="font-black text-black">{isBlankMode ? '₹ ____________ / தவணை' : `₹ ${formData.installmentAmount} / தவணை`}</span>
              </div>

              <div className="col-span-2 border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">கடன் நோக்கம் / Purpose: </span>
                <span className="font-bold text-black">{isBlankMode ? '____________________________________________' : formData.purpose}</span>
              </div>

              <div className="col-span-3 border-b border-dotted border-slate-400 pb-0.5">
                <span className="text-slate-600 print:text-slate-700">எழுத்தால் / In Words: </span>
                <span className="font-bold text-black">{isBlankMode ? '_____________________________________________________________________________________' : formData.loanAmountWords}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Witness Details & Signatures */}
          <div className="mt-2">
            <h4 className="font-black text-[10.5px] uppercase bg-slate-100 print:bg-slate-100 px-2 py-1 border-l-4 border-emerald-600 print:border-black text-slate-900 print:text-black">
              3. சாட்சிகள் & ஜாமீன்தார்கள் விவரம் / Witness & Guarantor Details
            </h4>

            <div className="grid grid-cols-2 gap-3 mt-1.5">
              {/* Witness 1 */}
              <div className="p-2 rounded border border-slate-300 bg-slate-50/50 print:bg-white text-[9.5px] space-y-1">
                <p className="font-black text-[10px] text-black border-b border-slate-300 pb-0.5 flex items-center justify-between">
                  <span>சாட்சி 1 / WITNESS 1</span>
                  <span className="text-[8.5px] text-slate-500 font-normal">Primary Guarantor</span>
                </p>
                <p><span className="text-slate-600 print:text-slate-700">பெயர் / Name:</span> <strong className="text-black">{isBlankMode ? '________________________' : formData.witness1Name}</strong></p>
                <p><span className="text-slate-600 print:text-slate-700">கைபேசி / Mobile:</span> <strong className="font-mono text-black">{isBlankMode ? '________________________' : formData.witness1Phone}</strong></p>
                <p><span className="text-slate-600 print:text-slate-700">உறவு / Relation:</span> <strong className="text-black">{isBlankMode ? '________________________' : formData.witness1Relation}</strong></p>
                <p><span className="text-slate-600 print:text-slate-700">ஆதார் / Aadhaar:</span> <strong className="font-mono text-black">{isBlankMode ? '________________________' : formData.witness1Aadhaar}</strong></p>
                <p><span className="text-slate-600 print:text-slate-700">முகவரி / Address:</span> <strong className="text-black">{isBlankMode ? '________________________________' : formData.witness1Address}</strong></p>
                
                <div className="pt-5 text-center border-t border-dotted border-slate-400 mt-1">
                  <p className="text-[9px] font-bold text-black">சாட்சி 1 கையொப்பம் / Witness 1 Signature</p>
                </div>
              </div>

              {/* Witness 2 */}
              <div className="p-2 rounded border border-slate-300 bg-slate-50/50 print:bg-white text-[9.5px] space-y-1">
                <p className="font-black text-[10px] text-black border-b border-slate-300 pb-0.5 flex items-center justify-between">
                  <span>சாட்சி 2 / WITNESS 2</span>
                  <span className="text-[8.5px] text-slate-500 font-normal">Secondary Guarantor</span>
                </p>
                <p><span className="text-slate-600 print:text-slate-700">பெயர் / Name:</span> <strong className="text-black">{isBlankMode ? '________________________' : formData.witness2Name}</strong></p>
                <p><span className="text-slate-600 print:text-slate-700">கைபேசி / Mobile:</span> <strong className="font-mono text-black">{isBlankMode ? '________________________' : formData.witness2Phone}</strong></p>
                <p><span className="text-slate-600 print:text-slate-700">உறவு / Relation:</span> <strong className="text-black">{isBlankMode ? '________________________' : formData.witness2Relation}</strong></p>
                <p><span className="text-slate-600 print:text-slate-700">ஆதார் / Aadhaar:</span> <strong className="font-mono text-black">{isBlankMode ? '________________________' : formData.witness2Aadhaar}</strong></p>
                <p><span className="text-slate-600 print:text-slate-700">முகவரி / Address:</span> <strong className="text-black">{isBlankMode ? '________________________________' : formData.witness2Address}</strong></p>
                
                <div className="pt-5 text-center border-t border-dotted border-slate-400 mt-1">
                  <p className="text-[9px] font-bold text-black">சாட்சி 2 கையொப்பம் / Witness 2 Signature</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Promissory Note & Legal Declaration */}
          <div className="mt-2 p-2 rounded border border-slate-300 bg-slate-50/70 print:bg-slate-50 space-y-0.5 text-[9.5px]">
            <p className="font-black text-black">உறுதிமொழிப் பத்திரம் / PROMISSORY UNDERTAKING:</p>
            <p className="text-slate-800 print:text-black leading-normal text-justify">
              "வி.கே. பேங்கர்ஸ் & பைனான்ஸ் நிறுவனத்திடமிருந்து நான் பெற்றுக்கொண்ட மேற்கண்ட கடன் தொகையினை முழு மனதுடன் ஒப்புக்கொள்கிறேன். நிர்ணயிக்கப்பட்ட தவணைத் தேதிகளில் தவணைத் தொகையை தவறாமல் முகவரிடமோ அல்லது நிறுவன அலுவலகத்திலோ செலுத்திவிடுவேன் என உறுதியளிக்கிறேன். தவணை தவறும் பட்சத்தில் நிறுவன விதிகளின்படி கூடுதல் கட்டணத்தை ஏற்க சம்மதிக்கிறேன்."
            </p>
          </div>

          {/* Section 5: Signature Blocks (WITHOUT OWNER NAME) */}
          <div className="grid grid-cols-3 gap-3 pt-5 mt-2 border-t-2 border-black text-center text-[10px]">
            {/* Customer Sign & Thumb Impression */}
            <div className="space-y-1">
              <div className="w-20 h-10 border border-dashed border-slate-400 rounded mx-auto flex items-center justify-center text-[8px] text-slate-500">
                பெருவிரல் ரேகை / Thumb
              </div>
              <p className="font-bold text-black">விண்ணப்பதாரர் கையொப்பம்</p>
              <p className="text-[8.5px] text-slate-600">Borrower Signature</p>
            </div>

            {/* Field Officer Sign */}
            <div className="space-y-1">
              <div className="h-10 border-b border-dotted border-slate-400 flex items-end justify-center mb-1">
                <span className="text-[8px] text-slate-400">சரிபார்ப்பு கையொப்பம்</span>
              </div>
              <p className="font-bold text-black">கள அலுவலர் கையொப்பம்</p>
              <p className="text-[8.5px] text-slate-600">Field Verification Officer</p>
            </div>

            {/* Authorized Signatory (NO OWNER NAME) */}
            <div className="space-y-1">
              <div className="h-10 border-b border-dotted border-slate-400 flex items-end justify-center mb-1">
                <span className="text-[8px] text-slate-400">அங்கீகரிக்கப்பட்ட கையொப்பம்</span>
              </div>
              <p className="font-bold text-black">நிர்வாகி கையொப்பம்</p>
              <p className="text-[8.5px] text-slate-600">Authorized Signatory</p>
            </div>
          </div>

          {/* Official Clean Footer (NO ADDRESS, NO OWNER DETAILS) */}
          <div className="mt-2 pt-1 border-t border-slate-300 text-center text-[9px] text-slate-500 print:text-slate-600 flex items-center justify-between">
            <span className="font-semibold">VK BANKER'S & FINANCE • அதிகாரப்பூர்வ கடன் விண்ணப்பப் பதிவு</span>
            <span>Official Confidential Loan Record • Single A4 Format</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanApplicationFormModal;
