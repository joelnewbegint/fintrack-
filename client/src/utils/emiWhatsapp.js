/**
 * Bilingual Tamil/English WhatsApp Templates for EMI Module
 */
export const generateEMIWhatsAppMessage = ({
  type = 'due_today', // 'due_today' | 'payment_received' | 'overdue' | 'loan_closed'
  businessName = "VK BANKER'S & FINANCE",
  customerName = '',
  emiNo = '',
  installmentNo = 1,
  amount = 0,
  dueDate = '',
  remainingBalance = 0,
  receiptNo = '',
  lang = 'ta',
}) => {
  const formattedAmount = `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  const formattedBalance = `₹${Number(remainingBalance || 0).toLocaleString('en-IN')}`;

  if (type === 'due_today') {
    if (lang === 'ta') {
      return (
        `*${businessName}*\n` +
        `வணக்கம் ${customerName},\n\n` +
        `தங்களின் மாத தவணை (EMI) விவரம்:\n` +
        `🔖 *EMI எண்:* ${emiNo}\n` +
        `📅 *தவணை எண்:* #${installmentNo}\n` +
        `💰 *இன்றைய தவணைத் தொகை:* ${formattedAmount}\n` +
        `🗓️ *கடைசி தேதி:* ${dueDate || 'இன்று'}\n\n` +
        `இன்றே செலுத்தி தாமதக் கட்டணத்தைத் தவிர்க்குமாறு கேட்டுக்கொள்கிறோம்.\n` +
        `நன்றி!`
      );
    }
    return (
      `*${businessName}*\n` +
      `Dear ${customerName},\n\n` +
      `This is a gentle reminder that your monthly EMI is due today:\n` +
      `🔖 *EMI No:* ${emiNo}\n` +
      `📅 *Installment:* #${installmentNo}\n` +
      `💰 *Amount Due:* ${formattedAmount}\n` +
      `🗓️ *Due Date:* ${dueDate || 'Today'}\n\n` +
      `Please clear your installment today to avoid late fees.\n` +
      `Thank you!`
    );
  }

  if (type === 'payment_received') {
    if (lang === 'ta') {
      return (
        `*${businessName}*\n` +
        `வணக்கம் ${customerName},\n\n` +
        `தங்களின் மாத தவணை வரவு வைக்கப்பட்டது:\n` +
        `🧾 *ரசீது எண்:* ${receiptNo}\n` +
        `🔖 *EMI எண்:* ${emiNo}\n` +
        `💵 *செலுத்திய தொகை:* ${formattedAmount}\n` +
        `📊 *மீதமுள்ள இருப்பு:* ${formattedBalance}\n\n` +
        `சரியான நேரத்தில் செலுத்தியமைக்கு மனமார்ந்த நன்றி!`
      );
    }
    return (
      `*${businessName}*\n` +
      `Dear ${customerName},\n\n` +
      `We have successfully received your EMI payment:\n` +
      `🧾 *Receipt No:* ${receiptNo}\n` +
      `🔖 *EMI No:* ${emiNo}\n` +
      `💵 *Amount Paid:* ${formattedAmount}\n` +
      `📊 *Remaining Balance:* ${formattedBalance}\n\n` +
      `Thank you for your prompt repayment!`
    );
  }

  if (type === 'overdue') {
    if (lang === 'ta') {
      return (
        `*${businessName} - அவசர நினைவூட்டல்*\n` +
        `வணக்கம் ${customerName},\n\n` +
        `தங்களின் மாத தவணை நிலுவையில் உள்ளது:\n` +
        `🔖 *EMI எண்:* ${emiNo}\n` +
        `⚠️ *நிலுவைத் தொகை:* ${formattedAmount}\n` +
        `📅 *தவணை எண்:* #${installmentNo}\n\n` +
        `கூடுதல் அபராதக் கட்டணத்தைத் தவிர்க்க உடனே செலுத்துமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.\n` +
        `தொடர்புக்கு: +91 98421 12345`
      );
    }
    return (
      `*${businessName} - OVERDUE NOTICE*\n` +
      `Dear ${customerName},\n\n` +
      `Your monthly EMI installment is currently overdue:\n` +
      `🔖 *EMI No:* ${emiNo}\n` +
      `⚠️ *Overdue Amount:* ${formattedAmount}\n` +
      `📅 *Installment:* #${installmentNo}\n\n` +
      `Please clear this pending installment immediately to avoid additional penalties.\n` +
      `Contact: +91 98421 12345`
    );
  }

  // Loan closed
  if (lang === 'ta') {
    return (
      `*${businessName}*\n` +
      `வணக்கம் ${customerName},\n\n` +
      `வாழ்த்துக்கள்! தங்களின் EMI கடன் (*${emiNo}*) வெற்றிகரமாக முழுமையாக செலுத்தி முடிக்கப்பட்டது.\n` +
      `தங்களின் உடனடி ஒத்துழைப்புக்கு எமது மனமார்ந்த நன்றிகள்!`
    );
  }
  return (
    `*${businessName}*\n` +
    `Dear ${customerName},\n\n` +
    `Congratulations! Your EMI loan (*${emiNo}*) has been completely closed with zero balance.\n` +
    `Thank you for your valued relationship!`
  );
};

export const openWhatsApp = (phone, text) => {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

