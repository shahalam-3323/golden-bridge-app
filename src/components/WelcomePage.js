import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// Razor-sharp matte asset tiers mapped to the brushed-metal palette:
//   Starter            → Brushed Emerald
//   Growth/Elite/Prime → Brushed Titanium Slate
//   Signature          → Matte Obsidian (24K Gold foil)
const ALLOCATION_TIERS = [
  {
    id: 'starter',
    name: 'STARTER CARD',
    tierCode: 'TIER-I',
    capital: 2000,
    accent: '#34D399',
    edge: 'border-[#D4AF37]/30',
    gradient: 'from-[#064E3B] to-[#022C22]',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25',
  },
  {
    id: 'growth',
    name: 'GROWTH CARD',
    tierCode: 'TIER-II',
    capital: 5000,
    accent: '#CBD5E1',
    edge: 'border-white/[0.14]',
    gradient: 'from-[#1E293B] to-[#0F172A]',
    badgeBg: 'bg-slate-400/10 text-slate-300 border-slate-300/25',
  },
  {
    id: 'elite',
    name: 'ELITE CARD',
    tierCode: 'TIER-III',
    capital: 10000,
    accent: '#E2E8F0',
    edge: 'border-[#D4AF37]/25',
    gradient: 'from-[#1E293B] to-[#0F172A]',
    badgeBg: 'bg-slate-300/10 text-slate-200 border-slate-300/25',
  },
  {
    id: 'prime',
    name: 'PRIME CARD',
    tierCode: 'TIER-IV (INSTITUTIONAL)',
    capital: 50000,
    accent: '#E5C158',
    edge: 'border-[#D4AF37]/35',
    gradient: 'from-[#1E293B] to-[#0F172A]',
    badgeBg: 'bg-[#E5C158]/10 text-[#E5C158] border-[#D4AF37]/30',
  },
  {
    id: 'signature',
    name: 'SIGNATURE CARD',
    tierCode: 'TIER-V (SOVEREIGN)',
    capital: 100000,
    accent: '#E5C158',
    edge: 'border-[#D4AF37]/40',
    gradient: 'from-[#141414] to-[#070707]',
    badgeBg: 'bg-[#E5C158]/15 text-[#E5C158] border-[#D4AF37]/40',
  },
];

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

  // Shared Data States (100% Same Existing Data & Algo)
  const [selectedTier, setSelectedTier] = useState(ALLOCATION_TIERS[3]); // Default Prime Card
  const [monthlyRate, setMonthlyRate] = useState(4.0); // 3.5% – 8.0%
  const [isSignInMode, setIsSignInMode] = useState(false);

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Math Calculations (Full Compounding, Same Algo)
  const capital = selectedTier.capital;
  const r = monthlyRate / 100;
  const grossProfit24m = Math.round(capital * Math.pow(1 + r, 24) - capital);
  const totalVal24m = capital + grossProfit24m;

  const grossProfit12m = Math.round(capital * Math.pow(1 + r, 12) - capital);
  const totalVal12m = capital + grossProfit12m;

  // Memoized SVG Trajectory Curve
  const { pathD, svgWidth, svgHeight } = useMemo(() => {
    const width = 320;
    const height = 90;
    const points = Array.from({ length: 25 }, (_, m) => capital * Math.pow(1 + r, m));
    const max = points[24];
    const min = capital;

    const d = points
      .map((v, i) => {
        const x = (i / 24) * width;
        const y = height - ((v - min) / (max - min || 1)) * (height - 18) - 8;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    return { pathD: d, svgWidth: width, svgHeight: height };
  }, [capital, r]);

  const finishWalkthrough = (signIn = false) => {
    markWalkthroughSeen();
    setAuthError('');
    setHasSeenWalkthrough(true);
    setIsSignInMode(signIn);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
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
        setAuthError('Please enter your full legal name.');
        return;
      }
      if (!agreed) {
        setAuthError('You must acknowledge protocol parameters before initialization.');
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
  // VIEW 1: FIRST-TIME USER (MINIMALIST 4-SLIDE WALKTHROUGH)
  // ══════════════════════════════════════════════════════════════════
  if (!hasSeenWalkthrough) {
    return (
      <div className="min-h-screen bg-[#090C0E] text-[#E2E8F0] relative overflow-hidden font-sans tabular-nums flex flex-col justify-between p-5 selection:bg-[#E5C158]/25">
        {/* Top Minimal Bar */}
        <header className="relative z-10 flex justify-between items-center pt-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E5C158] to-[#8A7327] flex items-center justify-center font-black text-black text-xs">
              V
            </div>
            <span className="text-xs font-black tracking-wider text-white">VYOM NETWORK</span>
          </div>
          <button
            type="button"
            onClick={() => finishWalkthrough(true)}
            className="text-[11px] font-mono font-bold text-[#E5C158] hover:text-white px-3 py-1 rounded-full border border-[#D4AF37]/30 bg-[#E5C158]/5"
          >
            Sign In
          </button>
        </header>

        {/* ─── SLIDE CONTAINER ─── */}
        <main className="relative z-10 max-w-md mx-auto w-full my-auto py-6">
          {/* SLIDE 1: OUR EXACT ORIGINAL HERO & VISION */}
          {currentSlide === 0 && (
            <div className="space-y-6 animate-fadeIn text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-[#11161A] border border-[#D4AF37]/30 flex items-center justify-center text-3xl">
                💎
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
                  Where Disciplined Capital <span className="text-[#E5C158]">|</span> Achieves Exponential Velocity
                </h2>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-sm mx-auto">
                  Markets fluctuate on emotion. Mathematics multiplies on discipline. Step inside an engineered trajectory where capital compounds with algorithmic precision.
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 2: OUR EXACT 5 CARDS & SELECTOR */}
          {currentSlide === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  Select Asset Tier
                </p>
                <span className="text-[10px] font-mono font-bold text-[#E5C158]">{selectedTier.tierCode}</span>
              </div>

              {/* 3D Centerpiece Card */}
              <div className={`rounded-2xl p-5 bg-gradient-to-br ${selectedTier.gradient} border ${selectedTier.edge} relative overflow-hidden`}>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />
                <div className="flex justify-between items-start relative z-10">
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

                <div className="mt-5 relative z-10">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
                    Asset Allocation Value
                  </p>
                  <p className="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
                    ₹{fmt(selectedTier.capital)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.08] flex justify-between items-center text-[9px] font-mono text-slate-400 relative z-10">
                  <span>HORIZON: 24 MONTHS</span>
                  <span className="text-[#E5C158] font-bold">3.5%–8% MONTHLY YIELD</span>
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
                      onClick={() => setSelectedTier(tier)}
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
            </div>
          )}

          {/* SLIDE 3: OUR EXACT REALISTIC YIELD CALIBRATOR & SVG CURVE */}
          {currentSlide === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-5">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5C158] font-bold">
                    Realistic Yield Calibrator
                  </p>
                  <span className="text-[11px] font-mono font-bold text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-lg">
                    {monthlyRate.toFixed(1)}% / Month
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Calibrate trajectory to project your compounding capital horizon.
                </p>

                {/* 3.5% - 8.0% Slider */}
                <div className="mt-4">
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
                    <span>4.0% Calibrated</span>
                    <span className="text-[#E5C158] font-bold">8.0% Max</span>
                  </div>
                </div>

                {/* Dynamic SVG Curve */}
                <div className="mt-3 bg-[#090C0E] rounded-xl p-2.5 border border-white/[0.08]">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-16">
                    <defs>
                      <linearGradient id="walkthroughCurve" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E5C158" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#E5C158" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={`${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`} fill="url(#walkthroughCurve)" />
                    <path d={pathD} fill="none" stroke="#E5C158" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                  <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-2.5">
                    <p className="text-[8px] uppercase text-slate-400">12M Total Value</p>
                    <p className="font-bold text-white mt-0.5 tabular-nums">₹{fmt(totalVal12m)}</p>
                  </div>
                  <div className="bg-[#0D1114] border border-[#D4AF37]/30 rounded-xl p-2.5">
                    <p className="text-[8px] uppercase text-[#E5C158] font-bold">Your Gross Profit (24M)</p>
                    <p className="font-black text-[#E5C158] mt-0.5 tabular-nums">+₹{fmt(grossProfit24m)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: OUR EXACT SYNDICATE & DIRECT AUTH FORM */}
          {currentSlide === 3 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Syndicate Preview */}
              <div className="grid grid-cols-2 gap-2 bg-[#11161A] border border-white/[0.08] rounded-xl p-3 text-center">
                <div>
                  <p className="text-[8px] font-mono text-[#E5C158] uppercase">Tier-1 Direct Invite</p>
                  <p className="text-sm font-black font-mono text-white mt-0.5 tabular-nums">+₹200</p>
                </div>
                <div>
                  <p className="text-[8px] font-mono text-[#E5C158] uppercase">Tier-2 Syndicate</p>
                  <p className="text-sm font-black font-mono text-white mt-0.5 tabular-nums">+₹100</p>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-[#11161A] border border-[#D4AF37]/30 rounded-2xl p-4">
                <div className="text-center mb-3">
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Claim ₹1,000 Welcome Allocation
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Allocating {selectedTier.name} (₹{fmt(selectedTier.capital)})
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
                    placeholder="Full Legal Name"
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
                      Sponsor Connected: <span className="font-bold text-white">{refCode}</span>
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
                      I acknowledge protocol terms, risk disclosure, and mathematical compounding parameters.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#E5C158] to-[#C9A227] text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : '⚡ Claim ₹1,000 & Create Account'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>

        {/* ─── BOTTOM CONTROLS (PAGINATION DOTS & NEXT / GET STARTED) ─── */}
        <footer className="relative z-10 max-w-md mx-auto w-full pt-4 space-y-3">
          {/* Pagination Dots */}
          <div className="flex justify-center items-center gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <button
                type="button"
                key={idx}
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => {
                  setAuthError('');
                  setCurrentSlide(idx);
                }}
                className={`transition-all duration-300 rounded-full ${
                  currentSlide === idx
                    ? 'w-6 h-1.5 bg-gradient-to-r from-[#E5C158] to-[#C9A227]'
                    : 'w-1.5 h-1.5 bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Action Button: Next or Get Started */}
          <div className="flex justify-center">
            {currentSlide < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => prev + 1)}
                className="w-full bg-gradient-to-r from-[#E5C158] to-[#C9A227] text-black font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <span>➔</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => finishWalkthrough(false)}
                className="text-[10px] font-mono text-slate-400 hover:text-white underline pb-1"
              >
                Or View Full Overview Page
              </button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW 2: RETURNING USER (FULL EXISTING WELCOME PAGE DIRECTLY)
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
              Capital Architecture
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
          Where Disciplined Capital <span className="text-[#E5C158]">|</span> Achieves Exponential Velocity
        </h2>
        <p className="text-xs text-slate-400 mt-2.5 leading-relaxed max-w-sm mx-auto">
          Markets fluctuate on emotion. Mathematics multiplies on discipline. Step inside an engineered trajectory where capital compounds with algorithmic precision.
        </p>
      </section>

      {/* 3D Cyber Wallet Card Stack */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-7">
        <div className="flex justify-between items-center mb-3 px-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
            Select Asset Tier
          </p>
          <span className="text-[10px] font-mono font-bold text-[#E5C158]">{selectedTier.tierCode}</span>
        </div>

        {/* 3D Wallet Deck */}
        <div className="relative pt-2 pb-3">
          <div className="absolute top-0 left-5 right-5 h-20 rounded-2xl bg-white/[0.02] border border-white/[0.08] -translate-y-2 scale-[0.92] pointer-events-none" />
          <div className="absolute top-1 left-3 right-3 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.08] -translate-y-1 scale-[0.96] pointer-events-none" />

          {/* Active Card */}
          <div
            className={`relative rounded-2xl p-5 bg-gradient-to-br ${selectedTier.gradient} border ${selectedTier.edge} transition-all duration-300 overflow-hidden`}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />
            <div className="flex justify-between items-start relative z-10">
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

            <div className="mt-5 relative z-10">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Asset Allocation Value
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-[#E5C158]">₹</span>
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  {fmt(selectedTier.capital)}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">CAPITAL BASE</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.08] flex justify-between items-center text-[10px] font-mono text-slate-400 relative z-10">
              <span>HORIZON: 24 MONTHS</span>
              <span className="text-[#E5C158] font-bold">3.5%–8% MONTHLY YIELD</span>
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
                onClick={() => setSelectedTier(tier)}
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

      {/* Yield Calibrator & Gross Profit Section */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-6">
        <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5C158] font-bold">
              Realistic Yield Calibrator
            </p>
            <span className="text-[11px] font-mono font-bold text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-lg">
              {monthlyRate.toFixed(1)}% / Month
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Calibrate trajectory to project your compounding capital horizon.
          </p>

          {/* Slider */}
          <div className="mt-4">
            <input
              type="range"
              min="3.5"
              max="8.0"
              step="0.1"
              value={monthlyRate}
              onChange={(e) => setMonthlyRate(parseFloat(e.target.value))}
              className="w-full accent-[#E5C158] cursor-pointer h-2 bg-[#11161A] rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1.5">
              <span>3.5% Minimum</span>
              <span>4.0% Calibrated</span>
              <span className="text-[#E5C158] font-bold">8.0% Maximum</span>
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
              />
              <path
                d={pathD}
                fill="none"
                stroke="#E5C158"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1 border-t border-white/[0.08] pt-1">
              <span>Base: ₹{fmt(capital)}</span>
              <span>12M Valuation: ₹{fmt(totalVal12m)}</span>
              <span className="text-[#E5C158] font-bold">24M Valuation: ₹{fmt(totalVal24m)}</span>
            </div>
          </div>

          {/* Clean Accurate Gross Profit Output */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3">
              <p className="text-[9px] font-mono uppercase text-slate-400">12-Month Total Value</p>
              <p className="text-base font-bold font-mono text-white mt-0.5 tabular-nums">₹{fmt(totalVal12m)}</p>
              <span className="text-[8px] font-mono text-[#E5C158] mt-1 inline-block">
                +₹{fmt(grossProfit12m)} Gain
              </span>
            </div>
            <div className="bg-[#0D1114] border border-[#D4AF37]/30 rounded-xl p-3">
              <p className="text-[9px] font-mono uppercase text-[#E5C158] font-bold">Your Gross Profit (24M)</p>
              <p className="text-base font-black font-mono text-[#E5C158] mt-0.5 tabular-nums">+₹{fmt(grossProfit24m)}</p>
              <span className="text-[8px] font-mono text-emerald-400 mt-1 inline-block font-bold">
                Total Value: ₹{fmt(totalVal24m)}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic text-center mt-3 leading-relaxed">
            "The top 1% never gamble on luck. They construct deterministic yield architectures."
          </p>
        </div>
      </section>

      {/* 2-Tier Network Syndicate Section */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-6">
        <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5C158] font-bold">
            Network Velocity Engine
          </p>
          <h3 className="text-lg font-black text-white mt-1">Multi-Tier Capital Syndicate</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Accelerate your portfolio without personal capital deposits. Every onboarded invite multiplies your allocation.
          </p>

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-[#0D1114] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
              <p className="text-[9px] font-mono text-[#E5C158] uppercase tracking-wider font-semibold">
                Tier-1 Direct Invite
              </p>
              <p className="text-xl font-black font-mono text-white mt-1 tabular-nums">+₹200</p>
              <p className="text-[8px] text-slate-400 mt-1">Instant Allocation Credit</p>
            </div>
            <div className="bg-[#0D1114] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
              <p className="text-[9px] font-mono text-[#E5C158] uppercase tracking-wider font-semibold">
                Tier-2 Syndicate
              </p>
              <p className="text-xl font-black font-mono text-white mt-1 tabular-nums">+₹100</p>
              <p className="text-[8px] text-slate-400 mt-1">Autonomous Syndicate Yield</p>
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
              {isSignInMode ? 'Access Your Terminal' : 'Claim ₹1,000 Welcome Allocation'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isSignInMode
                ? 'Enter your credentials to access your operator console.'
                : '₹1,000 welcome capital will be locked and ready in your vault.'}
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
                  Full Legal Name / Handle
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
                Sponsor Connected: <span className="font-bold text-white">{refCode}</span>
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
                  I acknowledge protocol terms, risk disclosure, and mathematical compounding parameters.
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
                ? 'Sign In to Terminal'
                : '⚡ Claim ₹1,000 & Create Account'}
            </button>
          </form>

          <p className="text-[9px] font-mono text-slate-500 text-center mt-3.5 leading-relaxed">
            Closed-Loop Financial Technology Protocol • Zero External Liability
          </p>
        </div>
      </section>

      {/* Centered Sticky Bottom Bar */}
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
            Claim ₹1,000 Allocation Now
          </button>
        </div>
      </div>
    </div>
  );
}
