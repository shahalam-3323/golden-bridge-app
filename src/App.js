import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; 
import { 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, orderBy } from 'firebase/firestore';
import AdminPanel from './AdminPanel';
import './App.css';

// ✅ आपकी नई सही Admin UID
const ADMIN_UID = "59uL9zNUMhRmtWMc4WzFHmXZAs2"; 

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

// --- Premium Card Component (With User Name, Lock/Unlock, Scarcity) ---
function PremiumCard({ card, currency, exchangeRate, isLocked, onUnlock, userName }) {
  const { currentValue, flash } = useRealisticPortfolio(card.initial, 24);
  const displayValue = isLocked ? card.initial : currentValue;
  const displayFlash = isLocked ? '' : flash;

  const displayPrice = currency === 'USD' ? displayValue * exchangeRate : displayValue;
  const targetPrice = currency === 'USD' ? (card.initial * 2) * exchangeRate : (card.initial * 2);
  const currencySymbol = currency === 'USD' ? '$' : '₹';
  const progressPercent = Math.min(100, Math.max(0, ((displayValue - card.initial) / card.initial) * 100));

  return (
    <div className={`card-wrapper ${isLocked ? 'locked' : ''}`}>
      {/* Scarcity Badge - Only for Locked Cards */}
      {isLocked && (
        <div className="scarcity-badge">
          <span className="highlight-text">✨ WHAT YOU MISS</span>
          <span className="sub-text">Unlock Premium Returns</span>
        </div>
      )}
      
      <div className={`card ${card.color}`}>
        <div className="card-header">
          <span className="card-title">{card.name}</span>
          <span className="deposit-text">DEPOSIT<br/><strong>{currencySymbol}{card.initial.toLocaleString('en-IN')}</strong></span>
        </div>

        <div className="card-body">
          <div className="chip-icon">💳</div>
          <div className="price-info">
            <span className="label">LIVE PORTFOLIO VALUE</span>
            <div className={`price ${displayFlash}`}>
              {currencySymbol}{displayPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            {/* Progress Bar - Only for Unlocked */}
            {!isLocked && (
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
              </div>
            )}
          </div>
        </div>

        <div className="card-footer">
          <div className="validity">
            <span className="label">VALID THRU</span>
            <span className="value">24 MONTHS</span>
            <span className="name">{userName || 'Valued Investor'}</span>
          </div>
          <div className="target">
            <span className="label">TARGET</span>
            <span className="value">{currencySymbol}{targetPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons for Locked Cards */}
      {isLocked && (
        <div className="card-actions">
          <button className="unlock-btn" onClick={onUnlock}>UNLOCK CARD</button>
          <button className="details-btn">DETAILS</button>
        </div>
      )}
    </div>
  );
}

// --- Auth Screen (Login / Sign-Up) ---
function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <p className="toggle-account">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Login' : 'Sign Up'}
          </span>
        </p>
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
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

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
            const initialData = { email: currentUser.email, fullName: currentUser.displayName || "Valued Investor", accumulatedProfit: 5400 };
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

  // Social Proof FOMO Ticker
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

  const handleUnlock = () => {
    setShowUnlockModal(true);
  };

  if (authLoading) {
    return <div className="loading-screen">Loading Platform...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (isAdminView && user.uid === ADMIN_UID) {
    return <AdminPanel user={user} onBack={() => setIsAdminView(false)} />;
  }

  const cardsList = [
    { id: 1, name: 'SILVER CARD', color: 'silver', initial: 50000, locked: false },
    { id: 2, name: 'GOLDEN CARD', color: 'gold', initial: 100000, locked: true },
    { id: 3, name: 'DIAMOND CARD', color: 'diamond', initial: 200000, locked: true },
  ];

  const accumulatedProfit = userData?.accumulatedProfit || 5400;
  const profitDisplay = currency === 'USD' 
    ? `$${(accumulatedProfit * exchangeRate).toFixed(2)}` 
    : `₹${accumulatedProfit.toLocaleString('en-IN')}`;

  return (
    <div className="app-container">
      {/* Header */}
      <nav className="navbar">
        <div className="brand">GOLDEN BRIDGE</div>
        <div className="nav-actions">
          <div className="live-indicator">
            <span className="pulse-dot"></span> Live
          </div>
          <div className="currency-toggle">
            <button className={`currency-btn ${currency === 'INR' ? 'active' : ''}`} onClick={() => setCurrency('INR')}>INR</button>
            <button className={`currency-btn ${currency === 'USD' ? 'active' : ''}`} onClick={() => setCurrency('USD')}>USD</button>
          </div>
          <button className="bell-btn" onClick={() => { setShowNotificationModal(true); setHasUnread(false); }}>
            🔔 {hasUnread && <span className="bell-badge"></span>}
          </button>
          {user.uid === ADMIN_UID && (
            <button className="btn-secondary" onClick={() => setIsAdminView(true)}>Admin Panel</button>
          )}
          <button className="btn-secondary" onClick={() => setShowReferralModal(true)}>🔗 Refer</button>
          <button className="btn-secondary" onClick={() => signOut(auth)}>Logout</button>
        </div>
      </nav>

      {/* Hero Daily Cutoff Section */}
      <div className="hero-card">
        <div>
          <div className="profit-title">Your Accumulated Profit (12 PM Cutoff)</div>
          <div className="profit-value">{profitDisplay}</div>
        </div>
        <button 
          className={`withdraw-btn ${accumulatedProfit >= 5000 ? 'ready' : ''}`}
          disabled={accumulatedProfit < 5000}
          onClick={() => alert('Withdrawal request initiated!')}
        >
          {accumulatedProfit >= 5000 ? 'WITHDRAW NOW' : 'LOCKED (MIN ₹5k)'}
        </button>
      </div>

      <div className="separator"></div>

      {/* Premium Cards Grid */}
      <div className="cards-container">
        {cardsList.map(card => (
          <PremiumCard
            key={card.id}
            card={card}
            currency={currency}
            exchangeRate={exchangeRate}
            isLocked={card.locked}
            onUnlock={handleUnlock}
            userName={userData?.fullName}
          />
        ))}
      </div>

      {/* Footer with Legal Links & Telegram */}
      <div className="footer">
        <div className="footer-links">
          <a href="/terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> | 
          <a href="/privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a> | 
          <a href="/risk" onClick={(e) => e.preventDefault()}>Risk Acknowledgment</a>
        </div>
        <a href="https://t.me/your_channel" target="_blank" rel="noreferrer" className="telegram-btn">
          ✈️ Join Our Telegram Channel
        </a>
        <div className="footer-disclaimer">© 2026 Golden Bridge Investments. All rights reserved.</div>
      </div>

      {/* Social Proof Ticker */}
      {socialPopup && (
        <div className="social-ticker">
          {socialPopup}
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Platform Updates</h3>
              <button className="close-btn" onClick={() => setShowNotificationModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {notifications.length === 0 ? (
                <p className="empty-msg">No updates right now.</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="notification-item">
                    <h4>{n.title}</h4>
                    <p>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unlock Card Modal (Psychological Scarcity) */}
      {showUnlockModal && (
        <div className="modal-overlay" onClick={() => setShowUnlockModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🎯 Welcome to the Next Level!</h2>
            <p>
              We appreciate your ambition to elevate your portfolio. 
              Your request has been successfully received. 
              <br/><br/>
              A dedicated <strong className="highlight-role">Senior Portfolio Manager (Uttar Pradesh Regional Office)</strong> 
              will contact you shortly to guide you through this exclusive opportunity.
            </p>
            <button className="btn-primary" onClick={() => setShowUnlockModal(false)}>UNDERSTOOD, I'M READY</button>
          </div>
        </div>
      )}

      {/* Ethical Referral Modal - No "Simulation/Demo" words */}
      {showReferralModal && (
        <div className="modal-overlay" onClick={() => setShowReferralModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#f59e0b', margin: 0 }}>🔗 Exclusive Referral Vault</h3>
              <button className="close-btn" onClick={() => setShowReferralModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '20px' }}>
                Share your unique link to expand your portfolio visibility and network.
              </p>
              <div style={{ 
                background: '#0f172a', 
                padding: '14px', 
                borderRadius: '8px', 
                border: '1px solid #334155',
                color: '#38bdf8',
                wordBreak: 'break-all',
                fontSize: '0.95rem',
                fontWeight: '500'
              }}>
                {`https://golden-bridge-app-h8uz.vercel.app/?ref=${user?.uid}`}
              </div>
              <button 
                className="btn-primary" 
                style={{ marginTop: '20px', width: '100%', padding: '12px' }}
                onClick={() => {
                  navigator.clipboard.writeText(`https://golden-bridge-app-h8uz.vercel.app/?ref=${user?.uid}`);
                  alert("Referral link copied successfully!");
                }}
              >
                📋 Copy Your Unique Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}