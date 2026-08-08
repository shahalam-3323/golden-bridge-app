import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, updateDoc, arrayUnion } from 'firebase/firestore';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminPanel from './AdminPanel';
import './App.css';

const ADMIN_UID = "PASTE_YOUR_ADMIN_USER_UID_HERE";

// -------- HOOK 1: TIME-BASED CAGR SIMULATION ENGINE --------
const useRealisticPortfolio = (deposit, target, startDate) => {
  const [value, setValue] = useState(deposit);
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    const updatePrice = () => {
      const now = new Date().getTime();
      const start = new Date(startDate).getTime();
      const totalDuration = 24 * 30 * 24 * 60 * 60 * 1000; // 24 Months in ms
      const elapsed = Math.min(now - start, totalDuration);
      const progressRatio = elapsed / totalDuration;
      
      // Base linear growth towards exact target
      const baseGrowth = deposit + (target - deposit) * progressRatio;
      // Market Noise (fading towards the end)
      const noise = (Math.random() * 2 - 1) * 200 * (1 - progressRatio + 0.1);
      
      const newValue = Number((baseGrowth + noise).toFixed(2));
      setValue(newValue);
      
      setPriceHistory(prev => {
        const updated = [...prev, newValue];
        return updated.slice(-20); // Keep last 20 ticks for sparkline
      });
    };

    updatePrice(); // Immediate update on load
    const interval = setInterval(updatePrice, 2000);
    return () => clearInterval(interval);
  }, [deposit, target, startDate]);

  return { value, priceHistory };
};

