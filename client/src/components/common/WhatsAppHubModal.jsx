import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Receipt,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  Globe,
  User,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Share2,
} from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate } from '../../utils/currency';
import {
  normalizeWhatsAppPhone,
  formatPhoneDisplay,
  openWhatsApp,
  openWhatsAppWeb,
  generateDueReminderMessage,
  generateReceiptMessage,
  generateOverdueMessage,
  generateLoanSanctionMessage,
  generateStatementMessage,
} from '../../utils/whatsapp';

export const WhatsAppHubModal = ({
  isOpen = true,
  onClose,
  initialCustomer = null,
  initialLoan = null,
  initialTemplate = 'reminder', // 'reminder' | 'receipt' | 'overdue' | 'sanction' | 'statement' | 'custom'
}) => {
  const { lang: appLang } = useLanguage();
  const [langChoice, setLangChoice] = useState(appLang === 'en' ? 'en' : 'ta');
  const [templateType, setTemplateType] = useState(initialTemplate);

  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected borrower / loan state
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialCustomer?._id || initialLoan?.customerId?._id || initialLoan?.customerId || ''
  );
  const [selectedLoanId, setSelectedLoanId] = useState(
    initialLoan?._id || ''
  );

  // Contact details (auto-populated)
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');

  // Editable Message State
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [webOpenedToast, setWebOpenedToast] = useState(false);

  // Fetch all customers & loans if not provided
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [custRes, loansRes] = await Promise.all([
          api.getCustomers(),
          api.getLoans({ status: 'active' }),
        ]);

        if (isMounted) {
          if (custRes.success) setCustomers(custRes.customers || []);
          if (loansRes.success) setLoans(loansRes.loans || []);
        }
      } catch (err) {
        console.warn('Failed to load customers/loans for WhatsApp Hub:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // When selected customer changes, auto-populate phone & loan
  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      // Pick first customer if none selected
      setSelectedCustomerId(customers[0]._id);
      return;
    }

    const cust = customers.find((c) => c._id === selectedCustomerId) || initialCustomer;
    if (cust) {
      setRecipientName(cust.name || 'Customer');
      setRecipientPhone(cust.phone || '');

      // Check if this customer has loans
      const custLoans = loans.filter((l) => {
        const cId = l.customerId?._id || l.customerId;
        return cId === cust._id;
      });

      if (custLoans.length > 0 && !custLoans.some((l) => l._id === selectedLoanId)) {
        setSelectedLoanId(custLoans[0]._id);
      }
    }
  }, [selectedCustomerId, customers, loans, initialCustomer]);

  // When initial loan is passed
  useEffect(() => {
    if (initialLoan) {
      setSelectedLoanId(initialLoan._id);
      const cust = initialLoan.customerId;
      if (cust) {
        const cId = cust._id || cust;
        setSelectedCustomerId(cId);
        setRecipientName(cust.name || initialLoan.customerName || 'Customer');
        setRecipientPhone(cust.phone || initialLoan.customerPhone || '');
      }
    }
  }, [initialLoan]);

  // Generate template message whenever inputs change
  useEffect(() => {
    const cust = customers.find((c) => c._id === selectedCustomerId) || initialCustomer || {};
    const loan = loans.find((l) => l._id === selectedLoanId) || initialLoan || {};

    const name = recipientName || cust.name || 'Customer';
    const loanNo = loan.loanNo || 'VK-LOAN';
    const principal = loan.principal || 20000;
    const charge = loan.chargeAmount || principal * 0.1;
    const inHand = principal - charge;
    const installmentAmt = loan.installmentAmount || 200;
    const duration = loan.duration || 100;
    const remainingBalance = loan.remainingBalance != null ? loan.remainingBalance : principal;
    const schemeName =
      loan.financeType === 'daily'
        ? 'தினசரி தண்டல் / Daily Thandal'
        : loan.financeType === 'weekly'
        ? 'வாரத்தவணை / Weekly'
        : 'மாதத்தவணை / Monthly';

    let generated = '';

    if (templateType === 'reminder') {
      generated = generateDueReminderMessage({
        customerName: name,
        loanNo,
        amount: installmentAmt,
        dueDate: loan.endDate || new Date(),
        lang: langChoice,
      });
    } else if (templateType === 'receipt') {
      generated = generateReceiptMessage({
        customerName: name,
        loanNo,
        receiptNo: `RCT-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: installmentAmt,
        mode: 'CASH',
        date: new Date(),
        remainingBalance: Math.max(0, remainingBalance - installmentAmt),
        lang: langChoice,
      });
    } else if (templateType === 'overdue') {
      generated = generateOverdueMessage({
        customerName: name,
        loanNo,
        overdueDays: '3 நாட்கள் நிலுவை / 3 Days Overdue',
        dueAmount: installmentAmt,
        totalOutstanding: remainingBalance,
        lang: langChoice,
      });
    } else if (templateType === 'sanction') {
      generated = generateLoanSanctionMessage({
        customerName: name,
        loanNo,
        principal,
        chargeAmount: charge,
        inHandAmount: inHand,
        installmentAmount: installmentAmt,
        duration,
        scheme: schemeName,
        startDate: loan.startDate || new Date(),
        lang: langChoice,
      });
    } else if (templateType === 'statement') {
      generated = generateStatementMessage({
        customerName: name,
        customerPhone: recipientPhone,
        loanNo,
        principal,
        totalPayable: loan.totalPayable || principal,
        totalPaid: Math.max(0, (loan.totalPayable || principal) - remainingBalance),
        remainingBalance,
        payments: loan.payments || [],
        lang: langChoice,
      });
    } else if (templateType === 'custom') {
      generated =
        langChoice === 'ta'
          ? `🏛️ *வி.கே. பேங்கர்ஸ் & பைனான்ஸ்*\nவணக்கம் ${name},\n\n[இங்கே உங்கள் தகவலை தட்டச்சு செய்யவும்]\n\nநன்றி,\nவி.கே. பேங்கர்ஸ், கோவை (📞 +91 98421 12345)`
          : `🏛️ *VK BANKER'S & FINANCE*\nDear ${name},\n\n[Type your message here]\n\nThank you,\nVK Banker's, Coimbatore (📞 +91 98421 12345)`;
    }

    setMessageText(generated);
  }, [
    templateType,
    langChoice,
    selectedCustomerId,
    selectedLoanId,
    recipientName,
    recipientPhone,
    customers,
    loans,
    initialCustomer,
    initialLoan,
  ]);

  if (!isOpen) return null;

  const handleSendWhatsApp = () => {
    openWhatsApp({ phone: recipientPhone, message: messageText });
  };

  const handleOpenWeb = () => {
    openWhatsAppWeb();
    setWebOpenedToast(true);
    setTimeout(() => setWebOpenedToast(false), 4000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const clean = normalizeWhatsAppPhone(recipientPhone);
    const link = `https://wa.me/${clean}?text=${encodeURIComponent(messageText)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const currentCustomer = customers.find((c) => c._id === selectedCustomerId) || initialCustomer;
  const currentLoan = loans.find((l) => l._id === selectedLoanId) || initialLoan;
  const formattedPhone = formatPhoneDisplay(recipientPhone);

  const templates = [
    { id: 'reminder', label: 'தவணை நினைவூட்டல்', sub: 'Due Reminder', icon: Clock },
    { id: 'receipt', label: 'வசூல் ரசீது', sub: 'Payment Receipt', icon: Receipt },
    { id: 'overdue', label: 'நிலுவை எச்சரிக்கை', sub: 'Overdue Notice', icon: AlertTriangle },
    { id: 'sanction', label: 'கடன் ஒப்புதல்', sub: 'Loan Sanction', icon: FileText },
    { id: 'statement', label: 'கணக்கு அறிக்கை', sub: 'Ledger Statement', icon: TrendingUp },
    { id: 'custom', label: 'விருப்ப செய்தி', sub: 'Custom Text', icon: Send },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto max-h-[95vh] flex flex-col space-y-4">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  WhatsApp Hub & Direct Messenger
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase">
                  Manual Web Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                வாட்ஸ்அப் லாகின் & வாடிக்கையாளருக்கு நேரடி செய்தி அனுப்பும் வசதி
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-4 pr-1">

          {/* SECTION 1: WhatsApp Web Login / Quick Launcher Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  WhatsApp Web Login / வலைத்தள லாகின்
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  முதலில் ஒருமுறை WhatsApp Web-ஐ திறந்து உங்கள் போன் மூலம் QR ஸ்கேன் செய்து வைக்கவும். பின் அனைத்து செய்திகளும் 1-கிளிக்கில் நேரடியாக அனுப்பப்படும்.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenWeb}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-1.5 shrink-0"
              title="Open WhatsApp Web in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open WhatsApp Web (Login)</span>
            </button>
          </div>

          {webOpenedToast && (
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Web opened in new tab. Scan QR code if not already logged in!</span>
            </div>
          )}

          {/* SECTION 2: Borrower Selection & Auto-Extracted Mobile Number */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-sky-500" />
                <span>1. Select Customer / கடன் வாடிக்கையாளர் தேர்வு</span>
              </span>
              {currentLoan?.loanNo && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
                  Loan: {currentLoan.loanNo}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Selector Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Borrower Name / வாடிக்கையாளர்
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - {c.area || 'Coimbatore'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-extracted WhatsApp Mobile Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Number / வாட்ஸ்அப் எண் (தானாக பெறப்பட்டது)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="e.g. 9842112345"
                    className="w-full p-2.5 pl-9 rounded-xl border border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-slate-950 text-xs font-mono font-extrabold text-emerald-800 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Smartphone className="w-4 h-4 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Formatted for WhatsApp: <strong className="font-mono text-emerald-600">{formattedPhone || 'None'}</strong>
                </p>
              </div>
            </div>

            {/* Customer Snapshot Pill */}
            {currentCustomer && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 dark:text-white">{recipientName}</span>
                  <span>•</span>
                  <span>{currentCustomer.area || 'Coimbatore'}</span>
                </div>
                <div className="flex items-center space-x-3 text-[11px]">
                  <span>Outstanding: <strong className="text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(currentCustomer.totalOutstanding || currentLoan?.remainingBalance || 0)}</strong></span>
                  {currentLoan?.installmentAmount && (
                    <span>Due: <strong className="text-sky-600 dark:text-sky-400 font-bold">{formatCurrency(currentLoan.installmentAmount)}</strong></span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Template Selector & Language Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Select Template / செய்தி வகை
              </span>

              {/* Language Choice */}
              <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setLangChoice('ta')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    langChoice === 'ta'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  தமிழ் (Tamil)
                </button>
                <button
                  type="button"
                  onClick={() => setLangChoice('en')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    langChoice === 'en'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Template Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = templateType === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateType(tpl.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all active:scale-98 flex items-center space-x-2.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 shadow-sm ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {tpl.label}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{tpl.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: Live Editable Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <span>3. Message Preview / செய்தி முன்னோட்டம்</span>
                <span className="text-slate-400 font-normal">(விருப்பப்படி திருத்தலாம் / Fully Editable)</span>
              </label>
              <span className="text-slate-400 font-mono text-[10px]">
                {messageText.length} characters
              </span>
            </div>

            <textarea
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none resize-none shadow-inner"
              placeholder="Type or edit message..."
            />
          </div>
        </div>

        {/* SECTION 5: Footer Actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center space-x-1.5"
              title="Copy message to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center space-x-1.5"
              title="Copy wa.me link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy wa.me Link'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send via WhatsApp / வாட்ஸ்அப்பில் அனுப்புக</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppHubModal;

