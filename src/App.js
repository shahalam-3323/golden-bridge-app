import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import Login from './Login';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [livePrice, setLivePrice] = useState(50000.06);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const unsubData = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
            setLivePrice(docSnap.data().currentValue || 50000.06);
          } else {
            // Agar database mein user nahi mila, toh default data use karo (Loading screen nahi aayega)
            setUserData({ fullName: currentUser.email, deposit: '₹50,000.00', target: '₹1,00,000.00' });
          }
        });
        return () => unsubData();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice((prev) => {
        const numPrev = Number(prev);
        const priceChange = (Math.random() * 200 - 100);
        const result = numPrev + priceChange;
        return Number(result.toFixed(2));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return <Login />;
  }

  // Yahan "Loading..." wali line hata di hai, ab userData null hai toh bhi UI dikhega!
  const displayData = userData || { fullName: user.email, deposit: '₹50,000.00', target: '₹1,00,000.00' };

  const cardsData = [
    { id: 1, name: 'SILVER CARD', deposit: displayData.deposit, target: displayData.target, color: 'silver' },
    { id: 2, name: 'GOLDEN CARD', deposit: '₹1,00,000.00', initialPrice: 100000.13, target: '₹2,00,000.00', color: 'gold' },
    { id: 3, name: 'DIAMOND CARD', deposit: '₹2,00,000.00', initialPrice: 200000.26, target: '₹4,00,000.00', color: 'diamond' },
    { id: 4, name: 'PLATINUM CARD', deposit: '₹5,00,000.00', initialPrice: 'Coming Soon', target: '₹10,00,000.00', color: 'platinum' }
  ];

  return (
    <div className="app-container">
      <div className="header">
        <h2>GOLDEN BRIDGE</h2>
        <span className="menu-icon">☰</span>
        <button onClick={() => auth.signOut()} style={{background:'#e5b94f', border:'none', padding:'5px 10px', borderRadius:'5px', fontWeight:'bold', marginLeft:'auto', cursor:'pointer'}}>Logout</button>
      </div>

      <div className="top-section">
        <h1>Premium <span className="highlight">Wealth</span> Generation</h1>
        <p className="subtitle">Welcome, {displayData.fullName}</p>
        <div className="currency-toggle">
          <button className="active">INR</button>
          <button className="inactive">USD</button>
        </div>
      </div>

      <div className="cards-container">
        {cardsData.map((card, index) => (
          <div key={card.id} className={`card ${card.color}`}>
            <div className="card-header">
              <span className="card-title">{card.name}</span>
              <span className="deposit-text">DEPOSIT<br/><strong>{card.deposit}</strong></span>
            </div>
            <div className="card-body">
              <div className="chip-icon">💳</div>
              <div className="price-info">
                <span className="label">LIVE PROFIT VALUE</span>
                <h3 className="price">
                  {index === 0 ? `₹ ${livePrice}` : (card.id === 4 ? card.initialPrice : `₹ ${card.initialPrice}`)}
                </h3>
              </div>
            </div>
            <div className="card-footer">
              <div className="validity">
                <span className="label">VALID THRU</span>
                <span className="value">24 MONTHS</span>
                <span className="name">{displayData.fullName}</span> 
              </div>
              <div className="target">
                <span className="label">TARGET</span>
                <span className="value">{card.target}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="action-section">
        <button className="join-btn">JOIN NOW</button>
        <button className="details-btn">DETAILS</button>
      </div>
    </div>
  );
}
export default App;