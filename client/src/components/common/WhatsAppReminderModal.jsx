import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/currency';
import { X, Send, Copy, Check, MessageSquare, Bot, ExternalLink } from 'lucide-react';

export const WhatsAppReminderModal = ({ item, onClose }) => {
  if (!item) return null;

  const phone = item.customerPhone?.replace(/[^0-9]/g, '') || '';
  const customerName = item.customerName || 'Customer';
  const amount = formatCurrency(item.dueAmount || item.installmentAmount || 0);
  const dueDate = formatDate(item.dueDate || new Date());
  const loanNo = item.loanNo || '';

  const tamilMessage = `வணக்கம் ${customerName},\nஸ்ரீ முருகன் பைனான்ஸ் நிறுவனத்திலிருந்து நினைவூட்டல்.\nஉங்கள் கடன் கணக்கு (${loanNo}) தவணைத் தொகை ${amount} ${dueDate} அன்று செலுத்த வேண்டியுள்ளது.\nதயவுசெய்து உரிய நேரத்தில் செலுத்தி ஒத்துழைக்குமாறு கேட்டுக்கொள்கிறோம்.\nநன்றி,\nஸ்ரீ முருகன் பைனான்ஸ், கோயம்புத்தூர்.`;

  const englishMessage = `Dear ${customerName},\nReminder from Sri Murugan Finance.\nYour installment amount of ${amount} for Loan Account ${loanNo} is due on ${dueDate}.\nPlease settle the payment promptly.\nThank you,\nSri Murugan Finance, Coimbatore.`;

  const [message, setMessage] = useState(tamilMessage);
  const [langChoice, setLangChoice] = useState('ta');
  const [copied, setCopied] = useState(false);
  const [botSending, setBotSending] = useState(false);
  const [botSentSuccess, setBotSentSuccess] = useState(false);

  const handleLangChange = (selected) => {
    setLangChoice(selected);
    setMessage(selected === 'ta' ? tamilMessage : englishMessage);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
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
        amount: item.dueAmount || item.installmentAmount || 0,
      });
      setBotSentSuccess(true);
      setTimeout(() => setBotSentSuccess(false), 4000);
    } catch (err) {
      alert(err.message || 'Could not send via Bot. You can still use "Open WhatsApp"');
    } finally {
      setBotSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <MessageSquare className="w-5 h-5" />
            <span>Send WhatsApp Reminder</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Customer info pill */}
          <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{customerName}</p>
              <p className="text-slate-500 font-mono">📱 +91 {phone}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-600 dark:text-blue-400">{amount}</p>
              <p className="text-[11px] text-slate-500">Due: {dueDate}</p>
            </div>
          </div>

          {/* Language selector tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleLangChange('ta')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition ${
                langChoice === 'ta'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              தமிழ் (Tamil)
            </button>
            <button
              onClick={() => handleLangChange('en')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition ${
                langChoice === 'en'
                  ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              English
            </button>
          </div>

          {/* Message preview / edit box */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Message Content (Editable)
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
            />
            </div>

            {botSentSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center space-x-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Reminder message sent successfully via WhatsApp Web!</span>
              </div>
            )}
          </div>

        {/* Buttons */}
        <div className="mt-5 space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={handleSendViaBot}
              disabled={botSending}
              className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-xs text-white transition shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Bot className="w-4 h-4" />
              <span>{botSending ? 'Sending via WhatsApp...' : 'Send via FinTrack WhatsApp'}</span>
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Open in wa.me</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppReminderModal;
