import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  useAuth,
  TIER_CONFIG,
  MIN_DEPOSIT,
  WELCOME_BONUS,
  PROFIT_SPLIT,
  rateForAmount,
} from '../context/AuthContext';

const SECONDS_IN_MONTH = 30 * 24 * 3600;

// Every tier's numbers (capital + monthly gross yield) come straight from
// TIER_CONFIG so the cards, the calculator and the live ledger never drift.
// This map only adds presentation: brushed-metal palette + labels.
const TIER_STYLE = {
  starter: {
    name: 'STARTER CARD',
    tierCode: 'TIER-I',
    accent: '#34D399',
    edge: 'border-[#D4AF37]/30',
    gradient: 'from-[#064E3B] to-[#022C22]',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25',
  },
  growth: {
    name: 'GROWTH CARD',
    tierCode: 'TIER-II',
    accent: '#CBD5E1',
    edge: 'border-white/[0.14]',
    gradient: 'from-[#1E293B] to-[#0F172A]',
    badgeBg: 'bg-slate-400/10 text-slate-300 border-slate-300/25',
  },
  elite: {
    name: 'ELITE CARD',
    tierCode: 'TIER-III',
    accent: '#E2E8F0',
    edge: 'border-[#D4AF37]/25',
    gradient: 'from-[#1E293B] to-[#0F172A]',
    badgeBg: 'bg-slate-300/10 text-slate-200 border-slate-300/25',
  },
  prime: {
    name: 'PRIME CARD',
    tierCode: 'TIER-IV',
    accent: '#E5C158',
    edge: 'border-[#D4AF37]/35',
    gradient: 'from-[#1E293B] to-[#0F172A]',
    badgeBg: 'bg-[#E5C158]/10 text-[#E5C158] border-[#D4AF37]/30',
  },
  signature: {
    name: 'SIGNATURE CARD',
    tierCode: 'TIER-V',
    accent: '#E5C158',
    edge: 'border-[#D4AF37]/40',
    gradient: 'from-[#141414] to-[#070707]',
    badgeBg: 'bg-[#E5C158]/15 text-[#E5C158] border-[#D4AF37]/40',
  },
};

const ALLOCATION_TIERS = Object.values(TIER_CONFIG).map((tier) => ({
  ...tier,
  ...(TIER_STYLE[tier.id] || {}),
}));

const pct = (rate) => `${(rate * 100).toFixed(1)}%`;
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const getWalkthroughSeen = () => {
  try {
    return window.localStorage.getItem('vyom_walkthrough_seen') === 'true';
  } catch {
    return false;
  }
};

const markWalkthroughSeen = () => {
  try {
    window.localStorage.setItem('vyom_walkthrough_seen', 'true');
  } catch {
    // Ignore storage errors in restricted environments
  }
};

