import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate } from '../../utils/currency';
import { openWhatsApp, generateReceiptMessage } from '../../utils/whatsapp';
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

      // Header Banner - Ocean Blue
      doc.setFillColor(31, 111, 200); // #1F6FC8
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text("VK BANKER'S & FINANCE", 105, 16, { align: 'center' });

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
      doc.setTextColor(43, 58, 74);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL PAYMENT RECEIPT / VOUCHER', 105, 48, { align: 'center' });

      // Receipt Info Table
      doc.autoTable({
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [244, 250, 255], textColor: [43, 58, 74], fontStyle: 'bold' },
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
        headStyles: { fillColor: [31, 111, 200], textColor: [255, 255, 255] },
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
    const message = generateReceiptMessage({
      customerName: customer.name || 'Customer',
      loanNo: loan.loanNo || 'VK-LOAN',
      receiptNo: payment.receiptNo || 'RCT-001',
      amount: payment.amount || 0,
      mode: payment.mode || 'CASH',
      date: payment.date || new Date(),
      remainingBalance: loan.remainingBalance || 0,
      lang: 'ta',
    });
    openWhatsApp({ phone: customer.phone, message });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2B3A4A]/40 backdrop-blur-sm animate-fade-in max-w-[430px] sm:max-w-none mx-auto left-0 right-0">
      <div className="bg-white/95 backdrop-blur-md rounded-t-[28px] sm:rounded-[24px] max-w-lg w-full p-5 sm:p-6 shadow-ocean-lg border border-white/95 max-h-[92vh] overflow-y-auto text-ink">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 rounded-full bg-[#BFE3FA] mx-auto mb-3 sm:hidden no-print" />

        {/* Modal Controls */}
        <div className="flex justify-between items-center pb-3 border-b border-[#BFE3FA] no-print">
          <div className="flex items-center space-x-2 text-[#1F6B4F] font-bold text-sm sm:text-base">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-[#1F6B4F]" />
            <span className="truncate">Payment Recorded Successfully</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white text-muted hover:text-ink transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Voucher Content */}
        <div id="printable-receipt" className="py-4 text-ink">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-dashed border-[#BFE3FA]">
            <h2 className="text-xl font-black text-[#1F6FC8] tracking-tight">
              வி.கே. பேங்கர்ஸ் & பைனான்ஸ்
            </h2>
            <p className="text-sm font-bold text-ink">
              VK BANKER'S & FINANCE
            </p>
            <p className="text-xs text-muted">
              45, Cross Cut Road, Gandhipuram, Coimbatore - 641012
            </p>
            <p className="text-xs text-muted">
              Ph: +91 98421 12345 | Daily • Weekly • Monthly
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-[#BFE3FA] rounded-full text-xs font-bold uppercase tracking-wider text-[#1F6FC8] border border-[#6FB4F2]/50">
              Collection Receipt Voucher
            </div>
          </div>

          {/* Details Table */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#BFE3FA]/50">
              <span className="text-muted font-medium">Receipt No:</span>
              <span className="font-mono font-bold text-ink">
                {payment.receiptNo}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#BFE3FA]/50">
              <span className="text-muted font-medium">Date & Time:</span>
              <span className="font-semibold text-ink">{formatDate(payment.date)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#BFE3FA]/50">
              <span className="text-muted font-medium">Customer Name:</span>
              <span className="font-bold text-ink">
                {customer.name}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#BFE3FA]/50">
              <span className="text-muted font-medium">Phone / Area:</span>
              <span className="font-medium text-ink">
                {customer.phone} ({customer.area})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#BFE3FA]/50">
              <span className="text-muted font-medium">Loan Account:</span>
              <span className="font-mono font-bold text-[#1F6FC8]">
                {loan.loanNo} ({loan.financeType?.toUpperCase()})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#BFE3FA]/50">
              <span className="text-muted font-medium">Payment Mode:</span>
              <span className="badge-paid uppercase px-2 py-0.5 rounded-full font-bold text-[10px]">
                {payment.mode || 'CASH'}
              </span>
            </div>

            {/* Highlighted Amount */}
            <div className="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-[#BFE3FA]/50 to-[#8EC5F5]/30 border border-[#BFE3FA] flex justify-between items-center shadow-xs">
              <div>
                <p className="text-[11px] font-bold text-[#1F6FC8] uppercase">
                  Amount Received
                </p>
                <p className="text-2xl font-black text-ink tabular-nums">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted">
                  Remaining Balance
                </p>
                <p className="text-base font-bold text-[#8A4A1F] tabular-nums">
                  {formatCurrency(loan.remainingBalance || 0)}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-[11px] text-muted">
              <span>Collected By: {collector.name || 'Owner'}</span>
              <div className="text-right">
                <p className="font-semibold text-ink">Authorized Signatory</p>
                <p className="text-[10px] text-muted">VK Banker's & Finance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-3 gap-2.5 no-print">
          <button
            onClick={handlePrint}
            className="btn-secondary min-h-[44px] py-2 px-3 text-xs font-bold"
          >
            <Printer className="w-4 h-4 text-[#1F6FC8] mr-1" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="btn-accent min-h-[44px] py-2 px-3 text-xs font-bold shadow-ocean"
          >
            <Download className="w-4 h-4 text-ink mr-1" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center justify-center rounded-full min-h-[44px] py-2 px-3 bg-[#1F6B4F] hover:bg-[#18553f] font-bold text-xs text-white transition shadow-sm active:scale-95"
          >
            <Share2 className="w-4 h-4 text-white mr-1" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
