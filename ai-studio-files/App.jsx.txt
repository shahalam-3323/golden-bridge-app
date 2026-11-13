import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, TIER_CONFIG } from './context/AuthContext';
import WelcomePage from './components/WelcomePage';
import HomeScreen from './components/HomeScreen';
import './App.css';

function DashboardContent() {
  const { user, userData, authLoading, isSyncing, logout, updateProfile } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [refCode, setRefCode] = useState(null);

  // Profile Form States
  const [upiInput, setUpiInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [agreedConsent, setAgreedConsent] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Referral capture from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('tgWebAppStartParam') || params.get('startapp');
    if (ref) setRefCode(ref);
  }, []);

  // 1. Initial Loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060B11] flex flex-col items-center justify-center text-slate-400 text-sm gap-3 font-mono">
        <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] tracking-widest uppercase text-cyan-300">Connecting to VYOM...</p>
      </div>
    );
  }

  // 2. 1.5s Institutional Protocol Sync Screen
  if (user && isSyncing) {
    return (
      <div className="min-h-screen bg-[#060B11] flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-lg mb-4 shadow-[0_0_25px_rgba(0,229,255,0.25)] animate-pulse">
          ⚡
        </div>
        <h3 className="text-sm font-black text-white tracking-widest uppercase">
          Synchronizing Your Terminal
        </h3>
        <p className="text-[9px] text-slate-400 mt-2 max-w-xs leading-relaxed">
          CALCULATING LIVE COMPOUNDING YIELD • 50/50 PROFIT LEDGER
        </p>
        <div className="w-48 h-1.5 bg-[#121A24] rounded-full overflow-hidden mt-5 border border-cyan-500/20">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  // 3. Unauthenticated -> Welcome Page
  if (!user) {
    return <WelcomePage refCode={refCode} />;
  }

  // 4. Authenticated -> Home Page
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
    : 'Recent Member';

  const isProfileComplete = Boolean(userData?.profileCompleted);

  // Clean Masked Strings for Indian User Privacy
  const maskedUpi = userData?.upiId
    ? userData.upiId.replace(/^(.)(.*)(@.*)$/, (_, first, middle, last) => first + '****' + last)
    : 'Not Added';

  const maskedPhone = userData?.phone
    ? userData.phone.replace(/^(\d{2})(\d+)(\d{2})$/, (_, first, middle, last) => `+91 ${first}*****${last}`)
    : 'Not Added';

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');

    const upiRegex = /^[a-zA-Z0-9._-]{3,}@[a-zA-Z]{3,}$/;
    if (!upiRegex.test(upiInput.trim())) {
      setProfileError('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)');
      return;
    }

    if (phoneInput.trim().replace(/\D/g, '').length !== 10) {
      setProfileError('Please enter a valid 10-digit mobile number linked to your bank.');
      return;
    }

    if (!agreedConsent) {
      setProfileError('Please confirm that this UPI ID belongs to you.');
      return;
    }

    setSavingProfile(true);
    const res = await updateProfile({
      upiId: upiInput.trim(),
      phone: phoneInput.trim().replace(/\D/g, ''),
      profileCompleted: true,
    });
    setSavingProfile(false);

    if (res.error) {
      setProfileError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B11] text-[#E2E8F0] pb-16 font-sans">
      <div className="max-w-md mx-auto">
        {/* TOP HEADER: Clean Brand + Notification Bell + Profile Avatar */}
        <header className="sticky top-0 z-40 bg-[#060B11]/90 backdrop-blur-xl border-b border-cyan-500/15 px-5 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00E5FF] to-blue-600 flex items-center justify-center font-black text-black text-sm shadow-[0_0_15px_rgba(0,229,255,0.4)]">
              V
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white">VYOM NETWORK</h1>
              <p className="text-[8px] font-mono tracking-[0.25em] text-cyan-400 uppercase -mt-0.5">
                Financial Terminal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl bg-[#0B131E] border border-cyan-500/25 flex items-center justify-center text-sm text-slate-300 hover:text-white shadow-[0_0_10px_rgba(0,229,255,0.1)] active:scale-95 transition-all">
              🔔
            </button>

            {/* Profile Avatar Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black text-sm font-black shadow-[0_0_15px_rgba(0,229,255,0.35)] active:scale-95 transition-all"
            >
              {userInitial}
            </button>
          </div>
        </header>

        {/* Home Screen Content */}
        <main className="pt-2">
          <HomeScreen onOpenProfile={() => setShowProfileModal(true)} />
        </main>

        {/* ─── SIMPLE, INDIAN-FRIENDLY PROFILE MODAL ─── */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-sm bg-[#0B131E] border border-cyan-400/30 rounded-3xl p-5 text-[#E2E8F0] shadow-[0_0_50px_rgba(0,229,255,0.15)] max-h-[90vh] overflow-y-auto font-sans">
              
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-cyan-500/15">
                <div>
                  <h3 className="text-base font-black text-white">
                    My Account & Settings
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Profile & Payout Details</p>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="w-8 h-8 rounded-full bg-[#121D2B] border border-cyan-500/20 flex items-center justify-center text-slate-400 hover:text-white active:scale-95"
                >
                  ✕
                </button>
              </div>

              {/* 1. Account Details (Simple & Clean) */}
              <div className="mt-4 bg-[#070D14]/90 border border-cyan-500/20 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Full Name</span>
                  <span className="text-white font-bold">{userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Referral Code</span>
                  <span className="text-cyan-300 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-400/20">
                    {userData?.referralCode || 'VYOM-NODE'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Joined On</span>
                  <span className="text-slate-300">{formattedJoinDate}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-slate-400">Active Card</span>
                  <span className="text-emerald-400 font-bold">
                    {activeCardNames || 'No Active Card (₹1,000 Locked)'}
                  </span>
                </div>
              </div>

              {/* 2. UPI Payout Details (No jargon, completely clear) */}
              <div className="mt-3 bg-[#070D14]/90 border border-cyan-500/20 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    💳 UPI Payout Details
                  </h4>
                  {isProfileComplete ? (
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Not Added
                    </span>
                  )}
                </div>

                {isProfileComplete ? (
                  /* SAVED & MASKED VIEW */
                  <div className="space-y-2 text-xs">
                    <div className="bg-[#0C1522] p-2.5 rounded-xl border border-white/[0.04]">
                      <p className="text-[9px] text-slate-400">Your Linked UPI ID</p>
                      <p className="text-cyan-300 font-mono font-bold mt-0.5">{maskedUpi}</p>
                    </div>
                    <div className="bg-[#0C1522] p-2.5 rounded-xl border border-white/[0.04]">
                      <p className="text-[9px] text-slate-400">Linked Mobile Number</p>
                      <p className="text-white font-mono mt-0.5">{maskedPhone}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                      🔒 Your 50% profit will be sent to this UPI ID within 2 to 48 hours when you click Redeem.
                    </p>
                  </div>
                ) : (
                  /* FORM TO ADD UPI */
                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Add your UPI ID so we can send your 50% profit share directly to your bank account.
                    </p>

                    {profileError && (
                      <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center">
                        {profileError}
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Your UPI ID (GPay / PhonePe / Paytm)
                      </label>
                      <input
                        type="text"
                        value={upiInput}
                        onChange={(e) => setUpiInput(e.target.value)}
                        placeholder="e.g. yourname@okhdfcbank"
                        required
                        className="w-full bg-[#0C1522] border border-cyan-500/30 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Bank-Linked Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="10-digit mobile number"
                        required
                        className="w-full bg-[#0C1522] border border-cyan-500/30 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>

                    <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedConsent}
                        onChange={(e) => setAgreedConsent(e.target.checked)}
                        className="mt-0.5 accent-cyan-400 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 leading-relaxed">
                        I confirm this UPI ID belongs to me and is active.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="w-full bg-gradient-to-r from-[#00E5FF] to-[#00A3FF] text-black font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,229,255,0.3)] active:scale-95 disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving...' : 'Save UPI Details'}
                    </button>
                  </form>
                )}
              </div>

              {/* 3. Simple 50/50 Profit Rule (Clear & Crisp - No essays) */}
              <div className="mt-3 bg-[#070D14]/90 border border-cyan-500/20 rounded-2xl p-4 text-xs space-y-2">
                <h4 className="text-xs font-bold text-white mb-2">⚖️ 50/50 Profit Sharing Rule</h4>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Your Profit Share</span>
                  <span className="text-emerald-400 font-bold">50% (Direct to UPI)</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>VYOM Platform Maintenance</span>
                  <span className="text-slate-400 font-bold">50%</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-white/5">
                  <span>Withdrawal / Exit Fee</span>
                  <span className="text-cyan-400 font-bold">₹0 (Free)</span>
                </div>
              </div>

              {/* 4. Log Out Button (Clean & Direct) */}
              <div className="mt-4 pt-2">
                <button
                  onClick={logout}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  🚪 Log Out
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