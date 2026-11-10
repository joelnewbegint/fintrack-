import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate } from './currency.js';

/**
 * Accurately resolves the actual start date and end date / settlement date for any loan.
 *
 * Rules:
 * 1. For Active Loans: Loan Start Date and Expected End Date (if available).
 * 2. For Settled Loans: Actual Loan Start Date and Final Settlement / Closure Date.
 * 3. Never invent a date. If date is unavailable, displays "Not Available".
 */
export const getLoanDates = (loan, loanPayments = []) => {
  // 1. Start Date
  let startDate = 'Not Available';
  if (loan?.startDate) {
    const d = new Date(loan.startDate);
    if (!isNaN(d.getTime())) {
      startDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  // 2. Settlement determination
  const rem = Number(loan?.remainingBalance != null ? loan.remainingBalance : loan?.balanceAmount);
  const paid = Number(loan?.totalCollected || loan?.totalPaid || 0);
  const isSettled =
    loan?.status === 'completed' ||
    loan?.status === 'closed' ||
    (rem === 0 && paid > 0);

  // 3. End Date / Settlement Date
  let endDate = 'Not Available';
  const endDateLabel = isSettled ? 'Actual Settlement Date' : 'Expected End Date';

  if (isSettled) {
    // 1st Priority: Explicit closureDate or settledDate recorded on the loan
    if (loan?.closureDate || loan?.settledDate || loan?.closedAt) {
      const d = new Date(loan.closureDate || loan.settledDate || loan.closedAt);
      if (!isNaN(d.getTime())) {
        endDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }

    // 2nd Priority: Date of the final payment recorded for this loan
    if (endDate === 'Not Available' && Array.isArray(loanPayments) && loanPayments.length > 0) {
      const validDates = loanPayments
        .map((p) => new Date(p.date || p.paymentDate))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => b - a); // latest first
      if (validDates.length > 0) {
        endDate = validDates[0].toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }

    // 3rd Priority: Stored loan.endDate
    if (endDate === 'Not Available' && loan?.endDate) {
      const d = new Date(loan.endDate);
      if (!isNaN(d.getTime())) {
        endDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
  } else {
    // For Active Loans: Expected End Date
    if (loan?.endDate) {
      const d = new Date(loan.endDate);
      if (!isNaN(d.getTime())) {
        endDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
  }

  return {
    startDate,
    endDate,
    endDateLabel,
    isSettled,
  };
};

/**
 * Filter and isolate loans and corresponding payments by Statement Type.
 *
 * CRITICAL RULE:
 * Active and Settled loans must NEVER be merged into the same statement
 * when selecting 'active' or 'settled'.
 */
export const filterLoansByStatementType = (loans = [], payments = [], statementType = 'complete') => {
  const isActive = (l) => {
    const rem = Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount);
    return l.status === 'active' || l.status === 'overdue' || rem > 0;
  };

  const isSettled = (l) => {
    const rem = Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount);
    const paid = Number(l.totalCollected || l.totalPaid || 0);
    return l.status === 'completed' || l.status === 'closed' || (rem === 0 && paid > 0);
  };

  let filteredLoans = [];
  let title = '';
  let subTitle = '';
  let badgeColor = [2, 132, 199];
  let filePrefix = 'Complete_Statement';

  if (statementType === 'active') {
    filteredLoans = loans.filter(isActive);
    title = 'ACTIVE & ONGOING LOANS STATEMENT';
    subTitle = 'Confidential Statement of Currently Running & Outstanding Loan Accounts Only';
    badgeColor = [217, 119, 6]; // Amber-600
    filePrefix = 'Active_Loans';
  } else if (statementType === 'settled') {
    filteredLoans = loans.filter(isSettled);
    title = 'SETTLED & CLOSED LOANS STATEMENT';
    subTitle = 'Official Statement of 100% Repaid & Historically Settled Accounts Only';
    badgeColor = [5, 150, 105]; // Emerald-600
    filePrefix = 'Settled_Loans';
  } else {
    filteredLoans = [...loans];
    title = 'COMPLETE BORROWER LOAN STATEMENT (ALL ACCOUNTS)';
    subTitle = 'Comprehensive Multi-Account Portfolio Statement (Active & Settled Loans)';
    badgeColor = [30, 41, 59]; // Slate-800
    filePrefix = 'Complete_Statement';
  }

  // Filter payments strictly belonging to the filtered loans!
  const loanIdSet = new Set(filteredLoans.map((l) => String(l._id)));
  const filteredPayments = payments.filter((p) => {
    const targetLoanId = String(p.loanId?._id || p.loanId);
    return loanIdSet.has(targetLoanId);
  });

  return {
    filteredLoans,
    filteredPayments,
    title,
    subTitle,
    badgeColor,
    filePrefix,
  };
};

/**
 * Generates or enriches the complete installment-by-installment schedule for a loan.
 */
export const generateLoanSchedule = (loan, loanPayments = []) => {
  if (!loan) return [];

  const duration = Number(loan.duration) || (loan.financeType === 'daily' ? 100 : loan.financeType === 'weekly' ? 10 : 3);
  const instAmount = Number(loan.installmentAmount) || Math.round(Number(loan.totalPayable || loan.principal || 0) / duration);
  const totalPayable = Number(loan.totalPayable || loan.principal || 0);
  const startDate = loan.startDate ? new Date(loan.startDate) : new Date();

  if (Array.isArray(loan.schedule) && loan.schedule.length >= duration) {
    return loan.schedule;
  }

  const payments = [...loanPayments].sort(
    (a, b) => new Date(a.date || a.paymentDate) - new Date(b.date || b.paymentDate)
  );

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
      targetAmt = Math.max(0, totalPayable - instAmount * (duration - 1));
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
    } else if (loan.status === 'completed' || totalAllocated + targetAmt <= Number(loan.totalCollected || 0)) {
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
 * Compiles a customer's multi-loan repayment audit trail with running balance tracking.
 */
export const buildCustomerFullLedger = (customer, loans = [], payments = []) => {
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.date || a.paymentDate) - new Date(b.date || b.paymentDate)
  );

  const totalBorrowed = loans.reduce((acc, l) => acc + (Number(l.totalPayable || l.principal) || 0), 0);
  let runningBalance = totalBorrowed;

  return sortedPayments.map((p, idx) => {
    const amt = Number(p.amount) || 0;
    runningBalance = Math.max(0, runningBalance - amt);
    const loanDoc =
      typeof p.loanId === 'object' && p.loanId ? p.loanId : loans.find((l) => String(l._id) === String(p.loanId));

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
      collector:
        typeof p.collectedBy === 'object' && p.collectedBy?.name
          ? p.collectedBy.name
          : 'Authorized FinTrack Agent',
      raw: p,
    };
  });
};

/**
 * Exports customer profile statement as a standard CSV/Excel file,
 * strictly filtered by statementType ('active' | 'settled' | 'complete').
 */
export const exportCustomerStatementCSV = (customer, loans = [], payments = [], statementType = 'complete') => {
  if (!customer) return;

  const { filteredLoans, filteredPayments, title, filePrefix } = filterLoansByStatementType(
    loans,
    payments,
    statementType
  );

  const totalBorrowed = filteredLoans.reduce((acc, l) => acc + (Number(l.principal) || 0), 0);
  const totalPayable = filteredLoans.reduce((acc, l) => acc + (Number(l.totalPayable || l.principal) || 0), 0);
  const totalRepaid = filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalOutstanding = filteredLoans.reduce(
    (acc, l) => acc + (Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0),
    0
  );

  const ledger = buildCustomerFullLedger(customer, filteredLoans, filteredPayments);
  const clean = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

  const rows = [
    [`VK BANKER'S & FINANCE - ${title}`],
    ['Head Office: 45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu'],
    ['Phone: +91 98421 12345 | Tamil Nadu Microfinance Network'],
    ['Statement Category: ' + (statementType === 'active' ? 'ACTIVE LOANS ONLY' : statementType === 'settled' ? 'SETTLED LOANS ONLY' : 'COMPLETE STATEMENT')],
    [''],
    ['CUSTOMER PROFILE INFORMATION'],
    ['Customer Name', customer.name],
    ['Customer ID', customer._id || 'N/A'],
    ['Phone Number', `+91 ${customer.phone}`],
    ['Area / Collection Circle', customer.area],
    ['Residential Address', customer.address],
    ['ID Proof Type', `${customer.idProofType}: ${customer.idProofNumber || 'Verified'}`],
    ['Guarantor Name', customer.guarantor?.name ? `${customer.guarantor.name} (${customer.guarantor.relationship || 'Witness'})` : 'None'],
    ['Statement Generation Date', new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN')],
    [''],
    ['FINANCIAL SUMMARY (' + statementType.toUpperCase() + ')'],
    ['Total Principal (INR)', totalBorrowed],
    ['Total Payable Amount (INR)', totalPayable],
    ['Total Amount Paid (INR)', totalRepaid],
    ['Current Outstanding Due (INR)', totalOutstanding],
    ['Total Loans in Statement', filteredLoans.length],
    ['Total Payments Recorded', filteredPayments.length],
    [''],
    ['LOANS BREAKDOWN (' + (statementType === 'active' ? 'ACTIVE ONLY' : statementType === 'settled' ? 'SETTLED ONLY' : 'ALL') + ')'],
    [
      'Loan Number',
      'Scheme',
      'Principal (INR)',
      'Interest Rate / Charge',
      'Total Payable (INR)',
      'Amount Paid (INR)',
      'Outstanding Balance (INR)',
      'Loan Start Date',
      statementType === 'settled' ? 'Actual Settlement Date' : 'Expected End Date',
      'Status',
    ],
    ...filteredLoans.map((l) => {
      const dates = getLoanDates(
        l,
        filteredPayments.filter((p) => String(p.loanId?._id || p.loanId) === String(l._id))
      );
      const intDisplay = l.chargeAmount
        ? `Rs. ${l.chargeAmount} charge`
        : `${l.interestPercent || 0}%`;

      return [
        l.loanNo,
        (l.financeType || 'daily').toUpperCase() + ` (${l.duration || 100})`,
        l.principal,
        intDisplay,
        l.totalPayable || l.principal,
        l.totalCollected || 0,
        l.remainingBalance != null ? l.remainingBalance : 0,
        dates.startDate,
        dates.endDate,
        (l.status || 'active').toUpperCase(),
      ];
    }),
    [''],
    ['PAYMENT SCHEDULE & RECEIPTS AUDIT TRAIL'],
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
  link.setAttribute(
    'download',
    `VK_Bankers_${filePrefix}_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads an official multi-page PDF Statement of Account
 * for the customer using jsPDF and AutoTable.
 *
 * Supports 3 strict modes:
 * - 'active': Active Loans Statement ONLY (Never includes settled loans)
 * - 'settled': Settled Loans Statement ONLY (Never includes active loans)
 * - 'complete': Complete Loan Statement (All records)
 */
export const downloadCustomerStatementPDF = (
  customer,
  loans = [],
  payments = [],
  statementType = 'complete'
) => {
  if (!customer) {
    throw new Error('Customer details are required to generate statement');
  }

  const { filteredLoans, filteredPayments, title, subTitle, badgeColor, filePrefix } =
    filterLoansByStatementType(loans, payments, statementType);

  if (filteredLoans.length === 0) {
    const categoryName =
      statementType === 'active'
        ? 'Active / Ongoing'
        : statementType === 'settled'
        ? 'Settled / Closed'
        : 'All';
    throw new Error(`No ${categoryName} loans found for ${customer.name || 'this customer'}.`);
  }

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
  doc.text("VK BANKER'S & FINANCE", 105, 13, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Daily Thandal, Weekly & Monthly Microfinance | Coimbatore, Tamil Nadu', 105, 19, { align: 'center' });
  doc.text('Phone: +91 98421 12345 | Head Office: 45, Cross Cut Road, Gandhipuram', 105, 24, { align: 'center' });

  // 2. Title Strip with Statement Type Badge
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.rect(0, 32, 210, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 37.5, { align: 'center' });

  // 2b. Sub-strip description
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(subTitle, 105, 40.2, { align: 'center' });

  // 3. Customer Info Grid
  const generationTimestamp =
    new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  doc.autoTable({
    startY: 44,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    body: [
      [
        { content: 'Customer Name:', styles: { fontStyle: 'bold' } },
        customer.name,
        { content: 'Customer ID:', styles: { fontStyle: 'bold' } },
        String(customer._id || 'CUST-AUTO'),
      ],
      [
        { content: 'Phone Number:', styles: { fontStyle: 'bold' } },
        `+91 ${customer.phone}`,
        { content: 'Statement Type:', styles: { fontStyle: 'bold' } },
        statementType === 'active'
          ? 'ACTIVE LOANS ONLY'
          : statementType === 'settled'
          ? 'SETTLED LOANS ONLY'
          : 'COMPLETE STATEMENT',
      ],
      [
        { content: 'Collection Circle:', styles: { fontStyle: 'bold' } },
        customer.area || 'Tamil Nadu',
        { content: 'ID Proof:', styles: { fontStyle: 'bold' } },
        `${customer.idProofType || 'Aadhaar'}: ${customer.idProofNumber || 'Verified'}`,
      ],
      [
        { content: 'Residential Address:', styles: { fontStyle: 'bold' } },
        customer.address || customer.area || 'Tamil Nadu',
        { content: 'Statement Date:', styles: { fontStyle: 'bold' } },
        generationTimestamp,
      ],
      [
        { content: 'Guarantor / Witness:', styles: { fontStyle: 'bold' } },
        customer.guarantor?.name
          ? `${customer.guarantor.name} (${customer.guarantor.relationship || 'Guarantor'})`
          : 'None Recorded',
        { content: 'Account Status:', styles: { fontStyle: 'bold' } },
        (customer.status || 'active').toUpperCase(),
      ],
    ],
  });

  // 4. Financial Summary Cards Table (Strictly isolated by statement category)
  const totalPrincipal = filteredLoans.reduce((acc, l) => acc + (Number(l.principal) || 0), 0);
  const totalPayable = filteredLoans.reduce((acc, l) => acc + (Number(l.totalPayable || l.principal) || 0), 0);
  const totalPaid = filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalBalance = filteredLoans.reduce(
    (acc, l) => acc + (Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0),
    0
  );

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 3.5,
    theme: 'plain',
    styles: { fontSize: 8.5, halign: 'center', cellPadding: 2.8 },
    body: [
      [
        {
          content: `Total Principal\nRs. ${totalPrincipal.toLocaleString('en-IN')}`,
          styles: { fillColor: [248, 250, 252], fontStyle: 'bold', textColor: [15, 23, 42] },
        },
        {
          content: `Total Payable\nRs. ${totalPayable.toLocaleString('en-IN')}`,
          styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [30, 41, 59] },
        },
        {
          content: `Amount Paid\nRs. ${totalPaid.toLocaleString('en-IN')}`,
          styles: { fillColor: [236, 253, 245], fontStyle: 'bold', textColor: [5, 150, 105] },
        },
        {
          content: `Outstanding Balance\nRs. ${totalBalance.toLocaleString('en-IN')}`,
          styles: {
            fillColor: statementType === 'settled' ? [236, 253, 245] : [255, 251, 235],
            fontStyle: 'bold',
            textColor: statementType === 'settled' ? [5, 150, 105] : [217, 119, 6],
          },
        },
        {
          content: `Loans Included\n${filteredLoans.length} ${
            statementType === 'active' ? 'Active' : statementType === 'settled' ? 'Settled' : 'Total'
          }`,
          styles: { fillColor: [240, 249, 255], fontStyle: 'bold', textColor: [2, 132, 199] },
        },
      ],
    ],
  });

  // 5. Registered Loans Table (With explicit Start Date & End Date / Settlement Date)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const tableTitle =
    statementType === 'active'
      ? '1. ACTIVE & RUNNING LOANS PORTFOLIO'
      : statementType === 'settled'
      ? '1. SETTLED & CLOSED LOANS PORTFOLIO'
      : '1. REGISTERED LOANS PORTFOLIO (ALL ACCOUNTS)';
  doc.text(tableTitle, 14, doc.lastAutoTable.finalY + 6.5);

  const dateHeader =
    statementType === 'settled'
      ? 'Actual Settlement Date'
      : statementType === 'active'
      ? 'Expected End Date'
      : 'Settlement / End Date';

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8.5,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [badgeColor[0], badgeColor[1], badgeColor[2]], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [
      [
        'Loan ID',
        'Scheme',
        'Loan Amount',
        'Interest / Rate',
        'Total Payable',
        'Amount Paid',
        'Balance Due',
        'Start Date',
        dateHeader,
        'Status',
      ],
    ],
    body: filteredLoans.map((l) => {
      const dates = getLoanDates(
        l,
        filteredPayments.filter((p) => String(p.loanId?._id || p.loanId) === String(l._id))
      );
      const intDisplay = l.chargeAmount
        ? `-Rs. ${Number(l.chargeAmount).toLocaleString('en-IN')}`
        : `${l.interestPercent || 0}%`;
      const remAmt = Number(l.remainingBalance != null ? l.remainingBalance : l.balanceAmount) || 0;

      return [
        l.loanNo || 'LOAN',
        (l.financeType || 'daily').toUpperCase() + ` (${l.duration || 100})`,
        `Rs. ${Number(l.principal || 0).toLocaleString('en-IN')}`,
        intDisplay,
        `Rs. ${Number(l.totalPayable || l.principal || 0).toLocaleString('en-IN')}`,
        `Rs. ${Number(l.totalCollected || 0).toLocaleString('en-IN')}`,
        `Rs. ${remAmt.toLocaleString('en-IN')}`,
        dates.startDate,
        dates.endDate,
        dates.isSettled ? 'SETTLED' : (l.status || 'active').toUpperCase(),
      ];
    }),
  });

  // 6. Full Payment Receipts Ledger Table (Strictly isolated payments)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const ledgerTitle =
    statementType === 'active'
      ? `2. REPAYMENT SCHEDULE & RECEIPTS AUDIT TRAIL FOR ACTIVE LOANS (${filteredPayments.length} Receipts)`
      : statementType === 'settled'
      ? `2. REPAYMENT RECEIPTS & SETTLEMENT AUDIT TRAIL (${filteredPayments.length} Receipts)`
      : `2. COMPLETE PAYMENT SCHEDULE & RECEIPTS AUDIT TRAIL (${filteredPayments.length} Receipts)`;
  doc.text(ledgerTitle, 14, doc.lastAutoTable.finalY + 6.5);

  const ledger = buildCustomerFullLedger(customer, filteredLoans, filteredPayments);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8.5,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['#', 'Receipt No', 'Date', 'Loan Account', 'Mode', 'Amount Paid', 'Remaining Due', 'Collector']],
    body:
      ledger.length === 0
        ? [['-', 'No payment receipts recorded in this category', '-', '-', '-', '-', '-', '-']]
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
  const finalY = doc.lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = finalY + 14 > pageHeight ? pageHeight - 14 : finalY;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Borrower / Customer Signature: _______________________', 14, signY);
  doc.text('Authorized FinTrack Signatory: _______________________', 120, signY);

  // 8. Save with distinct file name
  const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `VK_Bankers_${filePrefix}_${safeName}_${dateStr}.pdf`;
  doc.save(fileName);

  return {
    success: true,
    fileName,
    statementType,
    loansCount: filteredLoans.length,
    paymentsCount: filteredPayments.length,
  };
};
