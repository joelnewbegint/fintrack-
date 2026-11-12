import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate } from './currency.js';
import { parseCustomerName } from './customerName.js';

/**
 * Sanitizes a string for clean, cross-platform filename usage.
 */
const sanitizeFilename = (str) => {
  return String(str || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');
};

/**
 * Resolves accurate Loan Start Date and Expected End Date without inventing dates.
 */
const resolveLoanDates = (loan) => {
  let startDate = 'Not Available';
  if (loan?.startDate) {
    const d = new Date(loan.startDate);
    if (!isNaN(d.getTime())) {
      startDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  let expectedEndDate = 'Not Available';
  if (loan?.endDate) {
    const d = new Date(loan.endDate);
    if (!isNaN(d.getTime())) {
      expectedEndDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } else if (loan?.startDate && loan?.duration) {
    try {
      const d = new Date(loan.startDate);
      const dur = Number(loan.duration);
      const scheme = String(loan.financeType || 'daily').toLowerCase();
      if (!isNaN(d.getTime()) && !isNaN(dur)) {
        if (scheme.includes('daily')) d.setDate(d.getDate() + dur);
        else if (scheme.includes('weekly')) d.setDate(d.getDate() + dur * 7);
        else if (scheme.includes('monthly')) d.setMonth(d.getMonth() + dur);
        expectedEndDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
  }

  return { startDate, expectedEndDate };
};

/**
 * Builds the official Loan Application & Agreement PDF document.
 * Returns the jsPDF instance along with download, preview, and print helpers.
 */
export const buildLoanAgreementPDF = (loan, customer = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Resolve Customer
  const cust =
    customer && typeof customer === 'object' && Object.keys(customer).length > 0
      ? customer
      : loan?.customerId && typeof loan.customerId === 'object'
      ? loan.customerId
      : {};

  const parsedName = parseCustomerName(cust.name || loan?.customerName || 'Borrower');
  const borrowerName = parsedName.primary || 'Borrower';
  const borrowerTamil = parsedName.secondary || '';
  const borrowerId = cust._id || cust.id || loan?.customerId?._id || loan?.customerId || 'N/A';
  const borrowerPhone = cust.phone || loan?.customerPhone || 'Not Available';
  const borrowerAddress = cust.address || 'Tamil Nadu';
  const borrowerArea = cust.area || '';
  const borrowerPhoto = loan?.borrowerPhoto || cust.photoUrl || cust.photo || '';

  // Resolve Loan Figures
  const loanNo = loan?.loanNo || 'LN-NEW';
  const principal = Number(loan?.principal || 0);
  const chargeAmount = Number(loan?.chargeAmount || 0);
  const interestPercent = Number(loan?.interestPercent || 0);
  const interestType = loan?.interestType || 'deduction';
  const disbursedAmount = Number(
    loan?.disbursedAmount != null
      ? loan.disbursedAmount
      : interestType === 'deduction'
      ? Math.max(0, principal - chargeAmount)
      : principal
  );
  const totalPayable = Number(
    loan?.totalPayable != null
      ? loan.totalPayable
      : interestType === 'deduction'
      ? principal
      : principal + chargeAmount
  );
  const installmentAmount = Number(
    loan?.installmentAmount != null
      ? loan.installmentAmount
      : Math.ceil(totalPayable / (loan?.duration || 1))
  );
  const scheme = String(loan?.financeType || 'daily').toUpperCase();
  const schemeTamil =
    scheme === 'DAILY' ? 'தினசரி தாண்டல் (100 Days)' : scheme === 'WEEKLY' ? 'வாரத்தவணை' : 'மாதத்தவணை';
  const duration = Number(loan?.duration || 1);
  const durationUnit = scheme === 'DAILY' ? 'Days' : scheme === 'WEEKLY' ? 'Weeks' : 'Months';
  const { startDate, expectedEndDate } = resolveLoanDates(loan);
  const loanStatus = String(loan?.status || 'Active').toUpperCase();
  const outstandingBalance = Number(
    loan?.remainingBalance != null
      ? loan.remainingBalance
      : loan?.balanceAmount != null
      ? loan.balanceAmount
      : totalPayable
  );

  const genDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const genTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // =========================================================================
  // 1. HEADER & BRANDING
  // =========================================================================
  // Decorative top bar
  doc.setFillColor(14, 116, 144); // Cyan / Blue theme (Primary)
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("VK BANKER'S & FINANCE", margin, 14);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Microfinance, Daily Thandhal & SME Credit Services | Reg: TN-VKB-2024',
    margin,
    18.5
  );
  doc.text(
    'Head Office: Main Road, Tamil Nadu - 635804 | Helpline: +91 98421 00000 | Email: vkbankers@gmail.com',
    margin,
    22.5
  );

  // Top Right Meta Box
  const metaBoxX = pageWidth - margin - 58;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(metaBoxX, 8, 58, 17, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCUMENT DATE', metaBoxX + 4, 13);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${genDate} ${genTime}`, metaBoxX + 4, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('LOAN STATUS', metaBoxX + 4, 21.5);
  doc.setTextColor(14, 116, 144);
  doc.text(loanStatus, metaBoxX + 27, 21.5);

  // =========================================================================
  // 2. DOCUMENT TITLE BANNER
  // =========================================================================
  const titleY = 28;
  doc.setFillColor(240, 249, 255); // sky-50
  doc.setDrawColor(186, 230, 253); // sky-200
  doc.roundedRect(margin, titleY, contentWidth, 11, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(3, 105, 161); // sky-700
  doc.text('LOAN APPLICATION & AGREEMENT FORM', margin + 5, titleY + 7);

  // Loan ID badge on the right
  doc.setFillColor(3, 105, 161);
  doc.roundedRect(pageWidth - margin - 55, titleY + 1.5, 50, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`LOAN ID: ${loanNo}`, pageWidth - margin - 51, titleY + 6.8);

  // =========================================================================
  // 3. BORROWER DETAILS & PHOTO SECTION
  // =========================================================================
  const borrowerSectionY = 42;
  const photoWidth = 32;
  const photoHeight = 40;
  const photoX = pageWidth - margin - photoWidth;
  const detailsWidth = contentWidth - photoWidth - 4;

  // Borrower Info Card Background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, borrowerSectionY, detailsWidth, photoHeight, 2, 2, 'FD');

  // Header of Borrower Card
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, borrowerSectionY, detailsWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('1. BORROWER DETAILS / கடனாளியின் விவரங்கள்', margin + 3, borrowerSectionY + 4.5);

  // Details fields
  const startRowY = borrowerSectionY + 11;
  const rowGap = 5.2;

  // Row 1: Name & ID
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Borrower Name:', margin + 3, startRowY);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  const displayName = borrowerTamil ? `${borrowerName} (${borrowerTamil})` : borrowerName;
  doc.text(displayName, margin + 27, startRowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Borrower ID:', margin + 88, startRowY);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(String(borrowerId).slice(-10), margin + 107, startRowY);

  // Row 2: Phone & Area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Mobile Number:', margin + 3, startRowY + rowGap);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(borrowerPhone, margin + 27, startRowY + rowGap);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Area / Ward:', margin + 88, startRowY + rowGap);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(borrowerArea || 'Town', margin + 107, startRowY + rowGap);

  // Row 3: Address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Address:', margin + 3, startRowY + rowGap * 2);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const splitAddress = doc.splitTextToSize(borrowerAddress, detailsWidth - 30);
  doc.text(splitAddress, margin + 27, startRowY + rowGap * 2);

  // Row 4: Guarantor / Reference (if available)
  const guarantorName = cust.guarantor?.name || 'Self-guaranteed';
  const guarantorPhone = cust.guarantor?.phone || '';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Guarantor / Ref:', margin + 3, startRowY + rowGap * 3.4);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `${guarantorName}${guarantorPhone ? ` (Ph: ${guarantorPhone})` : ''}`,
    margin + 27,
    startRowY + rowGap * 3.4
  );

  // -------------------------------------------------------------------------
  // PASSPORT PHOTO FRAME
  // -------------------------------------------------------------------------
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.roundedRect(photoX, borrowerSectionY, photoWidth, photoHeight, 1.5, 1.5, 'FD');

  let photoRendered = false;
  if (borrowerPhoto && typeof borrowerPhoto === 'string' && borrowerPhoto.startsWith('data:image')) {
    try {
      // Extract mime type for jsPDF
      const format = borrowerPhoto.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(
        borrowerPhoto,
        format,
        photoX + 1,
        borrowerSectionY + 1,
        photoWidth - 2,
        photoHeight - 2,
        undefined,
        'FAST'
      );
      photoRendered = true;
    } catch (e) {
      console.warn('Failed to render base64 photo in agreement PDF:', e);
    }
  }

  if (!photoRendered) {
    // Elegant passport placeholder box
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(photoX + 2, borrowerSectionY + 2, photoWidth - 4, photoHeight - 4, 1, 1, 'S');
    doc.setLineDashPattern([], 0); // reset dash

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('AFFIX BORROWER', photoX + photoWidth / 2, borrowerSectionY + 17, { align: 'center' });
    doc.text('PHOTO HERE', photoX + photoWidth / 2, borrowerSectionY + 21, { align: 'center' });
    doc.setFontSize(6);
    doc.text('(புகைப்படம்)', photoX + photoWidth / 2, borrowerSectionY + 25, { align: 'center' });
  }

  // =========================================================================
  // 4. LOAN TERMS & FINANCIAL SCHEDULE TABLE
  // =========================================================================
  const loanTableY = borrowerSectionY + photoHeight + 3.5;

  const deductionLabel =
    interestType === 'deduction'
      ? `Upfront Deducted (-${formatCurrency(chargeAmount)})`
      : `Added to Principal (+${formatCurrency(chargeAmount)})`;

  const loanTableData = [
    [
      { content: 'Loan Principal Amount (அசல்)', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(principal), styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
      { content: 'Repayment Scheme (திட்டம்)', styles: { fontStyle: 'bold' } },
      { content: `${scheme} (${schemeTamil})`, styles: { fontStyle: 'bold', textColor: [3, 105, 161] } },
    ],
    [
      { content: 'Charge Amount / Processing', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(chargeAmount) },
      { content: 'Interest Rate / Percentage', styles: { fontStyle: 'bold' } },
      { content: `${interestPercent}%` },
    ],
    [
      { content: 'Deduction Method (கழிவு)', styles: { fontStyle: 'bold' } },
      { content: deductionLabel },
      { content: 'Net In-Hand Disbursed (கையில்)', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(disbursedAmount), styles: { fontStyle: 'bold', textColor: [16, 185, 129] } },
    ],
    [
      { content: 'Total Payable Amount (மொத்தம்)', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(totalPayable), styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
      { content: 'Installment Amount (தவணை)', styles: { fontStyle: 'bold' } },
      { content: `${formatCurrency(installmentAmount)} / ${durationUnit.slice(0, -1)}`, styles: { fontStyle: 'bold', textColor: [3, 105, 161] } },
    ],
    [
      { content: 'Tenure / Duration (தவணை காலம்)', styles: { fontStyle: 'bold' } },
      { content: `${duration} ${durationUnit}` },
      { content: 'Number of Installments', styles: { fontStyle: 'bold' } },
      { content: `${duration} Installments` },
    ],
    [
      { content: 'Loan Start Date (தொடங்கும் தேதி)', styles: { fontStyle: 'bold' } },
      { content: startDate, styles: { fontStyle: 'bold' } },
      { content: 'Expected End Date (முடிவுத் தேதி)', styles: { fontStyle: 'bold' } },
      { content: expectedEndDate, styles: { fontStyle: 'bold', textColor: [180, 83, 9] } },
    ],
    [
      { content: 'Outstanding Balance (நிலுவை)', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(outstandingBalance), styles: { fontStyle: 'bold' } },
      { content: 'Payment Frequency (தவணை முறை)', styles: { fontStyle: 'bold' } },
      { content: scheme === 'DAILY' ? 'Daily Collection' : scheme === 'WEEKLY' ? 'Weekly Collection' : 'Monthly Collection' },
    ],
  ];

  doc.autoTable({
    startY: loanTableY,
    head: [
      [
        {
          content: '2. LOAN TERMS & FINANCIAL PARTICULARS / கடன் நிதி விவரங்கள்',
          colSpan: 4,
          styles: { halign: 'left', fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 8 },
        },
      ],
    ],
    body: loanTableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 46, fillColor: [248, 250, 252], textColor: [71, 85, 105] },
      1: { cellWidth: 47 },
      2: { cellWidth: 46, fillColor: [248, 250, 252], textColor: [71, 85, 105] },
      3: { cellWidth: 47 },
    },
    margin: { left: margin, right: margin },
  });

  let currentY = doc.lastAutoTable.finalY + 3.5;

  // =========================================================================
  // 5. AGREEMENT & TERMS & CONDITIONS
  // =========================================================================
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  const termsBoxHeight = 44;
  doc.roundedRect(margin, currentY, contentWidth, termsBoxHeight, 2, 2, 'FD');

  // Terms Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('3. LOAN AGREEMENT & DECLARATION / கடன் ஒப்பந்தம் மற்றும் உறுதிமொழி', margin + 3, currentY + 4.2);

  const termsTextY = currentY + 9.5;
  const terms = [
    '1. I, the undersigned borrower, acknowledge having applied for and received the in-hand loan amount noted above.',
    '2. I unconditionally undertake and promise to repay the total loan amount in regular daily/weekly/monthly installments without default.',
    '3. In the event of default or delayed payment beyond due dates, I agree to pay lawful overdue/late charges as determined by the lender.',
    '4. I confirm that all my particulars, mobile number, and address provided in this application are genuine, true, and legally binding.',
    '5. In case of continuous default, the institution reserves the absolute legal right to enforce collection and initiate recovery proceedings.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  terms.forEach((t, idx) => {
    doc.text(t, margin + 3, termsTextY + idx * 5.2);
  });

  // Tamil declaration summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'உறுதிமொழி: மேற்கூறிய கடன் தொகையை நான் பெற்றுக்கொண்டேன். இத்தொகையை குறிப்பிட்ட தவணை காலத்தில் உரிய தவணைகளாக திருப்பிச் செலுத்துகிறேன் என உறுதியளிக்கிறேன்.',
    margin + 3,
    termsTextY + 5 * 5.2 + 2
  );

  currentY += termsBoxHeight + 4;

  // =========================================================================
  // 6. SIGNATURE & AUTHORIZATION SECTION
  // =========================================================================
  const sigBoxHeight = 34;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, sigBoxHeight, 2, 2, 'FD');

  // Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('4. SIGNATURES & VERIFICATION / கையொப்பங்கள் மற்றும் அங்கீகாரம்', margin + 3, currentY + 4.2);

  const colWidth = (contentWidth - 6) / 3;
  const sigLineY = currentY + 23;

  // Signature 1: Borrower
  const col1X = margin + 3;
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(148, 163, 184);
  doc.line(col1X, sigLineY, col1X + colWidth - 4, sigLineY);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Borrower's Signature / Thumb", col1X + (colWidth - 4) / 2, sigLineY + 4, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(கடனாளி கையொப்பம் / கைரேகை)', col1X + (colWidth - 4) / 2, sigLineY + 7.5, { align: 'center' });

  // Signature 2: Guarantor / Witness
  const col2X = col1X + colWidth;
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(148, 163, 184);
  doc.line(col2X, sigLineY, col2X + colWidth - 4, sigLineY);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Guarantor / Witness Signature', col2X + (colWidth - 4) / 2, sigLineY + 4, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(ஜாமீன்தாரர் / சாட்சி)', col2X + (colWidth - 4) / 2, sigLineY + 7.5, { align: 'center' });

  // Signature 3: Authorized Officer
  const col3X = col2X + colWidth;
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(148, 163, 184);
  doc.line(col3X, sigLineY, col3X + colWidth - 4, sigLineY);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', col3X + (colWidth - 4) / 2, sigLineY + 4, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("(VK Banker's & Finance Officer)", col3X + (colWidth - 4) / 2, sigLineY + 7.5, { align: 'center' });

  // Date and Place fields
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Place: _____________________', col1X, currentY + 11);
  doc.text('Date:  _____________________', col2X, currentY + 11);
  doc.text('Verification Code: OK-VERIFIED', col3X, currentY + 11);

  // =========================================================================
  // 7. FOOTER
  // =========================================================================
  const footerY = pageHeight - 7;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2.5, pageWidth - margin, footerY - 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Official Loan Agreement Document generated by VK Banker's & Finance ERP System. All rights reserved.",
    margin,
    footerY
  );
  doc.text(`Page 1 of 1 • System Ref: ${loanNo}`, pageWidth - margin, footerY, { align: 'right' });

  // =========================================================================
  // FILENAME & RETURN OBJECT
  // =========================================================================
  const cleanBorrower = sanitizeFilename(borrowerName);
  const cleanLoanId = sanitizeFilename(loanNo);
  const filename = `Loan_Form_${cleanBorrower}_${cleanLoanId}.pdf`;

  return {
    doc,
    filename,
    download: () => doc.save(filename),
    getBlob: () => doc.output('blob'),
    getBlobUrl: () => URL.createObjectURL(doc.output('blob')),
    print: () => {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl);
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (e) {}
        }, 800);
      }
    },
  };
};

/**
 * Convenience helper to immediately trigger download of loan application agreement PDF.
 */
export const downloadLoanAgreementPDF = (loan, customer = {}) => {
  const result = buildLoanAgreementPDF(loan, customer);
  result.download();
  return result;
};

export default buildLoanAgreementPDF;

