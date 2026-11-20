import React, { useMemo, useRef, useState } from 'react';
import {
  useAuth,
  TIER_CONFIG,
  MIN_DEPOSIT,
  WELCOME_BONUS,
  PROFIT_SPLIT,
} from '../context/AuthContext';

const MIN_RATE_PERCENT = 3.5;
const MAX_RATE_PERCENT = 8.0;
const DEFAULT_RATE_PERCENT = 4.5;
const MAX_PASSWORD_LENGTH = 128;

const DEFAULT_TIERS = [
  { id: 'starter', capital: 2000, monthlyRate: 0.035 },
  { id: 'growth', capital: 5000, monthlyRate: 0.045 },
  { id: 'elite', capital: 10000, monthlyRate: 0.055 },
  { id: 'prime', capital: 50000, monthlyRate: 0.07 },
  { id: 'signature', capital: 100000, monthlyRate: 0.08 },
];

const TIER_PRESENTATION = {
  starter: {
    label: 'STARTER',
    code: 'TIER-I',
    metal: 'Brushed Emerald',
    accent: '#65C69C',
    border: 'rgba(101,198,156,.34)',
    background: 'linear-gradient(135deg,#123D30 0%,#10251E 55%,#0D1411 100%)',
  },
  growth: {
    label: 'GROWTH',
    code: 'TIER-II',
    metal: 'Satin Graphite',
    accent: '#B7C4BC',
    border: 'rgba(183,196,188,.28)',
    background: 'linear-gradient(135deg,#29332E 0%,#18211D 56%,#0D1411 100%)',
  },
  elite: {
    label: 'ELITE',
    code: 'TIER-III',
    metal: 'Dark Titanium',
    accent: '#D6C99B',
    border: 'rgba(214,201,155,.31)',
    background: 'linear-gradient(135deg,#343329 0%,#1D1D18 58%,#0D1411 100%)',
  },
  prime: {
    label: 'PRIME',
    code: 'TIER-IV',
    metal: 'Champagne Gold',
    accent: '#E5C158',
    border: 'rgba(229,193,88,.42)',
    background: 'linear-gradient(135deg,#463A20 0%,#262116 56%,#11120E 100%)',
  },
  signature: {
    label: 'SIGNATURE',
    code: 'TIER-V',
    metal: 'Obsidian Gold',
    accent: '#F0D88D',
    border: 'rgba(240,216,141,.5)',
    background: 'linear-gradient(135deg,#393126 0%,#1B1913 58%,#090B09 100%)',
  },
};

const TIER_ORDER = ['starter', 'growth', 'elite', 'prime', 'signature'];

function formatINR(value, maximumFractionDigits = 0) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(safeValue);
}

function toRatePercent(rate) {
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate) || numericRate <= 0) return null;
  // AuthContext's original WelcomePage treated monthlyRate as a decimal (0.04 = 4%).
  return numericRate <= 1 ? numericRate * 100 : numericRate;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getAllocationTiers() {
  const configured = TIER_CONFIG && typeof TIER_CONFIG === 'object'
    ? Object.values(TIER_CONFIG)
    : [];

  const validConfigured = configured
    .filter((tier) => tier && typeof tier === 'object' && tier.id)
    .map((tier) => {
      const id = String(tier.id).toLowerCase();
      const fallback = DEFAULT_TIERS.find((item) => item.id === id);
      const capital = Number(tier.capital ?? fallback?.capital);
      const configuredRate = tier.monthlyRate ?? fallback?.monthlyRate;
      const ratePercent = toRatePercent(configuredRate);
      const presentation = TIER_PRESENTATION[id] || {};

      return {
        ...tier,
        id,
        capital,
        monthlyRate: Number(configuredRate),
        ratePercent,
        ...presentation,
      };
    })
    .filter((tier) => Number.isFinite(tier.capital) && tier.capital > 0);

  const sourceTiers = validConfigured.length > 0
    ? validConfigured
    : DEFAULT_TIERS.map((tier) => ({
      ...tier,
      ratePercent: toRatePercent(tier.monthlyRate),
      ...TIER_PRESENTATION[tier.id],
    }));

  return sourceTiers.sort((a, b) => {
    const aIndex = TIER_ORDER.indexOf(a.id);
    const bIndex = TIER_ORDER.indexOf(b.id);
    return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
  });
}

const ALLOCATION_TIERS = getAllocationTiers();
const DEFAULT_TIER = ALLOCATION_TIERS.find((tier) => tier.id === 'prime')
  || ALLOCATION_TIERS[0]
  || {
    ...DEFAULT_TIERS[0],
    ratePercent: 3,
    ...TIER_PRESENTATION.starter,
  };

