import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Single source of truth for every capital node in the simulator.
// Gross monthly yield scales 3.5% → 8% across the existing card tiers.
export const TIER_CONFIG = {
  starter: { id: 'starter', name: 'Starter Card', capital: 2000, monthlyRate: 0.035 },
  growth: { id: 'growth', name: 'Growth Card', capital: 5000, monthlyRate: 0.045 },
  elite: { id: 'elite', name: 'Elite Card', capital: 10000, monthlyRate: 0.055 },
  prime: { id: 'prime', name: 'Prime Card', capital: 50000, monthlyRate: 0.07 },
  signature: { id: 'signature', name: 'Signature Card', capital: 100000, monthlyRate: 0.08 },
};

export const MIN_DEPOSIT = 100; // ₹100 minimum custom deposit (mirrored in firestore.rules)
export const WELCOME_BONUS = 1000; // ₹1,000 locked bonus, unlocked on first approval
export const PROFIT_SPLIT = 0.5; // 50/50 — Net Take-Home Profit / VYOM Ecosystem Share

const SECONDS_IN_MONTH = 30 * 24 * 3600;

// A custom deposit earns the rate of the highest tier band it reaches, so the
// estimator and the ledger always agree.
export function rateForAmount(amount) {
  const value = Number(amount) || 0;
  const bands = Object.values(TIER_CONFIG).sort((a, b) => a.capital - b.capital);
  let rate = bands[0].monthlyRate;
  bands.forEach((band) => {
    if (value >= band.capital) rate = band.monthlyRate;
  });
  return rate;
}

// Every earning node in the ledger: fixed tier cards + approved custom deposits.
// Sorted by activation time so the ₹1,000 welcome bonus always merges into the
// user's FIRST approved node — deterministic, not dependent on array order.
function buildLedgerNodes(data) {
  const activationTimestamps = data.cardActivatedAt || {};
  const nodes = [];

  (Array.isArray(data.activeCards) ? data.activeCards : []).forEach((cardId) => {
    const config = TIER_CONFIG[cardId];
    if (!config) return; // ignore unknown ids instead of silently pricing them
    nodes.push({
      id: cardId,
      type: 'card',
      name: config.name,
      capital: config.capital,
      monthlyRate: config.monthlyRate,
      activatedAt: activationTimestamps[cardId] || data.joinDate,
    });
  });

  (Array.isArray(data.customDeposits) ? data.customDeposits : []).forEach((deposit) => {
    // customDeposits is the admin-only approved ledger: anything stored here has
    // already passed bank audit, so it carries capital + a frozen rate.
    const capital = Number(deposit.capital || 0);
    if (capital <= 0) return;
    nodes.push({
      id: deposit.id,
      type: 'custom_deposit',
      name: 'Custom Deposit',
      capital,
      // Frozen at approval time so later rate changes never re-price past accrual.
      monthlyRate: Number(deposit.monthlyRate) || rateForAmount(capital),
      activatedAt: deposit.activatedAt || data.joinDate,
    });
  });

  return nodes.sort((a, b) => new Date(a.activatedAt) - new Date(b.activatedAt));
}

