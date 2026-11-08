import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
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
  LogOut,
  RotateCcw,
  Bot,
  Lock,
  Sparkles,
  Maximize2,
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
  initialTab = 'login', // 'login' | 'send'
}) => {
  const { lang: appLang } = useLanguage();
  const [langChoice, setLangChoice] = useState(appLang === 'en' ? 'en' : 'ta');
  const [modalTab, setModalTab] = useState(initialCustomer || initialLoan ? 'send' : initialTab);
  const [templateType, setTemplateType] = useState(initialTemplate);

  // ----------------------------------------------------
  // IN-SITE WHATSAPP WEB LOGIN STATES
  // ----------------------------------------------------
  const [waStatus, setWaStatus] = useState('not_linked'); // 'not_linked' | 'waiting_code' | 'connected'
  const [financierPhone, setFinancierPhone] = useState('919842112345');
  const [pairingCode, setPairingCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [codeLoading, setCodeLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // ----------------------------------------------------
  // CUSTOMERS & LOANS DATA
  // ----------------------------------------------------
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected borrower / loan state
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialCustomer?._id || initialLoan?.customerId?._id || initialLoan?.customerId || ''
  );
  const [selectedLoanId, setSelectedLoanId] = useState(initialLoan?._id || '');

  // Contact details (auto-populated)
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');

  // Editable Message State
  const [messageText, setMessageText] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inSiteSending, setInSiteSending] = useState(false);
  const [inSiteSuccess, setInSiteSuccess] = useState(null);

  // ----------------------------------------------------
  // SOCKET.IO & STATUS LISTENER FOR IN-SITE LOGIN
  // ----------------------------------------------------
  useEffect(() => {
    const serverUrl = api.getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('whatsapp:status', (data) => {
      if (data.status) setWaStatus(data.status);
      if (data.phoneNumber) setFinancierPhone(data.phoneNumber);
      if (data.pairingCode) setPairingCode(data.pairingCode);
      if (data.expiresAt) setExpiresAt(data.expiresAt);
    });

    socket.on('whatsapp:code', (data) => {
      setPairingCode(data.code);
      setExpiresAt(data.expiresAt);
      setWaStatus('waiting_code');
    });

    // Initial REST status fetch
    api.getWhatsAppStatus()
      .then((res) => {
        if (res.success) {
          setWaStatus(res.status || 'not_linked');
          if (res.phoneNumber) setFinancierPhone(res.phoneNumber);
          if (res.pairingCode) setPairingCode(res.pairingCode);
          if (res.expiresAt) setExpiresAt(res.expiresAt);
        }
      })
      .catch(() => {});

    return () => {
      socket.disconnect();
    };
  }, []);

  // Timer countdown for Pairing Code
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && pairingCode && waStatus === 'waiting_code') {
        setPairingCode(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, pairingCode, waStatus]);

  // Load Customers & Loans
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [custRes, loansRes] = await Promise.all([
          api.getCustomers(),
          api.getLoans({ status: 'active' }),
        ]);

        if (isMounted) {
          if (custRes.success) setCustomers(custRes.customers || []);
          if (loansRes.success) setLoans(loansRes.loans || []);
        }
      } catch (err) {
        console.warn('WhatsApp Hub data fetch note:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-fill customer and phone
  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0]._id);
      return;
    }

    const cust = customers.find((c) => c._id === selectedCustomerId) || initialCustomer;
    if (cust) {
      setRecipientName(cust.name || 'Customer');
      setRecipientPhone(cust.phone || '');

      const custLoans = loans.filter((l) => {
        const cId = l.customerId?._id || l.customerId;
        return cId === cust._id;
      });

      if (custLoans.length > 0 && !custLoans.some((l) => l._id === selectedLoanId)) {
        setSelectedLoanId(custLoans[0]._id);
      }
    }
  }, [selectedCustomerId, customers, loans, initialCustomer]);

  // Auto-fill initial loan if passed
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

  // Generate template message
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

  // ----------------------------------------------------
  // PAIRING CODE ACTIONS
  // ----------------------------------------------------
  const handleGeneratePairingCode = async (e) => {
    if (e) e.preventDefault();
    try {
      setCodeLoading(true);
      setPairingCode(null);
      setWaStatus('waiting_code');
      const res = await api.generateWhatsAppCode(financierPhone);
      if (res.pairingCode) {
        setPairingCode(res.pairingCode);
        setExpiresAt(res.expiresAt);
      }
    } catch (err) {
      alert(err.message || 'Could not generate pairing code. Ensure server is running.');
      setWaStatus('not_linked');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLogoutWhatsApp = async () => {
    if (window.confirm('Are you sure you want to log out this WhatsApp Web session?')) {
      try {
        setCodeLoading(true);
        await api.logoutWhatsApp();
        setWaStatus('not_linked');
        setPairingCode(null);
      } catch (err) {
        alert(err.message || 'Logout failed');
      } finally {
        setCodeLoading(false);
      }
    }
  };

  const handleReconnectWhatsApp = async () => {
    try {
      setCodeLoading(true);
      await api.reconnectWhatsApp();
    } catch (err) {
      alert(err.message || 'Reconnect failed');
    } finally {
      setCodeLoading(false);
    }
  };

  // ----------------------------------------------------
  // SEND ACTIONS
  // ----------------------------------------------------
  const handleSendWhatsAppWebOrApp = () => {
    openWhatsApp({ phone: recipientPhone, message: messageText });
  };

  const handleSendInSiteBot = async () => {
    try {
      setInSiteSending(true);
      setInSiteSuccess(null);
      const res = await api.sendWhatsAppReminder({
        phone: recipientPhone,
        text: messageText,
        customerName: recipientName,
        loanNo: selectedLoanId,
        amount: 0,
      });
      if (res.success) {
        setInSiteSuccess('Message sent directly inside site via WhatsApp Web!');
        setTimeout(() => setInSiteSuccess(null), 4000);
      }
    } catch (err) {
      alert(err.message || 'Direct in-site bot sending failed. You can use "Send via WhatsApp (wa.me)"');
    } finally {
      setInSiteSending(false);
    }
  };

  const handleOpenDockedWindow = () => {
    // Opens a fixed compact popup window that docks side-by-side with the site
    window.open(
      'https://web.whatsapp.com',
      'WhatsAppWebDock',
      'width=960,height=750,left=120,top=60,resizable=yes,scrollbars=yes'
    );
  };

  const currentCustomer = customers.find((c) => c._id === selectedCustomerId) || initialCustomer;
  const currentLoan = loans.find((l) => l._id === selectedLoanId) || initialLoan;
  const formattedPhone = formatPhoneDisplay(recipientPhone);

  const displayCode = pairingCode
    ? pairingCode.length === 8
      ? `${pairingCode.slice(0, 4)} - ${pairingCode.slice(4)}`
      : pairingCode
    : null;

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const templates = [
    { id: 'reminder', label: 'தவணை நினைவூட்டல்', sub: 'Due Reminder', icon: Clock },
    { id: 'receipt', label: 'வசூல் ரசீது', sub: 'Payment Receipt', icon: Receipt },
    { id: 'overdue', label: 'நிலுவை எச்சரிக்கை', sub: 'Overdue Notice', icon: AlertTriangle },
    { id: 'sanction', label: 'கடன் ஒப்புதல்', sub: 'Loan Sanction', icon: FileText },
    { id: 'statement', label: 'கணக்கு அறிக்கை', sub: 'Ledger Statement', icon: TrendingUp },
    { id: 'custom', label: 'விருப்ப செய்தி', sub: 'Custom Text', icon: Send },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto max-h-[96vh] flex flex-col space-y-4">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  WhatsApp Web Hub / வாட்ஸ்அப் வலைத்தளம்
                </h3>
                {waStatus === 'connected' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    <span>Connected</span>
                  </span>
                ) : waStatus === 'waiting_code' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-extrabold">
                    Waiting for Code
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    Not Linked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                வலைத்தளத்திலேயே வாட்ஸ்அப் லாகின் & வாடிக்கையாளர் எண் பெற்று நேரடி செய்தி அனுப்புதல்
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

        {/* In-Site Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setModalTab('login')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 ${
              modalTab === 'login'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>1. WhatsApp Web Login (வலைத்தள லாகின்)</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('send')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 ${
              modalTab === 'send'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>2. Send Message (செய்தி அனுப்புக)</span>
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto space-y-4 pr-1">

          {/* ========================================================= */}
          {/* TAB 1: WHATSAPP WEB LOGIN IN THE SITE ITSELF             */}
          {/* ========================================================= */}
          {modalTab === 'login' && (
            <div className="space-y-4 animate-fade-in">

              {/* Status Header & Active Session */}
              {waStatus === 'connected' ? (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-2 border-emerald-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          WhatsApp Web Session Active & Connected!
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                          Linked Phone: <strong>+{financierPhone}</strong> • Session saved in <code className="text-emerald-600">.wwebjs_auth</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleReconnectWhatsApp}
                        disabled={codeLoading}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition active:scale-95 flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                        <span>Reconnect</span>
                      </button>

                      <button
                        onClick={handleLogoutWhatsApp}
                        disabled={codeLoading}
                        className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 transition active:scale-95 flex items-center space-x-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout Session</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                      வாட்ஸ்அப் வலைத்தளம் தளத்துடன் முழுமையாக இணைக்கப்பட்டுள்ளது!
                    </span>
                    <button
                      onClick={() => setModalTab('send')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5 self-start sm:self-auto"
                    >
                      <span>Go to Send Message</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Phone Number & In-Site Pairing Code Box */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Input & Pairing Code */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1.5">
                        Financier WhatsApp Mobile Number / உங்கள் வாட்ஸ்அப் எண்
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="tel"
                          required
                          value={financierPhone}
                          onChange={(e) => setFinancierPhone(e.target.value)}
                          placeholder="919842112345"
                          className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleGeneratePairingCode}
                          disabled={codeLoading}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition active:scale-95 flex items-center space-x-1.5 shrink-0"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${codeLoading ? 'animate-spin' : ''}`} />
                          <span>{codeLoading ? 'Generating...' : 'Get Pairing Code'}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Country code without + (e.g. <strong className="font-mono text-emerald-600">919842112345</strong>)
                      </p>
                    </div>

                    {/* The 8-Digit Pairing Code Display */}
                    {pairingCode ? (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-950 border-2 border-emerald-500 shadow-md text-center space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                            In-Site 8-Digit Code
                          </span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Expires in {formatTimer(timeLeft)}</span>
                          </span>
                        </div>

                        <div className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 shadow-inner">
                          <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 select-all">
                            {displayCode}
                          </span>
                        </div>

                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleGeneratePairingCode}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-white dark:hover:bg-slate-800 transition"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-1.5">
                        <Smartphone className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          No active pairing code
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Click <strong>"Get Pairing Code"</strong> to display the 8-digit code right here.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Step-by-Step Mobile Pairing Instructions */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>How to Link in WhatsApp / இணைக்கும் வழிமுறைகள்</span>
                    </h4>

                    <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          1
                        </span>
                        <p>Open <strong>WhatsApp</strong> on your mobile phone.</p>
                      </div>

                      <div className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          2
                        </span>
                        <p>Tap <strong>Menu (⋮)</strong> / <strong>Settings</strong> &gt; <strong>Linked Devices</strong>.</p>
                      </div>

                      <div className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          3
                        </span>
                        <p>Tap the green <strong>"Link a Device"</strong> button.</p>
                      </div>

                      <div className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          4
                        </span>
                        <p className="bg-amber-100 dark:bg-amber-950/60 p-2 rounded-xl text-amber-900 dark:text-amber-200 font-bold border border-amber-300/40 text-[11px]">
                          👉 At bottom of screen, tap <strong>"Link with phone number instead"</strong>.
                        </p>
                      </div>

                      <div className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          5
                        </span>
                        <p>Enter the <strong>8-character code</strong> generated on this screen!</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* In-App Floating / Docked WhatsApp Window Button */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                      In-App Docked WhatsApp Window (மிதக்கும் சாளரம்)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      தளத்தை விட்டு வெளியேறாமல் பக்கவாட்டில் வாட்ஸ்அப் சாளரத்தை திறந்து வைக்கலாம்.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenDockedWindow}
                  className="px-4 py-2 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 text-xs font-bold transition active:scale-95 flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Docked WhatsApp Window</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: SEND MESSAGE (AUTO-EXTRACTED PHONE NUMBER)         */}
          {/* ========================================================= */}
          {modalTab === 'send' && (
            <div className="space-y-4 animate-fade-in">

              {/* Borrower Selection & Auto-Extracted Mobile Number */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-sky-500" />
                    <span>Select Borrower / வாடிக்கையாளர் தேர்வு</span>
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
                      Formatted: <strong className="font-mono text-emerald-600">{formattedPhone || 'None'}</strong>
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

              {/* Template Selector & Language Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Select Template / செய்தி வகை
                  </span>

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

                {/* Templates Grid */}
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

              {/* Live Editable Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <span>Message Preview / செய்தி முன்னோட்டம்</span>
                    <span className="text-slate-400 font-normal">(விருப்பப்படி திருத்தலாம் / Fully Editable)</span>
                  </label>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {messageText.length} characters
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none resize-none shadow-inner"
                  placeholder="Type or edit message..."
                />
              </div>

              {inSiteSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{inSiteSuccess}</span>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Actions Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(messageText);
                setCopiedMessage(true);
                setTimeout(() => setCopiedMessage(false), 2000);
              }}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center space-x-1.5"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const clean = normalizeWhatsAppPhone(recipientPhone);
                const link = `https://wa.me/${clean}?text=${encodeURIComponent(messageText)}`;
                navigator.clipboard.writeText(link);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center space-x-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy wa.me'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            {waStatus === 'connected' && (
              <button
                type="button"
                onClick={handleSendInSiteBot}
                disabled={inSiteSending}
                className="px-4 py-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs shadow-sm transition active:scale-95 flex items-center justify-center space-x-1.5"
                title="Send directly inside the site via connected WhatsApp bot session"
              >
                <Bot className="w-4 h-4 text-emerald-600" />
                <span>{inSiteSending ? 'Sending in Site...' : 'Send in Site (Bot)'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSendWhatsAppWebOrApp}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
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
