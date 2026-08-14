import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; // ✅ अपनी firebase.js से import करें
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, orderBy } from 'firebase/firestore';
import AdminPanel from './AdminPanel';
import './App.css';

// ✅ आपकी असली, काम करने वाली Firebase Admin UID
const ADMIN_UID = "T5yqL9zNUMhRmtWMc4WzFHmXZAs2";

// --- Custom Hook for Time-Elapsed Portfolio Simulation ---
function useRealisticPortfolio(initialAmount = 100000, targetMonths = 24) {
  const [currentValue, setCurrentValue] = useState(initialAmount);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    const targetValue = initialAmount * 2;
    const totalSeconds = targetMonths * 30 * 24 * 3600;
    const growthPerSecond = (targetValue - initialAmount) / totalSeconds;

    const interval = setInterval(() => {
      const noise = (Math.random() - 0.48) * 120;
      setCurrentValue(prev => {
        const nextVal = Math.max(initialAmount, prev + growthPerSecond + noise);
        setFlash(nextVal >= prev ? 'flash-up' : 'flash-down');
        return nextVal;
      });
      setTimeout(() => setFlash(''), 600);
    }, 2000);

    return () => clearInterval(interval);
  }, [initialAmount, targetMonths]);

  return { currentValue, flash };
}

// --- Isolated Child Component for Individual Cards ---
function PortfolioCard({ card, currency, exchangeRate }) {
  const { currentValue, flash } = useRealisticPortfolio(card.initial, 24);

  const displayPrice = currency === 'USD' ? currentValue * exchangeRate : currentValue;
  const targetPrice = currency === 'USD' ? (card.initial * 2) * exchangeRate : (card.initial * 2);
  const currencySymbol = currency === 'USD' ? '$' : '₹';

  const progressPercent = Math.min(100, Math.max(0, ((currentValue - card.initial) / card.initial) * 100));

  return (
    <div className="portfolio-card">
      <div className="card-header">
        <span className="card-title">{card.title}</span>
        <span className="badge">{card.risk} Risk</span>
      </div>

      <div className={`price-display ${flash}`}>
        {currencySymbol}{displayPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>

      <div className="sparkline-container">
        <svg viewBox="0 0 100 25" width="100%" height="100%">
          <path d="M 0 20 Q 25 5, 50 15 T 100 5" fill="none" stroke="#10b981" strokeWidth="2" />
        </svg>
      </div>

      <div className="progress-info">
        <small style={{ color: '#94a3b8' }}>Target: {currencySymbol}{targetPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</small>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);

  const [currency, setCurrency] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState(0.012);

  const [notifications, setNotifications] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const [socialPopup, setSocialPopup] = useState('');

  // Auth Listener
  useEffect(() => {
    let unsubDoc = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            const initialData = { email: currentUser.email, accumulatedProfit: 5400 };
            setDoc(userRef, initialData);
            setUserData(initialData);
          }
        });
      } else {
        setUserData(null);
      }
      setAuthLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  // Notifications Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(list);
      if (list.length > 0) setHasUnread(true);
    });

    return () => unsub();
  }, [user]);

  // Dynamic USD Exchange Rate Fetch
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/INR')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.USD) {
          setExchangeRate(data.rates.USD);
        }
      })
      .catch(() => console.log('Using default exchange rate'));
  }, []);

  // Simulated Social Proof FOMO Ticker
  useEffect(() => {
    const alerts = [
      "⚡ Rahul S. (Lucknow) unlocked Gold Wealth Card!",
      "💸 Payout Cutoff: ₹12,400 distributed today.",
      "🚀 Amit K. reached 75% target on Portfolio Alpha!"
    ];
    let i = 0;
    const interval = setInterval(() => {
      setSocialPopup(alerts[i % alerts.length]);
      i++;
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (authLoading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '20%' }}>Loading Platform...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (isAdminView && user.uid === ADMIN_UID) {
    return <AdminPanel user={user} onBack={() => setIsAdminView(false)} />;
  }

  const cardsList = [
    { id: 1, title: 'Golden Alpha Portfolio', initial: 100000, risk: 'Moderate' },
    { id: 2, title: 'Titanium Shield Growth', initial: 250000, risk: 'Low' },
    { id: 3, title: 'Crypto Yield Multiplier', initial: 50000, risk: 'High' }
  ];

  const accumulatedProfit = userData?.accumulatedProfit || 5400;
  const profitDisplay = currency === 'USD' 
    ? `$${(accumulatedProfit * exchangeRate).toFixed(2)}` 
    : `₹${accumulatedProfit.toLocaleString('en-IN')}`;

  return (
    <div className="app-container">
      {/* Header */}
      <nav className="navbar">
        <div className="brand">Golden Bridge</div>
        <div className="nav-actions">
          <button 
            className={`currency-btn ${currency === 'INR' ? 'active' : ''}`} 
            onClick={() => setCurrency('INR')}
          >
            INR (₹)
          </button>
          <button 
            className={`currency-btn ${currency === 'USD' ? 'active' : ''}`} 
            onClick={() => setCurrency('USD')}
          >
            USD ($)
          </button>

          <button className="bell-btn" onClick={() => { setShowNotificationModal(true); setHasUnread(false); }}>
            🔔 {hasUnread && <span className="bell-badge"></span>}
          </button>

          {user.uid === ADMIN_UID && (
            <button className="btn-secondary" onClick={() => setIsAdminView(true)}>Admin Panel</button>
          )}

          <button className="btn-secondary" onClick={() => signOut(auth)}>Logout</button>
        </div>
      </nav>

      {/* Hero Daily Cutoff Section */}
      <div className="hero-card">
        <div>
          <div className="profit-title">Accumulated Daily Profit (12 PM Cutoff)</div>
          <div className="profit-value">{profitDisplay}</div>
        </div>
        <button 
          className={`withdraw-btn ${accumulatedProfit >= 5000 ? 'ready' : ''}`}
          disabled={accumulatedProfit < 5000}
          onClick={() => alert('Withdrawal request initiated!')}
        >
          {accumulatedProfit >= 5000 ? 'Withdraw Profit' : 'Locked (Min ₹5,000)'}
        </button>
      </div>

      {/* Cards Grid */}
      <div className="cards-grid">
        {cardsList.map(card => (
          <PortfolioCard 
            key={card.id} 
            card={card} 
            currency={currency} 
            exchangeRate={exchangeRate} 
          />
        ))}
      </div>

      {/* Notification Pop-up Modal */}
      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Platform Notifications</h3>
            <hr style={{ borderColor: '#334155', margin: '12px 0' }} />
            {notifications.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No notifications yet.</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#f59e0b' }}>{n.title}</strong>
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{n.message}</p>
                </div>
              ))
            )}
            <button className="btn-primary" style={{ marginTop: '16px', width: '100%' }} onClick={() => setShowNotificationModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Live Social Proof Ticker */}
      {socialPopup && (
        <div className="social-ticker">
          {socialPopup}
        </div>
      )}
    </div>
  );
}

// Simple Login/Signup Screen
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isSignup ? 'Create Account' : 'Login to Golden Bridge'}</h2>
        <form onSubmit={handleAuth} style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
            {isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
          {isSignup ? "Already have an account?" : "Don't have an account?"}{' '}
          <span 
            style={{ color: '#3b82f6', cursor: 'pointer' }} 
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? 'Login' : 'Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
}