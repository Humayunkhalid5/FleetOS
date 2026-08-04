import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function Chat() {
  const navigate = useNavigate();
  const { companyId } = useParams();
  const safeCompanyId = companyId || 'swiftfleet';
  const [companyName, setCompanyName] = useState('Fleet Partner');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
const [connected, setConnected] = useState(false);
  const endRef = useRef(null);
  const socketRef = useRef(null);
  // Keep a ref to messages so the socket handler always reads the latest list.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch the company name from the API so the header is accurate.
  useEffect(() => {
    let mounted = true;
    const loadCompany = async () => {
      try {
        const response = await api.get(`/companies/${safeCompanyId}`);
        if (mounted && response?.company?.name) {
          setCompanyName(response.company.name);
        }
      } catch {
        // Fall back to the default label if the company is not found.
      }
    };
    loadCompany();
    return () => {
      mounted = false;
    };
  }, [safeCompanyId]);

  // Load existing chat history (REST fallback) and initial greeting.
  useEffect(() => {
    const storageKey = `fleetos-chat-${safeCompanyId}`;
    const loadMessages = async () => {
      try {
        const response = await api.get(`/chats/${safeCompanyId}/messages`);
        const nextMessages = (response.messages || []).map((message) => ({
          id: message._id || `${message.createdAt}-${message.text}`,
          sender: message.senderRole === 'company' ? 'company' : 'customer',
          text: message.text,
          timestamp: new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        }));

        if (nextMessages.length > 0) {
          setMessages(nextMessages);
          localStorage.setItem(storageKey, JSON.stringify(nextMessages));
          return;
        }
      } catch {
        // Fall back to local storage / greeting below.
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
          text: `Hello! I can help you with your service request. I will confirm the next steps shortly.`,
          timestamp: 'Now',
        },
      ];

      setMessages(initialMessages);
      localStorage.setItem(storageKey, JSON.stringify(initialMessages));
    };

    loadMessages();
  }, [safeCompanyId]);

  // Join the realtime chat room and subscribe to live messages.
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

    // Initial history snapshot from the room.
    socket.on('chat:history', ({ messages: history = [] }) => {
      if (history.length > 0) {
        const next = history.map((message) => ({
          id: message._id || `${message.createdAt}-${message.text}`,
          sender: message.senderRole === 'company' ? 'company' : 'customer',
          text: message.text,
          timestamp: new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        }));
        setMessages(next);
        localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(next));
      }
    });

    // Append a live message from the room.
    socket.on('chat:message', (data) => {
      const message = data?.message || data;
      if (!message) return;
      const next = [...messagesRef.current, {
        id: message._id || `${message.createdAt}-${message.text}`,
        sender: message.senderRole === 'company' ? 'company' : 'customer',
        text: message.text,
        timestamp: new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      }];
      setMessages(next);
      localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(next));
    });

    socket.on('chat:error', (err) => {
      console.warn('Chat error:', err?.message);
    });

    return () => {
      socket.emit('chat:leave', safeCompanyId);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeCompanyId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const customerMessage = {
      id: Date.now(),
      sender: 'customer',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };

    // Optimistically append the user's message.
    const nextMessages = [...messagesRef.current, customerMessage];
    setMessages(nextMessages);
    localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(nextMessages));
    setDraft('');

    // Broadcast via the socket if connected.
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:message', {
        roomId: safeCompanyId,
        text: trimmed,
        senderRole: 'customer',
        recipient: safeCompanyId,
        recipientRole: 'company',
      });
      return;
    }

    // Fall back to REST if the socket is not connected.
    try {
      const response = await api.post(`/chats/${safeCompanyId}/messages`, {
        recipient: safeCompanyId,
        text: trimmed,
      });
      const savedMessage = response.message;
      if (savedMessage) {
        const persistedMessages = [...nextMessages, {
          id: savedMessage._id || `${savedMessage.createdAt}-${savedMessage.text}`,
          sender: 'company',
          text: savedMessage.text,
          timestamp: new Date(savedMessage.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        }];
        setMessages(persistedMessages);
        localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(persistedMessages));
      }
    } catch {
      const reply = {
        id: Date.now() + 1,
        sender: 'company',
        text: 'Thanks for the update. The team is reviewing your request and will confirm the technician assignment shortly.',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      const updatedMessages = [...nextMessages, reply];
      setMessages(updatedMessages);
      localStorage.setItem(`fleetos-chat-${safeCompanyId}`, JSON.stringify(updatedMessages));
    }
  };

  return (
    <div className="min-h-screen bg-background p-md md:p-xl">
      <div className="mx-auto max-w-5xl rounded-3xl border border-outline-variant bg-surface-container-lowest shadow-[0_8px_32px_0_rgba(11,29,45,0.12)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-lg py-md">
          <div>
            <button onClick={() => navigate(-1)} className="mb-sm flex items-center gap-xs text-primary font-nav-item text-nav-item">
              <span className="material-symbols-outlined">arrow_back</span> Back
            </button>
            <h1 className="font-headline-md text-headline-md text-on-surface">Chat with {companyName}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Fast support for booking updates and technician coordination.</p>
          </div>
          <a href="tel:+923000000000" className="rounded-full bg-primary px-md py-sm text-on-primary font-nav-item text-nav-item">Call now</a>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-lg">
            <div className="mb-md rounded-2xl bg-surface-container-low p-md">
              <div className="flex items-center gap-sm text-primary">
                <span className="material-symbols-outlined">verified</span>
                <span className="font-nav-item text-nav-item">{companyName} {connected ? 'is online' : 'is preparing'} — {connected ? 'real-time chat connected' : 'messages will sync when available'}.</span>
              </div>
            </div>

            <div className="space-y-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-md min-h-[400px] max-h-[480px] overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-md py-sm ${message.sender === 'customer' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                    <p className="font-body-md text-body-md">{message.text}</p>
                    <p className={`mt-xs text-xs ${message.sender === 'customer' ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>{message.timestamp}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <form onSubmit={sendMessage} className="mt-md flex gap-sm">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message"
                className="flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:border-primary"
              />
              <button type="submit" className="rounded-xl bg-primary px-md py-sm font-nav-item text-nav-item text-on-primary">Send</button>
            </form>
          </div>

          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-outline-variant bg-surface-container-low p-lg space-y-md">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Quick actions</h2>
              <p className="mt-xs font-body-md text-body-md text-on-surface-variant">Use the chat for real-time updates or go back to the booking flow.</p>
            </div>
            <button onClick={() => navigate(ROUTES.customizeBooking, { state: { companyId: safeCompanyId, companyName } })} className="w-full rounded-xl border border-primary/20 bg-primary/5 px-md py-sm text-left font-nav-item text-nav-item text-primary">
              Continue service request
            </button>
            <button onClick={() => navigate(ROUTES.liveTracking)} className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-sm text-left font-nav-item text-nav-item text-on-surface">
              Open tracking dashboard
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Chat;