export default function WelcomePage({ refCode }) {
  const { signup, login } = useAuth();
  const formRef = useRef(null);

  // Check if first-time user
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(getWalkthroughSeen);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDir, setSlideDir] = useState(1); // 1 = forward, -1 = back

  // Shared Data States (100% Same Existing Data & Algo)
  const [selectedTier, setSelectedTier] = useState(ALLOCATION_TIERS[3]); // Default Prime Card
  const [calcAmount, setCalcAmount] = useState(ALLOCATION_TIERS[3].capital); // ₹100 – ₹1,00,000
  const [monthlyRate, setMonthlyRate] = useState(4.0); // 3.5% – 8.0%
  const [isSignInMode, setIsSignInMode] = useState(false);

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ── Slide 1: live-ticking ₹1,100 (₹100 deposit + ₹1,000 bonus) preview ──
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const bonusBase = MIN_DEPOSIT + WELCOME_BONUS; // ₹100 + ₹1,000 = ₹1,100
  const bonusMonthlyRate = rateForAmount(MIN_DEPOSIT);
  const bonusLiveValue = bonusBase * Math.pow(1 + bonusMonthlyRate, elapsedSeconds / SECONDS_IN_MONTH);
  const bonusEarned = bonusLiveValue - bonusBase;

  // Math Calculations (Full Compounding, Same Algo)
  const r = monthlyRate / 100;
  const grossProfit24m = Math.round(calcAmount * Math.pow(1 + r, 24) - calcAmount);
  const totalVal24m = calcAmount + grossProfit24m;
  const netProfit24m = Math.round(grossProfit24m * PROFIT_SPLIT);

  const grossProfit12m = Math.round(calcAmount * Math.pow(1 + r, 12) - calcAmount);
  const totalVal12m = calcAmount + grossProfit12m;

  // Memoized SVG Trajectory Curve
  const { pathD, svgWidth, svgHeight } = useMemo(() => {
    const width = 320;
    const height = 90;
    const points = Array.from({ length: 25 }, (_, m) => calcAmount * Math.pow(1 + r, m));
    const max = points[24];
    const min = calcAmount;

    const d = points
      .map((v, i) => {
        const x = (i / 24) * width;
        const y = height - ((v - min) / (max - min || 1)) * (height - 18) - 8;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    return { pathD: d, svgWidth: width, svgHeight: height };
  }, [calcAmount, r]);

  const finishWalkthrough = (signIn = false) => {
    markWalkthroughSeen();
    setAuthError('');
    setHasSeenWalkthrough(true);
    setIsSignInMode(signIn);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  // ── Slide navigation (buttons, dots, progress bar, swipe) ──
  const goToSlide = (idx) => {
    if (idx === currentSlide) return;
    setSlideDir(idx > currentSlide ? 1 : -1);
    setAuthError('');
    setCurrentSlide(idx);
  };
  const goNext = () => goToSlide(Math.min(currentSlide + 1, 3));
  const goPrev = () => goToSlide(Math.max(currentSlide - 1, 0));

  // Touch swipe (mobile) — left = next, right = previous.
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 55) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    const isSigningIn = hasSeenWalkthrough ? isSignInMode : false;

    if (!cleanEmail) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (!isSigningIn) {
      if (!cleanName) {
        setAuthError('Please enter your full name.');
        return;
      }
      if (!agreed) {
        setAuthError('Please accept the Terms & 50/50 Profit-Sharing Policy to continue.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSigningIn) {
        await login(cleanEmail, password);
      } else {
        await signup(cleanEmail, password, cleanName, refCode || null);
      }
      markWalkthroughSeen();
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setAuthError('Invalid credentials. Please verify your email and password.');
      } else if (code.includes('invalid-email')) {
        setAuthError('Please enter a valid email address.');
      } else if (code.includes('email-already-in-use')) {
        setAuthError('This email is already registered. Please click Sign In.');
      } else if (code.includes('weak-password')) {
        setAuthError('Password must be at least 6 characters.');
      } else if (code.includes('too-many-requests')) {
        setAuthError('Too many attempts. Please wait a moment and try again.');
      } else if (code.includes('network-request-failed')) {
        setAuthError('Network error. Please check your internet connection.');
      } else {
        setAuthError(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // VIEW 1: FIRST-TIME USER (INTERACTIVE 4-SLIDE WALKTHROUGH)
  // ══════════════════════════════════════════════════════════════════
  if (!hasSeenWalkthrough) {
    return (
      <div className="min-h-screen bg-[#090C0E] text-[#E2E8F0] relative overflow-hidden font-sans tabular-nums flex flex-col justify-between p-5 selection:bg-[#E5C158]/25">
        {/* Top Bar */}
        <div className="relative z-10">
          <header className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E5C158] to-[#8A7327] flex items-center justify-center font-black text-black text-xs">
                V
              </div>
              <span className="text-xs font-black tracking-wider text-white">VYOM NETWORK</span>
            </div>
            <button
              type="button"
              onClick={() => finishWalkthrough(true)}
              className="text-[11px] font-mono font-bold text-[#E5C158] hover:text-white px-3 py-1 rounded-full border border-[#D4AF37]/30 bg-[#E5C158]/5 transition-all active:scale-95"
            >
              Sign In
            </button>
          </header>

          {/* Progress bar across the 4 slides */}
          <div className="max-w-md mx-auto w-full mt-4 flex gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
              <button
                type="button"
                key={idx}
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => goToSlide(idx)}
                className="h-1 flex-1 rounded-full bg-white/[0.08] overflow-hidden"
              >
                <span
                  className={`block h-full rounded-full bg-gradient-to-r from-[#E5C158] to-[#C9A227] transition-all duration-500 ease-out ${
                    idx <= currentSlide ? 'w-full' : 'w-0'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ─── SLIDE CONTAINER (swipe-enabled) ─── */}
        <main
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative z-10 max-w-md mx-auto w-full my-auto py-6"
        >
          <div key={currentSlide} className={slideDir > 0 ? 'animate-slideLeft' : 'animate-slideRight'}>
            {/* ── SLIDE 1: THE HOOK — ₹1,000 BONUS + ₹100 START ── */}
            {currentSlide === 0 && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
                    Smart Wealth Growth <span className="text-[#E5C158]">—</span> Powered by 50/50 Profit Sharing
                  </h2>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-sm mx-auto">
                    We only make money when you make money. Start small, grow steadily, and keep half of every rupee we earn for you.
                  </p>
                </div>

                {/* ₹1,000 Welcome Bonus Card (brushed emerald & gold) */}
                <div className="metal-card metal-emerald rounded-2xl p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 bg-[#E5C158]/15 text-[#E5C158] uppercase">
                        Welcome Bonus
                      </span>
                      <p className="text-3xl font-black text-white mt-3 font-mono tabular-nums">
                        ₹{fmt(WELCOME_BONUS)}
                      </p>
                      <p className="text-[10px] font-mono text-emerald-200/80 mt-0.5">
                        Free credit added the moment you join
                      </p>
                    </div>
                    <div className="w-11 h-9 rounded-lg bg-gradient-to-br from-[#E5C158]/40 via-[#F5E6A8]/50 to-[#8A7327]/40 border border-[#E5C158]/40 p-1 flex flex-col justify-around">
                      <div className="h-[1px] bg-black/50 w-full" />
                      <div className="h-[1px] bg-black/50 w-full" />
                      <div className="h-[1px] bg-black/50 w-full" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.12]">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-200/70">
                      Add just ₹{MIN_DEPOSIT} to unlock
                    </p>
                    <p className="text-lg font-black text-white font-mono tabular-nums">
                      ₹{fmt(bonusBase)}{' '}
                      <span className="text-[10px] font-mono font-normal text-emerald-200/80">Active Capital</span>
                    </p>
                    <p className="text-[11px] font-mono font-bold text-emerald-300 tabular-nums mt-1">
                      +₹{bonusEarned.toFixed(6)}{' '}
                      <span className="text-emerald-200/60 font-normal">earned live · every second</span>
                    </p>
                  </div>
                </div>

                {/* Trust badge */}
                <div className="flex justify-center">
                  <span className="text-[10px] font-mono font-bold text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 rounded-full px-3 py-1.5 tracking-wide">
                    ₹0 Fixed Fees • 50/50 Profit Share
                  </span>
                </div>
              </div>
            )}

            {/* ── SLIDE 2: PICK YOUR CARD OR START AT ₹100 ── */}
            {currentSlide === 1 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-black tracking-tight text-white leading-tight">
                    Pick Your Card <span className="text-[#E5C158]">·</span> Or Start with ₹{MIN_DEPOSIT}
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
                    Every card earns monthly gross yield of {pct(TIER_CONFIG.starter.monthlyRate)}–{pct(TIER_CONFIG.signature.monthlyRate)}. Bigger cards simply earn a higher rate.
                  </p>
                </div>

                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                    Choose Your Card
                  </p>
                  <span className="text-[10px] font-mono font-bold text-[#E5C158]">{selectedTier.tierCode}</span>
                </div>

                {/* Brushed-metal centerpiece card */}
                <div
                  className={`metal-card rounded-2xl p-5 bg-gradient-to-br ${selectedTier.gradient} border ${selectedTier.edge}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${selectedTier.badgeBg} uppercase`}>
                        {selectedTier.tierCode}
                      </span>
                      <h3 className="text-lg font-black tracking-wider text-white mt-2">
                        {selectedTier.name}
                      </h3>
                    </div>
                    <div className="w-9 h-7 rounded-md bg-gradient-to-br from-[#E5C158]/40 via-[#F5E6A8]/50 to-[#8A7327]/40 border border-[#E5C158]/40 p-0.5 flex flex-col justify-around">
                      <div className="h-[1px] bg-black/50 w-full" />
                      <div className="h-[1px] bg-black/50 w-full" />
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
                      Card Value
                    </p>
                    <p className="text-2xl font-black font-mono tracking-tight text-white mt-0.5 tabular-nums">
                      ₹{fmt(selectedTier.capital)}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.08] flex justify-between items-center text-[9px] font-mono text-slate-400">
                    <span>COMPOUNDS MONTHLY</span>
                    <span className="text-[#E5C158] font-bold">
                      {pct(selectedTier.monthlyRate)} MONTHLY GROSS YIELD
                    </span>
                  </div>
                </div>

                {/* 5-Card Switcher */}
                <div className="grid grid-cols-5 gap-1 bg-[#11161A] p-1.5 rounded-2xl border border-white/[0.08]">
                  {ALLOCATION_TIERS.map((tier) => {
                    const isSelected = selectedTier.id === tier.id;
                    return (
                      <button
                        type="button"
                        key={tier.id}
                        onClick={() => {
                          setSelectedTier(tier);
                          setCalcAmount(tier.capital);
                        }}
                        className={`py-2 px-1 rounded-xl text-center transition-all ${
                          isSelected
                            ? 'bg-[#E5C158]/15 border border-[#D4AF37]/40 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <p className="text-[9px] font-mono font-bold">
                          ₹{tier.capital >= 1000 ? `${tier.capital / 1000}K` : tier.capital}
                        </p>
                        <p className="text-[7px] font-mono uppercase text-slate-500 truncate">
                          {tier.name.replace(' CARD', '')}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Quick start pill */}
                <button
                  type="button"
                  onClick={() => {
                    setCalcAmount(MIN_DEPOSIT);
                    goToSlide(2);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#E5C158]/10 border border-[#D4AF37]/30 rounded-xl py-2.5 text-[10px] font-mono font-bold text-[#E5C158] uppercase tracking-wider active:scale-[0.98] transition-all"
                >
                  Or Start with ₹{MIN_DEPOSIT} Deposit <span>➔</span>
                </button>
              </div>
            )}

            {/* ── SLIDE 3: INTERACTIVE PROFIT CALCULATOR ── */}
            {currentSlide === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-black tracking-tight text-white leading-tight">
                    See Your Profit Add Up
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
                    Move the sliders to project how your money could grow.
                  </p>
                </div>

                <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5C158] font-bold">
                      Profit Calculator
                    </p>
                    <span className="text-[11px] font-mono font-bold text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-lg tabular-nums">
                      {monthlyRate.toFixed(1)}% / Month
                    </span>
                  </div>

                  {/* Amount slider — ₹100 to ₹1,00,000 */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Amount
                      </span>
                      <span className="text-xs font-mono font-bold text-white tabular-nums">
                        ₹{fmt(calcAmount)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_DEPOSIT}
                      max="100000"
                      step="100"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(parseInt(e.target.value, 10))}
                      className="w-full accent-[#E5C158] cursor-pointer h-2 bg-[#11161A] rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                      <span>₹{MIN_DEPOSIT} Min</span>
                      <span className="text-[#E5C158] font-bold">₹1,00,000 Max</span>
                    </div>
                  </div>

                  {/* Rate slider — 3.5% to 8.0% */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Monthly Rate
                      </span>
                      <span className="text-xs font-mono font-bold text-[#E5C158] tabular-nums">
                        {monthlyRate.toFixed(1)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3.5"
                      max="8.0"
                      step="0.1"
                      value={monthlyRate}
                      onChange={(e) => setMonthlyRate(parseFloat(e.target.value))}
                      className="w-full accent-[#E5C158] cursor-pointer h-2 bg-[#11161A] rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                      <span>3.5% Min</span>
                      <span className="text-[#E5C158] font-bold">8.0% Max</span>
                    </div>
                  </div>

                  {/* Animated SVG growth curve */}
                  <div className="mt-4 bg-[#090C0E] rounded-xl p-2.5 border border-white/[0.08]">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-16">
                      <defs>
                        <linearGradient id="walkthroughCurve" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E5C158" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#E5C158" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`}
                        fill="url(#walkthroughCurve)"
                        className="transition-all duration-300"
                      />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#E5C158"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        className="transition-all duration-300"
                      />
                    </svg>
                  </div>

                  {/* Outputs */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                    <div className="bg-[#0D1114] border border-[#D4AF37]/30 rounded-xl p-2.5">
                      <p className="text-[8px] uppercase text-[#E5C158] font-bold">Your Net 50% Profit (24M)</p>
                      <p className="font-black text-[#E5C158] mt-0.5 tabular-nums">+₹{fmt(netProfit24m)}</p>
                    </div>
                    <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-2.5">
                      <p className="text-[8px] uppercase text-slate-400">Fixed Charges</p>
                      <p className="font-black text-emerald-400 mt-0.5 tabular-nums">₹0</p>
                    </div>
                  </div>

                  <p className="text-[9px] font-mono text-slate-500 mt-2 text-center">
                    Total gross profit over 24 months: <span className="text-white">₹{fmt(grossProfit24m)}</span> · Value:{' '}
                    <span className="text-white">₹{fmt(totalVal24m)}</span>
                  </p>
                </div>
              </div>
            )}

            {/* ── SLIDE 4: REFER & EARN + INSTANT SIGNUP ── */}
            {currentSlide === 3 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-black tracking-tight text-white leading-tight">
                    Refer Friends, <span className="text-[#E5C158]">Earn Rewards</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
                    Earn on two levels — no investment needed to start earning from referrals.
                  </p>
                </div>

                {/* 2-Level referral rewards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#11161A] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
                    <p className="text-[8px] font-mono text-[#E5C158] uppercase tracking-wider font-semibold">
                      Direct Referral
                    </p>
                    <p className="text-lg font-black font-mono text-white mt-0.5 tabular-nums">+₹200</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">When your friend joins</p>
                  </div>
                  <div className="bg-[#11161A] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
                    <p className="text-[8px] font-mono text-[#E5C158] uppercase tracking-wider font-semibold">
                      Level-2 Bonus
                    </p>
                    <p className="text-lg font-black font-mono text-white mt-0.5 tabular-nums">+₹100</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">When they activate ₹2,000+</p>
                  </div>
                </div>

                {/* Create Account card */}
                <div className="bg-[#11161A] border border-[#D4AF37]/30 rounded-2xl p-4">
                  <div className="text-center mb-3">
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">
                      Create Your Account
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Get ₹{fmt(WELCOME_BONUS)} bonus + start with just ₹{MIN_DEPOSIT}
                    </p>
                  </div>

                  {authError && (
                    <p className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-center mb-2">
                      {authError}
                    </p>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      required
                      className="w-full bg-[#090C0E] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#E5C158] outline-none font-mono"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      required
                      className="w-full bg-[#090C0E] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#E5C158] outline-none font-mono"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min 6 chars)"
                      minLength={6}
                      required
                      className="w-full bg-[#090C0E] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#E5C158] outline-none font-mono"
                    />

                    {refCode && (
                      <div className="bg-[#E5C158]/10 border border-[#D4AF37]/30 rounded-xl p-2 text-center text-[10px] font-mono text-[#E5C158]">
                        Referral Connected: <span className="font-bold text-white">{refCode}</span>
                      </div>
                    )}

                    <label className="flex items-start gap-1.5 pt-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 accent-[#E5C158] cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-400">
                        I agree to the Terms &amp; 50/50 Profit-Sharing Policy.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-[#E5C158] to-[#C9A227] text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {loading ? 'Processing...' : 'Create Account & Get ₹1,000'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => finishWalkthrough(true)}
                    className="w-full text-center text-[10px] font-mono text-slate-400 hover:text-white mt-3 transition-colors"
                  >
                    Already registered? <span className="text-[#E5C158] font-bold underline">Sign In</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ─── BOTTOM CONTROLS ─── */}
        <footer className="relative z-10 max-w-md mx-auto w-full pt-4 space-y-3">
          <div className="flex justify-center items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentSlide === 0}
              className="text-[10px] font-mono text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1"
            >
              ← Back
            </button>
            {currentSlide < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex-1 bg-gradient-to-r from-[#E5C158] to-[#C9A227] text-black font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <span>➔</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => finishWalkthrough(false)}
                className="flex-1 text-[10px] font-mono text-slate-400 hover:text-white underline py-3.5"
              >
                Or view the full overview page
              </button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW 2: RETURNING USER (FULL OVERVIEW PAGE)
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#090C0E] text-[#E2E8F0] relative overflow-hidden font-sans tabular-nums pb-32">
      {/* Header */}
      <header className="relative z-10 max-w-md mx-auto px-5 pt-6 pb-4 flex justify-between items-center border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E5C158] to-[#8A7327] flex items-center justify-center font-black text-black text-sm">
            V
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white">VYOM NETWORK</h1>
            <p className="text-[8px] font-mono tracking-[0.25em] text-[#E5C158] uppercase -mt-0.5">
              Smart Wealth Growth
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setAuthError('');
            setIsSignInMode(true);
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#D4AF37]/30 hover:border-[#E5C158] bg-[#E5C158]/5 text-[#E5C158] hover:text-white transition-all active:scale-95"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-8 text-center">
        <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
          Smart Wealth Growth <span className="text-[#E5C158]">—</span> Powered by 50/50 Profit Sharing
        </h2>
        <p className="text-xs text-slate-400 mt-2.5 leading-relaxed max-w-sm mx-auto">
          We only make money when you make money. Start with as little as ₹{MIN_DEPOSIT}, grow steadily, and keep half of every rupee we earn for you.
        </p>
        <div className="flex justify-center mt-3">
          <span className="text-[10px] font-mono font-bold text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 rounded-full px-3 py-1.5 tracking-wide">
            ₹0 Fixed Fees • 50/50 Profit Share • ₹{MIN_DEPOSIT} Minimum
          </span>
        </div>
      </section>

      {/* Brushed-Metal Card Stack */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-7">
        <div className="flex justify-between items-center mb-3 px-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
            Choose Your Card
          </p>
          <span className="text-[10px] font-mono font-bold text-[#E5C158]">{selectedTier.tierCode}</span>
        </div>

        {/* Card Deck */}
        <div className="relative pt-2 pb-3">
          <div className="absolute top-0 left-5 right-5 h-20 rounded-2xl bg-white/[0.02] border border-white/[0.08] -translate-y-2 scale-[0.92] pointer-events-none" />
          <div className="absolute top-1 left-3 right-3 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.08] -translate-y-1 scale-[0.96] pointer-events-none" />

          {/* Active Card */}
          <div
            className={`metal-card relative rounded-2xl p-5 bg-gradient-to-br ${selectedTier.gradient} border ${selectedTier.edge} transition-all duration-300`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${selectedTier.badgeBg} uppercase`}>
                  {selectedTier.tierCode}
                </span>
                <h3 className="text-lg font-black tracking-wider text-white mt-2">
                  {selectedTier.name}
                </h3>
              </div>

              <div className="w-10 h-8 rounded-lg bg-gradient-to-br from-[#E5C158]/40 via-[#F5E6A8]/50 to-[#8A7327]/40 border border-[#E5C158]/40 p-1 flex flex-col justify-around">
                <div className="h-[1px] bg-black/50 w-full" />
                <div className="h-[1px] bg-black/50 w-full" />
                <div className="h-[1px] bg-black/50 w-full" />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Card Value
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-[#E5C158]">₹</span>
                <span className="text-3xl font-black font-mono tracking-tight text-white tabular-nums">
                  {fmt(selectedTier.capital)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.08] flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span>COMPOUNDS MONTHLY</span>
              <span className="text-[#E5C158] font-bold">
                {pct(selectedTier.monthlyRate)} MONTHLY GROSS YIELD
              </span>
            </div>
          </div>
        </div>

        {/* Tier Selector Buttons */}
        <div className="grid grid-cols-5 gap-1.5 mt-2 bg-[#11161A] p-1.5 rounded-2xl border border-white/[0.08]">
          {ALLOCATION_TIERS.map((tier) => {
            const isSelected = selectedTier.id === tier.id;
            return (
              <button
                type="button"
                key={tier.id}
                onClick={() => {
                  setSelectedTier(tier);
                  setCalcAmount(tier.capital);
                }}
                className={`py-2 px-1 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-[#E5C158]/15 border border-[#D4AF37]/40 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <p className="text-[9px] font-mono font-bold leading-tight">
                  ₹{tier.capital >= 1000 ? `${tier.capital / 1000}K` : tier.capital}
                </p>
                <p className="text-[7px] font-mono uppercase text-slate-500 mt-0.5 truncate">
                  {tier.name.replace(' CARD', '')}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Profit Calculator Section */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-6">
        <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5C158] font-bold">
              Profit Calculator
            </p>
            <span className="text-[11px] font-mono font-bold text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-lg tabular-nums">
              {monthlyRate.toFixed(1)}% / Month
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Move the sliders to project how your money could grow.
          </p>

          {/* Amount slider */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Amount</span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">₹{fmt(calcAmount)}</span>
            </div>
            <input
              type="range"
              min={MIN_DEPOSIT}
              max="100000"
              step="100"
              value={calcAmount}
              onChange={(e) => setCalcAmount(parseInt(e.target.value, 10))}
              className="w-full accent-[#E5C158] cursor-pointer h-2 bg-[#11161A] rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>₹{MIN_DEPOSIT} Min</span>
              <span className="text-[#E5C158] font-bold">₹1,00,000 Max</span>
            </div>
          </div>

          {/* Rate slider */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Monthly Rate</span>
              <span className="text-xs font-mono font-bold text-[#E5C158] tabular-nums">{monthlyRate.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="3.5"
              max="8.0"
              step="0.1"
              value={monthlyRate}
              onChange={(e) => setMonthlyRate(parseFloat(e.target.value))}
              className="w-full accent-[#E5C158] cursor-pointer h-2 bg-[#11161A] rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>3.5% Min</span>
              <span className="text-[#E5C158] font-bold">8.0% Max</span>
            </div>
          </div>

          {/* Dynamic SVG Curve */}
          <div className="mt-4 bg-[#090C0E] rounded-xl p-3 border border-white/[0.08] relative overflow-hidden">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-20">
              <defs>
                <linearGradient id="cyberCurveReturning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E5C158" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#E5C158" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={`${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`}
                fill="url(#cyberCurveReturning)"
                className="transition-all duration-300"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#E5C158"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-300"
              />
            </svg>
            <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1 border-t border-white/[0.08] pt-1">
              <span>Base: ₹{fmt(calcAmount)}</span>
              <span>12M: ₹{fmt(totalVal12m)}</span>
              <span className="text-[#E5C158] font-bold">24M: ₹{fmt(totalVal24m)}</span>
            </div>
          </div>

          {/* Accurate Net Profit Output */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <div className="bg-[#0D1114] border border-[#D4AF37]/30 rounded-xl p-3">
              <p className="text-[9px] font-mono uppercase text-[#E5C158] font-bold">Your Net 50% Profit (24M)</p>
              <p className="text-base font-black font-mono text-[#E5C158] mt-0.5 tabular-nums">+₹{fmt(netProfit24m)}</p>
              <span className="text-[8px] font-mono text-slate-400 mt-1 inline-block">
                Gross: ₹{fmt(grossProfit24m)}
              </span>
            </div>
            <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3">
              <p className="text-[9px] font-mono uppercase text-slate-400 font-bold">Fixed Charges</p>
              <p className="text-base font-black font-mono text-emerald-400 mt-0.5 tabular-nums">₹0</p>
              <span className="text-[8px] font-mono text-slate-400 mt-1 inline-block">
                Value in 12M: ₹{fmt(totalVal12m)}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic text-center mt-3 leading-relaxed">
            "No fixed fees. We only earn when you earn — 50/50 on every profit."
          </p>
        </div>
      </section>

      {/* 2-Level Referral Rewards Section */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-6">
        <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5C158] font-bold">
            Refer &amp; Earn
          </p>
          <h3 className="text-lg font-black text-white mt-1">2-Level Referral Rewards</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Invite friends and earn rewards — no investment needed to start earning from referrals.
          </p>

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-[#0D1114] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
              <p className="text-[9px] font-mono text-[#E5C158] uppercase tracking-wider font-semibold">
                Direct Referral
              </p>
              <p className="text-xl font-black font-mono text-white mt-1 tabular-nums">+₹200</p>
              <p className="text-[8px] text-slate-400 mt-1">When your friend joins</p>
            </div>
            <div className="bg-[#0D1114] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
              <p className="text-[9px] font-mono text-[#E5C158] uppercase tracking-wider font-semibold">
                Level-2 Bonus
              </p>
              <p className="text-xl font-black font-mono text-white mt-1 tabular-nums">+₹100</p>
              <p className="text-[8px] text-slate-400 mt-1">When they activate ₹2,000+</p>
            </div>
          </div>
        </div>
      </section>

      {/* Combined Sign Up / Sign In Form */}
      <section ref={formRef} className="relative z-10 max-w-md mx-auto px-5 pt-8">
        <div className="bg-[#11161A] border border-[#D4AF37]/30 rounded-2xl p-6">
          <div className="flex bg-[#090C0E] p-1 rounded-xl border border-white/[0.08] mb-5">
            <button
              type="button"
              onClick={() => { setIsSignInMode(false); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                !isSignInMode
                  ? 'bg-[#E5C158]/15 border border-[#D4AF37]/40 text-[#E5C158]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => { setIsSignInMode(true); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                isSignInMode
                  ? 'bg-[#E5C158]/15 border border-[#D4AF37]/40 text-[#E5C158]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>

          <div className="text-center mb-5">
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              {isSignInMode ? 'Sign In to Your Account' : 'Create Your Account'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isSignInMode
                ? 'Enter your email and password to continue.'
                : `Get ₹${fmt(WELCOME_BONUS)} welcome bonus + start with just ₹${MIN_DEPOSIT}.`}
            </p>
          </div>

          {authError && (
            <div className="mb-4 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isSignInMode && (
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E5C158]/70 text-sm">👤</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    required
                    className="w-full bg-[#090C0E] border border-white/[0.12] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:border-[#E5C158] outline-none transition-all font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E5C158]/70 text-sm">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                  className="w-full bg-[#090C0E] border border-white/[0.12] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:border-[#E5C158] outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E5C158]/70 text-sm">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                  className="w-full bg-[#090C0E] border border-white/[0.12] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:border-[#E5C158] outline-none transition-all font-mono"
                />
              </div>
            </div>

            {!isSignInMode && refCode && (
              <div className="bg-[#E5C158]/10 border border-[#D4AF37]/30 rounded-2xl p-3 text-center text-xs font-mono text-[#E5C158]">
                Referral Connected: <span className="font-bold text-white">{refCode}</span>
              </div>
            )}

            {!isSignInMode && (
              <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-[#E5C158] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  I agree to the Terms &amp; 50/50 Profit-Sharing Policy.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#E5C158] to-[#C9A227] text-black font-black py-4 rounded-2xl text-xs uppercase tracking-wider active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading
                ? 'Processing...'
                : isSignInMode
                ? 'Sign In to Your Account'
                : 'Create Account & Get ₹1,000'}
            </button>
          </form>

          <p className="text-[9px] font-mono text-slate-500 text-center mt-3.5 leading-relaxed">
            100% Transparent • Zero Fixed Fees • Profit-Only Sharing
          </p>
        </div>
      </section>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0D1114]/95 border-t border-white/[0.08] p-3.5">
        <div className="max-w-md mx-auto flex justify-center">
          <button
            type="button"
            onClick={() => {
              setAuthError('');
              setIsSignInMode(false);
              formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="w-full max-w-xs bg-gradient-to-r from-[#E5C158] to-[#C9A227] text-black font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider active:scale-95 transition-all text-center"
          >
            Get Started — ₹1,000 Bonus
          </button>
        </div>
      </div>
    </div>
  );
}
