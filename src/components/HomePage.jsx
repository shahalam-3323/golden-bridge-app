import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Copy,
  Check,
  X,
  Wallet,
  CreditCard,
  Users,
  History,
  UserCheck,
  ShieldCheck,
  LogOut,
  ArrowUpRight,
  CheckCircle2,
  Send,
  AlertCircle,
} from 'lucide-react';

// ==========================================
// PAYMENT DETAILS & STORAGE KEYS
// ==========================================
const VYOM_PAYMENT_UPI = '9808669522@ybl';
const VYOM_PAYEE_NAME = 'SHAH ALAM ANSARI';
const CART_STORAGE_KEY = 'vyom_cart_checkout_v1';
const NOTIF_READ_STORAGE_KEY = 'vyom_notif_last_seen_v1';

const DAILY_INSIGHTS = [
  {
    title: 'Daily Vault Tip • Compounding Consistency',
    desc: 'Active Capital Cards generate steady daily yield tracking. Keep your linked UPI updated in Profile for smooth 2–48h payouts.',
  },
  {
    title: 'VYOM Network Update • Instant UTR Audit',
    desc: 'Always submit your exact 12-digit Bank UTR right after UPI payment so our audit team can verify and activate your card faster.',
  },
  {
    title: 'Grow With Your Network • 2-Tier Rewards',
    desc: 'Invite friends using your personal referral code in the Network tab to unlock Level 1 & Level 2 bonus rewards.',
  },
];

const DEFAULT_TIERS = [
  {
    id: 'starter',
    badge: 'TIER I',
    name: 'Starter',
    capital: 2000,
    rate: 0.035,
    gradient: 'from-[#062C2B] via-[#071D1E] to-[#080C0E]',
    border: 'border-emerald-400/50',
    accent: '#34D399',
    note: 'Entry capital card • Easy to start',
  },
  {
    id: 'growth',
    badge: 'TIER II',
    name: 'Growth',
    capital: 5000,
    rate: 0.045,
    gradient: 'from-[#1E293B] via-[#131924] to-[#0A0D12]',
    border: 'border-slate-400/50',
    accent: '#E2E8F0',
    note: 'Balanced card for steady monthly growth',
  },
  {
    id: 'elite',
    badge: 'TIER III',
    name: 'Elite',
    capital: 10000,
    rate: 0.055,
    gradient: 'from-[#1F2429] via-[#13161A] to-[#090A0C]',
    border: 'border-zinc-400/50',
    accent: '#F4F4F5',
    note: 'Higher monthly growth card',
  },
  {
    id: 'prime',
    badge: 'TIER IV',
    name: 'Prime',
    capital: 50000,
    rate: 0.07,
    gradient: 'from-[#29220A] via-[#171409] to-[#0B0B08]',
    border: 'border-amber-400/55',
    accent: '#FCD34D',
    note: 'High-capital card with priority payouts',
  },
  {
    id: 'signature',
    badge: 'TIER V',
    name: 'Signature',
    capital: 100000,
    rate: 0.08,
    gradient: 'from-[#2A200B] via-[#171208] to-[#0B0A08]',
    border: 'border-[#F0A818]/75',
    accent: '#F0A818',
    note: 'Top Obsidian Gold card • Highest monthly rate',
  },
];

