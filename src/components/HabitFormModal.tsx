import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  CalendarDays,
  CalendarRange,
  Clock,
  Briefcase,
  Hash,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Habit, HabitType, RoutineFrequency, WeeklyScheduleType } from '../types';

interface HabitFormModalProps {
  initialHabit?: Habit | null;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => void;
}

const COLOR_OPTIONS = [
  '#0284c7', // Sky Blue
  '#2563eb', // Blue
  '#4f46e5', // Indigo
  '#9333ea', // Purple
  '#e11d48', // Rose Pink
  '#dc2626', // Red
  '#ea580c', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#0d9488', // Teal
];

const UNIT_PRESETS = ['kali', 'posting', 'prospek', 'kes', 'orang', 'halaman', 'km', 'minit'];

export const CATEGORY_OPTIONS = [
  { id: 'Work', label: 'Kerja / Bisnes', emoji: '💼' },
  { id: 'Sales', label: 'Jualan & Prospek', emoji: '🎯' },
  { id: 'Health', label: 'Kesihatan', emoji: '🍏' },
  { id: 'Spiritual', label: 'Kerohanian', emoji: '🕌' },
  { id: 'Learning', label: 'Pembelajaran', emoji: '📚' },
  { id: 'Personal', label: 'Peribadi', emoji: '👤' },
  { id: 'Finance', label: 'Kewangan', emoji: '💰' },
  { id: 'Other', label: 'Lain-lain', emoji: '✨' },
];

const DAYS_OF_WEEK = [
  { day: 1, label: 'Isn', full: 'Isnin' },
  { day: 2, label: 'Sel', full: 'Selasa' },
  { day: 3, label: 'Rab', full: 'Rabu' },
  { day: 4, label: 'Kha', full: 'Khamis' },
  { day: 5, label: 'Jum', full: 'Jumaat' },
  { day: 6, label: 'Sab', full: 'Sabtu' },
  { day: 0, label: 'Ahd', full: 'Ahad' },
];