const WELCOME_ALLOCATION = Number.isFinite(Number(WELCOME_BONUS))
  ? Number(WELCOME_BONUS)
  : 1000;

const USER_PROFIT_SHARE = Number.isFinite(Number(PROFIT_SPLIT))
  ? clamp(Number(PROFIT_SPLIT), 0, 1)
  : 0.5;
const PLATFORM_PROFIT_SHARE = 1 - USER_PROFIT_SHARE;

function BrandMark() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5C158]/50 bg-gradient-to-br from-[#F2DC9B] via-[#D7B54D] to-[#806923] text-sm font-black text-[#10120D] shadow-[0_5px_20px_rgba(213,181,77,.14)]">
        V
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-black tracking-[.13em] text-white">VYOM NETWORK</p>
        <p className="mt-0.5 text-[7px] font-bold tracking-[.28em] text-[#D7BD73]">CAPITAL ARCHITECTURE</p>
      </div>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="relative mx-auto w-full max-w-[370px] overflow-hidden rounded-[28px]" aria-label="Emerald and champagne-gold wealth card illustration" role="img">
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(ellipse_at_50%_54%,rgba(28,95,66,.20),transparent_65%)]" />
      <svg viewBox="0 0 360 245" className="relative z-10 block h-auto w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vyomCardGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0A6248" />
            <stop offset=".48" stopColor="#064E3B" />
            <stop offset="1" stopColor="#10221B" />
          </linearGradient>
          <linearGradient id="vyomCardGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFF0B5" />
            <stop offset=".35" stopColor="#E5C158" />
            <stop offset=".72" stopColor="#A77C24" />
            <stop offset="1" stopColor="#F3D98B" />
          </linearGradient>
          <linearGradient id="vyomCoinFace" x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#F8E7A5" />
            <stop offset=".52" stopColor="#C49A3C" />
            <stop offset="1" stopColor="#75551D" />
          </linearGradient>
          <linearGradient id="vyomArc" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#8A6727" stopOpacity="0" />
            <stop offset=".5" stopColor="#E5C158" stopOpacity=".9" />
            <stop offset="1" stopColor="#F6E4A8" stopOpacity=".15" />
          </linearGradient>
          <filter id="vyomSoftShadow" x="-30%" y="-30%" width="160%" height="170%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="vyomMetalShadow" x="-30%" y="-30%" width="160%" height="170%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <ellipse cx="182" cy="213" rx="125" ry="12" fill="#000" opacity=".75" filter="url(#vyomSoftShadow)" />
        <path d="M18 166 C96 112 145 109 205 115 C262 121 300 92 343 37" fill="none" stroke="url(#vyomArc)" strokeWidth="1.6" opacity=".8" />
        <path d="M25 172 C104 118 150 118 211 120 C269 123 306 94 337 47" fill="none" stroke="#E5C158" strokeWidth=".55" opacity=".55" />

        {/* Three restrained bullion coins behind the metal card. */}
        <g transform="translate(104 82) rotate(-13)">
          <ellipse cx="0" cy="8" rx="27" ry="31" fill="#6F501D" opacity=".5" filter="url(#vyomMetalShadow)" />
          <ellipse cx="0" cy="4" rx="24" ry="28" fill="#8C6928" stroke="#E6C96E" strokeWidth="1.5" />
          <ellipse cx="0" cy="0" rx="21" ry="25" fill="url(#vyomCoinFace)" stroke="#FFF0B8" strokeWidth=".8" />
          <path d="M-10 8 L-4 -8 L2 8 L9 -8" fill="none" stroke="#77571E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
        </g>
        <g transform="translate(180 61) rotate(4)">
          <ellipse cx="0" cy="8" rx="28" ry="32" fill="#6F501D" opacity=".5" filter="url(#vyomMetalShadow)" />
          <ellipse cx="0" cy="4" rx="25" ry="29" fill="#8C6928" stroke="#E6C96E" strokeWidth="1.5" />
          <ellipse cx="0" cy="0" rx="22" ry="26" fill="url(#vyomCoinFace)" stroke="#FFF0B8" strokeWidth=".8" />
          <path d="M-10 8 L-4 -8 L2 8 L9 -8" fill="none" stroke="#77571E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
        </g>
        <g transform="translate(254 83) rotate(14)">
          <ellipse cx="0" cy="8" rx="27" ry="31" fill="#6F501D" opacity=".5" filter="url(#vyomMetalShadow)" />
          <ellipse cx="0" cy="4" rx="24" ry="28" fill="#8C6928" stroke="#E6C96E" strokeWidth="1.5" />
          <ellipse cx="0" cy="0" rx="21" ry="25" fill="url(#vyomCoinFace)" stroke="#FFF0B8" strokeWidth=".8" />
          <path d="M-10 8 L-4 -8 L2 8 L9 -8" fill="none" stroke="#77571E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
        </g>

        {/* Floating brushed-metal capital card. */}
        <g transform="translate(180 139) rotate(-7)">
          <rect x="-145" y="-69" width="290" height="146" rx="18" fill="#000" opacity=".78" filter="url(#vyomSoftShadow)" />
          <rect x="-143" y="-76" width="286" height="145" rx="17" fill="#080D0B" stroke="url(#vyomCardGold)" strokeWidth="2.2" />
          <rect x="-138" y="-71" width="276" height="135" rx="13" fill="url(#vyomCardGreen)" stroke="#8D7335" strokeWidth=".7" />
          <path d="M-130 -56 H130 M-130 -51 H130 M-130 -46 H130 M-130 -41 H130" stroke="#D4E2D8" strokeOpacity=".055" strokeWidth=".7" />
          <path d="M-132 43 H132 M-132 48 H132 M-132 53 H132" stroke="#E7D59B" strokeOpacity=".08" strokeWidth=".6" />
          <path d="M-134 -69 L-89 -69 L-132 -25 Z" fill="#D8BC67" opacity=".28" />
          <path d="M134 19 L92 64 L134 64 Z" fill="#D8BC67" opacity=".18" />

          {/* Minimalist engraved EMV chip. */}
          <rect x="-112" y="-33" width="39" height="31" rx="5" fill="url(#vyomCardGold)" stroke="#F5E5AC" strokeWidth=".8" />
          <path d="M-99 -33 V-2 M-86 -33 V-2 M-112 -23 H-73 M-112 -12 H-73" stroke="#775A25" strokeWidth=".8" opacity=".78" />
          <path d="M-105 -27 H-92 V-8 H-105 Z M-92 -27 H-80 V-8 H-92 Z" fill="none" stroke="#8D6B2B" strokeWidth=".55" />

          {/* Geometric vault emblem, no letters or numbers. */}
          <path d="M17 -43 L49 -25 L49 12 L17 31 L-15 12 L-15 -25 Z" fill="none" stroke="url(#vyomCardGold)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M17 -31 L38 -19 L38 7 L17 19 L-4 7 L-4 -19 Z" fill="none" stroke="#E5C158" strokeWidth="1.1" opacity=".8" />
          <circle cx="17" cy="-6" r="6" fill="none" stroke="#F4D987" strokeWidth="1.5" />
          <path d="M17 -12 V0 M11 -6 H23 M17 0 L26 8" fill="none" stroke="#F4D987" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M78 -54 L125 -54 M88 -48 L130 -48" stroke="#F5E6B4" strokeOpacity=".28" strokeWidth=".8" />
          <path d="M-126 57 H-85" stroke="#F0D98F" strokeWidth="1" opacity=".5" />
        </g>
      </svg>
    </div>
  );
}

