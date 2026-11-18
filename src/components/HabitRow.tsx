import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Plus, Minus, Edit2, ChevronRight, Hash, Briefcase, Calendar, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Habit, HabitLog } from '../types';
import { ScoreRing } from './ScoreRing';
import { formatDateKey } from '../utils/dateUtils';

interface HabitRowProps {
  habit: Habit;
  dates: Date[];
  logs: Record<string, HabitLog>;
  score: number;
  onToggleBoolean: (habit: Habit, dateKey: string, currentStatus: 'completed' | 'skipped' | 'none') => void;
  onUpdateNumerical: (habit: Habit, dateKey: string, currentValue: number) => void;
  onSelectHabit: (habit: Habit) => void;
  isReadOnly?: boolean;
}

export const HabitRow: React.FC<HabitRowProps> = ({
  habit,
  dates,
  logs,
  score,
  onToggleBoolean,
  onUpdateNumerical,
  onSelectHabit,
  isReadOnly = false,
}) => {
  const [numInputDate, setNumInputDate] = useState<string | null>(null);
  const [tempNumVal, setTempNumVal] = useState<number | string>(0);

  const handleCellClick = (dateKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    const log = logs[dateKey];

    if (habit.type === 'boolean') {
      const currentStatus: 'completed' | 'skipped' | 'none' = log?.completed
        ? 'completed'
        : log?.skipped
        ? 'skipped'
        : 'none';

      // If transitioning to completed, fire confetti
      if (currentStatus === 'none') {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { x, y },
          colors: [habit.color, '#10b981', '#3b82f6', '#f59e0b'],
          ticks: 120,
        });
      }

      onToggleBoolean(habit, dateKey, currentStatus);
    } else {
      // Numerical habit: open quick edit
      const currentVal = log ? log.value : 0;
      // For monthly habits: default to currentVal if exists, otherwise 1 (daily increment towards monthly target)
      const defaultInitialVal =
        habit.frequency === 'monthly'
          ? currentVal > 0
            ? currentVal
            : 1
          : currentVal > 0
          ? currentVal
          : habit.targetValue || 1;
      setTempNumVal(defaultInitialVal);
      setNumInputDate(dateKey);
    }
  };

  const handleSaveNumerical = (dateKey: string) => {
    const val = tempNumVal === '' ? 0 : Math.max(0, Number(tempNumVal) || 0);
    onUpdateNumerical(habit, dateKey, val);
    if (val > 0) {
      confetti({
        particleCount: 20,
        spread: 40,
        colors: [habit.color, '#10b981', '#60a5fa'],
      });
    }
    setNumInputDate(null);
  };

  const isRestDayForHabit = (date: Date) => {
    const day = date.getDay();
    if (habit.frequency === 'weekly' && habit.weeklySchedule === 'flexible') {
      return false; // Bebas mana-mana hari, tiada hari rehat tetap
    }
    if (habit.frequency === 'weekly' && habit.weeklySchedule === 'workdays') {
      return day === 0 || day === 6; // Sunday or Saturday is rest day
    }
    if (habit.frequencyDays && habit.frequencyDays.length > 0) {
      return !habit.frequencyDays.includes(day);
    }
    return false;
  };

  const getFormattedDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const malayDays = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
    const dayName = malayDays[d.getDay()];
    const isToday = dateStr === formatDateKey(new Date());
    return `${dayName}, ${day} ${d.toLocaleDateString('ms-MY', { month: 'short' })}${isToday ? ' (Hari Ini)' : ''}`;
  };

  // Calculate current month's total progress for this habit (for monthly context)
  const currentMonthKey = numInputDate
    ? numInputDate.substring(0, 7)
    : formatDateKey(new Date()).substring(0, 7);

  const currentMonthTotal = Object.entries(logs)
    .filter(([k]) => k.startsWith(currentMonthKey))
    .reduce((sum, [, l]) => sum + (habit.type === 'numerical' ? (l.value || 0) : (l.completed ? 1 : 0)), 0);

  const monthlyTargetVal =
    habit.monthlyTarget || habit.monthlyTargetCount || (habit.frequency === 'monthly' ? (habit.targetValue || 1) : 30);

  const monthlyProgressPercent = Math.min(
    100,
    Math.round((currentMonthTotal / Math.max(1, monthlyTargetVal)) * 100)
  );

  // Calculate current week's total progress (Monday - Sunday of numInputDate's week) for weekly context
  const currentWeekTotal = (() => {
    const refStr = numInputDate || formatDateKey(new Date());
    const [y, m, d] = refStr.split('-').map(Number);
    const refDate = new Date(y, m - 1, d);
    const dayOfWeek = refDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + diffToMonday);

    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const wd = new Date(monday);
      wd.setDate(monday.getDate() + i);
      const key = formatDateKey(wd);
      const l = logs[key];
      if (l) {
        sum += habit.type === 'numerical' ? (l.value || 0) : (l.completed ? 1 : 0);
      }
    }
    return sum;
  })();

  const weeklyTargetVal =
    habit.type === 'numerical'
      ? (habit.targetValue || 1)
      : (habit.weeklyDaysCount || (habit.weeklySchedule === 'workdays' ? 5 : habit.frequencyDays?.length || 2));

  const weeklyProgressPercent = Math.min(
    100,
    Math.round((currentWeekTotal / Math.max(1, weeklyTargetVal)) * 100)
  );

  return (
    <div className="group relative flex items-stretch border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
      {/* Left Section: Habit Info & Score Ring (Sticky on mobile so it stays visible while scrolling) */}
      <div
        onClick={() => onSelectHabit(habit)}
        className="w-[160px] sm:w-[215px] md:w-[255px] shrink-0 sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 py-2.5 sm:py-3 px-2 sm:px-3.5 cursor-pointer flex items-center gap-2 sm:gap-3 shadow-[3px_0_8px_rgba(0,0,0,0.05)] dark:shadow-[3px_0_8px_rgba(0,0,0,0.4)] transition-colors"
      >
        <ScoreRing score={score} color={habit.color} size={28} strokeWidth={3.5} className="shrink-0" />

        <div className="truncate min-w-0 flex-1">
          {/* Row 1: Habit Name & Optional Category Tag */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="font-bold text-xs sm:text-sm md:text-base tracking-tight truncate transition-colors group-hover:underline decoration-neutral-400 dark:decoration-neutral-600 underline-offset-4"
              style={{ color: habit.color }}
              title={habit.name}
            >
              {habit.name}
            </span>
            {habit.category && (
              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700/80 shrink-0 hidden md:inline">
                {habit.category}
              </span>
            )}
          </div>

          {/* Sasaran / Kekerapan Terus di Bawah Tajuk (cth: "3 waktu sehari", "1 kali seminggu", "5 kali sebulan") */}
          <div className="mt-0.5 min-w-0">
            {habit.type === 'numerical' ? (
              <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 truncate block">
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  {habit.frequency === 'monthly'
                    ? (habit.monthlyTarget || habit.monthlyTargetCount || habit.targetValue || 1)
                    : (habit.targetValue || 1)}
                </span>{' '}
                {habit.unit || 'kali'}{' '}
                {habit.frequency === 'monthly'
                  ? 'sebulan'
                  : habit.frequency === 'weekly'
                  ? 'seminggu'
                  : habit.frequencyDays && habit.frequencyDays.length === 5 && !habit.frequencyDays.includes(0) && !habit.frequencyDays.includes(6)
                  ? 'sehari (hari bekerja)'
                  : habit.frequencyDays && habit.frequencyDays.length < 7
                  ? `sehari (${habit.frequencyDays.length} hari)`
                  : 'sehari'}
              </span>
            ) : habit.frequency === 'monthly' ? (
              <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 truncate block">
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  {habit.monthlyTarget || habit.monthlyTargetCount || 5}
                </span>{' '}
                kali sebulan
              </span>
            ) : habit.frequency === 'weekly' ? (
              <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 truncate block">
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  {habit.weeklyDaysCount ||
                    (habit.weeklySchedule === 'workdays'
                      ? 5
                      : habit.weeklySchedule === 'custom' && habit.frequencyDays?.length
                      ? habit.frequencyDays.length
                      : habit.weeklySchedule === 'all'
                      ? 7
                      : 2)}
                </span>{' '}
                kali seminggu
              </span>
            ) : (
              <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 truncate block" title={habit.question}>
                {habit.question
                  ? habit.question
                  : habit.frequencyDays && habit.frequencyDays.length === 5 && !habit.frequencyDays.includes(0) && !habit.frequencyDays.includes(6)
                  ? 'Hari bekerja (Isnin - Jumaat)'
                  : habit.frequencyDays && habit.frequencyDays.length < 7
                  ? `${habit.frequencyDays.length} hari seminggu`
                  : '1 kali sehari'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Section: Date cells (Fills available space on landscape/desktop view) */}
      <div className="flex-1 flex items-stretch">
        {dates.map((date) => {
          const dateKey = formatDateKey(date);
          const isToday = dateKey === formatDateKey(new Date());
          const log = logs[dateKey];
          const isCompleted = !!log?.completed;
          const isSkipped = !!log?.skipped;
          const val = log?.value || 0;
          const isRest = isRestDayForHabit(date);

          return (
            <div
              key={dateKey}
              onClick={(e) => handleCellClick(dateKey, e)}
              title={isReadOnly ? 'Mod Pemantauan (Kunci Suntingan)' : undefined}
              className={`flex-1 min-w-[50px] sm:min-w-[62px] md:min-w-[72px] min-h-[66px] sm:min-h-[70px] flex flex-col items-center justify-center border-r border-neutral-200 dark:border-neutral-800/70 select-none transition-colors relative ${
                isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              } ${
                isToday ? 'bg-blue-600/10 font-bold' : ''
              } ${isRest && !isCompleted ? 'bg-neutral-100/50 dark:bg-neutral-900/40' : ''}`}
            >
              {habit.type === 'boolean' ? (
                // Boolean Cell
                <div className="flex items-center justify-center">
                  {isCompleted ? (
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform transform active:scale-90"
                      style={{ color: habit.color }}
                    >
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3.2]" />
                    </div>
                  ) : isSkipped ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400">
                      <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    </div>
                  ) : isRest ? (
                    // Subtle rest day indicator
                    <div
                      className="w-3 h-3 rounded-full border border-dashed border-neutral-400 dark:border-neutral-600 flex items-center justify-center"
                      title="Hari Rehat (Jadual Hari Bekerja)"
                    >
                      <div className="w-1 h-1 rounded-full bg-neutral-400/60 dark:bg-neutral-600/60" />
                    </div>
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700/70 group-hover:bg-neutral-400 dark:group-hover:bg-neutral-600 transition-colors" />
                  )}
                </div>
              ) : (
                // Numerical Cell
                <div className="text-center px-1">
                  <div
                    className="font-bold text-xs sm:text-sm md:text-base leading-tight"
                    style={{ color: isCompleted || val > 0 ? habit.color : isRest ? '#9ca3af' : '#6b7280' }}
                  >
                    {val}
                  </div>
                  <div
                    className="text-[9px] sm:text-[10px] truncate max-w-[48px] sm:max-w-[65px] leading-tight"
                    style={{ color: isCompleted || val > 0 ? habit.color : '#9ca3af' }}
                  >
                    {habit.unit || 'unit'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Numerical quick input modal dialog (Mounted via Portal to document.body to ensure it is never cut off) */}
      {numInputDate &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn"
            onClick={(e) => {
              e.stopPropagation();
              setNumInputDate(null);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-5 sm:p-6 text-neutral-900 dark:text-white transition-all transform animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shrink-0 shadow-md"
                    style={{ backgroundColor: habit.color }}
                  >
                    <Hash className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg leading-tight" style={{ color: habit.color }}>
                      {habit.name}
                    </h3>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{getFormattedDateLabel(numInputDate)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNumInputDate(null)}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target info card */}
              <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-2xl p-3.5 mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                    {habit.frequency === 'monthly'
                      ? '🗓️ Bulanan:'
                      : habit.frequency === 'weekly'
                      ? '📅 Mingguan:'
                      : '⏰ Harian:'}
                  </span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {habit.frequency === 'monthly'
                      ? `${monthlyTargetVal} ${habit.unit || 'kali'} sebulan`
                      : habit.frequency === 'weekly'
                      ? `${habit.targetValue || 1} ${habit.unit || 'kali'} seminggu`
                      : `${habit.targetValue || 1} ${habit.unit || 'unit'}`}
                  </span>
                </div>

                {habit.frequency === 'weekly' && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Pencapaian Minggu Ini:
                      </span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        {currentWeekTotal} / {weeklyTargetVal} {habit.unit || 'kali'} ({weeklyProgressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${weeklyProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {habit.frequency === 'monthly' && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Pencapaian Bulan Ini:
                      </span>
                      <span className="font-extrabold text-purple-600 dark:text-purple-400">
                        {currentMonthTotal} / {monthlyTargetVal} {habit.unit || 'kali'} ({monthlyProgressPercent}%)
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${monthlyProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Subtitle */}
              <div className="text-center mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {habit.frequency === 'monthly' || habit.frequency === 'weekly'
                  ? `Catat kemajuan hari ini (${habit.unit || 'kali'}):`
                  : `Catatan untuk hari ini:`}
              </div>

              {/* Stepper with Large Input */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const current = tempNumVal === '' ? 0 : Number(tempNumVal) || 0;
                    setTempNumVal(Math.max(0, current - 1));
                  }}
                  className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xl transition-all border border-neutral-200 dark:border-neutral-700"
                  title="Kurang 1"
                >
                  <Minus className="w-5 h-5 stroke-[2.5]" />
                </button>

                <div className="relative flex-1 max-w-[160px]">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tempNumVal}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setTempNumVal('');
                      } else if (/^\d*\.?\d*$/.test(val)) {
                        setTempNumVal(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveNumerical(numInputDate);
                      }
                      if (e.key === 'Escape') {
                        setNumInputDate(null);
                      }
                    }}
                    className="w-full h-12 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-2xl text-center font-black text-2xl text-neutral-900 dark:text-white focus:outline-none transition-colors pr-8 pl-4"
                    placeholder="0"
                    autoFocus
                  />
                  {tempNumVal !== '' && tempNumVal !== 0 && (
                    <button
                      type="button"
                      onClick={() => setTempNumVal('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white transition-colors"
                      title="Padam nombor"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const current = tempNumVal === '' ? 0 : Number(tempNumVal) || 0;
                    setTempNumVal(current + 1);
                  }}
                  className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xl transition-all border border-neutral-200 dark:border-neutral-700"
                  title="Tambah 1"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-5">
                <button
                  type="button"
                  onClick={() => {
                    const current = tempNumVal === '' ? 0 : Number(tempNumVal) || 0;
                    setTempNumVal(current + 1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = tempNumVal === '' ? 0 : Number(tempNumVal) || 0;
                    setTempNumVal(current + 2);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors"
                >
                  +2
                </button>
                {habit.frequency !== 'monthly' && (
                  <button
                    type="button"
                    onClick={() => {
                      const current = tempNumVal === '' ? 0 : Number(tempNumVal) || 0;
                      setTempNumVal(current + 5);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors"
                  >
                    +5
                  </button>
                )}
                {habit.frequency === 'monthly' ? (
                  <button
                    type="button"
                    onClick={() => setTempNumVal(1)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-850 transition-colors"
                  >
                    1 Kali
                  </button>
                ) : habit.frequency === 'weekly' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setTempNumVal(1)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 transition-colors"
                    >
                      1 {habit.unit || 'kali'}
                    </button>
                    {habit.targetValue && habit.targetValue > 1 && (
                      <button
                        type="button"
                        onClick={() => setTempNumVal(habit.targetValue || 1)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-colors"
                      >
                        {habit.targetValue} {habit.unit || 'unit'}
                      </button>
                    )}
                  </>
                ) : (
                  habit.targetValue && habit.targetValue > 1 && (
                    <button
                      type="button"
                      onClick={() => setTempNumVal(habit.targetValue || 1)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-colors"
                    >
                      {habit.targetValue} {habit.unit || 'unit'}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setTempNumVal('')}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-red-500 transition-colors flex items-center gap-1 border border-neutral-200 dark:border-neutral-700"
                  title="Padam nombor untuk masukkan nilai baru"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Padam</span>
                </button>
              </div>

              {/* Action buttons: ALWAYS visible, prominent, un-clippable */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setNumInputDate(null)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-sm transition-all"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveNumerical(numInputDate)}
                  className="flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-98 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
