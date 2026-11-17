import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Clock,
  User,
  Check,
  X,
  Search,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import {
  autoCorrectNameCasing,
  autoCorrectNameAndSpelling,
  getSpellingSuggestion,
  getRecentNames,
  saveRecentName,
  clearRecentNames,
} from '../../utils/nameCorrection';

/**
 * SmartNameInput
 * Name input with real-time grammar capitalization, dot-initial formatting,
 * spell checking (Did you mean?), and history of previously entered/searched names.
 */
export default function SmartNameInput({
  value = '',
  onChange,
  onSelectCustomer,
  placeholder = 'Enter name / பெயர் உள்ளிடுக',
  className = '',
  inputClassName = '',
  required = false,
  name = 'customerName',
  id,
  disabled = false,
  autoFocus = false,
  existingCustomers = [],
  isSearch = false,
  showSpellBadge = true,
  onKeyDown,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentNames, setRecentNames] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent names from localStorage
  const refreshRecent = () => {
    setRecentNames(getRecentNames());
  };

  useEffect(() => {
    refreshRecent();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Names pool for spell suggestion
  const existingNamesPool = existingCustomers.map((c) => c.name).filter(Boolean);
  const spellingSuggestion = getSpellingSuggestion(value, existingNamesPool);

  // Filter recent names matching current input
  const query = (value || '').trim().toLowerCase();
  const filteredRecent = recentNames.filter((item) => {
    const itemName = (typeof item === 'string' ? item : item.name || '').toLowerCase();
    return !query || itemName.includes(query);
  });

  // Filter existing registered customers matching current input
  const filteredCustomers = query && existingCustomers.length > 0
    ? existingCustomers.filter((c) => {
        const cName = (c.name || '').toLowerCase();
        const cPhone = (c.phone || '').toLowerCase();
        const cArea = (c.area || '').toLowerCase();
        return cName.includes(query) || cPhone.includes(query) || cArea.includes(query);
      }).slice(0, 5)
    : [];

  // Compute total selectable items for keyboard navigation
  const selectableItems = [];
  if (spellingSuggestion) {
    selectableItems.push({ type: 'spell', data: spellingSuggestion });
  }
  filteredRecent.slice(0, 6).forEach((item) => {
    selectableItems.push({ type: 'recent', data: item });
  });
  filteredCustomers.forEach((cust) => {
    selectableItems.push({ type: 'customer', data: cust });
  });

  const handleInputChange = (e) => {
    const raw = e.target.value;
    onChange(raw);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Smart auto-correction for spelling and casing on blur
  const handleBlur = () => {
    if (value && typeof value === 'string' && value.trim()) {
      const corrected = autoCorrectNameAndSpelling(value, existingNamesPool);
      if (corrected && corrected !== value) {
        onChange(corrected);
        saveRecentName(corrected);
      }
    }
  };

  // Handle typing space: auto-correct spelling and capitalization of preceding word
  const handleKeyDownInternal = (e) => {
    if (onKeyDown) onKeyDown(e);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        prev < selectableItems.length - 1 ? prev + 1 : 0
      );
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : selectableItems.length - 1
      );
      return;
    }

    if (e.key === 'Enter' && isOpen && highlightedIndex >= 0) {
      e.preventDefault();
      const selected = selectableItems[highlightedIndex];
      if (selected) {
        applyItem(selected);
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    // Auto-casing & spell auto-correction on Space key
    if (e.key === ' ') {
      const cursorPos = e.target.selectionStart;
      const textBefore = value.slice(0, cursorPos);
      const textAfter = value.slice(cursorPos);

      // Auto-correct spelling and grammar before space
      const correctedBefore = autoCorrectNameAndSpelling(textBefore, existingNamesPool);
      if (correctedBefore && correctedBefore !== textBefore) {
        e.preventDefault();
        const updated = correctedBefore + ' ' + textAfter;
        onChange(updated);
        // Defer cursor placement after state update
        setTimeout(() => {
          if (inputRef.current) {
            const newPos = correctedBefore.length + 1;
            inputRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    }
  };

  const applyItem = (item) => {
    if (item.type === 'spell') {
      const corrected = item.data.correctedFull || item.data.suggestion;
      onChange(corrected);
      saveRecentName(corrected);
      refreshRecent();
      setIsOpen(false);
    } else if (item.type === 'recent') {
      const nameVal = typeof item.data === 'string' ? item.data : item.data.name;
      onChange(nameVal);
      saveRecentName(nameVal);
      refreshRecent();
      setIsOpen(false);
    } else if (item.type === 'customer') {
      const cust = item.data;
      onChange(cust.name);
      saveRecentName(cust.name);
      refreshRecent();
      if (onSelectCustomer) {
        onSelectCustomer(cust);
      }
      setIsOpen(false);
    }
  };

  const handleApplySpell = (e) => {
    e.stopPropagation();
    if (!spellingSuggestion) return;
    const corrected = spellingSuggestion.correctedFull || spellingSuggestion.suggestion;
    onChange(corrected);
    saveRecentName(corrected);
    refreshRecent();
  };

  const handleClearHistory = (e) => {
    e.stopPropagation();
    clearRecentNames();
    setRecentNames([]);
  };

  const hasSuggestions =
    spellingSuggestion || filteredRecent.length > 0 || filteredCustomers.length > 0;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Field */}
      <div className="relative">
        {isSearch && (
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" />
        )}

        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => {
            refreshRecent();
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDownInternal}
          autoComplete="off"
          spellCheck="false"
          className={`w-full outline-none transition-all ${
            isSearch ? 'pl-10 pr-9' : 'px-3.5 pr-9'
          } ${inputClassName || 'min-h-[46px] py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs focus:ring-2 focus:ring-sky-400'}`}
        />

        {/* Clear / Spell indicator button */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {spellingSuggestion && (
            <button
              type="button"
              onClick={handleApplySpell}
              title={`Auto-correct to ${spellingSuggestion.suggestion} / திருத்து`}
              className="p-1 rounded-md text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors animate-pulse"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Typo / Spell Check Alert Chip (Optional prompt under input) */}
      {showSpellBadge && spellingSuggestion && (
        <div className="mt-1.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs">
          <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              Did you mean: <strong className="font-bold underline">{spellingSuggestion.suggestion}</strong>?
              <span className="text-[10px] ml-1 opacity-75">(எழுத்துப்பிழை திருத்தம்)</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleApplySpell}
            className="ml-2 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors shadow-sm"
          >
            Apply / மாற்று
          </button>
        </div>
      )}

      {/* Autocomplete / History Dropdown */}
      {isOpen && hasSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Section 1: Spell Check Suggestion */}
          {spellingSuggestion && (
            <div className="p-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30">
              <div
                onClick={() => applyItem({ type: 'spell', data: spellingSuggestion })}
                className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-800/50 hover:border-amber-400 cursor-pointer transition-all shadow-sm group"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {spellingSuggestion.correctedFull || spellingSuggestion.suggestion}
                    </div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      {spellingSuggestion.type === 'typo'
                        ? 'Spell check correction / எழுத்துப்பிழை திருத்தம்'
                        : 'Quick autocomplete / விரைவு நிறைவு'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-sm">
                  1-Click Fix
                </span>
              </div>
            </div>
          )}

          {/* Section 2: Recently Entered / Searched Names */}
          {filteredRecent.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>Recently Entered / முந்தைய பெயர்கள்</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Clear history / வரலாற்றை அழி"
                  className="hover:text-rose-500 transition-colors flex items-center space-x-0.5 text-[10px] lowercase font-normal"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>clear</span>
                </button>
              </div>

              <div className="mt-1 space-y-0.5">
                {filteredRecent.slice(0, 5).map((item, idx) => {
                  const nameVal = typeof item === 'string' ? item : item.name;
                  return (
                    <div
                      key={`recent-${idx}`}
                      onClick={() => applyItem({ type: 'recent', data: item })}
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{nameVal}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">Recent</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Existing Registered Customers from Database */}
          {filteredCustomers.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span>Registered Customers / வாடிக்கையாளர்கள்</span>
              </div>

              <div className="mt-1 space-y-0.5">
                {filteredCustomers.map((cust) => (
                  <div
                    key={`cust-${cust._id}`}
                    onClick={() => applyItem({ type: 'customer', data: cust })}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                        {cust.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <div>{cust.name}</div>
                        {cust.phone && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            📞 {cust.phone} {cust.area ? `• 📍 ${cust.area}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    {cust.area && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {cust.area}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

