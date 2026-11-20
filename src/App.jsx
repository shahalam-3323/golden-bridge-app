import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Layers,
  Bell,
  Users,
  Lock,
  CheckCircle2,
  Award,
  X,
  ArrowRight,
  RotateCcw,
  LogOut,
  Copy,
  Check,
  ShieldCheck,
  FastForward,
} from "lucide-react";

// ==========================================
// 1. UNIFIED PORTFOLIO LEVELS (CARDS AS TIERS)
// ==========================================
const LEVEL_TIERS = [
  {
    level: 0,
    id: "base",
    name: "SEED TIER",
    subtitle: "Entry Level",
    minPortfolio: 1000,
    minRate: 2,
    maxRate: 4,
    rateLabel: "2% – 4% / mo",
    accent: "#94A3B8",
    pros: ["1,000 VC se instant start", "Zero lock-in practice"],
    cons: ["Sabse kam compounding rate (2–4%)", "Higher tier perks locked"],
  },
  {
    level: 1,
    id: "emerald",
    name: "TIER I — EMERALD",
    subtitle: "10,000 VC Milestone",
    minPortfolio: 10000,
    minRate: 4,
    maxRate: 8,
    rateLabel: "4% – 8% / mo",
    accent: "#10B981",
    pros: ["2x better compounding band (4–8%)", "Monthly evaluation boost"],
    cons: ["4% minimum floor", "Titanium & Gold se kam max ceiling"],
  },
  {
    level: 2,
    id: "titanium",
    name: "TIER II — TITANIUM",
    subtitle: "50,000 VC Milestone",
    minPortfolio: 50000,
    minRate: 6,
    maxRate: 8,
    rateLabel: "6% – 8% / mo",
    accent: "#06B6D4",
    pros: ["Strong 6% minimum monthly floor", "Stable medium-high growth"],
    cons: ["Max ceiling 8% par capped", "Obsidian Gold (10%) abhi locked"],
  },
  {
    level: 3,
    id: "obsidian",
    name: "TIER III — OBSIDIAN GOLD",
    subtitle: "1,00,000 VC Milestone",
    minPortfolio: 100000,
    minRate: 6,
    maxRate: 10,
    rateLabel: "6% – 10% / mo",
    accent: "#D4AF37",
    pros: ["Maximum compounding band (6–10%)", "Highest VYOM Elite Status & full perks"],
    cons: ["1,00,000 VC maintain karne ka discipline zaroori"],
  },
];

const STORAGE_KEY = "vyom_sim_levels_v2";

// Helper: Portfolio value ke hisaab se current level nikalna
function getTierForPortfolio(value) {
  let current = LEVEL_TIERS[0];
  for (const tier of LEVEL_TIERS) {
    if (value >= tier.minPortfolio) current = tier;
  }
  return current;
}

// ==========================================
// 2. SHARP SVG LOGO
// ==========================================
function VyomLogo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="8"
        stroke="url(#vyomGoldGrad)"
        strokeWidth="1.5"
        fill="#07120E"
      />
      <path
        d="M11 13L20 29L29 13"
        stroke="#10B981"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="14" r="2.5" fill="#E5C158" />
      <defs>
        <linearGradient id="vyomGoldGrad" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#D4AF37" />
          <stop offset="1" stopColor="#064E3B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ==========================================
