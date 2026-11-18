/**
 * Date utility helpers for Habit Tracker
 */

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getPastDates(count: number = 7, endDate: Date = new Date()): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(endDate);
    d.setDate(endDate.getDate() - i);
    dates.push(d);
  }
  return dates; // newest first (today, yesterday, etc.)
}

export function getShortDayName(date: Date): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[date.getDay()];
}

export function getDayNumber(date: Date): number {
  return date.getDate();
}

export function formatNiceDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
