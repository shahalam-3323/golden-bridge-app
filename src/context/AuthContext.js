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

// Institutional Tier Configuration
export const TIER_CONFIG = {
  starter: { id: 'starter', name: 'Starter Node', capital: 2000 },
  growth: { id: 'growth', name: 'Growth Node', capital: 5000 },
  elite: { id: 'elite', name: 'Elite Node', capital: 10000 },
  prime: { id: 'prime', name: 'Prime Asset Node', capital: 50000 },
  signature: { id: 'signature', name: 'Signature Sovereign', capital: 100000 },
};

// Calibrated 4.0% Monthly Base Yield (Strictly within 3.0% – 5.0% Spectrum)
const MONTHLY_RATE = 0.04;
const SECONDS_IN_MONTH = 30 * 24 * 3600;

let pendingSignupName = null;
let pendingReferralCode = null;

function generateReferralCode(uid) {
  return 'VYOM-' + (uid ? uid.slice(0, 4).toUpperCase() : 'NODE') + Math.floor(1000 + Math.random() * 9000);
}

// 2-Level Multi-Tier Syndicate Distribution Engine
async function processTwoTierReferral(newUserId, newUserName, refCode) {
  if (!refCode) return;

  try {
    const usersRef = collection(db, 'users');
    const now = new Date().toISOString();

    // ─── TIER 1: Direct Sponsor (+200 VC) ───
    const q1 = query(usersRef, where('referralCode', '==', refCode.trim()));
    const snap1 = await getDocs(q1);

    if (snap1.empty) return;
    const parentDoc = snap1.docs[0];
    const parentData = parentDoc.data();
    const parentId = parentDoc.id;

    const alreadyCreditedL1 = (parentData.history || []).some(
      (h) => h.type === 'Tier-1 Direct Expansion Incentive' && h.fromUserId === newUserId
    );

    if (!alreadyCreditedL1) {
      const l1Log = {
        type: 'Tier-1 Direct Expansion Incentive',
        amount: 200,
        fromUserId: newUserId,
        fromUserName: newUserName || 'Syndicate Operator',
        date: now,
      };

      await updateDoc(doc(db, 'users', parentId), {
        availableFund: Number(parentData.availableFund || 0) + 200,
        referralEarnings: Number(parentData.referralEarnings || 0) + 200,
        referralCount: Number(parentData.referralCount || 0) + 1,
        history: [l1Log, ...(parentData.history || [])],
      });
    }

    // ─── TIER 2: Secondary Network Override (+100 VC) ───
    if (parentData.referredBy) {
      const q2 = query(usersRef, where('referralCode', '==', parentData.referredBy.trim()));
      const snap2 = await getDocs(q2);

      if (!snap2.empty) {
        const grandParentDoc = snap2.docs[0];
        const grandParentData = grandParentDoc.data();
        const grandParentId = grandParentDoc.id;

        const alreadyCreditedL2 = (grandParentData.history || []).some(
          (h) => h.type === 'Tier-2 Syndicate Override Yield' && h.fromUserId === newUserId
        );

        if (!alreadyCreditedL2) {
          const l2Log = {
            type: 'Tier-2 Syndicate Override Yield',
            amount: 100,
            fromUserId: newUserId,
            fromUserName: newUserName || 'Secondary Node',
            directSponsor: parentData.fullName || 'Tier-1 Node',
            date: now,
          };

          await updateDoc(doc(db, 'users', grandParentId), {
            availableFund: Number(grandParentData.availableFund || 0) + 100,
            referralEarnings: Number(grandParentData.referralEarnings || 0) + 100,
            secondaryCount: Number(grandParentData.secondaryCount || 0) + 1,
            history: [l2Log, ...(grandParentData.history || [])],
          });
        }
      }
    }
  } catch (err) {
    console.error('Syndicate Multiplier Error:', err);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [forceProfileOpen, setForceProfileOpen] = useState(false);

  // Live Deterministic Ledger (50/50 Profit Split Engine)
  const [liveLedger, setLiveLedger] = useState({
    baseCapital: 0,
    grossYield: 0,
    userNetYield: 0,      // 50% User Net Share
    protocolReserve: 0,   // 50% VYOM Platform Operations Share
    totalPortfolio: 0,
  });

  // ─── Realtime Firestore Sync ───
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
                cardActivatedAt: data.cardActivatedAt || {},
                lockedBonus: Number(data.lockedBonus ?? 1000),
                bonusUnlocked: Boolean(data.bonusUnlocked),
                availableFund: Number(data.availableFund || 0),
                referralCount: Number(data.referralCount || 0),
                secondaryCount: Number(data.secondaryCount || 0),
                history: Array.isArray(data.history) ? data.history : [],
              });
            } else {
              // Initial User Setup: Zero Free Cards, 1,000 VC Locked Bonus
              const role = fbUser.email === 'admin@vyom.network' ? 'admin' : 'user';
              const initialLog = {
                type: 'Protocol Gateway Initialized',
                detail: '1,000 VC Welcome Bonus Allocated (Status: Locked pending first node activation)',
                amount: 1000,
                date: new Date().toISOString(),
              };

              const newUserData = {
                email: fbUser.email,
                fullName: pendingSignupName || (role === 'admin' ? 'System Administrator' : 'Syndicate Operator'),
                role,
                activeCards: [], // NO FREE CARDS!
                cardActivatedAt: {},
                lockedBonus: 1000, // Locked until first card purchase
                bonusUnlocked: false,
                availableFund: 0,
                referralEarnings: 0,
                referralCode: role === 'admin' ? 'ADMIN' : generateReferralCode(fbUser.uid),
                referredBy: pendingReferralCode || null,
                referralCount: 0,
                secondaryCount: 0,
                pendingRedeems: [],
                profileCompleted: false,
                phone: '',
                upiId: '',
                history: [initialLog],
                joinDate: new Date().toISOString(),
              };

              await setDoc(userDocRef, newUserData);
              setUserData(newUserData);

              if (pendingReferralCode) {
                processTwoTierReferral(fbUser.uid, newUserData.fullName, pendingReferralCode);
              }

              pendingSignupName = null;
              pendingReferralCode = null;
            }

            // 1.5s Institutional Sync Hold
            setTimeout(() => {
              setIsSyncing(false);
              setAuthLoading(false);
            }, 1500);
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

  // ─── Zero-Cost Deterministic Timestamp Math (Calculated on-the-fly) ───
  useEffect(() => {
    if (!userData) return;

    const computeYield = () => {
      const activeList = userData.activeCards || [];
      const activationTimestamps = userData.cardActivatedAt || {};
      const now = Date.now();

      // If no cards are active, compounding is 0 and 1,000 VC stays locked
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

      // 1,000 VC bonus merges with primary card upon unlocking
      const bonusMerged = userData.bonusUnlocked ? 1000 : 0;

      activeList.forEach((cardId, index) => {
        const config = TIER_CONFIG[cardId] || { capital: 2000 };
        const nodeCapital = config.capital + (index === 0 ? bonusMerged : 0);
        totalBaseCapital += nodeCapital;

        const activatedTimeStr = activationTimestamps[cardId] || userData.joinDate;
        const activatedTime = new Date(activatedTimeStr).getTime();
        const elapsedSeconds = Math.max(0, (now - activatedTime) / 1000);

        // Mathematical compounding trajectory: A = P * (1 + r)^(t / T)
        const compoundingFactor = Math.pow(1 + MONTHLY_RATE, elapsedSeconds / SECONDS_IN_MONTH);
        const nodeGrossProfit = nodeCapital * (compoundingFactor - 1);
        totalGrossProfit += nodeGrossProfit;
      });

      // Strict 50/50 Gross Profit Sharing Split
      const userNetShare = totalGrossProfit * 0.5;
      const protocolReserve = totalGrossProfit * 0.5;
      const totalPortfolio = totalBaseCapital + userNetShare + Number(userData.availableFund || 0);

      setLiveLedger({
        baseCapital: totalBaseCapital,
        grossYield: Number(totalGrossProfit.toFixed(4)),
        userNetYield: Number(userNetShare.toFixed(4)),
        protocolReserve: Number(protocolReserve.toFixed(4)),
        totalPortfolio: Number(totalPortfolio.toFixed(4)),
      });
    };

    computeYield();
    const interval = setInterval(computeYield, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  // ─── Acquire / Activate Capital Asset Node (Triggers 1,000 VC Unlock) ───
  const acquireCard = async (cardId) => {
    if (!user || !userData) return { error: 'Authentication required' };

    const tierInfo = TIER_CONFIG[cardId];
    if (!tierInfo) return { error: 'Invalid capital tier' };

    const activeList = userData.activeCards || [];
    if (activeList.includes(cardId)) {
      return { error: 'Asset node already active' };
    }

    try {
      const now = new Date().toISOString();
      const updatedCards = [...activeList, cardId];
      const updatedTimestamps = { ...(userData.cardActivatedAt || {}), [cardId]: now };

      const shouldUnlockBonus = !userData.bonusUnlocked;
      const logEntry = {
        type: `Capital Node Activated: ${tierInfo.name}`,
        detail: shouldUnlockBonus
          ? `Allocated ₹${tierInfo.capital.toLocaleString('en-IN')} Node. 1,000 VC Welcome Bonus unlocked and merged into compounding portfolio.`
          : `Allocated ₹${tierInfo.capital.toLocaleString('en-IN')} Node.`,
        amount: tierInfo.capital,
        date: now,
      };

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        activeCards: updatedCards,
        cardActivatedAt: updatedTimestamps,
        bonusUnlocked: true,
        history: [logEntry, ...(userData.history || [])],
      });

      return { success: true };
    } catch (err) {
      console.error('Node Activation Error:', err);
      return { error: err.message };
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
        acquireCard,
        signup,
        login,
        logout,
        resetPassword,
        updateProfile,
        forceProfileOpen,
        setForceProfileOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
