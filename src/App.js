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

// ✅ Aapke document ke mutabik sahi Admin UID (Jo 59 se shuru hoti hai)
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

// --- Dynamic AuthScreen Component (Login / Sign-Up Box) ---
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
    <div className="auth-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#fff' }}>
      <div className="auth-card" style={{ background: '#1e293b', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.8rem', color: '#38bdf8' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '1rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '1rem' }}
            />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0' }}>{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            style={{ background: '#38bdf8', color: '#0f172a', padding: '0.75rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span 
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }} 
            style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
          >
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
    fetch('https://er-api.com')
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
    <div className="app-container" style={{ paddingBottom: '80px' }}>
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

      {/* Social Proof Alerts */}
      {socialPopup && (
        <div className="social-ticker" style={{ position: 'fixed', bottom: '80px', left: '20px', background: '#1e293b', padding: '0.75rem 1.25rem', borderRadius: '30px', borderLeft: '4px solid #10b981', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.9rem', zIndex: 100 }}>
          {socialPopup}
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>Platform Updates</h3>
              <button onClick={() => setShowNotificationModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>No updates right now.</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{ padding: '0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: '#10b981' }}>{n.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Legal Footer & Safety Disclaimer as requested in PDF */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0f172a', borderTop: '1px solid #1e293b', padding: '10px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', zIndex: 99, fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span style={{ cursor: 'pointer' }}>Terms of Service</span>
          <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
          <span style={{ cursor: 'pointer' }}>Risk Disclosure</span>
        </div>
        <div>
          ⚠️ <strong>Risk Warning:</strong> This is a premium mathematical asset simulation app. It is NOT a real trading platform.
        </div>
      </footer>
    </div>
  );
}
