import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const formatPdfCurrency = (amount) => {
  const num = Math.round(Number(amount) || 0);
  return 'Rs. ' + num.toLocaleString('en-IN');
};

const renderBannerToCanvas = (title, subtitle, width = 750, height = 90) => {
  if (typeof document === 'undefined') return null;
  try {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // Peach & Lavender gradient header
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#8B7BD0');
    grad.addColorStop(1, '#FB923C');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 38);

    ctx.font = 'bold 15px "Noto Sans Tamil", "Segoe UI", Arial, sans-serif';
    ctx.fillText(subtitle, width / 2, 68);

    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
};

export const generateEMIAgreementPdf = (loan, customer = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const emiNo = loan.emiNo || 'EMI-CONTRACT';
  const customerName = loan.customerName || customer.name || 'Borrower';
  const phone = loan.customerPhone || customer.phone || '-';
  const area = loan.customerArea || customer.area || '-';
  const principal = formatPdfCurrency(loan.principal);
  const emiAmount = formatPdfCurrency(loan.installmentAmount);
  const totalPayable = formatPdfCurrency(loan.totalPayable);
  const tenure = `${loan.tenureMonths || 12} Months`;
  const rate = `${loan.interestRatePercent || 14}% (${loan.interestCalculationType || 'reducing'})`;

  // Draw Header
  const bannerImg = renderBannerToCanvas(
    "VK BANKER'S & FINANCE - EMI LOAN AGREEMENT",
    "வி.கே. பேங்கர்ஸ் & பைனான்ஸ் - மாத தவணை கடன் ஒப்பந்தம்"
  );

  if (bannerImg) {
    doc.addImage(bannerImg, 'PNG', 40, 30, pageWidth - 80, 65);
  } else {
    doc.setFillColor(139, 123, 208);
    doc.rect(40, 30, pageWidth - 80, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("VK BANKER'S & FINANCE - EMI AGREEMENT", pageWidth / 2, 60, { align: 'center' });
  }

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.text(`Agreement Ref: ${emiNo}`, 45, 115);
  doc.text(`Date of Sanction: ${new Date(loan.startDate || Date.now()).toLocaleDateString()}`, pageWidth - 45, 115, { align: 'right' });

  // 1. Customer & Guarantor Details Table
  doc.autoTable({
    startY: 130,
    head: [['Borrower Particulars / வாடிக்கையாளர் விவரம்', 'Value / விவரம்']],
    body: [
      ['Customer Full Name / பெயர்', customerName],
      ['Contact Number / அலைபேசி', phone],
      ['Area / முகவரி & பகுதி', `${customer.address || area}, Area: ${area}`],
      ['ID Proof / அடையாள அட்டை', `${customer.idProofType || 'Aadhaar'}: ${customer.idProofNumber || '-'}`],
      ['Guarantor Name / ஜாமீன்தாரர்', customer.guarantor?.name ? `${customer.guarantor.name} (${customer.guarantor.relationship || 'Relative'}, Ph: ${customer.guarantor.phone || '-'})` : 'Office Verified'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [139, 123, 208], textColor: 255, fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9, cellPadding: 5 },
  });

  // 2. Product, Loan & EMI Terms Table
  const productRows = loan.product?.name
    ? [
        ['Product Name / பொருள்', `${loan.product.name}${loan.product.brandModel ? ` (${loan.product.brandModel})` : ''}`],
        ...(loan.product.category ? [['Category / வகை', loan.product.category]] : []),
        ...(loan.product.serialImei ? [['Serial / IMEI', loan.product.serialImei]] : []),
        ['Product Price / பொருள் விலை', formatPdfCurrency(loan.product.price || 0)],
        ['Down Payment / முன்பணம்', formatPdfCurrency(loan.product.downPayment || 0)],
      ]
    : [];

  const finalY1 = doc.lastAutoTable.finalY + 15;
  doc.autoTable({
    startY: finalY1,
    head: [['Loan Parameter / கடன் விதிமுறை', 'Agreed Terms / நிர்ணயிக்கப்பட்ட தொகை']],
    body: [
      ...productRows,
      ['Finance / Principal Sanctioned / கடன் தொகை', principal],
      ['Interest Rate / வட்டி விகிதம்', rate],
      ['Tenure / தவணை காலம்', tenure],
      ['Monthly Installment (EMI) / மாத தவணை', emiAmount],
      ['Total Repayable / மொத்த திருப்பிச் செலுத்தும் தொகை', totalPayable],
      ['Total Charges / கட்டணங்கள்', formatPdfCurrency(loan.totalCharges ?? loan.documentationCharges ?? 0)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9, cellPadding: 5 },
  });

  // 3. First 6 Installments Schedule Preview
  const scheduleRows = (loan.schedule || []).slice(0, 12).map((s) => [
    `#${s.installmentNo}`,
    new Date(s.dueDate).toLocaleDateString(),
    formatPdfCurrency(s.amount),
    formatPdfCurrency(s.principalPart || 0),
    formatPdfCurrency(s.interestPart || 0),
    s.status.toUpperCase(),
  ]);

  const finalY2 = doc.lastAutoTable.finalY + 15;
  doc.autoTable({
    startY: finalY2,
    head: [['Instalment #', 'Due Date', 'EMI Amount', 'Principal', 'Interest', 'Status']],
    body: scheduleRows,
    theme: 'striped',
    headStyles: { fillColor: [75, 60, 138], textColor: 255 },
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  // Signatures
  const finalY3 = doc.lastAutoTable.finalY + 45;
  if (finalY3 < 760) {
    doc.setFontSize(9);
    doc.text('Borrower Signature / வாடிக்கையாளர் கையொப்பம்', 45, finalY3);
    doc.text('Guarantor Signature / ஜாமீன்தாரர்', pageWidth / 2, finalY3, { align: 'center' });
    doc.text("For VK BANKER'S & FINANCE (Authorized)", pageWidth - 45, finalY3, { align: 'right' });
  }

  doc.save(`${emiNo}_Agreement_${customerName.replace(/\s+/g, '_')}.pdf`);
};

