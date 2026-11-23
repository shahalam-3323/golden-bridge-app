import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Info, ArrowLeft, LogOut } from 'lucide-react';

// Default tier fallback if authContext does not provide TIER_CONFIG
const DEFAULT_TIERS = {
  starter: { label: 'Starter', capital: 2000, rate: 0.035 },
  growth: { label: 'Growth', capital: 5000, rate: 0.045 },
  elite: { label: 'Elite', capital: 10000, rate: 0.055 },
  prime: { label: 'Prime', capital: 50000, rate: 0.07 },
  signature: { label: 'Signature', capital: 100000, rate: 0.08 },
};

// Formats rupee values cleanly for compact UI readouts
const formatRupee = (val) => {
  try {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return '₹0.00';
  }
};

// Simple, no-scroll HomePage with per-second fluctuating numbers and separate Info/Help view
export default function HomePage({ authContext }) {
  const auth = authContext || {};
  const { user, userProfile, logout, TIER_CONFIG = DEFAULT_TIERS } = auth;

  const [view, setView] = useState('main'); // 'main' | 'info'
  const [pulseTick, setPulseTick] = useState(0);

  // Per-second live fluctuation tick (replaces chart simulator)
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((prev) => (prev + 1) % 100000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const displayName =
    userProfile?.fullName ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Member');

  const baseCapital = useMemo(() => {
    try {
      const direct = Number(
        userProfile?.activeCapital ?? userProfile?.capital ?? userProfile?.investedAmount ?? 0
      );
      if (direct > 0) return direct;

      const cardList = Array.isArray(userProfile?.activeCards) ? userProfile.activeCards : [];
      const cardSum = cardList.reduce((acc, id) => {
        const tier = TIER_CONFIG?.[id];
        return acc + (Number(tier?.capital) || 0);
      }, 0);

      const depList = Array.isArray(userProfile?.customDeposits) ? userProfile.customDeposits : [];
      const depSum = depList.reduce((acc, d) => acc + (Number(d?.capital) || 0), 0);

      const total = cardSum + depSum;
      return total > 0 ? total : Number(TIER_CONFIG?.starter?.capital) || 2000;
    } catch {
      return 2000;
    }
  }, [userProfile, TIER_CONFIG]);

  const monthlyRate = useMemo(() => {
    try {
      const explicit = String(userProfile?.activeTier || '').toLowerCase();
      if (explicit && TIER_CONFIG?.[explicit]?.rate) {
        return Number(TIER_CONFIG[explicit].rate);
      }
      return Number(TIER_CONFIG?.starter?.rate) || 0.035;
    } catch {
      return 0.035;
    }
  }, [userProfile?.activeTier, TIER_CONFIG]);

  // Per-second fluctuating indicative figures (smooth wave around indicative yield)
  const liveStats = useMemo(() => {
    try {
      const baseMonthlyGain = baseCapital * monthlyRate;
      const baseDailyIndicative = baseMonthlyGain / 30;
      const waveA = Math.sin(pulseTick * 0.85) * 0.018;
      const waveB = Math.cos(pulseTick * 0.55) * 0.012;

      const fluctuatingIndex = baseCapital + baseDailyIndicative * (1 + waveA);
      const fluctuatingDelta = baseDailyIndicative * (1 + waveB);
      const fluctuatingPct = (monthlyRate * 100 + waveA * 1.4).toFixed(2);

      return {
        liveValue: Math.max(0, fluctuatingIndex),
        liveDelta: fluctuatingDelta,
        livePct: fluctuatingPct,
      };
    } catch {
      return {
        liveValue: baseCapital,
        liveDelta: 0,
        livePct: '3.50',
      };
    }
  }, [baseCapital, monthlyRate, pulseTick]);

  // Signs user out safely
  const handleLogout = async () => {
    if (typeof logout !== 'function') return;
    try {
      await logout();
    } catch {
      // Ignore logout failure in simple view
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#0A0A0A] text-white flex flex-col justify-between px-4 py-3 select-none">
      {/* Compact Top Bar */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-zinc-400 truncate">VYOM Vault</p>
          <h1 className="text-base font-bold text-white truncate">{displayName}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setView(view === 'main' ? 'info' : 'main')}
            className="px-3 py-1.5 rounded-lg bg-[#151515] border border-white/10 text-xs font-semibold text-[#E5C158] flex items-center gap-1.5 active:scale-95 transition"
          >
            {view === 'main' ? (
              <>
                <Info className="w-3.5 h-3.5" />
                <span>Info &amp; Help</span>
              </>
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </>
            )}
          </button>

          {typeof logout === 'function' && (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              className="p-1.5 rounded-lg bg-[#151515] border border-white/10 text-zinc-400 hover:text-red-400 active:scale-95 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area (No Scroll on Main Screen) */}
      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-2 min-h-0">
        {view === 'main' ? (
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>Live Indicative Ticker</span>
              </span>
              <span className="font-mono text-[11px] text-zinc-500">1s tick</span>
            </div>

            {/* Per-Second Fluctuating Primary Number */}
            <div>
              <p className="text-xs text-zinc-400">Indicative Value</p>
              <p className="text-3xl font-extrabold font-mono tabular-nums text-white mt-0.5">
                {formatRupee(liveStats.liveValue)}
              </p>
            </div>

            {/* Compact Two-Stat Row */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div className="bg-[#0B0B0B] rounded-xl p-3 border border-white/5">
                <p className="text-[11px] text-zinc-400">Per-Day Pace</p>
                <p className="text-sm font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                  +{formatRupee(liveStats.liveDelta)}
                </p>
              </div>

              <div className="bg-[#0B0B0B] rounded-xl p-3 border border-white/5">
                <p className="text-[11px] text-zinc-400">Indicative Rate</p>
                <p className="text-sm font-bold font-mono tabular-nums text-[#E5C158] mt-0.5">
                  {liveStats.livePct}% / mo
                </p>
              </div>
            </div>

            {/* Minimal Capital Summary */}
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
              <span>Base Capital: {formatRupee(baseCapital)}</span>
              <button
                type="button"
                onClick={() => setView('info')}
                className="text-[#E5C158] font-semibold underline"
              >
                Read Full Guide
              </button>
            </div>
          </div>
        ) : (
          /* Dedicated Information & Help Article View */
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 h-full max-h-[76dvh] overflow-y-auto space-y-3 text-xs leading-relaxed text-zinc-300">
            <h2 className="text-sm font-bold text-[#E5C158]">
              VYOM Network — Information &amp; Help Guide
            </h2>

            <p>
              <strong>Live Numbers:</strong> Main screen par dikhne wale numbers per second
              indicative fluctuation dikhate hain. Yeh sirf live display ke liye hain aur guaranteed
              return nahi hain.
            </p>

            <p>
              <strong>Capital &amp; Tiers:</strong> Micro-deposit ₹100 se shuru hota hai aur 5 tiers
              (Starter ₹2,000, Growth ₹5,000, Elite ₹10,000, Prime ₹50,000, Signature ₹1,00,000)
              indicative monthly rates ke saath structured hain.
            </p>

            <p>
              <strong>Profit Split &amp; Settlement:</strong> Eligible realised yield par 50/50 split
              laagu hota hai aur UTR/UPI verification ke baad settlement 2–48 hours mein process hota
              hai.
            </p>

            <p className="text-zinc-400">
              <strong>Risk Note:</strong> Capital aur market conditions mein risk shamil hai. Kisi
              bhi decision se pehle apni suvidha aur niyam zaroor dekhein.
            </p>
          </div>
        )}
      </main>

      {/* Compact Footer Note */}
      <footer className="w-full max-w-md mx-auto text-center text-[11px] text-zinc-500 truncate">
        Indicative figures only • Tap Info &amp; Help for full details
      </footer>
    </div>
  );
}