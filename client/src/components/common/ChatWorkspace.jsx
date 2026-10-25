import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import { useLiveQuery, revalidate, setQueryData } from '../../hooks/useLiveQuery';
import { useLiveEvent } from '../../hooks/useRealtime';
import { Avatar, EmptyState, Skeleton, StatusBadge, Spinner } from '../ui';

const CONVERSATIONS = '/chats/conversations';

function dayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function shortTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

/**
 * Two-pane messaging used by both portals.
 * role: 'customer' | 'company' — whose messages appear on the right.
 * resolveInitial(conversations) may return a booking id to open first.
 */
export default function ChatWorkspace({ role, resolveInitial, preparing = false, emptyAction }) {
  const { data, loading, error } = useLiveQuery(CONVERSATIONS, { events: ['chat:message', 'booking:created', 'booking:updated'] });
  const conversations = useMemo(() => data?.conversations || [], [data]);
  const [activeId, setActiveId] = useState('');
  const [mobileThread, setMobileThread] = useState(false);
  const [filter, setFilter] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  if (!activeId && conversations.length) {
    const initial = resolveInitial?.(conversations);
    if (initial) { setActiveId(initial); setMobileThread(true); } else setActiveId(conversations[0].booking._id);
  }

  const active = conversations.find((item) => item.booking._id === activeId)?.booking;
  const messagesKey = activeId ? `/chats/${activeId}/messages` : null;
  const { data: thread, loading: threadLoading } = useLiveQuery(messagesKey, { events: [], keepPrevious: false });
  const messages = thread?.messages || [];

  // Opening a thread marks it read on the server; refresh the unread badges.
  useEffect(() => { if (thread) revalidate(CONVERSATIONS); }, [thread]);

  useLiveEvent('chat:message', (message) => {
    const bookingId = String(message?.booking?._id || message?.booking || '');
    if (!bookingId) return;
    const key = `/chats/${bookingId}/messages`;
    setQueryData(key, (current) => (current && !current.messages.some((item) => item._id === message._id) ? { ...current, messages: [...current.messages, message] } : current));
    if (bookingId === String(activeId)) revalidate(key);
  });

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: messages.length > 30 ? 'auto' : 'smooth' });
  }, [messages.length, activeId]);

  const counterpart = (booking) => (role === 'customer' ? booking?.company?.name || 'Company' : booking?.customerName || 'Customer');
  const counterpartLogo = (booking) => (role === 'customer' ? booking?.company?.logo : '');

  const visible = conversations.filter(({ booking }) => !filter || `${counterpart(booking)} ${booking.reference} ${booking.serviceSnapshot?.name}`.toLowerCase().includes(filter.toLowerCase()));

  const send = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !activeId || sending) return;
    setSending(true);
    setSendError('');
    setText('');
    try {
      const { message } = await api.post(`/chats/${activeId}/messages`, { text: value });
      setQueryData(messagesKey, (current) => (current && !current.messages.some((item) => item._id === message._id) ? { ...current, messages: [...current.messages, message] } : current));
    } catch (requestError) {
      setSendError(requestError.message);
      setText(value);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  let lastDay = '';

  return (
    <div className="card grid grid-cols-[minmax(0,1fr)] h-[calc(100dvh-230px)] lg:h-[calc(100dvh-200px)] min-h-[560px] overflow-hidden md:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={`min-h-0 flex-col border-r border-line ${mobileThread ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-line p-3">
          <label className="input-icon">
            <span className="material-symbols-outlined">search</span>
            <input className="input input-sm" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? <div className="grid gap-4 p-4">{[0, 1, 2, 3].map((key) => <div key={key} className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="grid flex-1 gap-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-full" /></div></div>)}</div>
            : visible.length ? visible.map(({ booking, lastMessage, unreadCount }) => {
              const selected = booking._id === activeId;
              return (
                <button key={booking._id} type="button" onClick={() => { setActiveId(booking._id); setMobileThread(true); setSendError(''); }} className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors ${selected ? 'bg-brand-soft/50' : 'hover:bg-sunken'}`}>
                  <Avatar name={counterpart(booking)} src={counterpartLogo(booking)} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[13.5px] ${unreadCount ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>{counterpart(booking)}</span>
                      <span className="shrink-0 text-[11px] text-subtle">{shortTime(lastMessage?.createdAt || booking.updatedAt)}</span>
                    </span>
                    <span className="block truncate text-[12px] text-subtle">{booking.serviceSnapshot?.name}</span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[12.5px] ${unreadCount ? 'font-medium text-ink' : 'text-muted'}`}>{lastMessage ? `${lastMessage.senderRole === role ? 'You: ' : ''}${lastMessage.text}` : 'No messages yet'}</span>
                      {unreadCount > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10.5px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </span>
                  </span>
                </button>
              );
            }) : <EmptyState icon="forum" title={filter ? 'No matches' : 'No conversations yet'} action={!filter && emptyAction}>{filter ? 'Try another name or reference.' : role === 'customer' ? 'Message any company from its profile, or from a booking.' : 'Customer messages about bookings will show up here.'}</EmptyState>}
          {error && !data && <p className="p-4 text-[13px] text-danger-fg">{error.message}</p>}
        </div>
      </aside>

      <section className={`min-h-0 min-w-0 flex-col ${mobileThread ? 'flex' : 'hidden md:flex'}`}>
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button type="button" className="btn btn-ghost btn-icon btn-sm md:hidden" onClick={() => setMobileThread(false)} aria-label="Back to conversations"><span className="material-symbols-outlined">arrow_back</span></button>
              <Avatar name={counterpart(active)} src={counterpartLogo(active)} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold">{counterpart(active)}</p>
                <p className="truncate text-[12px] text-subtle">{active.serviceSnapshot?.name} · <span className="font-mono">{active.reference}</span></p>
              </div>
              {active.serviceSnapshot?.category !== 'Inquiry' && <StatusBadge status={active.status} />}
            </header>
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-sunken/40 px-4 py-5">
              {threadLoading ? <div className="grid gap-3">{[0, 1, 2].map((key) => <Skeleton key={key} className={`h-12 w-2/3 rounded-2xl ${key % 2 ? 'ml-auto' : ''}`} />)}</div>
                : messages.length ? messages.map((message) => {
                  const mine = message.senderRole === role;
                  const day = dayLabel(message.createdAt);
                  const divider = day !== lastDay;
                  lastDay = day;
                  return (
                    <div key={message._id}>
                      {divider && <p className="my-3 text-center text-[11.5px] font-medium text-subtle">{day}</p>}
                      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] leading-6 shadow-xs ${mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md border border-line bg-surface text-ink'}`}>
                          <p className="whitespace-pre-wrap break-words">{message.text}</p>
                          <p className={`mt-0.5 text-right text-[10.5px] ${mine ? 'text-white/70' : 'text-subtle'}`}>
                            {new Date(message.createdAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}
                            {mine && <span className="material-symbols-outlined ml-1 align-[-3px] text-[13px]">{message.readAt ? 'done_all' : 'done'}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }) : <EmptyState icon="waving_hand" title="Say hello">{role === 'customer' ? 'Ask about availability, pricing or the job details.' : 'Send an update to the customer.'}</EmptyState>}
            </div>
            <form onSubmit={send} className="border-t border-line p-3">
              {sendError && <p className="mb-2 text-[12.5px] text-danger-fg">{sendError}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(event); } }}
                  className="textarea max-h-32 min-h-[44px] resize-none py-2.5"
                  placeholder={`Message ${counterpart(active)}`}
                  aria-label="Message"
                  maxLength={2000}
                />
                <button type="submit" disabled={!text.trim() || sending} className="btn btn-primary btn-icon h-11 w-11 shrink-0" aria-label="Send">{sending ? <Spinner /> : <span className="material-symbols-outlined">send</span>}</button>
              </div>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center">
            {preparing ? <div className="grid justify-items-center gap-3 text-[13.5px] text-muted"><Spinner className="h-5 w-5 text-brand" />Opening conversation…</div> : <EmptyState icon="forum" title="Select a conversation" />}
          </div>
        )}
      </section>
    </div>
  );
}
