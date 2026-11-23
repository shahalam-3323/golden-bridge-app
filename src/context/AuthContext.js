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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          const ref = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(ref);

          if (snap.exists()) {
            const existing = snap.data();
            setUserData({
              ...existing,
              userIdNumber: existing.userIdNumber || fbUser.uid.slice(0, 8).toUpperCase(),
            });
          } else {
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
              cardActivatedAt: {},
              pendingPurchases: [],
              availableFund: 0,
              growthBalance: 0,
              settledGrowth: 0,
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
    return () => unsub();
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
      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, fields);
      setUserData((prev) => ({ ...(prev || {}), ...fields }));
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  const submitCardOrder = async (tierObj, bankUtr) => {
    if (!user) return { error: 'Not logged in' };
    const pendingList = Array.isArray(userData?.pendingPurchases) ? userData.pendingPurchases : [];

    const cleanUtr = String(bankUtr || '').trim();
    if (cleanUtr.length < 6) {
      return { error: 'Please enter a valid UTR / transaction reference (min 6 characters).' };
    }

    const tierMeta = TIER_CONFIG[tierObj?.id] || tierObj || TIER_CONFIG.starter;
    const now = new Date().toISOString();
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();

    const newOrder = {
      orderId,
      cardId: tierMeta.id,
      cardName: tierMeta.name,
      amount: Number(tierMeta.capital) || 2000,
      lockedRate: Number(tierMeta.monthlyRate) || 0.035,
      bankUtr: cleanUtr,
      status: 'pending',
      requestedAt: now,
    };

    const historyEntry = {
      type: `Card Order Submitted: ${newOrder.cardName}`,
      detail: `UTR ${cleanUtr} submitted for ₹${newOrder.amount.toLocaleString('en-IN')} card activation (2–48h verification).`,
      amount: newOrder.amount,
      refId: orderId,
      status: 'Pending',
      date: now,
    };

    try {
      const ref = doc(db, 'users', user.uid);
      const nextPending = [newOrder, ...pendingList];
      const nextHistory = [historyEntry, ...(userData?.history || [])];

      await updateDoc(ref, {
        pendingPurchases: nextPending,
        history: nextHistory,
      });

      setUserData((prev) => ({
        ...(prev || {}),
        pendingPurchases: nextPending,
        history: nextHistory,
      }));

      return { success: true, order: newOrder };
    } catch (err) {
      return { error: err.message || 'Could not submit card order.' };
    }
  };

  const requestWithdrawal = async (amount, destinationUpi) => {
    if (!user) return { error: 'Not logged in' };
    const cleanUpi = String(destinationUpi || userData?.upiId || '').trim();
    const numericAmount = Number(amount);

    if (!cleanUpi || !cleanUpi.includes('@')) {
      return { error: 'Please enter a valid UPI ID (e.g., name@upi).' };
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { error: 'Please enter a valid withdrawal amount.' };
    }

    const available = Number(userData?.availableFund ?? userData?.growthBalance ?? 0);
    if (numericAmount > available) {
      return { error: 'Requested amount exceeds available balance.' };
    }

    const now = new Date().toISOString();
    const reqId = 'WDR-' + Date.now().toString(36).toUpperCase();
    const netPayout = Number((numericAmount * 0.5).toFixed(2));

    const newRedeem = {
      id: reqId,
      grossAmount: numericAmount,
      netPayout,
      amount: netPayout,
      destinationUpi: cleanUpi,
      status: 'pending',
      requestedAt: now,
    };

    const historyEntry = {
      type: 'UPI Withdrawal Requested',
      detail: `Gross ₹${numericAmount.toLocaleString('en-IN')} (50/50 split -> Net ₹${netPayout.toLocaleString('en-IN')}) to ${cleanUpi}.`,
      amount: -netPayout,
      refId: reqId,
      status: 'Pending',
      date: now,
    };

    try {
      const ref = doc(db, 'users', user.uid);
      const nextRedeems = [newRedeem, ...(userData?.pendingRedeems || [])];
      const nextHistory = [historyEntry, ...(userData?.history || [])];

      await updateDoc(ref, {
        upiId: cleanUpi,
        pendingRedeems: nextRedeems,
        history: nextHistory,
      });

      setUserData((prev) => ({
        ...(prev || {}),
        upiId: cleanUpi,
        pendingRedeems: nextRedeems,
        history: nextHistory,
      }));

      return { success: true, request: newRedeem };
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