function TierVisualCard({ tier }) {
  return (
    <div
      className="relative isolate overflow-hidden rounded-[22px] border p-5 shadow-[0_18px_45px_rgba(0,0,0,.32)]"
      style={{ background: tier.background || TIER_PRESENTATION.starter.background, borderColor: tier.border || 'rgba(229,193,88,.3)' }}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/[.07]" />
      <div className="pointer-events-none absolute -right-2 -top-8 h-28 w-28 rounded-full border border-white/[.05]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full border border-white/[.14] bg-black/20 px-2.5 py-1 text-[8px] font-bold tracking-[.18em] text-[#E7D6A4]">{tier.code || 'CAPITAL NODE'}</span>
          <h3 className="mt-3 text-lg font-black tracking-[.08em] text-white">{tier.label || String(tier.id).toUpperCase()}</h3>
          <p className="mt-1 text-[9px] uppercase tracking-[.18em] text-white/45">{tier.metal || 'Metal allocation card'}</p>
        </div>
        <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border border-[#E5C158]/45 bg-gradient-to-br from-[#E8D18B]/40 via-[#9A7E35]/25 to-[#282317]/50 shadow-inner">
          <div className="grid w-7 grid-cols-2 gap-[2px]">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className="h-2 rounded-[2px] border border-[#F3D98D]/50 bg-[#D3B75F]/35" />
            ))}
          </div>
        </div>
      </div>
      <div className="relative mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[.18em] text-white/45">Selected capital</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-white">₹{formatINR(tier.capital)}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-[.15em] text-white/45">Illustrative monthly rate</p>
          <p className="mt-1 text-sm font-black tabular-nums" style={{ color: tier.accent || '#E5C158' }}>
            {tier.ratePercent && tier.ratePercent >= MIN_RATE_PERCENT && tier.ratePercent <= MAX_RATE_PERCENT
              ? `${tier.ratePercent.toFixed(1)}%`
              : 'See rate policy'}
          </p>
        </div>
      </div>
      <div className="relative mt-4 border-t border-white/[.12] pt-3 text-[8px] uppercase tracking-[.15em] text-white/45">
        Capital plan · Programme terms aur market risk lagu honge
      </div>
    </div>
  );
}

