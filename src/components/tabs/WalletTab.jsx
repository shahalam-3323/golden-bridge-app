import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MIN_WITHDRAWAL = 500;

const PASSBOOK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'cards', label: 'Cards' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'payouts', label: 'Payouts' },
];

const categoryOf = (type = '') => {
  if (type.includes('Card') || type.includes('Deposit')) return 'cards';
  if (type.includes('Tier-1') || type.includes('Tier-2')) return 'referrals';
  if (type.includes('Redemption') || type.includes('Settlement')) return 'payouts';
  return 'other';
};

export default function WalletTab({ onOpenProfile }) {
  const { userData, liveLedger, submitRedemptionRequest } = useAuth();

  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [redeemError, setRedeemError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passbookFilter, setPassbookFilter] = useState('all');

  // Profit already redeemed is deducted so the SAME accrued profit can't be
  // requested twice (see submitRedemptionRequest transaction).
  const accruedGrossProfit = Number(liveLedger.grossYield || 0);
  const redeemedGross = Number(liveLedger.redeemedGross || 0);
  const grossProfit = Math.max(
    0,
    Number(liveLedger.availableGross != null ? liveLedger.availableGross : accruedGrossProfit - redeemedGross)
  );
  // Only generated profit is shared 50/50 — the user's principal is untouched
  // and there are no fixed platform charges.
  const vyomShare = grossProfit * 0.5;
  const netYouGet = grossProfit * 0.5;
  const progressPct = Math.min(100, (grossProfit / MIN_WITHDRAWAL) * 100);

  const hasUpi = Boolean(userData?.profileCompleted && userData?.upiId);

  const maskedUpi = userData?.upiId
    ? userData.upiId.replace(/^(.)(.*)(@.*)$/, (_, first, middle, last) => first + '****' + last)
    : 'Not Configured';

  const pendingRedeems = (userData?.pendingRedeems || []).filter((r) => r.status === 'pending');
  const pendingOrders = (userData?.pendingPurchases || []).filter((p) => p.status === 'pending');

  const history = userData?.history || [];
  const filteredHistory =
    passbookFilter === 'all'
      ? history
      : history.filter((log) => categoryOf(log.type) === passbookFilter);

  const openRedeemModal = () => {
    setRedeemSuccess(null);
    setRedeemError('');
    setShowRedeemModal(true);
  };

  const handleInitiateRedeem = async () => {
    if (isSubmitting) return;

    if (!hasUpi) {
      setShowRedeemModal(false);
      onOpenProfile?.();
      return;
    }

    setIsSubmitting(true);
    setRedeemError('');

    const res = await submitRedemptionRequest(grossProfit);
    setIsSubmitting(false);

    if (res.error) {
      setRedeemError(res.message);
    } else {
      setRedeemSuccess(res);
    }
  };

  return (
    <div className="px-5 pt-2 pb-4 space-y-4 animate-fadeIn font-sans">
      {/* 1. WITHDRAWABLE PROFIT */}
      <div className="bg-[#11161A] border border-[#D4AF37]/25 rounded-2xl p-5">
        <p className="text-[9px] font-mono text-[#E5C158] uppercase tracking-[0.25em] font-bold">
          Withdrawable Profit
        </p>

        <div className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>Gross Profit</span>
            <span className="font-mono font-bold text-white">₹{fmt(grossProfit)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>50/50 Profit Split (Zero Fixed Fees)</span>
            <span className="font-mono">-₹{fmt(vyomShare)}</span>
          </div>
          <p className="text-[9px] text-slate-500 leading-relaxed">
            Sirf generated profit 50/50 share hota hai — aapka principal 100% untouched rehta hai.
          </p>
          <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-200">Net You Get</span>
            <span className="text-lg font-black font-mono text-emerald-400">₹{fmt(netYouGet)}</span>
          </div>
        </div>

        {/* Progress toward ₹500 minimum */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1.5">
            <span>Minimum ₹{MIN_WITHDRAWAL} required to withdraw</span>
            <span className={grossProfit >= MIN_WITHDRAWAL ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              ₹{fmt(grossProfit)} / ₹{MIN_WITHDRAWAL}
            </span>
          </div>
          <div className="h-1.5 bg-[#0D1114] rounded-full overflow-hidden border border-white/[0.08]">
            <div
              className="h-full bg-[#E5C158] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <button
          onClick={openRedeemModal}
          disabled={grossProfit < MIN_WITHDRAWAL}
          className="w-full mt-4 bg-[#E5C158] text-black font-bold py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-40 transition-all"
        >
          {grossProfit < MIN_WITHDRAWAL ? `₹${MIN_WITHDRAWAL} Minimum Required` : 'Redeem Profit'}
        </button>
      </div>

      {/* 2. REGISTERED UPI STATUS */}
      <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-white">Registered UPI ID</h4>
          {hasUpi ? (
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              ✓ Active
            </span>
          ) : (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Not Added
            </span>
          )}
        </div>

        {hasUpi ? (
          <div className="space-y-3">
            <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3">
              <p className="text-[9px] text-slate-400">Payout goes to</p>
              <p className="text-sm font-mono font-bold text-[#E5C158] mt-0.5">{maskedUpi}</p>
            </div>
            <button
              onClick={openRedeemModal}
              disabled={isSubmitting}
              className="w-full bg-[#0D1114] border border-[#D4AF37]/30 text-[#E5C158] font-bold py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-40 transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Request Payout (2–48 hrs)'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Add your UPI ID to receive your profit directly in your bank account.
            </p>
            <button
              onClick={() => onOpenProfile?.()}
              className="w-full bg-[#E5C158] text-black font-bold py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              Setup UPI ID
            </button>
          </div>
        )}
      </div>

      {/* 3. PENDING PAYOUTS / ORDERS */}
      <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-white">Pending / In Verification</h4>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            {pendingRedeems.length + pendingOrders.length} in progress
          </span>
        </div>

        {pendingRedeems.length === 0 && pendingOrders.length === 0 ? (
          <p className="text-[11px] text-slate-500 text-center py-3">
            Koi pending payout ya order nahi hai.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingRedeems.map((r) => (
              <div
                key={r.id}
                className="bg-[#0D1114] border border-amber-500/25 rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs"
              >
                <div>
                  <p className="text-slate-200 font-semibold">Payout Request</p>
                  <p className="text-[8px] font-mono text-slate-500 mt-0.5">
                    #{r.id} • {new Date(r.requestedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-emerald-400">₹{fmt(r.amount || r.netPayout)}</p>
                  <p className="text-[8px] font-mono text-amber-400">2–48 hrs</p>
                </div>
              </div>
            ))}

            {pendingOrders.map((o) => (
              <div
                key={o.orderId}
                className="bg-[#0D1114] border border-amber-500/25 rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs"
              >
                <div>
                  <p className="text-slate-200 font-semibold">{o.cardName}</p>
                  <p className="text-[8px] font-mono text-slate-500 mt-0.5">
                    #{o.orderId} • UTR {o.bankUtr}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-[#E5C158]">₹{fmt(o.amount)}</p>
                  <p className="text-[8px] font-mono text-amber-400">5–30 mins</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. PASSBOOK & HISTORY */}
      <div className="bg-[#11161A] border border-white/[0.08] rounded-2xl p-4">
        <h4 className="text-xs font-bold text-white mb-3">Passbook &amp; History</h4>

        <div className="flex gap-1.5 mb-3">
          {PASSBOOK_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setPassbookFilter(f.id)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                passbookFilter === f.id
                  ? 'bg-[#E5C158]/15 text-[#E5C158] border border-[#D4AF37]/40'
                  : 'bg-[#0D1114] text-slate-400 border border-white/[0.08]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-[11px] text-slate-500 text-center py-3">No entries yet.</p>
        ) : (
          <div className="space-y-2">
            {filteredHistory.slice(0, 20).map((log, i) => (
              <div
                key={`${log.refId || log.type}-${i}`}
                className="bg-[#0D1114] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs"
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="text-slate-200 font-semibold leading-snug">{log.type}</p>
                  {log.amount != null && (
                    <span className="text-[#E5C158] font-mono font-bold whitespace-nowrap">
                      ₹{fmt(log.amount)}
                    </span>
                  )}
                </div>
                <p className="text-[8px] font-mono text-slate-500 mt-1">
                  {new Date(log.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {log.refId && ` • ${log.refId}`}
                  {log.bankUtr && ` • UTR ${log.bankUtr}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REDEEM MODAL */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050708]/90 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#11161A] border border-white/[0.08] rounded-3xl p-5 text-[#E2E8F0] font-sans">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[8px] font-mono tracking-widest uppercase text-[#E5C158] bg-[#E5C158]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">
                  Payout Request
                </span>
                <h3 className="text-base font-black text-white mt-1 uppercase tracking-wide">
                  Redeem Profit
                </h3>
              </div>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="w-8 h-8 rounded-full bg-[#0D1114] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {redeemSuccess ? (
              <div className="py-6 text-center space-y-3 font-mono">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl">
                  ✓
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Payout Request Submitted
                </h4>
                <p className="text-xs text-[#E5C158] font-bold">
                  Net Payout: ₹{fmt(redeemSuccess.netPayout)}
                </p>
                <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3 text-[10px] text-slate-400 leading-relaxed text-left">
                  <p>• Payout ID: <strong className="text-white">#{redeemSuccess.requestId}</strong></p>
                  <p>• Destination: <strong className="text-[#E5C158]">{maskedUpi}</strong></p>
                  <p>• Status: <strong className="text-amber-400">Under Verification</strong></p>
                  <p className="mt-2 text-slate-500 text-[9px]">
                    Amount aapke UPI ID par <strong>2 to 48 hours</strong> mein transfer hoga.
                  </p>
                </div>
                <button
                  onClick={() => setShowRedeemModal(false)}
                  className="w-full mt-2 bg-[#0D1114] border border-white/[0.08] text-slate-200 font-bold py-2.5 rounded-xl text-xs uppercase"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3 font-mono">
                <div className="bg-[#0D1114] border border-white/[0.08] rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Gross Profit:</span>
                    <span className="font-bold text-white">₹{fmt(grossProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>50/50 Profit Split (Zero Fixed Fees):</span>
                    <span>-₹{fmt(vyomShare)}</span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center text-sm font-black text-slate-200">
                    <span>Net You Get:</span>
                    <span className="text-emerald-400">₹{fmt(netYouGet)}</span>
                  </div>
                </div>

                <div className="bg-[#0D1114] border border-white/[0.08] rounded-xl p-3 text-xs">
                  <p className="text-[9px] text-slate-400 uppercase">Payout UPI ID</p>
                  <p className="text-[#E5C158] font-bold mt-0.5">{maskedUpi}</p>
                </div>

                {redeemError && (
                  <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-center">
                    {redeemError}
                  </div>
                )}

                <p className="text-[9px] text-slate-400 leading-relaxed text-center">
                  Verification ke baad amount <strong>2 to 48 hours</strong> mein UPI par transfer hoga.
                  Minimum ₹{MIN_WITHDRAWAL}.
                </p>

                <button
                  onClick={handleInitiateRedeem}
                  disabled={isSubmitting || grossProfit < MIN_WITHDRAWAL}
                  className="w-full bg-[#E5C158] text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-40"
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : grossProfit < MIN_WITHDRAWAL
                    ? `Minimum ₹${MIN_WITHDRAWAL} Required`
                    : 'Confirm Payout Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
