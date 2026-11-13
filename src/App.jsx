import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, TIER_CONFIG } from './context/AuthContext';
import WelcomePage from './components/WelcomePage';
import HomeTab from './components/tabs/HomeTab';
import CardsTab from './components/tabs/CardsTab';
import WalletTab from './components/tabs/WalletTab';
import './App.css';

const TABS = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'cards', label: 'Cards', icon: '💳' },
  { id: 'wallet', label: 'Wallet', icon: '💼' },
];

function DashboardContent() {
  const { user, userData, authLoading, isSyncing, logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
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
      <div className="min-h-screen bg-[#090C0E] flex flex-col items-center justify-center text-slate-500 text-sm gap-3 font-mono">
        <div className="w-7 h-7 border-2 border-[#E5C158] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] tracking-widest uppercase text-[#E5C158]">Connecting to VYOM...</p>
      </div>
    );
  }

  // 2. 1.5s Institutional Protocol Sync Screen
  if (user && isSyncing) {
    return (
      <div className="min-h-screen bg-[#090C0E] flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-12 h-12 rounded-2xl bg-[#11161A] border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C158] text-lg mb-4">
          ⚡
        </div>
        <h3 className="text-sm font-black text-white tracking-widest uppercase">
          Synchronizing Your Terminal
        </h3>
        <p className="text-[9px] text-slate-500 mt-2 max-w-xs leading-relaxed">
          LOADING YOUR CARDS • LIVE PROFIT • PAYOUT DETAILS
        </p>
        <div className="w-48 h-1 bg-[#11161A] rounded-full overflow-hidden mt-5 border border-white/[0.08]">
          <div className="h-full bg-[#E5C158] rounded-full w-3/4" />
        </div>
      </div>
    );
  }

  // 3. Unauthenticated -> Welcome Page
  if (!user) {
    return <WelcomePage refCode={refCode} />;
  }

  // 4. Authenticated -> Tabbed Dashboard
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
    <div className="min-h-screen bg-[#090C0E] text-[#E2E8F0] font-sans">
      <div className="max-w-md mx-auto pb-24">
        {/* TOP HEADER: Logo + Welcome + Profile / UPI Settings */}
        <header className="sticky top-0 z-40 bg-[#090C0E]/95 border-b border-white/[0.08] px-5 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#11161A] border border-[#D4AF37]/40 flex items-center justify-center font-black text-[#E5C158] text-sm">
              V
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white leading-tight">
                Welcome, {userName}
              </h1>
              <p className="text-[8px] font-mono tracking-[0.25em] text-[#E5C158] uppercase">
                VYOM NETWORK
              </p>
            </div>
          </div>

          {/* Profile / UPI Settings Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            title="Profile & UPI Settings"
            className="w-9 h-9 rounded-xl bg-[#11161A] border border-[#D4AF37]/40 flex items-center justify-center text-[#E5C158] text-sm font-black active:scale-95 transition-all"
          >
            {userInitial}
          </button>
        </header>

        {/* ACTIVE TAB */}
        <main>
          {activeTab === 'home' && <HomeTab onNavigate={setActiveTab} />}
          {activeTab === 'cards' && <CardsTab />}
          {activeTab === 'wallet' && <WalletTab onOpenProfile={() => setShowProfileModal(true)} />}
        </main>
      </div>

      {/* FIXED BOTTOM NAVIGATION — matte obsidian, sharp hairline, champagne active */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0D1114] border-t border-white/[0.08]">
        <div className="max-w-md mx-auto grid grid-cols-3">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 flex flex-col items-center gap-1 transition-colors ${
                  isActive ? 'text-[#E5C158]' : 'text-slate-500'
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                <span
                  className={`h-0.5 w-8 rounded-full transition-all ${
                    isActive ? 'bg-[#E5C158]' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── PROFILE / UPI SETTINGS MODAL ─── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050708]/90 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#11161A] border border-white/[0.08] rounded-3xl p-5 text-[#E2E8F0] max-h-[90vh] overflow-y-auto font-sans">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-black text-white">My Account &amp; Settings</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Profile &amp; Payout Details</p>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-[#0D1114] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* 1. Account Details */}
            <div className="mt-4 bg-[#0D1114] border border-white/[0.08] rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Full Name</span>
                <span className="text-white font-bold">{userName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Referral Code</span>
                <span className="text-[#E5C158] font-mono font-bold bg-[#E5C158]/10 px-2 py-0.5 rounded-lg border border-[#D4AF37]/30">
                  {userData?.referralCode || 'VYOM-NODE'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Joined On</span>
                <span className="text-slate-300">{formattedJoinDate}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.08]">
                <span className="text-slate-400">Active Cards</span>
                <span className="text-emerald-400 font-bold text-right">
                  {activeCardNames || 'None (₹1,000 Locked)'}
                </span>
              </div>
            </div>

            {/* 2. UPI Payout Details */}
            <div className="mt-3 bg-[#0D1114] border border-white/[0.08] rounded-2xl p-4">
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
                <div className="space-y-2 text-xs">
                  <div className="bg-[#090C0E] p-2.5 rounded-xl border border-white/[0.08]">
                    <p className="text-[9px] text-slate-400">Your Linked UPI ID</p>
                    <p className="text-[#E5C158] font-mono font-bold mt-0.5">{maskedUpi}</p>
                  </div>
                  <div className="bg-[#090C0E] p-2.5 rounded-xl border border-white/[0.08]">
                    <p className="text-[9px] text-slate-400">Linked Mobile Number</p>
                    <p className="text-white font-mono mt-0.5">{maskedPhone}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                    🔒 Your 50% profit will be sent to this UPI ID within 2 to 48 hours when you withdraw.
                  </p>
                </div>
              ) : (
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
                      className="w-full bg-[#090C0E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:border-[#D4AF37]/60 outline-none font-mono"
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
                      className="w-full bg-[#090C0E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:border-[#D4AF37]/60 outline-none font-mono"
                    />
                  </div>

                  <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedConsent}
                      onChange={(e) => setAgreedConsent(e.target.checked)}
                      className="mt-0.5 accent-[#E5C158] cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 leading-relaxed">
                      I confirm this UPI ID belongs to me and is active.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full bg-[#E5C158] text-black font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save UPI Details'}
                  </button>
                </form>
              )}
            </div>

            {/* 3. Profit Sharing Rule */}
            <div className="mt-3 bg-[#0D1114] border border-white/[0.08] rounded-2xl p-4 text-xs space-y-2">
              <h4 className="text-xs font-bold text-white mb-2">⚖️ How Profit Sharing Works</h4>
              <div className="flex justify-between items-center text-slate-300">
                <span>Your Profit Share</span>
                <span className="text-emerald-400 font-bold">50% (Direct to UPI)</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>50/50 Profit Split</span>
                <span className="text-[#E5C158] font-bold">Zero Fixed Fees</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-white/[0.08]">
                <span>Withdrawal / Exit Fee</span>
                <span className="text-[#E5C158] font-bold">₹0 (Free)</span>
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed pt-1">
                Your principal stays 100% untouched — only generated profit is shared 50/50.
              </p>
            </div>

            {/* 4. Log Out */}
            <div className="mt-4 pt-2">
              <button
                onClick={logout}
                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                🚪 Log Out
              </button>
            </div>
          </div>
        </div>
      )}
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
