import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  CheckCircle,
  Clock,
  Search,
  Download,
  Eye,
  ShieldCheck,
  Flame,
  BarChart2,
  Calendar,
  X,
  RefreshCw,
  Sparkles,
  UserPlus,
  Check,
  ShieldAlert,
  AlertCircle,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  MoreVertical,
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile, ActivityItem, Habit, HabitLog, PreApprovedUser, UserApprovalStatus } from '../types';
import { ScoreRing } from './ScoreRing';
import { getPastDates, formatDateKey, formatNiceDate } from '../utils/dateUtils';
import { calculateHabitStats } from '../utils/habitStats';
import { cleanFirestoreData } from '../utils/cleanFirestoreData';

interface AdminDashboardProps {
  onMonitorUser?: (user: UserProfile) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onMonitorUser }) => {
  const { user: currentAdminUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [preApprovedList, setPreApprovedList] = useState<PreApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'add_user' | 'stream'>('users');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Add User Form State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [newUserNotes, setNewUserNotes] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Status Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Selected user for drill-down inspection
  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);
  const [userHabits, setUserHabits] = useState<Habit[]>([]);
  const [userLogs, setUserLogs] = useState<Record<string, HabitLog>>({});
  const [loadingInspection, setLoadingInspection] = useState(false);

  // Fetch all users, pre-approved list, and activity feed in real time
  useEffect(() => {
    let unsubscribeUsers: () => void = () => {};
    let unsubscribeActivities: () => void = () => {};
    let unsubscribePreApproved: () => void = () => {};

    const loadData = () => {
      try {
        setLoading(true);
        // Listen to all users
        const usersCol = collection(db, 'users');
        unsubscribeUsers = onSnapshot(
          usersCol,
          (snap) => {
            const list: UserProfile[] = [];
            snap.forEach((d) => {
              list.push(d.data() as UserProfile);
            });
            // Sort by lastActiveAt descending or createdAt
            list.sort(
              (a, b) =>
                new Date(b.lastActiveAt || b.createdAt || 0).getTime() -
                new Date(a.lastActiveAt || a.createdAt || 0).getTime()
            );
            setUsers(list);
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, 'users');
          }
        );

        // Listen to pre-approved users
        const preCol = collection(db, 'preApprovedUsers');
        unsubscribePreApproved = onSnapshot(
          preCol,
          (snap) => {
            const list: PreApprovedUser[] = [];
            snap.forEach((d) => {
              list.push(d.data() as PreApprovedUser);
            });
            list.sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            setPreApprovedList(list);
          },
          (error) => {
            console.warn('Pre-approved listener warning:', error);
          }
        );

        // Listen to live activities
        const actQuery = query(
          collection(db, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(60)
        );
        unsubscribeActivities = onSnapshot(
          actQuery,
          (snap) => {
            const acts: ActivityItem[] = [];
            snap.forEach((d) => {
              acts.push(d.data() as ActivityItem);
            });
            setActivities(acts);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, 'activities');
          }
        );
      } catch (err) {
        console.error('Admin data load error:', err);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubscribeUsers();
      unsubscribeActivities();
      unsubscribePreApproved();
    };
  }, []);

  // Approve a user
  const handleApproveUser = async (targetUser: UserProfile) => {
    try {
      setActionLoadingId(targetUser.userId);
      const userRef = doc(db, 'users', targetUser.userId);
      await updateDoc(
        userRef,
        cleanFirestoreData({
          status: 'approved',
          approvedAt: new Date().toISOString(),
          approvedBy: currentAdminUser?.email || 'admin',
        })
      );
    } catch (err) {
      console.error('Error approving user:', err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.userId}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject a user
  const handleRejectUser = async (targetUser: UserProfile) => {
    try {
      setActionLoadingId(targetUser.userId);
      const userRef = doc(db, 'users', targetUser.userId);
      await updateDoc(
        userRef,
        cleanFirestoreData({
          status: 'rejected',
        })
      );
    } catch (err) {
      console.error('Error rejecting user:', err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.userId}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle user role between 'user' and 'admin'
  const handleToggleRole = async (targetUser: UserProfile) => {
    try {
      setActionLoadingId(targetUser.userId);
      const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
      const userRef = doc(db, 'users', targetUser.userId);
      await updateDoc(
        userRef,
        cleanFirestoreData({
          role: newRole,
        })
      );

      // Manage /admins collection document
      const adminDocRef = doc(db, 'admins', targetUser.userId);
      if (newRole === 'admin') {
        await setDoc(
          adminDocRef,
          cleanFirestoreData({
            userId: targetUser.userId,
            email: targetUser.email,
            createdAt: new Date().toISOString(),
          })
        );
      } else {
        await deleteDoc(adminDocRef);
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.userId}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Add / Pre-Approve New User
  const handleCreatePreApprovedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserSuccess(null);
    setAddUserError(null);

    const emailTrimmed = newUserEmail.toLowerCase().trim();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setAddUserError('Sila masukkan alamat emel Google yang sah.');
      return;
    }

    try {
      setAddingUser(true);
      const cleanId = emailTrimmed.replace(/[^a-zA-Z0-9]/g, '_');
      const preDocRef = doc(db, 'preApprovedUsers', cleanId);

      const prePayload: PreApprovedUser = {
        id: cleanId,
        email: emailTrimmed,
        displayName: newUserName.trim() || undefined,
        role: newUserRole,
        addedBy: currentAdminUser?.uid || 'admin',
        addedByEmail: currentAdminUser?.email || undefined,
        notes: newUserNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await setDoc(preDocRef, cleanFirestoreData(prePayload));

      // Also check if user with this email has already registered and is in pending/rejected status
      const existingUser = users.find(
        (u) => (u.email || '').toLowerCase().trim() === emailTrimmed
      );
      if (existingUser) {
        const uRef = doc(db, 'users', existingUser.userId);
        await updateDoc(
          uRef,
          cleanFirestoreData({
            status: 'approved',
            role: newUserRole,
            approvedAt: new Date().toISOString(),
            approvedBy: currentAdminUser?.email || 'admin',
          })
        );
      }

      setAddUserSuccess(
        `Pengguna "${emailTrimmed}" berjaya ditambah & dipra-luluskan! Apabila mereka log masuk dengan Google, sistem akan meluluskan mereka serta-merta.`
      );
      setNewUserEmail('');
      setNewUserName('');
      setNewUserNotes('');
    } catch (err: any) {
      console.error('Error adding pre-approved user:', err);
      setAddUserError(err.message || 'Gagal menambah pengguna baru. Sila cuba lagi.');
    } finally {
      setAddingUser(false);
    }
  };

  // Remove pre-approved entry
  const handleDeletePreApproved = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'preApprovedUsers', id));
    } catch (err) {
      console.error('Error deleting pre-approved user:', err);
    }
  };

  // When admin inspects a user, load their habits and logs
  const handleInspectUser = async (targetUser: UserProfile) => {
    setInspectedUser(targetUser);
    setLoadingInspection(true);
    try {
      // Fetch habits for this user
      const habitsQ = query(
        collection(db, 'habits'),
        where('userId', '==', targetUser.userId)
      );
      const habitsSnap = await getDocs(habitsQ);
      const habitsList: Habit[] = [];
      habitsSnap.forEach((d) => habitsList.push(d.data() as Habit));
      habitsList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setUserHabits(habitsList);

      // Fetch logs for this user
      const logsQ = query(
        collection(db, 'habitLogs'),
        where('userId', '==', targetUser.userId)
      );
      const logsSnap = await getDocs(logsQ);
      const logsMap: Record<string, HabitLog> = {};
      logsSnap.forEach((d) => {
        const item = d.data() as HabitLog;
        logsMap[`${item.habitId}_${item.date}`] = item;
      });
      setUserLogs(logsMap);
    } catch (error) {
      console.error('Error inspecting user:', error);
      handleFirestoreError(error, OperationType.LIST, `habits/user/${targetUser.userId}`);
    } finally {
      setLoadingInspection(false);
    }
  };

  // Export report to CSV
  const handleExportCSV = () => {
    const headers = [
      'Nama Pengguna',
      'Emel',
      'Status Kelulusan',
      'Peranan',
      'Tarikh Daftar',
      'Aktiviti Terakhir',
      'Bilangan Tabiat',
    ];
    const rows = users.map((u) => [
      `"${u.displayName || 'Tanpa Nama'}"`,
      `"${u.email}"`,
      `"${u.status || 'approved'}"`,
      `"${u.role || 'user'}"`,
      `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ms-MY') : '-'}"`,
      `"${u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('ms-MY') : '-'}"`,
      u.habitsCount || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `laporan_pengguna_infaq_${formatDateKey(new Date())}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved' || (!u.status && u.role === 'admin'));
  const rejectedUsers = users.filter((u) => u.status === 'rejected');

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return u.status === 'pending';
    if (statusFilter === 'approved') return u.status === 'approved' || (!u.status && u.role === 'admin');
    if (statusFilter === 'rejected') return u.status === 'rejected';
    return true;
  });

  const inspectionDates = getPastDates(7);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-500" />
              Pusat Kawalan & Pemantauan Admin
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              Admin INFAQ Consultancy
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Tambah dan luluskan pengguna baharu, pantau disiplin tabiat mereka, serta semak rekod aktiviti semasa.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('add_user')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            + Tambah Pengguna Baru
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Eksport CSV
          </button>
        </div>
      </div>

      {/* Pending Approvals Warning Banner */}
      {pendingUsers.length > 0 && activeSubTab !== 'users' && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Clock className="w-5 h-5 animate-pulse text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-bold">
                Terdapat {pendingUsers.length} Permohonan Pengguna Menunggu Kelulusan!
              </div>
              <div className="text-xs opacity-90">
                Pengguna ini tidak dapat mengakses aplikasi sehingga anda meluluskan permohonan mereka.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveSubTab('users');
              setStatusFilter('pending');
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shrink-0 transition-colors shadow-sm"
          >
            Semak Sekarang
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Jumlah Pengguna</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
            {users.length}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Berdaftar dalam sistem</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Menunggu Kelulusan</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 flex items-center gap-2">
            {pendingUsers.length}
            {pendingUsers.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Perlu tindakan admin</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Aktif 24 Jam</span>
            <Flame className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {
              users.filter((u) => {
                const diffMs = Date.now() - new Date(u.lastActiveAt || 0).getTime();
                return diffMs < 24 * 60 * 60 * 1000;
              }).length
            }
          </div>
          <div className="text-xs text-neutral-500 mt-1">Ahli mencatat hari ini</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pra-Kelulusan</span>
            <UserCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {preApprovedList.length}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Emel dijemput/dibenarkan</div>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'users'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Pengurusan & Kelulusan Pengguna
          {pendingUsers.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 font-black text-[10px]">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('add_user')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'add_user'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          + Tambah Pengguna / Pra-Kelulusan
        </button>

        <button
          onClick={() => setActiveSubTab('stream')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'stream'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Suapan Aktiviti Langsung ({activities.length})
          {activities.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* SUB TAB 1: User Management & Approval Table */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Status Filter Chips & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                Semua ({users.length})
              </button>

              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20'
                }`}
              >
                <Clock className="w-3 h-3" />
                Menunggu Kelulusan ({pendingUsers.length})
              </button>

              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20'
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                Diluluskan ({approvedUsers.length})
              </button>

              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 hover:bg-red-500/20'
                }`}
              >
                <UserX className="w-3 h-3" />
                Ditolak ({rejectedUsers.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari nama atau emel pengguna..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-700 dark:text-neutral-300">
                <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Status Kelulusan</th>
                    <th className="py-3 px-4">Peranan</th>
                    <th className="py-3 px-4">Tabiat</th>
                    <th className="py-3 px-4">Aktiviti Terakhir</th>
                    <th className="py-3 px-4 text-right">Tindakan Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        Tiada pengguna dijumpai dengan kriteria ini.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isRecentlyActive =
                        Date.now() - new Date(u.lastActiveAt || 0).getTime() < 15 * 60 * 1000;
                      const isPending = u.status === 'pending';
                      const isApproved = u.status === 'approved' || (!u.status && u.role === 'admin');
                      const isRejected = u.status === 'rejected';
                      const isActionBusy = actionLoadingId === u.userId;

                      return (
                        <tr
                          key={u.userId}
                          className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                        >
                          {/* User info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {u.photoURL ? (
                                <img
                                  src={u.photoURL}
                                  alt={u.displayName}
                                  className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-300 dark:ring-neutral-700"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                  {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                  {u.displayName || 'Pengguna Tanpa Nama'}
                                  {isRecentlyActive && (
                                    <span
                                      className="w-2 h-2 rounded-full bg-emerald-500"
                                      title="Aktif sekarang (15 minit terkini)"
                                    />
                                  )}
                                </div>
                                <div className="text-xs text-neutral-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Approval Status Badge */}
                          <td className="py-3 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                Menunggu Kelulusan
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Diluluskan
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Ditolak
                              </span>
                            )}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3 px-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                                <ShieldCheck className="w-3 h-3 text-amber-500" />
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                Pengguna
                              </span>
                            )}
                          </td>

                          {/* Habits Count */}
                          <td className="py-3 px-4 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                            {u.habitsCount !== undefined ? `${u.habitsCount} tabiat` : '-'}
                          </td>

                          {/* Last active */}
                          <td className="py-3 px-4 text-xs text-neutral-500">
                            {u.lastActiveAt
                              ? new Date(u.lastActiveAt).toLocaleString('ms-MY', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* If Pending: Quick Approve & Reject Buttons */}
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleApproveUser(u)}
                                    disabled={isActionBusy}
                                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                    title="Luluskan akaun pengguna ini"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    Luluskan
                                  </button>

                                  <button
                                    onClick={() => handleRejectUser(u)}
                                    disabled={isActionBusy}
                                    className="inline-flex items-center gap-1 bg-red-600/20 hover:bg-red-600/30 text-red-600 dark:text-red-400 border border-red-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                                    title="Tolak permohonan akaun ini"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Tolak
                                  </button>
                                </>
                              )}

                              {/* If Approved: Monitor Habits Button */}
                              {isApproved && (
                                <button
                                  onClick={() => {
                                    if (onMonitorUser) {
                                      onMonitorUser(u);
                                    } else {
                                      handleInspectUser(u);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                                  title="Masuk ke mod pemantauan untuk melihat dashboard penuh sebagaimana pengguna ini"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Pantau Tabiat
                                </button>
                              )}

                              {/* If Rejected: Re-approve */}
                              {isRejected && (
                                <button
                                  onClick={() => handleApproveUser(u)}
                                  disabled={isActionBusy}
                                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                                  title="Luluskan semula pengguna ini"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Luluskan Semula
                                </button>
                              )}

                              {/* Role Toggle Dropdown/Button */}
                              <button
                                onClick={() => handleToggleRole(u)}
                                disabled={isActionBusy}
                                className="px-2 py-1.5 rounded-xl text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-700 transition-colors"
                                title={
                                  u.role === 'admin'
                                    ? 'Turunkan ke Pengguna Biasa'
                                    : 'Naikkan taraf ke Admin'
                                }
                              >
                                {u.role === 'admin' ? 'Jadikan Pengguna' : 'Jadikan Admin'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: Add / Pre-Approve User Form */}
      {activeSubTab === 'add_user' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Pre-Approval Form */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Tambah / Pra-Luluskan Pengguna
                </h3>
                <p className="text-xs text-neutral-500">
                  Benarkan ahli pasukan terus log masuk tanpa perlu menunggu kelulusan manual.
                </p>
              </div>
            </div>

            {addUserSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>{addUserSuccess}</div>
              </div>
            )}

            {addUserError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>{addUserError}</div>
              </div>
            )}

            <form onSubmit={handleCreatePreApprovedUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Alamat Emel Google Pengguna <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh: agen.takaful@gmail.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="text-[11px] text-neutral-500 mt-1 block">
                  Pengguna mesti log masuk menggunakan akaun Google dengan emel ini.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nama Penuh / Rujukan (Pilihan)
                </label>
                <input
                  type="text"
                  placeholder="cth: Ustaz Azman / Farisya INFAQ"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Peranan Akses
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserRole('user')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newUserRole === 'user'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    Pengguna Biasa
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole('admin')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newUserRole === 'admin'
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-sm'
                        : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    Admin Penuh
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nota Pasukan (Pilihan)
                </label>
                <input
                  type="text"
                  placeholder="cth: Cawangan KL / Kumpulan Al-Falah"
                  value={newUserNotes}
                  onChange={(e) => setNewUserNotes(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={addingUser}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                {addingUser ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Simpan & Pra-Luluskan Akses
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right: List of Pre-Approved Emails */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-500" />
                  Senarai Emel Yang Telah Dipra-Luluskan ({preApprovedList.length})
                </h3>
                <p className="text-xs text-neutral-500">
                  Pengguna ini akan diluluskan secara automatik sebaik sahaja mereka mendaftar masuk pertama kali.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-neutral-200 dark:divide-neutral-800">
              {preApprovedList.length === 0 ? (
                <div className="py-16 text-center text-neutral-400 text-xs">
                  Belum ada emel pra-kelulusan. Gunakan borang di sebelah untuk menambah emel ahli pasukan anda.
                </div>
              ) : (
                preApprovedList.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        {item.email}
                        {item.role === 'admin' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-600 dark:text-amber-300">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                        {item.displayName && <span>{item.displayName} • </span>}
                        {item.notes && <span>{item.notes} • </span>}
                        <span>
                          Ditambah:{' '}
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString('ms-MY')
                            : '-'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePreApproved(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Padam pra-kelulusan ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 3: Live Activity Feed */}
      {activeSubTab === 'stream' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Log Aktiviti Semasa Pengguna (Live Activity Stream)
            </h3>
            <span className="text-xs text-neutral-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Masa Nyata (Real-time)
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-sm">
              Belum ada sebarang aktiviti dicatatkan oleh mana-mana pengguna hari ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-neutral-900 dark:text-white">
                        <span className="text-blue-600 dark:text-blue-400">
                          {act.userName || act.userEmail}
                        </span>{' '}
                        {act.action === 'complete'
                          ? 'telah menyelesaikan'
                          : 'mengemaskini tabiat'}{' '}
                        <span className="text-amber-600 dark:text-amber-300 font-extrabold">
                          "{act.habitName}"
                        </span>
                      </div>
                      {act.details && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {act.details}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-neutral-400 shrink-0 font-medium">
                    {new Date(act.timestamp).toLocaleTimeString('ms-MY', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: DRILL-DOWN MONITORING OF A SPECIFIC USER'S HABITS */}
      {inspectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                {inspectedUser.photoURL ? (
                  <img
                    src={inspectedUser.photoURL}
                    alt={inspectedUser.displayName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {inspectedUser.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    Pemantauan Tabiat: {inspectedUser.displayName || 'Pengguna'}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 font-semibold">
                      {inspectedUser.role}
                    </span>
                  </h3>
                  <div className="text-xs text-neutral-500">{inspectedUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onMonitorUser && (
                  <button
                    onClick={() => {
                      onMonitorUser(inspectedUser);
                      setInspectedUser(null);
                    }}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
                    title="Buka paparan penuh dashboard tabiat pengguna ini"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mod Pemantauan Penuh (Paparan Pengguna)</span>
                    <span className="sm:hidden">Paparan Penuh</span>
                  </button>
                )}
                <button
                  onClick={() => setInspectedUser(null)}
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
              {loadingInspection ? (
                <div className="py-16 text-center text-neutral-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  Memuatkan data tabiat dan rekod pengguna...
                </div>
              ) : userHabits.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 text-sm">
                  Pengguna ini belum mencipta sebarang tabiat dalam akaun mereka.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-bold uppercase tracking-wider">
                      Senarai Tabiat Pengguna ({userHabits.length})
                    </span>
                    <span>Tinjauan 7 Hari Terkini</span>
                  </div>

                  {/* Table of user habits */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-950">
                    {/* Header Row */}
                    <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 py-2.5 px-4 text-xs font-bold text-neutral-500">
                      <div className="flex-1">Nama Tabiat</div>
                      <div className="flex items-center">
                        {inspectionDates.map((d) => (
                          <div key={d.toISOString()} className="w-14 sm:w-16 text-center">
                            <div>{['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'][d.getDay()]}</div>
                            <div className="text-[10px] text-neutral-400">{d.getDate()}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Habits Rows */}
                    {userHabits.map((habit) => {
                      const habitStats = calculateHabitStats(
                        habit,
                        Object.fromEntries(
                          Object.entries(userLogs)
                            .filter(([k]) => k.startsWith(`${habit.id}_`))
                            .map(([k, v]) => [v.date, v])
                        )
                      );

                      return (
                        <div
                          key={habit.id}
                          className="flex items-center border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                        >
                          <div className="flex-1 min-w-[140px] flex items-center gap-2.5">
                            <ScoreRing
                              score={habitStats.scorePercent}
                              color={habit.color}
                              size={26}
                              strokeWidth={3}
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="text-sm font-bold"
                                  style={{ color: habit.color }}
                                >
                                  {habit.name}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  habit.frequency === 'weekly'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : habit.frequency === 'monthly'
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                }`}>
                                  {habit.frequency === 'weekly'
                                    ? 'Mingguan'
                                    : habit.frequency === 'monthly'
                                    ? 'Bulanan'
                                    : 'Harian'}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-500">
                                Skor: {habitStats.scorePercent}% • Streak:{' '}
                                {habitStats.streakInfo.currentStreak}h
                              </div>
                            </div>
                          </div>

                          {/* Date checks */}
                          <div className="flex items-center">
                            {inspectionDates.map((d) => {
                              const dateKey = formatDateKey(d);
                              const logKey = `${habit.id}_${dateKey}`;
                              const log = userLogs[logKey];
                              const isDone = !!log?.completed;

                              return (
                                <div
                                  key={dateKey}
                                  className="w-14 sm:w-16 h-10 flex items-center justify-center border-l border-neutral-200 dark:border-neutral-800"
                                >
                                  {habit.type === 'boolean' ? (
                                    isDone ? (
                                      <CheckCircle
                                        className="w-5 h-5"
                                        style={{ color: habit.color }}
                                      />
                                    ) : (
                                      <div className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-800" />
                                    )
                                  ) : (
                                    <div
                                      className="text-xs font-bold"
                                      style={{ color: isDone ? habit.color : '#9ca3af' }}
                                    >
                                      {log?.value || 0}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
