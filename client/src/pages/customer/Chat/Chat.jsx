import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../../services/api';

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
  const loadMessages = useCallback(async () => { if (!active?._id) return; try { const result = await api.get(`/chats/${active._id}/messages`, { noCache: true }); setMessages(result.messages || []); } catch (requestError) { setError(requestError.message); } }, [active?._id]);
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
    });
    return () => socket.disconnect();
  }, [active?._id]);
  
  const send = async (event) => { event.preventDefault(); if (!text.trim() || !active) return; try { const currentText = text; setText(''); const result = await api.post(`/chats/${active._id}/messages`, { text: currentText }); setMessages((items) => items.some(m => m._id === result.message._id) ? items : [...items, result.message]); } catch (requestError) { setError(requestError.message); setText(text); } };
  return <div className="client-dashboard-shell min-h-screen text-[#0D1B2A]"><header className="h-16 bg-white/80 backdrop-blur border-b border-[#E0E1DD] px-5 flex justify-between items-center sticky top-0 z-40"><Link to="/customer/companies" className="font-bold text-xl text-[#0D1B2A]">FleetOS</Link><span className="text-sm text-[#415A77]">Company conversations</span></header><main className="max-w-6xl mx-auto p-4 md:p-6"><div className="h-[calc(100vh-112px)] bg-white/90 border border-[#E0E1DD] rounded-[28px] overflow-hidden grid md:grid-cols-[320px_1fr] shadow-[0_24px_80px_rgba(13,27,42,.08)]"><aside className="border-r border-[#E0E1DD] overflow-y-auto hide-scrollbar"><div className="p-4 border-b border-[#E0E1DD]"><h1 className="font-bold text-lg">Messages</h1><p className="text-xs text-[#415A77] mt-1">Start a company chat or continue booking conversations.</p></div>{conversations.map(({ booking, lastMessage }) => <button key={booking._id} onClick={() => setActive(booking)} className={`w-full text-left p-4 border-b border-[#E0E1DD] hover:bg-[#E0E1DD]/35 ${active?._id === booking._id ? 'bg-[#778DA9]/15 border-l-4 border-l-[#1B263B]' : ''}`}><b className="block text-sm">{booking.company?.name}</b><small className="text-[#415A77]">{booking.reference} · {booking.serviceSnapshot?.name}</small><p className="text-xs text-[#415A77] truncate mt-2">{lastMessage?.text || 'Start the conversation'}</p></button>)}</aside><section className="min-w-0 flex flex-col">{active ? <><div className="p-4 border-b border-[#E0E1DD] bg-white"><b>{active.company?.name}</b><p className="text-xs text-[#415A77]">{active.reference} · {active.status}</p></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#E0E1DD]/20 hide-scrollbar">{messages.map((message) => <div key={message._id} className={`max-w-[75%] p-3 rounded-2xl text-sm ${message.senderRole === 'customer' ? 'ml-auto bg-[#1B263B] text-white rounded-br-sm' : 'bg-white border border-[#E0E1DD] rounded-bl-sm'}`}><p>{message.text}</p><small className={`block mt-1 ${message.senderRole === 'customer' ? 'text-[#E0E1DD]' : 'text-[#778DA9]'}`}>{new Date(message.createdAt).toLocaleTimeString()}</small></div>)}</div><form onSubmit={send} className="p-3 border-t border-[#E0E1DD] bg-white flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} className="flex-1 rounded-2xl border-[#E0E1DD] bg-[#E0E1DD]/25 px-4" placeholder={`Message ${active.company?.name}`} /><button className="px-5 bg-[#0D1B2A] text-white rounded-2xl font-semibold">Send</button></form></> : <div className="m-auto text-center text-[#415A77] max-w-sm px-8"><span className="material-symbols-outlined text-5xl">forum</span><p className="font-semibold text-[#0D1B2A] mt-3">Preparing company chat…</p><p className="text-sm mt-1">FleetOS will open a secure MongoDB-backed company conversation.</p></div>}{error && <p className="absolute bottom-4 right-4 bg-red-50 text-red-700 p-3 rounded-lg border border-red-200">{error}</p>}</section></div></main></div>;
}

export default Chat;
