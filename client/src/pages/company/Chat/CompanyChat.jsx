import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import CompanyShell from '../../../components/company/CompanyShell';
import api, { getActiveSessionToken } from '../../../services/api';

function CompanyChat() {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const result = await api.get('/chats/conversations', { noCache: true });
      setConversations(result.conversations || []);
      setActive((current) => current || result.conversations?.[0]?.booking || null);
    } catch (requestError) { setError(requestError.message); }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!active?._id) return;
    try {
      const result = await api.get(`/chats/${active._id}/messages`, { noCache: true });
      setMessages(result.messages || []);
      setConversations((current) => current.map((item) => item.booking._id === active._id ? { ...item, unreadCount: 0 } : item));
    }
    catch (requestError) { setError(requestError.message); }
  }, [active?._id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!active?._id) return undefined;
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true, auth: { token: getActiveSessionToken() } });
    socket.emit('join-booking', active._id);
    socket.on('chat:message', (message) => {
      setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      loadConversations();
    });
    return () => socket.disconnect();
  }, [active?._id, loadConversations]);

  const send = async (event) => {
    event.preventDefault();
    if (!text.trim() || !active) return;
    const currentText = text;
    try {
      setText('');
      const result = await api.post(`/chats/${active._id}/messages`, { text: currentText });
      setMessages((items) => items.some((item) => item._id === result.message._id) ? items : [...items, result.message]);
      setConversations((current) => current.map((item) => item.booking._id === active._id ? { ...item, lastMessage: result.message, unreadCount: 0 } : item));
    } catch (requestError) { setError(requestError.message); setText(currentText); }
  };

  const contactInitials = (value) => String(value || 'CL').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <CompanyShell title="Client Messages" subtitle="Reply to booking conversations and keep customers updated in real time.">
      {error && <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold flex items-center gap-3"><span className="material-symbols-outlined">error</span>{error}</div>}
      <div className="h-[calc(100vh-150px)] min-h-[620px] bg-white border border-slate-100 rounded-3xl overflow-hidden grid lg:grid-cols-[360px_1fr] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <aside className="border-r border-slate-100 overflow-y-auto bg-white">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Customer conversations</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Authorized booking chats only.</p>
          </div>
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <span className="material-symbols-outlined text-4xl text-slate-300">forum</span>
              <p className="text-sm font-bold text-slate-800 mt-3">No client messages yet</p>
              <p className="text-xs mt-1">Client booking chats will appear here.</p>
            </div>
          ) : conversations.map(({ booking, lastMessage, unreadCount }) => (
            <button key={booking._id} onClick={() => setActive(booking)} className={`w-full p-4 text-left border-b border-slate-100 hover:bg-slate-50 transition-colors ${active?._id === booking._id ? 'bg-blue-50' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-full bg-[#1B263B] text-white grid place-items-center text-xs font-black shrink-0">{contactInitials(booking.customerName)}</span>
                  <b className="block text-sm text-slate-900 truncate">{booking.customerName}</b>
                </div>
                {unreadCount > 0 ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-black grid place-items-center">{unreadCount > 9 ? '9+' : unreadCount}</span> : <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">{booking.status}</span>}
              </div>
              <small className="text-slate-500 font-medium">{booking.reference} · {booking.vehicle?.label || 'Client request'}</small>
              <p className="text-xs text-slate-500 truncate mt-2">{lastMessage?.text || 'No messages yet'}</p>
            </button>
          ))}
        </aside>

        <section className="flex flex-col min-w-0 min-h-0 bg-slate-50/70">
          {active ? (
            <>
              <div className="p-5 border-b border-slate-100 bg-white flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{active.customerName}</h3>
                  <p className="text-sm text-slate-500 mt-1">{active.serviceSnapshot?.name || 'Service request'} · {active.reference}</p>
                </div>
                <span className="text-xs px-3 py-1.5 h-fit bg-blue-50 text-blue-700 rounded-full font-bold">{active.status}</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 bg-[radial-gradient(circle_at_top_left,rgba(119,141,169,.18),transparent_22rem),#eef3f7]">
                {messages.map((message) => (
                  <div key={message._id} className={`flex gap-2 ${message.senderRole === 'company' ? 'justify-end' : 'justify-start'}`}>
                    {message.senderRole !== 'company' && <span className="w-8 h-8 rounded-full bg-white border border-slate-200 text-[#1B263B] grid place-items-center text-[10px] font-black shrink-0">{contactInitials(active.customerName)}</span>}
                    <div className={`max-w-[78%] px-4 py-2.5 rounded-[22px] text-sm shadow-sm ${message.senderRole === 'company' ? 'bg-[#DCF8C6] text-[#0D1B2A] rounded-br-md' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md'}`}>
                      <p className="text-[11px] font-black mb-1 opacity-70">{message.senderRole === 'company' ? 'You' : active.customerName || 'Client'}</p>
                      <p className="leading-6 whitespace-pre-wrap break-words">{message.text}</p>
                      <small className="block mt-1 text-right opacity-60 text-[10px] font-semibold">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="shrink-0 sticky bottom-0 p-4 border-t border-slate-100 bg-white flex gap-3">
                <input value={text} onChange={(event) => setText(event.target.value)} className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" placeholder="Type an operational update…" />
                <button className="px-6 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-sm">Send</button>
              </form>
            </>
          ) : <div className="m-auto text-slate-500 text-sm font-semibold">Select a customer conversation.</div>}
        </section>
      </div>
    </CompanyShell>
  );
}

export default CompanyChat;
