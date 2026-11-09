import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [storeStatus, setStoreStatus] = useState('coming_soon'); // 'coming_soon' | 'live'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const usersSnap = await getDocs(collection(db, 'users'));
    setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    const productsSnap = await getDocs(collection(db, 'products'));
    setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // ─── POOL CAPITAL CALCULATION ───
  const totalPoolVC = users.reduce((acc, user) => acc + (user.baseInvestment || 0), 0);
  const targetPool = 500000; // 5 Lakhs
  const progressPercent = Math.min((totalPoolVC / targetPool) * 100, 100);

  // ─── DEPOSIT APPROVAL (USDT → VC) ───
  const approveDeposit = async (userId, depositIndex) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const deposit = user.pendingDeposits[depositIndex];
    if (!deposit) return;

    try {
      const userRef = doc(db, 'users', userId);
      const usdtAmount = Number(deposit.amount || 0);
      const convertedVcAmount = usdtAmount * 100;
      
      const newBaseInvestment = (user.baseInvestment || 0) + convertedVcAmount;
      const newHistory = [
        { type: `Deposit Approved (Bought ${convertedVcAmount} VC nodes via ${usdtAmount} USDT Gateway)`, amount: convertedVcAmount, date: new Date().toISOString() },
        ...(user.history || [])
      ];
      
      const updatedPendingDeposits = user.pendingDeposits.filter((_, idx) => idx !== depositIndex);

      await updateDoc(userRef, {
        baseInvestment: newBaseInvestment,
        history: newHistory,
        pendingDeposits: updatedPendingDeposits
      });

      alert(`✅ Converted ${usdtAmount} USDT to ${convertedVcAmount} VC Nodes for ${user.email}`);
      fetchData();
    } catch (err) {
      alert('Operational Failure: ' + err.message);
    }
  };

  const rejectDeposit = async (userId, depositIndex) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      const userRef = doc(db, 'users', userId);
      const updatedPendingDeposits = user.pendingDeposits.filter((_, idx) => idx !== depositIndex);
      await updateDoc(userRef, { pendingDeposits: updatedPendingDeposits });
      alert('❌ Deposit ledger item rejected and deleted.');
      fetchData();
    } catch (err) {
      alert('Operational Failure: ' + err.message);
    }
  };

  // ─── WITHDRAWAL APPROVAL / REJECT ───
  const approveWithdrawal = async (userId, withdrawIndex) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const req = user.pendingWithdrawals[withdrawIndex];
    if (!req) return;

    try {
      const userRef = doc(db, 'users', userId);
      const amount = Number(req.amount || 0);
      const newLocked = parseFloat(((user.lockedBalance || 0) - amount).toFixed(2));
      const newHistory = [
        { type: 'Admin Released Settlement', amount, date: new Date().toISOString() },
        ...(user.history || [])
      ];
      
      const updatedPendingWithdrawals = user.pendingWithdrawals.filter((_, idx) => idx !== withdrawIndex);

      await updateDoc(userRef, {
        lockedBalance: newLocked,
        history: newHistory,
        pendingWithdrawals: updatedPendingWithdrawals
      });

      alert(`✅ Payout of ₹${amount} cleared for ${user.email}`);
      fetchData();
    } catch (err) {
      alert('Operational Failure: ' + err.message);
    }
  };

  const rejectWithdrawal = async (userId, withdrawIndex) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const req = user.pendingWithdrawals[withdrawIndex];
    if (!req) return;

    try {
      const userRef = doc(db, 'users', userId);
      const amount = Number(req.amount || 0);
      
      const newActive = parseFloat(((user.activeBalance || 0) + amount).toFixed(2));
      const newLocked = parseFloat(((user.lockedBalance || 0) - amount).toFixed(2));
      
      const newHistory = [
        { type: 'Admin Rejected Payout (Funds Safely Rolled-Back)', amount, date: new Date().toISOString() },
        ...(user.history || [])
      ];
      
      const updatedPendingWithdrawals = user.pendingWithdrawals.filter((_, idx) => idx !== withdrawIndex);

      await updateDoc(userRef, {
        activeBalance: newActive,
        lockedBalance: newLocked,
        pendingWithdrawals: updatedPendingWithdrawals
      });

      alert(`↩️ Withdrawal of ₹${amount} rejected. Capital structural rollback completed.`);
      fetchData();
    } catch (err) {
      alert('Operational Failure: ' + err.message);
    }
  };

  // ─── PRODUCT MANAGEMENT ───
  const addProduct = async (e) => {
    e.preventDefault();
    const newProduct = { name: newProductName, priceCoins: Number(newProductPrice), category: 'General', image: '🛍️' };
    await setDoc(doc(collection(db, 'products')), newProduct);
    setNewProductName('');
    setNewProductPrice('');
    fetchData();
    alert('✅ Store item registered.');
  };

  const deleteProduct = async (productId) => {
    await deleteDoc(doc(db, 'products', productId));
    fetchData();
    alert('🗑️ Item wiped from node.');
  };

  // ─── RENDER ───
  return (
    <div className="min-h-screen bg-[#0B0E11] text-white p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-6">
          <h1 className="text-xl font-bold text-[#F0A818]">Golden Bridge Admin</h1>
          <button onClick={() => signOut(auth)} className="bg-[#1E2329] px-4 py-2 rounded-lg text-xs">Logout</button>
        </div>

        {/* ─── STORE STATUS TOGGLE ─── */}
        <div className="bg-[#1E2329] p-3 rounded-xl flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">Store Status</span>
          <button 
            onClick={() => setStoreStatus(storeStatus === 'coming_soon' ? 'live' : 'coming_soon')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold ${storeStatus === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
          >
            {storeStatus === 'live' ? '🟢 Live' : '🟡 Coming Soon'}
          </button>
        </div>

        {/* ─── POOL CAPITAL PROGRESS ─── */}
        <div className="bg-[#1E2329] border border-[#F0A818]/20 rounded-2xl p-5 mb-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Liquidity Pool (Total Invested)</p>
              <p className="text-2xl font-bold text-[#F0A818] font-mono">₹ {totalPoolVC.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Target</p>
              <p className="text-sm font-bold text-white">₹ {targetPool.toLocaleString()}</p>
            </div>
          </div>
          <div className="w-full bg-[#0B0E11] h-2 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#F0A818] to-[#38bdf8] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="text-[9px] text-gray-500 mt-2 font-mono">{progressPercent.toFixed(1)}% towards Inventory Phase</p>
        </div>

        {/* ─── PENDING DEPOSITS ─── */}
        <div className="bg-[#161A1E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3 mb-6">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pending Deposits</h3>
          {users.filter(u => u.pendingDeposits && u.pendingDeposits.length > 0).length === 0 ? 
            <p className="text-xs text-gray-500 font-mono">No pending deposits.</p> :
            users.filter(u => u.pendingDeposits && u.pendingDeposits.length > 0).map((user) => 
              user.pendingDeposits.map((dep, idx) => (
                <div key={`${user.id}-dep-${idx}`} className="bg-[#0B0E11] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{user.email}</p>
                    <p className="text-[11px] text-gray-400 font-mono">TxAmt: <span className="text-emerald-400">{dep.amount} USDT</span> | Hash: {dep.txid}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveDeposit(user.id, idx)} className="bg-emerald-500/20 text-emerald-400 rounded px-3 py-1.5 text-xs font-bold">Approve</button>
                    <button onClick={() => rejectDeposit(user.id, idx)} className="bg-red-500/20 text-red-400 rounded px-3 py-1.5 text-xs font-bold">Reject</button>
                  </div>
                </div>
              ))
            )
          }
        </div>

        {/* ─── PENDING WITHDRAWALS ─── */}
        <div className="bg-[#161A1E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3 mb-6">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pending Withdrawals</h3>
          {users.filter(u => u.pendingWithdrawals && u.pendingWithdrawals.length > 0).length === 0 ? 
            <p className="text-xs text-gray-500 font-mono">No pending withdrawals.</p> :
            users.filter(u => u.pendingWithdrawals && u.pendingWithdrawals.length > 0).map((user) => 
              user.pendingWithdrawals.map((req, idx) => (
                <div key={`${user.id}-wd-${idx}`} className="bg-[#0B0E11] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{user.email}</p>
                    <p className="text-[11px] text-amber-500 font-mono">₹{req.amount}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveWithdrawal(user.id, idx)} className="bg-amber-500/20 text-amber-400 rounded px-3 py-1.5 text-xs font-bold">Approve</button>
                    <button onClick={() => rejectWithdrawal(user.id, idx)} className="bg-red-500/20 text-red-400 rounded px-3 py-1.5 text-xs font-bold">Reject</button>
                  </div>
                </div>
              ))
            )
          }
        </div>

        {/* ─── PRODUCT MANAGEMENT ─── */}
        <div className="bg-[#161A1E] border border-white/10 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Product Management</h3>
          <form onSubmit={addProduct} className="flex gap-2 mb-4 flex-wrap">
            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Product Name" className="flex-1 min-w-[150px] bg-[#0B0E11] border border-white/10 rounded-lg p-2 text-xs text-white" required />
            <input type="number" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="Price (VC)" className="w-32 bg-[#0B0E11] border border-white/10 rounded-lg p-2 text-xs text-white" required />
            <button type="submit" className="bg-[#F0A818] text-black rounded-lg px-4 py-2 text-xs font-bold">Add</button>
          </form>
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-[#0B0E11] rounded-lg px-3 py-2 border border-white/5">
                <span className="text-xs">{p.name} — <span className="text-[#F0A818]">{p.priceCoins} VC</span></span>
                <button onClick={() => deleteProduct(p.id)} className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[10px]">Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;