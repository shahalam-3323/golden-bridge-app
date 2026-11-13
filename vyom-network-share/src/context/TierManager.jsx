import { useContext, createContext } from 'react';
import { useAuth } from './AuthContext';

const TierContext = createContext();

export const useTierManager = () => useContext(TierContext);

export const TierProvider = ({ children }) => {
  const { userData } = useAuth();

  const MEMBERSHIP_TIERS = [
    { tier: 'GOLD', threshold: 100000, color: 'from-[#F0A818] via-[#D98A00] to-[#A66A00]', textColor: 'text-[#1A1205]', locked: false },
    { tier: 'SILVER', threshold: 50000, color: 'from-[#E2E8F0] via-[#CBD5E1] to-[#94A3B8]', textColor: 'text-[#0F172A]', locked: false },
    { tier: 'DIAMOND', threshold: 200000, color: 'from-[#38BDF8] via-[#0EA5E9] to-[#0284C7]', textColor: 'text-[#04121A]', locked: false },
    { tier: 'PLATINUM', threshold: 500000, color: 'from-[#F1F5F9] via-[#CBD5E1] to-[#64748B]', textColor: 'text-[#0F172A]', locked: false },
  ];

  const getActiveTierIndex = () => {
    if (!userData) return 0;
    let activeIdx = 0;
    for (let i = 0; i < MEMBERSHIP_TIERS.length; i++) {
      if (userData.activeBalance >= MEMBERSHIP_TIERS[i].threshold) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  };

  const value = {
    MEMBERSHIP_TIERS,
    getActiveTierIndex
  };

  return (
    <TierContext.Provider value={value}>
      {children}
    </TierContext.Provider>
  );
};