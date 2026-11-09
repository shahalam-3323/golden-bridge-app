import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const ALLOCATION_TIERS = [
  {
    id: 'starter',
    name: 'STARTER NODE',
    tierCode: 'TIER-I',
    capital: 2000,
    accent: '#00E5FF',
    borderGlow: 'border-cyan-500/40 shadow-[0_0_25px_rgba(0,229,255,0.15)]',
    gradient: 'from-[#07131D] via-[#0B1E2D] to-[#050C13]',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30',
  },
  {
    id: 'growth',
    name: 'GROWTH NODE',
    tierCode: 'TIER-II',
    capital: 5000,
    accent: '#00F5A0',
    borderGlow: 'border-emerald-400/40 shadow-[0_0_25px_rgba(0,245,160,0.15)]',
    gradient: 'from-[#061814] via-[#0A261F] to-[#040F0C]',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30',
  },
  {
    id: 'elite',
    name: 'ELITE NODE',
    tierCode: 'TIER-III',
    capital: 10000,
    accent: '#A855F7',
    borderGlow: 'border-purple-400/40 shadow-[0_0_25px_rgba(168,85,247,0.15)]',
    gradient: 'from-[#140B22] via-[#201138] to-[#0B0613]',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-400/30',
  },
  {
    id: 'prime',
    name: 'PRIME ASSET CARD',
    tierCode: 'TIER-IV (INSTITUTIONAL)',
    capital: 50000,
    accent: '#00E5FF',
    borderGlow: 'border-cyan-400/60 shadow-[0_0_35px_rgba(0,229,255,0.25)]',
    gradient: 'from-[#0A1726] via-[#10243C] to-[#050D17]',
    badgeBg: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/40',
  },
  {
    id: 'signature',
    name: 'SIGNATURE SOVEREIGN',
    tierCode: 'TIER-V (SOVEREIGN)',
    capital: 100000,
    accent: '#E2E8F0',
    borderGlow: 'border-slate-300/50 shadow-[0_0_30px_rgba(226,232,240,0.2)]',
    gradient: 'from-[#171E27] via-[#232D3B] to-[#0E131A]',
    badgeBg: 'bg-slate-300/15 text-slate-200 border-slate-300/30',
  },
];

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function WelcomePage({ refCode }) {
  const { signup, login } = useAuth();
  const formRef = useRef(null);

  // Authentication mode: 'register' (new node) or 'login' (existing operator)
  const [mode, setMode] = useState('register');

  // Default centerpiece: Prime Card (₹50,000)
  const [selectedTier, setSelectedTier] = useState(ALLOCATION_TIERS[3]);
  const [monthlyRate, setMonthlyRate] = useState(4.0); // Realistic 3.0% – 5.0%

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Compounding Calculations (50/50 Profit Split Engine)
  const capital = selectedTier.capital;
  const r = monthlyRate / 100;
  const grossGrowth24m = Math.round(capital * Math.pow(1 + r, 24) - capital);
  const userNetShare24m = Math.round(grossGrowth24m * 0.5); // 50% User Net Share
  const protocolReserve24m = Math.round(grossGrowth24m * 0.5); // 50% Platform Operational Reserve
  const totalUserPortfolio24m = capital + userNetShare24m;

  const grossGrowth12m = Math.round(capital * Math.pow(1 + r, 12) - capital);
  const userNetShare12m = Math.round(grossGrowth12m * 0.5);
  const totalUserPortfolio12m = capital + userNetShare12m;

  // SVG Exponential Curve points
  const curvePoints = Array.from({ length: 25 }, (_, m) => {
    const gross = capital * Math.pow(1 + r, m) - capital;
    return capital + gross * 0.5;
  });
  const maxVal = curvePoints[24];
  const minVal = capital;
  const svgWidth = 320;
  const svgHeight = 90;
  const pathD = curvePoints
    .map((v, i) => {
      const x = (i / 24) * svgWidth;
      const y = svgHeight - ((v - minVal) / (maxVal - minVal || 1)) * (svgHeight - 18) - 8;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleInitialize = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (mode === 'register' && !agreed) {
      setAuthError('You must acknowledge protocol parameters before initialization.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, fullName, refCode || null);
      }
    } catch (err) {
      const code = err?.code || '';
      if (mode === 'login') {
        setAuthError('Authentication failed. Verify your email and access key.');
      } else if (code.includes('email-already-in-use')) {
        setAuthError('This identifier is already registered. Please log in.');
      } else if (code.includes('weak-password')) {
        setAuthError('Access key must be at least 6 characters.');
      } else {
        setAuthError('Protocol initialization failed. Verify network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'register' ? 'login' : 'register'));
    setAuthError('');
  };

  return (
    <div className="min-h-screen bg-[#060B11] text-[#E2E8F0] relative overflow-hidden font-sans pb-32">
      {/* Cyber Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(to right, #00E5FF 1px, transparent 1px), linear-gradient(to bottom, #00E5FF 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Ambient Neon Lighting Orb */}
      <div className="fixed -top-40 left-1/2 -translate-x-1/2 w-[480px] h-[360px] bg-gradient-to-b from-[#00E5FF]/20 via-cyan-900/10 to-transparent rounded-full blur-[110px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-md mx-auto px-5 pt-6 pb-4 flex justify-between items-center border-b border-cyan-500/10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00E5FF] to-blue-600 flex items-center justify-center font-black text-black text-sm shadow-[0_0_15px_rgba(0,229,255,0.4)]">
            V
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white">VYOM NETWORK</h1>
            <p className="text-[8px] font-mono tracking-[0.25em] text-cyan-400 uppercase -mt-0.5">
              Capital Architecture
            </p>
          </div>
        </div>

        <button
          onClick={toggleMode}
          className="text-xs font-semibold px-4 py-1.5 rounded-full border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/30 text-cyan-200 hover:text-white transition-all shadow-[0_0_12px_rgba(0,229,255,0.15)] active:scale-95"
        >
          {mode === 'login' ? 'Create Account' : 'Access Portal'}
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-8 text-center">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-[10px] font-mono tracking-widest text-cyan-300 uppercase shadow-[0_0_15px_rgba(0,229,255,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          50/50 Profit-Sharing Protocol
        </span>

        <h2 className="text-2xl font-black tracking-tight text-white mt-4 leading-tight">
          Where Disciplined Capital <span className="text-cyan-400">|</span> Achieves Exponential Velocity
        </h2>
        <p className="text-xs text-slate-400 mt-2.5 leading-relaxed max-w-sm mx-auto">
          Markets fluctuate on emotion. Mathematics multiplies on discipline. Step inside an engineered trajectory where capital compounds with algorithmic precision.
        </p>
      </section>

      {/* 3D Cyber Wallet Card Stack */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-7">
        <div className="flex justify-between items-center mb-3 px-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
            Select Capital Asset Tier
          </p>
          <span className="text-[10px] font-mono font-bold text-cyan-400">{selectedTier.tierCode}</span>
        </div>

        {/* 3D Wallet Deck */}
        <div className="relative pt-2 pb-3">
          <div className="absolute top-0 left-5 right-5 h-20 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 -translate-y-2 scale-[0.92] pointer-events-none" />
          <div className="absolute top-1 left-3 right-3 h-20 rounded-2xl bg-cyan-500/[0.07] border border-cyan-500/25 -translate-y-1 scale-[0.96] pointer-events-none" />

          {/* Active Centerpiece Card */}
          <div
            className={`relative rounded-2xl p-5 bg-gradient-to-br ${selectedTier.gradient} border ${selectedTier.borderGlow} backdrop-blur-xl transition-all duration-300`}
          >
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className={`text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${selectedTier.badgeBg} uppercase`}>
                  {selectedTier.tierCode}
                </span>
                <h3 className="text-lg font-black tracking-wider text-white mt-2">
                  {selectedTier.name}
                </h3>
              </div>

              {/* Cyber Microchip */}
              <div className="w-10 h-8 rounded-lg bg-gradient-to-br from-cyan-400/40 via-cyan-200/60 to-cyan-600/30 border border-cyan-300/40 p-1 flex flex-col justify-around shadow-[0_0_12px_rgba(0,229,255,0.25)]">
                <div className="h-[1px] bg-black/50 w-full" />
                <div className="h-[1px] bg-black/50 w-full" />
                <div className="h-[1px] bg-black/50 w-full" />
              </div>
            </div>

            <div className="mt-5 relative z-10">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Allocated Capital Base
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-cyan-400">₹</span>
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  {fmt(selectedTier.capital)}
                </span>
                <span className="text-xs font-mono text-cyan-300/70 ml-1.5">UNITS</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-cyan-500/15 flex justify-between items-center text-[10px] font-mono text-slate-400 relative z-10">
              <span>HORIZON: 24 MONTHS</span>
              <span className="text-cyan-400 font-bold">3%–5% YIELD SPECTRUM</span>
            </div>
          </div>
        </div>

        {/* Tier Selector Buttons */}
        <div className="grid grid-cols-5 gap-1.5 mt-2 bg-[#0B121C]/90 p-1.5 rounded-2xl border border-cyan-500/20 backdrop-blur-md">
          {ALLOCATION_TIERS.map((tier) => {
            const isSelected = selectedTier.id === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier)}
                className={`py-2 px-1 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 border border-cyan-400 text-white shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <p className="text-[9px] font-mono font-bold leading-tight">
                  ₹{tier.capital >= 1000 ? `${tier.capital / 1000}K` : tier.capital}
                </p>
                <p className="text-[7px] font-mono uppercase text-slate-500 mt-0.5 truncate">
                  {tier.id}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3% - 5% Yield & 50/50 Profit Split Engine */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-6">
        <div className="bg-[#0B131E]/80 border border-cyan-500/25 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,229,255,0.08)] backdrop-blur-xl">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">
              Realistic Yield Calibrator
            </p>
            <span className="text-[11px] font-mono font-bold text-white bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,229,255,0.2)]">
              {monthlyRate.toFixed(1)}% / Month
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            50/50 Gross Profit Partnership: 0% Hidden Withdrawal Fees.
          </p>

          {/* Slider calibrated to 3.0% - 5.0% */}
          <div className="mt-4">
            <input
              type="range"
              min="3.0"
              max="5.0"
              step="0.1"
              value={monthlyRate}
              onChange={(e) => setMonthlyRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-[#121E2C] rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1.5">
              <span>3.0% Minimum</span>
              <span>4.0% Calibrated</span>
              <span className="text-cyan-400 font-bold">5.0% Maximum</span>
            </div>
          </div>

          {/* Trajectory Curve */}
          <div className="mt-4 bg-[#060D15] rounded-xl p-3 border border-cyan-500/20 relative overflow-hidden">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-20">
              <defs>
                <linearGradient id="cyberCurve" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={`${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`}
                fill="url(#cyberCurve)"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
              />
            </svg>
            <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1 border-t border-cyan-500/10 pt-1">
              <span>Base: ₹{fmt(capital)}</span>
              <span>12M Net: ₹{fmt(totalUserPortfolio12m)}</span>
              <span className="text-cyan-400 font-bold">24M Net: ₹{fmt(totalUserPortfolio24m)}</span>
            </div>
          </div>

          {/* 50/50 Profit Sharing Split Breakdown */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <div className="bg-[#0E1825] border border-cyan-400/40 rounded-xl p-3 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
              <p className="text-[9px] font-mono uppercase text-cyan-300 font-bold">Your Net Profit (50%)</p>
              <p className="text-base font-black font-mono text-cyan-400 mt-0.5">+₹{fmt(userNetShare24m)}</p>
              <span className="text-[8px] font-mono text-emerald-400 mt-1 inline-block font-bold">
                100% Unlocked for Redemption
              </span>
            </div>
            <div className="bg-[#0E1825] border border-cyan-500/20 rounded-xl p-3">
              <p className="text-[9px] font-mono uppercase text-slate-400">Platform Reserve (50%)</p>
              <p className="text-base font-bold font-mono text-slate-300 mt-0.5">₹{fmt(protocolReserve24m)}</p>
              <span className="text-[8px] font-mono text-slate-500 mt-1 inline-block">
                Liquidity & Operations
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic text-center mt-3 leading-relaxed">
            "The top 1% never gamble on luck. They construct deterministic yield architectures."
          </p>
        </div>
      </section>

      {/* 2-Tier Syndicate Matrix */}
      <section className="relative z-10 max-w-md mx-auto px-5 pt-6">
        <div className="bg-[#0B131E]/80 border border-cyan-500/25 rounded-2xl p-5 shadow-[0_0_25px_rgba(0,229,255,0.06)] backdrop-blur-xl">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">
            Network Velocity Engine
          </p>
          <h3 className="text-lg font-black text-white mt-1">Multi-Tier Capital Syndicate</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Accelerate your portfolio without personal capital deposits. Every onboarded tier multiplies your network allocation.
          </p>

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-[#0E1825] border border-cyan-400/30 rounded-xl p-3 text-center shadow-[0_0_15px_rgba(0,229,255,0.08)]">
              <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                Tier-1 Direct Node
              </p>
              <p className="text-xl font-black font-mono text-white mt-1">+200 VC</p>
              <p className="text-[8px] text-slate-400 mt-1">Instant Allocation Credit</p>
            </div>
            <div className="bg-[#0E1825] border border-cyan-400/30 rounded-xl p-3 text-center shadow-[0_0_15px_rgba(0,229,255,0.08)]">
              <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                Tier-2 Override
              </p>
              <p className="text-xl font-black font-mono text-white mt-1">+100 VC</p>
              <p className="text-[8px] text-slate-400 mt-1">Autonomous Syndicate Yield</p>
            </div>
          </div>
        </div>
      </section>

      {/* Account Initialization Form */}
      <section ref={formRef} className="relative z-10 max-w-md mx-auto px-5 pt-8">
        <div className="bg-[#0B131E]/90 border border-cyan-400/40 rounded-2xl p-6 shadow-[0_0_35px_rgba(0,229,255,0.12)] backdrop-blur-2xl">
          <div className="text-center mb-5">
            <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-300 uppercase bg-cyan-500/15 px-3.5 py-1 rounded-full border border-cyan-400/30 shadow-[0_0_10px_rgba(0,229,255,0.2)]">
              Protocol Gateway
            </span>
            <h3 className="text-xl font-black text-white mt-2.5">
              {mode === 'login' ? 'Access Your Terminal' : 'Set Up Your Account'}{' '}
              <span className="text-cyan-400">|</span>{' '}
              {mode === 'login' ? 'Secure Gateway' : 'Initialize Terminal'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login' ? (
                'Resume your compounding portfolio'
              ) : (
                <>
                  Allocating <span className="text-white font-bold">{selectedTier.name} (₹{fmt(selectedTier.capital)})</span>
                </>
              )}
            </p>
          </div>

          {authError && (
            <div className="mb-4 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleInitialize} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                  Full Legal Name / Sovereign Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/70 text-sm">👤</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Username / Full Name"
                    required
                    className="w-full bg-[#070D14]/90 border border-cyan-500/30 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,229,255,0.25)] outline-none transition-all font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                Official Email / Telegram Identifier
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/70 text-sm">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  required
                  className="w-full bg-[#070D14]/90 border border-cyan-500/30 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,229,255,0.25)] outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                Master Protocol Access Key (Password)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/70 text-sm">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 security characters"
                  minLength={6}
                  required
                  className="w-full bg-[#070D14]/90 border border-cyan-500/30 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,229,255,0.25)] outline-none transition-all font-mono"
                />
              </div>
            </div>

            {mode === 'register' && refCode && (
              <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-2xl p-3 text-center text-xs font-mono text-cyan-300">
                Sponsor Node Connected: <span className="font-bold text-white">{refCode}</span>
              </div>
            )}

            {mode === 'register' && (
              <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-cyan-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 leading-relaxed">
                  I acknowledge the 50/50 gross profit-sharing model and risk parameters.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,229,255,0.45)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading
                ? 'CALIBRATING TERMINAL...'
                : mode === 'login'
                ? 'SECURE GATE HANDSHAKE'
                : `INITIALIZE ${selectedTier.name} ACCESS`}
            </button>

            <button
              type="button"
              onClick={toggleMode}
              className="w-full text-center text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-cyan-300 transition-all"
            >
              {mode === 'login' ? 'New operator? Initialize a node' : 'Already registered? Access portal'}
            </button>
          </form>

          <p className="text-[9px] font-mono text-slate-500 text-center mt-3.5">
            Closed-Loop Financial Technology Protocol • Zero External Liability
          </p>
        </div>
      </section>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#060B11]/95 backdrop-blur-xl border-t border-cyan-500/20 p-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Active Selection</p>
            <p className="text-xs font-black font-mono text-cyan-300">{selectedTier.name} (₹{fmt(selectedTier.capital)})</p>
          </div>
          <button
            onClick={scrollToForm}
            className="bg-gradient-to-r from-[#00E5FF] to-[#00A3FF] text-black font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(0,229,255,0.35)]"
          >
            Claim Allocation
          </button>
        </div>
      </div>
    </div>
  );
}