import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, BOTTOM_NAV } from '../../../constants';
import api from '../../../services/api';

// Demo transactions for when the API has no data
const DEMO_TRANSACTIONS = [
  {
    _id: 'txn-001',
    reference: '#FOS-88219',
    service: 'HVAC Maintenance',
    companyName: 'SwiftFleet Services',
    date: 'Oct 24, 2023',
    amount: 196.12,
    method: 'card',
    status: 'paid',
  },
  {
    _id: 'txn-002',
    reference: '#FOS-88102',
    service: 'Engine Diagnostics',
    companyName: 'AutoPro Lahore',
    date: 'Oct 19, 2023',
    amount: 153.90,
    method: 'wallet',
    status: 'paid',
  },
  {
    _id: 'txn-003',
    reference: '#FOS-87991',
    service: 'Express Oil & Filter Change',
    companyName: 'FastFix Fleet',
    date: 'Sep 30, 2023',
    amount: 130.20,
    method: 'after',
    status: 'pending',
  },
];

const SAVED_CARDS = [
  { id: 'card-1', label: 'Visa', last4: '4429', expiry: '09/26', icon: 'credit_card', primary: true },
  { id: 'card-2', label: 'Mastercard', last4: '8801', expiry: '02/25', icon: 'credit_card', primary: false },
];

const METHOD_ICONS = { card: 'credit_card', wallet: 'account_balance_wallet', after: 'history' };
const METHOD_LABELS = { card: 'Credit / Debit Card', wallet: 'Digital Wallet', after: 'Pay After Service' };

const STATUS_CLASSES = {
  paid:    'bg-secondary-container text-on-secondary-container',
  pending: 'bg-tertiary-container text-on-tertiary-container',
  failed:  'bg-error-container text-on-error-container',
};

