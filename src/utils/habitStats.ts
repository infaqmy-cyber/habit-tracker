import { Habit, HabitLog, StreakInfo } from '../types';
import { formatDateKey, parseDateKey } from './dateUtils';

export function calculateHabitStats(habit: Habit, logs: Record<string, HabitLog>) {
  const today = new Date();
  const sortedDates: string[] = Object.keys(logs)
    .filter(k => logs[k].completed && (logs[k].value > 0 || logs[k].completed))
    .sort();

  const totalCompletions = sortedDates.length;

  // Calculate 30 days and 365 days rates
  let last30DaysCount = 0;
  let prev30DaysCount = 0;
  for (let i = 0; i < 30; i++) {
    const d1 = new Date(today);
    d1.setDate(today.getDate() - i);
    const k1 = formatDateKey(d1);
    if (logs[k1]?.completed) last30DaysCount++;

    const d2 = new Date(today);
    d2.setDate(today.getDate() - (i + 30));
    const k2 = formatDateKey(d2);
    if (logs[k2]?.completed) prev30DaysCount++;
  }

  const scoreMonthChange = prev30DaysCount > 0
    ? Math.round(((last30DaysCount - prev30DaysCount) / Math.max(1, prev30DaysCount)) * 100)
    : last30DaysCount > 0 ? 100 : 0;

  // Overall Score (0 - 100%)
  let scorePercent = 0;

  if (habit.frequency === 'monthly') {
    // For monthly habits: calculate score based on monthly target tally
    const target = habit.monthlyTarget || habit.monthlyTargetCount || habit.targetValue || 1;
    let actualMonthValue = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = formatDateKey(d);
      const log = logs[k];
      if (log?.completed) {
        actualMonthValue += habit.type === 'numerical' ? (log.value || 0) : 1;
      }
    }
    scorePercent = Math.min(100, Math.round((actualMonthValue / Math.max(1, target)) * 100));
  } else if (habit.frequency === 'weekly') {
    if (habit.type === 'numerical') {
      const weeklyGoal = habit.targetValue || 1;
      const target = habit.monthlyTarget || Math.max(1, Math.round(weeklyGoal * 4.3));
      let actualMonthValue = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const k = formatDateKey(d);
        const log = logs[k];
        if (log?.completed) {
          actualMonthValue += log.value || 0;
        }
      }
      scorePercent = Math.min(100, Math.round((actualMonthValue / Math.max(1, target)) * 100));
    } else {
      const weeklyCount =
        habit.weeklyDaysCount ||
        (habit.weeklySchedule === 'workdays'
          ? 5
          : habit.weeklySchedule === 'custom' && habit.frequencyDays?.length
          ? habit.frequencyDays.length
          : 2);
      const target = habit.monthlyTarget || Math.max(1, Math.round(weeklyCount * 4.3));
      scorePercent = Math.min(100, Math.round((last30DaysCount / Math.max(1, target)) * 100));
    }
  } else {
    // Standard weighted calculation for daily habits
    const recentDays = 60;
    let weightedScore = 0;
    let totalWeight = 0;
    for (let i = 0; i < recentDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = formatDateKey(d);
      const weight = Math.exp(-i / 20); // exponential decay like Loop Habit Tracker
      totalWeight += weight;
      if (logs[k]?.completed) {
        weightedScore += weight;
      }
    }
    scorePercent = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  }

  // Streaks calculation
  const streakInfo = calculateStreaks(logs);

  // Day of week distribution (0 = Sun, 1 = Mon ... 6 = Sat)
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayOfWeekTotals = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const day = d.getDay();
    dayOfWeekTotals[day]++;
    const k = formatDateKey(d);
    if (logs[k]?.completed) {
      dayOfWeekCounts[day]++;
    }
  }

  // Calculate real annual actual and annual target
  let annualActual = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = formatDateKey(d);
    const log = logs[k];
    if (log?.completed) {
      annualActual += habit.type === 'numerical' ? (log.value || 0) : 1;
    }
  }

  let annualTarget = 365;
  if (habit.frequency === 'monthly') {
    const mTarget = habit.monthlyTarget || habit.monthlyTargetCount || habit.targetValue || 1;
    annualTarget = mTarget * 12;
  } else if (habit.frequency === 'weekly') {
    if (habit.type === 'numerical') {
      const weeklyGoal = habit.targetValue || 1;
      if (habit.weeklySchedule === 'workdays' && habit.monthlyTarget && habit.monthlyTarget >= weeklyGoal * 10) {
        annualTarget = weeklyGoal * 5 * 52;
      } else {
        annualTarget = Math.round(weeklyGoal * 52);
      }
    } else if (habit.weeklyDaysCount) {
      annualTarget = Math.round(habit.weeklyDaysCount * 52);
    } else if (habit.weeklySchedule === 'workdays') {
      annualTarget = 5 * 52; // 260 hari bekerja setahun
    } else if (habit.frequencyDays && habit.frequencyDays.length > 0) {
      annualTarget = habit.frequencyDays.length * 52;
    } else {
      annualTarget = 2 * 52;
    }
  } else if (habit.frequency === 'daily') {
    const daysCount = habit.frequencyDays && habit.frequencyDays.length > 0 ? habit.frequencyDays.length : 7;
    const daysInYear = daysCount === 7 ? 365 : daysCount === 5 ? 260 : Math.round(daysCount * 52);
    if (habit.type === 'numerical') {
      annualTarget = (habit.targetValue || 1) * daysInYear;
    } else {
      annualTarget = daysInYear;
    }
  }

  const scoreYearPercent = Math.min(
    100,
    annualTarget > 0 ? Math.round((annualActual / annualTarget) * 100) : 0
  );

  return {
    scorePercent,
    totalCompletions,
    scoreMonthChange,
    scoreYearChange: scoreYearPercent,
    annualActual,
    annualTarget,
    streakInfo,
    dayOfWeekCounts,
    dayOfWeekTotals,
  };
}

