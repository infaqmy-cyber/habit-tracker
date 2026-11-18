import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Sparkles,
  BarChart3,
  Calendar,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'habits' | 'admin';
  setActiveTab: (tab: 'habits' | 'admin') => void;
  onOpenNewHabit: () => void;
  onOpenWeeklySummary?: () => void;
  monitoredUser?: UserProfile | null;
  onExitMonitoring?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewHabit,
  onOpenWeeklySummary,
  monitoredUser,
  onExitMonitoring,
}) => {
  const { user, userProfile, isAdmin, signOutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 px-4 lg:px-8 py-3 transition-colors shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Branding & Navigation Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <RotateCcw className="w-5 h-5 font-bold stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
                  HABIT TRACKER
                </h1>
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                  by INFAQ Consultancy
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 hidden sm:inline">
                Sistem Pemantauan Disiplin & Progres Konsistensi
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center bg-neutral-100 dark:bg-neutral-800/80 rounded-xl p-1 border border-neutral-200 dark:border-neutral-700/50">
            <button
              onClick={() => {
                if (monitoredUser && onExitMonitoring) {
                  onExitMonitoring();
                }
                setActiveTab('habits');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'habits' && !monitoredUser
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Tabiat Saya
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  if (monitoredUser && onExitMonitoring) {
                    onExitMonitoring();
                  }
                  setActiveTab('admin');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Pemantauan Admin
                <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-600 dark:text-amber-300 rounded border border-amber-400/30">
                  Admin
                </span>
              </button>
            )}

            {monitoredUser && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm ml-1">
                <Eye className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                <span className="max-w-[130px] truncate">
                  Memantau: {monitoredUser.displayName || monitoredUser.email}
                </span>
                <button
                  onClick={onExitMonitoring}
                  className="p-0.5 hover:bg-white/20 rounded ml-0.5 text-white/90 hover:text-white"
                  title="Keluar dari mod pemantauan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Weekly Summary Button */}
          {activeTab === 'habits' && onOpenWeeklySummary && (
            <button
              onClick={onOpenWeeklySummary}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all ${
                theme === 'dark'
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-blue-400 border-neutral-700 shadow-sm'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-blue-600 border-neutral-300 shadow-sm'
              }`}
              title="Papar Rumusan Kejayaan Mingguan (7 Hari)"
            >
              <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Rumusan 7 Hari</span>
            </button>
          )}

          {/* New Habit Button */}
          {activeTab === 'habits' && !monitoredUser && (
            <button
              onClick={onOpenNewHabit}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Tambah Tabiat</span>
            </button>
          )}

          {/* Theme Toggle (Dark / Light mode) with Context API */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              theme === 'dark'
                ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-neutral-700 shadow-sm'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300 shadow-sm'
            }`}
            title={`Tukar kepada mod ${theme === 'dark' ? 'Cerah' : 'Gelap'}`}
            aria-label="Togol tema gelap/cerah"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Cerah</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Gelap</span>
              </>
            )}
          </button>

          {/* User Profile dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 transition-colors"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-blue-500"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
              )}
              <span className="text-xs font-medium text-neutral-200 hidden lg:inline max-w-[120px] truncate">
                {user?.displayName || user?.email?.split('@')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-2 text-sm text-neutral-200 z-50">
                <div className="px-3 py-2 border-b border-neutral-800">
                  <div className="font-semibold text-white truncate">{user?.displayName || 'Pengguna'}</div>
                  <div className="text-xs text-neutral-400 truncate">{user?.email}</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        Pentadbir (Admin)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Pengguna Aktif
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile tab switcher */}
                <div className="md:hidden py-1 border-b border-neutral-800">
                  <button
                    onClick={() => {
                      if (monitoredUser && onExitMonitoring) {
                        onExitMonitoring();
                      }
                      setActiveTab('habits');
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
                      activeTab === 'habits' && !monitoredUser ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-neutral-800'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Tabiat Saya
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (monitoredUser && onExitMonitoring) {
                          onExitMonitoring();
                        }
                        setActiveTab('admin');
                        setMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
                        activeTab === 'admin' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-neutral-800'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Pemantauan Admin
                    </button>
                  )}
                  {monitoredUser && (
                    <div className="px-3 py-2 mt-1 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-blue-300 font-bold">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[140px]">{monitoredUser.displayName || monitoredUser.email}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (onExitMonitoring) onExitMonitoring();
                          setMenuOpen(false);
                        }}
                        className="text-neutral-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-800"
                      >
                        Tutup
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      signOutUser();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors font-medium text-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Keluar dari Akaun Google
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