function Payments() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'methods'
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [cards, setCards] = useState(SAVED_CARDS);
  const [newCard, setNewCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/payments');
        setTransactions(res.transactions?.length ? res.transactions : DEMO_TRANSACTIONS);
      } catch {
        setTransactions(DEMO_TRANSACTIONS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalSpent = transactions
    .filter((t) => t.status === 'paid')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const handleSetDefaultCard = (id) => {
    setCards(cards.map(c => ({ ...c, primary: c.id === id })));
  };

  const handleRemoveCard = (id) => {
    setCards(cards.filter(c => c.id !== id));
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    const newCardObj = {
      id: `card-${Date.now()}`,
      label: newCard.number.startsWith('4') ? 'Visa' : 'Mastercard',
      last4: newCard.number.slice(-4) || '1234',
      expiry: newCard.expiry || '12/28',
      icon: 'credit_card',
      primary: cards.length === 0
    };

    setCards([...cards, newCardObj]);
    setSaving(false);
    setAddCardOpen(false);
    setNewCard({ number: '', name: '', expiry: '', cvv: '' });
  };

  return (
    <div className="bg-background text-on-surface min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-md">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Payments</h1>
        </div>
        <button
          onClick={() => navigate(ROUTES.dashboard)}
          className="p-2 rounded-full hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant">home</span>
        </button>
      </header>

      <main className="pt-24 pb-10 px-container-margin max-w-3xl mx-auto space-y-lg">

        {/* Summary Card */}
        <section className="bg-primary rounded-2xl p-lg text-on-primary shadow-elevation-2">
          <p className="font-label-sm text-label-sm uppercase tracking-widest opacity-80">Total Spent</p>
          <p className="text-4xl font-extrabold mt-xs">${totalSpent.toFixed(2)}</p>
          <p className="font-body-md opacity-70 mt-xs">{transactions.filter((t) => t.status === 'paid').length} completed payments</p>
          <div className="mt-lg flex gap-md">
            <div className="flex-1 bg-white/10 rounded-xl p-md text-center">
              <p className="text-2xl font-bold">{transactions.length}</p>
              <p className="text-xs opacity-80 mt-xs">Total Orders</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-xl p-md text-center">
              <p className="text-2xl font-bold">{transactions.filter((t) => t.status === 'pending').length}</p>
              <p className="text-xs opacity-80 mt-xs">Pending</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-xl p-md text-center">
              <p className="text-2xl font-bold">{SAVED_CARDS.length}</p>
              <p className="text-xs opacity-80 mt-xs">Saved Cards</p>
            </div>
          </div>
        </section>

        {/* Tab Switcher */}
        <div className="flex gap-sm bg-surface-container-low rounded-xl p-1">
          {[['history', 'receipt_long', 'Payment History'], ['methods', 'credit_card', 'Payment Methods']].map(([tab, icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-sm py-3 rounded-lg font-nav-item text-nav-item transition-all ${
                activeTab === tab
                  ? 'bg-surface shadow-elevation-1 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── Payment History Tab ── */}
        {activeTab === 'history' && (
          <section className="space-y-md">
            {loading && (
              <div className="space-y-md">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-surface-container-lowest rounded-xl p-lg animate-pulse border border-surface-container-low">
                    <div className="flex gap-md">
                      <div className="w-12 h-12 rounded-lg bg-surface-container-high shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface-container-high rounded w-2/3" />
                        <div className="h-3 bg-surface-container-high rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && transactions.length === 0 && (
              <div className="bg-surface-container-lowest rounded-xl p-xl text-center border border-surface-container-low">
                <span className="material-symbols-outlined text-4xl text-outline mb-md">receipt_long</span>
                <p className="font-body-lg text-on-surface">No transactions yet</p>
                <p className="font-body-md text-on-surface-variant mt-xs">Your payment history will appear here after your first booking.</p>
                <button
                  onClick={() => navigate(ROUTES.companies)}
                  className="mt-lg px-xl py-sm bg-primary text-on-primary rounded-xl font-nav-item hover:bg-primary-container transition-colors"
                >
                  Book a Service
                </button>
              </div>
            )}

            {!loading && transactions.map((txn) => (
              <div
                key={txn._id}
                className="bg-surface-container-lowest rounded-xl p-lg shadow-elevation-1 border border-surface-container-low"
              >
                <div className="flex items-start gap-md">
                  <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-primary-container">
                      {METHOD_ICONS[txn.method] || 'payments'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-sm">
                      <div className="min-w-0">
                        <p className="font-nav-item text-nav-item text-on-surface truncate">{txn.service}</p>
                        <p className="font-body-md text-body-md text-on-surface-variant truncate">{txn.companyName}</p>
                        <p className="text-xs text-outline mt-xs">{txn.reference} · {txn.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-headline-md text-headline-md font-bold text-primary">${txn.amount?.toFixed(2)}</p>
                        <span className={`inline-block mt-xs px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_CLASSES[txn.status] || STATUS_CLASSES.pending}`}>
                          {txn.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-md flex items-center gap-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">{METHOD_ICONS[txn.method] || 'payments'}</span>
                      <span className="text-xs">{METHOD_LABELS[txn.method] || 'Unknown method'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Payment Methods Tab ── */}
        {activeTab === 'methods' && (
          <section className="space-y-md">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-on-surface">Saved Cards</h3>
              <button
                onClick={() => setAddCardOpen(true)}
                className="flex items-center gap-xs text-primary font-nav-item text-nav-item hover:underline"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Card
              </button>
            </div>

            {cards.map((card) => (
              <div
                key={card.id}
                className={`relative bg-surface-container-lowest rounded-xl p-lg shadow-elevation-1 border-2 ${card.primary ? 'border-primary' : 'border-surface-container-low'}`}
              >
                {card.primary && (
                  <span className="absolute top-md right-md px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold rounded uppercase">
                    Default
                  </span>
                )}
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary-container">{card.icon}</span>
                  </div>
                  <div>
                    <p className="font-nav-item text-nav-item text-on-surface">{card.label} •••• {card.last4}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">Expires {card.expiry}</p>
                  </div>
                </div>
                <div className="mt-md flex gap-sm">
                  {!card.primary && (
                    <button 
                      onClick={() => handleSetDefaultCard(card.id)}
                      className="flex-1 py-2 rounded-lg bg-surface-container-low text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors"
                    >
                      Set as Default
                    </button>
                  )}
                  <button 
                    onClick={() => handleRemoveCard(card.id)}
                    className="flex-1 py-2 rounded-lg bg-error-container text-on-error-container text-sm font-medium hover:opacity-80 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* Digital Wallet Info */}
            <div className="bg-surface-container-lowest rounded-xl p-lg shadow-elevation-1 border border-surface-container-low">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container">account_balance_wallet</span>
                </div>
                <div className="flex-1">
                  <p className="font-nav-item text-nav-item text-on-surface">Digital Wallet</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">Apple Pay, Google Pay supported</p>
                </div>
                <span className="px-2 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full">Active</span>
              </div>
            </div>

            {/* Pay After Service Info */}
            <div className="bg-surface-container-lowest rounded-xl p-lg shadow-elevation-1 border border-surface-container-low">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-lg bg-tertiary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-tertiary-container">history</span>
                </div>
                <div className="flex-1">
                  <p className="font-nav-item text-nav-item text-on-surface">Pay After Service</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">Invoice sent upon job completion</p>
                </div>
                <span className="px-2 py-1 bg-tertiary-container text-on-tertiary-container text-xs font-bold rounded-full">Available</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Add Card Modal */}
      {addCardOpen && (
        <div className="fixed inset-0 z-[70] bg-on-background/50 backdrop-blur-sm flex items-center justify-center p-container-margin">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-lg">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="font-headline-md text-headline-md text-on-surface">Add New Card</h3>
              <button
                onClick={() => setAddCardOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveCard} className="space-y-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Card Number</label>
                <input
                  required
                  maxLength={19}
                  value={newCard.number}
                  onChange={(e) => setNewCard((p) => ({ ...p, number: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() }))}
                  placeholder="1234 5678 9012 3456"
                  className="w-full h-12 px-md border border-outline-variant rounded-xl bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md"
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Cardholder Name</label>
                <input
                  required
                  value={newCard.name}
                  onChange={(e) => setNewCard((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Alex Thompson"
                  className="w-full h-12 px-md border border-outline-variant rounded-xl bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Expiry (MM/YY)</label>
                  <input
                    required
                    maxLength={5}
                    value={newCard.expiry}
                    onChange={(e) => setNewCard((p) => ({ ...p, expiry: e.target.value }))}
                    placeholder="09/26"
                    className="w-full h-12 px-md border border-outline-variant rounded-xl bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">CVV</label>
                  <input
                    required
                    maxLength={4}
                    type="password"
                    value={newCard.cvv}
                    onChange={(e) => setNewCard((p) => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))}
                    placeholder="•••"
                    className="w-full h-12 px-md border border-outline-variant rounded-xl bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-primary text-on-primary font-nav-item rounded-xl hover:bg-primary-container transition-colors flex items-center justify-center gap-sm disabled:opacity-70"
              >
                {saving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                {saving ? 'Saving...' : 'Save Card'}
              </button>
            </form>
            <div className="mt-md flex items-center justify-center gap-sm opacity-60">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span className="font-label-sm text-label-sm">256-bit SSL encrypted</span>
            </div>
          </div>
        </div>
      )}

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-container-margin py-sm bg-surface shadow-[0_-4px_16px_0_rgba(11,29,45,0.12)] rounded-t-xl md:hidden">
        {BOTTOM_NAV.map((item) => (
          <a
            key={item.label}
            href={item.to}
            onClick={(e) => { e.preventDefault(); navigate(item.to); }}
            className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-nav-item text-[10px] mt-0.5">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

export default Payments;
