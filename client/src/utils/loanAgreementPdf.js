import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from './currency.js';
import { parseCustomerName } from './customerName.js';

/**
 * Format currency without the Unicode Rupee symbol in PDF text
 * to prevent character encoding corruption (e.g., avoids '¹20,000').
 */
export const formatPdfCurrency = (amount) => {
  const num = Math.round(Number(amount) || 0);
  return 'Rs. ' + num.toLocaleString('en-IN');
};

/**
 * Renders a crisp bilingual (English + Tamil) banner or text snippet onto an offscreen canvas
 * and returns a PNG DataURL for direct embedding into jsPDF.
 * This guarantees 100% authentic Noto Sans Tamil typography with zero mojibake.
 */
const renderTextToDataUrl = ({
  text,
  width = 600,
  height = 50,
  fontSize = 22,
  fontFamily = '"Noto Sans Tamil", "Inter", "Arial", sans-serif',
  bgColor = '#000000',
  textColor = '#FFFFFF',
  align = 'left',
  paddingX = 16,
  bold = true,
}) => {
  if (typeof document === 'undefined') return null;
  try {
    const scale = 2; // High-DPI 300+ DPI equivalent
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
  } catch (e) {
    console.warn('Canvas text rendering fallback:', e);
    return null;
  }
};

/**
 * Generates an authentic Round Company Seal DataURL for PDF stamping.
 */
const renderRoundSealToDataUrl = (dateStr) => {
  if (typeof document === 'undefined') return null;
  try {
    const size = 320;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cx = size / 2;
    const cy = size / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-4 * Math.PI) / 180); // Subtle ink tilt

    // Outer double circle
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 142, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 132, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dashed ring
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 84, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Text: Top curved
    ctx.fillStyle = '#000000';
    ctx.font = '900 20px "Inter", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Simple top & bottom arc text simulation
    ctx.fillText("VK BANKER'S & FINANCE", 0, -104);
    ctx.font = '800 16px "Inter", sans-serif';
    ctx.fillText('REG: TN-VKB-2024', 0, 108);

    // Center star & Official text
    ctx.font = '28px serif';
    ctx.fillText('★', 0, -22);

    ctx.font = '900 20px "Inter", sans-serif';
    ctx.fillText('OFFICIAL', 0, 8);

    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillText(dateStr || 'SEAL', 0, 32);

    ctx.restore();
    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
};

/**
 * Generates an authentic Status Stamp DataURL for PDF (ACTIVE / OVERDUE / COMPLETED).
 */
const renderStatusStampToDataUrl = (status, dateStr) => {
  if (typeof document === 'undefined') return null;
  try {
    const width = 360;
    const height = 140;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const norm = String(status || 'ACTIVE').toUpperCase();
    const isOverdue = norm === 'OVERDUE';
    const isCompleted = norm === 'COMPLETED' || norm === 'PAID';

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-12 * Math.PI) / 180); // Stamp tilt
    ctx.translate(-width / 2, -height / 2);

    // Outer thick rounded border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = isOverdue ? 5 : 6;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Inner hairline border
    if (isOverdue || isCompleted) {
      ctx.lineWidth = 1.5;
      ctx.strokeRect(18, 18, width - 36, height - 36);
    }

    // Status Title
    ctx.fillStyle = '#000000';
    ctx.font = '900 38px "Inter", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(norm, width / 2, 54);

    // Divider line
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(35, 76);
    ctx.lineTo(width - 35, 76);
    ctx.stroke();

    // Date sublabel
    ctx.font = '700 15px "JetBrains Mono", monospace';
    const sub = isCompleted ? `CLOSED: ${dateStr}` : `VERIFIED: ${dateStr}`;
    ctx.fillText(sub, width / 2, 98);

    ctx.restore();
    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
};

/**
 * Draws decorative Corner Tick Marks at 4 page edges.
 */
