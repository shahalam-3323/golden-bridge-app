import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const TIER_CONFIG = {
  starter: { id: 'starter', name: 'Starter', capital: 2000, monthlyRate: 0.035 },
  growth: { id: 'growth', name: 'Growth', capital: 5000, monthlyRate: 0.045 },
  elite: { id: 'elite', name: 'Elite', capital: 10000, monthlyRate: 0.055 },
  prime: { id: 'prime', name: 'Prime', capital: 50000, monthlyRate: 0.07 },
  signature: { id: 'signature', name: 'Signature', capital: 100000, monthlyRate: 0.08 },
};

const MAX_PENDING_ORDERS = 3;
const MAX_PENDING_REDEEMS = 3;

let pendingSignupName = null;
let pendingReferralCode = null;

function generateReferralCode(uid) {
  return 'VYOM-' + uid.slice(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = null;

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (fbUser) {
        setUser(fbUser);
        try {
          const ref = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(ref);

          if (!snap.exists()) {
            const role = fbUser.email === 'admin@vyom.network' ? 'admin' : 'user';
            const isAdmin = role === 'admin';

            const newUser = {
              email: fbUser.email,
              userIdNumber: fbUser.uid.slice(0, 8).toUpperCase(),
              fullName:
                pendingSignupName ||
                fbUser.displayName ||
                (isAdmin ? 'Admin' : 'VYOM Member'),
              role,
              activeCards: [],
              activeCardInstances: [],
              cardActivatedAt: {},
              pendingPurchases: [],
              customDeposits: [],
              availableFund: 0,
              growthBalance: 0,
              settledGrowth: 0,
              redeemedGross: 0,
              bonusUnlocked: false,
              lastSettlementAt: new Date().toISOString(),
              referralCode: isAdmin ? 'ADMIN' : generateReferralCode(fbUser.uid),
              referredBy: pendingReferralCode || null,
              referralCount: 0,
              secondaryCount: 0,
              referralEarnings: 0,
              pendingRedeems: [],
              profileCompleted: false,
              phone: null,
              upiId: null,
              history: isAdmin
                ? []
                : [
                    {
                      type: 'Account Created',
                      detail: 'VYOM Network account initialized.',
                      amount: 0,
                      date: new Date().toISOString(),
                    },
                  ],
              joinDate: new Date().toISOString(),
            };

            await setDoc(ref, newUser);
            setUserData(newUser);
          }

          // Real-time listener so Admin approvals appear immediately
          unsubDoc = onSnapshot(
            ref,
            (liveSnap) => {
              if (liveSnap.exists()) {
                const liveData = liveSnap.data();
                setUserData({
                  ...liveData,
                  userIdNumber:
                    liveData.userIdNumber || fbUser.uid.slice(0, 8).toUpperCase(),
                });
              }
            },
            (snapErr) => {
              console.error('Firestore live listener error:', snapErr);
            }
          );
        } catch (err) {
          console.error('Auth sync error:', err);
        } finally {
          pendingSignupName = null;
          pendingReferralCode = null;
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setAuthLoading(false);
    });

    return () => {
      if (unsubDoc) unsubDoc();
      unsub();
    };
  }, []);

  const signup = async (email, password, fullName, refCode = null) => {
    pendingSignupName = fullName;
    pendingReferralCode = refCode;
    try {
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      pendingSignupName = null;
      pendingReferralCode = null;
      throw err;
    }
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = async (refCode = null) => {
    const provider = new GoogleAuthProvider();
    pendingReferralCode = refCode;
    try {
      return await signInWithPopup(auth, provider);
    } catch (err) {
      pendingReferralCode = null;
      throw err;
    }
  };

  const logout = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const updateProfile = async (fields) => {
    if (!user) return { error: 'Not logged in' };
    try {
      // Whitelist only safe profile fields
      const safeFields = {};
      if (typeof fields.fullName === 'string') {
        safeFields.fullName = fields.fullName.trim().slice(0, 80);
      }
      if (typeof fields.phone === 'string') {
        safeFields.phone = fields.phone.trim().slice(0, 20);
      }
      if (typeof fields.upiId === 'string') {
        safeFields.upiId = fields.upiId.trim().slice(0, 80);
      }
      if (typeof fields.profileCompleted === 'boolean') {
        safeFields.profileCompleted = fields.profileCompleted;
      }

      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, safeFields);
      setUserData((prev) => ({ ...(prev || {}), ...safeFields }));
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  // Supports both a single tier object and a bundled array of cart items
  const submitCardOrder = async (tierOrCartItems, bankUtr) => {
    if (!user) return { error: 'Not logged in' };

    const cleanUtr = String(bankUtr || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9]{6,32}$/.test(cleanUtr)) {
      return {
        error: 'Please enter a valid 12-digit Bank UTR / transaction reference (letters/digits only).',
      };
    }

    const rawItems = Array.isArray(tierOrCartItems)
      ? tierOrCartItems
      : [
          {
            tier: TIER_CONFIG[tierOrCartItems?.id] || tierOrCartItems || TIER_CONFIG.starter,
            qty: 1,
          },
        ];

    const normalizedItems = rawItems
      .map((entry) => {
        const src = entry?.tier || entry || TIER_CONFIG.starter;
        const meta = TIER_CONFIG[src?.id] || src;
        const qty = Math.max(1, Math.min(20, parseInt(entry?.qty ?? 1, 10) || 1));
        const capital = Number(meta?.capital) || 2000;
        const monthlyRate = Number(meta?.monthlyRate) || 0.035;
        return {
          cardId: meta?.id || 'starter',
          cardName: meta?.name || 'Starter',
          capital,
          monthlyRate,
          qty,
          lineTotal: capital * qty,
        };
      })
      .filter((item) => item.qty > 0);

    if (normalizedItems.length === 0) {
      return { error: 'Please select at least one Capital Card in your cart.' };
    }

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const primaryItem = normalizedItems[0];
    const cardSummaryLabel = normalizedItems
      .map((item) => (item.qty > 1 ? `${item.cardName} ×${item.qty}` : item.cardName))
      .join(' + ');

    try {
      const userRef = doc(db, 'users', user.uid);
      const utrRef = doc(db, 'used_utrs', cleanUtr);
      const now = new Date().toISOString();
      const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();

      const newOrder = {
        orderId,
        type: 'card_purchase',
        cardId: primaryItem.cardId,
        cardName: cardSummaryLabel,
        items: normalizedItems,
        amount: totalAmount,
        lockedRate: Number(primaryItem.monthlyRate) || 0.035,
        bankUtr: cleanUtr,
        status: 'pending',
        requestedAt: now,
      };

      const historyEntry = {
        type: `Card Order Submitted: ${cardSummaryLabel}`,
        detail: `UTR ${cleanUtr} submitted for ${cardSummaryLabel} (₹${totalAmount.toLocaleString('en-IN')}) — Approval Pending (2–48h bank verification).`,
        amount: totalAmount,
        refId: orderId,
        status: 'Pending',
        date: now,
      };

      // Atomic transaction: blocks global duplicate UTRs & enforces max 3 pending orders
      const result = await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error('User document not found');

        const utrSnap = await tx.get(utrRef);
        if (utrSnap.exists()) {
          throw new Error('This UTR has already been submitted and cannot be reused.');
        }

        const freshData = userSnap.data();
        const pendingList = Array.isArray(freshData.pendingPurchases)
          ? freshData.pendingPurchases
          : [];
        const activePendingCount = pendingList.filter((o) => o?.status === 'pending').length;

        if (activePendingCount >= MAX_PENDING_ORDERS) {
          throw new Error(
            `Maximum ${MAX_PENDING_ORDERS} pending orders allowed at a time. Please wait for current orders to be verified.`
          );
        }

        const historyList = Array.isArray(freshData.history) ? freshData.history : [];
        const nextPending = [newOrder, ...pendingList];
        const nextHistory = [historyEntry, ...historyList];

        tx.set(utrRef, {
          utr: cleanUtr,
          uid: user.uid,
          orderId,
          amount: totalAmount,
          createdAt: now,
        });

        tx.update(userRef, {
          pendingPurchases: nextPending,
          history: nextHistory,
        });

        return { nextPending, nextHistory };
      });

      setUserData((prev) => ({
        ...(prev || {}),
        pendingPurchases: result.nextPending,
        history: result.nextHistory,
      }));

      return { success: true, order: newOrder };
    } catch (err) {
      return { error: err.message || 'Could not submit card order.' };
    }
  };

  const requestWithdrawal = async (amount, destinationUpi) => {
    if (!user) return { error: 'Not logged in' };

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 500) {
      return { error: 'Minimum withdrawal amount is ₹500.' };
    }

    try {
      const ref = doc(db, 'users', user.uid);
      const now = new Date().toISOString();
      const reqId = 'WDR-' + Date.now().toString(36).toUpperCase();

      const result = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('User document not found');
        const freshData = snap.data();

        const cleanUpi = String(
          destinationUpi || freshData?.upiId || userData?.upiId || ''
        ).trim();
        if (!cleanUpi || !/^[a-zA-Z0-9._-]{2,50}@[a-zA-Z0-9.-]{2,30}$/.test(cleanUpi)) {
          throw new Error('Please enter a valid UPI ID (e.g., name@upi).');
        }

        const pendingRedeems = Array.isArray(freshData.pendingRedeems)
          ? freshData.pendingRedeems
          : [];
        const activeRedeemCount = pendingRedeems.filter((r) => r?.status === 'pending').length;
        if (activeRedeemCount >= MAX_PENDING_REDEEMS) {
          throw new Error(`Maximum ${MAX_PENDING_REDEEMS} pending withdrawal requests allowed.`);
        }

        const lockedPendingGross = pendingRedeems
          .filter((r) => r?.status === 'pending')
          .reduce((sum, r) => sum + (Number(r?.grossAmount) || 0), 0);

        const available = Number(freshData?.availableFund ?? 0) - lockedPendingGross;
        if (numericAmount > available) {
          throw new Error('Requested amount exceeds available unlocked balance.');
        }

        const historyList = Array.isArray(freshData.history) ? freshData.history : [];
        const currentRedeemedGross = Number(freshData.redeemedGross ?? 0);

        const newRedeem = {
          id: reqId,
          grossAmount: numericAmount,
          netPayout: numericAmount,
          amount: numericAmount,
          destinationUpi: cleanUpi,
          status: 'pending',
          requestedAt: now,
        };

        const historyEntry = {
          type: 'UPI Withdrawal Requested',
          detail: `Amount ₹${numericAmount.toLocaleString('en-IN')} requested to ${cleanUpi}.`,
          amount: -numericAmount,
          refId: reqId,
          status: 'Pending',
          date: now,
        };

        const nextRedeems = [newRedeem, ...pendingRedeems];
        const nextHistory = [historyEntry, ...historyList];
        const nextRedeemedGross = currentRedeemedGross + numericAmount;

        tx.update(ref, {
          upiId: cleanUpi,
          pendingRedeems: nextRedeems,
          history: nextHistory,
          redeemedGross: nextRedeemedGross,
        });

        return { cleanUpi, nextRedeems, nextHistory, nextRedeemedGross, newRedeem };
      });

      setUserData((prev) => ({
        ...(prev || {}),
        upiId: result.cleanUpi,
        pendingRedeems: result.nextRedeems,
        history: result.nextHistory,
        redeemedGross: result.nextRedeemedGross,
      }));

      return { success: true, request: result.newRedeem };
    } catch (err) {
      return { error: err.message || 'Could not submit withdrawal request.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        setUserData,
        authLoading,
        signup,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        updateProfile,
        submitCardOrder,
        requestWithdrawal,
        TIER_CONFIG,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};