const formatINR = (val, decimals = 2) => {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export default function HomePage({ authContext, onOpenDeposit, onOpenWithdraw }) {
  const auth = authContext || {};
  const {
    user,
    userData,
    userProfile,
    logout,
    submitCardOrder,
    requestWithdrawal,
    TIER_CONFIG,
    PROFIT_SPLIT = 0.5,
  } = auth;

  const activeProfile = userProfile || userData || null;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCardId, setSelectedCardId] = useState('starter');
  const [ledgerFilter, setLedgerFilter] = useState('all');

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState('terms');
  const [lastSeenNotifSig, setLastSeenNotifSig] = useState(() => {
    try {
      return localStorage.getItem(NOTIF_READ_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Card Checkout Cart & UTR Recovery State (QR hidden; UPI Intent + Copy fallback)
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cartQuantities, setCartQuantities] = useState({
    starter: 0,
    growth: 0,
    elite: 0,
    prime: 0,
    signature: 0,
  });
  const [utrInput, setUtrInput] = useState('');
  const [cardOrderLoading, setCardOrderLoading] = useState(false);
  const [cardOrderError, setCardOrderError] = useState('');
  const [pendingInspectItem, setPendingInspectItem] = useState(null);

  // UPI Withdrawal Modal State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [tick, setTick] = useState(0);
  const [tgUser, setTgUser] = useState(null);

  useEffect(() => {
    try {
      const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      if (!tg) return;
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.('#090D0C');
      tg.setBackgroundColor?.('#090D0C');
      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user);
      }
    } catch {
      // Safe fallback when opened in standard browser
    }
  }, []);

  useEffect(() => {
    if (activeProfile?.upiId && !withdrawUpi) {
      setWithdrawUpi(activeProfile.upiId);
    }
  }, [activeProfile?.upiId, withdrawUpi]);

  // Restore saved cart / UTR if user returned after opening UPI app or app restart
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(CART_STORAGE_KEY);
      if (!savedRaw) return;
      const saved = JSON.parse(savedRaw);
      if (saved?.quantities && typeof saved.quantities === 'object') {
        setCartQuantities((prev) => ({ ...prev, ...saved.quantities }));
      }
      if (typeof saved?.utr === 'string' && saved.utr) {
        setUtrInput(saved.utr);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Persist cart & draft UTR so user never loses progress mid-payment
  useEffect(() => {
    try {
      const hasAnyQty = Object.values(cartQuantities).some((q) => (Number(q) || 0) > 0);
      if (!hasAnyQty && !utrInput) {
        localStorage.removeItem(CART_STORAGE_KEY);
        return;
      }
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          quantities: cartQuantities,
          utr: utrInput,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [cartQuantities, utrInput]);

  const triggerHaptic = (style = 'light') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
    } catch {
      // Ignore outside Telegram
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2200);
    return () => clearInterval(timer);
  }, []);

  const tiers = useMemo(() => {
    return DEFAULT_TIERS.map((t) => {
      const override = TIER_CONFIG?.[t.id];
      return override
        ? {
            ...t,
            capital: Number(override.capital) || t.capital,
            rate: Number(override.monthlyRate) || t.rate,
          }
        : t;
    });
  }, [TIER_CONFIG]);

  const displayName =
    activeProfile?.fullName ||
    activeProfile?.name ||
    (tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : '') ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Member');

  const userIdentityLine = tgUser?.username
    ? `@${tgUser.username}`
    : tgUser?.id
      ? `ID: ${tgUser.id}`
      : activeProfile?.userIdNumber
        ? `ID: ${activeProfile.userIdNumber}`
        : user?.uid
          ? `ID: ${user.uid.slice(0, 8).toUpperCase()}`
          : user?.email || 'Verified Member';

  const handleTag = tgUser?.username
    ? `@${tgUser.username}`
    : user?.email || userIdentityLine;


  const ownedCardIds = useMemo(() => {
    return Array.isArray(activeProfile?.activeCards) ? activeProfile.activeCards : [];
  }, [activeProfile?.activeCards]);

  const pendingCardOrdersCount = useMemo(() => {
    const list = Array.isArray(activeProfile?.pendingPurchases)
      ? activeProfile.pendingPurchases
      : [];
    return list.filter((p) => p.status === 'pending').length;
  }, [activeProfile?.pendingPurchases]);

  const totalOwnedCards = ownedCardIds.length;

  // Build individual card entries (both Approval Pending and Active) for portfolio & cards tab
  const portfolioCards = useMemo(() => {
    const pendingList = Array.isArray(activeProfile?.pendingPurchases)
      ? activeProfile.pendingPurchases
      : [];
    const instances = Array.isArray(activeProfile?.activeCardInstances)
      ? activeProfile.activeCardInstances
      : [];

    const cards = [];

    // 1. Pending orders appear immediately with "Approval Pending" badge
    pendingList
      .filter((ord) => ord?.status === 'pending')
      .forEach((ord) => {
        const items =
          Array.isArray(ord.items) && ord.items.length > 0
            ? ord.items
            : [
                {
                  cardId: ord.cardId || 'starter',
                  cardName: ord.cardName || 'Starter',
                  capital: Number(ord.amount) || 2000,
                  monthlyRate: Number(ord.lockedRate) || 0.035,
                  qty: 1,
                },
              ];

        items.forEach((it, itemIdx) => {
          const tierMeta = tiers.find((t) => t.id === it.cardId) || tiers[0];
          const count = Math.max(1, Number(it.qty) || 1);
          for (let c = 0; c < count; c++) {
            cards.push({
              uid: `${ord.orderId}-${itemIdx}-${c}`,
              cardId: tierMeta.id,
              name: tierMeta.name,
              badge: tierMeta.badge,
              capital: Number(it.capital) || tierMeta.capital,
              rate: Number(it.monthlyRate) || tierMeta.rate,
              gradient: tierMeta.gradient,
              border: tierMeta.border,
              accent: tierMeta.accent,
              status: 'pending',
              orderId: ord.orderId,
              bankUtr: ord.bankUtr || '',
              requestedAt: ord.requestedAt,
              totalOrderAmount: Number(ord.amount) || tierMeta.capital,
            });
          }
        });
      });

    // 2. Active card instances (if available) or fallback to activeCards array
    if (instances.length > 0) {
      instances.forEach((inst, i) => {
        const tierMeta = tiers.find((t) => t.id === inst.cardId) || tiers[0];
        cards.push({
          uid: inst.instanceId || `active-inst-${i}`,
          cardId: tierMeta.id,
          name: inst.name || tierMeta.name,
          badge: tierMeta.badge,
          capital: Number(inst.capital) || tierMeta.capital,
          rate: Number(inst.rate) || tierMeta.rate,
          gradient: tierMeta.gradient,
          border: tierMeta.border,
          accent: tierMeta.accent,
          status: 'active',
          activatedAt: inst.activatedAt || activeProfile?.cardActivatedAt?.[tierMeta.id] || null,
        });
      });
    } else {
      ownedCardIds.forEach((cid, i) => {
        const tierMeta = tiers.find((t) => t.id === cid) || tiers[0];
        cards.push({
          uid: `active-card-${cid}-${i}`,
          cardId: tierMeta.id,
          name: tierMeta.name,
          badge: tierMeta.badge,
          capital: tierMeta.capital,
          rate: tierMeta.rate,
          gradient: tierMeta.gradient,
          border: tierMeta.border,
          accent: tierMeta.accent,
          status: 'active',
          activatedAt: activeProfile?.cardActivatedAt?.[tierMeta.id] || null,
        });
      });
    }

    return cards;
  }, [activeProfile, tiers, ownedCardIds]);

  const cartSummary = useMemo(() => {
    const items = tiers
      .map((tier) => {
        const qty = Math.max(0, parseInt(cartQuantities[tier.id] ?? 0, 10) || 0);
        return {
          tier,
          qty,
          subtotal: qty * tier.capital,
        };
      })
      .filter((row) => row.qty > 0);

    const totalItems = items.reduce((sum, row) => sum + row.qty, 0);
    const totalAmount = items.reduce((sum, row) => sum + row.subtotal, 0);

    return { items, totalItems, totalAmount };
  }, [tiers, cartQuantities]);

  const baseCapital = useMemo(() => {
    const direct = Number(
      activeProfile?.activeCapital ?? activeProfile?.capital ?? activeProfile?.investedAmount ?? 0
    );
    if (direct > 0) return direct;

    return ownedCardIds.reduce((sum, id) => {
      const found = tiers.find((t) => t.id === id);
      return sum + (found ? found.capital : 0);
    }, 0);
  }, [activeProfile, tiers, ownedCardIds]);

  const activeTier = useMemo(() => {
    const explicit = String(activeProfile?.activeTier || '').toLowerCase();
    const byName = tiers.find((t) => t.id === explicit);
    if (byName) return byName;

    let current = tiers[0];
    for (const t of tiers) {
      if (baseCapital >= t.capital) current = t;
    }
    return current;
  }, [activeProfile?.activeTier, tiers, baseCapital]);

  // Strictly 0 when user has no active card
  const effectiveBase = baseCapital;
  const totalProfit = Number(
    activeProfile?.totalProfit ?? activeProfile?.yieldEarned ?? activeProfile?.availableFund ?? 0
  );
  const withdrawableBalance = Number(
    activeProfile?.withdrawableBalance ?? activeProfile?.availableFund ?? totalProfit
  );

  const liveMetrics = useMemo(() => {
    if (effectiveBase <= 0 && totalProfit <= 0) {
      return {
        liveTotal: 0,
        liveDelta: 0,
        liveRatePct: (activeTier.rate * 100).toFixed(2),
      };
    }

    const monthlyGain = effectiveBase * activeTier.rate;
    const secondDrift = (monthlyGain / (30 * 86400)) * tick;
    const waveA = Math.sin(tick * 0.9) * (effectiveBase * 0.00014);
    const waveB = Math.cos(tick * 0.65) * 0.03;

    const liveTotal = Math.max(0, effectiveBase + totalProfit + secondDrift + waveA);
    const liveDelta = Math.max(0, monthlyGain / 30 + waveA * 0.35);
    const liveRatePct = (activeTier.rate * 100 + waveB).toFixed(2);

    return {
      liveTotal,
      liveDelta,
      liveRatePct,
    };
  }, [effectiveBase, totalProfit, activeTier.rate, tick]);

  const referralCode =
    activeProfile?.referralCode ||
    activeProfile?.refCode ||
    (user?.uid ? `VYOM-${user.uid.slice(0, 6).toUpperCase()}` : 'VYOM-NODE');

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://vyom-network.vercel.app'}?ref=${referralCode}`;

  const directJoins = Number(activeProfile?.referralCount ?? 0);
  const secondaryJoins = Number(activeProfile?.secondaryCount ?? 0);
  const referralEarnings = Number(activeProfile?.referralEarnings ?? 0);

  const notifications = useMemo(() => {
    const items = [];

    // 1. Pending Card Orders (Explains clearly why each card is pending)
    const pendingList = Array.isArray(activeProfile?.pendingPurchases)
      ? activeProfile.pendingPurchases.filter((p) => p?.status === 'pending')
      : [];

    pendingList.forEach((ord) => {
      items.push({
        id: `pending-${ord.orderId}`,
        category: 'Action & Audit',
        tone: 'amber',
        title: `Card Pending Verification • ${ord.cardName || 'Capital Card'}`,
        desc: `Order ${ord.orderId} (${formatINR(ord.amount, 0)}) is currently Approval Pending because our audit team is verifying your Bank UTR (${ord.bankUtr || 'submitted'}) with bank records. Activation completes within 2 to 48 hours.`,
        time: ord.requestedAt
          ? new Date(ord.requestedAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'In Review',
      });
    });

    // 2. Recent Account Activities (Card activations, withdrawals, etc.)
    const rawHistory = Array.isArray(activeProfile?.history) ? activeProfile.history : [];
    rawHistory.slice(0, 6).forEach((h, idx) => {
      const titleText = h.type || 'Account Activity';
      const lower = titleText.toLowerCase();
      if (lower.includes('order submitted')) return;
      items.push({
        id: h.refId || `act-${idx}`,
        category: lower.includes('activated')
          ? 'Card Active'
          : lower.includes('withdraw')
            ? 'Payout'
            : 'Activity',
        tone: lower.includes('activated') ? 'emerald' : 'gold',
        title: titleText,
        desc: h.detail || 'Recorded on your VYOM account.',
        time: h.date
          ? new Date(h.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })
          : 'Recent',
      });
    });

    // 3. Daily Platform Note (Rotates automatically by day of year)
    const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_INSIGHTS.length;
    const dailyNote = DAILY_INSIGHTS[dayIndex];
    items.push({
      id: `daily-note-${dayIndex}`,
      category: 'Daily Update',
      tone: 'blue',
      title: dailyNote.title,
      desc: dailyNote.desc,
      time: 'Today',
    });

    // 4. Welcome / Signup Congratulation Message
    items.push({
      id: 'welcome-congrats',
      category: 'Welcome',
      tone: 'emerald',
      title: `Congratulations ${displayName}! Welcome to VYOM`,
      desc: 'Your VYOM Network account is verified and ready. Select any Capital Card anytime to start growing your capital.',
      time: activeProfile?.joinDate
        ? new Date(activeProfile.joinDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          })
        : 'Joined',
    });

    return items;
  }, [activeProfile, displayName]);

  const notifSignature = useMemo(
    () => notifications.map((n) => n.id).join('|'),
    [notifications]
  );

  const hasUnreadNotifications =
    notifications.length > 0 && lastSeenNotifSig !== notifSignature;

  const handleOpenNotifications = () => {
    triggerHaptic('medium');
    setIsNotifOpen(true);
    setLastSeenNotifSig(notifSignature);
    try {
      localStorage.setItem(NOTIF_READ_STORAGE_KEY, notifSignature);
    } catch {
      // Ignore storage errors
    }
  };

  const ledgerItems = useMemo(() => {
    const rawHistory = Array.isArray(activeProfile?.history) ? activeProfile.history : [];

    if (rawHistory.length > 0) {
      return rawHistory.map((item, idx) => {
        const amt = Number(item.amount ?? 0);
        const rawType = String(item.type || item.title || '').toLowerCase();
        const isWithdrawal = amt < 0 || rawType.includes('withdraw') || rawType.includes('settlement');
        return {
          id: item.refId || item.id || `ledger-${idx}`,
          title: item.type || item.title || 'Account Activity',
          detail: item.detail || item.note || 'VYOM Record',
          amount: Math.abs(amt),
          isWithdrawal,
          status: item.status || 'Verified',
          date: item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'Recent',
        };
      });
    }

    return [
      {
        id: 'account-ready',
        title: 'VYOM Account Ready',
        detail: `Buy a Capital Card to begin (${totalOwnedCards} active cards)`,
        amount: 0,
        isWithdrawal: false,
        status: 'Ready',
        date: 'Today',
      },
    ];
  }, [activeProfile?.history, totalOwnedCards]);

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'credits') return ledgerItems.filter((i) => !i.isWithdrawal);
    if (ledgerFilter === 'withdrawals') return ledgerItems.filter((i) => i.isWithdrawal);
    return ledgerItems;
  }, [ledgerItems, ledgerFilter]);

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(''), 2600);
  };

  const copyText = async (text, type) => {
    triggerHaptic('light');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1800);
        showToast('Invite code copied');
      } else if (type === 'upi') {
        showToast('UPI ID copied');
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1800);
        showToast('Invite link copied');
      }
    } catch {
      showToast('Unable to copy');
    }
  };

  const handleTelegramShare = () => {
    triggerHaptic('medium');
    const shareText = `Join me on VYOM Network! Use my invite code ${referralCode} to get started:`;
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;
    try {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(tgShareUrl);
      } else {
        window.open(tgShareUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      copyText(inviteUrl, 'link');
    }
  };

  const updateCartQty = (tierId, delta) => {
    triggerHaptic('light');
    setCartQuantities((prev) => {
      const current = Math.max(0, parseInt(prev[tierId] ?? 0, 10) || 0);
      const next = Math.max(0, Math.min(20, current + delta));
      return { ...prev, [tierId]: next };
    });
  };

  const handleLaunchUpiIntent = () => {
    if (cartSummary.totalAmount <= 0) {
      setCardOrderError('Please add at least one card to your cart before paying.');
      return;
    }
    triggerHaptic('medium');
    setCardOrderError('');
    const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(
      VYOM_PAYMENT_UPI
    )}&pn=${encodeURIComponent(VYOM_PAYEE_NAME)}&am=${encodeURIComponent(
      String(cartSummary.totalAmount)
    )}&cu=INR`;

    try {
      window.location.href = upiIntentUrl;
    } catch {
      copyText(VYOM_PAYMENT_UPI, 'upi');
    }
  };

  const handleOpenCardOrder = (tier = null, ensureTierSelected = false) => {
    triggerHaptic('medium');
    if (typeof onOpenDeposit === 'function') {
      onOpenDeposit(tier);
      return;
    }
    if (tier?.id) {
      setCartQuantities((prev) => {
        if (ensureTierSelected) {
          return {
            ...prev,
            [tier.id]: Math.max(1, parseInt(prev[tier.id] ?? 0, 10) || 0),
          };
        }
        const hasExisting = Object.values(prev).some((q) => (Number(q) || 0) > 0);
        if (hasExisting) return prev;
        return { ...prev, [tier.id]: 1 };
      });
    }
    setCardOrderError('');
    setIsCardModalOpen(true);
  };

  const handleSubmitCardOrder = async (e) => {
    e.preventDefault();
    if (cardOrderLoading) return;
    setCardOrderError('');

    if (cartSummary.items.length === 0) {
      setCardOrderError('Please select at least one card in your cart.');
      return;
    }

    const cleanUtr = utrInput.trim();
    if (cleanUtr.length < 6) {
      setCardOrderError('Please enter a valid UTR / Transaction ID (min 6 characters).');
      return;
    }

    if (typeof submitCardOrder !== 'function') {
      setCardOrderError('Card order service is not connected.');
      return;
    }

    setCardOrderLoading(true);
    try {
      const res = await submitCardOrder(cartSummary.items, cleanUtr);
      if (res?.error) {
        setCardOrderError(res.error);
      } else {
        triggerHaptic('medium');
        setIsCardModalOpen(false);
        setUtrInput('');
        setCartQuantities({
          starter: 0,
          growth: 0,
          elite: 0,
          prime: 0,
          signature: 0,
        });
        localStorage.removeItem(CART_STORAGE_KEY);
        showToast('Order submitted — card added with Approval Pending');
      }
    } catch (err) {
      setCardOrderError(err?.message || 'Could not submit card order.');
    } finally {
      setCardOrderLoading(false);
    }
  };

  const handleOpenWithdraw = () => {
    triggerHaptic('medium');
    if (typeof onOpenWithdraw === 'function') {
      onOpenWithdraw();
      return;
    }
    setWithdrawError('');
    setWithdrawAmount(withdrawableBalance > 0 ? String(withdrawableBalance) : '');
    if (activeProfile?.upiId) setWithdrawUpi(activeProfile.upiId);
    setIsWithdrawOpen(true);
  };

  const handleSubmitWithdraw = async (e) => {
    e.preventDefault();
    if (withdrawLoading) return;
    setWithdrawError('');

    const amt = Number(withdrawAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setWithdrawError('Enter a valid amount greater than ₹0.');
      return;
    }
    if (amt > withdrawableBalance) {
      setWithdrawError('Amount cannot exceed your available balance.');
      return;
    }
    if (!withdrawUpi.trim() || !withdrawUpi.includes('@')) {
      setWithdrawError('Please enter a valid UPI ID (e.g., name@upi).');
      return;
    }
    if (typeof requestWithdrawal !== 'function') {
      setWithdrawError('Withdrawal service is not connected.');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await requestWithdrawal(amt, withdrawUpi.trim());
      if (res?.error) {
        setWithdrawError(res.error);
      } else {
        triggerHaptic('medium');
        setIsWithdrawOpen(false);
        showToast('UPI withdrawal request submitted (2–48h payout)');
      }
    } catch (err) {
      setWithdrawError(err?.message || 'Could not submit withdrawal request.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const inspectedCard = tiers.find((t) => t.id === selectedCardId) || tiers[0];

  return (
    <div className="h-[100dvh] w-full bg-[#090D0C] text-white font-sans antialiased selection:bg-[#D4AF37] selection:text-black flex flex-col justify-between overflow-hidden relative select-none">
      {/* Ambient Emerald & Golden Radial Glows */}
      <div className="fixed -top-24 left-1/2 -translate-x-1/2 w-[min(92vw,440px)] h-56 bg-emerald-500/[0.10] blur-[100px] rounded-full pointer-events-none z-0" />
      <div className="fixed top-28 left-1/2 -translate-x-1/2 w-[320px] h-[200px] bg-[#D4AF37]/[0.08] blur-[95px] rounded-full pointer-events-none z-0" />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#101714] border border-[#D4AF37]/60 text-[#F1D77A] px-4 py-1.5 rounded-full text-[11px] font-bold shadow-2xl whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. TOP HEADER BAR                                                     */}
      {/* ===================================================================== */}
      <header className="w-full max-w-md mx-auto px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-white/[0.07] relative z-30 shrink-0">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsProfileOpen(true);
          }}
          className="flex items-center gap-2.5 min-w-0 text-left active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-full border border-[#D4AF37]/60 bg-gradient-to-br from-[#F6D978] via-[#C99A22] to-[#76520C] flex items-center justify-center text-[#111711] font-extrabold text-xs shadow-[0_0_18px_rgba(212,175,55,0.22)] shrink-0">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-white truncate">
                {displayName}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
            <p className="text-[10px] text-[#9AA69D] truncate font-mono">
              {userIdentityLine}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsLedgerOpen(true);
            }}
            aria-label="History"
            className="w-9 h-9 rounded-full border border-white/[0.09] bg-white/[0.035] flex items-center justify-center text-[#C6CFC8] hover:border-[#D4AF37]/50 hover:text-white transition active:scale-95"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleOpenNotifications}
            aria-label="Notifications"
            className={`relative h-9 px-2.5 rounded-full border flex items-center gap-1.5 transition active:scale-95 ${
              hasUnreadNotifications
                ? 'border-emerald-400/60 bg-emerald-500/[0.12] text-white shadow-[0_0_18px_rgba(52,211,153,0.28)]'
                : 'border-white/[0.09] bg-white/[0.035] text-[#C6CFC8] hover:border-[#D4AF37]/50 hover:text-white'
            }`}
          >
            <Bell
              className={`w-4 h-4 ${
                hasUnreadNotifications ? 'text-emerald-300' : 'text-current'
              }`}
            />
            <span className="text-[10px] font-extrabold font-mono text-emerald-300">
              {notifications.length}
            </span>
            {hasUnreadNotifications && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-[#090D0C]" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsRulesOpen(true);
            }}
            className="h-9 px-3 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] text-[10px] font-bold text-[#F1D77A] hover:bg-[#D4AF37]/15 transition active:scale-95"
          >
            Rules
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. MAIN VIEWPORT (3 TABS: VAULT, CARDS, NETWORK)                      */}
      {/* ===================================================================== */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 flex flex-col justify-center overflow-hidden relative z-10">
        {activeTab === 'dashboard' && (
          <div className="flex flex-col justify-between h-full max-h-[530px] py-1 space-y-3 overflow-y-auto">
            {/* SILVER-PLATINUM METALLIC CARD: Growth + Actual Capital + Total Profit */}
            <section className="rounded-3xl border border-white/75 bg-gradient-to-br from-[#F8FAFC] via-[#E2E8F0] to-[#CBD5E1] p-5 shadow-[0_22px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.95)] flex flex-col justify-between relative overflow-hidden shrink-0">
              <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/50 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-600">
                  Live Growth
                </span>
                <span className="rounded-full border border-slate-900/15 bg-slate-900/[0.06] px-2.5 py-0.5 text-[10px] font-extrabold text-slate-900">
                  {totalOwnedCards > 0
                    ? `${totalOwnedCards} Card${totalOwnedCards > 1 ? 's' : ''} Active`
                    : pendingCardOrdersCount > 0
                      ? 'Pending Verification'
                      : 'No Card Active'}
                </span>
              </div>

              <div className="my-4 text-center relative z-10">
                <p className="font-mono text-[clamp(30px,9vw,40px)] font-black tracking-tight text-slate-950 leading-none tabular-nums">
                  +{formatINR(liveMetrics.liveDelta, 2)}
                  <span className="text-xs font-bold text-slate-600"> / day</span>
                </p>

                <div className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-slate-900/[0.08] border border-slate-900/10 px-3 py-1 text-[11px] font-bold">
                  <span className="text-emerald-700 font-mono">
                    {liveMetrics.liveRatePct}% / mo
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-900/10 grid grid-cols-2 gap-2 text-[10px] relative z-10">
                <div>
                  <span className="block font-semibold text-slate-600">Total Capital</span>
                  <span className="font-mono font-black text-slate-950 text-xs tabular-nums">
                    {formatINR(effectiveBase, 0)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-semibold text-slate-600">Total Profit</span>
                  <span className="font-mono font-black text-emerald-700 text-xs tabular-nums">
                    {formatINR(totalProfit, 2)}
                  </span>
                </div>
              </div>
            </section>

            {/* YOUR PURCHASED CARDS ON HOME (Pending & Active) */}
            {portfolioCards.length > 0 && (
              <section className="rounded-2xl border border-white/[0.08] bg-[#101714] p-3 space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-white">
                    Your Cards ({portfolioCards.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cards')}
                    className="text-[10px] font-bold text-[#F1D77A] hover:underline"
                  >
                    Manage
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {portfolioCards.map((pc) => {
                    const isPending = pc.status === 'pending';
                    return (
                      <button
                        key={pc.uid}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedCardId(pc.cardId);
                          if (isPending) setPendingInspectItem(pc);
                        }}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-left min-w-[140px] transition active:scale-95 ${
                          isPending
                            ? 'border-amber-400/45 bg-amber-500/[0.08]'
                            : 'border-emerald-400/35 bg-emerald-500/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-extrabold text-white truncate">
                            {pc.name}
                          </span>
                          <span
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              isPending
                                ? 'bg-amber-400/20 text-amber-300'
                                : 'bg-emerald-400/20 text-emerald-300'
                            }`}
                          >
                            {isPending ? 'Pending' : 'Active'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-zinc-200 mt-1">
                          {formatINR(pc.capital, 0)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* PRIMARY ACTION BUTTON */}
            <button
              type="button"
              onClick={() => handleOpenCardOrder(activeTier)}
              className="w-full min-h-[46px] bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold py-3 px-4 rounded-xl text-xs shadow-[0_8px_25px_rgba(212,175,55,0.22),inset_0_1px_0_rgba(255,255,255,0.45)] active:scale-[0.98] transition flex items-center justify-center gap-2 shrink-0"
            >
              <CreditCard className="w-4 h-4" />
              <span>Buy Capital Card</span>
            </button>
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="flex flex-col justify-between h-full max-h-[530px] py-1 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-white">Capital Cards Portfolio</h2>
                <p className="text-[10px] text-[#9AA69D]">
                  Tap any pending card to check 2–48h bank verification status
                </p>
              </div>
              <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-2.5 py-0.5 text-[9px] font-bold text-[#F1D77A] font-mono">
                {totalOwnedCards} Active{pendingCardOrdersCount > 0 ? ` • ${pendingCardOrdersCount} Pending` : ''}
              </span>
            </div>

            {portfolioCards.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  Your Cards ({portfolioCards.length})
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {portfolioCards.map((pc) => {
                    const isPending = pc.status === 'pending';
                    return (
                      <button
                        key={pc.uid}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedCardId(pc.cardId);
                          if (isPending) setPendingInspectItem(pc);
                        }}
                        className={`shrink-0 rounded-xl border p-2.5 text-left min-w-[148px] transition active:scale-95 ${
                          isPending
                            ? 'border-amber-400/50 bg-amber-500/[0.08]'
                            : 'border-emerald-400/40 bg-emerald-500/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-extrabold text-white">{pc.name}</span>
                          <span
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                              isPending
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/35'
                                : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/35'
                            }`}
                          >
                            {isPending ? 'Approval Pending' : 'Active'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-zinc-200 mt-1">
                          {formatINR(pc.capital, 0)}
                        </p>
                        <p className="text-[9px] text-zinc-400 mt-0.5">
                          {isPending ? 'Tap for verification info' : `${(pc.rate * 100).toFixed(1)}% / mo`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x">
              {tiers.map((card) => {
                const isSelected = inspectedCard.id === card.id;
                const isOwned = ownedCardIds.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedCardId(card.id);
                    }}
                    className={`snap-start shrink-0 w-[132px] h-[144px] rounded-2xl bg-gradient-to-b ${card.gradient} border ${
                      isSelected ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : card.border
                    } p-3 flex flex-col justify-between text-left transition active:scale-95`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        style={{ color: card.accent }}
                        className="text-[8px] font-black uppercase tracking-widest"
                      >
                        {card.badge}
                      </span>
                      {isOwned && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[7px] font-extrabold">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-extrabold text-white">{card.name}</p>
                      <p className="text-[11px] font-mono font-bold text-zinc-300 mt-0.5">
                        {formatINR(card.capital, 0)}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px]">
                      <span className="text-zinc-400">Monthly</span>
                      <span style={{ color: card.accent }} className="font-extrabold">
                        {(card.rate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/[0.09] bg-[#101714] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-white">
                    {inspectedCard.name} Card • {formatINR(inspectedCard.capital, 0)}
                  </p>
                  <p className="text-[10px] text-[#9AA69D] mt-0.5">{inspectedCard.note}</p>
                </div>
                <span
                  style={{ color: inspectedCard.accent }}
                  className="text-xs font-extrabold font-mono"
                >
                  {(inspectedCard.rate * 100).toFixed(1)}%/mo
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCardOrder(inspectedCard, true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold text-xs active:scale-[0.98] transition"
              >
                Add {inspectedCard.name} to Cart ({formatINR(inspectedCard.capital, 0)})
              </button>
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="flex flex-col justify-between h-full max-h-[530px] py-1 space-y-3">
            <div className="rounded-2xl border border-white/[0.09] bg-[#101714] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-white">Referral Network</h2>
                  <p className="text-[10px] text-[#9AA69D]">
                    Invite friends • Earn Level 1 &amp; Level 2 rewards
                  </p>
                </div>
                <span className="text-xs font-mono font-extrabold text-[#F1D77A]">
                  {formatINR(referralEarnings, 0)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#090E0C] border border-white/[0.07] p-2.5">
                  <span className="text-[9px] text-[#9AA69D] block">Level 1 Direct</span>
                  <span className="text-sm font-extrabold text-white font-mono">
                    {directJoins} Members
                  </span>
                </div>
                <div className="rounded-xl bg-[#090E0C] border border-white/[0.07] p-2.5">
                  <span className="text-[9px] text-[#9AA69D] block">Level 2 Team</span>
                  <span className="text-sm font-extrabold text-white font-mono">
                    {secondaryJoins} Members
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-[#090E0C] border border-[#D4AF37]/30 p-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-[#9AA69D] block">
                    Your Invite Code
                  </span>
                  <span className="font-mono text-xs font-extrabold text-[#F1D77A]">
                    {referralCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(referralCode, 'code')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-[10px] font-bold text-white flex items-center gap-1 active:scale-95 transition"
                >
                  {copiedCode ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleTelegramShare}
                className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Invite Friends</span>
              </button>

              <button
                type="button"
                onClick={() => copyText(inviteUrl, 'link')}
                className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.04] text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* 3. BOTTOM 3-TAB NAVIGATION BAR (Vault, Cards, Network)                */}
      {/* ===================================================================== */}
      <nav className="w-full max-w-md mx-auto px-4 pt-2 pb-3 border-t border-white/[0.07] bg-[#090D0C]/95 backdrop-blur-xl relative z-30 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'dashboard', label: 'Vault', icon: Wallet },
            { id: 'cards', label: 'Cards', icon: CreditCard },
            { id: 'network', label: 'Network', icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(item.id);
                }}
                className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                  isActive
                    ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/45 text-[#F1D77A]'
                    : 'border border-transparent text-[#8E9A92] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* 4. E-COMMERCE MULTI-CARD CART + UPI INTENT + UTR RECOVERY MODAL       */}
      {/* ===================================================================== */}
      {isCardModalOpen && (
        <div
          onClick={() => setIsCardModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/35 bg-[#101714] p-5 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#E5C158]">
                  Card Cart Checkout • {cartSummary.totalItems} Card(s)
                </span>
                <h3 className="text-sm font-extrabold text-white mt-0.5">
                  Total Payable: {formatINR(cartSummary.totalAmount, 0)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Multi-Card Selector Cart */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Select Cards for Your Cart
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                {tiers.map((t) => {
                  const qty = cartQuantities[t.id] || 0;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                        qty > 0
                          ? 'border-[#D4AF37]/45 bg-[#D4AF37]/[0.08]'
                          : 'border-white/[0.07] bg-[#090E0C]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {t.name}{' '}
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ({formatINR(t.capital, 0)})
                          </span>
                        </p>
                        <p className="text-[9px] text-emerald-300 font-mono">
                          {(t.rate * 100).toFixed(1)}% / mo
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(t.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white/[0.07] text-white font-bold text-xs flex items-center justify-center active:scale-95"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-mono text-xs font-extrabold text-white">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(t.id, 1)}
                          className="w-6 h-6 rounded-lg bg-[#D4AF37] text-[#17130A] font-black text-xs flex items-center justify-center active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct UPI Intent Button (QR hidden; opens UPI payment app list with total amount) */}
            <div className="rounded-xl bg-[#090E0C] border border-emerald-400/25 p-3 space-y-2">
              <button
                type="button"
                onClick={handleLaunchUpiIntent}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Pay {formatINR(cartSummary.totalAmount, 0)} with UPI</span>
              </button>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                <span className="truncate">
                  UPI: <strong className="font-mono text-zinc-200">{VYOM_PAYMENT_UPI}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => copyText(VYOM_PAYMENT_UPI, 'upi')}
                  className="text-[#E5C158] font-bold hover:underline shrink-0"
                >
                  Copy UPI ID
                </button>
              </div>
              <p className="text-[9px] text-zinc-500 leading-snug">
                Already paid earlier or returning after payment? Your cart is saved—enter UTR below anytime.
              </p>
            </div>

            <form onSubmit={handleSubmitCardOrder} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Bank UTR / Transaction Reference
                </label>
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="Enter 12-digit UTR after payment"
                  required
                  minLength={6}
                  className="w-full bg-[#090E0C] border border-white/15 focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {cardOrderError && (
                <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{cardOrderError}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={cardOrderLoading}
                className="w-full bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold py-2.5 rounded-xl text-xs active:scale-[0.98] transition disabled:opacity-60"
              >
                {cardOrderLoading ? 'Submitting Order...' : 'Submit Card Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PENDING CARD VERIFICATION INFO POPUP (2–48 Hours Bank Audit)        */}
      {/* ===================================================================== */}
      {pendingInspectItem && (
        <div
          onClick={() => setPendingInspectItem(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-amber-400/40 bg-[#101714] p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-300">
                  Approval Pending
                </span>
                <h3 className="text-sm font-extrabold text-white mt-0.5">
                  {pendingInspectItem.name} Card ({formatINR(pendingInspectItem.capital, 0)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingInspectItem(null)}
                className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-zinc-300">
              Your card is currently in <strong className="text-amber-300">Approval Pending</strong>{' '}
              status. Our admin team is verifying your payment receipt and UTR against bank
              records—your card will activate within <strong className="text-white">2 to 48 hours</strong>{' '}
              once verified.
            </p>

            <div className="rounded-xl bg-[#090E0C] border border-white/[0.08] p-3 text-[11px] font-mono text-zinc-300 space-y-1">
              <p>Order ID: {pendingInspectItem.orderId || 'N/A'}</p>
              <p>Submitted UTR: {pendingInspectItem.bankUtr || 'N/A'}</p>
              <p>Order Total: {formatINR(pendingInspectItem.totalOrderAmount, 0)}</p>
            </div>

            <button
              type="button"
              onClick={() => setPendingInspectItem(null)}
              className="w-full py-2.5 rounded-xl bg-white text-black font-extrabold text-xs active:scale-95 transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. UPI WITHDRAWAL MODAL                                               */}
      {/* ===================================================================== */}
      {isWithdrawOpen && (
        <div
          onClick={() => setIsWithdrawOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/35 bg-[#101714] p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">
                  UPI Payout • 2–48 Hours
                </span>
                <h3 className="text-sm font-extrabold text-white mt-0.5">
                  Request UPI Withdrawal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitWithdraw} className="space-y-3">
              <div className="rounded-xl bg-[#090E0C] border border-white/[0.08] p-3 text-[11px] text-zinc-300 space-y-1">
                <p>
                  Available Balance:{' '}
                  <strong className="text-emerald-300">
                    {formatINR(withdrawableBalance, 2)}
                  </strong>
                </p>
                
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Amount to Withdraw (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  className="w-full bg-[#090E0C] border border-white/15 focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Your UPI ID
                </label>
                <input
                  type="text"
                  value={withdrawUpi}
                  onChange={(e) => setWithdrawUpi(e.target.value)}
                  placeholder="yourname@upi"
                  required
                  className="w-full bg-[#090E0C] border border-white/15 focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {withdrawError && (
                <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{withdrawError}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold py-2.5 rounded-xl text-xs active:scale-[0.98] transition disabled:opacity-60"
              >
                {withdrawLoading ? 'Submitting...' : 'Submit Withdrawal Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. HISTORY MODAL (Accessible from Top Header Clock Icon)              */}
      {/* ===================================================================== */}
      {isLedgerOpen && (
        <div
          onClick={() => setIsLedgerOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/30 bg-[#101714] p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#F0A818]" />
                <h3 className="text-sm font-extrabold text-white">Transaction History</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'credits', label: 'Credits' },
                { id: 'withdrawals', label: 'Payouts' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLedgerFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                    ledgerFilter === tab.id
                      ? 'bg-[#D4AF37] text-[#17130A]'
                      : 'bg-white/[0.05] text-[#9AA69D]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredLedger.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-white/[0.08] bg-[#090E0C] px-3.5 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{row.title}</p>
                    <p className="text-[10px] text-[#9AA69D] truncate">{row.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`block font-mono text-xs font-extrabold ${
                        row.isWithdrawal ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {row.isWithdrawal ? '-' : '+'}
                      {formatINR(row.amount, 0)}
                    </span>
                    <span className="text-[9px] text-[#7D8A81]">{row.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. NOTIFICATIONS MODAL (Activity Feed + Pending Reason + Daily Note)  */}
      {/* ===================================================================== */}
      {isNotifOpen && (
        <div
          onClick={() => setIsNotifOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-emerald-400/35 bg-[#101714] p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <Bell className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Activity &amp; Updates</h3>
                  <p className="text-[10px] text-[#9AA69D]">
                    Card status, verification updates &amp; daily alerts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
              {notifications.map((n, idx) => {
                const badgeStyle =
                  n.tone === 'amber'
                    ? 'bg-amber-400/15 text-amber-300 border-amber-400/35'
                    : n.tone === 'emerald'
                      ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/35'
                      : n.tone === 'blue'
                        ? 'bg-sky-400/15 text-sky-300 border-sky-400/35'
                        : 'bg-[#D4AF37]/15 text-[#F1D77A] border-[#D4AF37]/35';

                return (
                  <div
                    key={n.id || idx}
                    className="rounded-xl bg-[#090E0C] border border-white/[0.08] p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle}`}
                      >
                        {n.category || 'Update'}
                      </span>
                      <span className="text-[9px] font-mono text-[#7D8A81]">{n.time || ''}</span>
                    </div>
                    <p className="text-xs font-bold text-white leading-snug">{n.title}</p>
                    <p className="text-[11px] text-[#A6B0AA] leading-relaxed">{n.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. PROFILE & ACCOUNT MODAL                                            */}
      {/* ===================================================================== */}
      {isProfileOpen && (
        <div
          onClick={() => setIsProfileOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/30 bg-[#101714] p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#F0A818]" />
                <h3 className="text-sm font-extrabold text-white">Your Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#090E0C] border border-white/[0.08] p-3.5 space-y-1.5">
              <p className="text-sm font-extrabold text-white">{displayName}</p>
              <p className="text-[11px] font-mono text-[#E5C158]">{handleTag}</p>
              <p className="text-[11px] text-emerald-300 pt-1">
                Active Cards:{' '}
                <strong>
                  {totalOwnedCards} {totalOwnedCards === 1 ? 'Card' : 'Cards'}
                </strong>{' '}
                ({formatINR(baseCapital, 0)})
              </p>
              <p className="text-[11px] text-zinc-400">
                Linked UPI:{' '}
                <strong className="text-white">
                  {activeProfile?.upiId || 'Not configured yet'}
                </strong>
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  handleOpenWithdraw();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F1D77A] via-[#D8B342] to-[#B98513] text-[#17130A] font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw via UPI</span>
              </button>

              {typeof logout === 'function' && (
                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2.5 rounded-xl border border-rose-500/35 bg-rose-500/10 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9. RULES & POLICIES MODAL                                             */}
      {/* ===================================================================== */}
      {isRulesOpen && (
        <div
          onClick={() => setIsRulesOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/35 bg-[#101714] p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#F0A818]">
                  <ShieldCheck className="w-3 h-3" /> VYOM Rules
                </span>
                <h3 className="mt-1 text-sm font-extrabold text-white">
                  Profit Split &amp; Account Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            
            <div className="rounded-xl bg-[#090E0C] border border-white/[0.08] p-3.5 space-y-1.5">
              <h4 className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                2. Capital Cards (No Limit)
              </h4>
              <p className="text-[11px] text-zinc-300">
                Choose from 5 Capital Cards: <strong>Starter (₹2,000)</strong>,{' '}
                <strong>Growth (₹5,000)</strong>, <strong>Elite (₹10,000)</strong>,{' '}
                <strong>Prime (₹50,000)</strong>, and <strong>Signature (₹1,00,000)</strong>. You
                can buy as many cards as you want on your account.
              </p>
            </div>

            <div className="rounded-xl bg-[#090E0C] border border-white/[0.08] p-3.5 space-y-2.5">
              <div className="flex gap-1.5">
                {[
                  { id: 'terms', label: 'Terms' },
                  { id: 'privacy', label: 'Privacy' },
                  { id: 'risk', label: 'Risk Policy' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPolicyTab(t.id)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                      policyTab === t.id
                        ? 'bg-[#D4AF37] text-[#17130A]'
                        : 'bg-white/[0.05] text-zinc-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] leading-relaxed text-zinc-300 space-y-1.5">
                {policyTab === 'terms' && (
                  <>
                    <p>
                      • One account per email address. You can buy as many Capital Cards as you
                      want.
                    </p>
                    <p>
                      • All card purchases require valid UTR verification. Approved UPI
                      withdrawals process within 2 to 48 hours.
                    </p>
                  </>
                )}
                {policyTab === 'privacy' && (
                  <>
                    <p>
                      • Your name, email, referral code, and linked UPI ID are stored securely to
                      run your account and process payouts.
                    </p>
                    <p>
                      • Protected by Firebase Authentication and Firestore access rules.
                    </p>
                  </>
                )}
                {policyTab === 'risk' && (
                  <>
                    <p>
                      • Monthly percentages are estimates, not guaranteed returns. Capital carries
                      risk.
                    </p>
                    <p className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>All payouts are checked before release.</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}