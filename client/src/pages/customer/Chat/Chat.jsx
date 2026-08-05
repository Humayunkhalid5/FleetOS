import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function Chat() {
  const navigate = useNavigate();
  const { companyId } = useParams();
  const safeCompanyId = companyId || 'swiftfleet';

  // Role toggle: 'customer' or 'company' (dealer)
  const [activeRole, setActiveRole] = useState(() => {
    const cachedUser = localStorage.getItem('fleetos-user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        if (u.role === 'company') return 'company';
      } catch {
        /* fallback */
      }
    }
    return 'customer';
  });

  const [companyName, setCompanyName] = useState('Fleet Partner');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const endRef = useRef(null);
  const socketRef = useRef(null);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch company details
  useEffect(() => {
    let mounted = true;
    const loadCompany = async () => {
      try {
        const response = await api.get(`/companies/${safeCompanyId}`);
        if (mounted && response?.company?.name) {
          setCompanyName(response.company.name);
        }
      } catch {
        /* fallback default */
      }
    };
    loadCompany();
    return () => {
      mounted = false;
    };
  }, [safeCompanyId]);

  // Load existing chat history
  useEffect(() => {
    const storageKey = `fleetos-chat-${safeCompanyId}`;
    const loadMessages = async () => {
      try {
        const response = await api.get(`/chats/${safeCompanyId}/messages`);
        const nextMessages = (response.messages || []).map((message) => ({
          id: message._id || `${message.createdAt}-${message.text}`,
          sender: message.senderRole === 'company' ? 'company' : 'customer',
          text: message.text,
          timestamp: new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
        }));

        if (nextMessages.length > 0) {
          setMessages(nextMessages);
          localStorage.setItem(storageKey, JSON.stringify(nextMessages));
          return;
        }
      } catch {
        /* fallback below */
      }

      const existing = localStorage.getItem(storageKey);
      if (existing) {
        try {
          setMessages(JSON.parse(existing));
          return;
        } catch {
          localStorage.removeItem(storageKey);
        }
      }

      const initialMessages = [
        {
          id: 1,
          sender: 'company',
          text: `Hello! Welcome to ${companyName}. How can our service center assist your fleet today?`,
          timestamp: 'Now',
        },
      ];

      setMessages(initialMessages);
      localStorage.setItem(storageKey, JSON.stringify(initialMessages));
    };

    loadMessages();
  }, [safeCompanyId, companyName]);

  // Realtime Socket connection
  useEffect(() => {
    const token = localStorage.getItem('fleetos-token');
    if (!token) return;

    let socket;
    try {
      socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
    } catch {
      return;
    }
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('chat:join', safeCompanyId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:history', ({ messages: history = [] }) => {
      if (history.length > 0) {
        const next = history.map((message) => ({
          id: message._id || `${message.createdAt}-${message.text}`,
          sender: message.senderRole === 'company' ? 'company' : 'customer',
          text: message.text,
          timestamp: new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
        }));
        setMessages(next);
        localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(next));
      }
    });

    socket.on('chat:message', (data) => {
      const message = data?.message || data;
      if (!message) return;
      const next = [
        ...messagesRef.current,
        {
          id: message._id || `${message.createdAt}-${message.text}`,
          sender: message.senderRole === 'company' ? 'company' : 'customer',
          text: message.text,
          timestamp: new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
        },
      ];
      setMessages(next);
      localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(next));
    });

    return () => {
      socket.emit('chat:leave', safeCompanyId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [safeCompanyId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const newMessage = {
      id: Date.now(),
      sender: activeRole, // 'customer' or 'company'
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };

    const nextMessages = [...messagesRef.current, newMessage];
    setMessages(nextMessages);
    localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(nextMessages));
    setDraft('');

    // Broadcast via socket if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:message', {
        roomId: safeCompanyId,
        text: trimmed,
        senderRole: activeRole,
        recipient: safeCompanyId,
        recipientRole: activeRole === 'customer' ? 'company' : 'customer',
      });
      return;
    }

    // REST Fallback
    try {
      await api.post(`/chats/${safeCompanyId}/messages`, {
        recipient: safeCompanyId,
        text: trimmed,
        senderRole: activeRole,
      });
    } catch {
      // If customer sent and backend offline, simulate automated dealer acknowledgement
      if (activeRole === 'customer') {
        const autoReply = {
          id: Date.now() + 1,
          sender: 'company',
          text: 'Thank you for reaching out! Our team is reviewing your message and will update your request details shortly.',
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };
        const updatedMessages = [...nextMessages, autoReply];
        setMessages(updatedMessages);
        localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(updatedMessages));
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-md md:p-xl">
      <div className="mx-auto max-w-5xl rounded-3xl border border-outline-variant bg-surface-container-lowest shadow-[0_8px_32px_0_rgba(11,29,45,0.12)] overflow-hidden">
        {/* Header with Mode Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline-variant bg-surface-container-low px-lg py-md gap-md">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-xs flex items-center gap-xs text-primary font-nav-item text-nav-item hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
            </button>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              Chat: {companyName}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Two-sided live communication portal between Customer & Service Dealer.
            </p>
          </div>

          {/* Perspective / Role Switcher */}
          <div className="flex flex-col items-start md:items-end gap-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Chatting as:
            </span>
            <div className="flex p-1 bg-surface-container-highest rounded-xl border border-outline-variant">
              <button
                type="button"
                onClick={() => setActiveRole('customer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-xs ${
                  activeRole === 'customer'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                Customer
              </button>
              <button
                type="button"
                onClick={() => setActiveRole('company')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-xs ${
                  activeRole === 'company'
                    ? 'bg-tertiary text-on-tertiary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                Dealer / Company
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-lg">
            {/* Status indicator */}
            <div className="mb-md rounded-2xl bg-surface-container-low p-md flex items-center justify-between">
              <div className="flex items-center gap-sm text-primary">
                <span className="material-symbols-outlined">verified</span>
                <span className="font-nav-item text-nav-item">
                  {connected ? 'Live Socket Connected' : 'Sync Mode Active'} — Currently sending as{' '}
                  <strong className="capitalize">{activeRole === 'company' ? 'Dealer/Company' : 'Customer'}</strong>
                </span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="space-y-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-md min-h-[400px] max-h-[480px] overflow-y-auto">
              {messages.map((message) => {
                const isMe = message.sender === activeRole;
                const isDealer = message.sender === 'company';
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-outline font-semibold mb-0.5 px-1 uppercase tracking-wider">
                      {isDealer ? 'Dealer / Company' : 'Customer'}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-md py-sm shadow-sm ${
                        isMe
                          ? activeRole === 'company'
                            ? 'bg-tertiary text-on-tertiary'
                            : 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface'
                      }`}
                    >
                      <p className="font-body-md text-body-md whitespace-pre-wrap">{message.text}</p>
                      <p
                        className={`mt-xs text-[10px] text-right ${
                          isMe ? 'opacity-80' : 'text-on-surface-variant'
                        }`}
                      >
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={sendMessage} className="mt-md flex gap-sm">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  activeRole === 'company'
                    ? 'Reply as Service Dealer...'
                    : 'Type your message to dealer...'
                }
                className="flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:border-primary font-body-md"
              />
              <button
                type="submit"
                className={`rounded-xl px-md py-sm font-nav-item text-nav-item transition-all flex items-center gap-xs font-bold ${
                  activeRole === 'company'
                    ? 'bg-tertiary text-on-tertiary hover:opacity-90'
                    : 'bg-primary text-on-primary hover:bg-primary-container'
                }`}
              >
                Send
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>

          {/* Quick Info Sidebar */}
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-outline-variant bg-surface-container-low p-lg space-y-md">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Dealer Info</h2>
              <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
                Direct channel to verified technicians and service advisors.
              </p>
            </div>
            <div className="space-y-sm bg-white p-md rounded-xl border border-outline-variant text-sm">
              <p className="flex items-center gap-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-[18px]">business</span>
                {companyName}
              </p>
              <p className="flex items-center gap-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">phone</span>
                +92 300 1234567
              </p>
              <p className="flex items-center gap-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                Pakistan Service Network
              </p>
            </div>
            <button
              onClick={() => navigate(ROUTES.customizeBooking, { state: { companyId: safeCompanyId, companyName } })}
              className="w-full rounded-xl border border-primary/20 bg-primary/5 px-md py-sm text-left font-nav-item text-nav-item text-primary hover:bg-primary/10 transition-colors"
            >
              Request New Service
            </button>
            <button
              onClick={() => navigate(ROUTES.liveTracking)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-sm text-left font-nav-item text-nav-item text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Open Live Tracking
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Chat;
