import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  TrendingUp,
  Layers,
  Users,
  Scale,
  Info,
} from 'lucide-react';

// --- 5 CAPITAL CARD TIERS ---
const DECK_CARDS = [
  {
    id: 'growth',
    name: 'Growth',
    tier: 'TIER II',
    capital: '₹5,000',
    rate: '4.5%',
    bg: 'from-[#1E293B] via-[#131924] to-[#0A0D12]',
    border: 'border-slate-400/45',
    glow: '0 0 26px rgba(148,163,184,0.2)',
    textAccent: 'text-slate-200',
    rotate: -18,
    x: -74,
    y: 22,
    zIndex: 10,
  },
  {
    id: 'elite',
    name: 'Elite',
    tier: 'TIER III',
    capital: '₹10,000',
    rate: '5.5%',
    bg: 'from-[#1F2429] via-[#13161A] to-[#090A0C]',
    border: 'border-zinc-400/45',
    glow: '0 0 26px rgba(161,161,170,0.2)',
    textAccent: 'text-zinc-200',
    rotate: -9,
    x: -37,
    y: 8,
    zIndex: 20,
  },
  {
    id: 'starter',
    name: 'Starter',
    tier: 'TIER I',
    capital: '₹2,000',
    rate: '3.5%',
    bg: 'from-[#062C2B] via-[#071D1E] to-[#080C0E]',
    border: 'border-emerald-400/70',
    glow: '0 0 40px rgba(16,185,129,0.36)',
    textAccent: 'text-emerald-300',
    rotate: 0,
    x: 0,
    y: -6,
    zIndex: 30,
  },
  {
    id: 'prime',
    name: 'Prime',
    tier: 'TIER IV',
    capital: '₹50,000',
    rate: '7.0%',
    bg: 'from-[#29220A] via-[#171409] to-[#0B0B08]',
    border: 'border-amber-400/50',
    glow: '0 0 26px rgba(234,179,8,0.22)',
    textAccent: 'text-amber-300',
    rotate: 9,
    x: 37,
    y: 8,
    zIndex: 20,
  },
  {
    id: 'signature',
    name: 'Signature',
    tier: 'TIER V',
    capital: '₹1,00,000',
    rate: '8.0%',
    bg: 'from-[#2A200B] via-[#171208] to-[#0B0A08]',
    border: 'border-[#F0A818]/65',
    glow: '0 0 28px rgba(240,168,24,0.28)',
    textAccent: 'text-[#F0A818]',
    rotate: 18,
    x: 74,
    y: 22,
    zIndex: 10,
  },
];

// --- FEATURE POPOVER DETAILS ---
const FEATURE_DETAILS = {
  'wealth-growth': {
    badge: '3.5%–8.0% / mo',
    title: 'Live Wealth Growth',
    desc: 'Track monthly growth projections across all 5 structured Capital Cards.',
    bullets: [
      'Choose from 5 Capital Cards (Starter ₹2,000 up to Signature ₹1,00,000) with no limit on total cards.',
      'Monitor live fluctuations and 24-month compounding projections inside your dashboard.',
      'Displayed percentages are illustrative estimates governed by programme terms and risk policy.',
    ],
  },
  'card-tiers': {
    badge: '5 Cards • Unlimited',
    title: '5 Capital Card Tiers',
    desc: 'Select individual Capital Cards tailored to your capital plan.',
    bullets: [
      'Available cards: Starter (₹2,000), Growth (₹5,000), Elite (₹10,000), Prime (₹50,000), and Signature (₹1,00,000).',
      'Each account (one ID per email) can hold as many cards as you wish.',
    ],
  },
  'referral-bonus': {
    badge: 'Level 1 & 2',
    title: '2-Tier Referral Bonus',
    desc: 'Invite members and earn Level 1 & Level 2 referral bonuses on qualifying card activations.',
    bullets: [
      'Share your unique invite link to earn Level 1 bonuses on direct joins and Level 2 bonuses on indirect joins.',
      'Referral rewards credit transparently after audit verification.',
      'Subject to fair-use anti-abuse checks and active account rules.',
    ],
  },
  'profit-sharing': {
    badge: '50/50 Split',
    title: 'Transparent Profit Sharing',
    desc: '50/50 profit sharing with zero hidden fees and 2–48h admin-verified UPI payouts.',
    bullets: [
      'Profit is shared transparently: 50% to you and 50% to VYOM Network.',
      'Every card order, UTR check, and payout is recorded in your ledger.',
      'Approved UPI withdrawals process within 2 to 48 hours.',
    ],
  },
};

