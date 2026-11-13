import React, { createContext, useContext, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const { user, userData, setUserData } = useAuth();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [depositMessage, setDepositMessage] = useState('');
  const [withdrawMessage, setWithdrawMessage] = useState('');

  const handleDepositRequest = async (depositAmount, depositTxid) => {
    if (!user || !userData) return;
    setDepositMessage('');

    if (!depositAmount || !depositTxid) {
      setDepositMessage("Please supply clear criteria parameters.");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const newPendingDeposit = {
        amount: Number(depositAmount),
        txid: depositTxid,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      const updatedDeposits = [...(userData.pendingDeposits || []), newPendingDeposit];
      await updateDoc(userRef, { pendingDeposits: updatedDeposits });

      setUserData(prev => ({ ...prev, pendingDeposits: updatedDeposits }));
      setDepositMessage("Ledger entry pushed! Awaiting supreme validation.");
      setTimeout(() => setIsDepositModalOpen(false), 2000);
    } catch (err) {
      setDepositMessage("Protocol Error: " + err.message);
    }
  };

  const handleWithdrawRequest = async (withdrawAmount) => {
    if (!user || !userData) return;
    setWithdrawMessage('');

    if (!withdrawAmount) {
      setWithdrawMessage("Input execution value missing.");
      return;
    }

    const amountToWithdraw = Number(withdrawAmount);
    if (amountToWithdraw > userData.activeBalance) {
      setWithdrawMessage("Insufficient liquid accounting index.");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const newActive = parseFloat((userData.activeBalance - amountToWithdraw).toFixed(2));
      const newLocked = parseFloat(((userData.lockedBalance || 0) + amountToWithdraw).toFixed(2));

      const newWithdrawRequest = {
        amount: amountToWithdraw,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      const updatedWithdrawals = [...(userData.pendingWithdrawals || []), newWithdrawRequest];
      
      await updateDoc(userRef, {
        activeBalance: newActive,
        lockedBalance: newLocked,
        pendingWithdrawals: updatedWithdrawals
      });

      setUserData(prev => ({
        ...prev,
        activeBalance: newActive,
        lockedBalance: newLocked,
        pendingWithdrawals: updatedWithdrawals
      }));

      setWithdrawMessage("Escrow lock established. Settlement processing initiated.");
      setTimeout(() => setIsWithdrawModalOpen(false), 2000);
    } catch (err) {
      setWithdrawMessage("Protocol Error: " + err.message);
    }
  };

  const value = {
    isDepositModalOpen, setIsDepositModalOpen,
    isWithdrawModalOpen, setIsWithdrawModalOpen,
    depositMessage, withdrawMessage,
    handleDepositRequest, handleWithdrawRequest
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};