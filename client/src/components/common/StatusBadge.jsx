import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Standard StatusBadge Component for Ocean Blue Design System
 * Status colors (same everywhere, always show a text label too):
 *   Due:      bg #FFE3CF  text #8A4A1F
 *   Overdue:  bg #FFD6D2  text #9B2C2C
 *   Paid:     bg #CDEFE0  text #1F6B4F
 *   Upcoming: white with ink text and #BFE3FA border
 */
export const StatusBadge = ({ status, customLabel, size = 'md', className = '' }) => {
  const { lang } = useLanguage ? useLanguage() : { lang: 'en' };
  const s = String(status || '').toLowerCase().trim();

  let config = {
    bg: 'bg-white',
    text: 'text-ink',
    border: 'border border-[#BFE3FA]',
    icon: Calendar,
    labelEn: 'Upcoming',
    labelTa: 'வரவிருக்கும்',
  };

  if (s === 'paid' || s === 'completed' || s === 'closed') {
    config = {
      bg: 'bg-[#CDEFE0]',
      text: 'text-[#1F6B4F]',
      border: 'border border-[#1F6B4F]/20',
      icon: CheckCircle2,
      labelEn: s === 'closed' || s === 'completed' ? 'Closed' : 'Paid',
      labelTa: s === 'closed' || s === 'completed' ? 'முடிந்தது' : 'செலுத்தப்பட்டது',
    };
  } else if (s === 'overdue' || s === 'late' || s === 'missed') {
    config = {
      bg: 'bg-[#FFD6D2]',
      text: 'text-[#9B2C2C]',
      border: 'border border-[#9B2C2C]/20',
      icon: AlertTriangle,
      labelEn: s === 'missed' ? 'Missed' : 'Overdue',
      labelTa: s === 'missed' ? 'தவறியது' : 'தாமதம்',
    };
  } else if (s === 'due' || s === 'active' || s === 'pending') {
    config = {
      bg: 'bg-[#FFE3CF]',
      text: 'text-[#8A4A1F]',
      border: 'border border-[#8A4A1F]/20',
      icon: Clock,
      labelEn: s === 'active' ? 'Active' : 'Due Today',
      labelTa: s === 'active' ? 'செயலில்' : 'இன்று செலுத்த வேண்டியது',
    };
  }

  const Icon = config.icon;
  const label = customLabel || (lang === 'ta' ? config.labelTa : config.labelEn);

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-xs font-black gap-1.5'
      : 'px-2.5 py-1 text-[11px] font-bold gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tracking-tight whitespace-nowrap shadow-xs ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 stroke-[2.5]' : 'w-3.5 h-3.5 stroke-[2.5]'} />
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;