// Single source of truth for the deterministic time-based yield math.
// Used by the live ledger ticker AND by the redemption transaction, so the
// server-verified profit always matches what the user actually sees.
function computeLedgerSnapshot(data, nowMs = Date.now()) {
  const nodes = buildLedgerNodes(data);
  const bonusMerged = data.bonusUnlocked ? WELCOME_BONUS : 0;

  let baseCapital = 0;
  let grossProfit = 0;
  let monthlyGross = 0;

  nodes.forEach((node, index) => {
    // ₹100 deposited + ₹1,000 bonus = ₹1,100 active Base Amount earning together.
    const nodeCapital = node.capital + (index === 0 ? bonusMerged : 0);
    baseCapital += nodeCapital;
    monthlyGross += nodeCapital * node.monthlyRate;

    const activatedMs = new Date(node.activatedAt).getTime();
    const elapsedSeconds = Math.max(0, (nowMs - (Number.isFinite(activatedMs) ? activatedMs : nowMs)) / 1000);
    const compoundingFactor = Math.pow(1 + node.monthlyRate, elapsedSeconds / SECONDS_IN_MONTH);
    grossProfit += nodeCapital * (compoundingFactor - 1);
  });

  const redeemedGross = Number(data.redeemedGross || 0);
  const availableGross = Math.max(0, grossProfit - redeemedGross);

  return {
    baseCapital: Number(baseCapital.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    monthlyGross: Number(monthlyGross.toFixed(2)),
    redeemedGross,
    availableGross: Number(availableGross.toFixed(2)),
    nodes,
  };
}

let pendingSignupName = null;
let pendingReferralCode = null;

function generateReferralCode(uid) {
  return 'VYOM-' + (uid ? uid.slice(0, 4).toUpperCase() : 'NODE') + Math.floor(1000 + Math.random() * 9000);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Live Deterministic Ledger
  const [liveLedger, setLiveLedger] = useState({
    baseCapital: 0,
    grossYield: 0,
    monthlyGross: 0,
    userNetYield: 0,
    protocolReserve: 0,
    redeemedGross: 0,
    availableGross: 0,
    totalPortfolio: 0,
  });

  useEffect(() => {
    let unsubscribeFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setAuthLoading(true);

      if (fbUser) {
        setUser(fbUser);
        setIsSyncing(true);

        const userDocRef = doc(db, 'users', fbUser.uid);

        unsubscribeFirestore = onSnapshot(
          userDocRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setUserData({
                ...data,
                activeCards: Array.isArray(data.activeCards) ? data.activeCards : [],
                pendingPurchases: Array.isArray(data.pendingPurchases) ? data.pendingPurchases : [],
                cardActivatedAt: data.cardActivatedAt || {},
                customDeposits: Array.isArray(data.customDeposits) ? data.customDeposits : [],
                lockedBonus: Number(data.lockedBonus ?? 1000),
                bonusUnlocked: Boolean(data.bonusUnlocked),
                availableFund: Number(data.availableFund || 0),
                referralCount: Number(data.referralCount || 0),
                secondaryCount: Number(data.secondaryCount || 0),
                profileCompleted: Boolean(data.profileCompleted),
                upiId: data.upiId || '',
                phone: data.phone || '',
                pendingRedeems: Array.isArray(data.pendingRedeems) ? data.pendingRedeems : [],
                history: Array.isArray(data.history) ? data.history : [],
              });
            } else {
              const role = fbUser.email === 'admin@vyom.network' ? 'admin' : 'user';
              const initialLog = {
                type: 'Protocol Gateway Initialized',
                detail: '₹1,000 Welcome Allocation Granted (Locked until first node activation)',
                amount: 1000,
                date: new Date().toISOString(),
              };

              const newUserData = {
                email: fbUser.email,
                fullName: pendingSignupName || (role === 'admin' ? 'System Administrator' : 'Syndicate Operator'),
                role,
                activeCards: [], // ZERO FREE CARDS
                pendingPurchases: [],
                cardActivatedAt: {},
                customDeposits: [],
                lockedBonus: 1000,
                bonusUnlocked: false,
                availableFund: 0,
                referralEarnings: 0,
                referralCode: role === 'admin' ? 'ADMIN' : generateReferralCode(fbUser.uid),
                referredBy: pendingReferralCode || null,
                referralCount: 0,
                secondaryCount: 0,
                referralRewarded: false,
                pendingRedeems: [],
                profileCompleted: false,
                upiId: '',
                phone: '',
                history: [initialLog],
                joinDate: new Date().toISOString(),
              };

              await setDoc(userDocRef, newUserData);
              setUserData(newUserData);

              pendingSignupName = null;
              pendingReferralCode = null;
            }

            setTimeout(() => {
              setIsSyncing(false);
              setAuthLoading(false);
            }, 1200);
          },
          (err) => {
            console.error('Firestore Realtime Error:', err);
            setIsSyncing(false);
            setAuthLoading(false);
          }
        );
      } else {
        if (unsubscribeFirestore) unsubscribeFirestore();
        setUser(null);
        setUserData(null);
        setIsSyncing(false);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Zero-Cost Timestamp-based Mathematical Yield
  useEffect(() => {
    if (!userData) return;

    const computeYield = () => {
      const snap = computeLedgerSnapshot(userData, Date.now());
      const userNetShare = snap.grossProfit * PROFIT_SPLIT;
      const protocolReserve = snap.grossProfit - userNetShare;
      const totalPortfolio = snap.baseCapital + snap.grossProfit + Number(userData.availableFund || 0);

      setLiveLedger({
        baseCapital: snap.baseCapital,
        grossYield: Number(snap.grossProfit.toFixed(2)),
        monthlyGross: snap.monthlyGross,
        userNetYield: Number(userNetShare.toFixed(2)),
        protocolReserve: Number(protocolReserve.toFixed(2)),
        redeemedGross: snap.redeemedGross,
        availableGross: snap.availableGross,
        totalPortfolio: Number(totalPortfolio.toFixed(2)),
      });
    };

    computeYield();
    const interval = setInterval(computeYield, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  // Submit Card Purchase Order with 12-Digit Bank UTR (Frictionless, No upfront KYC blocked)
  // Wrapped in a transaction: the pending queue is read and re-validated against
  // the LIVE server document inside the same atomic commit, so rapid double-clicks
  // can never overwrite each other's pendingPurchases entry.
  const submitCardPurchase = async (cardId, bankUtr) => {
    if (!user || !userData) return { error: 'Authentication required' };

    const tierInfo = TIER_CONFIG[cardId];
    if (!tierInfo) return { error: 'Invalid card tier' };

    const cleanUtr = String(bankUtr || '').trim();
    if (cleanUtr.length < 8) {
      return { error: 'Please enter a valid 12-digit Bank UTR / Transaction Reference Number.' };
    }

    const now = new Date().toISOString();
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    const orderPayload = {
      orderId,
      type: 'card_purchase',
      cardId,
      cardName: tierInfo.name,
      amount: tierInfo.capital,
      bankUtr: cleanUtr,
      status: 'pending',
      requestedAt: now,
      userId: user.uid,
      userName: userData.fullName || 'Operator',
      userEmail: userData.email,
      userPhone: userData.phone || 'N/A',
    };

    const logEntry = {
      type: `Card Purchase Order Placed: ${tierInfo.name}`,
      detail: `Submitted ₹${tierInfo.capital.toLocaleString('en-IN')} payment with UTR: ${cleanUtr}. Awaiting bank verification.`,
      amount: tierInfo.capital,
      refId: orderId,
      date: now,
    };

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userDocRef);
        if (!snap.exists()) throw new Error('Wallet record not found');

        const data = snap.data();
        const activeList = Array.isArray(data.activeCards) ? data.activeCards : [];
        if (activeList.includes(cardId)) {
          const err = new Error('You already own this active card');
          err.code = 'ALREADY_OWNED';
          throw err;
        }

        const pendingList = Array.isArray(data.pendingPurchases) ? data.pendingPurchases : [];
        if (pendingList.some((p) => p.cardId === cardId && p.status === 'pending')) {
          const err = new Error('A purchase order for this card is already under administrative audit.');
          err.code = 'ALREADY_PENDING';
          throw err;
        }

        transaction.update(userDocRef, {
          pendingPurchases: [orderPayload, ...pendingList],
          history: [logEntry, ...(Array.isArray(data.history) ? data.history : [])],
        });
      });

      return { success: true, orderId };
    } catch (err) {
      if (err.code === 'ALREADY_OWNED' || err.code === 'ALREADY_PENDING') {
        return { error: err.message };
      }
      return { error: err.message };
    }
  };

  // Submit a Custom Micro-Deposit (₹100 minimum) with 12-Digit Bank UTR.
  // Sits alongside the fixed card tiers and routes through the same admin
  // verification queue. The yield rate is resolved here and locked in at
  // approval time, so a later rate-table change never re-prices past accrual.
  // Atomic: duplicate-UTR check + queue prepend happen in ONE transaction.
  const submitCustomDeposit = async (amount, bankUtr) => {
    if (!user || !userData) return { error: 'Authentication required' };

    const depositAmount = Number(amount);
    if (!Number.isFinite(depositAmount) || depositAmount < MIN_DEPOSIT) {
      return { error: `Minimum custom deposit is ₹${MIN_DEPOSIT.toLocaleString('en-IN')}.` };
    }

    const cleanUtr = String(bankUtr || '').trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      return { error: 'Please enter a valid 12-digit Bank UTR / Transaction Reference Number.' };
    }

    const now = new Date().toISOString();
    const orderId = 'DEP-' + Math.floor(100000 + Math.random() * 900000);
    const lockedRate = rateForAmount(depositAmount);

    const depositPayload = {
      orderId,
      type: 'custom_deposit',
      cardId: 'custom_deposit',
      cardName: 'Custom Deposit',
      amount: depositAmount,
      lockedRate,
      bankUtr: cleanUtr,
      status: 'pending',
      requestedAt: now,
      userId: user.uid,
      userName: userData.fullName || 'Operator',
      userEmail: userData.email,
      userPhone: userData.phone || 'N/A',
    };

    const logEntry = {
      type: 'Custom Deposit Order Placed',
      detail: `Submitted ₹${depositAmount.toLocaleString('en-IN')} micro-deposit (locked at ${(
        lockedRate * 100
      ).toFixed(1)}%/month) with UTR: ${cleanUtr}. Awaiting bank verification.`,
      amount: depositAmount,
      refId: orderId,
      date: now,
    };

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userDocRef);
        if (!snap.exists()) throw new Error('Wallet record not found');

        const data = snap.data();
        const pendingList = Array.isArray(data.pendingPurchases) ? data.pendingPurchases : [];
        if (
          pendingList.some(
            (p) => p.type === 'custom_deposit' && p.status === 'pending' && p.bankUtr === cleanUtr
          )
        ) {
          const err = new Error('A deposit with this UTR is already under administrative audit.');
          err.code = 'DUPLICATE_UTR';
          throw err;
        }

        transaction.update(userDocRef, {
          pendingPurchases: [depositPayload, ...pendingList],
          history: [logEntry, ...(Array.isArray(data.history) ? data.history : [])],
        });
      });

      return { success: true, orderId };
    } catch (err) {
      return { error: err.message };
    }
  };

  // 50/50 Profit Redemption Request (2 to 48 Hour SLA)
  // Atomic: profit eligibility check + pending-payout entry + redeemedGross
  // baseline bump all happen inside ONE Firestore transaction, so the same
  // accrued profit can never be redeemed twice (anti double-spend).
  const submitRedemptionRequest = async (grossAmount) => {
    if (!user || !userData) return { error: 'Authentication required' };
    if (!userData.profileCompleted || !userData.upiId) {
      return { error: 'PROFILE_INCOMPLETE', message: 'Please complete your settlement profile before requesting payout.' };
    }

    const requestedGross = Number(grossAmount);
    if (!requestedGross || requestedGross < 500) {
      return { error: 'MIN_LIMIT', message: 'Minimum redemption threshold is ₹500 accrued profit.' };
    }

    const now = new Date().toISOString();
    const requestId = 'VYOM-RD-' + Math.floor(100000 + Math.random() * 900000);
    const userDocRef = doc(db, 'users', user.uid);
    let netPayout = 0;

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userDocRef);
        if (!snap.exists()) throw new Error('Wallet record not found');

        const data = snap.data();
        const merged = { ...userData, ...data };
        const { availableGross } = computeLedgerSnapshot(merged, Date.now());
        const alreadyRedeemed = Number(data.redeemedGross || 0);

        if (availableGross < 500) {
          const err = new Error('MIN_LIMIT');
          err.code = 'MIN_LIMIT';
          throw err;
        }

        if (requestedGross > availableGross + 0.01) {
          const err = new Error('EXCEEDS_AVAILABLE');
          err.code = 'EXCEEDS_AVAILABLE';
          throw err;
        }

        const platformShare = requestedGross * PROFIT_SPLIT;
        netPayout = requestedGross * PROFIT_SPLIT;

        const destinationUpi = data.upiId || userData.upiId;
        const requestPayload = {
          id: requestId,
          userId: user.uid,
          grossAmount: requestedGross,
          platformShare: platformShare,
          amount: netPayout,
          destinationUpi: destinationUpi,
          userPhone: data.phone || userData.phone,
          userName: data.fullName || userData.fullName,
          status: 'pending',
          requestedAt: now,
        };

        const logEntry = {
          type: 'Redemption Request Initiated',
          detail: `Gross Profit: ₹${requestedGross.toFixed(2)} | 50% Platform Fee: -₹${platformShare.toFixed(2)} | Net Payout: ₹${netPayout.toFixed(2)} to ${String(destinationUpi).slice(0, 3)}****`,
          amount: netPayout,
          refId: requestId,
          date: now,
        };

        transaction.update(userDocRef, {
          pendingRedeems: [requestPayload, ...(Array.isArray(data.pendingRedeems) ? data.pendingRedeems : [])],
          history: [logEntry, ...(Array.isArray(data.history) ? data.history : [])],
          redeemedGross: parseFloat((alreadyRedeemed + requestedGross).toFixed(2)),
          lastRedeemAt: now,
        });
      });

      return { success: true, requestId, netPayout };
    } catch (err) {
      if (err.code === 'MIN_LIMIT') {
        return { error: 'MIN_LIMIT', message: 'Minimum redemption threshold is ₹500 accrued profit.' };
      }
      if (err.code === 'EXCEEDS_AVAILABLE') {
        return { error: 'EXCEEDS_AVAILABLE', message: 'Aapka available profit itna nahi hai. Please refresh karke dobara try karein.' };
      }
      return { error: 'SERVER_ERROR', message: err.message };
    }
  };

  const signup = (email, password, fullName, refCode = null) => {
    pendingSignupName = fullName;
    pendingReferralCode = refCode;
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const updateProfile = async (fields) => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, fields);
      setUserData((prev) => ({ ...prev, ...fields }));
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        setUserData,
        authLoading,
        isSyncing,
        liveLedger,
        submitCardPurchase,
        submitCustomDeposit,
        submitRedemptionRequest,
        signup,
        login,
        logout,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};