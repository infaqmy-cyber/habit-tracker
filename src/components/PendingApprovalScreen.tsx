import React, { useState } from 'react';
import {
  RotateCcw,
  Clock,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Mail,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PendingApprovalScreen: React.FC = () => {
  const { user, userProfile, isRejected, signOutUser, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleManualCheck = async () => {
    try {
      setChecking(true);
      await refreshProfile();
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-neutral-100 font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-3.5">
            <RotateCcw className="w-9 h-9 stroke-[2.5]" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            HABIT TRACKER
          </h1>
          <span className="text-xs uppercase tracking-wider font-extrabold text-blue-400 mt-0.5">
            by INFAQ Consultancy
          </span>
        </div>

        {/* Status Card */}
        {isRejected ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-red-400 mb-1">
              Akses Tidak Diluluskan
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Permohonan akaun ini belum atau tidak diluluskan oleh pentadbir. Sila hubungi pihak pengurusan INFAQ Consultancy untuk pengesahan akses.
            </p>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-amber-300 mb-1">
              Pendaftaran Menunggu Kelulusan
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Akaun anda telah didaftarkan ke dalam sistem. Sebagai langkah keselamatan, pentadbir (Admin) INFAQ Consultancy perlu meluluskan akaun anda sebelum anda boleh memulakan catatan tabiat.
            </p>
          </div>
        )}

        {/* Account Details Box */}
        <div className="bg-neutral-800/60 border border-neutral-800 rounded-2xl p-4 mb-6 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
            Maklumat Akaun Anda:
          </span>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-700 flex items-center justify-center text-neutral-300 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-neutral-400 block">Nama Pengguna</span>
              <span className="text-xs font-semibold text-white truncate block">
                {userProfile?.displayName || user?.displayName || 'Pengguna'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-700 flex items-center justify-center text-neutral-300 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-neutral-400 block">Emel Berdaftar</span>
              <span className="text-xs font-semibold text-white truncate block">
                {userProfile?.email || user?.email}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-700/60 flex items-center justify-between text-xs">
            <span className="text-neutral-400 text-[11px]">Status Akses Semasa:</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${
                isRejected
                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {isRejected ? 'Ditolak' : 'Menunggu Kelulusan Admin'}
            </span>
          </div>
        </div>

        {/* Live Status Hint */}
        <div className="flex items-start gap-2.5 text-xs text-neutral-400 mb-6 bg-blue-950/20 border border-blue-500/20 rounded-xl p-3">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Sistem dipautkan secara langsung (*live sync*). Sebaik sahaja admin menekan butang <strong>"Luluskan"</strong> di panel kawalan admin, skrin ini akan bertukar ke halaman tabiat anda secara serta-merta tanpa perlu log masuk semula.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Menyemak...' : 'Semak Status Sekarang'}
          </button>

          <button
            onClick={() => signOutUser()}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-750 font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Keluar
          </button>
        </div>
      </div>
    </div>
  );
};
