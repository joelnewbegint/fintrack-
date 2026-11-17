/**
 * FinTrack Number History & Auto-Suggestion Utility
 * Manages persistent history of previously entered & searched phone numbers,
 * loan numbers, and customer identity numbers.
 */

const RECENT_NUMBERS_KEY = 'fintrack_recent_numbers';

/**
 * Normalizes phone numbers (strips spaces, dashes, +91)
 */
export const normalizePhoneNumber = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

/**
 * Formats a 10-digit phone number with a clean readable space (e.g. 98421 00000)
 */
export const formatPhoneDisplay = (raw) => {
  const clean = normalizePhoneNumber(raw);
  if (clean.length === 10) {
    return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return clean || raw;
};

/**
 * Retrieves list of previously entered / searched numbers from localStorage
 */
export const getRecentNumbers = (filterType = 'all') => {
  try {
    const raw = localStorage.getItem(RECENT_NUMBERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (filterType === 'all') return list;
    return list.filter((item) => (item.type || 'phone') === filterType);
  } catch (e) {
    return [];
  }
};

/**
 * Persists a newly entered or searched number into localStorage
 */
export const saveRecentNumber = (number, label = '', type = 'phone') => {
  if (!number || typeof number !== 'string') return;
  const cleanNum = type === 'phone' ? normalizePhoneNumber(number) : number.trim();
  if (!cleanNum || cleanNum.length < 3) return;

  try {
    const list = getRecentNumbers('all');
    // Remove duplicate entry
    const filtered = list.filter((item) => {
      const itemNum = typeof item === 'string' ? item : item.number;
      return itemNum !== cleanNum;
    });

    const updated = [
      {
        number: cleanNum,
        label: label ? label.trim() : '',
        type,
        timestamp: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 40); // Keep top 40 recent numbers

    localStorage.setItem(RECENT_NUMBERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save recent number:', e);
  }
};

/**
 * Clears the recent numbers history
 */
export const clearRecentNumbers = (type = 'all') => {
  try {
    if (type === 'all') {
      localStorage.removeItem(RECENT_NUMBERS_KEY);
    } else {
      const list = getRecentNumbers('all');
      const filtered = list.filter((item) => (item.type || 'phone') !== type);
      localStorage.setItem(RECENT_NUMBERS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {}
};
