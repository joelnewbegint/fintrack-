/**
 * Formats a number to Indian Currency Standard (e.g., ₹1,25,000 with Indian digit grouping)
 */
export const formatCurrency = (amount, decimals = 0) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Short representation for charts / badges (e.g., ₹ 1.25 L, ₹ 50 K)
 */
export const formatShortCurrency = (amount) => {
  const num = Number(amount) || 0;
  if (num >= 10000000) {
    return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹ ${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `₹ ${(num / 1000).toFixed(1)} K`;
  }
  return `₹ ${num}`;
};

/**
 * Format date to standard: DD MMM YYYY (e.g. "17 Nov 2026")
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date for input elements: YYYY-MM-DD
 */
export const formatDateForInput = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
};

/**
 * Standardize phone number display: +91 XXXXX XXXXX (10-digit Indian standard)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '-';
  const clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    const raw = clean.slice(2);
    return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
  }
  return phone;
};

/**
 * Standardize percentage display: e.g. "15%" or "12.5%"
 */
export const formatPercentage = (val, decimals = 0) => {
  const num = Number(val) || 0;
  return `${num.toFixed(decimals)}%`;
};

/**
 * Calculate overdue days
 */
export const getOverdueDays = (dueDate) => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};
