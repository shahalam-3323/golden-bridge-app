import React, { useState, useRef } from 'react';
import { useAuth, TIER_CONFIG } from '../context/AuthContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function HomeScreen() {
  const { userData, user, liveLedger, acquireCard } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activatingId, setActivatingId] = useState(null);
  const assetNodesRef = useRef(null);

  const scrollToAssetNodes = () => {
    assetNodesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeCards = userData?.activeCards || [];
  const hasActiveNodes = activeCards.length > 0;
  const lockedBonus = userData?.lockedBonus || 1000;
  const bonusUnlocked = userData?.bonusUnlocked || false;

  const operatorName =
    userData?.fullName && userData.fullName !== 'Syndicate Operator'
      ? userData.fullName
      : userData?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Operator';

  const referralCode = userData?.referralCode || 'VYOM-NODE';
  const shareLink = `https://t.me/vyom_network_bot/app?startapp=${referralCode}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivate = async (cardId) => {
    setActivatingId(cardId);
    await acquireCard(cardId);
    setActivatingId(null);
  };

  return (
    <div className="px-5 pt-2 pb-6 space-y-5 animate-fadeIn font-sans">
      {/* Background Cyber Grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, #00E5FF 1px, transparent 1px), linear-gradient(to bottom, #00E5FF 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      {/* Operator Status Header */}
      <div className="flex justify-between items-center bg-[#0B131E]/90 border border-cyan-500/20 rounded-2xl px-4 py-2.5 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.06)]">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400">
            Operator Console
          </p>
          <h2 className="text-sm font-black text-white mt-0.5 tracking-wide uppercase">
            {operatorName}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-[9px] font-mono tracking-widest text-cyan-300 font-bold uppercase shadow-[0_0_10px_rgba(0,229,255,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Synchronized
        </span>
      </div>

      {/* Locked Welcome Capital Alert (If 0 Cards Active) */}
      {!hasActiveNodes && (
        <div className="bg-[#121B28] border border-cyan-400/40 rounded-2xl p-4 shadow-[0_0_25px_rgba(0,229,255,0.12)]">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black font-mono text-cyan-300 uppercase tracking-wider">
                  ₹{fmt(lockedBonus)} VC Welcome Capital Locked
                </h4>
                <span className="text-[8px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-md">
                  Action Required
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Your 1,000 VC bonus is currently idle. Activate any capital node below to unlock this capital and ignite compounding yield.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero: Capital Vault & 50/50 Profit Split Dashboard */}
      <div className="bg-gradient-to-br from-[#0A1726] via-[#10243C] to-[#050D17] border border-cyan-400/40 rounded-2xl p-5 shadow-[0_0_35px_rgba(0,229,255,0.15)] relative overflow-hidden backdrop-blur-xl">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-[0.25em] font-bold">
              Total Capital Portfolio
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-cyan-400">₹</span>
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {fmt(liveLedger.totalPortfolio)}
              </span>
              <span className="text-xs font-mono text-cyan-300/80 ml-1.5">VC</span>
            </div>
          </div>
          <button
            onClick={scrollToAssetNodes}
            className="text-[11px] font-mono font-bold text-black bg-gradient-to-r from-[#00E5FF] to-[#00A3FF] rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(0,229,255,0.4)] active:scale-95 transition-all uppercase tracking-wider"
          >
            Vault
          </button>
        </div>

        {/* 50/50 Dual Stream Breakdown */}
        <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-cyan-500/15">
          <div className="bg-[#060D15]/80 border border-cyan-500/20 rounded-xl p-3">
            <p className="text-[8px] font-mono uppercase text-slate-400">Your Net Profit (50%)</p>
            <p className="text-sm font-black font-mono text-cyan-300 mt-0.5">₹{fmt(liveLedger.userNetYield)}</p>
            <span className="text-[8px] font-mono text-emerald-400 mt-0.5 inline-block">
              {hasActiveNodes ? '● Live Ticker (3-5%)' : 'Awaiting Node'}
            </span>
          </div>
          <div className="bg-[#060D15]/80 border border-cyan-500/20 rounded-xl p-3">
            <p className="text-[8px] font-mono uppercase text-slate-400">Syndicate Multiplier</p>
            <p className="text-sm font-black font-mono text-white mt-0.5">₹{fmt(userData?.availableFund || 0)}</p>
            <span className="text-[8px] font-mono text-cyan-400 mt-0.5 inline-block">
              L1 + L2 Overrides
            </span>
          </div>
        </div>
      </div>

      {/* 2-Tier Automated Syndicate Expansion Widget */}
      <div className="bg-[#0B131E]/90 border border-cyan-500/25 rounded-2xl p-5 shadow-[0_0_25px_rgba(0,229,255,0.08)] backdrop-blur-xl">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">
              Syndicate Matrix
            </p>
            <h3 className="text-sm font-black text-white mt-0.5">2-Tier Network Overrides</h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 px-2.5 py-1 rounded-lg">
            CODE: {referralCode}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-[#0E1825] border border-cyan-400/30 rounded-xl p-3 text-center">
            <p className="text-[8px] font-mono text-cyan-400 uppercase tracking-wider">
              Level-1 Nodes ({userData?.referralCount || 0})
            </p>
            <p className="text-lg font-black font-mono text-white mt-1">
              +{(userData?.referralCount || 0) * 200} VC
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">+200 VC Per Node</p>
          </div>
          <div className="bg-[#0E1825] border border-cyan-400/30 rounded-xl p-3 text-center">
            <p className="text-[8px] font-mono text-cyan-400 uppercase tracking-wider">
              Level-2 Syndicate ({userData?.secondaryCount || 0})
            </p>
            <p className="text-lg font-black font-mono text-white mt-1">
              +{(userData?.secondaryCount || 0) * 100} VC
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">+100 VC Autonomous</p>
          </div>
        </div>

        <button
          onClick={copyInvite}
          className="w-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-mono font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-cyan-500/25 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,229,255,0.15)] flex items-center justify-center gap-2"
        >
          <span>{copied ? '✓ SYNDICATE LINK COPIED' : '⚡ COPY TELEGRAM / WEB INVITE LINK'}</span>
        </button>
      </div>

      {/* Asset Nodes Grid (With One-Click Activation) */}
      <div ref={assetNodesRef} className="space-y-3 scroll-mt-24">
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 font-bold">
            Capital Asset Nodes
          </p>
          <span className="text-[10px] font-mono text-cyan-400">
            {activeCards.length} Active / {Object.keys(TIER_CONFIG).length} Total
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {Object.values(TIER_CONFIG).map((tier) => {
            const isActive = activeCards.includes(tier.id);
            return (
              <div
                key={tier.id}
                className={`bg-[#0B131E]/80 border ${
                  isActive ? 'border-cyan-400/40 shadow-[0_0_20px_rgba(0,229,255,0.1)]' : 'border-white/[0.06]'
                } rounded-2xl p-4 flex justify-between items-center backdrop-blur-xl`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono text-white">{tier.name}</span>
                    <span
                      className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      {isActive ? '● Active' : 'Locked'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono font-bold text-cyan-400 mt-1">
                    ₹{fmt(tier.capital)} Capital Base
                  </p>
                </div>

                {!isActive ? (
                  <button
                    onClick={() => handleActivate(tier.id)}
                    disabled={activatingId === tier.id}
                    className="bg-gradient-to-r from-[#00E5FF] to-[#00A3FF] text-black font-mono font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)] disabled:opacity-50"
                  >
                    {activatingId === tier.id ? 'Activating...' : 'Activate'}
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                    Compounding
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Immutable Digital Ledger History */}
      <div className="bg-[#0B131E]/80 border border-cyan-500/20 rounded-2xl p-5 backdrop-blur-xl">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-3 font-semibold">
          Immutable Protocol Ledger
        </p>

        <div className="space-y-2">
          {(userData?.history || []).slice(0, 5).map((log, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-[#070D14]/90 border border-white/[0.04] rounded-xl px-3.5 py-2.5 text-xs font-mono"
            >
              <div>
                <p className="text-slate-200 font-semibold">{log.type}</p>
                <p className="text-[8px] text-slate-500 mt-0.5">
                  {new Date(log.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {log.fromUserName && ` • via ${log.fromUserName}`}
                </p>
              </div>
              <span className="text-cyan-400 font-bold ml-2">+{log.amount} VC</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}