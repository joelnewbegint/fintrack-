/**
 * FinTrack Name Formatting, Auto-Correction & Grammar Utility
 * Handles smart name casing, initial formatting, fuzzy spelling suggestions,
 * and persistent history of previously entered / searched names.
 */

// Common Tamil / Indian borrower first names dictionary for spell correction
export const COMMON_NAMES = [
  'Subramanian',
  'Murugan',
  'Murugesan',
  'Saravanan',
  'Thilaga',
  'Thilagavathi',
  'Karthik',
  'Karthikeyan',
  'Senthil',
  'Senthilkumar',
  'Vasanthakumar',
  'Vasanthan',
  'Magimaidoss',
  'Ganesan',
  'Palanisamy',
  'Ramasamy',
  'Rajesh',
  'Suresh',
  'Manikandan',
  'Venkatesh',
  'Anand',
  'Anandan',
  'Praveen',
  'Vijay',
  'Vijayakumar',
  'Prakash',
  'Selvam',
  'Dharmalingam',
  'Shanmugam',
  'Lakshmi',
  'Meenakshi',
  'Meena',
  'Kavitha',
  'Priya',
  'Deepa',
  'Revathi',
  'Banumathi',
  'Shanthi',
  'Vijaya',
  'Chitra',
  'Radha',
  'Kalaivani',
  'Muthukumar',
  'Balamurugan',
  'Govindaraj',
  'Arumugam',
  'Pandian',
  'Ravichandran',
  'Sundaram',
  'Loganathan',
  'Velusamy',
  'Natarajan',
  'Mani',
  'Kumar',
  'Raja',
  'Ravi',
  'Ramesh',
  'Moorthy',
  'Siva',
  'Sivakumar',
  'Balaji',
  'Dinesh',
  'Gopinath',
  'Mahesh',
  'Hari',
  'Prabhu',
  'Sathish',
  'Vignesh',
  'Ayyappan',
  'Babu',
  'Sankar',
  'Jayakumar',
  'Mohan',
  'Kannan',
  'Dhanalakshmi',
  'Bhuvaneshwari',
  'Saradha',
  'Suganya',
  'Malathi',
  'Kalpana',
  'Poornima',
  'Nandhini',
];

const RECENT_NAMES_KEY = 'fintrack_recent_customer_names';

/**
 * Auto-corrects name capitalization, dot initials, and spacing grammar.
 * Examples:
 * - "k.subramanian"   -> "K. Subramanian"
 * - "k subramanian"    -> "K. Subramanian"
 * - "m.magimaidoss"    -> "M. Magimaidoss"
 * - "s. murugesan"     -> "S. Murugesan"
 * - "a.r. senthil"     -> "A.R. Senthil"
 * - "thilagavathi m"   -> "Thilagavathi M."
 */
export const autoCorrectNameCasing = (rawName) => {
  if (!rawName || typeof rawName !== 'string') return '';

  let str = rawName.trim();
  if (!str) return '';

  // Preserve parentheses content if bilingual e.g. "K. Murugan (முருகன்)"
  const parenMatch = str.match(/^(.*?)\s*(\(.*?\)|\[.*?\])$/);
  let mainPart = parenMatch ? parenMatch[1].trim() : str;
  const suffixPart = parenMatch ? ` ${parenMatch[2].trim()}` : '';

  // Replace multiple spaces with a single space
  mainPart = mainPart.replace(/\s+/g, ' ');

  // Fix attached initial at end of word e.g. "begin.t" -> "begin T."
  mainPart = mainPart.replace(/([a-zA-Z]{2,})\.([a-zA-Z])(?=\s|$)/gi, '$1 $2.');

  // Fix detached leading dot on initial e.g. "Begin .T" or "Begin . t" -> "Begin T."
  mainPart = mainPart.replace(/\s*\.\s*([a-zA-Z])(?=\s|$)/gi, ' $1.');

  // Fix initial with dot without space e.g. "K.subramanian" -> "K. Subramanian"
  mainPart = mainPart.replace(/^([a-zA-Z])\.([a-zA-Z]{2,})/i, '$1. $2');

  // Fix two initials without spaces e.g. "A.R.senthil" -> "A.R. Senthil"
  mainPart = mainPart.replace(/^([a-zA-Z]\.[a-zA-Z]\.)([a-zA-Z]{2,})/i, '$1 $2');

  mainPart = mainPart.trim().replace(/\s+/g, ' ');

  const words = mainPart.split(' ');
  const formattedWords = words.map((w, index) => {
    // If it's a single letter initial at start or end, format as "X."
    if (/^[a-zA-Z]$/.test(w)) {
      return w.toUpperCase() + '.';
    }

    // If it's single letter with dot like "k." -> "K."
    if (/^[a-zA-Z]\.$/.test(w)) {
      return w.toUpperCase();
    }

    // Dot then single letter like ".t" -> "T."
    if (/^\.[a-zA-Z]$/.test(w)) {
      return w.slice(1).toUpperCase() + '.';
    }

    // Double initials like "a.r." or "A.R"
    if (/^[a-zA-Z]\.[a-zA-Z]\.?$/i.test(w)) {
      const chars = w.replace(/\./g, '').toUpperCase();
      return `${chars[0]}.${chars[1]}.`;
    }

    // Standard word capitalization (e.g. "subramanian" -> "Subramanian")
    // Keep Tamil Unicode intact (Tamil characters \u0B80-\u0BFF remain untouched)
    if (/^[a-zA-Z]/.test(w)) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }

    return w;
  });

  return formattedWords.join(' ') + suffixPart;
};

