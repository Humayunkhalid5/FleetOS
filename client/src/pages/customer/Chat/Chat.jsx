import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';

function Chat() {
  const { companyId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const loadConversations = useCallback(async () => {
    try {
      const result = await api.get('/chats/conversations', { noCache: true });
      const items = result.conversations || [];
      const matched = companyId ? items.find(({ booking }) => [booking.company?._id, booking.company?.slug].includes(companyId)) : null;
      setConversations(items);
      setActive((current) => current || matched?.booking || items[0]?.booking || null);
    } catch (requestError) { setError(requestError.message); }
  }, [companyId]);
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
  return <div className="min-h-screen bg-[#f7f9fc] text-slate-900"><header className="h-16 bg-white border-b px-5 flex justify-between items-center"><Link to="/customer/companies" className="font-bold text-xl text-[#071f3d]">FleetOS</Link><span className="text-sm text-slate-500">Booking conversations</span></header><main className="max-w-6xl mx-auto p-4 md:p-6"><div className="h-[calc(100vh-112px)] bg-white border border-slate-200 rounded-xl overflow-hidden grid md:grid-cols-[320px_1fr] shadow-sm"><aside className="border-r border-slate-200 overflow-y-auto hide-scrollbar"><div className="p-4 border-b"><h1 className="font-bold text-lg">Messages</h1><p className="text-xs text-slate-500 mt-1">Chats are tied to your bookings.</p></div>{conversations.map(({ booking, lastMessage }) => <button key={booking._id} onClick={() => setActive(booking)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 ${active?._id === booking._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}><b className="block text-sm">{booking.company?.name}</b><small className="text-slate-500">{booking.reference} · {booking.serviceSnapshot?.name}</small><p className="text-xs text-slate-500 truncate mt-2">{lastMessage?.text || 'Start the conversation'}</p></button>)}</aside><section className="min-w-0 flex flex-col">{active ? <><div className="p-4 border-b"><b>{active.company?.name}</b><p className="text-xs text-slate-500">{active.reference} · {active.status}</p></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 hide-scrollbar">{messages.map((message) => <div key={message._id} className={`max-w-[75%] p-3 rounded-xl text-sm ${message.senderRole === 'customer' ? 'ml-auto bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 rounded-bl-sm'}`}><p>{message.text}</p><small className={`block mt-1 ${message.senderRole === 'customer' ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(message.createdAt).toLocaleTimeString()}</small></div>)}</div><form onSubmit={send} className="p-3 border-t flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} className="flex-1 rounded-lg border-slate-300" placeholder={`Message ${active.company?.name}`} /><button className="px-5 bg-blue-600 text-white rounded-lg font-semibold">Send</button></form></> : <div className="m-auto text-center text-slate-500 max-w-sm px-8"><span className="material-symbols-outlined text-5xl">forum</span><p className="font-semibold text-slate-700 mt-3">No booking conversation yet.</p><p className="text-sm mt-1">Book a service with this company to open a secure live chat thread.</p></div>}{error && <p className="absolute bottom-4 right-4 bg-red-50 text-red-700 p-3 rounded-lg border border-red-200">{error}</p>}</section></div></main></div>;
}

export default Chat;
