/**
 * Formats a number to Indian Currency Standard (e.g., ₹ 1,25,000)
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
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
 * Format date to Indian standard (DD/MM/YYYY)
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date for inputs (YYYY-MM-DD)
 */
export const formatDateForInput = (date = new Date()) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
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
