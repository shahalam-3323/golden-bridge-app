import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const signed = (n) => `${Number(n) >= 0 ? '+' : '−'}₹${fmt(Math.abs(Number(n) || 0))}`;

export default function HomeTab({ onNavigate }) {
  const { userData, liveLedger } = useAuth();
  const [copied, setCopied] = useState(false);

  // ~60-point live buffer (one sample per second). Kept in a ref so the 1s
  // ledger ticker never loses history when userData re-renders.
  const seriesRef = useRef([]);
  const [series, setSeries] = useState([]);

  const totalValue = Number(liveLedger.totalPortfolio || 0);
  const baseAmount = Number(liveLedger.baseCapital || 0);
  const grossYield = Number(liveLedger.grossYield || 0);
  const gainPct = baseAmount > 0 ? (grossYield / baseAmount) * 100 : 0;
  const hasActiveNodes = baseAmount > 0;

  useEffect(() => {
    const next = [...seriesRef.current, totalValue].slice(-60);
    seriesRef.current = next;
    setSeries(next);
  }, [totalValue]);

  const activeCards = userData?.activeCards || [];
  const hasActiveCards = activeCards.length > 0;
  const lockedBonus = Number(userData?.lockedBonus || 1000);

  const referralCode = userData?.referralCode || 'VYOM-NODE';
  const shareLink = `https://t.me/vyom_network_bot/app?startapp=${referralCode}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Sparkline geometry (pure SVG, no external chart lib) ──
  const chart = useMemo(() => {
    const W = 300;
    const H = 70;
    const padY = 8;
    const data = series.length >= 2 ? series : [totalValue, totalValue];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pts = data.map((v, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * W : W;
      const y = padY + (1 - (v - min) / span) * (H - padY * 2);
      return [x, y];
    });
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${W} ${H} L0 ${H} Z`;
    const first = data[0] || 0;
    const last = data[data.length - 1] || 0;
    return {
      W,
      H,
      linePath,
      areaPath,
      min,
      max,
      lastMovement: last - (data[data.length - 2] ?? last),
      windowChangePct: first > 0 ? ((last - first) / first) * 100 : 0,
    };
  }, [series, totalValue]);

  return (
    <div className="px-5 pt-2 pb-4 space-y-4 animate-fadeIn font-sans">
      {/* 1. WELCOME BONUS BANNER — only when no capital node is active */}
      {!hasActiveNodes && (
        <div className="bg-[#11161A] border border-[#D4AF37]/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div className="flex-1">
              <h4 className="text-xs font-black text-[#E5C158] uppercase tracking-wider">
                ₹{lockedBonus.toLocaleString('en-IN')} Welcome Bonus Locked
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {hasActiveCards
                  ? 'Card audit pending — bonus unlocks on approval.'
                  : 'Koi bhi Card activate karke ya ₹100 se deposit karke unlock karein.'}
              </p>
              <button
                onClick={() => onNavigate('cards')}
                className="mt-3 w-full bg-[#E5C158] text-black font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                View Cards ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PORTFOLIO HERO CARD */}
      <div className="bg-[#11161A] border border-[#D4AF37]/25 rounded-2xl p-5 relative overflow-hidden">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-[#0D1114] border border-white/[0.08] rounded-full px-2.5 py-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasActiveNodes ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <span
              className={`text-[9px] font-mono font-bold uppercase tracking-[0.18em] ${
                hasActiveNodes ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {hasActiveNodes ? 'ACTIVE • EARNING LIVE' : 'STANDBY • AWAITING ACTIVATION'}
            </span>
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-slate-500">
            Volatility: <span className="text-emerald-400 font-bold">Low</span>
          </span>
        </div>

        {/* Base amount */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500">
            Base Amount
          </span>
          <span className="text-xs font-mono font-bold text-slate-200">
            ₹{fmt(baseAmount)}
            <span className="text-[9px] text-slate-500 font-normal"> incl. ₹1,000 bonus</span>
          </span>
        </div>

        {/* Total value + live gain badge */}
        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.25em] font-bold mt-4">
          Total Portfolio Value
        </p>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-400">₹</span>
            <span className="text-3xl font-black font-mono text-white tracking-tight">
              {fmt(totalValue)}
            </span>
          </div>
          <span
            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              gainPct >= 0
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                : 'text-red-400 bg-red-500/10 border-red-500/25'
            }`}
          >
            {gainPct >= 0 ? '+' : '−'}
            {Math.abs(gainPct).toFixed(2)}%
          </span>
        </div>

        {/* Sparkline */}
        <div className="mt-4">
          <svg
            viewBox={`0 0 ${chart.W} ${chart.H}`}
            preserveAspectRatio="none"
            className="w-full h-[70px]"
          >
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* subtle dashed gridlines */}
            <line x1="0" y1="18" x2={chart.W} y2="18" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="2 5" />
            <line x1="0" y1="35" x2={chart.W} y2="35" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="2 5" />
            <line x1="0" y1="52" x2={chart.W} y2="52" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="2 5" />
            <path d={chart.areaPath} fill="url(#sparkFill)" />
            <path
              d={chart.linePath}
              fill="none"
              stroke="#34D399"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] font-mono uppercase tracking-widest text-slate-600">60s ago</span>
            <span className="text-[8px] font-mono uppercase tracking-widest text-slate-600">Now</span>
          </div>
        </div>

        {/* 3-column metrics strip */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.08]">
          <div>
            <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Last Movement</p>
            <p
              className={`text-[11px] font-mono font-bold mt-0.5 ${
                chart.lastMovement >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {signed(chart.lastMovement)}
            </p>
          </div>
          <div className="border-x border-white/[0.08] px-2">
            <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Today's Range</p>
            <p className="text-[10px] font-mono font-bold text-slate-200 mt-0.5">
              ₹{fmt(chart.min)}–{fmt(chart.max)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Window Change</p>
            <p className="text-[11px] font-mono font-bold text-[#E5C158] mt-0.5">
              {chart.windowChangePct >= 0 ? '+' : '−'}
              {Math.abs(chart.windowChangePct).toFixed(3)}%
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <button
            onClick={() => onNavigate('cards')}
            className="bg-[#0D1114] border border-white/[0.08] text-slate-200 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all"
          >
            + Add Card
          </button>
          <button
            onClick={() => onNavigate('wallet')}
            className="bg-[#E5C158] text-black font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all"
          >
            Withdraw / Redeem
          </button>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
          <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3">
            <p className="text-[8px] font-mono uppercase text-slate-500">Live Profit Earned</p>
            <p className="text-sm font-black font-mono text-emerald-400 mt-0.5">₹{fmt(grossYield)}</p>
          </div>
          <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3">
            <p className="text-[8px] font-mono uppercase text-slate-500">Referral Earnings</p>
            <p className="text-sm font-black font-mono text-[#E5C158] mt-0.5">
              ₹{fmt(userData?.availableFund || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. REFER & EARN (2-Tier) */}
      <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-sm font-black text-white">Invite Friends &amp; Earn</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Har friend ke card activation par kamai
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg">
            {referralCode}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3 text-center">
            <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">
              Level 1 ({userData?.referralCount || 0} friends)
            </p>
            <p className="text-lg font-black font-mono text-white mt-1">+₹200</p>
            <p className="text-[8px] text-slate-500 mt-0.5">Per Direct Friend</p>
          </div>
          <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3 text-center">
            <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">
              Level 2 ({userData?.secondaryCount || 0} friends)
            </p>
            <p className="text-lg font-black font-mono text-white mt-1">+₹100</p>
            <p className="text-[8px] text-slate-500 mt-0.5">Per Friend's Friend</p>
          </div>
        </div>

        <button
          onClick={copyInvite}
          className="w-full bg-[#0D1114] border border-[#D4AF37]/30 text-[#E5C158] font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-[#E5C158]/10 active:scale-95 transition-all"
        >
          {copied ? '✓ Invite Link Copied' : '🔗 Copy Invite Link'}
        </button>
      </div>
    </div>
  );
}
