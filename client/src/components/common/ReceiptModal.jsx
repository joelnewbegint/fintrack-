import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate } from '../../utils/currency';
import { Printer, Download, Share2, X, CheckCircle, ShieldCheck } from 'lucide-react';

export const ReceiptModal = ({ payment, onClose }) => {
  if (!payment) return null;

  const customer = payment.customerId || {};
  const loan = payment.loanId || {};
  const collector = payment.collectedBy || {};

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();

      // Header Banner
      doc.setFillColor(37, 99, 235); // Blue
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('SRI MURUGAN FINANCE', 105, 16, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Daily, Weekly & Monthly Microfinance | Gandhipuram, Coimbatore - 641012',
        105,
        24,
        { align: 'center' }
      );
      doc.text('Phone: +91 98421 12345 | Tamil Nadu Registered Financier', 105, 30, {
        align: 'center',
      });

      // Receipt Title & Box
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL PAYMENT RECEIPT / VOUCHER', 105, 48, { align: 'center' });

      // Receipt Info Table
      doc.autoTable({
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        body: [
          ['Receipt Number:', payment.receiptNo, 'Payment Date:', formatDate(payment.date)],
          ['Customer Name:', customer.name || 'N/A', 'Contact Phone:', customer.phone || 'N/A'],
          ['Area / Location:', customer.area || 'Coimbatore', 'Payment Mode:', (payment.mode || 'CASH').toUpperCase()],
          ['Loan Account No:', loan.loanNo || 'N/A', 'Finance Scheme:', (loan.financeType || 'DAILY').toUpperCase()],
        ],
      });

      // Financial Details Table
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        theme: 'striped',
        head: [['Description', 'Amount (INR)']],
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        styles: { fontSize: 11, cellPadding: 5 },
        body: [
          ['Installment Amount Paid', formatCurrency(payment.amount)],
          ['Remaining Loan Balance', formatCurrency(loan.remainingBalance || 0)],
        ],
      });

      // Footer Notes & Signature
      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'Note: This is a computer-generated voucher. Keep this receipt safe for your records.',
        14,
        finalY
      );

      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signature / Seal:', 140, finalY);
      doc.line(140, finalY + 12, 195, finalY + 12);
      doc.setFontSize(8);
      doc.text(`Collected by: ${collector.name || 'Cashier'}`, 140, finalY + 17);

      doc.save(`Receipt_${payment.receiptNo}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not download PDF. You can use Print Receipt button.');
    }
  };

  const handleShareWhatsApp = () => {
    const phone = customer.phone?.replace(/[^0-9]/g, '');
    const message = `வணக்கம் ${customer.name || ''},\nஸ்ரீ முருகன் பைனான்ஸ் நிறுவனத்தில் உங்கள் கடன் கணக்கு (${loan.loanNo || ''}) தவணைத் தொகை ${formatCurrency(payment.amount)} (${payment.mode?.toUpperCase()}) வெற்றிகரமாக பெறப்பட்டது.\nரசீது எண்: ${payment.receiptNo}\nதேதி: ${formatDate(payment.date)}\nமீதி இருப்பு: ${formatCurrency(loan.remainingBalance || 0)}.\nநன்றி!`;
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in max-w-[430px] sm:max-w-none mx-auto left-0 right-0">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden no-print" />

        {/* Modal Controls */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 no-print">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Payment Recorded Successfully</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Voucher Content */}
        <div id="printable-receipt" className="py-4 text-slate-800 dark:text-slate-200">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-dashed border-slate-300 dark:border-slate-700">
            <h2 className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
              ஸ்ரீ முருகன் பைனான்ஸ்
            </h2>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              SRI MURUGAN FINANCE
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              45, Cross Cut Road, Gandhipuram, Coimbatore - 641012
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ph: +91 98421 12345 | Daily • Weekly • Monthly
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Collection Receipt Voucher
            </div>
          </div>

          {/* Details Table */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {payment.receiptNo}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Date & Time:</span>
              <span className="font-semibold">{formatDate(payment.date)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Customer Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {customer.name}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Phone / Area:</span>
              <span className="font-medium">
                {customer.phone} ({customer.area})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Loan Account:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {loan.loanNo} ({loan.financeType?.toUpperCase()})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                {payment.mode || 'CASH'}
              </span>
            </div>

            {/* Highlighted Amount */}
            <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/60 border border-blue-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">
                  Amount Received
                </p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Remaining Balance
                </p>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(loan.remainingBalance || 0)}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500">
              <span>Collected By: {collector.name || 'Owner'}</span>
              <div className="text-right">
                <p className="font-semibold">Authorized Signatory</p>
                <p className="text-[10px] text-slate-400">Sri Murugan Finance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-3 gap-2.5 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center space-x-1.5 min-h-[48px] py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="btn-sky-primary flex items-center justify-center space-x-1.5 min-h-[48px] py-2.5 px-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center space-x-1.5 min-h-[48px] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs text-white transition shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
