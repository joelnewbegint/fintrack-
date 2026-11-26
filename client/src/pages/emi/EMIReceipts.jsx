import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Receipt,
  Search,
  Printer,
  MessageCircle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

export const EMIReceipts = ({ onViewLoan }) => {
  const { isOwner } = useAuth();
  const { lang } = useLanguage();

  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | 'cash' | 'upi' | 'cheque'
  const [reversingId, setReversingId] = useState(null);

  const fetchReceipts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getEMIPayments({ mode: modeFilter });
      if (res.success && Array.isArray(res.payments)) {
        setReceipts(res.payments);
        return;
      }

      // Fallback if backend route not updated yet
      const loansRes = await api.getEMILoans({});
      if (loansRes.success && Array.isArray(loansRes.loans)) {
        const allPayments = [];
        for (const loan of loansRes.loans) {
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
                  installmentNo: Array.isArray(p.installmentNos) && p.installmentNos.length > 0 ? p.installmentNos.join(', ') : '1',
                });
              });
            }
          } catch (e) {}
        }
        allPayments.sort(
          (a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt)
        );
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
  }, [modeFilter]);

  useEffect(() => {
    const handleRefresh = () => fetchReceipts(true);
    window.addEventListener('fintrack:emi-updated', handleRefresh);
    return () => window.removeEventListener('fintrack:emi-updated', handleRefresh);
  }, [modeFilter]);

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

  const validReceipts = filteredReceipts.filter((r) => r.status !== 'reversed');
  const totalCollected = validReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalCash = validReceipts
    .filter((r) => (r.mode || 'cash').toLowerCase() === 'cash')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalUpi = validReceipts
    .filter((r) => (r.mode || 'cash').toLowerCase() === 'upi')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handleReverseReceipt = async (r) => {
    if (!isOwner || r.status === 'reversed') return;
    if (!window.confirm(`Reverse receipt ${r.receiptNo} (₹${Number(r.amount).toLocaleString('en-IN')})?`)) return;
    try {
      setReversingId(r._id);
      await api.reverseEMIPayment(r._id, 'Owner reversal from Receipts log');
      await fetchReceipts(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
      }
    } catch (e) {
      alert(e.message || 'Failed to reverse EMI receipt');
    } finally {
      setReversingId(null);
    }
  };

  const handlePrintSlip = (r) => {
    const printWindow = window.open('', '_blank', 'width=350,height=550');
    if (!printWindow) return;
    const instLabel =
      Array.isArray(r.installmentNos) && r.installmentNos.length > 0
        ? r.installmentNos.join(', ')
        : r.installmentNo || '1';
    const prod = r.product || r.emiLoanId?.product;
    const prodLabel = prod?.name ? `${prod.name}${prod.brandModel ? ` (${prod.brandModel})` : ''}` : '';
    printWindow.document.write(`
      <html>
        <head>
          <title>EMI Receipt - ${r.receiptNo || 'VK'}</title>
          <style>
            body { font-family: monospace; padding: 15px; font-size: 12px; color: #183653; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #647C95; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total { font-size: 15px; font-weight: bold; margin: 8px 0; color: #0878D1; }
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
          ${prodLabel ? `<div class="row"><span>Product:</span><span class="bold">${prodLabel}</span></div>` : ''}
          ${prod?.serialImei ? `<div class="row"><span>Serial/IMEI:</span><span>${prod.serialImei}</span></div>` : ''}
          <div class="divider"></div>
          <div class="row"><span>Installment No:</span><span>#${instLabel}</span></div>
          <div class="row"><span>Payment Mode:</span><span class="bold">${(r.mode || 'cash').toUpperCase()}</span></div>
          <div class="row total"><span>Amount Paid:</span><span>₹${(Number(r.amount) || 0).toLocaleString('en-IN')}</span></div>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 12px;">Thank you for your timely payment!</div>
          <div class="center" style="font-size: 9px; color: #647C95;">கடன் தவணை நிதி மேலாண்மை</div>
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
    const prod = r.product || r.emiLoanId?.product;
    const prodLine = prod?.name ? `பொருள் / Product: *${prod.name}${prod.brandModel ? ` (${prod.brandModel})` : ''}*\n` : '';
    const msg =
      `*VK BANKER'S & FINANCE | தவணை ரசீது*\n\n` +
      `அன்புள்ள *${r.customerName}*,\n` +
      `தங்களின் EMI கடன் எண்: *${r.loanNo}*\n` +
      prodLine +
      `ரசீது எண்: *${r.receiptNo || 'N/A'}*\n` +
      `செலுத்திய தொகை: *₹${(Number(r.amount) || 0).toLocaleString('en-IN')}* (${(r.mode || 'cash').toUpperCase()})\n` +
      `தேதி: *${new Date(r.paymentDate || r.createdAt).toLocaleDateString('en-IN')}*\n\n` +
      `தங்களின் தவணை தொகை வெற்றிகரமாக வரவு வைக்கப்பட்டது.\nநன்றி! வி.கே. பேங்கர்ஸ்.`;
    const cleanPhone = r.customerPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] text-xs font-bold border border-[#D5E9FA]">
              {lang === 'ta' ? 'தவணை ரசீதுகள்' : 'EMI Receipts'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#183653] mt-1">
            {lang === 'ta' ? 'EMI தவணை வசூல் ரசீதுகள்' : 'Monthly EMI Receipts & Collection Log'}
          </h2>
          <p className="text-xs text-[#647C95]">
            {lang === 'ta'
              ? 'அனைத்து EMI தவணை ரசீதுகளின் பட்டியல், அச்சிடுதல் மற்றும் வாட்ஸ்அப் பகிர்வு'
              : 'View, search, print slips, reverse, and share receipts via WhatsApp'}
          </p>
        </div>
      </div>

      {/* Metric Mini-Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <span className="text-[10px] font-bold uppercase text-[#647C95]">Total Collected (Valid)</span>
          <div className="text-xl sm:text-2xl font-black text-[#0878D1] mt-0.5 tabular-nums">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#647C95]">{validReceipts.length} valid receipt(s)</span>
        </div>
        <div className="glass-card p-4">
          <span className="text-[10px] font-bold uppercase text-[#647C95]">Cash Collections</span>
          <div className="text-xl sm:text-2xl font-black text-[#18A879] mt-0.5 tabular-nums">
            ₹{totalCash.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#647C95]">Physical Cash Handover</span>
        </div>
        <div className="glass-card p-4">
          <span className="text-[10px] font-bold uppercase text-[#647C95]">UPI / Online</span>
          <div className="text-xl sm:text-2xl font-black text-[#064B8E] mt-0.5 tabular-nums">
            ₹{totalUpi.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#647C95]">GPay, PhonePe, Bank Transfer</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#0878D1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ta'
                ? 'ரசீது எண், வாடிக்கையாளர் பெயர், தொலைபேசி...'
                : 'Search by receipt #, customer name, phone...'
            }
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#F3F9FF] border border-[#D5E9FA] text-xs font-semibold text-[#183653] outline-none focus:border-[#0878D1]"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['all', 'cash', 'upi', 'cheque'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                modeFilter === m
                  ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-xs'
                  : 'bg-[#F3F9FF] text-[#647C95] hover:bg-[#EAF5FF] border border-[#D5E9FA]'
              }`}
            >
              {m === 'all' ? 'All' : m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Receipts List */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#647C95] font-bold">
            <div className="w-8 h-8 border-3 border-[#0878D1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading EMI Receipts...
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#647C95] font-bold">
            <Receipt className="w-8 h-8 text-[#D5E9FA] mx-auto mb-2" />
            No EMI receipts found matching current filters.
          </div>
        ) : (
          <div className="divide-y divide-[#EAF5FF]">
            {filteredReceipts.map((r, idx) => {
              const isReversed = r.status === 'reversed';
              const instLabel =
                Array.isArray(r.installmentNos) && r.installmentNos.length > 0
                  ? r.installmentNos.join(', ')
                  : r.installmentNo || '1';
              const targetLoanId = r.emiLoanId?._id || r.emiLoanId;
              const receiptProduct = r.product || r.emiLoanId?.product;

              return (
                <div
                  key={r._id || idx}
                  className={`p-3.5 sm:p-4 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isReversed ? 'bg-slate-50/70 opacity-65' : 'hover:bg-[#F3F9FF]/70'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                        isReversed
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]'
                      }`}
                    >
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          onClick={() => targetLoanId && onViewLoan && onViewLoan(targetLoanId)}
                          className={`font-black text-sm text-[#183653] truncate ${
                            targetLoanId && onViewLoan ? 'cursor-pointer hover:text-[#0878D1] hover:underline' : ''
                          } ${isReversed ? 'line-through' : ''}`}
                        >
                          {r.customerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]">
                          {r.loanNo}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            (r.mode || 'cash') === 'cash'
                              ? 'bg-emerald-50 text-[#18A879] border border-emerald-200'
                              : 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]'
                          }`}
                        >
                          {(r.mode || 'cash').toUpperCase()}
                        </span>
                        {isReversed && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700">
                            REVERSED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#647C95] mt-0.5 font-mono">
                        Receipt: <span className="font-bold text-[#183653]">{r.receiptNo || 'N/A'}</span> • Inst #{instLabel} •{' '}
                        {new Date(r.paymentDate || r.createdAt).toLocaleDateString('en-IN')}
                        {receiptProduct?.name ? ` • ${receiptProduct.name}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <div className="text-right">
                      <span
                        className={`text-base sm:text-lg font-black block tabular-nums ${
                          isReversed ? 'line-through text-rose-500' : 'text-[#183653]'
                        }`}
                      >
                        ₹{(Number(r.amount) || 0).toLocaleString('en-IN')}
                      </span>
                      {!isReversed && (
                        <span className="text-[10px] font-bold text-[#18A879] flex items-center justify-end space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handlePrintSlip(r)}
                        title="Print Thermal Slip"
                        className="p-2 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] transition active:scale-95"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWhatsAppReceipt(r)}
                        title="Share via WhatsApp"
                        className="p-2 rounded-xl bg-[#18A879] hover:bg-[#138861] text-white transition active:scale-95 shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      {isOwner && !isReversed && (
                        <button
                          type="button"
                          disabled={reversingId === r._id}
                          onClick={() => handleReverseReceipt(r)}
                          title="Reverse Receipt"
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition active:scale-95 disabled:opacity-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EMIReceipts;