function CapitalTierSelector({ selectedTier, onSelect }) {
  return (
    <div className="mt-3 grid grid-cols-5 gap-1.5 rounded-2xl border border-white/[.08] bg-[#101512] p-1.5">
      {ALLOCATION_TIERS.map((tier) => {
        const active = selectedTier.id === tier.id;
        return (
          <button
            type="button"
            key={tier.id}
            onClick={() => onSelect(tier)}
            aria-pressed={active}
            className={`min-w-0 rounded-xl border px-1 py-2.5 text-center transition-all ${active ? 'border-[#D7B54D]/45 bg-[#D7B54D]/[.13] text-white shadow-[inset_0_0_18px_rgba(215,181,77,.06)]' : 'border-transparent text-slate-400 hover:bg-white/[.04] hover:text-white'}`}
          >
            <span className={`mx-auto mb-1 block h-1.5 w-1.5 rounded-full ${active ? 'bg-[#E5C158]' : 'bg-slate-600'}`} />
            <span className="block truncate text-[8px] font-bold uppercase tracking-wide sm:text-[9px]">{tier.label || tier.id}</span>
            <span className="mt-1 block truncate text-[9px] font-black tabular-nums text-white sm:text-[10px]">₹{formatINR(tier.capital / 1000, 0)}K</span>
          </button>
        );
      })}
    </div>
  );
}

