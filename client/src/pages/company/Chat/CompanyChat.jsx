import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyChat() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const companyId = user?.companyId || user?._id || 'company-1';

  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem(`fleetos-company-chats-${companyId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [activeChatId, setActiveChatId] = useState(conversations[0]?.id || null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    async function loadChatMessages() {
      if (!companyId) return;
      try {
        const res = await api.get(`/chats/${companyId}/messages`);
        if (res && Array.isArray(res.messages) && res.messages.length > 0) {
          const threadsMap = {};
          res.messages.forEach(msg => {
            const threadId = msg.roomId || companyId;
            if (!threadsMap[threadId]) {
              threadsMap[threadId] = {
                id: threadId,
                customerName: msg.senderName || (msg.senderRole === 'customer' ? 'Valued Client' : 'Company Manager'),
                lastMsg: msg.text,
                time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                unread: false,
                messages: []
              };
            }
            threadsMap[threadId].messages.push({
              id: msg._id || Date.now(),
              sender: msg.senderRole === 'company' ? 'company' : 'customer',
              text: msg.text,
              timestamp: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            });
          });

          const convList = Object.values(threadsMap);
          setConversations(convList);
          if (!activeChatId && convList.length > 0) {
            setActiveChatId(convList[0].id);
          }
        }
      } catch (err) {}
    }
    loadChatMessages();
  }, [companyId]);

  useEffect(() => {
    if (!activeChatId) return;
    const selected = conversations.find(c => c.id === activeChatId);
    if (selected && selected.messages) {
      setMessages(selected.messages);
    } else {
      const storageKey = `fleetos-chat-${activeChatId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try { setMessages(JSON.parse(stored)); } catch {}
      } else {
        setMessages([]);
      }
    }
  }, [activeChatId, conversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChatId) return;

    const newMsg = {
      id: Date.now(),
      sender: 'company',
      text: replyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };

    const nextMessages = [...messages, newMsg];
    setMessages(nextMessages);
    localStorage.setItem(`fleetos-chat-${activeChatId}`, JSON.stringify(nextMessages));

    try {
      await api.post(`/chats/${activeChatId}/messages`, {
        text: replyText.trim(),
        senderRole: 'company',
        senderName: user?.companyName || user?.name || 'Company Manager'
      });
    } catch (err) {}

    setConversations(conversations.map(c => {
      if (c.id === activeChatId) {
        return { ...c, lastMsg: replyText.trim(), time: 'Just now', unread: false, messages: nextMessages };
      }
      return c;
    }));

    setReplyText('');
  };

  const activeConv = conversations.find(c => c.id === activeChatId) || { customerName: 'Client Thread' };

  return (
    <div className="bg-background text-on-background min-h-screen font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-full w-[280px] fixed left-0 top-0 bg-primary-container text-on-primary shadow-md py-6 z-50">
        <div className="px-6 mb-6">
          <span className="text-xl font-bold text-on-primary">FleetOS</span>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-white/20">
              <img className="w-full h-full object-cover" alt="Avatar" src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDob1EAfuIbOEB4mJ8aEtGMOAqZ2pFY3XlqCk2JkHoW67b-ZOBUc5zFlRYqQ2BZ3DG67ncjfW2OLoo5hg7xuxYuAqd8Dnt5ilPQQXVTUmumtWf50x262r2EhICAmE-N5bwuBjLhajhwN27J-KOxykfXlTI8WYp4DU3gYg4J6dBnKMvJL7SnjiVZ4DXESV3KRM6gWcKX9-Ly_MH0qvOPlsnmmbJxlvGssOUoAAS512hpEREvE9kMnIHJ0g"} />
            </div>
            <div>
              <p className="text-xs font-bold text-on-primary">{user?.name || 'Fleet Manager'}</p>
              <p className="text-xs text-on-primary-container opacity-80">{user?.companyName || 'Admin Console'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-grow space-y-1 overflow-y-auto">
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyDashboard}>
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="text-xs font-bold">Dashboard</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyBookings}>
            <span className="material-symbols-outlined" data-icon="calendar_today">calendar_today</span>
            <span className="text-xs font-bold">Bookings</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyTechnicians}>
            <span className="material-symbols-outlined" data-icon="badge">badge</span>
            <span className="text-xs font-bold">Technicians</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyInventory}>
            <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
            <span className="text-xs font-bold">Inventory</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyServices}>
            <span className="material-symbols-outlined" data-icon="build">build</span>
            <span className="text-xs font-bold">Services</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyCustomers}>
            <span className="material-symbols-outlined" data-icon="group">group</span>
            <span className="text-xs font-bold">Customers</span>
          </Link>
          <Link className="flex items-center gap-3 bg-secondary-container text-on-secondary-container border-l-4 border-secondary px-6 py-3 transition-all" to={ROUTES.companyChat}>
            <span className="material-symbols-outlined" data-icon="chat">chat</span>
            <span className="text-xs font-bold">Client Messages</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyReviews}>
            <span className="material-symbols-outlined" data-icon="rate_review">rate_review</span>
            <span className="text-xs font-bold">Reviews</span>
          </Link>
        </nav>

        <div className="px-6 mt-auto pt-4 space-y-1">
          <button onClick={() => { logout(); navigate(ROUTES.login); }} className="w-full flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all text-left">
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="text-xs font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-[280px] flex-grow min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-background border-b border-outline-variant">
          <h1 className="text-lg font-bold text-primary">Client Support Messages</h1>
        </header>

        <div className="flex-grow p-4 md:p-8 max-w-[1440px] w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-5rem)]">
          {/* Threads List */}
          <div className="md:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-700 flex justify-between items-center">
              <span>Active Threads</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500">{conversations.length}</span>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-grow">
              {conversations.map(conv => (
                <div 
                  key={conv.id}
                  onClick={() => setActiveChatId(conv.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    activeChatId === conv.id ? 'bg-secondary/5 border-l-4 border-secondary' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold text-slate-900">{conv.customerName}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{conv.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{conv.lastMsg}</p>
                </div>
              ))}

              {conversations.length === 0 && (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <span className="material-symbols-outlined text-3xl">chat_bubble_outline</span>
                  <p className="text-xs font-semibold text-slate-600">No active threads</p>
                  <p className="text-[11px] text-slate-400">Incoming customer chat messages will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Chat Window */}
          <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {activeChatId ? (
              <>
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs">
                    {activeConv.customerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{activeConv.customerName}</h3>
                    <p className="text-[10px] text-emerald-600 font-semibold">● Client Connected</p>
                  </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                  {messages.map(msg => {
                    const isCompany = msg.sender === 'company';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isCompany ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-slate-400 font-semibold mb-0.5 px-1 uppercase">
                          {isCompany ? 'Company (You)' : activeConv.customerName}
                        </span>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs shadow-sm ${
                          isCompany ? 'bg-secondary text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <p className={`text-[10px] text-right mt-1 ${isCompany ? 'text-white/70' : 'text-slate-400'}`}>
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                  <input 
                    type="text"
                    className="flex-grow px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-secondary"
                    placeholder={`Reply to ${activeConv.customerName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-secondary text-white font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1"
                  >
                    Reply
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">forum</span>
                <h4 className="text-sm font-bold text-slate-800">No Conversation Selected</h4>
                <p className="text-xs text-slate-500">Select an active client thread on the left to start responding.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CompanyChat;
