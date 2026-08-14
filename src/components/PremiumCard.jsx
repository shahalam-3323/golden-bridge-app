"use client";

import React from "react";

// ------------------------------ ICONS ------------------------------

function EmvChip() {
  return (
    <svg width="46" height="36" viewBox="0 0 46 36" fill="none" aria-hidden="true" className="drop-shadow-sm">
      <defs>
        <linearGradient id="chipBody" x1="0" y1="0" x2="46" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f9e9b0" />
          <stop offset="0.4" stopColor="#e6c15a" />
          <stop offset="0.7" stopColor="#b8860b" />
          <stop offset="1" stopColor="#f4d97a" />
        </linearGradient>
        <linearGradient id="chipShine" x1="0" y1="0" x2="46" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff8dc" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#e6c15a" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff8dc" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="45" height="35" rx="6" fill="url(#chipBody)" stroke="#8a6a12" strokeWidth="0.75" />
      <rect x="0.5" y="0.5" width="45" height="35" rx="6" fill="url(#chipShine)" opacity="0.35" />
      <g stroke="#8a6a12" strokeWidth="1.1" opacity="0.85">
        <line x1="15" y1="1" x2="15" y2="35" />
        <line x1="31" y1="1" x2="31" y2="35" />
        <line x1="0.5" y1="12" x2="46" y2="12" />
        <line x1="0.5" y1="24" x2="46" y2="24" />
        <rect x="15" y="12" width="16" height="12" fill="none" />
        <line x1="19" y1="12" x2="19" y2="24" strokeWidth="0.7" />
        <line x1="27" y1="12" x2="27" y2="24" strokeWidth="0.7" />
      </g>
    </svg>
  );
}

function ContactlessIcon({ color }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <g transform="rotate(90 13 13)" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.9">
        <path d="M6 6a10 10 0 0 1 0 14" />
        <path d="M10.5 8.5a6 6 0 0 1 0 9" />
        <path d="M15 11a2.5 2.5 0 0 1 0 4" />
      </g>
    </svg>
  );
}

function LockIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" fill={color} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------ THEME PRESETS ------------------------------

const THEMES = {
  silver: {
    label: "Silver",
    surface: "linear-gradient(135deg, #6b7280 0%, #cbd5e1 22%, #94a3b8 45%, #e2e8f0 60%, #64748b 82%, #9ca3af 100%)",
    ring: "rgba(226,232,240,0.55)",
    text: "#0f172a",
    subtext: "rgba(15,23,42,0.65)",
    accent: "#e2e8f0",
    fillBtn: "linear-gradient(135deg,#e2e8f0,#94a3b8)",
    fillBtnText: "#0f172a",
    outlineBtn: "rgba(226,232,240,0.5)",
  },
  gold: {
    label: "Gold",
    surface: "linear-gradient(135deg, #7a5a12 0%, #f6d365 20%, #b8860b 42%, #ffe9a8 58%, #9c6f14 80%, #d4af37 100%)",
    ring: "rgba(255,215,120,0.55)",
    text: "#1a1205",
    subtext: "rgba(26,18,5,0.7)",
    accent: "#ffd873",
    fillBtn: "linear-gradient(135deg,#ffe9a8,#c99a2e)",
    fillBtnText: "#1a1205",
    outlineBtn: "rgba(255,216,115,0.55)",
  },
  diamond: {
    label: "Diamond",
    surface: "linear-gradient(135deg, #0f2b3a 0%, #6ee7f5 20%, #38bdf8 42%, #a5f3fc 58%, #1e6b86 80%, #67e8f9 100%)",
    ring: "rgba(165,243,252,0.6)",
    text: "#04121a",
    subtext: "rgba(4,18,26,0.68)",
    accent: "#a5f3fc",
    fillBtn: "linear-gradient(135deg,#a5f3fc,#38bdf8)",
    fillBtnText: "#04121a",
    outlineBtn: "rgba(165,243,252,0.55)",
  },
  platinum: {
    label: "Platinum",
    surface: "linear-gradient(135deg, #3a3f47 0%, #d7dce3 22%, #9aa3ad 45%, #eef1f5 60%, #545b64 82%, #c3cad3 100%)",
    ring: "rgba(238,241,245,0.55)",
    text: "#111418",
    subtext: "rgba(17,20,24,0.66)",
    accent: "#eef1f5",
    fillBtn: "linear-gradient(135deg,#eef1f5,#9aa3ad)",
    fillBtnText: "#111418",
    outlineBtn: "rgba(238,241,245,0.5)",
  },
};

// ------------------------------ MAIN COMPONENT ------------------------------

