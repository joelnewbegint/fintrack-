import { formatCurrency, formatDate } from './currency';

/**
 * FinTrack WhatsApp Utility
 * Normalizes phone numbers to standard Indian WhatsApp format: 91XXXXXXXXXX
 */
export const normalizeWhatsAppPhone = (rawPhone) => {
  if (!rawPhone) return '';
  const digits = rawPhone.toString().replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `91${digits.slice(1)}`;
  }
  return digits;
};

/**
 * Format phone for display (e.g. +91 98421 12345)
 */
export const formatPhoneDisplay = (phone) => {
  const norm = normalizeWhatsAppPhone(phone);
  if (norm.length === 12 && norm.startsWith('91')) {
    return `+91 ${norm.slice(2, 7)} ${norm.slice(7)}`;
  }
  return phone || '';
};

/**
 * Opens WhatsApp chat via wa.me URL
 */
export const openWhatsApp = ({ phone, message }) => {
  const clean = normalizeWhatsAppPhone(phone);
  const text = encodeURIComponent(message || '');
  const url = clean ? `https://wa.me/${clean}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Opens WhatsApp Web directly (for initial login or QR scan)
 */
export const openWhatsAppWeb = () => {
  window.open('https://web.whatsapp.com', '_blank', 'noopener,noreferrer');
};

/**
 * 1. Due Reminder Template
 */
export const generateDueReminderMessage = ({
  customerName = 'Customer',
  loanNo = 'VK-LOAN',
  amount = 0,
  dueDate = new Date(),
  lang = 'ta',
}) => {
  const amtStr = typeof amount === 'number' ? formatCurrency(amount) : amount;
  const dateStr = typeof dueDate === 'string' && dueDate.includes('/') ? dueDate : formatDate(dueDate);

  if (lang === 'ta') {
    return `🏛️ *வி.கே. பேங்கர்ஸ் & பைனான்ஸ், கோயம்புத்தூர்*
வணக்கம் *${customerName}*,

தங்களின் கடன் கணக்கு (${loanNo}) பற்றிய நினைவூட்டல்:
📅 தவணை செலுத்த வேண்டிய தேதி: *${dateStr}*
💰 செலுத்த வேண்டிய தவணைத் தொகை: *${amtStr}*

தயவுசெய்து இன்றைய தவணைத் தொகையை உரிய நேரத்தில் செலுத்தி ஒத்துழைக்குமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.

நன்றி,
*வி.கே. பேங்கர்ஸ் & பைனான்ஸ்*
📍 45, கிராஸ் கட் ரோடு, காந்திபுரம், கோவை-12
📞 +91 98421 12345`;
  }

  return `🏛️ *VK BANKER'S & FINANCE, Coimbatore*
Dear *${customerName}*,

Friendly reminder regarding your loan account:
📄 Loan Account No: *${loanNo}*
📅 Installment Due Date: *${dateStr}*
💰 Amount Due: *${amtStr}*

Kindly arrange to clear your scheduled installment promptly today.

Thank you,
*VK Banker's & Finance*
📍 45, Cross Cut Road, Gandhipuram, Coimbatore-12
📞 +91 98421 12345`;
};

/**
 * 2. Payment Receipt Voucher Template
 */
export const generateReceiptMessage = ({
  customerName = 'Customer',
  loanNo = 'VK-LOAN',
  receiptNo = 'RCT-001',
  amount = 0,
  mode = 'CASH',
  date = new Date(),
  remainingBalance = 0,
  lang = 'ta',
}) => {
  const amtStr = typeof amount === 'number' ? formatCurrency(amount) : amount;
  const remStr = typeof remainingBalance === 'number' ? formatCurrency(remainingBalance) : remainingBalance;
  const dateStr = typeof date === 'string' && date.includes('/') ? date : formatDate(date);

  if (lang === 'ta') {
    return `🏛️ *வி.கே. பேங்கர்ஸ் & பைனான்ஸ் - வசூல் ரசீது*
வணக்கம் *${customerName}*,

தங்களின் கடன் தவணைத் தொகை வெற்றிகரமாக பெறப்பட்டது.
━━━━━━━━━━━━━━━━━━━━
📄 ரசீது எண்: *${receiptNo}*
📅 கட்டிய தேதி: *${dateStr}*
💵 செலுத்திய தொகை: *${amtStr}*
💳 முறை: *${mode.toUpperCase()}*
📄 கடன் கணக்கு எண்: *${loanNo}*
⏳ மீதி பாக்கித் தொகை: *${remStr}*
━━━━━━━━━━━━━━━━━━━━
உரிய நேரத்தில் பணம் செலுத்தியமைக்கு மனமார்ந்த நன்றி!

*வி.கே. பேங்கர்ஸ் & பைனான்ஸ்*
📍 காந்திபுரம், கோயம்புத்தூர்-12
📞 +91 98421 12345`;
  }

  return `🏛️ *VK BANKER'S & FINANCE - Collection Receipt*
Dear *${customerName}*,

We have successfully received your installment payment.
━━━━━━━━━━━━━━━━━━━━
📄 Receipt Voucher No: *${receiptNo}*
📅 Payment Date: *${dateStr}*
💵 Amount Received: *${amtStr}*
💳 Payment Mode: *${mode.toUpperCase()}*
📄 Loan Account No: *${loanNo}*
⏳ Remaining Loan Balance: *${remStr}*
━━━━━━━━━━━━━━━━━━━━
Thank you for your prompt installment payment!

*VK Banker's & Finance*
📍 Gandhipuram, Coimbatore-12
📞 +91 98421 12345`;
};

/**
 * 3. Overdue Notice Template
 */
export const generateOverdueMessage = ({
  customerName = 'Customer',
  loanNo = 'VK-LOAN',
  overdueDays = 'தாமதம்',
  dueAmount = 0,
  totalOutstanding = 0,
  lang = 'ta',
}) => {
  const dueStr = typeof dueAmount === 'number' ? formatCurrency(dueAmount) : dueAmount;
  const outStr = typeof totalOutstanding === 'number' ? formatCurrency(totalOutstanding) : totalOutstanding;

  if (lang === 'ta') {
    return `⚠️ *வி.கே. பேங்கர்ஸ் & பைனான்ஸ் - நிலுவைத் தொகை அறிவிப்பு*
வணக்கம் *${customerName}*,

தங்களின் கடன் கணக்கு எண்: *${loanNo}*
தங்களின் கடன் தவணை குறிப்பிட்ட தேதியில் செலுத்தப்படாமல் நிலுவையில் உள்ளது.

💰 நிலுவை தவணைத் தொகை: *${dueStr}*
⏳ மொத்த கடன் பாக்கி: *${outStr}*
⚠️ நிலை: *${overdueDays}*

தாமத அபராதக் கட்டணங்களை தவிர்க்கவும், கடன் நன்மதிப்பை பாதுகாக்கவும் உடனடியாக நிலுவைத் தொகையை செலுத்துமாறு கேட்டுக்கொள்கிறோம்.

தொடர்புக்கு:
*வி.கே. பேங்கர்ஸ் & பைனான்ஸ்*
📞 +91 98421 12345`;
  }

  return `⚠️ *VK BANKER'S & FINANCE - Overdue Notice*
Dear *${customerName}*,

Loan Account No: *${loanNo}*
Your scheduled loan installment is currently pending and overdue.

💰 Pending Due Amount: *${dueStr}*
⏳ Total Outstanding Balance: *${outStr}*
⚠️ Status: *${overdueDays}*

Kindly settle this pending installment immediately to avoid late fees and maintain a good credit record.

Contact:
*VK Banker's & Finance*
📞 +91 98421 12345`;
};

/**
 * 4. Loan Disbursal Sanction Template
 */
export const generateLoanSanctionMessage = ({
  customerName = 'Customer',
  loanNo = 'VK-LOAN',
  principal = 0,
  chargeAmount = 0,
  inHandAmount = 0,
  installmentAmount = 0,
  duration = 100,
  scheme = 'தினசரி / Daily Thandal',
  startDate = new Date(),
  lang = 'ta',
}) => {
  const prinStr = typeof principal === 'number' ? formatCurrency(principal) : principal;
  const chgStr = typeof chargeAmount === 'number' ? formatCurrency(chargeAmount) : chargeAmount;
  const inHandStr = typeof inHandAmount === 'number' ? formatCurrency(inHandAmount) : inHandAmount;
  const instStr = typeof installmentAmount === 'number' ? formatCurrency(installmentAmount) : installmentAmount;
  const dateStr = typeof startDate === 'string' && startDate.includes('/') ? startDate : formatDate(startDate);

  if (lang === 'ta') {
    return `🤝 *வி.கே. பேங்கர்ஸ் & பைனான்ஸ் - புதிய கடன் விபரம்*
வணக்கம் *${customerName}*,

தங்களுக்கு வி.கே. பேங்கர்ஸ் மூலம் கடன் வழங்கப்பட்டது என்பதை உறுதிப்படுத்துகிறோம்.
━━━━━━━━━━━━━━━━━━━━
📄 கடன் கணக்கு எண்: *${loanNo}*
💼 திட்டம்: *${scheme}*
💰 மொத்த கடன் தொகை: *${prinStr}*
✂️ பிடித்தம் செய்யப்பட்ட கட்டணம்: *${chgStr}*
💵 கையில் வழங்கப்பட்ட நிகர தொகை: *${inHandStr}*
📅 தினசரி / தவணைத் தொகை: *${instStr}*
⏳ கால அளவு: *${duration} நாட்கள்/தவணைகள்*
🏁 கடன் தொடங்கும் தேதி: *${dateStr}*
━━━━━━━━━━━━━━━━━━━━
தவணைத் தொகையை தவறாமல் உரிய நாளில் செலுத்தி முழு ஒத்துழைப்பு தருமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.

நன்றி!
*வி.கே. பேங்கர்ஸ் & பைனான்ஸ்*
📍 45, கிராஸ் கட் ரோடு, காந்திபுரம், கோவை-12
📞 +91 98421 12345`;
  }

  return `🤝 *VK BANKER'S & FINANCE - Loan Disbursal Confirmation*
Dear *${customerName}*,

Your loan application has been approved and funds disbursed.
━━━━━━━━━━━━━━━━━━━━
📄 Loan Account No: *${loanNo}*
💼 Scheme: *${scheme}*
💰 Sanctioned Principal: *${prinStr}*
✂️ Upfront Charge / Interest: *${chgStr}*
💵 Net Disbursed In-Hand: *${inHandStr}*
📅 Installment Amount: *${instStr}*
⏳ Tenure / Duration: *${duration}*
🏁 Start Date: *${dateStr}*
━━━━━━━━━━━━━━━━━━━━
Please ensure scheduled installment payments are made on time.

Thank you!
*VK Banker's & Finance*
📍 45, Cross Cut Road, Gandhipuram, Coimbatore-12
📞 +91 98421 12345`;
};

/**
 * 5. Full Statement / Ledger Template
 */
export const generateStatementMessage = ({
  customerName = 'Customer',
  customerPhone = '',
  loanNo = 'VK-LOAN',
  principal = 0,
  totalPayable = 0,
  totalPaid = 0,
  remainingBalance = 0,
  payments = [],
  lang = 'ta',
}) => {
  const prinStr = formatCurrency(principal);
  const payStr = formatCurrency(totalPayable);
  const paidStr = formatCurrency(totalPaid);
  const remStr = formatCurrency(remainingBalance);
  const phoneDisplay = formatPhoneDisplay(customerPhone);

  if (lang === 'ta') {
    let msg = `🏛️ *வி.கே. பேங்கர்ஸ் & பைனான்ஸ்*\n`;
    msg += `_தவணை கடன் வசூல் கணக்கு அறிக்கை_\n`;
    msg += `📍 காந்திபுரம், கோயம்புத்தூர்-12 | 📞 +91 98421 12345\n`;
    msg += `------------------------------------\n`;
    msg += `👤 *வாடிக்கையாளர்:* ${customerName}\n`;
    if (phoneDisplay) msg += `📱 *மொபைல்:* ${phoneDisplay}\n`;
    msg += `📄 *கடன் கணக்கு:* ${loanNo}\n`;
    msg += `💰 *கடன் தொகை:* ${prinStr}\n`;
    msg += `💵 *மொத்த தவணைத் தொகை:* ${payStr}\n`;
    msg += `------------------------------------\n`;
    msg += `📊 *செலுத்திய தவணைகள்:*\n`;

    if (!payments || payments.length === 0) {
      msg += `(இதுவரை பணம் கட்டிய பதிவுகள் இல்லை)\n`;
    } else {
      payments.slice(0, 10).forEach((p, idx) => {
        const d = formatDate(p.date || p.paymentDate);
        const amt = formatCurrency(p.amount);
        const rct = p.receiptNo || `RCT-${idx + 1}`;
        msg += `${idx + 1}. ${d} - *${amt}* (${rct})\n`;
      });
      if (payments.length > 10) {
        msg += `... மற்றும் மேலும் ${payments.length - 10} ரசீதுகள்\n`;
      }
    }

    msg += `------------------------------------\n`;
    msg += `✅ *மொத்தம் செலுத்தியது:* ${paidStr}\n`;
    msg += `⏳ *மீதி செலுத்த வேண்டியது:* ${remStr}\n`;
    msg += `------------------------------------\n`;
    msg += `நன்றி! வி.கே. பேங்கர்ஸ் & பைனான்ஸ்`;
    return msg;
  }

  let msg = `🏛️ *VK BANKER'S & FINANCE*\n`;
  msg += `_Loan Statement & Payment Ledger_\n`;
  msg += `📍 Gandhipuram, Coimbatore-12 | 📞 +91 98421 12345\n`;
  msg += `------------------------------------\n`;
  msg += `👤 *Customer:* ${customerName}\n`;
  if (phoneDisplay) msg += `📱 *Phone:* ${phoneDisplay}\n`;
  msg += `📄 *Loan Account:* ${loanNo}\n`;
  msg += `💰 *Principal:* ${prinStr}\n`;
  msg += `💵 *Total Payable:* ${payStr}\n`;
  msg += `------------------------------------\n`;
  msg += `📊 *Payment History:*\n`;

  if (!payments || payments.length === 0) {
    msg += `(No payment vouchers recorded yet)\n`;
  } else {
    payments.slice(0, 10).forEach((p, idx) => {
      const d = formatDate(p.date || p.paymentDate);
      const amt = formatCurrency(p.amount);
      const rct = p.receiptNo || `RCT-${idx + 1}`;
      msg += `${idx + 1}. ${d} - *${amt}* (${rct})\n`;
    });
    if (payments.length > 10) {
      msg += `... and ${payments.length - 10} more receipts\n`;
    }
  }

  msg += `------------------------------------\n`;
  msg += `✅ *Total Amount Paid:* ${paidStr}\n`;
  msg += `⏳ *Remaining Balance:* ${remStr}\n`;
  msg += `------------------------------------\n`;
  msg += `Thank you! VK Banker's & Finance`;
  return msg;
};

