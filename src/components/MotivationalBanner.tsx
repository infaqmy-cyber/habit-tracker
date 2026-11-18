import React, { useState } from 'react';
import { Flame, Sparkles, Trophy, ChevronRight, X } from 'lucide-react';

const QUOTES = [
  { text: "Kejayaan adalah jumlah usaha kecil yang diulangi hari demi hari.", author: "Robert Collier" },
  { text: "Kita adalah apa yang kita lakukan berulang kali. Kecemerlangan bukanlah tindakan, tetapi tabiat.", author: "Aristotle" },
  { text: "Disiplin adalah jambatan antara matlamat dan pencapaian.", author: "Jim Rohn" },
  { text: "Satu peratus lebih baik setiap hari membawa kepada perubahan luar biasa dalam setahun.", author: "James Clear (Atomic Habits)" },
  { text: "Mulakan di mana anda berada. Gunakan apa yang anda ada. Buat apa yang anda mampu.", author: "Arthur Ashe" },
];

export const MotivationalBanner: React.FC<{ currentStreak: number; totalCompletedToday: number }> = ({
  currentStreak,
  totalCompletedToday,
}) => {
  const [closed, setClosed] = useState(false);
  const [quoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  if (closed) return null;

  const quote = QUOTES[quoteIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/80 to-purple-50 dark:from-blue-900/40 dark:via-indigo-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-500/20 p-4 mb-5 text-neutral-900 dark:text-neutral-100 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Motivasi Hari Ini</span>
              {currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                  Streak: {currentStreak} Hari
                </span>
              )}
              {totalCompletedToday > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold">
                  <Trophy className="w-3.5 h-3.5" />
                  {totalCompletedToday} Selesai Hari Ini
                </span>
              )}
            </div>
            <p className="text-sm italic font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 leading-relaxed">
              "{quote.text}" <span className="text-neutral-600 dark:text-neutral-400 font-normal text-xs ml-1">— {quote.author}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setClosed(true)}
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors p-1"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