export default function PremiumCard({
  card,
  currency = "INR",
  exchangeRate = 1,
  isLocked = false,
  onUnlock,
  userName = "Card Holder",
  liveProfitValue = 0,
  displayFlash = null,
  progressPercent = 0,
  targetPrice,
}) {
  const theme = THEMES[card?.color?.toLowerCase()] ?? THEMES.gold;
  const currencySymbol = currency === "USD" ? "$" : "₹";

  const displayPrice = isLocked ? card.initial : liveProfitValue;
  const convertedPrice = displayPrice * (currency === "USD" ? exchangeRate : 1);
  const finalTarget = card.target || targetPrice || 2000;
  const convertedTarget = finalTarget * (currency === "USD" ? exchangeRate : 1);

  const progressVal = card.target ? (displayPrice / card.target) * 100 : progressPercent;
  const clampedProgress = Math.max(0, Math.min(100, progressVal));

  const flashColor =
    displayFlash === "up" || displayFlash === "flash-up"
      ? "#10b981"
      : displayFlash === "down" || displayFlash === "flash-down"
      ? "#ef4444"
      : theme.text;

  const flashGlow =
    displayFlash === "up" || displayFlash === "flash-up"
      ? "0 0 10px rgba(16,185,129,0.8)"
      : displayFlash === "down" || displayFlash === "flash-down"
      ? "0 0 10px rgba(239,68,68,0.8)"
      : "none";

  return (
    <div className="w-full max-w-sm font-sans mx-auto mb-6">
      {/* ---------------------------- CARD ---------------------------- */}
      <div
        className="relative aspect-[1.586/1] w-full overflow-hidden rounded-3xl p-5 shadow-2xl transition-transform duration-300 hover:scale-[1.01]"
        style={{
          backgroundImage: theme.surface,
          boxShadow: `0 20px 45px -12px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.35), 0 0 0 1px ${theme.ring}`,
        }}
      >
        {/* Glossy diagonal shine */}
        <div
          className="pointer-events-none absolute -inset-y-8 -left-1/3 w-1/2 rotate-[20deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 55%, transparent 100%)",
            filter: "blur(1px)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.2), transparent 40%)" }}
          aria-hidden="true"
        />

        {/* Top Row */}
        <div className="relative flex items-start justify-between z-10">
          <div className="flex items-center gap-3">
            <EmvChip />
            <ContactlessIcon color={theme.text} />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: theme.text }}>
            {card.name || theme.label}
          </span>
        </div>

        {/* Live Profit */}
        <div className="relative mt-4 z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.subtext }}>
            LIVE PORTFOLIO VALUE
          </p>
          <p
            className="mt-0.5 text-2xl font-black tabular-nums transition-all duration-300"
            style={{
              color: flashColor,
              textShadow: flashGlow,
              letterSpacing: "-0.02em",
            }}
          >
            {currencySymbol}
            {convertedPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Progress Bar */}
        {!isLocked && (
          <div className="relative mt-2 z-10">
            <div className="mb-1 flex items-center justify-between text-[9px] font-bold" style={{ color: theme.subtext }}>
              <span>TARGET PROGRESS</span>
              <span className="tabular-nums">
                {clampedProgress.toFixed(0)}% · {currencySymbol}
                {convertedTarget.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/20 backdrop-blur-sm">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${clampedProgress}%`,
                  background: theme.text,
                  boxShadow: `0 0 8px ${theme.ring}`,
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom Row */}
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between z-10">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.subtext }}>
              VALID THRU
            </p>
            <p className="text-xs font-black tracking-wide" style={{ color: theme.text }}>24 MONTHS</p>
            <p className="text-[10px] font-medium tracking-wide mt-0.5" style={{ color: theme.text }}>{userName}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.subtext }}>
              DEPOSIT
            </p>
            <p className="text-xs font-black tracking-wide" style={{ color: theme.text }}>
              {currencySymbol}
              {(card.initial * (currency === "USD" ? exchangeRate : 1)).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
        </div>

        {/* Locked Overlay */}
        {isLocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 backdrop-blur-md bg-black/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-full shadow-lg" style={{ background: theme.surface }}>
              <LockIcon color={theme.text} />
            </div>
            <p className="text-xs font-bold text-white/90 mt-1">Premium Returns Locked</p>
            <p className="text-[10px] text-white/70">Unlock to trace live tracking profits</p>
          </div>
        )}
      </div>

      {/* ---------------------------- BUTTONS ---------------------------- */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onUnlock}
          className="flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.97] shadow-md hover:brightness-110"
          style={{
            backgroundImage: theme.surface,
            color: theme.text,
          }}
        >
          {isLocked ? "Unlock Card" : "Withdraw Now"}
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border py-3 text-xs font-bold uppercase tracking-wider text-white/80 transition-colors duration-150 hover:bg-white/5"
          style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.02)" }}
        >
          Details
        </button>
      </div>
    </div>
  );
}