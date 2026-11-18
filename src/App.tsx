/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import {
  Plus,
  RotateCcw,
  Sparkles,
  Calendar,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Inbox,
  Flame,
  BarChart3,
  Eye,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Habit, HabitLog, UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { HabitRow } from './components/HabitRow';
import { HabitDetailModal } from './components/HabitDetailModal';
import { HabitFormModal } from './components/HabitFormModal';
import { WeeklySummaryModal } from './components/WeeklySummaryModal';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { MotivationalBanner } from './components/MotivationalBanner';
import { getPastDates, formatDateKey } from './utils/dateUtils';
import { calculateHabitStats } from './utils/habitStats';
import { cleanFirestoreData } from './utils/cleanFirestoreData';

// Pre-packaged starter templates matching the user's uploaded screenshot
const INITIAL_DEMO_HABITS: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Posting Takaful',
    question: 'Adakah anda telah membuat posting perkongsian takaful di media sosial hari ini?',
    type: 'numerical',
    frequency: 'weekly',
    weeklySchedule: 'workdays',
    frequencyDays: [1, 2, 3, 4, 5],
    targetValue: 5,
    unit: 'posting',
    color: '#0284c7',
    order: 0,
  },
  {
    name: 'Follow up Prospek',
    question: 'Berapa prospek yang anda hubungi semula untuk penjelasan lanjut?',
    type: 'numerical',
    frequency: 'weekly',
    weeklySchedule: 'workdays',
    frequencyDays: [1, 2, 3, 4, 5],
    targetValue: 5,
    unit: 'prospek',
    color: '#ea580c',
    order: 1,
  },
  {
    name: 'Call/WhatsApp prospek',
    question: 'Panggilan & perbualan mesej bersama prospek baharu atau sedia ada',
    type: 'numerical',
    frequency: 'weekly',
    weeklySchedule: 'workdays',
    frequencyDays: [1, 2, 3, 4, 5],
    targetValue: 5,
    unit: 'prospek',
    color: '#9333ea',
    order: 2,
  },
  {
    name: 'Open Case online',
    question: 'Borang permohonan takaful dibuka secara online',
    type: 'numerical',
    frequency: 'daily',
    targetValue: 2,
    unit: 'kes',
    color: '#f59e0b',
    order: 3,
  },
  {
    name: 'Dhuha Meeting',
    question: 'Menghadiri perjumpaan pagi dan solat dhuha bersama pasukan',
    type: 'boolean',
    frequency: 'weekly',
    weeklySchedule: 'workdays',
    frequencyDays: [1, 2, 3, 4, 5],
    color: '#10b981',
    order: 4,
  },
  {
    name: 'Prospek Baru',
    question: 'Bilangan kenalan atau prospek baharu diperolehi',
    type: 'numerical',
    frequency: 'daily',
    targetValue: 5,
    unit: 'orang',
    color: '#e11d48',
    order: 5,
  },
  {
    name: 'Open Case face to face',
    question: 'Pertemuan secara bersemuka untuk pembukaan kes',
    type: 'numerical',
    frequency: 'weekly',
    weeklySchedule: 'workdays',
    frequencyDays: [1, 2, 3, 4, 5],
    targetValue: 1,
    unit: 'orang',
    color: '#3b82f6',
    order: 6,
  },
  {
    name: 'Review & Closing Bulanan',
    question: 'Sesi semakan prestasi & penutupan akaun bulanan',
    type: 'boolean',
    frequency: 'monthly',
    monthlyTargetCount: 1,
    monthlyTarget: 1,
    color: '#8b5cf6',
    order: 7,
  },
  {
    name: 'Senaman / Riadah',
    question: 'Melakukan aktiviti riadah atau senaman fizikal',
    type: 'boolean',
    frequency: 'weekly',
    weeklySchedule: 'flexible',
    weeklyDaysCount: 2,
    color: '#0d9488',
    order: 8,
  },
];

