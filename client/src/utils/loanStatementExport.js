import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDate, formatCurrency } from './currency';
import { parseCustomerName } from './customerName';
import { openWhatsApp } from './whatsapp';

/**
 * Format currency without unicode symbol for PDF export to avoid font encoding issues.
 */
const formatPdfCurrency = (amount) => {
  const num = Math.round(Number(amount) || 0);
  return 'Rs. ' + num.toLocaleString('en-IN');
};

/**
 * Filter schedule installments by selected period: 'all' | 'this_month' | 'custom'
 */
export const filterScheduleByPeriod = (schedule = [], period = 'all', startDate = '', endDate = '') => {
  if (!Array.isArray(schedule)) return [];
  if (period === 'all') return [...schedule];

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  return schedule.filter((inst) => {
    const rawDate = inst.dueDate || inst.paidDate || inst.date;
    if (!rawDate) return false;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return false;

    if (period === 'this_month') {
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    }

    if (period === 'custom') {
      const dStr = d.toISOString().slice(0, 10);
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;
      return true;
    }

    return true;
  });
};

/**
 * Get display label for selected period
 */
export const getPeriodLabel = (period, startDate = '', endDate = '') => {
  if (period === 'this_month') {
    const now = new Date();
    return now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }
  if (period === 'custom') {
    if (startDate && endDate) {
      return `${formatDate(startDate)} to ${formatDate(endDate)}`;
    }
    if (startDate) return `From ${formatDate(startDate)}`;
    if (endDate) return `Up to ${formatDate(endDate)}`;
    return 'Custom Dates';
  }
  return 'All Installments / முழு வரலாறு';
};

/**
 * Export Loan History as Excel (.xlsx) file
 */
