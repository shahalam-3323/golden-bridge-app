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
            setUserData(snap.data());
          } else {
            const role = fbUser.email === 'admin@vyom.network' ? 'admin' : 'user';
            const isAdmin = role === 'admin';
            
            // CORRECTED LOGIC: 1000 VC is locked in signupBonus, growthBalance is 0
            const newUser = {
              email: fbUser.email,
              fullName: pendingSignupName || fbUser.displayName || (isAdmin ? 'Admin' : 'VYOM Member'),
              role,
              activeCards: [],
              cardActivatedAt: {},
              availableFund: 0,
              growthBalance: 0,         // Starts at 0, no growth until card purchase
              signupBonus: 1000,        // 1000 VC locked here
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
              history: isAdmin ? [] : [
                { type: 'Signup Bonus (Locked)', amount: 1000, date: new Date().toISOString() }
              ],
              joinDate: new Date().toISOString(),
            };
            await setDoc(ref, newUser);
            setUserData(newUser);
            pendingSignupName = null;
            pendingReferralCode = null;
          }
        } catch (err) {
          console.error('Auth sync error:', err);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const signup = (email, password, fullName, refCode = null) => {
    pendingSignupName = fullName;
    pendingReferralCode = refCode;
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  
  const loginWithGoogle = async (refCode = null) => {
    const provider = new GoogleAuthProvider();
    pendingReferralCode = refCode;
    return signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const updateProfile = async (fields) => {
    if (!user) return { error: 'Not logged in' };
    try {
      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, fields);
      setUserData(prev => ({ ...prev, ...fields }));
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, userData, setUserData, authLoading,
      signup, login, loginWithGoogle, logout, resetPassword, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};