function MainHabitTracker({ user }: { user: any }) {
  const { userProfile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'habits' | 'admin'>('habits');
  const [monitoredUser, setMonitoredUser] = useState<UserProfile | null>(null);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(true);
  const [allApprovedUsers, setAllApprovedUsers] = useState<UserProfile[]>([]);

  const [dateOffset, setDateOffset] = useState<number>(0); // 0 = ending today
  const [dateOrder, setDateOrder] = useState<'chronological' | 'today_first'>('chronological');
  const tableScrollRef = React.useRef<HTMLDivElement>(null);

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch approved users list for admin quick-switching
  useEffect(() => {
    if (!isAdmin) return;
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCol, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.status === 'approved' || (!u.status && u.role === 'admin')) {
          list.push(u);
        }
      });
      list.sort((a, b) =>
        (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')
      );
      setAllApprovedUsers(list);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Target user ID to load habits and logs for (either monitored user or current logged-in user)
  const targetUserId = monitoredUser ? monitoredUser.userId : user?.uid;

  // Default Auto: Mengikut lebar skrin secara automatik (sesuai untuk mod melintang / desktop)
  const getEffectiveDaysCount = (): number => {
    if (viewportWidth < 500) return 4; // Telefon menegak (portrait)
    if (viewportWidth < 768) return 6; // Telefon melintang (landscape)
    if (viewportWidth < 1024) return 7; // Tablet
    if (viewportWidth < 1366) return 10; // Komputer riba / Desktop
    return 14; // Skrin desktop lebar
  };

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, HabitLog>>({});
  const [loadingData, setLoadingData] = useState(true);

  // Modals state
  const [selectedHabitForDetail, setSelectedHabitForDetail] = useState<Habit | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  // Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Distinct categories available in habits plus popular presets (Hook called unconditionally)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    habits.forEach((h) => {
      if (h.category && h.category.trim()) {
        set.add(h.category.trim());
      }
    });
    // Ensure common presets are available in dropdown
    ['Health', 'Work', 'Personal', 'Finance', 'Spiritual', 'Learning'].forEach((c) => set.add(c));
    return Array.from(set);
  }, [habits]);

  // Subscribe to habits & logs of target user (monitored user or current user)
  useEffect(() => {
    if (!targetUserId) return;

    setLoadingData(true);
    setHabits([]);
    setLogs({});

    // Habits listener
    const habitsQuery = query(
      collection(db, 'habits'),
      where('userId', '==', targetUserId)
    );

    const unsubscribeHabits = onSnapshot(
      habitsQuery,
      (snapshot) => {
        const items: Habit[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as Habit);
        });
        // Sort by order ascending, then createdAt
        items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setHabits(items);
        setLoadingData(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'habits');
        setLoadingData(false);
      }
    );

    // HabitLogs listener
    const logsQuery = query(
      collection(db, 'habitLogs'),
      where('userId', '==', targetUserId)
    );

    const unsubscribeLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logMap: Record<string, HabitLog> = {};
        snapshot.forEach((docSnap) => {
          const l = docSnap.data() as HabitLog;
          logMap[`${l.habitId}_${l.date}`] = l;
        });
        setLogs(logMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'habitLogs');
      }
    );

    return () => {
      unsubscribeHabits();
      unsubscribeLogs();
    };
  }, [targetUserId]);

  // Compute displayed dates (chronological order ending at today - dateOffset, or today first)
  const computeDates = (): Date[] => {
    const end = new Date();
    end.setDate(end.getDate() - dateOffset);
    const count = getEffectiveDaysCount();
    const past = getPastDates(count, end);
    return dateOrder === 'chronological' ? past.reverse() : past;
  };

  const datesToDisplay = computeDates();

  // Auto-scroll to ensure Today is immediately visible
  useEffect(() => {
    if (tableScrollRef.current) {
      if (dateOrder === 'chronological') {
        tableScrollRef.current.scrollLeft = tableScrollRef.current.scrollWidth;
      } else {
        tableScrollRef.current.scrollLeft = 0;
      }
    }
  }, [datesToDisplay.length, dateOrder, dateOffset]);

  // Log an activity for admin activity stream
  const recordAdminActivity = async (action: string, habitName: string, details?: string) => {
    if (!user) return;
    try {
      const actRef = collection(db, 'activities');
      await addDoc(actRef, cleanFirestoreData({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.uid,
        userName: user.displayName || userProfile?.displayName || user.email?.split('@')[0] || 'Pengguna',
        userEmail: user.email || '',
        action,
        habitName,
        details: details || '',
        timestamp: new Date().toISOString(),
      }));
    } catch {
      // non-fatal background log
    }
  };

  // Toggle boolean habit cell
  const handleToggleBoolean = async (
    habit: Habit,
    dateKey: string,
    currentStatus: 'completed' | 'skipped' | 'none'
  ) => {
    if (!user) return;
    const logId = `${habit.id}_${dateKey}`;
    const logRef = doc(db, 'habitLogs', logId);
    const habitOwnerId = habit.userId || targetUserId;

    try {
      if (currentStatus === 'none') {
        // Mark completed
        const payload: HabitLog = {
          id: logId,
          habitId: habit.id,
          userId: habitOwnerId,
          date: dateKey,
          completed: true,
          skipped: false,
          value: 1,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(logRef, cleanFirestoreData(payload));
        recordAdminActivity('complete', habit.name, `Selesai pada ${dateKey}`);
      } else if (currentStatus === 'completed') {
        // Mark skipped / cross
        const payload: HabitLog = {
          id: logId,
          habitId: habit.id,
          userId: habitOwnerId,
          date: dateKey,
          completed: false,
          skipped: true,
          value: 0,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(logRef, cleanFirestoreData(payload));
      } else {
        // Delete / blank
        await deleteDoc(logRef);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `habitLogs/${logId}`);
    }
  };

  // Update numerical habit cell
  const handleUpdateNumerical = async (habit: Habit, dateKey: string, value: number) => {
    if (!user) return;
    const logId = `${habit.id}_${dateKey}`;
    const logRef = doc(db, 'habitLogs', logId);
    const habitOwnerId = habit.userId || targetUserId;

    try {
      const isTargetMet = value >= (habit.targetValue || 1);
      const payload: HabitLog = {
        id: logId,
        habitId: habit.id,
        userId: habitOwnerId,
        date: dateKey,
        completed: isTargetMet || value > 0,
        skipped: false,
        value,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(logRef, cleanFirestoreData(payload));
      recordAdminActivity(
        'update',
        habit.name,
        `Mencatat ${value} ${habit.unit || 'unit'} pada ${dateKey}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `habitLogs/${logId}`);
    }
  };

  // Save new or edited habit
  const handleSaveHabit = async (habitData: Partial<Habit>) => {
    if (!user) return;

    try {
      if (editingHabit) {
        // Update existing
        const habitRef = doc(db, 'habits', editingHabit.id);
        const updatePayload = cleanFirestoreData({
          ...habitData,
          updatedAt: new Date().toISOString(),
        });
        await updateDoc(habitRef, updatePayload);
      } else {
        // Create new
        const newId = `habit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const habitRef = doc(db, 'habits', newId);
        const newHabit: any = {
          id: newId,
          userId: user.uid,
          name: habitData.name || 'Tabiat Baru',
          question: habitData.question || '',
          type: habitData.type || 'boolean',
          frequency: habitData.frequency || 'daily',
          weeklySchedule: habitData.weeklySchedule,
          weeklyDaysCount: habitData.weeklyDaysCount,
          frequencyDays: habitData.frequencyDays,
          monthlyTargetCount: habitData.monthlyTargetCount,
          monthlyTarget: habitData.monthlyTarget,
          category: habitData.category || 'Work',
          color: habitData.color || '#2563eb',
          order: habits.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (habitData.type === 'numerical') {
          newHabit.targetValue = habitData.targetValue || 1;
          newHabit.unit = habitData.unit || 'unit';
        }
        await setDoc(habitRef, cleanFirestoreData(newHabit));

        // Update user habit count
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            habitsCount: habits.length + 1,
            lastActiveAt: new Date().toISOString(),
          });
        } catch {}
      }

      setShowFormModal(false);
      setEditingHabit(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'habits');
    }
  };

  // Delete habit
  const handleDeleteHabit = async (habitId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'habits', habitId));
      setSelectedHabitForDetail(null);
      setShowFormModal(false);
      setEditingHabit(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `habits/${habitId}`);
    }
  };

  // Load starter templates
  const handleLoadDemoHabits = async () => {
    if (!user) return;
    try {
      for (let i = 0; i < INITIAL_DEMO_HABITS.length; i++) {
        const template = INITIAL_DEMO_HABITS[i];
        const newId = `habit_${Date.now()}_${i}`;
        const habitRef = doc(db, 'habits', newId);
        const habitPayload: any = {
          ...template,
          id: newId,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(habitRef, cleanFirestoreData(habitPayload));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'habits');
    }
  };

  // Calculate current streak across all habits
  const todayKey = formatDateKey(new Date());
  let completedTodayCount = 0;
  habits.forEach((h) => {
    if (logs[`${h.id}_${todayKey}`]?.completed) {
      completedTodayCount++;
    }
  });

  const filteredHabits = habits.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      (h.category || '').toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors selection:bg-blue-600 selection:text-white">
      {/* Top App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'admin') {
            setMonitoredUser(null);
          }
          setActiveTab(tab);
        }}
        onOpenNewHabit={() => {
          setEditingHabit(null);
          setShowFormModal(true);
        }}
        onOpenWeeklySummary={() => setShowWeeklySummary(true)}
        monitoredUser={monitoredUser}
        onExitMonitoring={() => {
          setMonitoredUser(null);
        }}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        {/* Render Admin Dashboard if on 'admin' tab and user is admin */}
        {activeTab === 'admin' && isAdmin ? (
          <AdminDashboard
            onMonitorUser={(targetUser) => {
              setMonitoredUser(targetUser);
              setIsReadOnly(true);
              setActiveTab('habits');
            }}
          />
        ) : (
          /* Main Habits Loop Tracker View */
          <div className="space-y-4">
            {/* Monitoring Mode Top Banner */}
            {monitoredUser && (
              <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 border border-blue-500/40 text-white rounded-2xl p-3.5 sm:p-4 shadow-xl mb-4 backdrop-blur animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: User info */}
                  <div className="flex items-center gap-3">
                    {monitoredUser.photoURL ? (
                      <img
                        src={monitoredUser.photoURL}
                        alt={monitoredUser.displayName}
                        className="w-11 h-11 rounded-xl object-cover ring-2 ring-blue-400 shadow-md"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base ring-2 ring-blue-400 shadow-md">
                        {monitoredUser.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-sm">
                          <Eye className="w-3.5 h-3.5" />
                          Mod Pemantauan Aktif
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Paparan Sebagaimana Pengguna
                        </span>
                        {isReadOnly ? (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Paparan Sahaja (Kunci)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                            <Unlock className="w-3 h-3" />
                            Boleh Sunting
                          </span>
                        )}
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-white mt-1 flex items-center gap-2 flex-wrap">
                        <span>{monitoredUser.displayName || 'Pengguna'}</span>
                        <span className="text-xs font-normal text-blue-200">({monitoredUser.email})</span>
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2 py-0.2 rounded-md">
                          {habits.length} Tabiat
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Switch user selector */}
                    {allApprovedUsers.length > 1 && (
                      <div className="relative">
                        <select
                          value={monitoredUser.userId}
                          onChange={(e) => {
                            const target = allApprovedUsers.find((u) => u.userId === e.target.value);
                            if (target) {
                              setMonitoredUser(target);
                            }
                          }}
                          className="bg-neutral-900/90 hover:bg-neutral-900 border border-blue-400/50 text-blue-100 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer shadow-sm"
                          aria-label="Tukar Pengguna yang Dipantau"
                        >
                          {allApprovedUsers.map((u) => (
                            <option key={u.userId} value={u.userId} className="bg-neutral-900 text-white">
                              Tukar: {u.displayName || u.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Lock / Unlock Toggle */}
                    <button
                      onClick={() => setIsReadOnly(!isReadOnly)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                        isReadOnly
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/40'
                      }`}
                      title={isReadOnly ? 'Klik untuk membenarkan pengemaskinian data' : 'Klik untuk mengunci paparan sahaja'}
                    >
                      {isReadOnly ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Buka Kunci
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          Kunci Semula
                        </>
                      )}
                    </button>

                    {/* Back to Admin Button */}
                    <button
                      onClick={() => {
                        setMonitoredUser(null);
                        setActiveTab('admin');
                      }}
                      className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                      title="Tutup mod pemantauan dan kembali ke Panel Admin"
                    >
                      <X className="w-3.5 h-3.5" />
                      Kembali ke Admin
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Motivational Banner */}
            <MotivationalBanner
              currentStreak={completedTodayCount > 0 ? 1 : 0}
              totalCompletedToday={completedTodayCount}
            />

            {/* Quick Actions & Date Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 sm:px-4 shadow-sm dark:shadow-none transition-colors">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setDateOffset(prev => prev + 1)}
                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                  title="Undur ke tarikh sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 px-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    {dateOffset === 0 ? 'Terkini' : `Undur ${dateOffset} Hari`}
                  </span>
                </div>

                {/* Jump to Today Button - dynamically tallies with actual current date */}
                <button
                  onClick={() => {
                    setDateOffset(0);
                    if (tableScrollRef.current) {
                      if (dateOrder === 'chronological') {
                        tableScrollRef.current.scrollLeft = tableScrollRef.current.scrollWidth;
                      } else {
                        tableScrollRef.current.scrollLeft = 0;
                      }
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
                    dateOffset === 0
                      ? 'bg-blue-600/15 dark:bg-blue-600/30 text-blue-600 dark:text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-700'
                  }`}
                  title="Papar hari ini"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Hari Ini ({new Date().getDate()}hb)
                </button>

                <button
                  onClick={() => setDateOffset(prev => Math.max(0, prev - 1))}
                  disabled={dateOffset === 0}
                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 transition-colors"
                  title="Maju ke tarikh terkini"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Order switch: Chronological vs Loop Today-first */}
                <button
                  onClick={() => setDateOrder(prev => prev === 'chronological' ? 'today_first' : 'chronological')}
                  className="hidden md:inline-flex text-[11px] px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/80 transition-colors ml-1"
                  title="Tukar susunan lajur tarikh"
                >
                  {dateOrder === 'chronological' ? 'Kiri ➔ Kanan' : 'Hari Ini di Kiri'}
                </button>

                {/* Weekly Summary Button - Quick access from main dashboard */}
                <button
                  onClick={() => setShowWeeklySummary(true)}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 hover:bg-blue-600/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-500/30 transition-all font-semibold active:scale-95 shadow-sm ml-1"
                  title="Papar Rumusan Kejayaan Mingguan (7 Hari)"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-blue-500 stroke-[2.5]" />
                  <span>Rumusan 7 Hari</span>
                </button>
              </div>

              {/* Category Filter & Search Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Filter Dropdown */}
                <div className="relative flex items-center">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl pl-2.5 pr-7 py-1.5 text-xs text-neutral-900 dark:text-neutral-200 focus:outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer appearance-none shadow-sm"
                    aria-label="Tapis Mengikut Kategori"
                  >
                    <option value="all">Semua Kategori ({habits.length})</option>
                    {availableCategories.map((cat) => {
                      const count = habits.filter(
                        (h) => (h.category || '').toLowerCase() === cat.toLowerCase()
                      ).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} {count > 0 ? `(${count})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <Filter className="w-3 h-3 text-neutral-400 dark:text-neutral-500 absolute right-2.5 pointer-events-none" />
                </div>

                {/* Search Filter input */}
                <input
                  type="text"
                  placeholder="Cari tabiat..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl px-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-blue-500 w-32 sm:w-44 transition-colors"
                />

                <button
                  onClick={() => {
                    setEditingHabit(null);
                    setShowFormModal(true);
                  }}
                  className="sm:hidden p-2 rounded-xl bg-blue-600 text-white"
                  title="Tambah Tabiat"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Empty State if no habits yet */}
            {habits.length === 0 && !loadingData ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-7 h-7 stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                  {monitoredUser ? 'Tiada Tabiat Dicatatkan' : 'Belum Ada Tabiat Dicatat'}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                  {monitoredUser
                    ? `Pengguna "${monitoredUser.displayName || monitoredUser.email}" belum mencipta sebarang tabiat dalam akaun mereka.`
                    : 'Mulakan perjalanan disiplin anda. Anda boleh mencipta tabiat sendiri atau menggunakan set tabiat agensi / Loop sedia ada.'}
                </p>

                {!monitoredUser ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleLoadDemoHabits}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      Gunakan Set Templat Contoh
                    </button>

                    <button
                      onClick={() => {
                        setEditingHabit(null);
                        setShowFormModal(true);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Cipta Tabiat Baharu
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setMonitoredUser(null);
                      setActiveTab('admin');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    Kembali ke Panel Admin
                  </button>
                )}
              </div>
            ) : (
              /* THE CORE LOOP HABIT MATRIX TABLE */
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden transition-colors">
                <div ref={tableScrollRef} className="overflow-x-auto w-full scrollbar-thin">
                  <div className="min-w-fit w-full">
                    {/* Table Header (Day names & numbers) */}
                    <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 select-none transition-colors">
                      {/* Habits Column Header - Sticky so it stays visible while scrolling */}
                      <div className="w-[160px] sm:w-[215px] md:w-[255px] shrink-0 sticky left-0 z-20 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 py-3 px-3 sm:px-4 font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 shadow-[3px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[3px_0_8px_rgba(0,0,0,0.5)] transition-colors">
                        Tabiat
                      </div>

                      {/* Date Column Headers (stretches to fill landscape and desktop screen) */}
                      <div className="flex-1 flex items-stretch">
                        {datesToDisplay.map((date) => {
                          const malayDays = ['AHD', 'ISN', 'SEL', 'RAB', 'KHA', 'JUM', 'SAB'];
                          const dayName = malayDays[date.getDay()];
                          const dayNum = date.getDate();
                          const isToday = formatDateKey(date) === formatDateKey(new Date());

                          return (
                            <div
                              key={date.toISOString()}
                              className={`flex-1 min-w-[50px] sm:min-w-[62px] md:min-w-[72px] py-2 sm:py-2.5 flex flex-col items-center justify-center border-r border-neutral-200 dark:border-neutral-800/80 text-center transition-colors ${
                                isToday ? 'bg-blue-600/10 dark:bg-blue-600/15 ring-1 ring-inset ring-blue-500/30' : ''
                              }`}
                            >
                              <span
                                className={`text-[10px] sm:text-xs tracking-wider uppercase ${
                                  isToday ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-neutral-500 dark:text-neutral-400 font-semibold'
                                }`}
                              >
                                {dayName}
                              </span>
                              <span
                                className={`text-xs sm:text-sm font-bold mt-0.5 transition-all ${
                                  isToday
                                    ? 'text-white bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 ring-2 ring-blue-300 scale-105'
                                    : 'text-neutral-700 dark:text-neutral-300'
                                }`}
                              >
                                {dayNum}
                              </span>
                              {isToday && (
                                <span className="text-[8px] font-extrabold uppercase tracking-tight text-blue-600 dark:text-blue-300 mt-0.5 px-1 py-0.2 rounded bg-blue-500/15 dark:bg-blue-500/20 border border-blue-400/30">
                                  HARI INI
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Table Rows (Habits) */}
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {filteredHabits.map((habit) => {
                        const habitLogsSubset = Object.fromEntries(
                          Object.entries(logs)
                            .filter(([k]) => k.startsWith(`${habit.id}_`))
                            .map(([k, v]) => [v.date, v])
                        );

                        const stats = calculateHabitStats(habit, habitLogsSubset);

                        return (
                          <HabitRow
                            key={habit.id}
                            habit={habit}
                            dates={datesToDisplay}
                            logs={habitLogsSubset}
                            score={stats.scorePercent}
                            onToggleBoolean={handleToggleBoolean}
                            onUpdateNumerical={handleUpdateNumerical}
                            onSelectHabit={(h) => setSelectedHabitForDetail(h)}
                            isReadOnly={isReadOnly && !!monitoredUser}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Habit Detail & Visual Statistics Modal */}
      {selectedHabitForDetail && (
        <HabitDetailModal
          habit={selectedHabitForDetail}
          logs={Object.fromEntries(
            Object.entries(logs)
              .filter(([k]) => k.startsWith(`${selectedHabitForDetail.id}_`))
              .map(([k, v]) => [v.date, v])
          )}
          onClose={() => setSelectedHabitForDetail(null)}
          onEditHabit={(habit) => {
            setEditingHabit(habit);
            setSelectedHabitForDetail(null);
            setShowFormModal(true);
          }}
          onDeleteHabit={handleDeleteHabit}
          onToggleDate={(habit, dateKey, currentStatus) => {
            handleToggleBoolean(habit, dateKey, currentStatus);
          }}
          isReadOnly={isReadOnly && !!monitoredUser}
        />
      )}

      {/* Habit Create / Edit Form Modal */}
      {showFormModal && (
        <HabitFormModal
          initialHabit={editingHabit}
          onClose={() => {
            setShowFormModal(false);
            setEditingHabit(null);
          }}
          onSave={handleSaveHabit}
        />
      )}

      {/* Weekly Summary Modal */}
      {showWeeklySummary && (
        <WeeklySummaryModal
          habits={habits}
          logs={logs}
          onClose={() => setShowWeeklySummary(false)}
          onSelectHabit={(habit) => {
            setShowWeeklySummary(false);
            setSelectedHabitForDetail(habit);
          }}
        />
      )}
    </div>
  );
}

function MainApp() {
  const { user, isAdmin, isApproved, loading: authLoading } = useAuth();

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 font-sans p-4">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-base font-extrabold tracking-tight text-white">HABIT TRACKER</h1>
        <span className="text-xs uppercase tracking-wider font-bold text-blue-400 mt-0.5">
          by INFAQ Consultancy
        </span>
        <span className="text-xs text-neutral-500 mt-2">Memuatkan data sistem...</span>
      </div>
    );
  }

  // Not signed in with Google -> Show Google Login Screen
  if (!user) {
    return <LoginScreen />;
  }

  // Signed in, but pending approval by admin
  if (!isAdmin && !isApproved) {
    return <PendingApprovalScreen />;
  }

  return <MainHabitTracker user={user} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