const drawCornerMarks = (doc, margin, pageWidth, pageHeight) => {
  const tickLen = 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  // Top-Left
  doc.line(margin - 3, margin, margin + tickLen, margin);
  doc.line(margin, margin - 3, margin, margin + tickLen);

  // Top-Right
  doc.line(pageWidth - margin + 3, margin, pageWidth - margin - tickLen, margin);
  doc.line(pageWidth - margin, margin - 3, pageWidth - margin, margin + tickLen);

  // Bottom-Left
  doc.line(margin - 3, pageHeight - margin, margin + tickLen, pageHeight - margin);
  doc.line(margin, pageHeight - margin + 3, margin, pageHeight - margin - tickLen);

  // Bottom-Right
  doc.line(pageWidth - margin + 3, pageHeight - margin, pageWidth - margin - tickLen, pageHeight - margin);
  doc.line(pageWidth - margin, pageHeight - margin + 3, pageWidth - margin, pageHeight - margin - tickLen);
};

/**
 * Generates the Strict Black & White Official Loan Application & Agreement PDF (A4).
 */
export const buildLoanAgreementPDF = (loan, customer = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // Strict 15mm margins
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
  const borrowerId = String(cust._id || cust.id || loan?.customerId?._id || loan?.customerId || 'N/A').slice(-10);
  const borrowerPhone = cust.phone || loan?.customerPhone || 'Not Available';
  const borrowerAddress = cust.address || 'Tamil Nadu';
  const borrowerArea = cust.area || 'Town Circle';
  const borrowerPhoto = loan?.borrowerPhoto || cust.photoUrl || cust.photo || '';

  // Resolve Loan Figures
  const loanNo = loan?.loanNo || 'LN-26-0001';
  const principal = Number(loan?.principal || 0);
  const chargeAmount = Number(loan?.chargeAmount || 0);
  const disbursedAmount = Number(
    loan?.disbursedAmount != null
      ? loan.disbursedAmount
      : Math.max(0, principal - chargeAmount)
  );
  const totalPayable = Number(loan?.totalPayable != null ? loan.totalPayable : principal);
  const duration = Number(loan?.duration || 100);
  const installmentAmount = Number(
    loan?.installmentAmount != null
      ? loan.installmentAmount
      : Math.ceil(totalPayable / duration)
  );
  const scheme = String(loan?.financeType || 'daily').toUpperCase();
  const schemeTamil = scheme === 'DAILY' ? 'தினசரி' : scheme === 'WEEKLY' ? 'வார' : 'மாத';
  const totalPaid = Number(loan?.totalCollected != null ? loan.totalCollected : loan?.totalPaid || 0);
  const outstanding = Number(
    loan?.remainingBalance != null
      ? loan.remainingBalance
      : Math.max(0, totalPayable - totalPaid)
  );

  const status = String(loan?.status || (outstanding <= 0 ? 'completed' : 'active')).toUpperCase();
  const startDateStr = formatDate(loan?.startDate || new Date());
  const endDateStr = formatDate(loan?.endDate || new Date());
  const todayStr = formatDate(new Date());

  // ---------------------------------------------------------------------------
  // 1. PAGE OUTLINE BORDER & CORNER MARKS (Strict B/W)
  // ---------------------------------------------------------------------------
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin - 4) * 2);
  drawCornerMarks(doc, margin - 4, pageWidth, pageHeight);

  // Watermark (5% opacity centered text)
  doc.saveGraphicsState && doc.saveGraphicsState();
  doc.setFont('times', 'bold');
  doc.setFontSize(80);
  doc.setTextColor(240, 240, 240); // 5% black tint
  doc.text('VK', pageWidth / 2, pageHeight / 2 - 10, { align: 'center', angle: 30 });
  doc.restoreGraphicsState && doc.restoreGraphicsState();

  // ---------------------------------------------------------------------------
  // 2. HEADER: Centered Large Serif, Double Rule, Muted Tagline
  // ---------------------------------------------------------------------------
  let cursorY = margin + 2;

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text("VK BANKER'S & FINANCE", pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(68, 68, 68); // #444
  doc.text('MICROFINANCE • DAILY THANDHAL • SME CREDIT ENTERPRISES  |  REG: TN-VKB-2024', pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 4;
  doc.setFontSize(6.8);
  doc.setTextColor(100, 100, 100);
  doc.text('Head Office: Main Road, Tamil Nadu - 635804  |  Helpline: +91 98421 00000  |  Email: vkbankers@gmail.com', pageWidth / 2, cursorY, { align: 'center' });

  // Thin double rule below (2px line + 0.5px line)
  cursorY += 3.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.7); // ~2px
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 1.2;
  doc.setLineWidth(0.2); // ~0.5px
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  cursorY += 4;

  // Document Title Bar & Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('LOAN APPLICATION & AGREEMENT FORM', margin, cursorY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.text(`LOAN ID: ${loanNo}`, pageWidth - margin, cursorY, { align: 'right' });

  // Date & Scheme Subtitle
  cursorY += 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(68, 68, 68);
  doc.text(`DATE: ${todayStr}  |  SCHEME: ${scheme} THANDHAL (${duration} DAYS)`, margin, cursorY);

  // Status Stamp (Top Right)
  const statusStampUrl = renderStatusStampToDataUrl(status, todayStr);
  if (statusStampUrl) {
    try {
      doc.addImage(statusStampUrl, 'PNG', pageWidth - margin - 38, cursorY - 1, 38, 14.5);
    } catch (e) {}
  }

  cursorY += 5;

  // ---------------------------------------------------------------------------
  // 3. KEY FACTS SUMMARY BOX (2px black border, large numbers, NO PERCENTAGE)
  // ---------------------------------------------------------------------------
  const keyFactsY = cursorY;
  const keyFactsH = 17;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.7); // 2px
  doc.rect(margin, keyFactsY, contentWidth, keyFactsH);

  // 4 Column dividers
  const colW = contentWidth / 4;
  doc.setLineWidth(0.2);
  doc.line(margin + colW, keyFactsY, margin + colW, keyFactsY + keyFactsH);
  doc.line(margin + colW * 2, keyFactsY, margin + colW * 2, keyFactsY + keyFactsH);
  doc.line(margin + colW * 3, keyFactsY, margin + colW * 3, keyFactsY + keyFactsH);

  // Box 1: NET IN-HAND
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(68, 68, 68);
  doc.text('NET IN-HAND DISBURSED', margin + colW / 2, keyFactsY + 4.5, { align: 'center' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(formatPdfCurrency(disbursedAmount), margin + colW / 2, keyFactsY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Disbursed to Borrower', margin + colW / 2, keyFactsY + 15, { align: 'center' });

  // Box 2: DAILY INSTALLMENT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(68, 68, 68);
  doc.text('DAILY INSTALLMENT', margin + colW + colW / 2, keyFactsY + 4.5, { align: 'center' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(formatPdfCurrency(installmentAmount), margin + colW + colW / 2, keyFactsY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Per day for ${duration} days`, margin + colW + colW / 2, keyFactsY + 15, { align: 'center' });

  // Box 3: TOTAL PAYABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(68, 68, 68);
  doc.text('TOTAL REPAYABLE', margin + colW * 2 + colW / 2, keyFactsY + 4.5, { align: 'center' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(formatPdfCurrency(totalPayable), margin + colW * 2 + colW / 2, keyFactsY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Total Agreement Value', margin + colW * 2 + colW / 2, keyFactsY + 15, { align: 'center' });

  // Box 4: CHARGE / PROCESSING FEE (Replaces percentage!)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(68, 68, 68);
  doc.text('CHARGE / DEDUCTION', margin + colW * 3 + colW / 2, keyFactsY + 4.5, { align: 'center' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(formatPdfCurrency(chargeAmount), margin + colW * 3 + colW / 2, keyFactsY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Upfront Processing Fee', margin + colW * 3 + colW / 2, keyFactsY + 15, { align: 'center' });

  cursorY = keyFactsY + keyFactsH + 4;

  // ---------------------------------------------------------------------------
  // 4. SECTION 1: BORROWER DETAILS / கடனாளியின் விவரங்கள்
  // ---------------------------------------------------------------------------
  const sec1BannerUrl = renderTextToDataUrl({
    text: '1. BORROWER DETAILS  /  கடனாளியின் விவரங்கள்',
    width: 700,
    height: 38,
    fontSize: 17,
  });

  if (sec1BannerUrl) {
    doc.addImage(sec1BannerUrl, 'PNG', margin, cursorY, contentWidth, 6);
  } else {
    doc.setFillColor(0, 0, 0);
    doc.rect(margin, cursorY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('1. BORROWER DETAILS (KADANALI VIVARANGAL)', margin + 3, cursorY + 4.2);
  }

  cursorY += 7.5;

  // Borrower card content + Passport Photo Box
  const photoW = 28;
  const photoH = 34;
  const photoX = pageWidth - margin - photoW;
  const detailsW = contentWidth - photoW - 3;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(margin, cursorY, detailsW, photoH);

  // Photo Box (Dashed border + "AFFIX PHOTO")
  doc.setLineDashPattern([2, 1.5], 0);
  doc.rect(photoX, cursorY, photoW, photoH);
  doc.setLineDashPattern([], 0);

  let photoPlaced = false;
  if (borrowerPhoto && typeof borrowerPhoto === 'string' && borrowerPhoto.startsWith('data:image')) {
    try {
      doc.addImage(borrowerPhoto, 'JPEG', photoX + 0.5, cursorY + 0.5, photoW - 1, photoH - 1);
      photoPlaced = true;
    } catch (e) {}
  }

  if (!photoPlaced) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text('AFFIX PHOTO', photoX + photoW / 2, cursorY + 15, { align: 'center' });
    doc.setFontSize(5.5);
    doc.text('HERE', photoX + photoW / 2, cursorY + 19, { align: 'center' });
    doc.text('(புகைப்படம்)', photoX + photoW / 2, cursorY + 23, { align: 'center' });
  }

  // Inside Details Table
  let dY = cursorY + 5;
  const gap = 5.2;

  // Row 1: Name & ID
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('BORROWER NAME:', margin + 3, dY);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8.5);
  const fullName = borrowerTamil ? `${borrowerName} (${borrowerTamil})` : borrowerName;
  doc.text(fullName, margin + 30, dY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('BORROWER ID:', margin + 85, dY);
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(borrowerId, margin + 106, dY);

  // Row 2: Mobile & Area
  dY += gap;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('MOBILE NUMBER:', margin + 3, dY);
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.text(borrowerPhone, margin + 30, dY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('AREA / WARD:', margin + 85, dY);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(borrowerArea, margin + 106, dY);

  // Row 3: Address
  dY += gap;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('FULL ADDRESS:', margin + 3, dY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(borrowerAddress, detailsW - 35);
  doc.text(addrLines, margin + 30, dY);

  // Row 4: Guarantor / Reference
  dY += gap * 1.3;
  const gName = cust.guarantor?.name || 'Self-guaranteed';
  const gPhone = cust.guarantor?.phone ? ` (Ph: ${cust.guarantor.phone})` : '';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('GUARANTOR / REF:', margin + 3, dY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(7.5);
  doc.text(`${gName}${gPhone}`, margin + 30, dY);

  cursorY += photoH + 4;

  // ---------------------------------------------------------------------------
  // 5. SECTION 2: LOAN TERMS & FINANCIAL SCHEDULE (NO PERCENTAGE)
  // ---------------------------------------------------------------------------
  const sec2BannerUrl = renderTextToDataUrl({
    text: '2. LOAN TERMS & REPAYMENT PARTICULARS  /  கடன் நிதி விவரங்கள்',
    width: 700,
    height: 38,
    fontSize: 17,
  });

  if (sec2BannerUrl) {
    doc.addImage(sec2BannerUrl, 'PNG', margin, cursorY, contentWidth, 6);
  } else {
    doc.setFillColor(0, 0, 0);
    doc.rect(margin, cursorY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('2. LOAN TERMS & REPAYMENT PARTICULARS (KADAN NITHI VIVARANGAL)', margin + 3, cursorY + 4.2);
  }

  cursorY += 7.5;

  // Loan Terms Table (Zebra rows, 0.5px grey hairlines, strict B/W, NO PERCENTAGE)
  const loanTermsRows = [
    [
      { content: 'PRINCIPAL LOAN AMOUNT' },
      { content: formatPdfCurrency(principal), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: 'REPAYMENT SCHEME' },
      { content: `${scheme} THANDHAL (${duration} Days)`, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'UPFRONT CHARGE AMOUNT' },
      { content: formatPdfCurrency(chargeAmount), styles: { halign: 'right' } },
      { content: 'DISBURSEMENT METHOD' },
      { content: 'Upfront Charge Deduction' },
    ],
    [
      { content: 'NET IN-HAND DISBURSED' },
      { content: formatPdfCurrency(disbursedAmount), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: 'DAILY INSTALLMENT' },
      { content: `${formatPdfCurrency(installmentAmount)} / Day`, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'TOTAL REPAYABLE AMOUNT' },
      { content: formatPdfCurrency(totalPayable), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: 'TENURE & INSTALLMENTS' },
      { content: `${duration} Installments (${duration} Days)` },
    ],
    [
      { content: 'LOAN START DATE' },
      { content: startDateStr, styles: { fontStyle: 'bold' } },
      { content: 'EXPECTED END DATE' },
      { content: endDateStr, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'OUTSTANDING BALANCE' },
      { content: formatPdfCurrency(outstanding), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: 'LATE FEE PER MISSED DAY' },
      { content: 'Rs. 50 / missed installment' },
    ],
  ];

  doc.autoTable({
    startY: cursorY,
    body: loanTermsRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [0, 0, 0],
      lineColor: [180, 180, 180], // 0.5px grey hairline
      lineWidth: 0.18,
      font: 'helvetica',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245], // #F5F5F5 zebra rows
    },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold', textColor: [68, 68, 68] },
      1: { cellWidth: 44, font: 'courier' },
      2: { cellWidth: 46, fontStyle: 'bold', textColor: [68, 68, 68] },
      3: { cellWidth: 44 },
    },
    margin: { left: margin, right: margin },
  });

  cursorY = doc.lastAutoTable.finalY + 3.5;

  // ---------------------------------------------------------------------------
  // 6. SECTION 3: LEGAL AGREEMENT & DECLARATION
  // ---------------------------------------------------------------------------
  const sec3BannerUrl = renderTextToDataUrl({
    text: '3. BORROWER UNDERTAKING & AGREEMENT  /  கடன் ஒப்பந்த உறுதிமொழி',
    width: 700,
    height: 38,
    fontSize: 17,
  });

  if (sec3BannerUrl) {
    doc.addImage(sec3BannerUrl, 'PNG', margin, cursorY, contentWidth, 6);
  } else {
    doc.setFillColor(0, 0, 0);
    doc.rect(margin, cursorY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('3. BORROWER UNDERTAKING (KADAN OPPANDHA URUDHIMOZHI)', margin + 3, cursorY + 4.2);
  }

  cursorY += 7.5;

  const termsBoxH = 34;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(margin, cursorY, contentWidth, termsBoxH);

  const agreementTerms = [
    '1. I, the undersigned borrower, acknowledge having received the in-hand disbursed sum stated above in good order.',
    '2. I promise unconditionally to repay the total loan amount via daily installments of the agreed sum without default.',
    '3. In case of delayed payment or missed installments, late charges and recovery costs as per terms shall apply.',
    '4. I confirm that all particulars, identity documents, phone number, and residence details furnished by me are true and accurate.',
    '5. Prepayment is permitted; in event of continuous default, the institution reserves lawful rights to recover outstanding dues.',
  ];

  let termY = cursorY + 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 30, 30);
  agreementTerms.forEach((t) => {
    doc.text(t, margin + 3, termY);
    termY += 5.5;
  });

  cursorY += termsBoxH + 4;

  // ---------------------------------------------------------------------------
  // 7. SECTION 4: SIGNATURE BOXES (3 equal boxes) & ROUND SEAL
  // ---------------------------------------------------------------------------
  const sigBoxW = (contentWidth - 6) / 3;
  const sigBoxH = 26;

  // Signature Box 1: Borrower
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(margin, cursorY, sigBoxW, sigBoxH);
  doc.line(margin + 3, cursorY + 18, margin + sigBoxW - 3, cursorY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('BORROWER SIGNATURE / THUMB', margin + sigBoxW / 2, cursorY + 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Name: ${borrowerName}  |  Date: ${todayStr}`, margin + sigBoxW / 2, cursorY + 24.5, { align: 'center' });

  // Signature Box 2: Guarantor
  const sig2X = margin + sigBoxW + 3;
  doc.rect(sig2X, cursorY, sigBoxW, sigBoxH);
  doc.line(sig2X + 3, cursorY + 18, sig2X + sigBoxW - 3, cursorY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('GUARANTOR SIGNATURE', sig2X + sigBoxW / 2, cursorY + 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Witness / Ref  |  Date: ${todayStr}`, sig2X + sigBoxW / 2, cursorY + 24.5, { align: 'center' });

  // Signature Box 3: Authorized Officer + Round Seal
  const sig3X = margin + (sigBoxW + 3) * 2;
  doc.rect(sig3X, cursorY, sigBoxW, sigBoxH);
  doc.line(sig3X + 3, cursorY + 18, sig3X + sigBoxW - 3, cursorY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('AUTHORIZED OFFICER', sig3X + sigBoxW / 2, cursorY + 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text("VK Banker's & Finance  |  Branch Seal", sig3X + sigBoxW / 2, cursorY + 24.5, { align: 'center' });

  // Stamp Round Seal over Officer signature box
  const roundSealUrl = renderRoundSealToDataUrl(todayStr);
  if (roundSealUrl) {
    try {
      doc.addImage(roundSealUrl, 'PNG', sig3X + sigBoxW - 22, cursorY + 1, 24, 24);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 8. FOOTER: Grievance info, Page 1 of 1, Verification code
  // ---------------------------------------------------------------------------
  const footerY = pageHeight - margin + 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(68, 68, 68);
  doc.text('Grievance Officer: grievances@vkbankers.com  |  Customer Care: 1800-425-0000 (Toll Free)', margin, footerY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`VERIFICATION CODE: VKB-${loanNo.replace(/[^A-Z0-9]/gi, '')}-A4`, pageWidth / 2, footerY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Page 1 of 1', pageWidth - margin, footerY, { align: 'right' });

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------
  const filename = `Loan_Agreement_${loanNo}_${parsedName.primary.replace(/\s+/g, '_')}.pdf`;

  return {
    doc,
    filename,
    download: () => doc.save(filename),
    getBlobUrl: () => {
      const blob = doc.output('blob');
      return URL.createObjectURL(blob);
    },
    print: () => {
      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.focus();
      }
    },
  };
};

/**
 * Generates the Official Repayment Schedule PDF Document (தவணை அட்டவணை).
 * Contains full day-by-day or installment schedule with date, due amount, paid amount, balance & status.
 */
export const buildRepaymentSchedulePDF = (loan, customer = {}, payments = []) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const cust =
    customer && typeof customer === 'object' && Object.keys(customer).length > 0
      ? customer
      : loan?.customerId && typeof loan.customerId === 'object'
      ? loan.customerId
      : {};

  const parsedName = parseCustomerName(cust.name || loan?.customerName || 'Borrower');
  const borrowerName = parsedName.primary || 'Borrower';
  const loanNo = loan?.loanNo || 'LN-26-0001';
  const principal = Number(loan?.principal || 0);
  const totalPayable = Number(loan?.totalPayable != null ? loan.totalPayable : principal);
  const duration = Number(loan?.duration || 100);
  const installmentAmount = Number(
    loan?.installmentAmount != null
      ? loan.installmentAmount
      : Math.ceil(totalPayable / duration)
  );
  const totalPaid = Number(loan?.totalCollected != null ? loan.totalCollected : loan?.totalPaid || 0);
  const remaining = Number(
    loan?.remainingBalance != null ? loan.remainingBalance : Math.max(0, totalPayable - totalPaid)
  );
  const status = String(loan?.status || (remaining <= 0 ? 'completed' : 'active')).toUpperCase();
  const scheme = String(loan?.financeType || 'daily').toUpperCase();
  const todayStr = formatDate(new Date());

  // Page Border & Corner Marks
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin - 4) * 2);
  drawCornerMarks(doc, margin - 4, pageWidth, pageHeight);

  // Header
  let cursorY = margin + 2;
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text("VK BANKER'S & FINANCE", pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(68, 68, 68);
  doc.text('OFFICIAL LOAN REPAYMENT SCHEDULE • தவணை அட்டவணை', pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 3.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  cursorY += 5;

  // Metadata Card
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, cursorY, contentWidth, 18, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(68, 68, 68);
  doc.text('BORROWER:', margin + 4, cursorY + 5.5);
  doc.setTextColor(0, 0, 0);
  doc.text(borrowerName, margin + 25, cursorY + 5.5);

  doc.setTextColor(68, 68, 68);
  doc.text('LOAN ID:', margin + 70, cursorY + 5.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'bold');
  doc.text(loanNo, margin + 85, cursorY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(68, 68, 68);
  doc.text('SCHEME:', margin + 125, cursorY + 5.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`${scheme} (${duration} Days)`, margin + 140, cursorY + 5.5);

  doc.setTextColor(68, 68, 68);
  doc.text('TOTAL DUE:', margin + 4, cursorY + 12.5);
  doc.setTextColor(0, 0, 0);
  doc.text(formatPdfCurrency(totalPayable), margin + 25, cursorY + 12.5);

  doc.setTextColor(68, 68, 68);
  doc.text('PAID:', margin + 70, cursorY + 12.5);
  doc.setTextColor(0, 0, 0);
  doc.text(formatPdfCurrency(totalPaid), margin + 85, cursorY + 12.5);

  doc.setTextColor(68, 68, 68);
  doc.text('BALANCE:', margin + 125, cursorY + 12.5);
  doc.setTextColor(0, 0, 0);
  doc.text(formatPdfCurrency(remaining), margin + 140, cursorY + 12.5);

  cursorY += 22;

  // Build Schedule Table Data
  const scheduleRows = [];
  const baseStart = loan?.startDate ? new Date(loan.startDate) : new Date();

  // Create payments lookup if provided
  const paymentMap = new Map();
  if (Array.isArray(payments) && payments.length > 0) {
    payments.forEach((p, idx) => {
      paymentMap.set(idx + 1, p);
    });
  }

  let cumulativePaid = 0;
  for (let day = 1; day <= duration; day++) {
    const dueDate = new Date(baseStart);
    dueDate.setDate(baseStart.getDate() + (day - 1));
    const dueStr = formatDate(dueDate);

    const paidInfo = paymentMap.get(day);
    let dayPaid = 0;
    let dayStatus = 'Pending';
    let paidDateStr = '-';

    if (paidInfo) {
      dayPaid = Number(paidInfo.amount || installmentAmount);
      cumulativePaid += dayPaid;
      dayStatus = 'Paid';
      paidDateStr = formatDate(paidInfo.paymentDate || paidInfo.date || dueDate);
    } else if (cumulativePaid < totalPaid) {
      const remainingPaidPool = totalPaid - cumulativePaid;
      dayPaid = Math.min(installmentAmount, remainingPaidPool);
      cumulativePaid += dayPaid;
      dayStatus = dayPaid >= installmentAmount ? 'Paid' : 'Partial';
      paidDateStr = dueStr;
    } else if (new Date() > dueDate && remaining > 0) {
      dayStatus = 'Overdue';
    }

    const curBal = Math.max(0, totalPayable - cumulativePaid);

    scheduleRows.push([
      { content: String(day), styles: { halign: 'center' } },
      { content: dueStr },
      { content: formatPdfCurrency(installmentAmount), styles: { halign: 'right' } },
      { content: paidDateStr },
      { content: dayPaid > 0 ? formatPdfCurrency(dayPaid) : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatPdfCurrency(curBal), styles: { halign: 'right' } },
      { content: dayStatus, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '' }, // Sign
    ]);
  }

  doc.autoTable({
    startY: cursorY,
    head: [
      [
        { content: '#', styles: { halign: 'center' } },
        { content: 'Due Date' },
        { content: 'Installment', styles: { halign: 'right' } },
        { content: 'Paid Date' },
        { content: 'Amount Paid', styles: { halign: 'right' } },
        { content: 'Balance', styles: { halign: 'right' } },
        { content: 'Status', styles: { halign: 'center' } },
        { content: 'Agent Sign' },
      ],
    ],
    body: scheduleRows,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      textColor: [0, 0, 0],
      lineColor: [200, 200, 200],
      lineWidth: 0.15,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { cellWidth: 24, font: 'courier' },
      3: { cellWidth: 24 },
      4: { cellWidth: 24, font: 'courier' },
      5: { cellWidth: 24, font: 'courier' },
      6: { cellWidth: 20 },
      7: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });

  const filename = `Repayment_Schedule_${loanNo}_${parsedName.primary.replace(/\s+/g, '_')}.pdf`;

  return {
    doc,
    filename,
    download: () => doc.save(filename),
    getBlobUrl: () => {
      const blob = doc.output('blob');
      return URL.createObjectURL(blob);
    },
    print: () => {
      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.focus();
      }
    },
  };
};

/**
 * Direct download helper for Loan Agreement PDF
 */
export const downloadLoanAgreementPDF = (loan, customer) => {
  const result = buildLoanAgreementPDF(loan, customer);
  result.download();
  return result;
};

/**
 * Direct download helper for Repayment Schedule PDF
 */
export const downloadRepaymentSchedulePDF = (loan, customer, payments = []) => {
  const result = buildRepaymentSchedulePDF(loan, customer, payments);
  result.download();
  return result;
};

export default buildLoanAgreementPDF;
