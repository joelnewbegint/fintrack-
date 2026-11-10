import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate } from './currency';

/**
 * Generates or enriches the complete installment-by-installment schedule for a loan.
 * Ensures that all installments (1..duration) are listed with their scheduled due dates,
 * expected amounts, actual paid amounts, receipt numbers, and status.
 */
export const generateLoanSchedule = (loan, loanPayments = []) => {
  if (!loan) return [];

  const duration = Number(loan.duration) || (loan.financeType === 'daily' ? 100 : loan.financeType === 'weekly' ? 10 : 3);
  const instAmount = Number(loan.installmentAmount) || Math.round(Number(loan.totalPayable || loan.principal || 0) / duration);
  const totalPayable = Number(loan.totalPayable || loan.principal || 0);
  const startDate = loan.startDate ? new Date(loan.startDate) : new Date();

  // If loan already has a full pre-populated schedule from database
  if (Array.isArray(loan.schedule) && loan.schedule.length >= duration) {
    return loan.schedule;
  }

  // Sort payments for this loan chronologically
  const payments = [...loanPayments].sort((a, b) => new Date(a.date || a.paymentDate) - new Date(b.date || b.paymentDate));

  const schedule = [];
  let currentDate = new Date(startDate);
  let totalAllocated = 0;
  const now = new Date();

  for (let i = 1; i <= duration; i++) {
    const nextDate = new Date(currentDate);
    if (loan.financeType === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (loan.financeType === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    currentDate = nextDate;

    let targetAmt = instAmount;
    if (i === duration) {
      targetAmt = Math.max(0, totalPayable - (instAmount * (duration - 1)));
    }

    const p = payments[i - 1];
    let paidAmount = 0;
    let paidDate = null;
    let receiptNo = '';
    let isPaid = false;

    if (p) {
      paidAmount = Number(p.amount) || 0;
      paidDate = p.date || p.paymentDate;
      receiptNo = p.receiptNo || '';
      isPaid = paidAmount >= targetAmt;
      totalAllocated += paidAmount;
    } else if (loan.status === 'completed' || (totalAllocated + targetAmt <= Number(loan.totalCollected || 0))) {
      paidAmount = targetAmt;
      isPaid = true;
      totalAllocated += targetAmt;
      paidDate = currentDate.toISOString();
      receiptNo = `AUTO-${i}`;
    }

    const isOverdue = !isPaid && currentDate < now;
    const status = isPaid ? 'paid' : paidAmount > 0 ? 'partial' : isOverdue ? 'overdue' : 'pending';

    schedule.push({
      installmentNo: i,
      dueDate: currentDate.toISOString(),
      amount: targetAmt,
      paidAmount,
      paidDate,
      receiptNo,
      status,
    });
  }

  return schedule;
};

/**
 * Compiles a customer's complete multi-loan repayment audit trail
 * with running balance tracking.
 */
export const buildCustomerFullLedger = (customer, loans = [], payments = []) => {
  const sortedPayments = [...payments].sort((a, b) => new Date(a.date || a.paymentDate) - new Date(b.date || b.paymentDate));

  const totalBorrowed = loans.reduce((acc, l) => acc + (Number(l.totalPayable || l.principal) || 0), 0);
  let runningBalance = totalBorrowed;

  return sortedPayments.map((p, idx) => {
    const amt = Number(p.amount) || 0;
    runningBalance = Math.max(0, runningBalance - amt);
    const loanDoc = typeof p.loanId === 'object' && p.loanId ? p.loanId : loans.find((l) => String(l._id) === String(p.loanId));

    return {
      index: idx + 1,
      receiptNo: p.receiptNo || `RCP-${idx + 1}`,
      date: p.date || p.paymentDate,
      loanNo: loanDoc?.loanNo || 'LOAN',
      scheme: loanDoc?.financeType || 'daily',
      amount: amt,
      mode: (p.mode || 'cash').toUpperCase(),
      runningBalance,
      notes: p.notes || '',
      collector: (typeof p.collectedBy === 'object' && p.collectedBy?.name) ? p.collectedBy.name : 'Authorized FinTrack Agent',
      raw: p,
    };
  });
};

/**
 * Exports customer profile statement as a standard CSV/Excel file.
 */
export const exportCustomerStatementCSV = (customer, loans = [], payments = []) => {
  if (!customer) return;

  const totalBorrowed = loans.reduce((acc, l) => acc + (Number(l.principal) || 0), 0);
  const totalPayable = loans.reduce((acc, l) => acc + (Number(l.totalPayable || l.principal) || 0), 0);
  const totalRepaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue' || (l.remainingBalance || 0) > 0);
  const totalOutstanding = activeLoans.reduce((acc, l) => acc + (Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0), 0);

  const ledger = buildCustomerFullLedger(customer, loans, payments);

  const clean = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

  const rows = [
    ['VK BANKER\'S & FINANCE - OFFICIAL CUSTOMER STATEMENT'],
    ['Head Office: 45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu'],
    ['Phone: +91 98421 12345 | Tamil Nadu Microfinance Network'],
    [''],
    ['CUSTOMER PROFILE INFORMATION'],
    ['Customer Name', customer.name],
    ['Phone Number', `+91 ${customer.phone}`],
    ['Area / Collection Circle', customer.area],
    ['Residential Address', customer.address],
    ['ID Proof Type', `${customer.idProofType}: ${customer.idProofNumber || 'Verified'}`],
    ['Guarantor Name', customer.guarantor?.name ? `${customer.guarantor.name} (${customer.guarantor.relationship || 'Witness'})` : 'None'],
    ['Statement Date', new Date().toLocaleDateString('en-IN')],
    [''],
    ['FINANCIAL SUMMARY'],
    ['Total Principal Borrowed (INR)', totalBorrowed],
    ['Total Repayable (INR)', totalPayable],
    ['Total Amount Repaid (INR)', totalRepaid],
    ['Current Outstanding Due (INR)', totalOutstanding],
    ['Total Loans Issued', loans.length],
    ['Active Loans Count', activeLoans.length],
    ['Total Payments Recorded', payments.length],
    [''],
    ['REGISTERED LOANS SUMMARY'],
    ['Loan Number', 'Scheme', 'Principal (INR)', 'Total Payable (INR)', 'Disbursed (INR)', 'Repaid (INR)', 'Remaining Due (INR)', 'Status', 'Start Date'],
    ...loans.map((l) => [
      l.loanNo,
      (l.financeType || 'daily').toUpperCase(),
      l.principal,
      l.totalPayable || l.principal,
      l.disbursedAmount || l.principal,
      l.totalCollected || 0,
      l.remainingBalance != null ? l.remainingBalance : 0,
      (l.status || 'active').toUpperCase(),
      formatDate(l.startDate),
    ]),
    [''],
    ['FULL REPAYMENT TRANSACTION SCHEDULE & AUDIT TRAIL'],
    ['#', 'Receipt No', 'Date', 'Loan Account', 'Scheme', 'Amount Paid (INR)', 'Remaining Balance (INR)', 'Payment Mode', 'Notes', 'Collected By'],
    ...ledger.map((item) => [
      item.index,
      item.receiptNo,
      formatDate(item.date),
      item.loanNo,
      item.scheme.toUpperCase(),
      item.amount,
      item.runningBalance,
      item.mode,
      item.notes,
      item.collector,
    ]),
  ];

  const csvContent = '\uFEFF' + rows.map((r) => r.map(clean).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `VK_Bankers_Statement_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads an official multi-page PDF Statement of Account
 * for the customer using jsPDF and AutoTable.
 */
export const downloadCustomerStatementPDF = (customer, loans = [], payments = []) => {
  if (!customer) return;

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 1. Top Header Banner
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("VK BANKER'S & FINANCE", 105, 14, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Daily Thandal, Weekly & Monthly Microfinance | Coimbatore, Tamil Nadu', 105, 20, { align: 'center' });
    doc.text('Phone: +91 98421 12345 | Official Customer Account & Payment Schedule Ledger', 105, 25, { align: 'center' });

    // 2. Title Strip
    doc.setFillColor(14, 165, 233); // Sky-500
    doc.rect(0, 32, 210, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL BORROWER ACCOUNT STATEMENT & REPAYMENT SCHEDULE', 105, 37.5, { align: 'center' });

    // 3. Customer Info Grid
    doc.autoTable({
      startY: 44,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      body: [
        [
          { content: 'Customer Name:', styles: { fontStyle: 'bold' } },
          customer.name,
          { content: 'Mobile Phone:', styles: { fontStyle: 'bold' } },
          `+91 ${customer.phone}`,
        ],
        [
          { content: 'Collection Circle:', styles: { fontStyle: 'bold' } },
          customer.area,
          { content: 'ID Proof:', styles: { fontStyle: 'bold' } },
          `${customer.idProofType}: ${customer.idProofNumber || 'Verified'}`,
        ],
        [
          { content: 'Residential Address:', styles: { fontStyle: 'bold' } },
          customer.address || customer.area,
          { content: 'Guarantor / Witness:', styles: { fontStyle: 'bold' } },
          customer.guarantor?.name ? `${customer.guarantor.name} (${customer.guarantor.relationship || 'Guarantor'})` : 'None Recorded',
        ],
        [
          { content: 'Statement Date:', styles: { fontStyle: 'bold' } },
          new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          { content: 'Account Status:', styles: { fontStyle: 'bold' } },
          (customer.status || 'active').toUpperCase(),
        ],
      ],
    });

    // 4. Financial Summary Cards Table
    const totalBorrowed = loans.reduce((acc, l) => acc + (Number(l.principal) || 0), 0);
    const totalRepaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue' || (l.remainingBalance || 0) > 0);
    const totalOutstanding = activeLoans.reduce((acc, l) => acc + (Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0), 0);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 4,
      theme: 'plain',
      styles: { fontSize: 9, halign: 'center', cellPadding: 3 },
      body: [
        [
          { content: `Total Borrowed\nRs. ${totalBorrowed.toLocaleString('en-IN')}`, styles: { fillColor: [248, 250, 252], fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: `Total Repaid\nRs. ${totalRepaid.toLocaleString('en-IN')}`, styles: { fillColor: [236, 253, 245], fontStyle: 'bold', textColor: [5, 150, 105] } },
          { content: `Outstanding Due\nRs. ${totalOutstanding.toLocaleString('en-IN')}`, styles: { fillColor: [255, 251, 235], fontStyle: 'bold', textColor: [217, 119, 6] } },
          { content: `Loans\n${loans.length} (${activeLoans.length} Active)`, styles: { fillColor: [240, 249, 255], fontStyle: 'bold', textColor: [2, 132, 199] } },
        ],
      ],
    });

    // 5. Registered Loans Table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('1. REGISTERED LOANS PORTFOLIO', 14, doc.lastAutoTable.finalY + 7);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 9,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' },
      head: [['Loan No', 'Scheme', 'Principal', 'Payable', 'Collected', 'Balance Due', 'Status', 'Start Date']],
      body: loans.map((l) => [
        l.loanNo,
        (l.financeType || 'daily').toUpperCase(),
        `Rs. ${Number(l.principal || 0).toLocaleString('en-IN')}`,
        `Rs. ${Number(l.totalPayable || l.principal || 0).toLocaleString('en-IN')}`,
        `Rs. ${Number(l.totalCollected || 0).toLocaleString('en-IN')}`,
        `Rs. ${Number(l.remainingBalance || 0).toLocaleString('en-IN')}`,
        (l.status || 'active').toUpperCase(),
        formatDate(l.startDate),
      ]),
    });

    // 6. Full Payment Receipts Ledger Table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`2. COMPLETE PAYMENT SCHEDULE & RECEIPTS AUDIT TRAIL (${payments.length} Receipts)`, 14, doc.lastAutoTable.finalY + 7);

    const ledger = buildCustomerFullLedger(customer, loans, payments);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 9,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      head: [['#', 'Receipt No', 'Date', 'Loan Account', 'Mode', 'Amount Paid', 'Remaining Due', 'Collector']],
      body: ledger.length === 0
        ? [['-', 'No payment receipts recorded yet', '-', '-', '-', '-', '-', '-']]
        : ledger.map((item) => [
            item.index,
            item.receiptNo,
            formatDate(item.date),
            item.loanNo,
            item.mode,
            `Rs. ${item.amount.toLocaleString('en-IN')}`,
            `Rs. ${item.runningBalance.toLocaleString('en-IN')}`,
            item.collector,
          ]),
    });

    // 7. Signature Footer
    const finalY = doc.lastAutoTable.finalY + 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    const signY = finalY + 16 > pageHeight ? pageHeight - 16 : finalY;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Borrower / Customer Signature: _______________________', 14, signY);
    doc.text('Authorized FinTrack Signatory: _______________________', 120, signY);

    // Save PDF
    const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`VK_Bankers_Statement_${safeName}.pdf`);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    alert('Failed to generate PDF statement: ' + err.message);
  }
};