// --- LEGAL MODAL DETAILS ---
const LEGAL_DETAILS = {
  terms: {
    badge: 'Legal',
    title: 'Terms of Service',
    desc: 'Account rules, card portfolio, and settlement windows.',
    bullets: [
      'One account per email address. Capital is deployed via the 5 Capital Cards with no limit on how many cards you can buy.',
      'All card activations require valid UTR verification. Approved UPI settlement requests process within 2 to 48 hours.',
    ],
  },
  privacy: {
    badge: 'Privacy',
    title: 'Privacy Policy',
    desc: 'How your VYOM Network account and dashboard details are protected.',
    bullets: [
      'We store your name, email, referral metadata, and optional UPI/phone details solely to operate your VYOM account and process payouts.',
      'Authentication and ledger records are secured via Firebase Authentication and Firestore security rules.',
    ],
  },
  risk: {
    badge: 'Risk Policy',
    title: 'Risk Disclosure',
    desc: 'Important capital risk and profit-sharing disclosures.',
    bullets: [
      'Displayed monthly percentages are illustrative estimates, not guaranteed returns. Capital deployed carries risk.',
      'At eligible profit withdrawal, profit is allocated 50% to the user and 50% to VYOM Network.',
    ],
  },
};

export default function WelcomePage({ authContext, refCode }) {
  const [activeCardId, setActiveCardId] = useState('starter');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [modalData, setModalData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const selectedCard =
    DECK_CARDS.find((card) => card.id === activeCardId) || DECK_CARDS[2];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (modalData) {
        setModalData(null);
      } else if (isAuthOpen) {
        setIsAuthOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalData, isAuthOpen]);

  const showToastMsg = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const revealAuthFromDeck = (mode = 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
    setTimeout(() => {
      document
        .getElementById('stage-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const closeAuthToDeck = () => {
    setIsAuthOpen(false);
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setPassword('');
    setConfirmPassword('');
  };

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (authMode === 'signup' && password !== confirmPassword) {
      showToastMsg('Passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        if (typeof authContext?.signup !== 'function') {
          showToastMsg('Authentication service is not connected.');
          return;
        }
        await authContext.signup(email, password, fullName, refCode);
      } else {
        if (typeof authContext?.login !== 'function') {
          showToastMsg('Authentication service is not connected.');
          return;
        }
        await authContext.login(email, password);
      }
    } catch (err) {
      const rawMsg = err?.message || 'Authentication failed. Please try again.';
      showToastMsg(rawMsg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    if (typeof authContext?.loginWithGoogle !== 'function') {
      showToastMsg('Google sign-in is not connected.');
      return;
    }

    setLoading(true);
    try {
      await authContext.loginWithGoogle(refCode);
    } catch (err) {
      const rawMsg = err?.message || 'Google sign-in failed. Please try again.';
      showToastMsg(rawMsg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const openFeatureModal = (id) => {
    if (FEATURE_DETAILS[id]) setModalData(FEATURE_DETAILS[id]);
  };

  const openLegal = (id) => {
    if (LEGAL_DETAILS[id]) setModalData(LEGAL_DETAILS[id]);
  };

  return (
    <div className="min-h-screen bg-[#090D0C] text-white font-sans antialiased selection:bg-[#D4AF37] selection:text-black pb-28 overflow-x-hidden relative">
      <div className="fixed -top-28 left-1/2 -translate-x-1/2 w-[min(92vw,460px)] h-64 bg-emerald-500/[0.10] blur-[105px] rounded-full pointer-events-none z-0" />
      <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[340px] h-[220px] bg-[#D4AF37]/[0.08] blur-[100px] rounded-full pointer-events-none z-0" />

      <main className="max-w-md mx-auto px-4 pt-6 relative z-10">
        <header className="flex items-center justify-between border-b border-white/[0.07] pb-3 mb-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/55 bg-gradient-to-br from-[#F6D978] via-[#C99A22] to-[#76520C] shadow-[0_0_24px_rgba(212,175,55,0.22),inset_0_1px_1px_rgba(255,255,255,0.45)]">
              <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true">
                <path d="M8 9 L20 32 L32 9 L26 9 L20 22 L14 9 Z" fill="#111711" />
                <path d="M15 9 L20 19 L25 9 Z" fill="#F9E7A4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-extrabold tracking-[0.12em] text-white">
                VYOM NETWORK
              </h1>
              <p className="mt-0.5 truncate text-[8px] font-semibold tracking-[0.26em] text-[#D8BD70]">
                FROM INTENTION TO POSSIBILITY
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => revealAuthFromDeck('signin')}
            className="shrink-0 rounded-full border border-[#D4AF37]/45 bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold text-[#E8CB78] transition hover:bg-[#D4AF37]/10 active:scale-95"
          >
            Sign In
          </button>
        </header>

        <section className="text-center mb-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.30em] text-[#D4AF37]">
            Structured Capital Cards • One ID Per Email
          </p>
          <h2 className="mt-1 text-[clamp(26px,7vw,32px)] font-bold leading-[1.06] tracking-[-0.035em] text-white">
            Your Goals. <span className="text-[#E5C158]">Your Growth.</span>
          </h2>
          <p className="mx-auto mt-1.5 max-w-[330px] text-[11px] leading-snug text-[#A6B0AA]">
            Apne goals ke hisaab se capital card chunein aur step-by-step aage badhein.
          </p>
        </section>

        <section
          id="stage-section"
          className="relative flex flex-col items-center justify-center pt-2 pb-1"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-44 bg-[#D4AF37]/15 blur-3xl rounded-full pointer-events-none" />

          <div
            id="stage-container"
            style={{
              height: isAuthOpen ? (authMode === 'signup' ? '425px' : '315px') : '235px',
            }}
            className="relative w-full flex items-center justify-center transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <div
              id="auth-layer"
              style={{
                transform: isAuthOpen
                  ? 'translateY(0px) scale(1)'
                  : 'translateY(24px) scale(0.84)',
                opacity: isAuthOpen ? 1 : 0.52,
                zIndex: isAuthOpen ? 50 : 5,
                borderColor: isAuthOpen
                  ? 'rgba(212, 175, 55, 0.45)'
                  : 'rgba(255, 255, 255, 0.08)',
                boxShadow: isAuthOpen
                  ? '0 25px 70px rgba(0, 0, 0, 0.95)'
                  : 'none',
              }}
              className={`w-full max-w-[325px] bg-[#101714] border rounded-2xl p-4 backdrop-blur-xl relative transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isAuthOpen ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
              <button
                type="button"
                onClick={closeAuthToDeck}
                aria-label="Hide form"
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="text-center mb-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-[#D4AF37]">
                  VYOM NETWORK
                </p>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
                </h3>
                <p className="text-[10px] text-[#9AA69D] mt-0.5">
                  {authMode === 'signup'
                    ? 'Create your account to access your VYOM Dashboard'
                    : 'Sign in to access your VYOM Dashboard'}
                </p>
              </div>

              <form onSubmit={handleDemoSubmit} className="space-y-2">
                {authMode === 'signup' && (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Full Name"
                    className="w-full bg-[#090E0C] border border-white/10 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email address"
                  className="w-full bg-[#090E0C] border border-white/10 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Password (min. 6 characters)"
                  className="w-full bg-[#090E0C] border border-white/10 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                />
                {authMode === 'signup' && (
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Confirm Password"
                    className="w-full bg-[#090E0C] border border-white/10 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                  />
                )}
                {authMode === 'signup' && (
                  <label className="flex items-start gap-2 pt-0.5 text-[9px] leading-relaxed text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      required
                      className="mt-0.5 accent-[#D4AF37]"
                    />
                    <span>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => openLegal('terms')}
                        className="text-[#E5C158] underline"
                      >
                        Terms
                      </button>
                      ,{' '}
                      <button
                        type="button"
                        onClick={() => openLegal('privacy')}
                        className="text-[#E5C158] underline"
                      >
                        Privacy
                      </button>{' '}
                      &amp;{' '}
                      <button
                        type="button"
                        onClick={() => openLegal('risk')}
                        className="text-[#E5C158] underline"
                      >
                        Risk Disclosure
                      </button>
                      .
                    </span>
                  </label>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold py-2.5 rounded-xl text-xs transition active:scale-[0.98] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? 'Please wait...'
                    : authMode === 'signup'
                      ? 'Create Account'
                      : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full border border-white/15 bg-white/[0.03] py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 hover:bg-white/[0.06] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Continue with Google
                </button>
              </form>

              <p className="text-center text-[10px] text-[#9AA69D] mt-2.5">
                {authMode === 'signup' ? 'Already have an account?' : 'New to VYOM?'}
                <button
                  type="button"
                  onClick={() => switchAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                  className="text-[#E5C158] font-semibold hover:underline ml-1"
                >
                  {authMode === 'signup' ? 'Login' : 'Create Account'}
                </button>
              </p>
            </div>

            <div
              id="deck-layer"
              style={{
                transform: isAuthOpen
                  ? 'translateY(145px) scale(0.84)'
                  : 'translateY(8px) scale(1)',
                opacity: isAuthOpen ? 0.26 : 1,
                zIndex: isAuthOpen ? 10 : 25,
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            >
              <div className="relative w-36 h-48 flex items-center justify-center">
                {DECK_CARDS.map((card) => {
                  const isSelected = activeCardId === card.id;
                  const yPos = isSelected ? card.y - 14 : card.y;
                  const z = isSelected ? 35 : card.zIndex;
                  const scale = isSelected ? 1.05 : 1;
                  const borderClass = isSelected ? 'border-[#D4AF37]' : card.border;

                  return (
                    <button
                      type="button"
                      key={card.id}
                      onClick={() => setActiveCardId(card.id)}
                      style={{
                        zIndex: z,
                        boxShadow: card.glow,
                        transform: `translate(${card.x}px, ${yPos}px) rotate(${card.rotate}deg) scale(${scale})`,
                      }}
                      className={`pointer-events-auto absolute w-32 h-44 rounded-2xl bg-gradient-to-b ${card.bg} border ${borderClass} p-3 flex flex-col justify-between text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[8px] font-black tracking-widest uppercase ${card.textAccent}`}
                        >
                          {card.tier}
                        </span>
                        <span className="w-4 h-4 rounded bg-white/[0.06] flex items-center justify-center text-[9px] font-black text-[#F0A818]">
                          V
                        </span>
                      </div>
                      <div className="my-auto">
                        <p className={`text-sm font-extrabold tracking-tight ${card.textAccent}`}>
                          {card.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                          {card.capital}
                        </p>
                      </div>
                      <div className="pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[9px]">
                        <span className="text-zinc-500">Est. / mo</span>
                        <span className="font-bold text-white">{card.rate}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-2 min-h-[14px] text-center text-[10px] leading-tight text-[#A6B0AA]">
            <span className={`font-bold ${selectedCard?.textAccent}`}>{selectedCard?.name}</span>{' '}
            ({selectedCard?.capital}) · Est.{' '}
            <span className="font-semibold text-white">{selectedCard?.rate}/mo</span>
          </p>
        </section>

        <div className="my-4 flex items-center gap-2 relative z-30">
          <button
            type="button"
            onClick={() => revealAuthFromDeck('signup')}
            className="flex-1 min-h-[42px] bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-[0_8px_25px_rgba(212,175,55,0.22),inset_0_1px_0_rgba(255,255,255,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span>Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="min-h-[42px] flex items-center rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 text-[9px] font-semibold text-[#C6CFC8] shrink-0">
            <span className="text-[#E5C158]">5 Cards</span>
            <span className="mx-1.5 text-[#68736B]">•</span>
            <span>No Limit</span>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-3 py-2 text-center text-[10px] leading-tight text-[#DCCB9A]">
          Card-only capital selection · Buy <strong className="text-white">as many cards</strong> as you want
        </div>

        <section aria-label="VYOM Key Features" className="grid grid-cols-2 gap-2.5 relative z-10">
          <article className="flex flex-col rounded-xl border border-white/[0.09] bg-gradient-to-br from-[#14221B] to-[#101613] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-[10px] font-bold leading-tight text-white">
                  Live Wealth Growth
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openFeatureModal('wealth-growth')}
                aria-label="More details about Live Wealth Growth"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#A8B2AA] transition hover:border-[#D4AF37]/60 hover:text-white"
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <span className="mt-2 w-fit rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-emerald-300">
              3.5%–8.0% / mo
            </span>
            <p className="mt-1.5 text-[9.5px] leading-[1.38] text-[#AAB4AD]">
              Track live monthly projections across structured Capital Cards.
            </p>
          </article>

          <article className="flex flex-col rounded-xl border border-white/[0.09] bg-gradient-to-br from-[#14221B] to-[#101613] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#F0A818]/30 bg-[#F0A818]/10 text-[#F0A818]">
                  <Layers className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-[10px] font-bold leading-tight text-white">
                  5 Capital Card Tiers
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openFeatureModal('card-tiers')}
                aria-label="More details about 5 Capital Card Tiers"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#A8B2AA] transition hover:border-[#D4AF37]/60 hover:text-white"
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <span className="mt-2 w-fit rounded-full border border-[#F0A818]/30 bg-[#F0A818]/10 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#F0A818]">
              5 Cards • Unlimited
            </span>
            <p className="mt-1.5 text-[9.5px] leading-[1.38] text-[#AAB4AD]">
              Select Starter, Growth, Elite, Prime, or Signature cards anytime.
            </p>
          </article>

          <article className="flex flex-col rounded-xl border border-white/[0.09] bg-gradient-to-br from-[#14221B] to-[#101613] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-[10px] font-bold leading-tight text-white">
                  2-Tier Referral Bonus
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openFeatureModal('referral-bonus')}
                aria-label="More details about 2-Tier Referral Bonus"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#A8B2AA] transition hover:border-[#D4AF37]/60 hover:text-white"
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <span className="mt-2 w-fit rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-amber-300">
              Level 1 &amp; 2
            </span>
            <p className="mt-1.5 text-[9.5px] leading-[1.38] text-[#AAB4AD]">
              Earn Level 1 and Level 2 referral bonuses on qualifying activations.
            </p>
          </article>

          <article className="flex flex-col rounded-xl border border-white/[0.09] bg-gradient-to-br from-[#14221B] to-[#101613] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-400/10 text-sky-300">
                  <Scale className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-[10px] font-bold leading-tight text-white">
                  Transparent Profit Sharing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openFeatureModal('profit-sharing')}
                aria-label="More details about Transparent Profit Sharing"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#A8B2AA] transition hover:border-[#D4AF37]/60 hover:text-white"
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <span className="mt-2 w-fit rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-sky-300">
              50/50 Split
            </span>
            <p className="mt-1.5 text-[9.5px] leading-[1.38] text-[#AAB4AD]">
              50/50 profit split with zero hidden fees and 2–48h UPI payouts.
            </p>
          </article>
        </section>

        <footer className="mt-6 pt-4 border-t border-white/[0.08] text-center space-y-2">
          <div className="flex justify-center gap-2 text-[10px] text-[#AAB4AD]">
            <button
              type="button"
              onClick={() => openLegal('terms')}
              className="px-2.5 py-1 rounded-md bg-white/[0.035] border border-white/[0.09] hover:border-[#D4AF37]/40 hover:text-white transition"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => openLegal('privacy')}
              className="px-2.5 py-1 rounded-md bg-white/[0.035] border border-white/[0.09] hover:border-[#D4AF37]/40 hover:text-white transition"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => openLegal('risk')}
              className="px-2.5 py-1 rounded-md bg-white/[0.035] border border-white/[0.09] hover:border-[#D4AF37]/40 hover:text-white transition"
            >
              Risk Disclosure
            </button>
          </div>
          <p className="text-[9px] text-[#77837A]">
            Capital at risk • Illustrative projections only • Governed by Terms &amp; Risk Policy
          </p>
        </footer>
      </main>

      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-[#090D0C]/95 backdrop-blur-xl border-t border-white/[0.07] p-3.5 transition-opacity duration-300 ${
          isAuthOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => revealAuthFromDeck('signup')}
            className="w-full bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(212,175,55,0.22),inset_0_1px_0_rgba(255,255,255,0.45)]"
          >
            Create Account
          </button>
        </div>
      </div>

      {modalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setModalData(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/30 bg-[#101714] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className="inline-block rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#F0A818]">
                  {modalData.badge}
                </span>
                <h3 className="mt-1.5 text-sm font-bold text-white">{modalData.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalData(null)}
                aria-label="Close"
                className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-400 mb-3">{modalData.desc}</p>
            <ul className="space-y-2 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-zinc-300">
              {modalData.bullets.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#101714] border border-[#D4AF37] text-[#F0A818] px-4 py-2 rounded-full text-xs font-bold shadow-2xl transition-all duration-300 whitespace-nowrap ${
          showToast
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {toastMessage}
      </div>
    </div>
  );
}