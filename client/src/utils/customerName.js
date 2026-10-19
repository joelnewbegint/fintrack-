/**
 * FinTrack Customer Name Parser
 * Splits compound names like "K. Subramanian (சுப்பிரமணியன்)" or "S. Murugesan (முருகேசன்)"
 * into a primary short English name and a secondary Tamil name for mobile 2-line rendering.
 */
export const parseCustomerName = (fullName) => {
  if (!fullName) return { primary: 'Unknown', secondary: '' };
  
  // Matches "English Name (Tamil Name)" or "Name [Tamil]"
  const match = fullName.match(/^(.*?)\s*[\(\[](.*?)[\)\]]$/);
  if (match && match[1] && match[2]) {
    return {
      primary: match[1].trim(),
      secondary: match[2].trim(),
    };
  }

  // If no parentheses, check if name contains both Latin and Tamil Unicode characters
  // Tamil Unicode block: \u0B80-\u0BFF
  const hasTamil = /[\u0B80-\u0BFF]/.test(fullName);
  const hasLatin = /[a-zA-Z]/.test(fullName);

  if (hasTamil && hasLatin) {
    const parts = fullName.split(/\s+-\s+|\s+\/\s+/);
    if (parts.length >= 2) {
      return {
        primary: parts[0].trim(),
        secondary: parts[1].trim(),
      };
    }
  }

  return {
    primary: fullName.trim(),
    secondary: '',
  };
};

export default parseCustomerName;
