import React, { useState, useEffect, useRef } from 'react';
import { Phone, Clock, User, X, Trash2, Hash } from 'lucide-react';
import {
  getRecentNumbers,
  saveRecentNumber,
  clearRecentNumbers,
  normalizePhoneNumber,
  formatPhoneDisplay,
} from '../../utils/numberCorrection';

/**
 * SmartNumberInput
 * Input component for phone numbers and reference numbers with history of
 * previously entered & searched numbers, auto-complete, and customer lookup.
 */
export default function SmartNumberInput({
  value = '',
  onChange,
  onSelectRecord,
  placeholder = '9842100000',
  className = '',
  inputClassName = '',
  required = false,
  name = 'phone',
  id,
  disabled = false,
  autoFocus = false,
  maxLength = 10,
  numberType = 'phone', // 'phone' | 'loan' | 'id'
  existingRecords = [], // [{ phone, name, area, _id }]
  isSearch = false,
  onKeyDown,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentNumbers, setRecentNumbers] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const refreshRecent = () => {
    setRecentNumbers(getRecentNumbers(numberType));
  };

  useEffect(() => {
    refreshRecent();
  }, [numberType]);

  // Click outside to close
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

  const rawQuery = (value || '').trim();
  const cleanQuery = numberType === 'phone' ? normalizePhoneNumber(rawQuery) : rawQuery;

  // Filter recent numbers matching typed digits
  const filteredRecent = recentNumbers.filter((item) => {
    const num = typeof item === 'string' ? item : item.number || '';
    return !cleanQuery || num.includes(cleanQuery);
  });

  // Filter existing registered customer phone numbers
  const filteredRecords = cleanQuery && existingRecords.length > 0
    ? existingRecords
        .filter((r) => {
          const rPhone = normalizePhoneNumber(r.phone || '');
          const rName = (r.name || '').toLowerCase();
          return rPhone.includes(cleanQuery) || rName.includes(cleanQuery.toLowerCase());
        })
        .slice(0, 5)
    : [];

  const selectableItems = [];
  filteredRecent.slice(0, 6).forEach((item) => {
    selectableItems.push({ type: 'recent', data: item });
  });
  filteredRecords.forEach((rec) => {
    selectableItems.push({ type: 'record', data: rec });
  });

  const handleInputChange = (e) => {
    let val = e.target.value;
    if (numberType === 'phone') {
      // Allow only numbers
      val = val.replace(/[^0-9]/g, '');
      if (maxLength && val.length > maxLength) {
        val = val.slice(0, maxLength);
      }
    }
    onChange(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

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
  };

  const applyItem = (item) => {
    if (item.type === 'recent') {
      const numVal = typeof item.data === 'string' ? item.data : item.data.number;
      onChange(numVal);
      saveRecentNumber(numVal, item.data?.label || '', numberType);
      refreshRecent();
      if (onSelectRecord && typeof item.data === 'object' && item.data.label) {
        onSelectRecord({ phone: numVal, name: item.data.label });
      }
      setIsOpen(false);
    } else if (item.type === 'record') {
      const rec = item.data;
      const cleanPhone = normalizePhoneNumber(rec.phone);
      onChange(cleanPhone);
      saveRecentNumber(cleanPhone, rec.name || '', numberType);
      refreshRecent();
      if (onSelectRecord) {
        onSelectRecord(rec);
      }
      setIsOpen(false);
    }
  };

  const handleClearHistory = (e) => {
    e.stopPropagation();
    clearRecentNumbers(numberType);
    setRecentNumbers([]);
  };

  const hasSuggestions = filteredRecent.length > 0 || filteredRecords.length > 0;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type={numberType === 'phone' ? 'tel' : 'text'}
          inputMode={numberType === 'phone' ? 'tel' : 'text'}
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            refreshRecent();
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDownInternal}
          autoComplete="off"
          className={`w-full outline-none transition-all pr-8 ${
            inputClassName ||
            'min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs focus:ring-2 focus:ring-sky-400'
          }`}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Previously Entered Numbers Dropdown */}
      {isOpen && hasSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Section 1: Recently Entered / Searched Numbers */}
          {filteredRecent.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>
                    {numberType === 'phone'
                      ? 'Recent Numbers / முந்தைய எண்கள்'
                      : 'Recent Entries / முந்தைய விவரங்கள்'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Clear history / அழிக்க"
                  className="hover:text-rose-500 transition-colors flex items-center space-x-0.5 text-[10px] lowercase font-normal"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>clear</span>
                </button>
              </div>

              <div className="mt-1 space-y-0.5">
                {filteredRecent.slice(0, 5).map((item, idx) => {
                  const num = typeof item === 'string' ? item : item.number;
                  const label = typeof item === 'object' ? item.label : '';
                  return (
                    <div
                      key={`recent-num-${idx}`}
                      onClick={() => applyItem({ type: 'recent', data: item })}
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {numberType === 'phone' ? (
                          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Hash className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        )}
                        <span className="font-mono tracking-wider font-bold">
                          {numberType === 'phone' ? formatPhoneDisplay(num) : num}
                        </span>
                        {label && (
                          <span className="text-[11px] text-slate-400 font-normal truncate max-w-[140px]">
                            • {label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0">Recent</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Registered Database Customer Numbers */}
          {filteredRecords.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-sky-500" />
                <span>Registered Borrowers / வாடிக்கையாளர்கள்</span>
              </div>

              <div className="mt-1 space-y-0.5">
                {filteredRecords.map((rec) => (
                  <div
                    key={`rec-${rec._id || rec.phone}`}
                    onClick={() => applyItem({ type: 'record', data: rec })}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-mono font-bold tracking-wider">
                          {formatPhoneDisplay(rec.phone)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal ml-2">
                          ({rec.name})
                        </span>
                      </div>
                    </div>
                    {rec.area && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {rec.area}
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