// 3. CUSTOM LIVE SVG CHART (ONLY FOR ACTIVE PORTFOLIO)
// ==========================================
function LiveSvgChart({ data, accent }) {
  const width = 340;
  const height = 135;
  const padX = 8;
  const padY = 12;

  const { pathD, areaD, lastX, lastY, minVal, maxVal } = useMemo(() => {
    const safeData = data.length > 1 ? data : [1000, 1000];
    const min = Math.min(...safeData);
    const max = Math.max(...safeData);
    const range = max - min || 1;

    const points = safeData.map((val, idx) => {
      const x = padX + (idx / (safeData.length - 1)) * (width - padX * 2);
      const y = height - padY - ((val - min) / range) * (height - padY * 2);
      return { x, y };
    });

    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${
      height - padY
    } L ${points[0].x.toFixed(1)} ${height - padY} Z`;

    const last = points[points.length - 1];
    return { pathD: line, areaD: area, lastX: last.x, lastY: last.y, minVal: min, maxVal: max };
  }, [data]);

  const gradId = `g-${accent.replace("#", "")}`;

  return (
    <div className="w-full select-none">
      <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1 px-1">
        <span>HIGH: {maxVal.toFixed(2)} VC</span>
        <span>LOW: {minVal.toFixed(2)} VC</span>
      </div>
      <div
        className="rounded-lg border border-white/10 bg-[#060908] p-2"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${gradId})`} />
          <path
            d={pathD}
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${accent}80)` }}
          />
          <circle cx={lastX} cy={lastY} r="3.5" fill="#fff" stroke={accent} strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

// ==========================================
// 4. MAIN APP
// ==========================================
export default function App() {
  const [userState, setUserState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  const [nameInput, setNameInput] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [unlockPopupTier, setUnlockPopupTier] = useState(null);
  const [copied, setCopied] = useState(false);

  // Save state
  useEffect(() => {
    if (userState) localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
  }, [userState]);

  const portfolioValue = userState?.portfolioVC || 1000;
  const currentTier = useMemo(() => getTierForPortfolio(portfolioValue), [portfolioValue]);
  const nextTier = useMemo(
    () => LEVEL_TIERS.find((t) => t.level === currentTier.level + 1) || null,
    [currentTier]
  );

  // Live 1-second visual fluctuation around the unified portfolio
  const [liveBuffer, setLiveBuffer] = useState(() =>
    Array.from({ length: 30 }, () => portfolioValue)
  );
  const [tickCount, setTickCount] = useState(0);

  useEffect(() => {
    setLiveBuffer((prev) => [...prev.slice(-29), portfolioValue]);
  }, [portfolioValue]);

  useEffect(() => {
    if (!userState) return;
    const timer = setInterval(() => {
      setTickCount((t) => t + 1);
      setLiveBuffer((prev) => {
        const last = prev[prev.length - 1] || portfolioValue;
        const avgMonthly = (currentTier.minRate + currentTier.maxRate) / 2 / 100;
        const microDrift = (avgMonthly / 2592000) * portfolioValue; // realistic per-sec fraction
        const wave = Math.sin(tickCount * 0.4) * (portfolioValue * 0.0004);
        const noise = (Math.random() - 0.46) * (portfolioValue * 0.0006);
        const nextVal = Math.max(portfolioValue * 0.98, last + microDrift + wave + noise);
        return [...prev.slice(-59), nextVal];
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [userState, portfolioValue, currentTier, tickCount]);

  // Start Sandbox
  const handleStart = (e) => {
    e.preventDefault();
    if (!agreed) return;
    setUserState({
      name: nameInput.trim() || "Explorer",
      portfolioVC: 1000,
      highestLevelUnlocked: 0,
      monthCount: 1,
      inviteCode: "VYOM-" + Math.floor(1000 + Math.random() * 9000),
      invitedCount: 0,
      notifications: [
        {
          id: Date.now(),
          text: "1,000 VC allocated. Reach 10,000 VC to unlock Tier I — Emerald (4%–8%/mo)!",
          unread: true,
        },
      ],
      history: [
        {
          id: Date.now(),
          title: "Welcome Portfolio Initialized",
          amount: "+1,000.00 VC",
          time: "Month 1",
        },
      ],
    });
  };

  // Monthly Compounding & Level Evaluation Engine
  const evaluateMonthlyCycle = (extraVC = 0, label = null) => {
    setUserState((prev) => {
      const prevTier = getTierForPortfolio(prev.portfolioVC);
      // Random monthly rate within user's CURRENT achieved tier range
      const ratePct =
        prevTier.minRate + Math.random() * (prevTier.maxRate - prevTier.minRate);
      const compounded = extraVC > 0 ? prev.portfolioVC + extraVC : prev.portfolioVC * (1 + ratePct / 100);
      const newVal = Number(compounded.toFixed(2));
      const newTier = getTierForPortfolio(newVal);

      const newNotifs = [...prev.notifications];
      if (newTier.level > prev.highestLevelUnlocked) {
        setUnlockPopupTier(newTier);
        newNotifs.unshift({
          id: Date.now() + 1,
          text: `🎉 ${newTier.name} Unlocked! New growth band: ${newTier.rateLabel}`,
          unread: true,
        });
      }

      return {
        ...prev,
        portfolioVC: newVal,
        highestLevelUnlocked: Math.max(prev.highestLevelUnlocked, newTier.level),
        monthCount: extraVC > 0 ? prev.monthCount : prev.monthCount + 1,
        notifications: newNotifs.slice(0, 15),
        history: [
          {
            id: Date.now(),
            title:
              label ||
              `Month ${prev.monthCount} Compounding (+${ratePct.toFixed(1)}% @ ${prevTier.name})`,
            amount: `${newVal.toLocaleString()} VC`,
            time: `Month ${prev.monthCount}`,
          },
          ...prev.history,
        ],
      };
    });
  };

  const unreadCount =
    userState?.notifications?.filter((n) => n.unread).length || 0;

  const progressToNext = nextTier
    ? Math.min(100, Math.round((portfolioValue / nextTier.minPortfolio) * 100))
    : 100;

  // ==========================================
  // WELCOME SCREEN
  // ==========================================
  if (!userState) {
    return (
      <div className="min-h-screen bg-[#060809] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/30 bg-[#0B0F0E] p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <VyomLogo size={48} />
            <h1 className="mt-3 text-lg font-semibold tracking-[0.2em] text-[#E5C158]">
              VYOM NETWORK
            </h1>
            <p className="text-[11px] tracking-[0.18em] text-emerald-400/80 mt-1">
              FROM INTENTION TO POSSIBILITY
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-4">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter display name..."
              className="w-full rounded-lg border border-white/10 bg-[#060809] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/60"
            />
            <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-emerald-500"
              />
              <span>
                I understand this is a{" "}
                <strong className="text-slate-200">Virtual Portfolio Simulation</strong>{" "}
                (VC only — patience & compounding tracker).
              </span>
            </label>
            <button
              type="submit"
              disabled={!agreed}
              className="w-full rounded-lg bg-gradient-to-r from-[#064E3B] to-[#10B981] py-2.5 text-sm font-semibold text-white"
            >
              Start Unified Portfolio (+1,000 VC)
            </button>
          </form>
        </div>
      </div>
    );
  }

  const displayLiveVal = liveBuffer[liveBuffer.length - 1] || portfolioValue;

  // ==========================================
  // MAIN SHELL
  // ==========================================
  return (
    <div className="min-h-screen bg-[#060809] text-slate-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#060809]/95 backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VyomLogo size={28} />
            <div>
              <div className="text-xs font-semibold tracking-widest text-[#E5C158]">
                VYOM SIM
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {currentTier.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              onClick={() => {
                setShowNotifDrawer(!showNotifDrawer);
                setUserState((p) => ({
                  ...p,
                  notifications: p.notifications.map((n) => ({ ...n, unread: false })),
                }));
              }}
              className="relative p-2 rounded-lg border border-white/10 text-slate-300 hover:border-white/25"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setUserState(null);
              }}
              title="Reset Sandbox"
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications Dropdown */}
        {showNotifDrawer && (
          <div className="max-w-md mx-auto px-4 pb-3">
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#0B0F0E] p-3 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-[#E5C158]">
                <span>NOTIFICATIONS</span>
                <button onClick={() => setShowNotifDrawer(false)}>
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
              {userState.notifications.map((n) => (
                <div
                  key={n.id}
                  className="text-xs text-slate-300 border-t border-white/5 pt-1.5"
                >
                  {n.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {/* ================= TAB 1: HOME (SINGLE UNIFIED PORTFOLIO) ================= */}
        {activeTab === "home" && (
          <div className="space-y-4">
            <div
              className="rounded-2xl border bg-[#0B0F0E] p-4 shadow-2xl space-y-4"
              style={{ borderColor: `${currentTier.accent}55` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] tracking-wider text-slate-400">
                    UNIFIED PORTFOLIO • MONTH {userState.monthCount}
                  </span>
                  <h2
                    className="text-sm font-bold tracking-wide"
                    style={{ color: currentTier.accent }}
                  >
                    {currentTier.name}
                  </h2>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                  style={{
                    borderColor: `${currentTier.accent}60`,
                    color: currentTier.accent,
                    backgroundColor: `${currentTier.accent}15`,
                  }}
                >
                  {currentTier.rateLabel}
                </span>
              </div>

              <div>
                <div className="text-3xl font-mono font-bold text-white tabular-nums">
                  {displayLiveVal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-sm font-normal text-[#D4AF37]">VC</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: currentTier.accent }}
                  />
                  <span className="text-[11px] text-slate-400">
                    LIVE COMPOUNDING SIMULATION
                  </span>
                </div>
              </div>

              <LiveSvgChart data={liveBuffer} accent={currentTier.accent} />

              {/* Next Level Motivation Bar */}
              {nextTier ? (
                <div className="rounded-xl border border-white/10 bg-[#070A09] p-3 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">
                      Next Goal:{" "}
                      <strong style={{ color: nextTier.accent }}>{nextTier.name}</strong>
                    </span>
                    <span className="font-mono text-white">
                      {progressToNext}% ({nextTier.minPortfolio.toLocaleString()} VC)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${progressToNext}%`,
                        backgroundColor: nextTier.accent,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center justify-between">
                    <span>Unlocks {nextTier.rateLabel} compounding rate</span>
                    <button
                      onClick={() => setActiveTab("cards")}
                      className="underline flex items-center gap-0.5"
                    >
                      Compare Tiers <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-3 text-xs text-[#E5C158]">
                  🏆 Maximum Tier Unlocked: <strong>Obsidian Gold (6%–10% / mo)</strong>
                </div>
              )}

              {/* Testing Controls to Test Monthly Evaluation & Milestone Unlocks */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => evaluateMonthlyCycle(0)}
                  className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 py-2.5 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 hover:bg-emerald-500/25"
                >
                  <FastForward className="w-3.5 h-3.5" /> Simulate +1 Month
                </button>
                <button
                  onClick={() =>
                    evaluateMonthlyCycle(5000, "Test Virtual Top-Up (+5,000 VC)")
                  }
                  className="rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 py-2.5 text-xs font-semibold text-[#E5C158] hover:bg-[#D4AF37]/20"
                >
                  + Add 5,000 VC (Test)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CARDS (LEVELS WITH PROS & CONS) ================= */}
        {activeTab === "cards" && (
          <div className="space-y-4">
            <div className="px-1">
              <h2 className="text-sm font-semibold tracking-wider text-white">
                PORTFOLIO ACHIEVEMENT LEVELS
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Aapka ek hi portfolio hai—jaise value badhegi, har mahine automatic naya level aur better growth rate unlock hoga.
              </p>
            </div>

            {LEVEL_TIERS.map((tier) => {
              const isUnlocked = portfolioValue >= tier.minPortfolio;
              const isCurrent = currentTier.id === tier.id;

              return (
                <div
                  key={tier.id}
                  className="rounded-2xl border bg-[#0B0F0E] p-4 space-y-3"
                  style={{
                    borderColor: isCurrent
                      ? tier.accent
                      : isUnlocked
                      ? `${tier.accent}40`
                      : "rgba(255,255,255,0.1)",
                  }}
                >
                  {/* Identical Premium Card Header (Chart only on Active Home) */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">
                        PORTFOLIO TARGET: {tier.minPortfolio.toLocaleString()} VC
                      </div>
                      <h3 className="text-sm font-bold" style={{ color: tier.accent }}>
                        {tier.name}
                      </h3>
                    </div>

                    {isCurrent ? (
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold text-black"
                        style={{ backgroundColor: tier.accent }}
                      >
                        ACTIVE LEVEL
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Achieved
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] border border-white/15 text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>

                  {/* Growth Rate Strip */}
                  <div className="rounded-lg border border-white/10 bg-[#070A09] px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Growth Rate Band</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {tier.rateLabel}
                    </span>
                  </div>

                  {/* Pros & Cons Comparison */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-1">
                      <div className="font-semibold text-emerald-400">PROS</div>
                      {tier.pros.map((p, i) => (
                        <div key={i} className="text-slate-300">
                          • {p}
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-1">
                      <div className="font-semibold text-amber-400">CONS</div>
                      {tier.cons.map((c, i) => (
                        <div key={i} className="text-slate-400">
                          • {c}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= TAB 3: NETWORK & HISTORY ================= */}
        {activeTab === "network" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#0B0F0E] p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-[#E5C158]">
                  SANDBOX REFERRAL BOOST
                </h2>
                <span className="text-xs text-emerald-400">+1,000 VC / Friend</span>
              </div>
              <p className="text-xs text-slate-400">
                Invite friends to speed up your virtual portfolio toward the next Tier Level.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-white/10 bg-[#060809] px-3 py-2 font-mono text-sm">
                  {userState.inviteCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(userState.inviteCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="px-3 py-2 rounded-lg border border-white/15 text-xs flex items-center gap-1"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => evaluateMonthlyCycle(1000, "Sandbox Friend Invite (+1,000 VC)")}
                className="text-xs text-emerald-400 underline"
              >
                + Simulate Friend Join (+1,000 VC)
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0B0F0E] p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-semibold text-slate-300">
                  MONTHLY EVALUATION & LEDGER
                </h3>
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    setUserState(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {userState.history.map((h) => (
                  <div
                    key={h.id}
                    className="flex justify-between items-center rounded-lg border border-white/5 bg-[#070A09] px-3 py-2"
                  >
                    <div>
                      <div className="text-xs text-slate-200">{h.title}</div>
                      <div className="text-[10px] text-slate-500">{h.time}</div>
                    </div>
                    <div className="text-xs font-mono font-semibold text-emerald-400">
                      {h.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* LEVEL UNLOCK CELEBRATION POPUP */}
      {unlockPopupTier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl border bg-[#0B0F0E] p-6 text-center space-y-4 shadow-2xl"
            style={{ borderColor: unlockPopupTier.accent }}
          >
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: `${unlockPopupTier.accent}20` }}
            >
              <Award className="w-6 h-6" style={{ color: unlockPopupTier.accent }} />
            </div>
            <div>
              <div className="text-[11px] tracking-widest text-emerald-400">
                NEW LEVEL UNLOCKED!
              </div>
              <h2
                className="text-xl font-bold mt-1"
                style={{ color: unlockPopupTier.accent }}
              >
                {unlockPopupTier.name}
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                Your patience paid off! Your unified portfolio now compounds at{" "}
                <strong className="text-white">{unlockPopupTier.rateLabel}</strong>.
              </p>
            </div>
            <button
              onClick={() => setUnlockPopupTier(null)}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-black"
              style={{ backgroundColor: unlockPopupTier.accent }}
            >
              Continue Compounding
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-[#060809]/95 backdrop-blur-md">
        <div className="max-w-md mx-auto grid grid-cols-3 h-16">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
              activeTab === "home" ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <Activity className="w-4 h-4" />
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("cards")}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
              activeTab === "cards" ? "text-[#E5C158]" : "text-slate-500"
            }`}
          >
            <Layers className="w-4 h-4" />
            Levels
          </button>
          <button
            onClick={() => setActiveTab("network")}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
              activeTab === "network" ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <Users className="w-4 h-4" />
            Network
          </button>
        </div>
      </nav>
    </div>
  );
}