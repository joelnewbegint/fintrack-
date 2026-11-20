import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Receipt,
  Search,
  Calendar,
  Printer,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { openWhatsApp, generateEMIWhatsAppMessage } from '../../utils/emiWhatsapp';

export const EMIReceipts = () => {
  const { isOwner } = useAuth();
  const { lang, t } = useLanguage();

  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | 'cash' | 'upi'
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.getEMILoans({});
      if (res.success && Array.isArray(res.loans)) {
        // Collect all payments across loans
        const allPayments = [];
        for (const loan of res.loans) {
          try {
            const detailRes = await api.getEMILoanById(loan._id);
            if (detailRes.success && Array.isArray(detailRes.payments)) {
              detailRes.payments.forEach((p) => {
                allPayments.push({
                  ...p,
                  loanNo: loan.emiNo,
                  customerName: loan.customerName,
                  customerPhone: loan.customerPhone,
                  customerArea: loan.customerArea,
                  loanPrincipal: loan.principal,
                  loanMonthlyInstallment: loan.monthlyInstallment,
                });
              });
            }
          } catch (e) {}
        }
        allPayments.sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));
        setReceipts(allPayments);
      }
    } catch (e) {
      console.warn('EMI Receipts fetch note:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const filteredReceipts = receipts.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      r.customerName?.toLowerCase().includes(q) ||
      r.customerPhone?.includes(q) ||
      r.loanNo?.toLowerCase().includes(q) ||
      r.receiptNo?.toLowerCase().includes(q);
    const matchMode = modeFilter === 'all' || (r.mode || 'cash').toLowerCase() === modeFilter;
    return matchSearch && matchMode;
  });

  const totalCollected = filteredReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalCash = filteredReceipts.filter(r => (r.mode || 'cash').toLowerCase() === 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalUpi = filteredReceipts.filter(r => (r.mode || 'cash').toLowerCase() === 'upi').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handlePrintSlip = (r) => {
    const printWindow = window.open('', '_blank', 'width=350,height=550');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>EMI Receipt - ${r.receiptNo || 'VK'}</title>
          <style>
            body { font-family: monospace; padding: 15px; font-size: 12px; color: #111; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #444; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total { font-size: 15px; font-weight: bold; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">VK BANKER'S & FINANCE</div>
          <div class="center">வி.கே. பேங்கர்ஸ் & பைனான்ஸ்</div>
          <div class="center" style="font-size: 10px;">Monthly EMI Receipt / மாத தவணை ரசீது</div>
          <div class="divider"></div>
          <div class="row"><span>Receipt No:</span><span class="bold">${r.receiptNo || 'N/A'}</span></div>
          <div class="row"><span>Date:</span><span>${new Date(r.paymentDate || r.createdAt).toLocaleDateString('en-IN')}</span></div>
          <div class="row"><span>Loan No:</span><span class="bold">${r.loanNo}</span></div>
          <div class="row"><span>Customer:</span><span class="bold">${r.customerName}</span></div>
          <div class="row"><span>Phone:</span><span>${r.customerPhone || '-'}</span></div>
          <div class="row"><span>Area:</span><span>${r.customerArea || '-'}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Installment No:</span><span>#${r.installmentNo || '1'}</span></div>
          <div class="row"><span>Payment Mode:</span><span class="bold">${(r.mode || 'cash').toUpperCase()}</span></div>
          <div class="row total"><span>Amount Paid:</span><span>₹${(Number(r.amount) || 0).toLocaleString('en-IN')}</span></div>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 12px;">Thank you for your timely payment!</div>
          <div class="center" style="font-size: 9px; color: #666;">கடன் தவணை நிதி மேலாண்மை</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleWhatsAppReceipt = (r) => {
    if (!r.customerPhone) {
      alert('Customer mobile number is not available');
      return;
    }
    const msg = `*VK BANKER'S & FINANCE | தவணை ரசீது*\n\n` +
      `அன்புள்ள *${r.customerName}*,\n` +
      `தங்களின் EMI கடன் எண்: *${r.loanNo}*\n` +
      `ரசீது எண்: *${r.receiptNo || 'N/A'}*\n` +
      `செலுத்திய தொகை: *₹${(Number(r.amount) || 0).toLocaleString('en-IN')}* (${(r.mode || 'cash').toUpperCase()})\n` +
      `தேதி: *${new Date(r.paymentDate || r.createdAt).toLocaleDateString('en-IN')}*\n\n` +
      `தங்களின் தவணை தொகை வெற்றிகரமாக வரவு வைக்கப்பட்டது.\nநன்றி! வி.கே. பேங்கர்ஸ்.`;
    const cleanPhone = r.customerPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div
      className="space-y-5 pb-12 -mx-2 sm:-mx-4 lg:-mx-6 px-3 sm:px-6 py-4 rounded-3xl"
      style={{
        background: 'linear-gradient(180deg, #FFF8F5 0%, #FFF3EC 60%, #F8FAFD 100%)',
      }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
              {lang === 'ta' ? 'தவணை ரசீதுகள்' : 'EMI Receipts'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {lang === 'ta' ? 'EMI தவணை வசூல் ரசீதுகள்' : 'Monthly EMI Receipts & Collection Log'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'ta' ? 'அனைத்து EMI தவணை ரசீதுகளின் பட்டியல், அச்சிடுதல் மற்றும் வாட்ஸ்அப் பகிர்வு' : 'View, search, print thermal slips, and share receipts via WhatsApp'}
          </p>
        </div>
      </div>

      {/* Metric Mini-Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-orange-100 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Collected</span>
          <div className="text-xl sm:text-2xl font-black text-orange-600 mt-0.5">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">{filteredReceipts.length} receipt(s)</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-emerald-100 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Cash Collections</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
            ₹{totalCash.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">Physical Cash Handover</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-sky-100 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">UPI / Online</span>
          <div className="text-xl sm:text-2xl font-black text-sky-600 mt-0.5">
            ₹{totalUpi.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">GPay, PhonePe, Bank Transfer</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ta' ? 'ரசீது எண், வாடிக்கையாளர் பெயர், தொலைபேசி...' : 'Search by receipt #, customer name, phone...'}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['all', 'cash', 'upi'].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                modeFilter === m
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m === 'all' ? 'All Modes' : m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Receipts Table / Card List */}
      <div className="rounded-2xl border border-white/90 bg-white/80 backdrop-blur-md overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-bold">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading EMI Receipts...
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-bold">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No EMI receipts found matching current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReceipts.map((r, idx) => (
              <div
                key={r._id || idx}
                className="p-3.5 sm:p-4 hover:bg-orange-50/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm text-slate-900 truncate">
                        {r.customerName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                        {r.loanNo}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        (r.mode || 'cash') === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {(r.mode || 'cash').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Receipt: <span className="font-bold text-slate-700">{r.receiptNo || 'N/A'}</span> • Inst #{r.installmentNo || '1'} • {new Date(r.paymentDate || r.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900 block">
                      ₹{(Number(r.amount) || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handlePrintSlip(r)}
                      title="Print Thermal Slip"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleWhatsAppReceipt(r)}
                      title="Share via WhatsApp"
                      className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition active:scale-95 shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EMIReceipts;

