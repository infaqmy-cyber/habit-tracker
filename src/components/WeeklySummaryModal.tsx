import React from 'react';
import {
  X,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  BarChart3,
  Flame,
  ArrowUpRight,
  Check,
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
import { formatDateKey } from '../utils/dateUtils';
import { ScoreRing } from './ScoreRing';
import { useTheme } from '../context/ThemeContext';

interface WeeklySummaryModalProps {
  habits: Habit[];
  logs: Record<string, HabitLog>;
  onClose: () => void;
  onSelectHabit?: (habit: Habit) => void;
}

export const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({
  habits,
  logs,
  onClose,
  onSelectHabit,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Compute the past 7 days ending today
  const today = new Date();
  const past7Days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    past7Days.push(d);
  }

  const malayDays = ['AHD', 'ISN', 'SEL', 'RAB', 'KHA', 'JUM', 'SAB'];

  // Calculate day-by-day stats
  const dailyBreakdown = past7Days.map((date) => {
    const dateKey = formatDateKey(date);
    const dayName = malayDays[date.getDay()];
    const dayNum = date.getDate();
    const isToday = dateKey === formatDateKey(today);

    let completedCount = 0;
    habits.forEach((habit) => {
      const log = logs[`${habit.id}_${dateKey}`];
      if (log?.completed) {
        completedCount++;
      }
    });

    const totalHabits = habits.length;
    const rate = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

    return {
      dateKey,
      dayLabel: `${dayName} ${dayNum}`,
      dayName,
      dayNum,
      isToday,
      completed: completedCount,
      total: totalHabits,
      rate,
    };
  });

  // Calculate habit-by-habit stats for past 7 days
  const habitStats = habits.map((habit) => {
    let completedDays = 0;
    let totalNumericalValue = 0;
    const dayHistory: { dateKey: string; isDone: boolean; value: number }[] = [];

    past7Days.forEach((date) => {
      const dateKey = formatDateKey(date);
      const log = logs[`${habit.id}_${dateKey}`];
      const isDone = !!log?.completed;
      const val = log?.value || 0;

      if (isDone) completedDays++;
      totalNumericalValue += val;

      dayHistory.push({ dateKey, isDone, value: val });
    });

    const expectedDaysInWeek =
      habit.frequency === 'monthly'
        ? Math.max(1, Math.round(((habit.monthlyTarget || habit.monthlyTargetCount || habit.targetValue || 5) / 30) * 7))
        : habit.frequency === 'weekly'
        ? (habit.type === 'numerical'
            ? (habit.targetValue || 1)
            : (habit.weeklyDaysCount || (habit.weeklySchedule === 'workdays' ? 5 : habit.frequencyDays?.length || 2)))
        : habit.frequency === 'daily' && habit.frequencyDays?.length
        ? habit.frequencyDays.length
        : 7;

    const completionRate =
      habit.frequency === 'weekly' && habit.type === 'numerical'
        ? Math.min(100, Math.round((totalNumericalValue / Math.max(1, expectedDaysInWeek)) * 100))
        : Math.min(100, Math.round((completedDays / Math.max(1, expectedDaysInWeek)) * 100));

    let statusLabel = 'Perlu Perhatian';
    let statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (completionRate >= 80) {
      statusLabel = 'Cemerlang';
      statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (completionRate >= 50) {
      statusLabel = 'Baik';
      statusColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }

    return {
      habit,
      completedDays,
      totalNumericalValue,
      expectedDaysInWeek,
      completionRate,
      statusLabel,
      statusColor,
      dayHistory,
    };
  });

  // Sort by completion rate descending
  habitStats.sort((a, b) => b.completionRate - a.completionRate);

  // Overall KPIs
  const totalPossibleChecks = habits.length * 7;
  const totalCompletedChecks = habitStats.reduce((acc, h) => acc + h.completedDays, 0);
  const overallCompletionRate =
    totalPossibleChecks > 0 ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100) : 0;

  // Best day out of 7
  let bestDay = dailyBreakdown[0];
  dailyBreakdown.forEach((d) => {
    if (d.completed > (bestDay?.completed || 0)) {
      bestDay = d;
    }
  });

  // Most consistent habit
  const topHabit = habitStats[0];

  const startDateStr = past7Days[0].toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
  const endDateStr = past7Days[6].toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      <div
        className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors border ${
          isLight ? 'bg-white border-neutral-200 text-neutral-900' : 'bg-neutral-900 border-neutral-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 sm:px-6 py-4 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-500 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Rumusan Mingguan (7 Hari)
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/20">
                  7 Hari Terkini
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {startDateStr} – {endDateStr} • Analisis peratusan pencapaian tabiat anda
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isLight ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* KPI 1: Overall Completion Rate */}
            <div
              className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between ${
                isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-800/60 border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Kadar Kejayaan
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-500">
                  {overallCompletionRate}%
                </span>
              </div>
              <span className={`text-[10px] mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {totalCompletedChecks} / {totalPossibleChecks} sesi selesai
              </span>
            </div>

            {/* KPI 2: Total Completed */}
            <div
              className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between ${
                isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-800/60 border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Jumlah Selesai
                </span>
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-500">
                  {totalCompletedChecks}
                </span>
                <span className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>kali</span>
              </div>
              <span className={`text-[10px] mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Dalam 7 hari terakhir
              </span>
            </div>

            {/* KPI 3: Best Day */}
            <div
              className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between ${
                isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-800/60 border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Hari Terbaik
                </span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-amber-500 truncate">
                  {bestDay ? bestDay.dayLabel : '-'}
                </span>
              </div>
              <span className={`text-[10px] mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {bestDay?.completed || 0} tabiat berjaya ({bestDay?.rate || 0}%)
              </span>
            </div>

            {/* KPI 4: Top Habit */}
            <div
              className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between ${
                isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-800/60 border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Paling Konsisten
                </span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className="text-sm sm:text-base font-extrabold truncate max-w-[130px]"
                  style={{ color: topHabit?.habit.color || '#3b82f6' }}
                >
                  {topHabit ? topHabit.habit.name : 'Tiada'}
                </span>
              </div>
              <span className={`text-[10px] mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {topHabit ? `${topHabit.completedDays}/7 hari (${topHabit.completionRate}%)` : '-'}
              </span>
            </div>
          </div>

          {/* 7-Day Completion Rate Chart (Recharts) */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
              isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-800/60 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Kadar Kejayaan Harian (7 Hari Lalu)
                </span>
                <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Peratusan tabiat yang berjaya diselesaikan setiap hari
                </span>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBreakdown} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fill: isLight ? '#525252' : '#a3a3a3', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#88888830' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: isLight ? '#525252' : '#a3a3a3', fontSize: 10 }}
                    axisLine={{ stroke: '#88888830' }}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-neutral-900 text-white border border-neutral-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-blue-400 border-b border-neutral-800 pb-1">
                              {data.dayLabel} {data.isToday && '• Hari Ini'}
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-neutral-400">Kadar Kejayaan:</span>
                              <span className="font-bold text-emerald-400">{data.rate}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-neutral-400">Tabiat Selesai:</span>
                              <span className="font-semibold text-white">
                                {data.completed} / {data.total} tabiat
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="rate" name="Kadar (%)" radius={[6, 6, 0, 0]}>
                    {dailyBreakdown.map((entry, idx) => {
                      const fill = entry.isToday
                        ? '#3b82f6'
                        : entry.rate >= 80
                        ? '#10b981'
                        : entry.rate >= 50
                        ? '#60a5fa'
                        : '#f59e0b';
                      return <Cell key={`cell-${idx}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Habit-by-habit Performance Breakdown */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
              isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-800/60 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
                  Prestasi Mengikut Tabiat (Past 7 Days)
                </span>
                <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Pecahan pencapaian setiap tabiat bagi 7 hari terakhir
                </span>
              </div>
              <span className="text-xs font-bold text-blue-500">
                {habits.length} Tabiat
              </span>
            </div>

            <div className="space-y-2.5">
              {habitStats.map((item) => (
                <div
                  key={item.habit.id}
                  onClick={() => {
                    if (onSelectHabit) {
                      onClose();
                      onSelectHabit(item.habit);
                    }
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.008] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLight
                      ? 'bg-white hover:bg-neutral-100 border-neutral-200 shadow-sm'
                      : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800'
                  }`}
                >
                  {/* Left: Habit Info & Category */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.habit.color }}
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm truncate" style={{ color: item.habit.color }}>
                          {item.habit.name}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          item.habit.frequency === 'weekly'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : item.habit.frequency === 'monthly'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        }`}>
                          {item.habit.frequency === 'weekly' ? 'Mingguan' : item.habit.frequency === 'monthly' ? 'Bulanan' : 'Harian'}
                        </span>
                        {item.habit.category && (
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                              isLight
                                ? 'bg-neutral-100 text-neutral-600 border-neutral-300'
                                : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                            }`}
                          >
                            {item.habit.category}
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        {item.habit.type === 'numerical'
                          ? `Jumlah 7 Hari: ${item.totalNumericalValue} ${item.habit.unit || 'unit'}`
                          : `Berjaya ${item.completedDays} daripada 7 hari`}
                      </div>
                    </div>
                  </div>

                  {/* Middle: 7-day mini matrix */}
                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    {item.dayHistory.map((day, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                          day.isDone
                            ? 'text-white shadow-sm'
                            : isLight
                            ? 'bg-neutral-200 text-neutral-400'
                            : 'bg-neutral-800 text-neutral-600'
                        }`}
                        style={{
                          backgroundColor: day.isDone ? item.habit.color : undefined,
                        }}
                        title={`${dailyBreakdown[i]?.dayLabel}: ${day.isDone ? 'Selesai' : 'Belum'}`}
                      >
                        {day.isDone ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <span className="text-[9px]">•</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right: Rate & Status badge */}
                  <div className="flex items-center gap-2.5 justify-between sm:justify-end shrink-0">
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        {item.completionRate}%
                      </span>
                      <span className={`text-[10px] block ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        {item.habit.frequency === 'weekly' && item.habit.type === 'numerical'
                          ? `${item.totalNumericalValue}/${item.expectedDaysInWeek} ${item.habit.unit || 'kali'}`
                          : item.habit.frequency === 'weekly'
                          ? `${item.completedDays}/${item.expectedDaysInWeek} kali`
                          : `${item.completedDays}/${item.expectedDaysInWeek} hari`}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${item.statusColor}`}
                    >
                      {item.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivational Insight Banner */}
          <div className="bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs text-neutral-300 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Analisis Momentum Disiplin</span>
              {overallCompletionRate >= 80 ? (
                <span>Kecemerlangan luar biasa! Anda telah mencapai kadar kejayaan {overallCompletionRate}% sepanjang 7 hari ini. Teruskan konsistensi untuk membina tabiat kekal.</span>
              ) : overallCompletionRate >= 50 ? (
                <span>Kemajuan yang memberangsangkan pada {overallCompletionRate}%. Tingkatkan fokus pada tabiat yang masih di bawah 50% untuk mencapai matlamat mingguan penuh.</span>
              ) : (
                <span>Setiap hari adalah peluang baharu. Ambil langkah kecil hari ini dan lengkapkan sekurang-kurangnya 1–2 tabiat utama untuk membina semula momentum anda!</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3.5 border-t flex items-center justify-end shrink-0 transition-colors ${
            isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 active:scale-95"
          >
            Tutup Rumusan
          </button>
        </div>
      </div>
    </div>
  );
};
