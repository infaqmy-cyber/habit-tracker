export type HabitType = 'boolean' | 'numerical';
export type RoutineFrequency = 'daily' | 'weekly' | 'monthly';
export type WeeklyScheduleType = 'all' | 'workdays' | 'custom' | 'flexible';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  question?: string;
  type: HabitType;
  frequency?: RoutineFrequency; // 'daily' | 'weekly' | 'monthly'
  weeklySchedule?: WeeklyScheduleType; // 'all' (7 days) | 'workdays' (5 days) | 'custom' | 'flexible'
  weeklyDaysCount?: number; // Bilangan kali seminggu (bebas mana-mana hari, cth: 2 kali seminggu)
  frequencyDays?: number[]; // [0,1,2,3,4,5,6] 0 = Sunday
  monthlyTargetCount?: number; // e.g. 10 kali sebulan
  monthlyTarget?: number; // Sasaran bilangan hari atau unit sebulan penuh
  targetValue?: number;
  unit?: string;
  category?: string; // e.g., 'Health', 'Work', 'Personal', 'Finance', 'Spiritual'
  color: string;
  createdAt: string;
  updatedAt: string;
  order: number;
  archived?: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value: number; // 1 for boolean check, or numeric count
  skipped?: boolean;
  note?: string;
  updatedAt: string;
}

export type UserApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'admin';
  status?: UserApprovalStatus; // 'approved' | 'pending' | 'rejected'
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  lastActiveAt: string;
  habitsCount?: number;
}

export interface PreApprovedUser {
  id: string;
  email: string;
  displayName?: string;
  role?: 'user' | 'admin';
  addedBy: string;
  addedByEmail?: string;
  notes?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  habitName: string;
  details?: string;
  timestamp: string;
}

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  streaksList: { start: string; end: string; count: number }[];
}