function GrowthCurve({ path }) {
  return (
    <div className="mt-4 rounded-xl border border-white/[.07] bg-[#090C0E] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-bold uppercase tracking-[.16em] text-slate-500">Example growth path</span>
        <span className="text-[8px] text-slate-600">24 months</span>
      </div>
      <svg viewBox="0 0 320 100" className="mt-2 h-[82px] w-full" role="img" aria-label="Illustrative compound-growth curve">
        <defs>
          <linearGradient id="vyomSinglePageCurve" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D7B54D" stopOpacity=".24" />
            <stop offset="100%" stopColor="#D7B54D" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L 320 100 L 0 100 Z`} fill="url(#vyomSinglePageCurve)" />
        <path d={path} fill="none" stroke="#D7B54D" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function RiskAndProfitDisclosure({ onReviewedChange, userSharePercent, platformSharePercent }) {
  return (
    <details
      className="group rounded-xl border border-[#D7B54D]/25 bg-[#D7B54D]/[.055] p-3"
      onToggle={(event) => { if (event.currentTarget.open) onReviewedChange(true); }}
    >
      <summary className="cursor-pointer list-none text-[10px] font-bold text-[#E6D49A]">
        <span className="flex items-center justify-between gap-2">
          Read risk & profit-sharing disclosure
          <span className="text-[#D7B54D] transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="mt-3 space-y-2 border-t border-white/[.08] pt-3 text-[10px] leading-relaxed text-slate-300">
        <p className="rounded-lg bg-white/[.04] p-2 text-emerald-100/80"><strong className="text-white">Simple summary:</strong> Capital par risk hai. Calculator sirf example dikhata hai. Profit-sharing aur redemption ke exact rules complete policy mein diye gaye hain.</p>
        <p><strong className="text-white">Profit-sharing:</strong> At eligible redemption, realised positive profit is allocated {userSharePercent}% to the user and {platformSharePercent}% to VYOM Network, according to the governing agreement. The split applies to profit, not automatically to the returned principal.</p>
        <p><strong className="text-white">Capital risk:</strong> Capital is at risk. Returns are not guaranteed. Actual results may be lower than any illustration, may be zero, and losses may reduce capital.</p>
        <p><strong className="text-white">Illustrations:</strong> Calculator values are hypothetical compounding examples, not forecasts, offers, or promised payouts. Taxes, eligibility, processing, redemption conditions and any other applicable terms are governed by the complete legal documents.</p>
        <p><strong className="text-white">Before proceeding:</strong> Read the complete Terms of Service, Risk Disclosure and Profit-Sharing Policy. This summary does not replace those documents.</p>
      </div>
    </details>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export default function WelcomePage({ refCode }) {
  const { signup, login, loginWithGoogle } = useAuth();
  const formRef = useRef(null);

  const [selectedTier, setSelectedTier] = useState(DEFAULT_TIER);
  const [calcAmount, setCalcAmount] = useState(DEFAULT_TIER.capital);
  const initialConfiguredRate = DEFAULT_TIER.ratePercent;
  const [monthlyRate, setMonthlyRate] = useState(
    initialConfiguredRate && initialConfiguredRate >= MIN_RATE_PERCENT && initialConfiguredRate <= MAX_RATE_PERCENT
      ? Number(initialConfiguredRate.toFixed(1))
      : DEFAULT_RATE_PERCENT,
  );

  const [isSignInMode, setIsSignInMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [disclosureOpened, setDisclosureOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const minCapital = Number.isFinite(Number(MIN_DEPOSIT)) ? Number(MIN_DEPOSIT) : 100;
  const maxCapital = ALLOCATION_TIERS.length > 0
    ? Math.max(...ALLOCATION_TIERS.map((tier) => tier.capital))
    : 100000;

  const rate = monthlyRate / 100;
  const safeAmount = Number.isFinite(Number(calcAmount)) ? Math.max(minCapital, Number(calcAmount)) : minCapital;
  const totalValue12m = safeAmount * Math.pow(1 + rate, 12);
  const totalValue24m = safeAmount * Math.pow(1 + rate, 24);

  const growthPath = useMemo(() => {
    const width = 320;
    const height = 100;
    const points = Array.from({ length: 25 }, (_, month) => safeAmount * Math.pow(1 + rate, month));
    const minimum = points[0];
    const maximum = points[points.length - 1];
    return points.map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - minimum) / (maximum - minimum || 1)) * (height - 18) - 8;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [safeAmount, rate]);

  const scrollToForm = (signIn = false) => {
    setAuthError('');
    setIsSignInMode(signIn);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectTier = (tier) => {
    setSelectedTier(tier);
    setCalcAmount(tier.capital);
    if (tier.ratePercent && tier.ratePercent >= MIN_RATE_PERCENT && tier.ratePercent <= MAX_RATE_PERCENT) {
      setMonthlyRate(Number(tier.ratePercent.toFixed(1)));
    }
  };

  const handleGoogleAuth = async () => {
    if (loading) return;
    setAuthError('');

    if (!isSignInMode) {
      if (!disclosureOpened) {
        setAuthError('Pehle risk disclosure open karke padhein aur neeche checkbox par tick karein.');
        return;
      }
      if (!agreed) {
        setAuthError('Google se account banane ke liye Terms aur Policy checkbox par tick karein.');
        return;
      }
    }

    if (typeof loginWithGoogle !== 'function') {
      setAuthError('Google sign-in is temporarily unavailable.');
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogle(refCode || null);
    } catch (error) {
      const code = error?.code || '';
      if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        setAuthError('Google sign-in popup band ho gaya. Dobara koshish karein.');
      } else if (code.includes('popup-blocked')) {
        setAuthError('Browser ne popup block kiya hai. Please allow popups and try again.');
      } else if (code.includes('account-exists-with-different-credential')) {
        setAuthError('Is email se pehle se ek account hai. Kripya Email/Password se Sign In karein.');
      } else if (code.includes('network-request-failed')) {
        setAuthError('Network error. Please check your internet connection.');
      } else {
        setAuthError(error?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setAuthError('');

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      setAuthError(`Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`);
      return;
    }

    if (!isSignInMode) {
      if (!cleanName) {
        setAuthError('Please enter your full name.');
        return;
      }
      if (!disclosureOpened) {
        setAuthError('Please open and review the risk and profit-sharing disclosure before agreeing.');
        return;
      }
      if (!agreed) {
        setAuthError('Please confirm that you have read and accepted the full terms.');
        return;
      }
    }

    if (typeof signup !== 'function' || typeof login !== 'function') {
      setAuthError('Authentication is temporarily unavailable. Please try again later.');
      return;
    }

    setLoading(true);
    try {
      if (isSignInMode) {
        await login(cleanEmail, password);
      } else {
        await signup(cleanEmail, password, cleanName, refCode || null);
      }
    } catch (error) {
      const code = error?.code || '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setAuthError('Invalid email or password. Please check and try again.');
      } else if (code.includes('invalid-email')) {
        setAuthError('Please enter a valid email address.');
      } else if (code.includes('email-already-in-use')) {
        setAuthError('This email is already registered. Please use Sign In.');
      } else if (code.includes('weak-password')) {
        setAuthError('Please choose a stronger password with at least 6 characters.');
      } else if (code.includes('too-many-requests')) {
        setAuthError('Too many attempts. Please wait a moment and try again.');
      } else if (code.includes('network-request-failed')) {
        setAuthError('Network error. Please check your internet connection.');
      } else {
        setAuthError(error?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const userSharePercent = Math.round(USER_PROFIT_SHARE * 100);
  const platformSharePercent = Math.round(PLATFORM_PROFIT_SHARE * 100);

  return (
    <div className="min-h-screen bg-[#090C0E] pb-28 font-sans text-[#F2F0E9] selection:bg-[#D7B54D]/25">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(26,73,52,.17),transparent_48%)]" />

      <header className="relative z-10 mx-auto flex max-w-lg items-center justify-between border-b border-white/[.07] px-5 pb-4 pt-5">
        <BrandMark />
        <button
          type="button"
          onClick={() => scrollToForm(true)}
          className="rounded-full border border-[#D7B54D]/35 bg-[#D7B54D]/[.06] px-4 py-2 text-[10px] font-bold text-[#E5C158] transition hover:bg-[#D7B54D]/[.12]"
        >
          Sign In
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-lg">
        {/* HERO: emotion first, short copy, no profit-sharing promotion. */}
        <section className="px-5 pt-7 text-center">
          <p className="text-[8px] font-bold uppercase tracking-[.3em] text-[#D7BD73]">A smarter way to plan your capital journey</p>
          <h1 className="mt-2 text-[29px] font-black leading-[1.08] tracking-tight text-white sm:text-[33px]">
            Your Goals. Your Growth<span className="text-[#D7B54D]">.</span>
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[#B7B4A9]">Apne goals ke hisaab se capital options samjhein aur soch-samajhkar aage badhein.</p>
          <div className="mt-2">
            <HeroArtwork />
          </div>
        </section>

        {/* WELCOME ALLOCATION: locked, idle means no growth. */}
        <section className="px-5 pt-2">
          <div className="rounded-[22px] border border-[#D7B54D]/30 bg-gradient-to-br from-[#18382B] via-[#11251D] to-[#0D1411] p-4 shadow-[0_14px_36px_rgba(0,0,0,.24)]">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border border-[#D7B54D]/35 bg-[#D7B54D]/[.09] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[.17em] text-[#E6D49A]">₹{formatINR(WELCOME_ALLOCATION)} Welcome Allocation</span>
              <span className="text-[8px] font-bold uppercase tracking-[.15em] text-emerald-100/55">Aapke vault mein reserved</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-[31px] font-black tracking-tight text-[#F0D88D]">₹{formatINR(WELCOME_ALLOCATION)}</p>
                <p className="text-[10px] text-emerald-50/70">Aapka welcome allocation.</p>
              </div>
              <div className="rounded-xl border border-[#D7B54D]/25 bg-black/20 px-3 py-2 text-right">
                <p className="text-[8px] uppercase tracking-wide text-emerald-100/50">Kab unlock hoga?</p>
                <p className="mt-1 text-[10px] font-bold text-white">First asset node activation</p>
              </div>
            </div>
            <p className="mt-3 border-t border-white/[.09] pt-2 text-[9px] leading-relaxed text-emerald-50/60">
              Yeh allocation locked rahega. Idle rehne par is par growth calculate nahi hoti. Pehla Capital Asset Node activate hone ke baad, programme terms ke mutabik yeh aapke capital base mein merge hoga.
            </p>
          </div>
        </section>

        {/* CAPITAL NODES. */}
        <section className="px-5 pt-7">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[.22em] text-[#D7BD73]">Aapke capital options</p>
              <h2 className="mt-1 text-xl font-black text-white">Choose Your Capital Plan</h2>
              <p className="mt-1 text-[10px] text-slate-500">Apne budget ke hisaab se capital level select karein.</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#D7B54D]/25 bg-[#D7B54D]/[.06] px-2.5 py-1 text-[8px] font-bold text-[#E5C158]">{selectedTier.code || 'CAPITAL NODE'}</span>
          </div>
          <TierVisualCard tier={selectedTier} />
          <CapitalTierSelector selectedTier={selectedTier} onSelect={selectTier} />
        </section>

        {/* CALCULATOR: illustrative gross scenario, no repeated 50/50 marketing. */}
        <section className="px-5 pt-7">
          <div className="rounded-[22px] border border-white/[.09] bg-gradient-to-b from-[#151A17] to-[#101412] p-4 shadow-[0_16px_40px_rgba(0,0,0,.2)] sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[.2em] text-[#D7BD73]">Scenario calculator</p>
                <h2 className="mt-1 text-lg font-black text-white">Apna Growth Scenario Dekhein</h2>
              </div>
              <span className="rounded-lg border border-[#D7B54D]/30 bg-[#D7B54D]/[.08] px-2.5 py-1.5 text-[10px] font-black tabular-nums text-[#E5C158]">{monthlyRate.toFixed(1)}% / month</span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">Capital amount aur illustrative monthly rate badal kar ek hypothetical estimate dekhein.</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
                  <span>Capital amount</span>
                  <strong className="text-xs tabular-nums text-white">₹{formatINR(calcAmount)}</strong>
                </span>
                <input
                  type="range"
                  min={minCapital}
                  max={maxCapital}
                  step="100"
                  value={clamp(calcAmount, minCapital, maxCapital)}
                  onChange={(event) => setCalcAmount(Number.parseInt(event.target.value, 10))}
                  className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[.12] accent-[#D7B54D]"
                />
                <span className="mt-1 flex justify-between text-[8px] text-slate-600"><span>₹{formatINR(minCapital)} min</span><span>₹{formatINR(maxCapital)} max</span></span>
              </label>

              <label className="block">
                <span className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
                  <span>Illustrative monthly rate</span>
                  <strong className="text-xs tabular-nums text-[#E5C158]">{monthlyRate.toFixed(1)}%</strong>
                </span>
                <input
                  type="range"
                  min={MIN_RATE_PERCENT}
                  max={MAX_RATE_PERCENT}
                  step="0.1"
                  value={monthlyRate}
                  onChange={(event) => setMonthlyRate(Number.parseFloat(event.target.value))}
                  className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[.12] accent-[#D7B54D]"
                />
                <span className="mt-1 flex justify-between text-[8px] text-slate-600"><span>3.5%</span><span>8.0%</span></span>
              </label>
            </div>

            <GrowthCurve path={growthPath} />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#D7B54D]/25 bg-[#D7B54D]/[.055] p-3">
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#D7BD73]">Example value · 12 months</p>
                <p className="mt-1 text-lg font-black tabular-nums text-[#F0D88D]">₹{formatINR(totalValue12m)}</p>
              </div>
              <div className="rounded-xl border border-white/[.08] bg-black/15 p-3">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Example value · 24 months</p>
                <p className="mt-1 text-lg font-black tabular-nums text-white">₹{formatINR(totalValue24m)}</p>
              </div>
            </div>
            <p className="mt-3 text-center text-[8px] leading-relaxed text-slate-500">
              Yeh sirf samjhane ke liye hypothetical monthly-compounding example hai. Profit-sharing, tax aur applicable charges iske baad lagu ho sakte hain. Yeh guaranteed return ya promised payout nahi hai. Actual result kam, zero, ya negative bhi ho sakta hai.
            </p>
          </div>
        </section>

        {/* REFERRAL: secondary information, not the main hero message. */}
        <section className="px-5 pt-7">
          <div className="rounded-[22px] border border-white/[.08] bg-[#101512] p-4">
            <p className="text-[8px] font-bold uppercase tracking-[.2em] text-[#D7BD73]">Referral rewards</p>
            <h2 className="mt-1 text-lg font-black text-white">Invite Friends. Earn Eligible Rewards.</h2>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">Apne friends ko VYOM se invite karein. Referral rewards eligibility aur programme terms ke mutabik milte hain.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#D7B54D]/25 bg-[#D7B54D]/[.055] p-3 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#D7BD73]">Level 1 · Direct</p>
                <p className="mt-1 text-2xl font-black text-[#F0D88D]">+₹200</p>
              </div>
              <div className="rounded-xl border border-[#D7B54D]/25 bg-[#D7B54D]/[.055] p-3 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#D7BD73]">Level 2</p>
                <p className="mt-1 text-2xl font-black text-[#F0D88D]">+₹100</p>
              </div>
            </div>
          </div>
        </section>

        {/* ACCOUNT FORM AND LEGAL TERMS. */}
        <section ref={formRef} className="scroll-mt-5 px-5 pb-8 pt-8">
          <div className="rounded-[24px] border border-[#D7B54D]/30 bg-gradient-to-b from-[#151B17] to-[#0F1311] p-5 shadow-[0_18px_48px_rgba(0,0,0,.25)]">
            <div className="mb-5 flex rounded-xl border border-white/[.08] bg-[#090C0E] p-1">
              <button
                type="button"
                onClick={() => { setIsSignInMode(false); setAuthError(''); }}
                className={`flex-1 rounded-lg py-2.5 text-[10px] font-bold transition ${!isSignInMode ? 'bg-[#D7B54D]/[.14] text-[#E5C158]' : 'text-slate-500 hover:text-white'}`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setIsSignInMode(true); setAuthError(''); }}
                className={`flex-1 rounded-lg py-2.5 text-[10px] font-bold transition ${isSignInMode ? 'bg-[#D7B54D]/[.14] text-[#E5C158]' : 'text-slate-500 hover:text-white'}`}
              >
                Sign In
              </button>
            </div>

            <div className="mb-4 text-center">
              <p className="text-[8px] font-bold uppercase tracking-[.2em] text-[#D7BD73]">Aapka next step</p>
              <h2 className="mt-1 text-xl font-black text-white">{isSignInMode ? 'Welcome Back' : 'Create Your Account'}</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                {isSignInMode ? 'Continue karne ke liye apna registered email aur password enter karein.' : `₹${formatINR(WELCOME_ALLOCATION)} welcome allocation aapke vault mein reserve rahega.`}
              </p>
            </div>

            {authError && (
              <div role="alert" className="mb-4 rounded-xl border border-red-500/25 bg-red-500/[.08] p-3 text-center text-[10px] text-red-300">
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {!isSignInMode && (
                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Your full name</span>
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your full name"
                    maxLength={100}
                    required
                    className="w-full rounded-xl border border-white/[.11] bg-[#090C0E] px-4 py-3.5 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-[#D7B54D]/70"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Email address</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@email.com"
                  maxLength={254}
                  required
                  className="w-full rounded-xl border border-white/[.11] bg-[#090C0E] px-4 py-3.5 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-[#D7B54D]/70"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={isSignInMode ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                  className="w-full rounded-xl border border-white/[.11] bg-[#090C0E] px-4 py-3.5 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-[#D7B54D]/70"
                />
              </label>

              {!isSignInMode && refCode && (
                <div className="rounded-xl border border-[#D7B54D]/25 bg-[#D7B54D]/[.07] p-3 text-center text-[10px] text-[#E6D49A]">
                  Referral connected: <strong className="text-white">{refCode}</strong>
                </div>
              )}

              {!isSignInMode && (
                <div className="space-y-3 pt-1">
                  <RiskAndProfitDisclosure
                    onReviewedChange={setDisclosureOpened}
                    userSharePercent={userSharePercent}
                    platformSharePercent={platformSharePercent}
                  />
                  <label className="flex cursor-pointer items-start gap-2 text-[9px] leading-relaxed text-slate-400">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      className="mt-0.5 accent-[#D7B54D]"
                    />
                    <span>Maine risk disclosure padha hai aur complete Terms of Service aur Profit-Sharing Policy ko samajhkar accept karta/karti hoon.</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#E8D18B] via-[#D7B54D] to-[#B58D2D] py-4 text-[11px] font-black uppercase tracking-[.12em] text-[#10120F] shadow-[0_8px_26px_rgba(190,153,54,.14)] transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? 'Please wait…' : isSignInMode ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>

            {/* OR Divider + Continue with Google */}
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/[.08]" />
              <span className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">OR</span>
              <span className="h-px flex-1 bg-white/[.08]" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[.12] bg-[#090C0E] py-3.5 text-[11px] font-bold text-white transition hover:border-[#D7B54D]/45 hover:bg-white/[.04] active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <GoogleIcon />
              <span>{isSignInMode ? 'Sign in with Google' : 'Continue with Google'}</span>
            </button>

            <p className="mt-3 text-center text-[8px] leading-relaxed text-slate-600">
              Aapka capital risk mein hai. Calculator ke numbers guarantee nahi hain. Capital commit karne se pehle complete terms aur disclosures zaroor padhein.
            </p>
          </div>
        </section>
      </main>

      {/* Sticky CTA. Kept separate from the legal consent step. */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[.07] bg-[#090C0E]/95 p-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => scrollToForm(false)}
            className="w-full rounded-xl bg-gradient-to-r from-[#E8D18B] via-[#D7B54D] to-[#B58D2D] py-3.5 text-[11px] font-black uppercase tracking-[.12em] text-[#10120F] shadow-[0_6px_22px_rgba(190,153,54,.12)]"
          >
            {isSignInMode ? 'Continue to Sign In ↓' : 'Get Started ↓'}
          </button>
        </div>
      </div>
    </div>
  );
}