export const exportLoanHistoryExcel = ({
  loan,
  customer = {},
  payments = [],
  period = 'all',
  startDate = '',
  endDate = '',
}) => {
  if (!loan) return;

  const cust = customer?.name ? customer : loan.customerId || {};
  const custName = parseCustomerName(cust.name || loan.customerName || 'Borrower').primary;
  const filteredSchedule = filterScheduleByPeriod(loan.schedule || [], period, startDate, endDate);
  const periodLabel = getPeriodLabel(period, startDate, endDate);
  const now = new Date();
  const generatedDateStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Calculate totals for export
  const totalPrincipal = Number(loan.principal || 0);
  const totalPayable = Number(loan.totalPayable || totalPrincipal);
  const totalInterest = Math.max(0, totalPayable - totalPrincipal);
  const instAmt = Number(loan.installmentAmount || 0);

  let periodPaidSum = 0;
  let periodOverdueSum = 0;

  const paymentMap = new Map();
  if (Array.isArray(payments)) {
    payments.forEach((p) => {
      const instNo = p.installmentNo || p.dueDetails?.installmentNo;
      if (instNo) paymentMap.set(instNo, p);
    });
  }

  const tableRows = filteredSchedule.map((inst) => {
    const pInfo = paymentMap.get(inst.installmentNo);
    const isPaid = inst.status === 'paid';
    const isOverdue = inst.status === 'overdue' || (!isPaid && new Date(inst.dueDate) < now);
    const amount = Number(inst.amount || instAmt);
    const paid = Number(inst.paidAmount || (isPaid ? amount : 0));

    periodPaidSum += paid;
    if (isOverdue && !isPaid && inst.status !== 'holiday') {
      periodOverdueSum += Math.max(0, amount - paid);
    }

    const mode = pInfo?.mode ? pInfo.mode.toUpperCase() : isPaid ? 'CASH' : '-';
    const collectedBy = pInfo?.collectedBy || (isPaid ? 'Staff / Agent' : '-');
    const paidDate = inst.paidDate ? formatDate(inst.paidDate) : pInfo?.date ? formatDate(pInfo.date) : '-';

    return [
      inst.installmentNo,
      inst.dueDate ? formatDate(inst.dueDate) : '-',
      amount,
      paid,
      inst.status ? inst.status.toUpperCase() : 'PENDING',
      paidDate,
      mode,
      collectedBy,
    ];
  });

  const wsData = [
    ["VK BANKER'S & FINANCE"],
    ['LOAN REPAYMENT STATEMENT / கடன் அறிக்கை'],
    [`Period: ${periodLabel}`, '', '', `Generated: ${generatedDateStr}`],
    [],
    ['BORROWER & LOAN DETAILS', '', '', 'FINANCIAL SUMMARY'],
    [`Borrower Name: ${custName}`, '', '', `Principal Disbursed: ₹${totalPrincipal.toLocaleString('en-IN')}`],
    [`Phone: ${cust.phone || '-'}`, '', '', `Total Interest: ₹${totalInterest.toLocaleString('en-IN')}`],
    [`Area: ${cust.area || '-'}`, '', '', `Total Payable: ₹${totalPayable.toLocaleString('en-IN')}`],
    [`Loan Number: ${loan.loanNo}`, '', '', `Per Installment: ₹${instAmt.toLocaleString('en-IN')}`],
    [`Scheme: ${String(loan.financeType || 'daily').toUpperCase()}`, '', '', `Total Collected: ₹${(loan.totalCollected || 0).toLocaleString('en-IN')}`],
    [`Total Dues: ${loan.duration || loan.schedule?.length || 100}`, '', '', `Remaining Balance: ₹${(loan.remainingBalance || 0).toLocaleString('en-IN')}`],
    [`Account Status: ${String(loan.status || 'active').toUpperCase()}`, '', '', `Period Overdue: ₹${periodOverdueSum.toLocaleString('en-IN')}`],
    [],
    ['#', 'Due Date', 'Amount (INR)', 'Paid (INR)', 'Status', 'Paid Date', 'Payment Mode', 'Collected By'],
    ...tableRows,
    [],
    ['TOTALS', `${filteredSchedule.length} dues`, '', periodPaidSum, '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // #
    { wch: 16 }, // Due Date
    { wch: 15 }, // Amount
    { wch: 15 }, // Paid
    { wch: 14 }, // Status
    { wch: 16 }, // Paid Date
    { wch: 16 }, // Mode
    { wch: 20 }, // Collected By
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Repayment Statement');

  const cleanPeriod = period === 'custom' ? 'Custom' : period === 'this_month' ? 'ThisMonth' : 'All';
  const fileName = `${loan.loanNo}_Statement_${cleanPeriod}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export Loan History as PDF Statement
 */
export const exportLoanHistoryPDF = ({
  loan,
  customer = {},
  payments = [],
  period = 'all',
  startDate = '',
  endDate = '',
}) => {
  if (!loan) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const cust = customer?.name ? customer : loan.customerId || {};
  const custName = parseCustomerName(cust.name || loan.customerName || 'Borrower').primary;
  const filteredSchedule = filterScheduleByPeriod(loan.schedule || [], period, startDate, endDate);
  const periodLabel = getPeriodLabel(period, startDate, endDate);
  const now = new Date();
  const generatedDateStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const totalPrincipal = Number(loan.principal || 0);
  const totalPayable = Number(loan.totalPayable || totalPrincipal);
  const totalInterest = Math.max(0, totalPayable - totalPrincipal);
  const instAmt = Number(loan.installmentAmount || 0);
  const totalCollected = Number(loan.totalCollected || 0);
  const remainingBal = Number(loan.remainingBalance || 0);

  // Outer border & header rule
  doc.setDrawColor(213, 233, 250);
  doc.setLineWidth(0.4);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin - 2) * 2);

  let cursorY = margin + 3;

  // Header Title
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(8, 120, 209); // #0878D1
  doc.text("VK BANKER'S & FINANCE", pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 54, 83); // #183653
  doc.text('LOAN REPAYMENT STATEMENT • தவணை கணக்கு அறிக்கை', pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 124, 149);
  doc.text(`Period: ${periodLabel}   |   Generated: ${generatedDateStr}`, pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 3;
  doc.setDrawColor(8, 120, 209);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  cursorY += 4;

  // Metadata Card
  doc.setDrawColor(213, 233, 250);
  doc.setFillColor(243, 249, 255); // #F3F9FF
  doc.roundedRect(margin, cursorY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 124, 149);
  doc.text('BORROWER:', margin + 3, cursorY + 5);
  doc.setTextColor(24, 54, 83);
  doc.text(custName, margin + 24, cursorY + 5);

  doc.setTextColor(100, 124, 149);
  doc.text('PHONE / AREA:', margin + 3, cursorY + 10);
  doc.setTextColor(24, 54, 83);
  doc.text(`${cust.phone || '-'}  •  ${cust.area || '-'}`, margin + 24, cursorY + 10);

  doc.setTextColor(100, 124, 149);
  doc.text('LOAN NO:', margin + 78, cursorY + 5);
  doc.setTextColor(8, 120, 209);
  doc.text(loan.loanNo || '-', margin + 94, cursorY + 5);

  doc.setTextColor(100, 124, 149);
  doc.text('SCHEME:', margin + 78, cursorY + 10);
  doc.setTextColor(24, 54, 83);
  doc.text(`${String(loan.financeType || 'daily').toUpperCase()} (${loan.duration || loan.schedule?.length || 100} Dues)`, margin + 94, cursorY + 10);

  doc.setTextColor(100, 124, 149);
  doc.text('PER DUE:', margin + 78, cursorY + 15);
  doc.setTextColor(8, 120, 209);
  doc.text(formatPdfCurrency(instAmt), margin + 94, cursorY + 15);

  doc.setTextColor(100, 124, 149);
  doc.text('TOTAL DUE:', margin + 138, cursorY + 5);
  doc.setTextColor(24, 54, 83);
  doc.text(formatPdfCurrency(totalPayable), margin + 158, cursorY + 5);

  doc.setTextColor(100, 124, 149);
  doc.text('PAID:', margin + 138, cursorY + 10);
  doc.setTextColor(24, 168, 121); // #18A879
  doc.text(formatPdfCurrency(totalCollected), margin + 158, cursorY + 10);

  doc.setTextColor(100, 124, 149);
  doc.text('BALANCE:', margin + 138, cursorY + 15);
  doc.setTextColor(190, 80, 0); // Amber/orange
  doc.text(formatPdfCurrency(remainingBal), margin + 158, cursorY + 15);

  cursorY += 25;

  const paymentMap = new Map();
  if (Array.isArray(payments)) {
    payments.forEach((p) => {
      const instNo = p.installmentNo || p.dueDetails?.installmentNo;
      if (instNo) paymentMap.set(instNo, p);
    });
  }

  const tableRows = filteredSchedule.map((inst) => {
    const pInfo = paymentMap.get(inst.installmentNo);
    const isPaid = inst.status === 'paid';
    const amount = Number(inst.amount || instAmt);
    const paid = Number(inst.paidAmount || (isPaid ? amount : 0));
    const mode = pInfo?.mode ? pInfo.mode.toUpperCase() : isPaid ? 'CASH' : '-';
    const paidDate = inst.paidDate ? formatDate(inst.paidDate) : pInfo?.date ? formatDate(pInfo.date) : '-';
    const statusText = (inst.status || 'PENDING').toUpperCase();

    return [
      { content: String(inst.installmentNo), styles: { halign: 'center' } },
      { content: inst.dueDate ? formatDate(inst.dueDate) : '-' },
      { content: formatPdfCurrency(amount), styles: { halign: 'right' } },
      { content: paid > 0 ? formatPdfCurrency(paid) : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: statusText, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: paidDate },
      { content: mode, styles: { halign: 'center' } },
      { content: pInfo?.collectedBy || (isPaid ? 'Staff' : '-'), styles: { halign: 'left' } },
    ];
  });

  doc.autoTable({
    startY: cursorY,
    head: [
      [
        { content: '#', styles: { halign: 'center' } },
        { content: 'Due Date' },
        { content: 'Amount', styles: { halign: 'right' } },
        { content: 'Paid', styles: { halign: 'right' } },
        { content: 'Status', styles: { halign: 'center' } },
        { content: 'Paid Date' },
        { content: 'Mode', styles: { halign: 'center' } },
        { content: 'Collected By' },
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 1.3,
      textColor: [24, 54, 83],
      lineColor: [213, 233, 250],
      lineWidth: 0.15,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [8, 120, 209],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    alternateRowStyles: {
      fillColor: [243, 249, 255],
    },
    columnStyles: {
      0: { cellWidth: 9 },
      1: { cellWidth: 26 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 22 },
      5: { cellWidth: 26 },
      6: { cellWidth: 18 },
      7: { cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw?.content || data.cell.raw);
        if (val === 'PAID') {
          data.cell.styles.textColor = [24, 168, 121]; // #18A879
        } else if (val === 'OVERDUE') {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
        } else if (val === 'HOLIDAY') {
          data.cell.styles.textColor = [190, 80, 0]; // Amber
        }
      }
    },
  });

  const cleanPeriod = period === 'custom' ? 'Custom' : period === 'this_month' ? 'ThisMonth' : 'All';
  const fileName = `${loan.loanNo}_Statement_${cleanPeriod}.pdf`;
  doc.save(fileName);
};

/**
 * Share Loan History Summary on WhatsApp
 */
export const shareLoanHistoryWhatsApp = ({
  loan,
  customer = {},
  period = 'all',
  startDate = '',
  endDate = '',
}) => {
  if (!loan) return;

  const cust = customer?.name ? customer : loan.customerId || {};
  const custName = parseCustomerName(cust.name || loan.customerName || 'Borrower').primary;
  const periodLabel = getPeriodLabel(period, startDate, endDate);
  const now = new Date();
  const generatedDateStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const totalPrincipal = Number(loan.principal || 0);
  const totalPayable = Number(loan.totalPayable || totalPrincipal);
  const totalCollected = Number(loan.totalCollected || 0);
  const remainingBal = Number(loan.remainingBalance || 0);
  const instAmt = Number(loan.installmentAmount || 0);

  const msg = `*VK BANKER'S & FINANCE* 🏦
*Loan Repayment Statement / கடன் அறிக்கை*
----------------------------------------
👤 *Borrower:* ${custName}
📞 *Phone:* ${cust.phone || '-'}
📋 *Loan No:* ${loan.loanNo} (${String(loan.financeType || 'daily').toUpperCase()})
💰 *Per Due:* ${formatCurrency(instAmt)}
----------------------------------------
📊 *SUMMARY (${periodLabel})*
• Principal Disbursed: ${formatCurrency(totalPrincipal)}
• Total Payable: ${formatCurrency(totalPayable)}
• Total Collected: ${formatCurrency(totalCollected)}
• *Remaining Balance:* ${formatCurrency(remainingBal)}
• Account Status: ${String(loan.status || 'active').toUpperCase()}
----------------------------------------
📅 Statement Date: ${generatedDateStr}
Thank you! / நன்றி!`;

  openWhatsApp({ phone: cust.phone, message: msg });
};

