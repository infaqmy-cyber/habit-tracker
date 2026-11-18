import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  Flame,
  Award,
  ChevronDown,
  CheckCircle2,
  X,
  Plus,
  BarChart3,
  CalendarRange,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Habit, HabitLog } from '../types';
import { ScoreRing } from './ScoreRing';
import {
  calculateHabitStats,
  getCalendarHeatmapMatrix,
  getWeeklyScoreHistory,
  getMonthlyHistory,
} from '../utils/habitStats';
import { formatDateKey, formatNiceDate } from '../utils/dateUtils';

interface HabitDetailModalProps {
  habit: Habit;
  logs: Record<string, HabitLog>;
  onClose: () => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onToggleDate: (habit: Habit, dateKey: string, currentStatus: 'completed' | 'skipped' | 'none') => void;
  isReadOnly?: boolean;
}

export const HabitDetailModal: React.FC<HabitDetailModalProps> = ({
  habit,
  logs,
  onClose,
  onEditHabit,
  onDeleteHabit,
  onToggleDate,
  isReadOnly = false,
}) => {
  const [scoreTimeframe, setScoreTimeframe] = useState<'week' | 'month'>('week');
  const [historyTimeframe, setHistoryTimeframe] = useState<'week' | 'month'>('week');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const stats = calculateHabitStats(habit, logs);
  const weeklyScores = getWeeklyScoreHistory(logs);
  const monthlyHistory = getMonthlyHistory(logs);
  const heatmapWeeks = getCalendarHeatmapMatrix(logs, 18);

  // Peratusan sebenar berdasarkan sasaran tahunan (pengangka: annualActual, pembawah: annualTarget)
  const annualRate = stats.annualTarget > 0
    ? ((stats.annualActual / stats.annualTarget) * 100)
    : 0;
  const formattedAnnualRate =
    annualRate === 0
      ? '0%'
      : annualRate < 1
      ? `${annualRate.toFixed(1)}%`
      : `${Math.min(100, Math.round(annualRate))}%`;

  // Weekly achievement in current month using recharts
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentMonthName = now.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const weekRanges = [
    { name: 'M1 (1-7)', start: 1, end: 7 },
    { name: 'M2 (8-14)', start: 8, end: 14 },
    { name: 'M3 (15-21)', start: 15, end: 21 },
    { name: 'M4 (22-28)', start: 22, end: 28 },
    ...(daysInCurrentMonth > 28
      ? [{ name: `M5 (29-${daysInCurrentMonth})`, start: 29, end: daysInCurrentMonth }]
      : []),
  ];

  let totalMonthActual = 0;

  const currentMonthWeeklyChartData = weekRanges.map((w) => {
    let weekCompletedDays = 0;
    let weekTotalValue = 0;

    for (let d = w.start; d <= w.end; d++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = logs[dateKey];
      if (log?.completed) {
        weekCompletedDays++;
      }
      if (log?.value) {
        weekTotalValue += log.value;
      }
    }

    const isNumerical = habit.type === 'numerical';
    const actual = isNumerical ? weekTotalValue : weekCompletedDays;
    totalMonthActual += actual;

    // Weekly target calculation
    const daysInWeek = w.end - w.start + 1;
    let weeklyTarget = isNumerical
      ? (habit.frequency === 'monthly'
          ? Math.max(1, Math.round(((habit.monthlyTarget || habit.monthlyTargetCount || habit.targetValue || 1) / daysInCurrentMonth) * daysInWeek))
          : habit.frequency === 'weekly'
          ? (daysInWeek === 7 ? (habit.targetValue || 1) : Math.max(1, Math.round(((habit.targetValue || 1) / 7) * daysInWeek)))
          : habit.monthlyTarget
          ? Math.round((habit.monthlyTarget / daysInCurrentMonth) * daysInWeek)
          : (habit.targetValue || 1) * daysInWeek)
      : (habit.frequency === 'monthly'
          ? Math.max(1, Math.round(((habit.monthlyTarget || habit.monthlyTargetCount || habit.targetValue || 1) / daysInCurrentMonth) * daysInWeek))
          : habit.frequency === 'weekly'
          ? (habit.weeklyDaysCount || (habit.weeklySchedule === 'workdays' ? 5 : habit.frequencyDays?.length || 2))
          : habit.monthlyTarget
          ? Math.min(daysInWeek, Math.round((habit.monthlyTarget / daysInCurrentMonth) * daysInWeek))
          : daysInWeek);

    if (weeklyTarget <= 0) weeklyTarget = 1;

    const rate = Math.min(100, Math.round((actual / weeklyTarget) * 100));
    const isCurrentWeek = now.getDate() >= w.start && now.getDate() <= w.end;

    return {
      minggu: w.name,
      pencapaian: actual,
      sasaran: weeklyTarget,
      peratus: rate,
      isCurrentWeek,
    };
  });

  const monthTargetTotal =
    habit.frequency === 'monthly'
      ? (habit.monthlyTarget || habit.monthlyTargetCount || habit.targetValue || 1)
      : habit.monthlyTarget ||
        (habit.frequency === 'weekly'
          ? Math.round(
              (habit.type === 'numerical'
                ? (habit.targetValue || 1)
                : (habit.weeklyDaysCount || (habit.weeklySchedule === 'workdays' ? 5 : habit.frequencyDays?.length || 2))) *
                4.3
            )
          : habit.type === 'numerical'
          ? (habit.targetValue || 1) * daysInCurrentMonth
          : daysInCurrentMonth);
  const monthProgressRate = Math.min(100, Math.round((totalMonthActual / (monthTargetTotal || 1)) * 100));

  const dayNamesShort = ['Ahad', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-0 sm:p-4 md:p-6 animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-screen sm:max-h-[92vh] transition-colors">
        {/* Top Header Bar styled with habit color */}
        <div
          className="p-4 sm:p-5 flex items-center justify-between text-white transition-colors"
          style={{ backgroundColor: habit.color }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/20 transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{habit.name}</h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/25 text-white border border-white/30 backdrop-blur-sm shadow-sm">
                  {habit.frequency === 'weekly' ? '🗓️ Tabiat Mingguan' : habit.frequency === 'monthly' ? '📅 Tabiat Bulanan' : '⏰ Tabiat Harian'}
                </span>
                {habit.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                    {habit.category}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/90 flex items-center flex-wrap gap-1.5 mt-0.5">
                <span>
                  {habit.frequency === 'weekly'
                    ? habit.type === 'numerical'
                      ? `${habit.targetValue || 1} ${habit.unit || 'kali'} seminggu`
                      : `${
                          habit.weeklyDaysCount ||
                          (habit.weeklySchedule === 'workdays'
                            ? 5
                            : habit.weeklySchedule === 'custom' && habit.frequencyDays?.length
                            ? habit.frequencyDays.length
                            : habit.weeklySchedule === 'all'
                            ? 7
                            : 2)
                        } kali seminggu`
                    : habit.frequency === 'monthly'
                    ? `${habit.monthlyTarget || habit.monthlyTargetCount || habit.targetValue || 1} ${habit.type === 'numerical' ? (habit.unit || 'kali') : 'kali'} sebulan`
                    : `${habit.type === 'numerical' ? (habit.targetValue || 1) : 1} ${habit.type === 'numerical' ? (habit.unit || 'kali') : 'kali'} ${
                        habit.frequencyDays && habit.frequencyDays.length === 5 && !habit.frequencyDays.includes(0) && !habit.frequencyDays.includes(6)
                          ? '(Hari bekerja)'
                          : habit.frequencyDays && habit.frequencyDays.length < 7
                          ? `(${habit.frequencyDays.length} hari seminggu)`
                          : 'sehari'
                      }`}
                </span>
                {habit.frequency !== 'monthly' && habit.monthlyTarget && (
                  <>
                    <span>•</span>
                    <span className="font-semibold bg-white/20 px-2 py-0.5 rounded-md">
                      {habit.monthlyTarget} {habit.type === 'numerical' ? habit.unit || 'unit' : 'hari'} sebulan
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditHabit(habit)}
                className="p-2 rounded-full hover:bg-black/20 transition-colors"
                title="Sunting Tabiat"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-full hover:bg-black/20 transition-colors"
                title="Padam Tabiat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Alert */}
        {showDeleteConfirm && (
          <div className="bg-red-500/10 border-b border-red-500/30 p-3 px-5 flex items-center justify-between text-xs text-red-600 dark:text-red-300">
            <span>Adakah anda pasti mahu memadam tabiat "{habit.name}"? Semua rekod akan dipadamkan.</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDeleteHabit(habit.id)}
                className="bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded font-bold"
              >
                Ya, Padam
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white px-2 py-1"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 text-neutral-800 dark:text-neutral-200">
          {/* Question banner */}
          {habit.question && (
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400 block text-xs uppercase tracking-wider mb-0.5">Soalan Harian:</span>
              "{habit.question}"
            </div>
          )}

          {/* 1. Overview Section */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 transition-colors">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
              PRESTASI KESELURUHAN
            </div>

            <div className="grid grid-cols-4 gap-2 items-start text-center">
              <div className="flex flex-col items-center">
                <ScoreRing score={stats.scorePercent} color={habit.color} size={54} strokeWidth={5} showText />
                <span className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium leading-tight text-center">
                  skor tabiat bulanan
                </span>
              </div>
              <div>
                <div className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.scoreMonthChange >= 0 ? `+${stats.scoreMonthChange}%` : `${stats.scoreMonthChange}%`}
                </div>
                <div className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-tight text-center">
                  bulan ini berbanding bulan lepas
                </div>
              </div>
              <div title={`Kiraan: ${stats.annualActual} / ${stats.annualTarget} × 100% = ${annualRate.toFixed(2)}%`}>
                <div className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formattedAnnualRate}
                </div>
                <div className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-tight text-center">
                  sepanjang setahun
                </div>
                {stats.annualTarget > 0 && (
                  <div className="text-[9px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium leading-tight">
                    ({stats.annualActual} / {stats.annualTarget} {habit.unit || (habit.type === 'boolean' ? 'hari' : 'kali')})
                  </div>
                )}
              </div>
              <div>
                <div className="text-base sm:text-xl font-bold text-neutral-900 dark:text-white">
                  {stats.totalCompletions}
                </div>
                <div className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-tight text-center">
                  jumlah selesai
                </div>
              </div>
            </div>
          </div>

          {/* 2. RECHARTS BAR CHART: Progres Pencapaian Mengikut Minggu dalam Bulan Semasa */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Progres Mingguan Bulan Ini ({currentMonthName})
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                  Pencapaian {habit.type === 'numerical' ? habit.unit || 'unit' : 'hari selesai'} bagi setiap minggu
                </span>
              </div>

              {/* Monthly progress summary badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-white dark:bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="text-right">
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">
                    {totalMonthActual} / {monthTargetTotal} <span className="text-[10px] font-normal text-neutral-500">{habit.type === 'numerical' ? habit.unit || 'unit' : 'hari'}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 font-medium">
                    {monthProgressRate}% Sasaran Bulan
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400">
                  {monthProgressRate}%
                </div>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentMonthWeeklyChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888825" vertical={false} />
                  <XAxis
                    dataKey="minggu"
                    tick={{ fill: '#888888', fontSize: 11 }}
                    axisLine={{ stroke: '#88888840' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#888888', fontSize: 11 }}
                    axisLine={{ stroke: '#88888840' }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-neutral-900 text-white border border-neutral-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-blue-400 border-b border-neutral-800 pb-1">
                              {data.minggu} {data.isCurrentWeek && '• Minggu Ini'}
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-neutral-400">Pencapaian:</span>
                              <span className="font-bold text-emerald-400">
                                {data.pencapaian} {habit.type === 'numerical' ? habit.unit || 'unit' : 'hari'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-neutral-400">Sasaran:</span>
                              <span className="font-semibold text-neutral-300">
                                {data.sasaran} {habit.type === 'numerical' ? habit.unit || 'unit' : 'hari'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-neutral-800">
                              <span className="text-neutral-400">Kadar Pencapaian:</span>
                              <span className="font-bold text-blue-400">{data.peratus}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="pencapaian"
                    name="Pencapaian"
                    radius={[6, 6, 0, 0]}
                    fill={habit.color}
                  >
                    {currentMonthWeeklyChartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.isCurrentWeek ? habit.color : `${habit.color}dd`}
                        stroke={entry.isCurrentWeek ? '#3b82f6' : undefined}
                        strokeWidth={entry.isCurrentWeek ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Weekly detail pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              {currentMonthWeeklyChartData.map((w, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    w.isCurrentWeek
                      ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
                      : 'bg-white/80 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                    {w.minggu} {w.isCurrentWeek && '• Kini'}
                  </div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white mt-0.5">
                    {w.pencapaian} / {w.sasaran}
                  </div>
                  <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    {w.peratus}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Score Progression Line Chart */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Skor (Score)</span>
              <div className="text-xs text-neutral-400 bg-neutral-800 px-2 py-1 rounded-lg border border-neutral-700">
                12 Minggu Terakhir
              </div>
            </div>

            {/* SVG Line Chart */}
            <div className="h-44 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 140" preserveAspectRatio="none">
                {/* Horizontal grid lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 130 - (val / 100) * 110;
                  return (
                    <g key={val}>
                      <line x1="30" y1={y} x2="490" y2={y} stroke="#333" strokeDasharray="3 3" strokeWidth="0.8" />
                      <text x="5" y={y + 3} fill="#666" fontSize="9" textAnchor="start">
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Score Line */}
                {(() => {
                  const points = weeklyScores.map((pt, idx) => {
                    const x = 35 + (idx / Math.max(1, weeklyScores.length - 1)) * 445;
                    const y = 130 - (pt.score / 100) * 110;
                    return { x, y, score: pt.score, label: pt.label };
                  });

                  if (points.length < 2) return null;

                  const pathD = points.reduce((acc, pt, idx) => {
                    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
                  }, '');

                  return (
                    <>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={habit.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill={habit.color}
                          stroke="#171717"
                          strokeWidth="2"
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* Bottom labels */}
              <div className="flex justify-between pl-8 pr-2 mt-1 text-[10px] text-neutral-500">
                {weeklyScores.filter((_, i) => i % 3 === 0).map((pt, i) => (
                  <span key={i}>{pt.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. History Bar Chart */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Sejarah Kekerapan (History)</span>
              <div className="flex items-center gap-1 bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs">
                <button
                  onClick={() => setHistoryTimeframe('week')}
                  className={`px-2 py-0.5 rounded ${
                    historyTimeframe === 'week' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-medium shadow-sm' : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Mingguan
                </button>
                <button
                  onClick={() => setHistoryTimeframe('month')}
                  className={`px-2 py-0.5 rounded ${
                    historyTimeframe === 'month' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-medium shadow-sm' : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Bulanan
                </button>
              </div>
            </div>

            {/* Bar chart */}
            <div className="h-36 flex items-end justify-between gap-1.5 pt-6 pb-2 px-2">
              {historyTimeframe === 'week'
                ? weeklyScores.map((item, idx) => {
                    const heightPercent = Math.min(100, Math.max(8, (item.count / 7) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group">
                        <span className="text-[10px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-bold">
                          {item.count}
                        </span>
                        <div
                          className="w-full max-w-[18px] rounded-t-md transition-all duration-300"
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: item.count > 0 ? habit.color : '#333',
                          }}
                        />
                        <span className="text-[9px] text-neutral-500 mt-1 truncate max-w-[28px]">
                          {item.label.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })
                : monthlyHistory.map((item, idx) => {
                    const maxCount = Math.max(...monthlyHistory.map(m => m.count), 1);
                    const heightPercent = Math.min(100, Math.max(8, (item.count / maxCount) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group">
                        <span className="text-[10px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-bold">
                          {item.count}
                        </span>
                        <div
                          className="w-full max-w-[18px] rounded-t-md transition-all duration-300"
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: item.count > 0 ? habit.color : '#333',
                          }}
                        />
                        <span className="text-[9px] text-neutral-500 mt-1 truncate max-w-[28px]">
                          {item.monthName}
                        </span>
                      </div>
                    );
                  })}
            </div>
          </div>

          {/* 4. Calendar Heatmap (Like Loop Screenshot 4 & 5) */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Kalendar Tabiat (Heatmap)</span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Tekan mana-mana kotak untuk tandakan</span>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="inline-block min-w-[500px]">
                {/* Month labels */}
                <div className="flex ml-8 mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                  {heatmapWeeks.map((week, idx) => (
                    <div key={idx} className="w-6 text-center">
                      {week.monthLabel ? week.monthLabel : ''}
                    </div>
                  ))}
                </div>

                {/* Grid rows for 7 days */}
                <div className="space-y-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => (
                    <div key={dayOfWeek} className="flex items-center gap-1">
                      <span className="w-7 text-[10px] text-neutral-500 font-medium">
                        {['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'][dayOfWeek]}
                      </span>
                      <div className="flex items-center gap-1">
                        {heatmapWeeks.map((week) => {
                          const dayObj = week.days.find(d => d.dayOfWeek === dayOfWeek);
                          if (!dayObj) return <div key={week.weekIndex} className="w-5 h-5" />;

                          const isDone = dayObj.completed;
                          const isFuture = dayObj.isFuture;

                          return (
                            <button
                              key={dayObj.dateKey}
                              disabled={isFuture || isReadOnly}
                              onClick={() => {
                                if (isReadOnly) return;
                                const current = isDone ? 'completed' : 'none';
                                onToggleDate(habit, dayObj.dateKey, current);
                              }}
                              className={`w-5 h-5 rounded-md text-[9px] font-bold flex items-center justify-center transition-all ${
                                isFuture
                                  ? 'opacity-20 cursor-not-allowed bg-neutral-200 dark:bg-neutral-800'
                                  : isReadOnly
                                  ? isDone
                                    ? 'text-white cursor-default shadow-sm'
                                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-500 cursor-default'
                                  : isDone
                                  ? 'text-white shadow-sm'
                                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-500 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                              } ${dayObj.isToday ? 'ring-1 ring-blue-500' : ''}`}
                              style={{
                                backgroundColor: isDone ? habit.color : undefined,
                              }}
                              title={`${dayObj.dateKey} (${isDone ? 'Selesai' : 'Belum selesai'})`}
                            >
                              {dayObj.dayNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Best Streaks Ranking (Loop Screenshot 5 & 7) */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                Rekod Streak Terbaik (Best Streaks)
              </span>
              <span className="text-xs font-bold text-amber-500">
                Semasa: {stats.streakInfo.currentStreak} Hari
              </span>
            </div>

            {stats.streakInfo.streaksList.length === 0 ? (
              <div className="text-xs text-neutral-500 text-center py-4">
                Belum ada rekod streak berterusan. Mulakan tandakan setiap hari!
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.streakInfo.streaksList.map((streak, idx) => {
                  const maxStreak = Math.max(stats.streakInfo.bestStreak, 1);
                  const widthPercent = Math.max(15, Math.min(100, (streak.count / maxStreak) * 100));
                  const isTopStreak = idx === 0;

                  return (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[11px] text-neutral-500 w-24 truncate text-right">
                        {formatNiceDate(streak.start)}
                      </span>

                      {/* Bar */}
                      <div className="flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-lg h-6 overflow-hidden flex items-center">
                        <div
                          className="h-full flex items-center justify-center font-bold text-white text-xs px-2 rounded-lg transition-all"
                          style={{
                            width: `${widthPercent}%`,
                            backgroundColor: isTopStreak ? habit.color : '#525252',
                          }}
                        >
                          {streak.count}
                        </div>
                      </div>

                      <span className="text-[11px] text-neutral-500 w-24 truncate text-left">
                        {formatNiceDate(streak.end)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Frequency by Day of Week */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 transition-colors">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 block mb-4">
              Kekerapan Hari Dalam Seminggu (Frequency)
            </span>

            <div className="flex items-center justify-between px-2 sm:px-6">
              {dayNamesShort.map((dayName, idx) => {
                const total = stats.dayOfWeekTotals[idx] || 1;
                const count = stats.dayOfWeekCounts[idx] || 0;
                const rate = Math.round((count / total) * 100);
                const dotSize = Math.max(6, Math.min(22, Math.round((rate / 100) * 22)));

                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="h-7 flex items-center justify-center">
                      <div
                        className="rounded-full transition-all"
                        style={{
                          width: `${dotSize}px`,
                          height: `${dotSize}px`,
                          backgroundColor: rate > 0 ? habit.color : '#404040',
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-neutral-400">{dayName}</span>
                    <span className="text-[10px] text-neutral-500">{rate}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
