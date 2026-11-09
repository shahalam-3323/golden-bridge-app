import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, TIER_CONFIG } from './context/AuthContext';
import WelcomePage from './components/WelcomePage';
import HomeScreen from './components/HomeScreen';
import './App.css';

function DashboardContent() {
  const { user, userData, authLoading, isSyncing, logout } = useAuth();
  const [showProfileDossier, setShowProfileDossier] = useState(false);
  const [refCode, setRefCode] = useState(null);

  // Dual-Compatible Referral Capture (Web ?ref= AND Telegram ?startapp=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('tgWebAppStartParam') || params.get('startapp');
    if (ref) setRefCode(ref);
  }, []);

  // 1. Initial Auth Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060B11] flex flex-col items-center justify-center text-slate-400 text-sm gap-3 font-mono">
        <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] tracking-widest uppercase text-cyan-300">Connecting to Protocol...</p>
      </div>
    );
  }

  // 2. 1.5-Second Revolut-Style Institutional Protocol Syncing Screen
  if (user && isSyncing) {
    return (
      <div className="min-h-screen bg-[#060B11] flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-lg mb-4 shadow-[0_0_25px_rgba(0,229,255,0.25)] animate-pulse">
          ⚡
        </div>
        <h3 className="text-sm font-black text-white tracking-widest uppercase">
          Synchronizing Institutional Terminal
        </h3>
        <p className="text-[9px] text-slate-400 mt-2 max-w-xs leading-relaxed">
          CALCULATING DETERMINISTIC TIMESTAMPS • RECONCILING 50/50 PROFIT LEDGER
        </p>
        <div className="w-48 h-1.5 bg-[#121A24] rounded-full overflow-hidden mt-5 border border-cyan-500/20">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  // 3. Unauthenticated -> Welcome Page
  if (!user) {
    return <WelcomePage onLoginClick={() => {}} refCode={refCode} />;
  }

  // 4. Authenticated -> Home Page with Full Profile Dossier
  const userName =
    userData?.fullName && userData.fullName !== 'Syndicate Operator'
      ? userData.fullName
      : userData?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Investor';

  const userInitial = userName.trim().charAt(0).toUpperCase();

  const activeCardNames = (userData?.activeCards || [])
    .map((id) => TIER_CONFIG[id]?.name || id)
    .join(', ');

  const formattedJoinDate = userData?.joinDate
    ? new Date(userData.joinDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Active Protocol';

  return (
    <div className="min-h-screen bg-[#060B11] text-[#E2E8F0] pb-16 font-sans">
      <div className="max-w-md mx-auto">
        {/* TOP HEADER: Logo + Bell + Profile Avatar */}
        <header className="sticky top-0 z-40 bg-[#060B11]/90 backdrop-blur-xl border-b border-cyan-500/15 px-5 py-3.5 flex justify-between items-center">
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

          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl bg-[#0B131E] border border-cyan-500/25 flex items-center justify-center text-sm text-slate-300 hover:text-white shadow-[0_0_10px_rgba(0,229,255,0.1)] active:scale-95 transition-all">
              🔔
            </button>

            {/* Profile Avatar Button */}
            <button
              onClick={() => setShowProfileDossier(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black text-sm font-black shadow-[0_0_15px_rgba(0,229,255,0.35)] active:scale-95 transition-all"
            >
              {userInitial}
            </button>
          </div>
        </header>

        {/* Home Screen Content */}
        <main className="pt-2">
          <HomeScreen />
        </main>

        {/* ─── FULL OPERATOR PROTOCOL DOSSIER MODAL ─── */}
        {showProfileDossier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-md bg-[#0B131E] border border-cyan-400/30 rounded-3xl p-5 text-[#E2E8F0] shadow-[0_0_50px_rgba(0,229,255,0.15)] max-h-[90vh] overflow-y-auto font-sans">
              
              {/* Dossier Top Bar */}
              <div className="flex justify-between items-center pb-3 border-b border-cyan-500/15">
                <div>
                  <span className="text-[8px] font-mono tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-md">
                    Confidential
                  </span>
                  <h3 className="text-base font-black text-white mt-1 uppercase tracking-wide">
                    Operator Protocol Dossier
                  </h3>
                </div>
                <button
                  onClick={() => setShowProfileDossier(false)}
                  className="w-8 h-8 rounded-full bg-[#121D2B] border border-cyan-500/20 flex items-center justify-center text-slate-400 hover:text-white active:scale-95"
                >
                  ✕
                </button>
              </div>

              {/* MACRO SECTION 1: OPERATOR IDENTITY & NODE SPECS */}
              <div className="mt-4 bg-[#070D14]/90 border border-cyan-500/20 rounded-2xl p-4">
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Operator Identity & Node Specs
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="bg-[#0C1522] p-2.5 rounded-xl border border-white/[0.04]">
                    <p className="text-[8px] text-slate-400 uppercase">Sovereign Handle</p>
                    <p className="text-white font-bold truncate mt-0.5">{userName}</p>
                  </div>
                  <div className="bg-[#0C1522] p-2.5 rounded-xl border border-white/[0.04]">
                    <p className="text-[8px] text-slate-400 uppercase">Syndicate Node ID</p>
                    <p className="text-cyan-300 font-bold truncate mt-0.5">{userData?.referralCode || 'VYOM-NODE'}</p>
                  </div>
                  <div className="bg-[#0C1522] p-2.5 rounded-xl border border-white/[0.04]">
                    <p className="text-[8px] text-slate-400 uppercase">Sponsor Node</p>
                    <p className="text-slate-200 font-bold truncate mt-0.5">{userData?.referredBy || 'Direct Root'}</p>
                  </div>
                  <div className="bg-[#0C1522] p-2.5 rounded-xl border border-white/[0.04]">
                    <p className="text-[8px] text-slate-400 uppercase">Commissioned Date</p>
                    <p className="text-slate-200 font-bold mt-0.5">{formattedJoinDate}</p>
                  </div>
                  <div className="bg-[#0C1522] p-2.5 rounded-xl border border-white/[0.04] col-span-2">
                    <p className="text-[8px] text-slate-400 uppercase">Active Capital Allocation</p>
                    <p className="text-emerald-400 font-bold mt-0.5">
                      {activeCardNames || 'Awaiting Node Activation (1,000 VC Locked)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* MACRO SECTION 2: GOVERNANCE & 50/50 PROFIT SHARING */}
              <div className="mt-3 bg-[#070D14]/90 border border-cyan-500/20 rounded-2xl p-4">
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Governance & 50/50 Profit Parameters
                </p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center bg-[#0C1522] p-2.5 rounded-xl border border-cyan-500/10">
                    <div>
                      <p className="text-slate-300 font-bold">User Net Profit Share</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">Guaranteed Realized Allocation</p>
                    </div>
                    <span className="text-cyan-400 font-black text-sm">50.0%</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#0C1522] p-2.5 rounded-xl border border-cyan-500/10">
                    <div>
                      <p className="text-slate-300 font-bold">Protocol Operations Reserve</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">Safety Pool & Liquidity Maintenance</p>
                    </div>
                    <span className="text-slate-400 font-black text-sm">50.0%</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#0C1522] p-2.5 rounded-xl border border-cyan-500/10">
                    <div>
                      <p className="text-slate-300 font-bold">Redemption Friction / Exit Fee</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">Zero Deduction Policy</p>
                    </div>
                    <span className="text-emerald-400 font-black text-sm">0.0% (FREE)</span>
                  </div>
                </div>
              </div>

              {/* MACRO SECTION 3: RISK DISCLOSURE & PROTOCOL COMPLIANCE */}
              <div className="mt-3 bg-[#070D14]/90 border border-cyan-500/20 rounded-2xl p-4">
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Risk Disclosure & Protocol Compliance
                </p>
                <div className="text-[10px] text-slate-400 space-y-1.5 leading-relaxed font-sans">
                  <p>
                    • <strong className="text-slate-200">Drawdown Liability:</strong> In adverse market conditions, the capital base reflects actual market drawdown. Zero fixed-return guarantees.
                  </p>
                  <p>
                    • <strong className="text-slate-200">Regulatory Framework:</strong> VYOM Network operates as a closed-loop institutional educational terminal. Zero unregulated public securities.
                  </p>
                  <p>
                    • <strong className="text-slate-200">Capital Custody:</strong> Deterministic compounding algorithm based on verified mathematical trajectory models.
                  </p>
                </div>
              </div>

              {/* MACRO SECTION 4: SESSION SECURITY & TERMINATION */}
              <div className="mt-4 pt-3 border-t border-cyan-500/15">
                <button
                  onClick={logout}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(239,68,68,0.1)] flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>⚠️ Terminate Active Session (Logout)</span>
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}