const TEMPLATES: {
  name: string;
  question: string;
  type: HabitType;
  frequency: RoutineFrequency;
  weeklySchedule?: WeeklyScheduleType;
  weeklyDaysCount?: number;
  frequencyDays?: number[];
  target?: number;
  unit?: string;
  monthlyTarget?: number;
  category?: string;
  color: string;
}[] = [
  {
    name: 'Senaman Mingguan',
    question: 'Adakah anda telah bersenam hari ini?',
    type: 'boolean',
    frequency: 'weekly',
    weeklySchedule: 'flexible',
    weeklyDaysCount: 2,
    monthlyTarget: 9,
    category: 'Health',
    color: '#10b981',
  },
  {
    name: 'Posting Takaful',
    question: 'Adakah anda sudah buat posting info & kesedaran takaful hari ini?',
    type: 'numerical',
    frequency: 'daily',
    frequencyDays: [1, 2, 3, 4, 5],
    target: 5,
    unit: 'posting',
    monthlyTarget: 100,
    category: 'Work',
    color: '#0284c7',
  },
  {
    name: 'Follow up Prospek',
    question: 'Berapa ramai prospek yang anda susuli (follow up)?',
    type: 'numerical',
    frequency: 'daily',
    frequencyDays: [1, 2, 3, 4, 5],
    target: 5,
    unit: 'prospek',
    monthlyTarget: 100,
    category: 'Work',
    color: '#ea580c',
  },
  {
    name: 'Call / WhatsApp Prospek',
    question: 'Panggilan atau perbincangan bersama pelanggan',
    type: 'numerical',
    frequency: 'daily',
    frequencyDays: [1, 2, 3, 4, 5],
    target: 5,
    unit: 'prospek',
    monthlyTarget: 100,
    category: 'Work',
    color: '#9333ea',
  },
  {
    name: 'Dhuha & Taklimat Pagi',
    question: 'Menghadiri perjumpaan pagi dan solat dhuha bersama pasukan',
    type: 'boolean',
    frequency: 'daily',
    frequencyDays: [1, 2, 3, 4, 5],
    category: 'Work',
    color: '#10b981',
  },
  {
    name: 'Open Case Online',
    question: 'Berapa kes takaful dibuka hari ini?',
    type: 'numerical',
    frequency: 'daily',
    target: 1,
    unit: 'kes',
    monthlyTarget: 30,
    category: 'Work',
    color: '#f59e0b',
  },
  {
    name: 'Bangun Awal (Subuh)',
    question: 'Adakah anda bangun awal sebelum 6:00 AM?',
    type: 'boolean',
    frequency: 'daily',
    category: 'Spiritual',
    color: '#2563eb',
  },
  {
    name: 'Baca Buku / Al-Quran',
    question: 'Membaca sekurang-kurangnya 10 halaman',
    type: 'numerical',
    frequency: 'daily',
    target: 10,
    unit: 'halaman',
    monthlyTarget: 300,
    category: 'Learning',
    color: '#0d9488',
  },
  {
    name: 'Bersenam 30 Minit',
    question: 'Melakukan senaman kardio atau regangan',
    type: 'boolean',
    frequency: 'daily',
    frequencyDays: [1, 3, 5],
    category: 'Health',
    color: '#10b981',
  },
  {
    name: 'Laporan Prestasi Bulanan',
    question: 'Adakah anda telah menyiapkan rumusan jualan bulanan?',
    type: 'boolean',
    frequency: 'monthly',
    monthlyTarget: 1,
    category: 'Work',
    color: '#4f46e5',
  },
];

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
  initialHabit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialHabit?.name || '');
  const [question, setQuestion] = useState(initialHabit?.question || '');
  const [type, setType] = useState<HabitType>(initialHabit?.type || 'boolean');

  // Frequency States: 'daily' | 'weekly' | 'monthly'
  const [frequency, setFrequency] = useState<RoutineFrequency>(initialHabit?.frequency || 'daily');
  const [weeklyDaysCount, setWeeklyDaysCount] = useState<number | ''>(() => {
    if (initialHabit?.weeklyDaysCount !== undefined) return initialHabit.weeklyDaysCount;
    if (initialHabit?.frequency === 'weekly') {
      if (initialHabit.weeklySchedule === 'workdays') return 5;
      if (initialHabit.weeklySchedule === 'all') return 7;
      if (initialHabit.weeklySchedule === 'custom' && initialHabit.frequencyDays?.length) {
        return initialHabit.frequencyDays.length;
      }
    }
    return 2;
  });
  const [frequencyDays, setFrequencyDays] = useState<number[]>(
    initialHabit?.frequencyDays || [0, 1, 2, 3, 4, 5, 6]
  );
  const [dailyScheduleMode, setDailyScheduleMode] = useState<'all' | 'workdays' | 'custom'>(() => {
    if (initialHabit?.frequency === 'daily' && initialHabit?.frequencyDays && initialHabit.frequencyDays.length > 0) {
      if (
        initialHabit.frequencyDays.length === 5 &&
        !initialHabit.frequencyDays.includes(0) &&
        !initialHabit.frequencyDays.includes(6)
      ) {
        return 'workdays';
      }
      if (initialHabit.frequencyDays.length === 7) {
        return 'all';
      }
      return 'custom';
    }
    return 'all';
  });

  // Numerical Target & Unit
  const [targetValue, setTargetValue] = useState<number | ''>(
    initialHabit?.frequency === 'monthly'
      ? (initialHabit?.monthlyTarget || initialHabit?.monthlyTargetCount || initialHabit?.targetValue || 5)
      : (initialHabit?.targetValue || 5)
  );
  const [unit, setUnit] = useState(initialHabit?.unit || 'kali');

  // Monthly specific target count (for monthly habits)
  const [monthlyCount, setMonthlyCount] = useState<number | ''>(
    initialHabit?.frequency === 'monthly'
      ? (initialHabit?.monthlyTargetCount || initialHabit?.monthlyTarget || 5)
      : 5
  );

  // Custom monthly override
  const [showAdvancedMonthly, setShowAdvancedMonthly] = useState(false);
  const [customMonthlyTarget, setCustomMonthlyTarget] = useState<number | ''>(
    initialHabit?.monthlyTarget !== undefined ? initialHabit.monthlyTarget : ''
  );

  const [category, setCategory] = useState<string>(initialHabit?.category || 'Work');
  const [color, setColor] = useState(initialHabit?.color || COLOR_OPTIONS[0]);

  // Calculate default monthly estimate based on current settings
  const calculateDefaultMonthly = (): number => {
    if (frequency === 'monthly') {
      return type === 'numerical' ? (targetValue || 50) : (monthlyCount || 10);
    }
    if (frequency === 'daily') {
      const daysCount =
        dailyScheduleMode === 'all'
          ? 7
          : dailyScheduleMode === 'workdays'
          ? 5
          : frequencyDays.length || 7;
      const daysPerMonth = daysCount === 7 ? 30 : Math.round(daysCount * 4.3);
      return type === 'numerical' ? Math.round((targetValue || 1) * daysPerMonth) : daysPerMonth;
    }
    // Weekly: target is for the whole week (kali seminggu / jumlah seminggu)
    if (type === 'numerical') {
      return Math.round((Number(targetValue) || 1) * 4.3);
    }
    const timesPerWeek = Number(weeklyDaysCount) || 2;
    return Math.min(31, Math.round(timesPerWeek * 4.3));
  };

  const calculatedMonthly = calculateDefaultMonthly();

  const handleDailyScheduleChange = (mode: 'all' | 'workdays') => {
    setDailyScheduleMode(mode);
    if (mode === 'all') {
      setFrequencyDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (mode === 'workdays') {
      setFrequencyDays([1, 2, 3, 4, 5]);
    }
  };

  const toggleDailyCustomDay = (day: number) => {
    let baseDays =
      dailyScheduleMode === 'all'
        ? [0, 1, 2, 3, 4, 5, 6]
        : dailyScheduleMode === 'workdays'
        ? [1, 2, 3, 4, 5]
        : frequencyDays;

    let updatedDays: number[];
    if (baseDays.includes(day)) {
      updatedDays = baseDays.length > 1 ? baseDays.filter((d) => d !== day) : baseDays;
    } else {
      updatedDays = [...baseDays, day].sort();
    }

    setFrequencyDays(updatedDays);
    if (updatedDays.length === 5 && !updatedDays.includes(0) && !updatedDays.includes(6)) {
      setDailyScheduleMode('workdays');
    } else if (updatedDays.length === 7) {
      setDailyScheduleMode('all');
    } else {
      setDailyScheduleMode('custom');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const habitData: Partial<Habit> = {
      name: name.trim(),
      question: question.trim(),
      type,
      frequency,
      color,
      category: category.trim() || 'Work',
    };

    if (frequency === 'weekly') {
      habitData.weeklySchedule = 'flexible';
      habitData.frequencyDays = [0, 1, 2, 3, 4, 5, 6];
      if (type === 'boolean') {
        habitData.weeklyDaysCount = Number(weeklyDaysCount) || 2;
      }
    } else if (frequency === 'daily') {
      habitData.frequencyDays =
        dailyScheduleMode === 'all'
          ? [0, 1, 2, 3, 4, 5, 6]
          : dailyScheduleMode === 'workdays'
          ? [1, 2, 3, 4, 5]
          : frequencyDays;
    }

    if (type === 'numerical') {
      habitData.targetValue = Number(targetValue) || 1;
      habitData.unit = (unit.trim() || 'kali').toLowerCase();
    }

    // Determine final monthlyTarget and monthlyTargetCount cleanly
    let finalMonthlyTarget: number;
    if (frequency === 'monthly') {
      finalMonthlyTarget = type === 'numerical' ? (Number(targetValue) || 5) : (Number(monthlyCount) || 5);
      habitData.monthlyTargetCount = finalMonthlyTarget;
      habitData.monthlyTarget = finalMonthlyTarget;
      // For monthly habit: daily recording step is 1, while full monthly target is finalMonthlyTarget
      habitData.targetValue = 1;
      if (type === 'numerical') {
        habitData.unit = (unit.trim() || 'kali').toLowerCase();
      }
    } else {
      finalMonthlyTarget =
        customMonthlyTarget !== '' && Number(customMonthlyTarget) > 0
          ? Number(customMonthlyTarget)
          : calculatedMonthly;
      habitData.monthlyTarget = finalMonthlyTarget;
      habitData.monthlyTargetCount = finalMonthlyTarget;
    }

    onSave(habitData);
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setName(t.name);
    setQuestion(t.question);
    setType(t.type);
    setFrequency(t.frequency);
    if (t.weeklyDaysCount !== undefined) setWeeklyDaysCount(t.weeklyDaysCount);
    if (t.frequencyDays) {
      setFrequencyDays(t.frequencyDays);
      if (t.frequencyDays.length === 5 && !t.frequencyDays.includes(0) && !t.frequencyDays.includes(6)) {
        setDailyScheduleMode('workdays');
      } else if (t.frequencyDays.length === 7) {
        setDailyScheduleMode('all');
      } else {
        setDailyScheduleMode('custom');
      }
    }
    if (t.target) setTargetValue(t.target);
    if (t.unit) setUnit(t.unit);
    if (t.monthlyTarget) setCustomMonthlyTarget(t.monthlyTarget);
    if (t.category) setCategory(t.category);
    setColor(t.color);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50 dark:bg-neutral-900 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {initialHabit ? 'Kemaskini Tabiat' : 'Cipta Tabiat Baharu'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick templates (only if new habit) */}
          {!initialHabit && (
            <div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Templat Pantas:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-all flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tmpl.color }} />
                    <span className="truncate max-w-[130px]">{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 1. Habit Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Nama Tabiat <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Posting Takaful, Follow up Prospek, Solat Dhuha"
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold transition-all shadow-sm"
            />
          </div>

          {/* 2. Category Selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Kategori Tabiat
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.label)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    category.toLowerCase().includes(cat.label.toLowerCase()) ||
                    category.toLowerCase() === cat.id.toLowerCase()
                      ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Habit Type (Ya/Tidak vs Nilai Berangka) */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Jenis Tabiat
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setType('boolean')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  type === 'boolean'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500 text-neutral-900 dark:text-white font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="text-sm font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Ya / Tidak
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Tanda semak selesai (cth: Solat, Bersenam)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('numerical')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  type === 'numerical'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500 text-neutral-900 dark:text-white font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="text-sm font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <span className="font-mono font-bold text-base leading-none">123</span>
                  Nilai Berangka
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Catat kuantiti (cth: Prospek, Posting, Kes)
                </div>
              </button>
            </div>
          </div>

          {/* 4. UNIFIED KEKERAPAN & SASARAN (SEKSYEN UTAMA YANG TELAH DIPERMUDAHKAN) */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 p-4 space-y-4">
            {/* Header Kekerapan */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Kekerapan Rutin Tabiat</span>
                <span className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">Pilih kekerapan:</span>
              </label>

              {/* 3 Main Frequency Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency('daily')}
                  className={`py-2.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    frequency === 'daily'
                      ? 'border-blue-500 bg-blue-600 text-white font-bold shadow-md'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${frequency === 'daily' ? 'text-white' : 'text-blue-500'}`} />
                  <span className="text-xs">Harian</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFrequency('weekly')}
                  className={`py-2.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    frequency === 'weekly'
                      ? 'border-amber-500 bg-amber-500 text-white font-bold shadow-md'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                  }`}
                >
                  <CalendarDays className={`w-4 h-4 ${frequency === 'weekly' ? 'text-white' : 'text-amber-500'}`} />
                  <span className="text-xs">Mingguan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFrequency('monthly')}
                  className={`py-2.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    frequency === 'monthly'
                      ? 'border-purple-600 bg-purple-600 text-white font-bold shadow-md'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                  }`}
                >
                  <CalendarRange className={`w-4 h-4 ${frequency === 'monthly' ? 'text-white' : 'text-purple-500'}`} />
                  <span className="text-xs">Bulanan</span>
                </button>
              </div>
            </div>

            {/* FREQUENCY DETAILS & TARGET CONFIGURATION */}

            {/* A. If DAILY */}
            {frequency === 'daily' && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 space-y-3.5">
                {/* Pilihan Jadual Hari untuk Harian */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Pilihan jadual hari:
                  </label>

                  {/* 2-columns for Hari Bekerja & Setiap Hari */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDailyScheduleChange('workdays')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        dailyScheduleMode === 'workdays'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-amber-500'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Hari bekerja sahaja
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">5 hari (Isnin - Jumaat)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDailyScheduleChange('all')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        dailyScheduleMode === 'all'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-bold ring-1 ring-blue-500'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Setiap hari
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">7 hari seminggu</div>
                    </button>
                  </div>

                  {/* Custom Days Picker */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <button
                        type="button"
                        onClick={() => setDailyScheduleMode('custom')}
                        className={`text-xs font-bold ${
                          dailyScheduleMode === 'custom' ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500 dark:text-neutral-400 hover:underline'
                        }`}
                      >
                        Atau pilih hari khusus:
                      </button>
                      {dailyScheduleMode === 'custom' && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                          {frequencyDays.length} hari dipilih
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      {DAYS_OF_WEEK.map((item) => {
                        const isSelected =
                          dailyScheduleMode === 'all'
                            ? true
                            : dailyScheduleMode === 'workdays'
                            ? item.day >= 1 && item.day <= 5
                            : dailyScheduleMode === 'custom'
                            ? frequencyDays.includes(item.day)
                            : false;

                        return (
                          <button
                            key={item.day}
                            type="button"
                            onClick={() => toggleDailyCustomDay(item.day)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                                : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                            }`}
                            title={item.full}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {type === 'boolean' ? (
                  <div className="p-3 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 rounded-xl flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-200">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                      {dailyScheduleMode === 'all'
                        ? 'Disasarkan setiap hari (7 hari seminggu). Sasaran bulanan: 30 hari.'
                        : dailyScheduleMode === 'workdays'
                        ? 'Disasarkan hari bekerja sahaja (Isnin - Jumaat). Sasaran bulanan: ~22 hari.'
                        : `Disasarkan ${frequencyDays.length} hari seminggu. Sasaran bulanan: ~${calculatedMonthly} hari.`}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 h-8 flex items-end">
                          {dailyScheduleMode === 'all' ? 'Sasaran setiap hari' : 'Sasaran setiap hari terpilih'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={targetValue}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setTargetValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="1"
                          className="w-full h-10 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 h-8 flex items-end">
                          Unit ukuran
                        </label>
                        <input
                          type="text"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value.toLowerCase())}
                          placeholder="cth: prospek, kali"
                          className="w-full h-10 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                        />
                      </div>
                    </div>

                    {/* Unit Preset Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mr-1">Unit pantas:</span>
                      {UNIT_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setUnit(p)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                            unit.toLowerCase() === p.toLowerCase()
                              ? 'bg-blue-600 text-white border-blue-600 font-bold'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800/80 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                      💡 Sasaran keseluruhan sebulan: <span className="font-bold text-neutral-900 dark:text-white">~{calculatedMonthly} {unit || 'unit'}</span> (dikira {dailyScheduleMode === 'all' ? '7 hari seminggu' : dailyScheduleMode === 'workdays' ? '5 hari bekerja seminggu' : `${frequencyDays.length} hari seminggu`}).
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. If WEEKLY (RINGKAS & JELAS SEPERTI BULANAN — SATU SASARAN MINGGUAN SAHAJA) */}
            {frequency === 'weekly' && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 space-y-3">
                {type === 'boolean' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Sasaran bilangan kali seminggu
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWeeklyDaysCount(Math.max(1, (Number(weeklyDaysCount) || 2) - 1))}
                          className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-bold text-neutral-700 dark:text-neutral-200 flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-transform"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="7"
                          value={weeklyDaysCount}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setWeeklyDaysCount(
                              e.target.value === ''
                                ? ''
                                : Math.min(7, Math.max(1, parseInt(e.target.value) || 1))
                            )
                          }
                          className="w-20 h-9 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2 text-center text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setWeeklyDaysCount(Math.min(7, (Number(weeklyDaysCount) || 2) + 1))}
                          className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-bold text-neutral-700 dark:text-neutral-200 flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-transform"
                        >
                          +
                        </button>
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                          kali seminggu
                        </span>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mr-1">
                        Pilihan pantas:
                      </span>
                      {[1, 2, 3, 4, 5, 7].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setWeeklyDaysCount(cnt)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                            Number(weeklyDaysCount) === cnt
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {cnt} kali
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-amber-800 dark:text-amber-300/90 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                      💡 Sasaran: <span className="font-bold">{weeklyDaysCount || 2} kali seminggu</span>. Anda bebas tanda pada mana-mana hari dalam minggu tersebut sehingga mencapai sasaran mingguan.
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 px-1">
                      ℹ️ Jika mahu tetapkan hari khusus (cth: Hari bekerja Isnin–Jumaat sahaja), pilih kekerapan <span className="font-semibold text-neutral-700 dark:text-neutral-300">Harian</span>.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 h-8 flex items-end">
                          Sasaran jumlah seminggu
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={targetValue}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setTargetValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="5"
                          className="w-full h-10 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 h-8 flex items-end">
                          Unit ukuran
                        </label>
                        <input
                          type="text"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value.toLowerCase())}
                          placeholder="cth: kali, orang, prospek"
                          className="w-full h-10 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 lowercase"
                        />
                      </div>
                    </div>

                    {/* Unit Preset Chips for Weekly */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mr-1">Unit pantas:</span>
                      {UNIT_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setUnit(p)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                            unit.toLowerCase() === p.toLowerCase()
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Quick values for weekly numerical */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mr-1">Pilihan jumlah:</span>
                      {[2, 3, 5, 10, 20].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTargetValue(val)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            targetValue === val
                              ? 'bg-amber-500 text-white font-bold border-amber-500 shadow-sm'
                              : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-amber-800 dark:text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                      💡 Sasaran keseluruhan seminggu: <span className="font-bold">{targetValue || 5} {unit || 'kali'} seminggu</span>. Semasa tanda harian, anda hanya perlu catat jumlah yang dibuat pada hari tersebut (cth: 1 {unit || 'kali'}) sehingga mencapai sasaran seminggu.
                    </div>

                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800/80 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                      💡 Anggaran sasaran sebulan: <span className="font-bold text-neutral-900 dark:text-white">~{calculatedMonthly} {unit || 'unit'}</span> (dikira 4.3 minggu).
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* C. If MONTHLY (HANYA SATU INPUT SASARAN BULANAN YANG JELAS & RINGKAS!) */}
            {frequency === 'monthly' && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 space-y-3">
                {type === 'boolean' ? (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Sasaran bilangan hari / kali sebulan
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={monthlyCount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setMonthlyCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                        placeholder="5"
                        className="w-24 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-white font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                        kali / hari sebulan
                      </span>
                    </div>

                    {/* Quick Count Presets */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mr-1">Pilihan pantas:</span>
                      {[3, 5, 10, 15, 20].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setMonthlyCount(cnt)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            monthlyCount === cnt
                              ? 'bg-purple-600 text-white font-bold border-purple-600 shadow-sm'
                              : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {cnt}x
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-500/10 dark:bg-purple-500/15 p-2.5 rounded-xl border border-purple-500/30 mt-2.5">
                      💡 Sasaran: <span className="font-bold">{monthlyCount || 5} kali sebulan</span>. Anda hanya perlu klik kotak hari untuk tanda semak [✓] bila ia dilakukan, sehingga mencapai sasaran sebulan.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 h-8 flex items-end">
                          Sasaran jumlah sebulan
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={targetValue}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setTargetValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="5"
                          className="w-full h-10 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 h-8 flex items-end">
                          Unit ukuran
                        </label>
                        <input
                          type="text"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value.toLowerCase())}
                          placeholder="cth: prospek, kes, kali"
                          className="w-full h-10 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 lowercase"
                        />
                      </div>
                    </div>

                    {/* Unit Preset Chips for Monthly */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mr-1">Unit pantas:</span>
                      {UNIT_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setUnit(p)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                            unit.toLowerCase() === p.toLowerCase()
                              ? 'bg-purple-600 text-white border-purple-600 font-bold'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Quick values for monthly numerical */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mr-1">Pilihan jumlah:</span>
                      {[3, 5, 10, 20, 50].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTargetValue(val)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            targetValue === val
                              ? 'bg-purple-600 text-white font-bold border-purple-600 shadow-sm'
                              : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-500/10 dark:bg-purple-500/15 p-2.5 rounded-xl border border-purple-500/30">
                      💡 Sasaran keseluruhan sebulan: <span className="font-bold">{targetValue || 5} {unit || 'kali'}</span>. Semasa tanda harian, anda hanya perlu catat kemajuan yang dilakukan pada hari tersebut (cth: 1 kali), bukan paksaan siap 5 kali sehari.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ADVANCED MONTHLY TARGET OVERRIDE (PILIHAN LANJUTAN - BOLEH DIBUKA JIKA PERLU SAHAJA) */}
            {frequency !== 'monthly' && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60">
                <button
                  type="button"
                  onClick={() => setShowAdvancedMonthly(!showAdvancedMonthly)}
                  className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1.5 font-medium transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Ubahsuai sasaran bulanan tersuai (Pilihan)</span>
                  {showAdvancedMonthly ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                </button>

                {showAdvancedMonthly && (
                  <div className="mt-2.5 p-3 bg-white dark:bg-neutral-800/90 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                    <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                      Sasaran Penuh 1 Bulan ({type === 'numerical' ? unit || 'unit' : 'hari'}):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder={`Automatik (${calculatedMonthly})`}
                        value={customMonthlyTarget}
                        onChange={(e) => setCustomMonthlyTarget(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {customMonthlyTarget !== '' && (
                        <button
                          type="button"
                          onClick={() => setCustomMonthlyTarget('')}
                          className="text-[11px] text-blue-600 dark:text-blue-400 underline shrink-0 px-1"
                        >
                          Auto ({calculatedMonthly})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Soalan Peringatan (Optional) */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Soalan Peringatan (Pilihan)
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="cth: Adakah anda telah membuat posting hari ini?"
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-colors"
            />
          </div>

          {/* 6. Color Picker */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
              Warna Tema Tabiat
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-neutral-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-neutral-900' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions - Sticky Footer so "Simpan" is ALWAYS visible regardless of scroll position */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 pt-3 pb-1 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 px-5 sm:px-6 flex items-center justify-end gap-3 shrink-0 z-20 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{initialHabit ? 'Simpan Perubahan' : 'Cipta Tabiat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