export function calculateStreaks(logs: Record<string, HabitLog>): StreakInfo {
  const completedDateKeys = Object.keys(logs)
    .filter(k => logs[k]?.completed)
    .sort();

  if (completedDateKeys.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      streaksList: [],
    };
  }

  const streaksList: { start: string; end: string; count: number }[] = [];
  let currentStart = completedDateKeys[0];
  let currentEnd = completedDateKeys[0];
  let currentCount = 1;

  for (let i = 1; i < completedDateKeys.length; i++) {
    const prevDate = parseDateKey(completedDateKeys[i - 1]);
    const currDate = parseDateKey(completedDateKeys[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentCount++;
      currentEnd = completedDateKeys[i];
    } else {
      streaksList.push({
        start: currentStart,
        end: currentEnd,
        count: currentCount,
      });
      currentStart = completedDateKeys[i];
      currentEnd = completedDateKeys[i];
      currentCount = 1;
    }
  }
  streaksList.push({
    start: currentStart,
    end: currentEnd,
    count: currentCount,
  });

  // Check if current streak extends to today or yesterday
  const today = new Date();
  const todayKey = formatDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  const lastStreak = streaksList[streaksList.length - 1];
  let currentStreak = 0;
  if (lastStreak && (lastStreak.end === todayKey || lastStreak.end === yesterdayKey)) {
    currentStreak = lastStreak.count;
  }

  // Sorted best streaks
  const sortedStreaks = [...streaksList].sort((a, b) => b.count - a.count);
  const bestStreak = sortedStreaks.length > 0 ? sortedStreaks[0].count : 0;

  return {
    currentStreak,
    bestStreak,
    streaksList: sortedStreaks.slice(0, 8),
  };
}

// Generate weekly score history (last 12 weeks)
export function getWeeklyScoreHistory(logs: Record<string, HabitLog>) {
  const result: { label: string; score: number; count: number }[] = [];
  const today = new Date();

  for (let w = 11; w >= 0; w--) {
    let weekCompletions = 0;
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - w * 7);

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(endOfWeek);
      dayDate.setDate(endOfWeek.getDate() - d);
      const key = formatDateKey(dayDate);
      if (logs[key]?.completed) {
        weekCompletions++;
      }
    }
    const score = Math.round((weekCompletions / 7) * 100);
    const label = endOfWeek.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
    result.push({ label, score, count: weekCompletions });
  }

  return result;
}

// Generate monthly frequency history (last 12 months)
export function getMonthlyHistory(logs: Record<string, HabitLog>) {
  const result: { monthName: string; count: number }[] = [];
  const today = new Date();

  for (let m = 11; m >= 0; m--) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const monthKeyPrefix = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
    const name = targetMonth.toLocaleDateString('ms-MY', { month: 'short' });

    let count = 0;
    for (const key of Object.keys(logs)) {
      if (key.startsWith(monthKeyPrefix) && logs[key]?.completed) {
        count++;
      }
    }
    result.push({ monthName: name, count });
  }

  return result;
}

// Heatmap matrix: days rows (0=Sun..6=Sat) across weeks
export function getCalendarHeatmapMatrix(logs: Record<string, HabitLog>, weeksCount: number = 20) {
  const today = new Date();
  // Find previous Sunday or end of current week
  const currentDayOfWeek = today.getDay(); // 0 is Sunday
  const lastDate = new Date(today);
  lastDate.setDate(today.getDate() + (6 - currentDayOfWeek)); // up to this Saturday

  const totalDays = weeksCount * 7;
  const startDate = new Date(lastDate);
  startDate.setDate(lastDate.getDate() - totalDays + 1);

  const weeks: {
    weekIndex: number;
    monthLabel?: string;
    days: {
      date: Date;
      dateKey: string;
      dayOfWeek: number;
      dayNumber: number;
      completed: boolean;
      value: number;
      isFuture: boolean;
      isToday: boolean;
    }[];
  }[] = [];

  let currentWeekDays: any[] = [];
  let currentMonthTracked = -1;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateKey = formatDateKey(d);
    const dayOfWeek = d.getDay();
    const dayNumber = d.getDate();
    const isFuture = d > today;
    const isToday = dateKey === formatDateKey(today);
    const log = logs[dateKey];

    let monthLabel: string | undefined = undefined;
    if (d.getMonth() !== currentMonthTracked && dayNumber <= 7) {
      currentMonthTracked = d.getMonth();
      monthLabel = d.toLocaleDateString('ms-MY', { month: 'short' });
    }

    currentWeekDays.push({
      date: d,
      dateKey,
      dayOfWeek,
      dayNumber,
      completed: !!log?.completed,
      value: log?.value || 0,
      isFuture,
      isToday,
    });

    if (dayOfWeek === 6 || i === totalDays - 1) {
      weeks.push({
        weekIndex: weeks.length,
        monthLabel,
        days: currentWeekDays,
      });
      currentWeekDays = [];
    }
  }

  return weeks;
}
