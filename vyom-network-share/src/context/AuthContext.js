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
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const TIER_CONFIG = {
  starter: { id: 'starter', name: 'Starter Card', capital: 2000 },
  growth: { id: 'growth', name: 'Growth Card', capital: 5000 },
  elite: { id: 'elite', name: 'Elite Card', capital: 10000 },
  prime: { id: 'prime', name: 'Prime Card', capital: 50000 },
  signature: { id: 'signature', name: 'Signature Card', capital: 100000 },
};

const MONTHLY_RATE = 0.04; // Calibrated 4.0%
const SECONDS_IN_MONTH = 30 * 24 * 3600;

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
    userNetYield: 0,
    protocolReserve: 0,
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
                lockedBonus: 1000,
                bonusUnlocked: false,
                availableFund: 0,
                referralEarnings: 0,
                referralCode: role === 'admin' ? 'ADMIN' : generateReferralCode(fbUser.uid),
                referredBy: pendingReferralCode || null,
                referralCount: 0,
                secondaryCount: 0,
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
      const activeList = userData.activeCards || [];
      const activationTimestamps = userData.cardActivatedAt || {};
      const now = Date.now();

      if (activeList.length === 0) {
        setLiveLedger({
          baseCapital: 0,
          grossYield: 0,
          userNetYield: 0,
          protocolReserve: 0,
          totalPortfolio: Number(userData.availableFund || 0),
        });
        return;
      }

      let totalBaseCapital = 0;
      let totalGrossProfit = 0;
      const bonusMerged = userData.bonusUnlocked ? 1000 : 0;

      activeList.forEach((cardId, index) => {
        const config = TIER_CONFIG[cardId] || { capital: 2000 };
        const nodeCapital = config.capital + (index === 0 ? bonusMerged : 0);
        totalBaseCapital += nodeCapital;

        const activatedTimeStr = activationTimestamps[cardId] || userData.joinDate;
        const activatedTime = new Date(activatedTimeStr).getTime();
        const elapsedSeconds = Math.max(0, (now - activatedTime) / 1000);

        const compoundingFactor = Math.pow(1 + MONTHLY_RATE, elapsedSeconds / SECONDS_IN_MONTH);
        const nodeGrossProfit = nodeCapital * (compoundingFactor - 1);
        totalGrossProfit += nodeGrossProfit;
      });

      const userNetShare = totalGrossProfit * 0.5;
      const protocolReserve = totalGrossProfit * 0.5;
      const totalPortfolio = totalBaseCapital + totalGrossProfit + Number(userData.availableFund || 0);

      setLiveLedger({
        baseCapital: totalBaseCapital,
        grossYield: Number(totalGrossProfit.toFixed(2)),
        userNetYield: Number(userNetShare.toFixed(2)),
        protocolReserve: Number(protocolReserve.toFixed(2)),
        totalPortfolio: Number(totalPortfolio.toFixed(2)),
      });
    };

    computeYield();
    const interval = setInterval(computeYield, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  // Submit Card Purchase Order with 12-Digit Bank UTR (Frictionless, No upfront KYC blocked)
  const submitCardPurchase = async (cardId, bankUtr) => {
    if (!user || !userData) return { error: 'Authentication required' };

    const tierInfo = TIER_CONFIG[cardId];
    if (!tierInfo) return { error: 'Invalid card tier' };

    const activeList = userData.activeCards || [];
    if (activeList.includes(cardId)) {
      return { error: 'You already own this active card' };
    }

    const pendingList = userData.pendingPurchases || [];
    const alreadyPending = pendingList.some((p) => p.cardId === cardId && p.status === 'pending');
    if (alreadyPending) {
      return { error: 'A purchase order for this card is already under administrative audit.' };
    }

    const cleanUtr = String(bankUtr || '').trim();
    if (cleanUtr.length < 8) {
      return { error: 'Please enter a valid 12-digit Bank UTR / Transaction Reference Number.' };
    }

    const now = new Date().toISOString();
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    const orderPayload = {
      orderId,
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
      await updateDoc(userDocRef, {
        pendingPurchases: [orderPayload, ...pendingList],
        history: [logEntry, ...(userData.history || [])],
      });

      return { success: true, orderId };
    } catch (err) {
      return { error: err.message };
    }
  };

  // 50/50 Profit Redemption Request (2 to 48 Hour SLA)
  const submitRedemptionRequest = async (grossAmount) => {
    if (!user || !userData) return { error: 'Authentication required' };
    if (!userData.profileCompleted || !userData.upiId) {
      return { error: 'PROFILE_INCOMPLETE', message: 'Please complete your settlement profile before requesting payout.' };
    }

    const gross = Number(grossAmount);
    if (!gross || gross < 500) {
      return { error: 'MIN_LIMIT', message: 'Minimum redemption threshold is ₹500 accrued profit.' };
    }

    const platformShare = gross * 0.5;
    const netPayout = gross * 0.5;
    const now = new Date().toISOString();
    const requestId = 'VYOM-RD-' + Math.floor(100000 + Math.random() * 900000);

    const requestPayload = {
      id: requestId,
      userId: user.uid,
      grossAmount: gross,
      platformShare: platformShare,
      amount: netPayout,
      destinationUpi: userData.upiId,
      userPhone: userData.phone,
      userName: userData.fullName,
      status: 'pending',
      requestedAt: now,
    };

    const logEntry = {
      type: 'Redemption Request Initiated',
      detail: `Gross Profit: ₹${gross.toFixed(2)} | 50% Platform Reserve: -₹${platformShare.toFixed(2)} | Net Payout: ₹${netPayout.toFixed(2)} to ${userData.upiId.slice(0, 3)}****`,
      amount: netPayout,
      refId: requestId,
      date: now,
    };

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const existingPending = userData.pendingRedeems || [];
      const updatedHistory = [logEntry, ...(userData.history || [])];

      await updateDoc(userDocRef, {
        pendingRedeems: [requestPayload, ...existingPending],
        history: updatedHistory,
      });

      return { success: true, requestId, netPayout };
    } catch (err) {
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