import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // Default to Card Purchases!
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [bankUtr, setBankUtr] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const uSnap = await getDocs(collection(db, 'users'));
    setUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // 1. ALL PENDING CARD PURCHASES
  const allCardOrders = users
    .filter((u) => u.role !== 'admin')
    .flatMap((u) =>
      (u.pendingPurchases || []).map((p, idx) => ({
        ...p,
        userId: u.id,
        userEmail: u.email,
        userFullName: u.fullName,
        userPhone: u.phone,
        userBonusUnlocked: u.bonusUnlocked,
        activeCards: u.activeCards || [],
        cardActivatedAt: u.cardActivatedAt || {},
        referredBy: u.referredBy,
        idxInUserArray: idx,
      }))
    )
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  const pendingOrders = allCardOrders.filter((o) => o.status === 'pending');

  // 2. ALL PENDING REDEMPTIONS
  const allRedeemRequests = users
    .filter((u) => u.role !== 'admin')
    .flatMap((u) =>
      (u.pendingRedeems || []).map((r, idx) => ({
        ...r,
        userId: u.id,
        userEmail: u.email,
        userFullName: u.fullName,
        userPhone: u.phone,
        userUpiId: u.upiId,
        idxInUserArray: idx,
      }))
    )
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  const pendingRedeems = allRedeemRequests.filter((r) => r.status === 'pending');

  // ─── ACTION A: APPROVE CARD PURCHASE & ACTIVATE NODE ───
  const handleApproveOrder = async (order) => {
    setActionLoading(true);
    setActionError('');

    try {
      const user = users.find((u) => u.id === order.userId);
      if (!user) return;

      const now = new Date().toISOString();
      const updatedPurchases = (user.pendingPurchases || []).map((p, idx) =>
        idx === order.idxInUserArray ? { ...p, status: 'approved', reviewedAt: now } : p
      );

      const activeList = user.activeCards || [];
      const updatedCards = activeList.includes(order.cardId) ? activeList : [...activeList, order.cardId];
      const updatedTimestamps = { ...(user.cardActivatedAt || {}), [order.cardId]: now };
      const shouldUnlockBonus = !user.bonusUnlocked;

      const logEntry = {
        type: `Card Activated by Bank Audit: ${order.cardName}`,
        detail: `Verified Payment of ₹${fmt(order.amount)} (UTR: ${order.bankUtr}). Node activated. ${
          shouldUnlockBonus ? '₹1,000 Welcome Capital unlocked into compounding.' : ''
        }`,
        amount: order.amount,
        refId: order.orderId,
        date: now,
      };

      // Atomic Update User Document
      await updateDoc(doc(db, 'users', order.userId), {
        activeCards: updatedCards,
        cardActivatedAt: updatedTimestamps,
        bonusUnlocked: true,
        pendingPurchases: updatedPurchases,
        history: [logEntry, ...(user.history || [])],
      });

      // Trigger 2-Level Multiplier if first card activated!
      if (shouldUnlockBonus && user.referredBy) {
        // Trigger Level 1 (+200) and Level 2 (+100) rewards
        try {
          const usersRef = collection(db, 'users');
          const q1 = query(usersRef, where('referralCode', '==', user.referredBy.trim()));
          const snap1 = await getDocs(q1);
          if (!snap1.empty) {
            const pDoc = snap1.docs[0];
            const pData = pDoc.data();
            await updateDoc(doc(db, 'users', pDoc.id), {
              availableFund: Number(pData.availableFund || 0) + 200,
              referralEarnings: Number(pData.referralEarnings || 0) + 200,
              referralCount: Number(pData.referralCount || 0) + 1,
              history: [
                {
                  type: 'Tier-1 Direct Expansion Incentive',
                  detail: `Earned from ${user.fullName || 'Operator'} card activation.`,
                  amount: 200,
                  date: now,
                },
                ...(pData.history || []),
              ],
            });

            if (pData.referredBy) {
              const q2 = query(usersRef, where('referralCode', '==', pData.referredBy.trim()));
              const snap2 = await getDocs(q2);
              if (!snap2.empty) {
                const gpDoc = snap2.docs[0];
                const gpData = gpDoc.data();
                await updateDoc(doc(db, 'users', gpDoc.id), {
                  availableFund: Number(gpData.availableFund || 0) + 100,
                  referralEarnings: Number(gpData.referralEarnings || 0) + 100,
                  secondaryCount: Number(gpData.secondaryCount || 0) + 1,
                  history: [
                    {
                      type: 'Tier-2 Syndicate Override Yield',
                      detail: `Secondary override from ${user.fullName || 'Operator'}.`,
                      amount: 100,
                      date: now,
                    },
                    ...(gpData.history || []),
                  ],
                });
              }
            }
          }
        } catch (multiErr) {
          console.error('Multi-tier trigger error:', multiErr);
        }
      }

      fetchUsers();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── ACTION B: REJECT CARD ORDER ───
  const handleRejectOrder = async (order) => {
    setActionLoading(true);
    try {
      const user = users.find((u) => u.id === order.userId);
      if (!user) return;

      const now = new Date().toISOString();
      const updatedPurchases = (user.pendingPurchases || []).map((p, idx) =>
        idx === order.idxInUserArray ? { ...p, status: 'rejected', reviewedAt: now } : p
      );

      const logEntry = {
        type: 'Card Purchase Order Rejected',
        detail: `Payment for ${order.cardName} with UTR: ${order.bankUtr} could not be verified in bank records.`,
        amount: 0,
        refId: order.orderId,
        date: now,
      };

      await updateDoc(doc(db, 'users', order.userId), {
        pendingPurchases: updatedPurchases,
        history: [logEntry, ...(user.history || [])],
      });

      fetchUsers();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── ACTION C: APPROVE REDEMPTION WITH BANK UTR ───
  const handleApproveRedeem = async (request) => {
    if (!bankUtr.trim() || bankUtr.trim().length < 6) {
      setActionError('Please enter a valid Bank UTR / Transaction Reference Number (min 6 chars).');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      const user = users.find((u) => u.id === request.userId);
      if (!user) return;

      const now = new Date().toISOString();
      const updatedRedeems = (user.pendingRedeems || []).map((r, idx) =>
        idx === request.idxInUserArray
          ? { ...r, status: 'approved', bankUtr: bankUtr.trim(), reviewedAt: now }
          : r
      );

      const historyEntry = {
        type: 'Settlement Completed via Bank Transfer',
        detail: `Net Payout of ₹${fmt(request.amount || request.netPayout)} dispatched to ${
          request.destinationUpi || request.userUpiId
        }. Bank UTR: ${bankUtr.trim()}`,
        amount: request.amount || request.netPayout,
        refId: request.id,
        bankUtr: bankUtr.trim(),
        date: now,
      };

      await updateDoc(doc(db, 'users', request.userId), {
        pendingRedeems: updatedRedeems,
        history: [historyEntry, ...(user.history || [])],
      });

      setSelectedRequest(null);
      setBankUtr('');
      fetchUsers();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B10] text-[#E2E8F0] p-6 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div>
            <h1 className="text-xl font-black text-cyan-300 uppercase tracking-wider">
              VYOM Protocol Audit Console
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Master Settlement & Capital Node Oversight</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2 rounded-xl hover:bg-red-500/20"
          >
            Logout
          </button>
        </div>

        {/* 3 Tabs: Orders | Redeems | Users */}
        <div className="flex gap-2 bg-[#0C131D] p-1.5 rounded-2xl border border-cyan-500/20">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-400'
            }`}
          >
            Card Purchase Orders ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('redeems')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'redeems' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-400'
            }`}
          >
            Pending Redemptions ({pendingRedeems.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-400'
            }`}
          >
            Registered Operators ({users.filter((u) => u.role !== 'admin').length})
          </button>
        </div>

        {/* ─── TAB 1: PENDING CARD PURCHASE ORDERS ─── */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="bg-[#0C131D] rounded-2xl p-8 text-center border border-white/5">
                <p className="text-sm text-slate-400">No pending card purchase orders.</p>
              </div>
            ) : (
              pendingOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="bg-[#0C131D] border border-cyan-500/20 rounded-2xl p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{order.userName || order.userFullName}</p>
                      <span className="text-[9px] text-cyan-400">#{order.orderId}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{order.userEmail} • +91 {order.userPhone}</p>
                    <p className="text-sm text-cyan-300 font-bold mt-2">
                      Card: {order.cardName} • Capital: ₹{fmt(order.amount)}
                    </p>
                    <div className="mt-1 bg-[#070B10] border border-cyan-500/30 p-2 rounded-xl inline-block">
                      <p className="text-[10px] text-slate-400">User-Submitted Bank UTR:</p>
                      <p className="text-xs font-black text-emerald-400 tracking-wider">{order.bankUtr}</p>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1">
                      Submitted: {new Date(order.requestedAt).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApproveOrder(order)}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs uppercase"
                    >
                      {actionLoading ? 'Activating...' : 'Approve & Activate'}
                    </button>
                    <button
                      onClick={() => handleRejectOrder(order)}
                      disabled={actionLoading}
                      className="bg-red-600/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 font-bold px-4 py-1.5 rounded-xl text-xs uppercase"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── TAB 2: PENDING REDEMPTIONS ─── */}
        {activeTab === 'redeems' && (
          <div className="space-y-3">
            {pendingRedeems.length === 0 ? (
              <div className="bg-[#0C131D] rounded-2xl p-8 text-center border border-white/5">
                <p className="text-sm text-slate-400">No pending redemption requests.</p>
              </div>
            ) : (
              pendingRedeems.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#0C131D] border border-cyan-500/20 rounded-2xl p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{req.userName || req.userFullName}</p>
                      <span className="text-[9px] text-cyan-400">#{req.id}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{req.userEmail}</p>
                    <p className="text-xs text-cyan-300 font-bold mt-2">
                      Gross: ₹{fmt(req.grossAmount)} ➔ Net Payout: ₹{fmt(req.amount || req.netPayout)}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-bold mt-1">
                      UPI ID: {req.destinationUpi || req.userUpiId || 'Not Configured'}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1">
                      Phone: +91 {req.userPhone || 'N/A'} • {new Date(req.requestedAt).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setBankUtr('');
                      setActionError('');
                    }}
                    className="bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-cyan-500/30"
                  >
                    Audit & Settle
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── TAB 3: REGISTERED OPERATORS ─── */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {users
              .filter((u) => u.role !== 'admin')
              .map((u) => (
                <div key={u.id} className="bg-[#0C131D] border border-white/5 rounded-2xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-white">{u.fullName || 'Operator'}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                      <p className="text-[10px] text-cyan-300 mt-1">
                        Active Cards: {(u.activeCards || []).join(', ') || 'None'} • UPI: {u.upiId || 'Incomplete'}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        u.profileCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {u.profileCompleted ? 'Audited' : 'Incomplete'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* REDEMPTION MODAL WITH BANK UTR NUMBER INPUT */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#0C131D] border border-cyan-400/30 rounded-3xl p-6 text-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white uppercase">Redemption Settlement Audit</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <p>Operator: <strong className="text-white">{selectedRequest.userName}</strong></p>
                <p>Unmasked UPI ID: <strong className="text-cyan-300 text-sm">{selectedRequest.destinationUpi || selectedRequest.userUpiId}</strong></p>
                <p>Phone Number: <strong className="text-slate-200">+91 {selectedRequest.userPhone}</strong></p>
                <div className="bg-[#070B10] p-3 rounded-xl border border-cyan-500/20 text-sm">
                  <p className="text-slate-400 text-xs">Net Amount to Transfer via UPI:</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                    ₹{fmt(selectedRequest.amount || selectedRequest.netPayout)}
                  </p>
                </div>

                <div className="pt-2">
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Enter Bank UTR / Transaction Reference (12 digits)
                  </label>
                  <input
                    type="text"
                    value={bankUtr}
                    onChange={(e) => setBankUtr(e.target.value)}
                    placeholder="e.g. 409821892182"
                    className="w-full bg-[#070B10] border border-cyan-500/40 rounded-xl p-3 text-xs text-white focus:border-cyan-400 outline-none"
                  />
                  <p className="text-[8px] text-slate-500 mt-1">
                    *This UTR will be permanently logged into the operator's digital ledger passbook.
                  </p>
                </div>

                {actionError && (
                  <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-xl text-center">
                    {actionError}
                  </p>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => handleApproveRedeem(selectedRequest)}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold py-3 rounded-xl text-xs uppercase"
                  >
                    {actionLoading ? 'Saving...' : 'Approve & Mark Settled'}
                  </button>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-xs uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}