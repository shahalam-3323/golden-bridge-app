import React, { useState } from 'react';
import { useAuth, TIER_CONFIG } from '../context/AuthContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function HomeScreen({ onOpenProfile }) {
  const { userData, user, liveLedger, submitCardPurchase, submitRedemptionRequest } = useAuth();
  const [copied, setCopied] = useState(false);

  // Purchase Checkout Modal State
  const [checkoutCard, setCheckoutCard] = useState(null);
  const [utrInput, setUtrInput] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderError, setOrderError] = useState('');

  // 50/50 Redemption Modal State
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [redeemError, setRedeemError] = useState('');
  const [submittingRedeem, setSubmittingRedeem] = useState(false);

  const activeCards = userData?.activeCards || [];
  const pendingPurchases = userData?.pendingPurchases || [];
  const hasActiveNodes = activeCards.length > 0;
  const lockedBonus = userData?.lockedBonus || 1000;

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

  const grossProfit = liveLedger.grossYield || 0;
  const platformShare = grossProfit * 0.5;
  const netUserProfit = grossProfit * 0.5;

  // Handle Checkout Submission
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');
    setSubmittingOrder(true);

    const res = await submitCardPurchase(checkoutCard.id, utrInput);
    setSubmittingOrder(false);

    if (res.error) {
      setOrderError(res.error);
    } else {
      setOrderSuccess(res.orderId);
    }
  };

  const handleInitiateRedeem = async () => {
    if (!userData?.profileCompleted || !userData?.upiId) {
      setShowRedeemModal(false);
      if (onOpenProfile) onOpenProfile();
      return;
    }

    setSubmittingRedeem(true);
    setRedeemError('');

    const res = await submitRedemptionRequest(grossProfit);
    setSubmittingRedeem(false);

    if (res.error) {
      setRedeemError(res.message);
    } else {
      setRedeemSuccess(res);
    }
  };

  const maskedUpi = userData?.upiId
    ? userData.upiId.replace(/^(.)(.*)(@.*)$/, (_, first, middle, last) => first + '****' + last)
    : 'Not Configured';

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

      {/* Operator Console Status Header */}
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

      {/* Locked ₹1,000 Welcome Bonus Banner */}
      {!hasActiveNodes && (
        <div className="bg-[#121B28] border border-cyan-400/40 rounded-2xl p-4 shadow-[0_0_25px_rgba(0,229,255,0.12)]">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black font-mono text-cyan-300 uppercase tracking-wider">
                  ₹{fmt(lockedBonus)} Welcome Capital Locked
                </h4>
                <span className="text-[8px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-md">
                  Action Required
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Your ₹1,000 bonus is idle. Acquire any card below via official UPI payment to unlock this capital and ignite compounding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Capital Portfolio & Accrued Gross Profit Display */}
      <div className="bg-gradient-to-br from-[#0A1726] via-[#10243C] to-[#050D17] border border-cyan-400/40 rounded-2xl p-5 shadow-[0_0_35px_rgba(0,229,255,0.15)] relative overflow-hidden backdrop-blur-xl">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-[0.25em] font-bold">
              Total Portfolio Valuation
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-cyan-400">₹</span>
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {fmt(liveLedger.totalPortfolio)}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setRedeemSuccess(null);
              setRedeemError('');
              setShowRedeemModal(true);
            }}
            className="text-[11px] font-mono font-bold text-black bg-gradient-to-r from-[#00E5FF] to-[#00A3FF] rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(0,229,255,0.4)] active:scale-95 transition-all uppercase tracking-wider"
          >
            Redeem
          </button>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-cyan-500/15">
          <div className="bg-[#060D15]/80 border border-cyan-500/20 rounded-xl p-3">
            <p className="text-[8px] font-mono uppercase text-slate-400">Accrued Gross Profit</p>
            <p className="text-sm font-black font-mono text-cyan-300 mt-0.5">₹{fmt(grossProfit)}</p>
            <span className="text-[8px] font-mono text-emerald-400 mt-0.5 inline-block">
              {hasActiveNodes ? '● Live Mathematical Ticker' : 'Awaiting Card Activation'}
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
              +₹{(userData?.referralCount || 0) * 200}
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">+₹200 Per Direct Invite</p>
          </div>
          <div className="bg-[#0E1825] border border-cyan-400/30 rounded-xl p-3 text-center">
            <p className="text-[8px] font-mono text-cyan-400 uppercase tracking-wider">
              Level-2 Syndicate ({userData?.secondaryCount || 0})
            </p>
            <p className="text-lg font-black font-mono text-white mt-1">
              +₹{(userData?.secondaryCount || 0) * 100}
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">+₹100 Autonomous</p>
          </div>
        </div>

        <button
          onClick={copyInvite}
          className="w-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-mono font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-cyan-500/25 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,229,255,0.15)] flex items-center justify-center gap-2"
        >
          <span>{copied ? '✓ SYNDICATE LINK COPIED' : '⚡ COPY TELEGRAM / WEB INVITE LINK'}</span>
        </button>
      </div>

      {/* ─── CAPITAL ASSET CARDS GRID (3-STATE INTELLIGENCE) ─── */}
      <div id="nodes-section" className="space-y-3 scroll-mt-24">
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 font-bold">
            Capital Asset Cards
          </p>
          <span className="text-[10px] font-mono text-cyan-400">
            {activeCards.length} Active / {Object.keys(TIER_CONFIG).length} Total
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {Object.values(TIER_CONFIG).map((tier) => {
            const isActive = activeCards.includes(tier.id);
            const isPending = pendingPurchases.some(
              (p) => p.cardId === tier.id && p.status === 'pending'
            );

            return (
              <div
                key={tier.id}
                className={`bg-[#0B131E]/80 border ${
                  isActive
                    ? 'border-cyan-400/40 shadow-[0_0_20px_rgba(0,229,255,0.1)]'
                    : isPending
                    ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                    : 'border-white/[0.06]'
                } rounded-2xl p-4 flex justify-between items-center backdrop-blur-xl`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono text-white">{tier.name}</span>
                    <span
                      className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                          : isPending
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      {isActive ? '● Active' : isPending ? '⏳ Verifying UTR' : 'Locked'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono font-bold text-cyan-400 mt-1">
                    ₹{fmt(tier.capital)} Capital Base
                  </p>
                </div>

                {/* Intelligent 3-State Action Button */}
                {isActive ? (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                    Compounding
                  </span>
                ) : isPending ? (
                  <span className="text-[9px] font-mono text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-xl">
                    Audit Pending
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setCheckoutCard(tier);
                      setUtrInput('');
                      setOrderError('');
                      setOrderSuccess(null);
                    }}
                    className="bg-gradient-to-r from-[#00E5FF] to-[#00A3FF] text-black font-mono font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                  >
                    Buy Card
                  </button>
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
                  {log.refId && ` • Ref: ${log.refId}`}
                </p>
              </div>
              <span className="text-cyan-400 font-bold ml-2">
                {log.amount != null ? `₹${fmt(log.amount)}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 1. CARD PURCHASE / CHECKOUT MODAL ─── */}
      {checkoutCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0B131E] border border-cyan-400/30 rounded-3xl p-5 text-[#E2E8F0] shadow-[0_0_50px_rgba(0,229,255,0.15)] font-sans max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-3 border-b border-cyan-500/15">
              <div>
                <span className="text-[8px] font-mono tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-md">
                  Official Checkout
                </span>
                <h3 className="text-base font-black text-white mt-1 uppercase tracking-wide">
                  Acquire {checkoutCard.name}
                </h3>
              </div>
              <button
                onClick={() => setCheckoutCard(null)}
                className="w-8 h-8 rounded-full bg-[#121D2B] border border-cyan-500/20 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {orderSuccess ? (
              <div className="py-6 text-center space-y-3 font-mono">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  ✓
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Payment Proof Submitted
                </h4>
                <p className="text-xs text-cyan-300 font-bold">
                  Order Ticket: #{orderSuccess}
                </p>
                <div className="bg-[#070D14] border border-white/[0.06] rounded-xl p-3 text-[10px] text-slate-400 leading-relaxed text-left space-y-1">
                  <p>• Card: <strong className="text-white">{checkoutCard.name}</strong></p>
                  <p>• Allocation Capital: <strong className="text-white">₹{fmt(checkoutCard.capital)}</strong></p>
                  <p>• Bank UTR: <strong className="text-cyan-300">{utrInput}</strong></p>
                  <p>• Status: <strong className="text-amber-400">Verifying Bank Transfer</strong></p>
                  <p className="pt-1 text-slate-500 text-[9px]">
                    Your card will activate automatically once administrative bank verification is complete (typically 5 to 30 minutes).
                  </p>
                </div>
                <button
                  onClick={() => setCheckoutCard(null)}
                  className="w-full mt-2 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold py-2.5 rounded-xl text-xs uppercase"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handlePurchaseSubmit} className="mt-4 space-y-3 font-mono">
                {/* Allocation Info Box */}
                <div className="bg-[#070D14] border border-cyan-500/20 rounded-2xl p-3.5 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Card Tier:</span>
                    <span className="font-bold text-white">{checkoutCard.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 mt-1">
                    <span>Capital Base:</span>
                    <span className="text-base font-black text-cyan-300">₹{fmt(checkoutCard.capital)}</span>
                  </div>
                  {!hasActiveNodes && (
                    <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-emerald-400">
                      ★ Unlocks your ₹1,000 Welcome Capital into active compounding!
                    </div>
                  )}
                </div>

                {/* Company UPI QR Section */}
                <div className="bg-[#070D14] border border-white/[0.08] rounded-2xl p-4 text-center space-y-2">
                  <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                    Official Protocol UPI Destination
                  </p>
                  
                  {/* Visual QR Code Display */}
                  <div className="w-36 h-36 mx-auto bg-white rounded-xl p-2 flex items-center justify-center shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=vyomnetwork@icici&pn=VYOM%20Network&am=${checkoutCard.capital}&cu=INR`}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <p className="text-xs text-white font-mono font-bold mt-1">vyomnetwork@icici</p>
                  <p className="text-[8px] text-slate-400">Scan with GPay, PhonePe, Paytm, or any UPI App</p>
                </div>

                {/* 12-Digit Bank UTR Input */}
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">
                    Bank UTR / Transaction Reference (12 Digits) *
                  </label>
                  <input
                    type="text"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value.trim())}
                    placeholder="e.g. 409821892182"
                    required
                    minLength={8}
                    className="w-full bg-[#070D14] border border-cyan-500/30 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:border-cyan-400 outline-none font-mono"
                  />
                  <p className="text-[8px] text-slate-500 mt-1">
                    Found in your bank/UPI payment receipt under "UPI Ref No" or "UTR".
                  </p>
                </div>

                {orderError && (
                  <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center">
                    {orderError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingOrder || !utrInput}
                  className="w-full bg-gradient-to-r from-[#00E5FF] to-[#00A3FF] text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,229,255,0.35)] active:scale-95 disabled:opacity-40"
                >
                  {submittingOrder ? 'Submitting Proof...' : 'Submit Payment Proof & Request Activation'}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ─── 2. 50/50 PROFIT REDEMPTION SETTLEMENT MODAL ─── */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0B131E] border border-cyan-400/30 rounded-3xl p-5 text-[#E2E8F0] shadow-[0_0_50px_rgba(0,229,255,0.15)] font-sans">
            
            <div className="flex justify-between items-center pb-3 border-b border-cyan-500/15">
              <div>
                <span className="text-[8px] font-mono tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-md">
                  Audit Gateway
                </span>
                <h3 className="text-base font-black text-white mt-1 uppercase tracking-wide">
                  Profit Redemption Settlement
                </h3>
              </div>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="w-8 h-8 rounded-full bg-[#121D2B] border border-cyan-500/20 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {redeemSuccess ? (
              <div className="py-6 text-center space-y-3 font-mono">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  ✓
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Redemption Request Initiated
                </h4>
                <p className="text-xs text-cyan-300 font-bold">
                  Net Settlement: ₹{fmt(redeemSuccess.netPayout)}
                </p>
                <div className="bg-[#070D14] border border-white/[0.06] rounded-xl p-3 text-[10px] text-slate-400 leading-relaxed text-left">
                  <p>• Payout Ticket: <strong className="text-white">#{redeemSuccess.requestId}</strong></p>
                  <p>• Destination: <strong className="text-cyan-300">{maskedUpi}</strong></p>
                  <p>• Status: <strong className="text-amber-400">Under Administrative Audit</strong></p>
                  <p className="mt-2 text-slate-500 text-[9px]">
                    Net amount will be transferred to your registered UPI account within <strong>2 to 48 hours</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setShowRedeemModal(false)}
                  className="w-full mt-2 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold py-2.5 rounded-xl text-xs uppercase"
                >
                  Close Terminal
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3 font-mono">
                <div className="bg-[#070D14] border border-cyan-500/20 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Gross Accrued Profit:</span>
                    <span className="font-bold text-white">₹{fmt(grossProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>VYOM Platform Share (50%):</span>
                    <span className="text-slate-400">-₹{fmt(platformShare)}</span>
                  </div>
                  <div className="pt-2 border-t border-cyan-500/20 flex justify-between items-center text-sm font-black text-cyan-300">
                    <span>Net Withdrawable Payout:</span>
                    <span className="text-emerald-400">₹{fmt(netUserProfit)}</span>
                  </div>
                </div>

                <div className="bg-[#070D14] border border-white/[0.06] rounded-xl p-3 text-xs">
                  <p className="text-[9px] text-slate-400 uppercase">Payout Destination (Locked UPI)</p>
                  <p className="text-cyan-300 font-bold mt-0.5">{maskedUpi}</p>
                </div>

                {redeemError && (
                  <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-center">
                    {redeemError}
                  </div>
                )}

                <p className="text-[9px] text-slate-400 leading-relaxed text-center">
                  Subject to manual audit. Net settlement is transferred via UPI within <strong>2 to 48 hours</strong>. Minimum threshold is ₹500.
                </p>

                <button
                  onClick={handleInitiateRedeem}
                  disabled={submittingRedeem || grossProfit < 500}
                  className="w-full bg-gradient-to-r from-[#00E5FF] to-[#00A3FF] text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,229,255,0.35)] active:scale-95 disabled:opacity-40"
                >
                  {submittingRedeem
                    ? 'Transmitting Request...'
                    : grossProfit < 500
                    ? 'Minimum ₹500 Accrued Profit Required'
                    : 'Confirm & Initiate Redemption'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}