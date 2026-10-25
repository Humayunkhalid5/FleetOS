import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';

const SHORTCUTS = [
  'Who should handle the latest pending booking?',
  'Which staff are overloaded today?',
  'Summarize revenue and job stats',
];

const GREETING = { role: 'assistant', text: 'I can read your live bookings, staff and revenue. Ask about workloads, dispatch or performance — I can also assign staff when you confirm.', data: null };

export default function CopilotDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);
  useEffect(() => {
    if (!isOpen) return undefined;
    window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const send = async (custom) => {
    const text = (custom || input).trim();
    if (!text || loading) return;
    setMessages((list) => [...list, { role: 'user', text }]);
    if (!custom) setInput('');
    setLoading(true);
    try {
      const response = await api.post('/copilot/query', { prompt: text });
      setMessages((list) => [...list, { role: 'assistant', text: response.reply, data: response.data }]);
    } catch (requestError) {
      setMessages((list) => [...list, { role: 'assistant', text: `I couldn't complete that: ${requestError.message}`, data: null, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (data, index) => {
    if (!data || actionBusy) return;
    setActionBusy(true);
    try {
      const response = await api.post('/copilot/action', { actionType: data.actionType, bookingId: data.bookingId, technicianId: data.technicianId || data.recommendedTechnicianId });
      setMessages((list) => list.map((message, messageIndex) => (messageIndex === index ? { ...message, data: { ...message.data, done: true } } : message)).concat({ role: 'assistant', text: response.message, data: null, success: true }));
    } catch (requestError) {
      setMessages((list) => [...list, { role: 'assistant', text: `The action failed: ${requestError.message}`, data: null, error: true }]);
    } finally {
      setActionBusy(false);
    }
  };

  return createPortal(
    <div className={`fixed inset-0 z-[150] ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div className={`absolute inset-0 bg-navy/30 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-black/50 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label="AI Copilot" className={`absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-line bg-raised shadow-pop transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-white shadow-glow"><span className="material-symbols-outlined icon-fill">auto_awesome</span></span>
            <div>
              <p className="text-[15px] font-semibold">Operations Copilot</p>
              <p className="text-[12px] text-subtle">Answers from your live workspace data</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm" aria-label="Close copilot"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-[13.5px] leading-6 ${message.role === 'user' ? 'rounded-br-md bg-brand text-white' : message.error ? 'rounded-bl-md border border-danger-line bg-danger-soft text-danger-fg' : message.success ? 'rounded-bl-md border border-success-line bg-success-soft text-success-fg' : 'rounded-bl-md border border-line bg-surface text-ink'}`}>
                <p className="whitespace-pre-line">{message.text}</p>
                {message.data?.actionRequired && (
                  <div className="mt-3 rounded-xl border border-brand-line bg-brand-soft/60 p-3">
                    <p className="text-[12.5px] text-brand-fg">Assign <b>{message.data.technicianName}</b> to <b>{message.data.bookingReference}</b>?</p>
                    <button type="button" disabled={actionBusy || message.data.done} onClick={() => runAction(message.data, index)} className="btn btn-primary btn-sm mt-2.5 w-full">
                      {message.data.done ? 'Assigned' : actionBusy ? 'Assigning…' : 'Confirm assignment'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[12.5px] text-subtle">
              <span className="flex gap-1">{[0, 1, 2].map((dot) => <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" style={{ animationDelay: `${dot * 150}ms` }} />)}</span>
              Reading your workspace
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-line px-5 pb-5 pt-3">
          <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {SHORTCUTS.map((shortcut) => <button key={shortcut} type="button" onClick={() => send(shortcut)} disabled={loading} className="chip h-8 text-[12.5px]">{shortcut}</button>)}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-center gap-2">
            <input ref={inputRef} className="input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about dispatch, staff or revenue" />
            <button type="submit" disabled={!input.trim() || loading} className="btn btn-primary btn-icon h-11 w-11 shrink-0" aria-label="Send"><span className="material-symbols-outlined">arrow_upward</span></button>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
