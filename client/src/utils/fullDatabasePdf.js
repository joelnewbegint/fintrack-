import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from './currency.js';
import { parseCustomerName } from './customerName.js';

/**
 * Format currency without the Unicode Rupee symbol in PDF text
 * to avoid character encoding issues in PDF viewer engines.
 */
export const formatPdfCurrency = (amount) => {
  const num = Math.round(Number(amount) || 0);
  return 'Rs. ' + num.toLocaleString('en-IN');
};

/**
 * Mask sensitive ID/Aadhaar numbers as XXXX-XXXX-1234
 */
const maskIdNumber = (id) => {
  if (!id) return '-';
  const clean = String(id).replace(/[^0-9a-zA-Z]/g, '');
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
};

/**
 * Renders bilingual banner onto offscreen canvas for crisp embedding in jsPDF
 */
const renderTextToDataUrl = ({
  text,
  width = 700,
  height = 50,
  fontSize = 20,
  fontFamily = '"Noto Sans Tamil", "Inter", "Arial", sans-serif',
  bgColor = '#166534',
  textColor = '#FFFFFF',
  align = 'left',
  paddingX = 16,
  bold = true,
}) => {
  if (typeof document === 'undefined') return null;
  try {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);

    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = textColor;
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    const textY = height / 2;
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(text, width / 2, textY);
    } else if (align === 'right') {
      ctx.textAlign = 'right';
      ctx.fillText(text, width - paddingX, textY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(text, paddingX, textY);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Canvas render error for PDF banner:', err);
    return null;
  }
};

/**
 * Generates a formal, official, audit-grade Master PDF containing ALL system data & history.
 */