// -------- COMPONENT 2: REACT.MEMO PRICE TICKER WITH FLASH EFFECT --------
const LivePortfolioTicker = memo(({ value, currency, formatCurrency, threshold }) => {
  const prevValueRef = useRef(value);
  const [flashClass, setFlashClass] = useState('');
  
  useEffect(() => {
    if (value > prevValueRef.current) setFlashClass('flash-green');
    else if (value < prevValueRef.current) setFlashClass('flash-red');
    prevValueRef.current = value;
    const timer = setTimeout(() => setFlashClass(''), 700);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <h3 className={`price ${flashClass}`}>
        {formatCurrency(value)}
      </h3>
      {threshold && (
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${Math.min(100, Math.max(0, ((value - threshold.deposit) / (threshold.target - threshold.deposit)) * 100))}%` }}
          ></div>
        </div>
      )}
    </div>
  );
});

// -------- MAIN APP CONTENT --------
function AppContent() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [hasUnread, setHasUnread] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [currentNotif, setCurrentNotif] = useState({ title: 'Welcome!', message: 'Stay tuned for updates.' });
  const [notifId, setNotifId] = useState(null);
  const [usdRate, setUsdRate] = useState(0.012);
  const [socialMsg, setSocialMsg] = useState("New user joined the Golden Bridge community!");

  // 1. Real-Time USD Fetch
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/INR')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.USD) setUsdRate(data.rates.USD);
      })
      .catch(() => setUsdRate(0.012));
  }, []);

  // 2. Social Proof Ticker (FOMO)
  useEffect(() => {
    const messages = [
      "Rahul S. (Lucknow) just unlocked the GOLDEN card!",
      "Payout Cutoff: ₹8,400 distributed to 42 investors today.",
      "Amisha P. (Delhi) has successfully withdrawn ₹5,200.",
      "🔥 Golden Card waiting list is filling up fast!"
    ];
    const interval = setInterval(() => {
      setSocialMsg(messages[Math.floor(Math.random() * messages.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 3. Auth Listener & User Data (Memory leak fixed)
  useEffect(() => {
    let unsubscribeData = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        unsubscribeData = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) setUserData(docSnap.data());
          else {
            setUserData({ 
              fullName: currentUser.displayName || "Valued Investor",
              deposit: 50000,
              target: 100000,
              startDate: new Date().toISOString()
            });
          }
        }, (error) => {
          console.error("Firestore error:", error);
          setUserData({ fullName: "Valued Investor", deposit: 50000, target: 100000, startDate: new Date().toISOString() });
        });
      } else setUserData(null);
    });
    return () => { unsubscribeAuth(); if (unsubscribeData) unsubscribeData(); };
  }, []);

  // 4. Notification Listener
  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'notifications'));
      const unsubscribeNotif = onSnapshot(q, (querySnapshot) => {
        let unreadFound = false, latestNotif = null, latestId = null;
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isReadBy && !data.isReadBy.includes(user.uid)) {
            unreadFound = true; latestNotif = data; latestId = docSnap.id;
          }
        });
        setHasUnread(unreadFound);
        if (unreadFound && latestNotif) {
          setCurrentNotif({ title: latestNotif.title, message: latestNotif.message });
          setNotifId(latestId);
        }
      });
      return () => unsubscribeNotif();
    }
  }, [user]);

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return amount;
    if (currency === 'USD') return `$ ${(amount * usdRate).toFixed(2)}`;
    return `₹ ${amount.toFixed(2)}`;
  };

  const closeNotificationPopup = async () => {
    setShowLoginPopup(false); setHasUnread(false);
    if (notifId && user) {
      try { await updateDoc(doc(db, 'notifications', notifId), { isReadBy: arrayUnion(user.uid) }); } 
      catch (error) { console.error("Error marking read:", error); }
    }
  };

  const handleUnlock = () => alert("Your request has been sent. Senior Portfolio Manager (UP Region) will contact you shortly.");

  if (!user) return <Login />;
  if (!userData) return <div style={{color:'white', textAlign:'center', marginTop:'50px'}}>Loading your profile...</div>;

  const cardsData = [
    { id: 1, name: 'SILVER CARD', deposit: 50000, target: 100000, color: 'silver', locked: false },
    { id: 2, name: 'GOLDEN CARD', deposit: 100000, target: 200000, color: 'gold', locked: true },
    { id: 3, name: 'DIAMOND CARD', deposit: 200000, target: 400000, color: 'diamond', locked: true },
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <h2>GOLDEN BRIDGE</h2>
        <div className="header-right">
          <div className="notification-wrapper" onClick={() => setShowLoginPopup(true)}>
            <span className="bell-icon">🔔</span>
            <span className={`badge-dot ${hasUnread ? 'show' : ''}`}></span>
          </div>
          <div className="live-indicator"><span className="pulse-dot"></span> Live</div>
          <span className="menu-icon">☰</span>
        </div>
      </div>

      {/* Hero */}
      <div className="top-section">
        <h1>Premium <span className="highlight">Wealth</span> Generation</h1>
        <p className="subtitle">Welcome, {userData.fullName}</p>
        <div className="currency-toggle">
          <button className={currency === 'INR' ? 'active' : 'inactive'} onClick={() => setCurrency('INR')}>INR</button>
          <button className={currency === 'USD' ? 'active' : 'inactive'} onClick={() => setCurrency('USD')}>USD</button>
        </div>
      </div>

      {/* Profit Section with Eligibility */}
      <div className="daily-profit-section">
        <div className="profit-info">
          <span className="profit-label">Your Accumulated Profit (12:00 PM Cutoff)</span>
          <h3 className="profit-amount" style={{color: livePrice >= userData.target ? '#e5b94f' : '#4ade80'}}>
            {formatCurrency(livePrice - userData.deposit)}
          </h3>
        </div>
        <button 
          className="withdraw-btn"
          style={{
            background: (livePrice - userData.deposit) >= 5000 ? '#28a745' : '#555',
            boxShadow: (livePrice - userData.deposit) >= 5000 ? '0 0 20px rgba(40, 167, 69, 0.4)' : 'none',
            cursor: (livePrice - userData.deposit) >= 5000 ? 'pointer' : 'not-allowed'
          }}
          onClick={() => {
            if ((livePrice - userData.deposit) >= 5000) alert("✅ Withdrawal Request Submitted! Processing via IMPS/UPI.");
            else alert("Minimum threshold for withdrawal is ₹5,000. Daily cutoff updates at 12:00 PM.");
          }}
        >
          {(livePrice - userData.deposit) >= 5000 ? 'WITHDRAW NOW' : 'LOCKED (MIN ₹5k)'}
        </button>
      </div>

      <div className="separator"></div>

      {/* Cards Section */}
      <div className="cards-container">
        {cardsData.map((card, idx) => {
          // Use the Realistic Simulation Hook for each card
          const { value: liveCardPrice, priceHistory } = useRealisticPortfolio(
            card.deposit, 
            card.target, 
            userData.startDate || new Date().toISOString()
          );

          return (
            <div key={card.id} className={`card-wrapper ${card.locked ? 'locked' : ''}`}>
              {card.locked && (
                <div className="scarcity-badge">
                  <span style={{fontSize:'12px', color:'#fff'}}>✨ WHAT YOU MISS</span>
                  <span style={{fontSize:'8px', color:'#222'}}>Unlock Elite Returns</span>
                </div>
              )}
              <div className={`card ${card.color}`}>
                <div className="card-header">
                  <span className="card-title">{card.name}</span>
                  <span className="deposit-text">DEPOSIT<br/><strong>{formatCurrency(card.deposit)}</strong></span>
                </div>
                
                <div className="card-body">
                  <div className="price-row">
                    <div className="chip-icon">💳</div>
                    <div className="price-info">
                      <span className="label">LIVE PORTFOLIO VALUE</span>
                      <LivePortfolioTicker 
                        value={liveCardPrice} 
                        currency={currency} 
                        formatCurrency={formatCurrency}
                        threshold={!card.locked ? { deposit: card.deposit, target: card.target } : null}
                      />
                    </div>
                  </div>
                  
                  {/* Sparkline Chart */}
                  <svg className="sparkline-svg" viewBox={`0 0 ${priceHistory.length * 2} 20`}>
                    <polyline 
                      fill="none" 
                      stroke={card.color === 'silver' ? '#e5b94f' : (card.color === 'gold' ? '#fff' : '#000')} 
                      strokeWidth="1.5"
                      points={priceHistory.map((val, i) => {
                        const min = Math.min(...priceHistory);
                        const max = Math.max(...priceHistory);
                        const range = max - min || 1;
                        const y = 20 - ((val - min) / range) * 18;
                        return `${i * 2},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                </div>

                <div className="card-footer">
                  <div className="validity">
                    <span className="label">VALID THRU</span>
                    <span className="value">24 MONTHS</span>
                    <span className="name">{userData.fullName}</span>
                  </div>
                  <div className="target">
                    <span className="label">TARGET</span>
                    <span className="value">{formatCurrency(card.target)}</span>
                  </div>
                </div>
              </div>
              {card.locked && (
                <div className="card-actions">
                  <button className="unlock-btn" onClick={handleUnlock}>UNLOCK CARD</button>
                  <button className="details-btn">DETAILS</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="footer-links">
          <a href="/terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> | 
          <a href="/privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a> | 
          <a href="/risk" onClick={(e) => e.preventDefault()}>Risk Acknowledgment</a>
        </div>
        <a href="https://t.me/your_channel" target="_blank" rel="noreferrer" className="telegram-btn">✈️ Join Our Telegram Channel</a>
        <div className="footer-disclaimer">© 2026 Golden Bridge Investments. All rights reserved.</div>
      </div>

      {/* Social Proof Ticker (Bottom floating) */}
      <div className="social-ticker">
        <span className="icon">⚡</span>
        <span className="msg"><strong>Live:</strong> {socialMsg}</span>
      </div>

      {/* Notification Modal */}
      {showLoginPopup && (
        <div className="modal-overlay" style={{display:'flex'}}>
          <div className="modal-content">
            <h2 style={{color:'#e5b94f'}}>{currentNotif.title}</h2>
            <p style={{color:'#ccc', lineHeight:'1.6'}}>{currentNotif.message}</p>
            <button className="modal-close-btn" onClick={closeNotificationPopup}>Mark as Read</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Router with Auth Loading Fix ---
function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return <div style={{color:'white', textAlign:'center', marginTop:'50px'}}>Initializing...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={user && user.uid === ADMIN_UID ? <AdminPanel /> : <Navigate to="/" />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;