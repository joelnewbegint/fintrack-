import React, { useState } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/currency';
import {
  X,
  Send,
  Copy,
  Check,
  MessageSquare,
  Bot,
  ExternalLink,
  Receipt,
  Share2,
} from 'lucide-react';

export const WhatsAppPaymentHistoryModal = ({ customer, loan = null, payments = [], onClose }) => {
  if (!customer && !loan) return null;

  const phone = (customer?.phone || loan?.customerPhone || '').replace(/[^0-9]/g, '');
  const customerName = customer?.name || loan?.customerName || 'Customer';
  const loanNo = loan?.loanNo || (payments.length > 0 && payments[0].loanId?.loanNo) || 'VK-LOAN';

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingBalance = loan ? loan.remainingBalance : (customer?.remainingBalance || 0);

  // Generate Tamil Statement
  const buildTamilStatement = () => {
    let msg = `🏛️ *VK BANKER'S & FINANCE*\n`;
    msg += `_தவணை கடன் வசூல் & நிதி மேலாண்மை_\n`;
    msg += `📍 45, கிராஸ் கட் ரோடு, காந்திபுரம், கோவை-12\n`;
    msg += `📞 +91 98421 12345\n`;
    msg += `------------------------------------\n`;
    msg += `👤 *வாடிக்கையாளர்:* ${customerName}\n`;
    msg += `📱 *மொபைல்:* +91 ${phone}\n`;
    if (loanNo) msg += `📄 *கடன் எண்:* ${loanNo}\n`;
    if (loan?.principal) msg += `💰 *கடன் தொகை:* ${formatCurrency(loan.principal)}\n`;
    if (loan?.totalPayable) msg += `💵 *மொத்த தவணைத் தொகை:* ${formatCurrency(loan.totalPayable)}\n`;
    msg += `------------------------------------\n`;
    msg += `📊 *செலுத்திய தவணை ரசீது விபரம்:*\n`;

    if (payments.length === 0) {
      msg += `(இதுவரை கட்டிய ரசீதுகள் இல்லை)\n`;
    } else {
      payments.slice(0, 15).forEach((p, idx) => {
        const dateStr = formatDate(p.date || p.paymentDate);
        const amtStr = formatCurrency(p.amount);
        const rct = p.receiptNo || `RCT-${idx + 1}`;
        const mode = p.mode || p.paymentMode || 'Cash';
        msg += `${idx + 1}. ${dateStr} - *${amtStr}* (${rct}, ${mode.toUpperCase()})\n`;
      });
      if (payments.length > 15) {
        msg += `... மற்றும் மேலும் ${payments.length - 15} ரசீதுகள்\n`;
      }
    }

    msg += `------------------------------------\n`;
    msg += `✅ *மொத்தம் செலுத்தியது:* ${formatCurrency(totalPaid)}\n`;
    if (loan) {
      msg += `⏳ *மீதி பாக்கித் தொகை:* ${formatCurrency(loan.remainingBalance)}\n`;
    }
    msg += `📅 *அறிக்கை தேதி:* ${formatDate(new Date())}\n`;
    msg += `------------------------------------\n`;
    msg += `🙏 நன்றி! தங்களின் மேலான ஒத்துழைப்பிற்கு நன்றி.\n`;
    msg += `*VK BANKER'S & FINANCE*\n`;
    msg += `நிர்வாகி: Vasantha Kumar K\n`;
    msg += `வசூல் முகவர்: Magimaidoss M`;
    return msg;
  };

  // Generate English Statement
  const buildEnglishStatement = () => {
    let msg = `🏛️ *VK BANKER'S & FINANCE*\n`;
    msg += `_Finance & Micro Lending Management_\n`;
    msg += `📍 45, Cross Cut Road, Gandhipuram, Coimbatore-12\n`;
    msg += `📞 +91 98421 12345\n`;
    msg += `------------------------------------\n`;
    msg += `👤 *Customer Name:* ${customerName}\n`;
    msg += `📱 *Mobile No:* +91 ${phone}\n`;
    if (loanNo) msg += `📄 *Loan No:* ${loanNo}\n`;
    if (loan?.principal) msg += `💰 *Principal Amount:* ${formatCurrency(loan.principal)}\n`;
    if (loan?.totalPayable) msg += `💵 *Total Repayable:* ${formatCurrency(loan.totalPayable)}\n`;
    msg += `------------------------------------\n`;
    msg += `📊 *PAYMENT STATEMENT / HISTORY:*\n`;

    if (payments.length === 0) {
      msg += `(No payment transactions recorded yet)\n`;
    } else {
      payments.slice(0, 15).forEach((p, idx) => {
        const dateStr = formatDate(p.date || p.paymentDate);
        const amtStr = formatCurrency(p.amount);
        const rct = p.receiptNo || `RCT-${idx + 1}`;
        const mode = p.mode || p.paymentMode || 'Cash';
        msg += `${idx + 1}. ${dateStr} - *${amtStr}* (${rct}, ${mode.toUpperCase()})\n`;
      });
      if (payments.length > 15) {
        msg += `... and ${payments.length - 15} more receipts\n`;
      }
    }

    msg += `------------------------------------\n`;
    msg += `✅ *Total Amount Paid:* ${formatCurrency(totalPaid)}\n`;
    if (loan) {
      msg += `⏳ *Remaining Balance:* ${formatCurrency(loan.remainingBalance)}\n`;
    }
    msg += `📅 *Statement Date:* ${formatDate(new Date())}\n`;
    msg += `------------------------------------\n`;
    msg += `🙏 Thank you for your continued trust!\n`;
    msg += `*VK BANKER'S & FINANCE*\n`;
    msg += `Owner: Vasantha Kumar K\n`;
    msg += `Agent: Magimaidoss M`;
    return msg;
  };

  const [langChoice, setLangChoice] = useState('ta');
  const [message, setMessage] = useState(buildTamilStatement());
  const [copied, setCopied] = useState(false);
  const [botSending, setBotSending] = useState(false);
  const [botSuccess, setBotSuccess] = useState(false);

  const handleLangToggle = (selected) => {
    setLangChoice(selected);
    setMessage(selected === 'ta' ? buildTamilStatement() : buildEnglishStatement());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSendViaBot = async () => {
    try {
      setBotSending(true);
      await api.sendWhatsAppReminder({
        phone,
        text: message,
        customerName,
        loanNo,
        amount: totalPaid,
      });
      setBotSuccess(true);
      setTimeout(() => setBotSuccess(false), 4000);
    } catch (err) {
      alert(err.message || 'Bot sending failed. Please use "Open in WhatsApp"');
    } finally {
      setBotSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm sm:text-base">
            <Share2 className="w-5 h-5 text-emerald-500" />
            <span>Send Payment History via WhatsApp / தவணை அறிக்கை</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Loan Overview Pill */}
        <div className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white">{customerName}</p>
            <p className="text-slate-500 font-mono mt-0.5">📱 +91 {phone}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Paid</span>
            <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalPaid)}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">({payments.length} receipts)</span>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="flex space-x-2">
          <button
            onClick={() => handleLangToggle('ta')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition ${
              langChoice === 'ta'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'glass text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            தமிழ் அறிக்கை (Tamil)
          </button>
          <button
            onClick={() => handleLangToggle('en')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition ${
              langChoice === 'en'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'glass text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            English Statement
          </button>
        </div>

        {/* Editable Message Box */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            WhatsApp Message Preview (Editable) / செய்தி முன்னோட்டம்
          </label>
          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-mono text-[11px] leading-relaxed"
          />
        </div>

        {botSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center space-x-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Statement sent successfully via WhatsApp Web!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleOpenWhatsApp}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-95 font-black text-xs text-white transition shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in WhatsApp (வாட்ஸ்அப்பில் அனுப்புக)</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text (நகலெடு)'}</span>
            </button>

            <button
              onClick={handleSendViaBot}
              disabled={botSending}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/40 font-bold text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition active:scale-95"
            >
              <Bot className="w-4 h-4 text-emerald-600" />
              <span>{botSending ? 'Sending...' : 'Auto-Bot Send'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppPaymentHistoryModal;