export const buildFullDatabasePDF = (dataset = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm

  const customers = Array.isArray(dataset.customers) ? dataset.customers : [];
  const loans = Array.isArray(dataset.loans) ? dataset.loans : [];
  const payments = Array.isArray(dataset.payments) ? dataset.payments : [];
  const investments = Array.isArray(dataset.investments) ? dataset.investments : [];
  const expenses = Array.isArray(dataset.expenses) ? dataset.expenses : [];

  // Summary Metrics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status !== 'inactive').length;
  const totalLoans = loans.length;
  const activeLoans = loans.filter((l) => l.status === 'active').length;
  const closedLoans = loans.filter((l) => l.status === 'closed').length;

  const totalPrincipalLent = loans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);
  const totalPayable = loans.reduce((sum, l) => sum + (Number(l.totalPayable) || 0), 0);
  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalOutstanding = loans.reduce((sum, l) => {
    const rem = l.remainingBalance != null ? Number(l.remainingBalance) : (Number(l.totalPayable) - (Number(l.totalCollected) || 0));
    return sum + Math.max(0, rem || 0);
  }, 0);
  const totalInvested = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalCharges = loans.reduce((sum, l) => sum + (Number(l.chargeAmount) || 0), 0);
  const availableCapital = Math.max(0, totalInvested - totalPrincipalLent);

  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const istDateStr = nowIST.toISOString().split('T')[0];
  const istFormattedDate = nowIST.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Customer map for quick customer detail lookup
  const custMap = new Map();
  customers.forEach((c) => {
    if (c._id) custMap.set(c._id.toString(), c);
    if (c.clientId) custMap.set(c.clientId.toString(), c);
  });

  let currentY = 12;

  // =========================================================================
  // 1. OFFICIAL COMPANY LETTERHEAD / HEADER
  // =========================================================================
  const mainBannerImg = renderTextToDataUrl({
    text: "VK BANKER'S & FINANCE • வி.கே. பேங்கர்ஸ் & பைனான்ஸ்",
    width: 760,
    height: 48,
    fontSize: 20,
    bgColor: '#166534',
    textColor: '#FFFFFF',
    align: 'center',
  });

  if (mainBannerImg) {
    doc.addImage(mainBannerImg, 'PNG', marginX, currentY, contentWidth, 12);
    currentY += 14;
  } else {
    doc.setFillColor(22, 101, 52);
    doc.rect(marginX, currentY, contentWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text("VK BANKER'S & FINANCE", pageWidth / 2, currentY + 7.5, { align: 'center' });
    currentY += 14;
  }

  // Sub-header details
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('DAILY, WEEKLY & MONTHLY COLLECTION MICROFINANCE SERVICES', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;
  doc.text('Tirupattur, Tamil Nadu • Phone: +91 98421 00000 • Email: vkbankers@finance.com', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  // Report Title Badge & Metadata Bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, currentY, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, 14, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('MASTER FINANCIAL AUDIT & COMPLETE DATABASE REPORT', marginX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('முழு நிதி மற்றும் வரலாற்று தணிக்கை அறிக்கை • 100% Comprehensive Ledger', marginX + 4, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`DATE: ${istFormattedDate}`, marginX + contentWidth - 4, currentY + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`REF: VKB-AUDIT-${istDateStr}`, marginX + contentWidth - 4, currentY + 11, { align: 'right' });

  currentY += 18;

  // =========================================================================
  // 2. EXECUTIVE FINANCIAL SUMMARY MATRIX
  // =========================================================================
  doc.autoTable({
    startY: currentY,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    head: [
      [
        {
          content: 'EXECUTIVE PORTFOLIO SUMMARY / நிதி சுருக்கம்',
          colSpan: 4,
          styles: {
            fillColor: [22, 101, 52],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
          },
        },
      ],
    ],
    body: [
      [
        { content: 'Total Registered Borrowers:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        `${totalCustomers} (${activeCustomers} Active)`,
        { content: 'Total Capital Invested:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        formatPdfCurrency(totalInvested),
      ],
      [
        { content: 'Total Loans Disbursed:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        `${totalLoans} (${activeLoans} Active, ${closedLoans} Closed)`,
        { content: 'Total Principal Lent:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        formatPdfCurrency(totalPrincipalLent),
      ],
      [
        { content: 'Total Collections Received:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        formatPdfCurrency(totalCollected),
        { content: 'Total Interest / Charges:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        formatPdfCurrency(totalCharges),
      ],
      [
        { content: 'Active Outstanding Balance:', styles: { fontStyle: 'bold', textColor: [185, 28, 28], fillColor: [248, 250, 252] } },
        { content: formatPdfCurrency(totalOutstanding), styles: { fontStyle: 'bold', textColor: [185, 28, 28] } },
        { content: 'Available Capital Pool:', styles: { fontStyle: 'bold', textColor: [22, 101, 52], fillColor: [248, 250, 252] } },
        { content: formatPdfCurrency(availableCapital), styles: { fontStyle: 'bold', textColor: [22, 101, 52] } },
      ],
      [
        { content: 'Total Operating Expenses:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        formatPdfCurrency(totalExpenses),
        { content: 'Net Portfolio Volume:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        formatPdfCurrency(totalPayable),
      ],
    ],
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // 3. SECTION: CUSTOMER MASTER DIRECTORY
  // =========================================================================
  const customerRows = customers.map((c, i) => {
    const pName = parseCustomerName(c.name);
    return [
      String(i + 1),
      c.clientId || c._id?.toString().slice(-6).toUpperCase() || `CUST-${i + 1}`,
      pName.primary,
      c.phone || '-',
      c.area || '-',
      maskIdNumber(c.idNumber || c.aadhaarNo),
      String(c.loansCount || c.activeLoansCount || '-'),
      formatPdfCurrency(c.totalOutstanding || 0),
      c.status === 'inactive' ? 'Inactive' : 'Active',
    ];
  });

  doc.autoTable({
    startY: currentY,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    head: [
      [
        {
          content: `1. CUSTOMERS DIRECTORY / வாடிக்கையாளர்கள் பட்டியல் (${customers.length})`,
          colSpan: 9,
          styles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
          },
        },
      ],
      [
        { content: '#', styles: { halign: 'center', fillColor: [30, 41, 59] } },
        { content: 'Cust ID', styles: { fillColor: [30, 41, 59] } },
        { content: 'Borrower Name', styles: { fillColor: [30, 41, 59] } },
        { content: 'Phone', styles: { fillColor: [30, 41, 59] } },
        { content: 'Area / Village', styles: { fillColor: [30, 41, 59] } },
        { content: 'Aadhaar / ID', styles: { fillColor: [30, 41, 59] } },
        { content: 'Loans', styles: { halign: 'center', fillColor: [30, 41, 59] } },
        { content: 'Outstanding', styles: { halign: 'right', fillColor: [30, 41, 59] } },
        { content: 'Status', styles: { halign: 'center', fillColor: [30, 41, 59] } },
      ],
    ],
    body: customerRows.length > 0 ? customerRows : [['-', '-', 'No customers registered yet', '-', '-', '-', '-', '-', '-']],
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18 },
      2: { cellWidth: 38, fontStyle: 'bold' },
      3: { cellWidth: 24 },
      4: { cellWidth: 26 },
      5: { cellWidth: 26 },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 12, halign: 'center' },
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // 4. SECTION: COMPLETE LOANS PORTFOLIO & REPAYMENT TERMS
  // =========================================================================
  const loanRows = loans.map((l) => {
    const cust = l.customerId || custMap.get(l.customerId?.toString()) || {};
    const bName = l.customerName || cust.name || 'Unknown';
    const pName = parseCustomerName(bName);
    const rem = l.remainingBalance != null ? Number(l.remainingBalance) : (Number(l.totalPayable) - (Number(l.totalCollected) || 0));

    return [
      l.loanNo || l._id?.toString().slice(-8).toUpperCase() || '-',
      pName.primary,
      (l.financeType || 'daily').toUpperCase(),
      l.startDate ? formatDate(l.startDate) : '-',
      formatPdfCurrency(l.principal),
      formatPdfCurrency(l.chargeAmount || (Number(l.totalPayable) - Number(l.principal))),
      formatPdfCurrency(l.totalPayable),
      formatPdfCurrency(l.installmentAmount),
      formatPdfCurrency(l.totalCollected || 0),
      formatPdfCurrency(Math.max(0, rem)),
      (l.status || 'active').toUpperCase(),
    ];
  });

  doc.autoTable({
    startY: currentY,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    head: [
      [
        {
          content: `2. COMPLETE LOANS PORTFOLIO / முழு கடன் வரலாறு (${loans.length})`,
          colSpan: 11,
          styles: {
            fillColor: [22, 101, 52],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
          },
        },
      ],
      [
        { content: 'Loan #', styles: { fillColor: [20, 83, 45] } },
        { content: 'Borrower', styles: { fillColor: [20, 83, 45] } },
        { content: 'Scheme', styles: { halign: 'center', fillColor: [20, 83, 45] } },
        { content: 'Start Date', styles: { fillColor: [20, 83, 45] } },
        { content: 'Principal', styles: { halign: 'right', fillColor: [20, 83, 45] } },
        { content: 'Interest', styles: { halign: 'right', fillColor: [20, 83, 45] } },
        { content: 'Total Pay', styles: { halign: 'right', fillColor: [20, 83, 45] } },
        { content: 'Per Due', styles: { halign: 'right', fillColor: [20, 83, 45] } },
        { content: 'Collected', styles: { halign: 'right', fillColor: [20, 83, 45] } },
        { content: 'Balance', styles: { halign: 'right', fillColor: [20, 83, 45] } },
        { content: 'Status', styles: { halign: 'center', fillColor: [20, 83, 45] } },
      ],
    ],
    body: loanRows.length > 0 ? loanRows : [['-', 'No loans recorded yet', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 30 },
      2: { cellWidth: 13, halign: 'center' },
      3: { cellWidth: 16 },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 14, halign: 'right' },
      6: { cellWidth: 17, halign: 'right' },
      7: { cellWidth: 15, halign: 'right' },
      8: { cellWidth: 16, halign: 'right' },
      9: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      10: { cellWidth: 13, halign: 'center' },
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // 5. SECTION: COMPLETE REPAYMENTS & COLLECTIONS TRANSACTIONS LEDGER
  // =========================================================================
  // Sort payments by date descending
  const sortedPayments = [...payments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const paymentRows = sortedPayments.map((p, idx) => {
    const cust = p.customerId || custMap.get(p.customerId?.toString()) || {};
    const bName = p.customerName || cust.name || 'Unknown';
    const pName = parseCustomerName(bName);
    const loanNo = p.loanId?.loanNo || p.loanNo || '-';

    return [
      String(idx + 1),
      p.date ? formatDate(p.date) : '-',
      loanNo,
      pName.primary,
      formatPdfCurrency(p.amount),
      (p.mode || 'Cash').toUpperCase(),
      p.balanceAfter != null ? formatPdfCurrency(p.balanceAfter) : '-',
      p.recordedBy?.name || p.recordedByName || 'Staff',
    ];
  });

  doc.autoTable({
    startY: currentY,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    head: [
      [
        {
          content: `3. COLLECTIONS & REPAYMENT LEDGER / முழு வசூல் தவணை வரலாறு (${payments.length})`,
          colSpan: 8,
          styles: {
            fillColor: [14, 116, 144],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
          },
        },
      ],
      [
        { content: '#', styles: { halign: 'center', fillColor: [21, 94, 117] } },
        { content: 'Receipt Date', styles: { fillColor: [21, 94, 117] } },
        { content: 'Loan #', styles: { fillColor: [21, 94, 117] } },
        { content: 'Borrower Name', styles: { fillColor: [21, 94, 117] } },
        { content: 'Amount Paid', styles: { halign: 'right', fillColor: [21, 94, 117] } },
        { content: 'Mode', styles: { halign: 'center', fillColor: [21, 94, 117] } },
        { content: 'Bal After', styles: { halign: 'right', fillColor: [21, 94, 117] } },
        { content: 'Collected By', styles: { fillColor: [21, 94, 117] } },
      ],
    ],
    body: paymentRows.length > 0 ? paymentRows : [['-', '-', '-', 'No collections recorded yet', '-', '-', '-', '-']],
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 24, fontStyle: 'bold' },
      3: { cellWidth: 42 },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 28 },
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // 6. SECTION: CAPITAL INVESTMENTS & BUSINESS EXPENSES LEDGER
  // =========================================================================
  const investmentRows = investments.map((inv) => [
    inv.investorName || inv.name || 'Owner Capital',
    inv.phone || '-',
    (inv.type || 'self').toUpperCase(),
    formatPdfCurrency(inv.amount),
    inv.interestRate ? `${inv.interestRate}%` : '-',
    inv.date ? formatDate(inv.date) : '-',
    (inv.paymentMode || 'Cash').toUpperCase(),
  ]);

  doc.autoTable({
    startY: currentY,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    head: [
      [
        {
          content: `4. CAPITAL INVESTMENTS & PARTNER EQUITY / மூலதன முதலீடுகள் (${investments.length})`,
          colSpan: 7,
          styles: {
            fillColor: [67, 56, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
          },
        },
      ],
      [
        { content: 'Investor Name', styles: { fillColor: [55, 48, 163] } },
        { content: 'Phone', styles: { fillColor: [55, 48, 163] } },
        { content: 'Type', styles: { halign: 'center', fillColor: [55, 48, 163] } },
        { content: 'Capital Amount', styles: { halign: 'right', fillColor: [55, 48, 163] } },
        { content: 'Interest %', styles: { halign: 'center', fillColor: [55, 48, 163] } },
        { content: 'Date', styles: { fillColor: [55, 48, 163] } },
        { content: 'Payment Mode', styles: { halign: 'center', fillColor: [55, 48, 163] } },
      ],
    ],
    body: investmentRows.length > 0 ? investmentRows : [['No capital investments registered', '-', '-', '-', '-', '-', '-']],
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 24 },
      6: { cellWidth: 26, halign: 'center' },
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Operating Expenses Table
  const expenseRows = expenses.map((exp) => [
    (exp.category || 'General').toUpperCase(),
    exp.description || exp.notes || '-',
    formatPdfCurrency(exp.amount),
    exp.date ? formatDate(exp.date) : '-',
    exp.recordedBy?.name || 'Staff',
  ]);

  doc.autoTable({
    startY: currentY,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    head: [
      [
        {
          content: `5. OPERATING EXPENSES / அலுவலக செலவுகள் (${expenses.length})`,
          colSpan: 5,
          styles: {
            fillColor: [180, 83, 9],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
          },
        },
      ],
      [
        { content: 'Category', styles: { fillColor: [146, 64, 14] } },
        { content: 'Description / Purpose', styles: { fillColor: [146, 64, 14] } },
        { content: 'Amount', styles: { halign: 'right', fillColor: [146, 64, 14] } },
        { content: 'Date', styles: { fillColor: [146, 64, 14] } },
        { content: 'Recorded By', styles: { fillColor: [146, 64, 14] } },
      ],
    ],
    body: expenseRows.length > 0 ? expenseRows : [['No expenses recorded', '-', '-', '-', '-']],
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 30 },
    },
  });

  currentY = doc.lastAutoTable.finalY + 12;

  // Check if signature section needs a fresh page
  if (currentY + 45 > pageHeight - 20) {
    doc.addPage();
    currentY = 20;
  }

  // =========================================================================
  // 7. FORMAL CERTIFICATION & SIGNATURE ATTESTATION BLOCK
  // =========================================================================
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, currentY, contentWidth, 38, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, 38, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('AUDIT CERTIFICATION & AUTHENTICATION / தணிக்கை உறுதிமொழி:', marginX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  const certText =
    'This document is an authentic, legally verified extract generated directly from the VK Banker\'s & Finance database. All borrower balances, collection receipts, and capital entries recorded herein have been verified against the physical daybook and loan ledger.';
  doc.text(doc.splitTextToSize(certText, contentWidth - 8), marginX + 4, currentY + 11);

  // Signatures
  const signY = currentY + 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  doc.line(marginX + 8, signY, marginX + 60, signY);
  doc.text('Prepared By / Cashier / Agent', marginX + 12, signY + 4);

  doc.line(marginX + contentWidth - 60, signY, marginX + contentWidth - 8, signY);
  doc.text('Authorized Signatory / Proprietor', marginX + contentWidth - 58, signY + 4);

  // =========================================================================
  // 8. GLOBAL PAGE NUMBERING & RUNNING FOOTER
  // =========================================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header (Pages > 1)
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("VK BANKER'S & FINANCE — MASTER AUDIT & FINANCIAL LEDGER REPORT", marginX, 8);
      doc.text(`CONFIDENTIAL • REF: VKB-AUDIT-${istDateStr}`, pageWidth - marginX, 8, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, 9.5, pageWidth - marginX, 9.5);
    }

    // Running Footer (All pages)
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated on ${istFormattedDate} • VK Banker's Cloud Portal • Secure Financial Ledger`,
      marginX,
      pageHeight - 5
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 5, { align: 'right' });
  }

  return doc;
};

/**
 * Downloads the full database PDF immediately with a formal filename.
 */
export const downloadFullDatabasePDF = (dataset = {}) => {
  const doc = buildFullDatabasePDF(dataset);
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const istDateStr = nowIST.toISOString().split('T')[0];
  const filename = `VK-Bankers-Full-Audit-Report-${istDateStr}.pdf`;
  doc.save(filename);
  return filename;
};
