import React, { useState } from 'react';
import {
  useAuth,
  TIER_CONFIG,
  rateForAmount,
  PROFIT_SPLIT,
  MIN_DEPOSIT,
} from '../../context/AuthContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (n) => Number(n || 0).toLocaleString('en-IN');

const DEPOSIT_PILLS = [100, 500, 2500, 5000];
const ESTIMATOR_MIN = 100;
const ESTIMATOR_MAX = 100000;

// Brushed-metal surface mapped directly to TIER_CONFIG.
//   Starter            → Brushed Emerald
//   Growth/Elite/Prime → Brushed Titanium Slate
//   Signature          → Matte Obsidian (24K foil)
const metalClassFor = (tierId) => {
  if (tierId === 'starter') return 'metal-emerald';
  if (tierId === 'signature') return 'metal-obsidian';
  return 'metal-slate';
};

const Chip = () => (
  <div className="w-9 h-7 rounded-[5px] border border-[#E5C158]/50 bg-gradient-to-br from-[#E5C158]/25 to-[#8A7327]/25 relative overflow-hidden">
    <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-px bg-[#E5C158]/40" />
    <div className="absolute inset-y-1 left-1/2 -translate-x-1/2 w-px bg-[#E5C158]/40" />
  </div>
);

export default function CardsTab() {
  const { userData, liveLedger, submitCardPurchase, submitCustomDeposit } = useAuth();

  const [checkout, setCheckout] = useState(null); // { mode, title, amount, tierId }
  const [utrInput, setUtrInput] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderError, setOrderError] = useState('');

  const [depositAmount, setDepositAmount] = useState(500);
  const [estAmount, setEstAmount] = useState(5000);

  const activeCards = userData?.activeCards || [];
  const pendingPurchases = userData?.pendingPurchases || [];
  const customDeposits = userData?.customDeposits || [];
  const hasActiveNodes = Number(liveLedger.baseCapital || 0) > 0;
  const lockedBonus = Number(userData?.lockedBonus || 1000);

  const isPending = (cardId) =>
    pendingPurchases.some((p) => p.cardId === cardId && p.status === 'pending');

  const pendingDeposit = pendingPurchases.some(
    (p) => p.type === 'custom_deposit' && p.status === 'pending'
  );

  // Active cards on top, then pending, then locked/available
  const orderedTiers = Object.values(TIER_CONFIG).sort((a, b) => {
    const rank = (tier) => {
      if (activeCards.includes(tier.id)) return 0;
      if (isPending(tier.id)) return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });

  // Exact blended monthly gross derived from TIER_CONFIG + locked deposit rates.
  const estimatedMonthlyYield = Number(liveLedger.monthlyGross || 0);

  // ── Zero-fee profit estimator ──
  const estRate = rateForAmount(estAmount);
  const estGross = estAmount * estRate;
  const estNet = estGross * PROFIT_SPLIT;

  const openTierCheckout = (tier) => {
    setCheckout({ mode: 'card', title: tier.name, amount: tier.capital, tierId: tier.id });
    setUtrInput('');
    setOrderError('');
    setOrderSuccess(null);
  };

  const openDepositCheckout = (amount) => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_DEPOSIT) {
      setOrderError(`Minimum custom deposit is ₹${MIN_DEPOSIT.toLocaleString('en-IN')}.`);
      return;
    }
    setCheckout({ mode: 'deposit', title: 'Custom Deposit', amount: amt, tierId: 'custom_deposit' });
    setUtrInput('');
    setOrderError('');
    setOrderSuccess(null);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');
    setSubmittingOrder(true);

    const res =
      checkout.mode === 'deposit'
        ? await submitCustomDeposit(checkout.amount, utrInput)
        : await submitCardPurchase(checkout.tierId, utrInput);

    setSubmittingOrder(false);

    if (res.error) {
      setOrderError(res.error);
    } else {
      setOrderSuccess(res.orderId);
    }
  };

  return (
    <div className="px-5 pt-2 pb-4 space-y-4 animate-fadeIn font-sans">
      {/* CUSTOM DEPOSIT (MIN ₹100) */}
      <div className="bg-[#11161A] border border-[#D4AF37]/30 rounded-2xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#E5C158] font-bold">
              Custom Deposit
            </p>
            <h3 className="text-sm font-black text-white mt-1">Deposit Any Amount (Min ₹100)</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Pick a quick amount or enter your own — UPI QR + 12-digit UTR checkout.
            </p>
          </div>
          {!hasActiveNodes && (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-lg whitespace-nowrap">
              Unlocks ₹{fmtInt(lockedBonus)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          {DEPOSIT_PILLS.map((amt) => (
            <button
              key={amt}
              onClick={() => setDepositAmount(amt)}
              className={`py-2 rounded-xl text-[11px] font-mono font-bold border transition-colors ${
                depositAmount === amt
                  ? 'bg-[#E5C158] text-black border-[#E5C158]'
                  : 'bg-[#0D1114] text-slate-300 border-white/[0.08] hover:border-[#D4AF37]/40'
              }`}
            >
              ₹{fmtInt(amt)}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-2.5">
          <div className="flex-1 flex items-center bg-[#0D1114] border border-white/[0.08] rounded-xl px-3">
            <span className="text-slate-500 text-sm">₹</span>
            <input
              type="number"
              min={MIN_DEPOSIT}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-transparent p-2.5 text-sm text-white focus:outline-none font-mono"
              placeholder="Enter amount"
            />
          </div>
          <button
            onClick={() => openDepositCheckout(depositAmount)}
            disabled={!depositAmount || Number(depositAmount) < MIN_DEPOSIT || pendingDeposit}
            className="bg-[#E5C158] text-black font-bold px-5 rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-40"
          >
            Deposit
          </button>
        </div>

        <p className="text-[9px] font-mono text-slate-500 mt-2">
          Locked rate for ₹{fmtInt(depositAmount || 0)}:{' '}
          <span className="text-emerald-400 font-bold">
            {(rateForAmount(depositAmount || 0) * 100).toFixed(1)}% / month gross
          </span>
          {pendingDeposit && <span className="text-amber-400"> • A deposit is already in review</span>}
        </p>
      </div>

      {/* ZERO-FEE PROFIT ESTIMATOR */}
      <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-4">
        <div className="flex justify-between items-center">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 font-bold">
            Zero-Fee Profit Estimator
          </p>
          <span className="text-[9px] font-mono text-emerald-400">
            ₹0 Fixed Charges
          </span>
        </div>

        <div className="mt-3 flex items-center bg-[#0D1114] border border-white/[0.08] rounded-xl px-3">
          <span className="text-slate-500 text-sm">₹</span>
          <input
            type="number"
            min={ESTIMATOR_MIN}
            max={ESTIMATOR_MAX}
            value={estAmount}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value);
              setEstAmount(v);
            }}
            className="w-full bg-transparent p-2.5 text-sm text-white focus:outline-none font-mono"
          />
        </div>

        <input
          type="range"
          min={ESTIMATOR_MIN}
          max={ESTIMATOR_MAX}
          step={100}
          value={Number(estAmount) || ESTIMATOR_MIN}
          onChange={(e) => setEstAmount(Number(e.target.value))}
          className="w-full mt-3 accent-[#E5C158]"
        />
        <div className="flex justify-between text-[8px] font-mono text-slate-600 mt-0.5">
          <span>₹100</span>
          <span>₹1,00,000</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.08]">
          <div>
            <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Gross Yield</p>
            <p className="text-[11px] font-mono font-bold text-white mt-0.5">₹{fmt(estGross)}</p>
            <p className="text-[8px] font-mono text-emerald-400">{(estRate * 100).toFixed(1)}% / mo</p>
          </div>
          <div className="border-x border-white/[0.08] px-2">
            <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Net 50% Take-Home</p>
            <p className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5">₹{fmt(estNet)}</p>
            <p className="text-[8px] font-mono text-slate-500">50/50 split</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Fixed Charges</p>
            <p className="text-[11px] font-mono font-bold text-[#E5C158] mt-0.5">₹0</p>
            <p className="text-[8px] font-mono text-slate-500">Principal untouched</p>
          </div>
        </div>
      </div>

      {/* ACTIVE NODES SUMMARY */}
      <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 font-bold">
              Active Cards
            </p>
            <p className="text-lg font-black font-mono text-white mt-0.5">
              {activeCards.length}
              <span className="text-xs text-slate-500 font-bold"> / {Object.keys(TIER_CONFIG).length}</span>
            </p>
            {customDeposits.length > 0 && (
              <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                + {customDeposits.length} custom deposit{customDeposits.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 font-bold">
              Est. Gross Yield
            </p>
            <p className="text-sm font-black font-mono text-emerald-400 mt-1">
              ₹{fmt(estimatedMonthlyYield)}
              <span className="text-[10px] text-emerald-400/70"> / month</span>
            </p>
            <p className="text-[8px] font-mono text-slate-500 mt-0.5">3.5%–8% tiered • compounding</p>
          </div>
        </div>
      </div>

      {/* 5 BRUSHED-METAL CARD TIERS */}
      <div className="space-y-3">
        {orderedTiers.map((tier) => {
          const active = activeCards.includes(tier.id);
          const pending = isPending(tier.id);
          const ratePct = (tier.monthlyRate * 100).toFixed(1);

          return (
            <div key={tier.id} className={`metal-card ${metalClassFor(tier.id)} p-4`}>
              {/* header: brand + chip */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/50">
                    VYOM NETWORK
                  </p>
                  <p className="text-sm font-black text-white mt-1 tracking-wide">{tier.name}</p>
                </div>
                <Chip />
              </div>

              {/* capital + rate */}
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-[8px] font-mono uppercase tracking-widest text-white/50">
                    Capital Base
                  </p>
                  <p className="text-2xl font-black font-mono text-white tracking-tight">
                    ₹{fmt(tier.capital)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-mono uppercase tracking-widest text-white/50">
                    Gross Yield
                  </p>
                  <p className="text-lg font-black font-mono text-[#E5C158]">{ratePct}%</p>
                  <p className="text-[8px] font-mono text-white/50">per month</p>
                </div>
              </div>

              {/* footer: status / action */}
              <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between">
                <span
                  className={`text-[8px] font-mono font-bold px-2 py-1 rounded-full uppercase ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : pending
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                      : 'bg-black/30 text-white/60 border border-white/15'
                  }`}
                >
                  {active ? 'Active • Earning Live' : pending ? 'Verifying • 5–30 mins' : 'Locked'}
                </span>

                {active ? (
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">Earning</span>
                ) : pending ? (
                  <span className="text-[9px] font-mono text-amber-200 font-bold">In Review</span>
                ) : (
                  <button
                    onClick={() => openTierCheckout(tier)}
                    className="bg-[#E5C158] text-black font-mono font-bold px-4 py-2 rounded-xl text-[11px] uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Activate Card
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CHECKOUT MODAL: UPI QR + 12-DIGIT UTR */}
      {checkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050708]/90 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#11161A] border border-white/[0.08] rounded-3xl p-5 text-[#E2E8F0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[8px] font-mono tracking-widest uppercase text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">
                  Secure Checkout
                </span>
                <h3 className="text-base font-black text-white mt-1 uppercase tracking-wide">
                  {checkout.mode === 'deposit' ? 'Custom Deposit' : `Buy ${checkout.title}`}
                </h3>
              </div>
              <button
                onClick={() => setCheckout(null)}
                className="w-8 h-8 rounded-full bg-[#0D1114] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {orderSuccess ? (
              <div className="py-6 text-center space-y-3 font-mono">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl">
                  ✓
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  {checkout.mode === 'deposit' ? 'Deposit Proof Submitted' : 'Payment Proof Submitted'}
                </h4>
                <p className="text-xs text-[#E5C158] font-bold">Order Ticket: #{orderSuccess}</p>
                <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3 text-[10px] text-slate-400 leading-relaxed text-left space-y-1">
                  <p>
                    • {checkout.mode === 'deposit' ? 'Deposit' : 'Card'}:{' '}
                    <strong className="text-white">{checkout.title}</strong>
                  </p>
                  <p>
                    • Amount: <strong className="text-white">₹{fmt(checkout.amount)}</strong>
                  </p>
                  <p>
                    • Bank UTR: <strong className="text-[#E5C158]">{utrInput}</strong>
                  </p>
                  <p>
                    • Status: <strong className="text-amber-400">Verifying • 5–30 mins</strong>
                  </p>
                  <p className="pt-1 text-slate-500 text-[9px]">
                    Your {checkout.mode === 'deposit' ? 'deposit node' : 'card'} activates automatically
                    once the payment is verified.
                  </p>
                </div>
                <button
                  onClick={() => setCheckout(null)}
                  className="w-full mt-2 bg-[#0D1114] border border-white/[0.08] text-slate-200 font-bold py-2.5 rounded-xl text-xs uppercase"
                >
                  Back to Cards
                </button>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="mt-4 space-y-3 font-mono">
                <div className="bg-[#0D1114] border border-white/[0.08] rounded-2xl p-3.5 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>{checkout.mode === 'deposit' ? 'Deposit Type:' : 'Card Tier:'}</span>
                    <span className="font-bold text-white">{checkout.title}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 mt-1">
                    <span>Amount to Pay:</span>
                    <span className="text-base font-black text-[#E5C158]">₹{fmt(checkout.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 mt-1">
                    <span>Locked Gross Yield:</span>
                    <span className="text-emerald-400 font-bold">
                      {(rateForAmount(checkout.amount) * 100).toFixed(1)}% / month
                    </span>
                  </div>
                  {!hasActiveNodes && (
                    <div className="mt-2 pt-2 border-t border-white/[0.08] text-[9px] text-emerald-400">
                      ★ Unlocks your ₹{fmtInt(lockedBonus)} Welcome Bonus into active compounding!
                    </div>
                  )}
                </div>

                <div className="bg-[#0D1114] border border-white/[0.08] rounded-2xl p-4 text-center space-y-2">
                  <p className="text-[9px] font-mono text-[#E5C158] uppercase tracking-widest font-bold">
                    Pay to this UPI ID
                  </p>

                  <div className="w-36 h-36 mx-auto bg-white rounded-xl p-2 flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=vyomnetwork@icici&pn=VYOM%20Network&am=${checkout.amount}&cu=INR`}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <p className="text-xs text-white font-mono font-bold mt-1">vyomnetwork@icici</p>
                  <p className="text-[8px] text-slate-400">
                    Scan with GPay, PhonePe, Paytm or any UPI app
                  </p>
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">
                    Bank UTR / Transaction Reference (12 digits) *
                  </label>
                  <input
                    type="text"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value.trim())}
                    placeholder="e.g. 409821892182"
                    required
                    minLength={12}
                    maxLength={12}
                    className="w-full bg-[#0D1114] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:border-[#D4AF37]/60 outline-none font-mono"
                  />
                  <p className="text-[8px] text-slate-500 mt-1">
                    Found in your payment receipt as "UPI Ref No" or "UTR".
                  </p>
                </div>

                {orderError && (
                  <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center">
                    {orderError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingOrder || utrInput.length !== 12}
                  className="w-full bg-[#E5C158] text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-40"
                >
                  {submittingOrder ? 'Submitting...' : 'Submit Payment Proof'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
