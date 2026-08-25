import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../../services/api';
import CustomerTopNav from '../../../components/customer/CustomerTopNav';

function Chat() {
  const { companyId } = useParams();
  const location = useLocation();
  const requestedBookingId = location.state?.bookingId || '';
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const loadConversations = useCallback(async () => {
    try {
      const result = await api.get('/chats/conversations', { noCache: true });
      let items = result.conversations || [];
      let matched = requestedBookingId
        ? items.find(({ booking }) => booking._id === requestedBookingId)
        : companyId ? items.find(({ booking }) => [booking.company?._id, booking.company?.slug].includes(companyId)) : null;
      if (!matched && companyId) {
        const started = await api.post(`/chats/company/${companyId}/start`, {});
        const refreshed = await api.get('/chats/conversations', { noCache: true });
        items = refreshed.conversations || [];
        matched = items.find(({ booking }) => booking._id === started.booking?._id)
          || items.find(({ booking }) => [booking.company?._id, booking.company?.slug].includes(companyId));
      }
      setConversations(items);
      setActive((current) => current || matched?.booking || items[0]?.booking || null);
    } catch (requestError) { setError(requestError.message); }
  }, [companyId, requestedBookingId]);
  const loadMessages = useCallback(async () => { if (!active?._id) return; try { const result = await api.get(`/chats/${active._id}/messages`, { noCache: true }); setMessages(result.messages || []); setConversations((current) => current.map((item) => item.booking._id === active._id ? { ...item, unreadCount: 0 } : item)); } catch (requestError) { setError(requestError.message); } }, [active?._id]);
  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  
  // Real-time socket connection
  useEffect(() => {
    if (!active?._id) return;
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true });
    socket.emit('join-booking', active._id);
    socket.on('chat:message', (message) => {
      setMessages((current) => {
        // Prevent duplicate messages (since we also optimistic update)
        if (current.some(m => m._id === message._id)) return current;
        return [...current, message];
      });
      loadConversations();
    });
    return () => socket.disconnect();
  }, [active?._id, loadConversations]);
  
  const send = async (event) => { event.preventDefault(); if (!text.trim() || !active) return; try { const currentText = text; setText(''); const result = await api.post(`/chats/${active._id}/messages`, { text: currentText }); setMessages((items) => items.some(m => m._id === result.message._id) ? items : [...items, result.message]); setConversations((current) => current.map((item) => item.booking._id === active._id ? { ...item, lastMessage: result.message, unreadCount: 0 } : item)); } catch (requestError) { setError(requestError.message); setText(text); } };
  const companyInitials = (value) => String(value || 'CO').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return <div className="client-dashboard-shell min-h-screen text-[#0D1B2A]"><CustomerTopNav title="Messages" subtitle="Company conversations and booking chats." backTo="/customer/companies" /><main className="max-w-6xl mx-auto p-4 md:p-6"><div className="h-[calc(100vh-128px)] bg-white/90 border border-[#E0E1DD] rounded-[28px] overflow-hidden grid md:grid-cols-[320px_1fr] shadow-[0_24px_80px_rgba(13,27,42,.08)]"><aside className="border-r border-[#E0E1DD] overflow-y-auto hide-scrollbar"><div className="p-4 border-b border-[#E0E1DD]"><h1 className="font-bold text-lg">Messages</h1><p className="text-xs text-[#415A77] mt-1">Company conversations and booking chats.</p></div>{conversations.map(({ booking, lastMessage, unreadCount }) => <button key={booking._id} onClick={() => setActive(booking)} className={`w-full text-left p-4 border-b border-[#E0E1DD] hover:bg-[#E0E1DD]/35 ${active?._id === booking._id ? 'bg-[#778DA9]/15 border-l-4 border-l-[#1B263B]' : ''}`}><div className="flex items-center gap-3"><span className="w-10 h-10 rounded-full bg-[#1B263B] text-white text-xs font-black grid place-items-center shrink-0">{companyInitials(booking.company?.name)}</span><div className="min-w-0 flex-1"><b className="block text-sm truncate">{booking.company?.name}</b><small className="text-[#415A77]">{booking.reference} · {booking.serviceSnapshot?.name}</small></div>{unreadCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-black grid place-items-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}</div><p className="text-xs text-[#415A77] truncate mt-2">{lastMessage?.text || 'Start the conversation'}</p></button>)}</aside><section className="min-w-0 min-h-0 flex flex-col">{active ? <><div className="p-4 border-b border-[#E0E1DD] bg-white flex items-center gap-3"><span className="w-11 h-11 rounded-full bg-[#1B263B] text-white text-sm font-black grid place-items-center">{companyInitials(active.company?.name)}</span><div><b>{active.company?.name}</b><p className="text-xs text-[#415A77]">{active.reference} · {active.status}</p></div></div><div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(circle_at_top_left,rgba(119,141,169,.18),transparent_22rem),#eef3f7] hide-scrollbar">{messages.map((message) => <div key={message._id} className={`flex gap-2 ${message.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>{message.senderRole !== 'customer' && <span className="w-8 h-8 rounded-full bg-white border border-[#E0E1DD] text-[#1B263B] grid place-items-center text-[10px] font-black shrink-0">{companyInitials(active.company?.name)}</span>}<div className={`max-w-[78%] px-4 py-2.5 rounded-[22px] text-sm shadow-sm ${message.senderRole === 'customer' ? 'bg-[#DCF8C6] text-[#0D1B2A] rounded-br-md' : 'bg-white border border-[#E0E1DD] text-[#0D1B2A] rounded-bl-md'}`}><p className="text-[11px] font-black mb-1 opacity-70">{message.senderRole === 'customer' ? 'You' : active.company?.name || 'Company'}</p><p className="leading-6 whitespace-pre-wrap break-words">{message.text}</p><small className="block mt-1 text-right opacity-60 text-[10px] font-semibold">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div></div>)}</div><form onSubmit={send} className="shrink-0 sticky bottom-0 p-3 border-t border-[#E0E1DD] bg-white flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} className="flex-1 rounded-2xl border-[#E0E1DD] bg-[#E0E1DD]/25 px-4 py-3" placeholder={`Message ${active.company?.name}`} /><button className="px-5 bg-[#0D1B2A] text-white rounded-2xl font-semibold">Send</button></form></> : <div className="m-auto text-center text-[#415A77] max-w-sm px-8"><span className="material-symbols-outlined text-5xl">forum</span><p className="font-semibold text-[#0D1B2A] mt-3">Preparing company chat…</p><p className="text-sm mt-1">Your conversation with this company will appear here.</p></div>}{error && <p className="absolute bottom-4 right-4 bg-red-50 text-red-700 p-3 rounded-lg border border-red-200">{error}</p>}</section></div></main></div>;
}

export default Chat;