/**
 * Standard Levenshtein Distance Algorithm for spell check comparison
 */
export const getLevenshteinDistance = (a, b) => {
  if (!a || !b) return (a || b || '').length;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
};

/**
 * Finds spelling correction suggestion for a given name or word.
 * Returns { suggestion, correctedFull, isTypo } or null.
 */
export const getSpellingSuggestion = (typedName, existingCustomerNames = []) => {
  if (!typedName || typedName.trim().length < 3) return null;

  const clean = typedName.trim();
  const words = clean.split(/\s+/);
  const lastWord = words[words.length - 1];

  // Candidates: unique combined list of existing registered customers + standard dictionary
  const candidatePool = new Set([
    ...COMMON_NAMES,
    ...existingCustomerNames.map((n) => {
      // Extract main single words from full names
      const parts = (n || '').replace(/[\(\)\[\]\.]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
      return parts;
    }).flat(),
  ]);

  const lowerLast = lastWord.toLowerCase();
  let bestMatch = null;
  let minDistance = Infinity;

  for (const candidate of candidatePool) {
    const lowerCandidate = candidate.toLowerCase();

    // Exact match already - no suggestion needed
    if (lowerCandidate === lowerLast) return null;

    // Prefix match (user is midway through typing: e.g. "thilag" -> "Thilagavathi")
    if (lowerCandidate.startsWith(lowerLast) && lowerCandidate.length > lowerLast.length) {
      const suggestedWords = [...words];
      suggestedWords[suggestedWords.length - 1] = candidate;
      const correctedFull = autoCorrectNameCasing(suggestedWords.join(' '));
      return {
        original: clean,
        suggestion: candidate,
        correctedFull,
        type: 'autocomplete',
      };
    }

    // Levenshtein fuzzy match (typo correction: e.g. "Murugn" -> "Murugan", "Karthk" -> "Karthik")
    const dist = getLevenshteinDistance(lowerLast, lowerCandidate);
    const maxAllowedDist = lowerCandidate.length > 6 ? 2 : 1;

    if (dist <= maxAllowedDist && dist < minDistance) {
      minDistance = dist;
      bestMatch = candidate;
    }
  }

  if (bestMatch && minDistance <= 2) {
    const suggestedWords = [...words];
    suggestedWords[suggestedWords.length - 1] = bestMatch;
    const correctedFull = autoCorrectNameCasing(suggestedWords.join(' '));
    return {
      original: clean,
      suggestion: bestMatch,
      correctedFull,
      type: 'typo',
    };
  }

  return null;
};

/**
 * Retrieves list of previously entered / searched names from localStorage
 */
export const getRecentNames = () => {
  try {
    const raw = localStorage.getItem(RECENT_NAMES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
};

/**
 * Persists a newly entered or searched customer name into localStorage
 */
export const saveRecentName = (name) => {
  if (!name || typeof name !== 'string') return;
  const formatted = autoCorrectNameCasing(name);
  if (!formatted || formatted.length < 2) return;

  try {
    const list = getRecentNames();
    // Filter out duplicates (case-insensitive)
    const filtered = list.filter(
      (item) => (item.name || item).toLowerCase() !== formatted.toLowerCase()
    );

    // Keep top 30 recent names
    const updated = [
      {
        name: formatted,
        timestamp: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 30);

    localStorage.setItem(RECENT_NAMES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save recent name:', e);
  }
};

/**
 * Clears the recent names history
 */
export const clearRecentNames = () => {
  try {
    localStorage.removeItem(RECENT_NAMES_KEY);
  } catch (e) {}
};
