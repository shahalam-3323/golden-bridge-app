import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminPanel from './AdminPanel';
import WelcomePage from './components/WelcomePage';
import HomePage from './components/HomePage';

// Main authenticated / unauthenticated flow controller inside AuthProvider
function DashboardContent() {
  const {
    user,
    userData,
    userProfile,
    authLoading,
    logout,
    signup,
    login,
    loginWithGoogle,
    resetPassword,
    transactions,
    notifications,
  } = useAuth();

  const [refCode, setRefCode] = useState('');

  // Capture ?ref= referral code from URL query parameters on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const ref = (params.get('ref') || '').trim();
      if (ref) setRefCode(ref);
    } catch {
      // Ignore URL parsing issues in restricted environments
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090D0C] flex items-center justify-center text-[#A6B0AA] text-sm font-medium">
        Loading...
      </div>
    );
  }

  const resolvedProfile = userProfile || userData || null;

  if (user && resolvedProfile?.role === 'admin') {
    return <AdminPanel />;
  }

  const authObject = {
    user,
    userProfile: resolvedProfile,
    transactions,
    notifications,
    logout,
    signup,
    login,
    loginWithGoogle,
    resetPassword,
    TIER_CONFIG: {
      starter: { capital: 2000, monthlyRate: 0.035 },
      growth: { capital: 5000, monthlyRate: 0.045 },
      elite: { capital: 10000, monthlyRate: 0.055 },
      prime: { capital: 50000, monthlyRate: 0.07 },
      signature: { capital: 100000, monthlyRate: 0.08 },
    },
    MIN_DEPOSIT: 100,
    PROFIT_SPLIT: 0.5,
  };

  if (!user) {
    return <WelcomePage authContext={authObject} refCode={refCode} />;
  }

  return <HomePage authContext={authObject} />;
}

// Root application wrapped in AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}