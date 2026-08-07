import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, updateDoc, arrayUnion } from 'firebase/firestore';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminPanel from './AdminPanel';
import './App.css';

// 🔴 IMPORTANT: Isko apne Firebase Admin user ki UID se replace kar do!
const ADMIN_UID = "T5yqL9zNUMhRmtWMc4WzFHmXZAs2"; 

function AppContent() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [livePrice, setLivePrice] = useState(50000.06);
  
  // Notification States
  const [hasUnread, setHasUnread] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [currentNotif, setCurrentNotif] = useState({ title: 'Welcome!', message: 'Stay tuned for updates.' });
  const [notifId, setNotifId] = useState(null);

  // 1. Auth Listener & User Data
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // User data fetch karo
        const userRef = doc(db, "users", currentUser.uid);
        const unsubData = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        });
        return () => unsubData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Real-Time Notification Listener (User Dashboard par)
  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'notifications'));
      const unsubscribeNotif = onSnapshot(q, (querySnapshot) => {
        let unreadFound = false;
        let latestNotif = null;
        let latestId = null;
        
        // Loop through all notifications
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Check if user hasn't read it yet
          if (data.isReadBy && !data.isReadBy.includes(user.uid)) {
            unreadFound = true;
            latestNotif = data;
            latestId = doc.id;
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

  // 3. Live Price Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice((prev) => {
        const numPrev = Number(prev);
        const priceChange = (Math.random() * 200 - 100);
        return Number((numPrev + priceChange).toFixed(2));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 4. Close & Mark Notification as Read
  const closeNotificationPopup = async () => {
    setShowLoginPopup(false);
    setHasUnread(false);
    if (notifId && user) {
      try {
        // Firestore mein user ko read list mein add karo
        await updateDoc(doc(db, 'notifications', notifId), {
          isReadBy: arrayUnion(user.uid)
        });
      } catch (error) {
        console.error("Error marking read:", error);
      }
    }
  };

  const handleUnlock = () => {
    alert("Your request has been sent. Senior Portfolio Manager (UP Region) will contact you shortly.");
  };

  if (!user) return <Login />;
  if (!userData) return <div style={{color:'white', textAlign:'center', marginTop:'50px'}}>Loading your profile...</div>;

  const cardsData = [
    { id: 1, name: 'SILVER CARD', deposit: userData.deposit || '₹50,000.00', target: userData.target || '₹1,00,000.00', color: 'silver', locked: false },
    { id: 2, name: 'GOLDEN CARD', deposit: '₹1,00,000.00', initialPrice: 100000.13, target: '₹2,00,000.00', color: 'gold', locked: true },
    { id: 3, name: 'DIAMOND CARD', deposit: '₹2,00,000.00', initialPrice: 200000.26, target: '₹4,00,000.00', color: 'diamond', locked: true },
  ];

  return (
    <div className="app-container">
      {/* Header with Bell */}
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

      {/* Hero Section */}
      <div className="top-section">
        <h1>Premium <span className="highlight">Wealth</span> Generation</h1>
        <p className="subtitle">Welcome, {userData.fullName}</p>
        <div className="currency-toggle">
          <button className="active">INR</button>
          <button className="inactive">USD</button>
        </div>
      </div>

      {/* Daily Profit & Withdraw */}
      <div className="daily-profit-section">
        <div className="profit-info">
          <span className="profit-label">Your Accumulated Profit</span>
          <h3 className="profit-amount">₹ {livePrice.toFixed(2)}</h3>
        </div>
        <button className="withdraw-btn">WITHDRAW</button>
      </div>
      <div className="separator"></div>

      {/* Cards */}
      <div className="cards-container">
        {cardsData.map((card, idx) => (
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
                <span className="deposit-text">DEPOSIT<br/><strong>{card.deposit}</strong></span>
              </div>
              <div className="card-body">
                <div className="chip-icon">💳</div>
                <div className="price-info">
                  <span className="label">LIVE PORTFOLIO VALUE</span>
                  <h3 className="price">{idx === 0 ? `₹ ${livePrice}` : card.initialPrice}</h3>
                </div>
              </div>
              <div className="card-footer">
                <div className="validity">
                  <span className="label">VALID THRU</span>
                  <span className="value">24 MONTHS</span>
                  <span className="name">{userData.fullName}</span>
                </div>
                <div className="target">
                  <span className="label">TARGET</span>
                  <span className="value">{card.target}</span>
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
        ))}
      </div>

      {/* --- NEW FOOTER WITH TELEGRAM BUTTON --- */}
      <div className="footer">
        <div className="footer-links">
<a href="/terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> | 
<a href="/privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a> | 
<a href="/risk" onClick={(e) => e.preventDefault()}>Risk Acknowledgment</a>        </div>
<a href="https://t.me/your_channel" target="_blank" rel="noreferrer" className="telegram-btn">✈️ Join Our Telegram Channel</a>        <div className="footer-disclaimer">© 2026 Golden Bridge Investments. All rights reserved.</div>
      </div>

      {/* --- LOGIN NOTIFICATION MODAL --- */}
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

// --- MAIN APP WITH ROUTING ---
function App() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Agar user admin hai toh /admin par jaayega */}
        <Route 
          path="/admin" 
          element={user && user.uid === ADMIN_UID ? <AdminPanel /> : <Navigate to="/" />} 
        />
        {/* Baaki sab users / dashboard par */}
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;